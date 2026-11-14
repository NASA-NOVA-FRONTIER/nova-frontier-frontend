// Builds the Method page's HH baseline on the fixed gray scale (−30 dB black → 0 dB white) from the
// science gateway's float tif, so the image matches the Explorer v8 scale instead of viridis.
// Run with: pnpm cases:baseline   (GATEWAY_URL overrides the Modal gateway origin)

import { writeFile } from "node:fs/promises";
import { crc32, deflateSync, inflateSync } from "node:zlib";

import { dbToGray, powerToDb } from "@/features/cases/grayRamp";

const GATEWAY =
  process.env.GATEWAY_URL ?? "https://japv-x2612--nova-frontier-model.us-east.modal.run";
const SOURCE = `${GATEWAY}/v2/cases/qadirabad/layers/baseline_median_hh.tif`;
const OUTPUT = "public/cases/qadirabad-base-gray.png";
// Each 40 m cell becomes a 3 × 3 block: about the size of the old crop, with crisp cell edges.
const SCALE = 3;

type Raster = { width: number; height: number; values: Float32Array; units: string | undefined };

// TIFF field types we read, by their byte size.
const TYPE_SIZE: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 12: 8 };

// Only the subset the gateway writes: little-endian, one band of float32, uncompressed or deflate,
// no predictor. Anything else fails loudly rather than drawing a wrong image.
const readTiff = (buffer: Buffer): Raster => {
  if (buffer.toString("latin1", 0, 2) !== "II" || buffer.readUInt16LE(2) !== 42)
    throw new Error("Expected a little-endian classic TIFF");
  const ifd = buffer.readUInt32LE(4);
  const fields = new Map<number, number[]>();
  const text = new Map<number, string>();
  const count = buffer.readUInt16LE(ifd);
  for (let i = 0; i < count; i += 1) {
    const at = ifd + 2 + i * 12;
    const tag = buffer.readUInt16LE(at);
    const type = buffer.readUInt16LE(at + 2);
    const n = buffer.readUInt32LE(at + 4);
    const size = TYPE_SIZE[type];
    if (size === undefined) continue;
    const start = n * size > 4 ? buffer.readUInt32LE(at + 8) : at + 8;
    if (type === 2) {
      text.set(tag, buffer.toString("latin1", start, start + n).replace(/\0+$/, ""));
      continue;
    }
    const read = (k: number): number =>
      type === 3
        ? buffer.readUInt16LE(start + k * 2)
        : type === 4
          ? buffer.readUInt32LE(start + k * 4)
          : type === 12
            ? buffer.readDoubleLE(start + k * 8)
            : buffer.readUInt8(start + k);
    fields.set(
      tag,
      Array.from({ length: n }, (_, k) => read(k)),
    );
  }
  const one = (tag: number, fallback?: number): number => {
    const value = fields.get(tag)?.[0] ?? fallback;
    if (value === undefined) throw new Error(`TIFF tag ${tag} missing`);
    return value;
  };
  const width = one(256);
  const height = one(257);
  if (one(258) !== 32 || one(339, 1) !== 3 || one(277, 1) !== 1)
    throw new Error("Expected one band of float32");
  if (one(317, 1) !== 1) throw new Error("Expected no predictor");
  const compression = one(259, 1);
  if (compression !== 1 && compression !== 8)
    throw new Error(`Compression ${compression} unsupported`);
  const tiled = fields.has(322);
  const offsets = fields.get(tiled ? 324 : 273) ?? [];
  const lengths = fields.get(tiled ? 325 : 279) ?? [];
  const blockWidth = tiled ? one(322) : width;
  const blockHeight = tiled ? one(323) : one(278, height);
  const across = Math.ceil(width / blockWidth);

  const values = new Float32Array(width * height);
  offsets.forEach((offset, index) => {
    const raw = buffer.subarray(offset, offset + (lengths[index] ?? 0));
    const block = compression === 8 ? inflateSync(raw) : raw;
    const x0 = (index % across) * blockWidth;
    const y0 = Math.floor(index / across) * blockHeight;
    for (let y = 0; y < blockHeight && y0 + y < height; y += 1)
      for (let x = 0; x < blockWidth && x0 + x < width; x += 1)
        values[(y0 + y) * width + x0 + x] = block.readFloatLE((y * blockWidth + x) * 4);
  });
  // GDAL writes band metadata as XML in tag 42112; the gateway names the units there.
  const units = /name="units">([^<]+)</.exec(text.get(42112) ?? "")?.[1];
  return { width, height, values, units };
};

const chunk = (type: string, data: Buffer): Buffer => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
};

// Gray + alpha PNG, each cell scaled up as a block.
const toPng = ({ width, height, values, units }: Raster): Buffer => {
  const toDb = units === "dB" ? (v: number) => v : powerToDb;
  const w = width * SCALE;
  const h = height * SCALE;
  const rows = Buffer.alloc(h * (1 + w * 2));
  for (let y = 0; y < h; y += 1) {
    const row = y * (1 + w * 2);
    for (let x = 0; x < w; x += 1) {
      const value = values[Math.floor(y / SCALE) * width + Math.floor(x / SCALE)] ?? Number.NaN;
      const gray = dbToGray(toDb(value));
      rows[row + 1 + x * 2] = gray ?? 0;
      rows[row + 2 + x * 2] = gray === undefined ? 0 : 255;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(w, 0);
  header.writeUInt32BE(h, 4);
  header.set([8, 4, 0, 0, 0], 8); // 8-bit gray + alpha
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
};

const main = async () => {
  const response = await fetch(SOURCE);
  if (!response.ok) throw new Error(`Gateway returned HTTP ${response.status} for ${SOURCE}`);
  const raster = readTiff(Buffer.from(await response.arrayBuffer()));
  if (raster.units !== "dB")
    process.stderr.write(`Units "${raster.units ?? "none"}": converting to dB\n`);
  await writeFile(OUTPUT, toPng(raster));
  process.stdout.write(`Wrote ${OUTPUT} (${raster.width * SCALE} × ${raster.height * SCALE})\n`);
};

await main();
