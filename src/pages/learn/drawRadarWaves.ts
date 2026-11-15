// Canvas drawing for the Learn radar waves, ported from the v9 handoff `Radar Waves.dc.html`.
// Geometry and copy come from radarWaves.ts; this file only paints. Colours are the handoff's
// canvas inks (a canvas can't read CSS tokens per stroke).
import {
  bandById,
  BEAM_HALF,
  beamDistance,
  echoDotStep,
  echoStrength,
  ECHO_OFFSET,
  inBeam,
  RADAR_WAVES_COPY,
  waveAmp,
  wavePx,
  type BandId,
  type PolId,
  type PulseGeometry,
  type Scene,
} from "@/pages/learn/radarWaves";

const TAU = Math.PI * 2;
const INK = "#ebe9e4";
const INK_2 = "#d4d2cc";
const MUTED = "#a9a69e";
const BACKING = "rgba(4,7,14,0.85)";
const SENT = "#e9cf95";
const ECHO_INK: Record<PolId, string> = { HH: "#e8894a", HV: "#6fb3e8" };

export type FrameState = {
  band: BandId;
  pol: PolId;
  inc: number;
  /** Seconds of animation time; frozen at 0 under reduced motion. */
  t: number;
  reduced: boolean;
  monoFont: string;
};

// Everything that doesn't move or react to the controls: sky, grid, stars, soil, trunks and the
// back row of leaves. Drawn once per size into an offscreen canvas.
export const drawStatic = (g: CanvasRenderingContext2D, scene: Scene): void => {
  const { W, H, groundY } = scene;
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#040814");
  sky.addColorStop(0.55, "#0a1428");
  sky.addColorStop(1, "#060b16");
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W * 0.8, 0, 0, W * 0.8, 0, W * 0.7);
  glow.addColorStop(0, "rgba(111,179,232,0.10)");
  glow.addColorStop(1, "rgba(111,179,232,0)");
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);

  g.strokeStyle = "rgba(235,233,228,0.035)";
  g.lineWidth = 1;
  g.beginPath();
  for (let x = 0; x <= W; x += 32) {
    g.moveTo(x + 0.5, 0);
    g.lineTo(x + 0.5, H);
  }
  for (let y = 0; y <= H; y += 32) {
    g.moveTo(0, y + 0.5);
    g.lineTo(W, y + 0.5);
  }
  g.stroke();
  for (const s of scene.stars) {
    g.fillStyle = `rgba(220,228,245,${s.a})`;
    g.beginPath();
    g.arc(s.x, s.y, s.r, 0, TAU);
    g.fill();
  }

  const soil = g.createLinearGradient(0, groundY, 0, H);
  soil.addColorStop(0, "#1f1810");
  soil.addColorStop(1, "#0c0906");
  g.fillStyle = soil;
  g.fillRect(0, groundY, W, H - groundY);
  g.strokeStyle = "rgba(201,180,139,0.14)";
  for (let y = groundY + 5, i = 0; y < H; y += 5, i++) {
    g.setLineDash([12 + (i % 3) * 8, 4 + (i % 4) * 3]);
    g.lineDashOffset = i * 7;
    g.beginPath();
    g.moveTo(0, y + 0.5);
    g.lineTo(W, y + 0.5);
    g.stroke();
  }
  g.setLineDash([]);
  g.lineDashOffset = 0;
  for (const p of scene.grains) {
    g.fillStyle = `rgba(201,180,139,${p.a})`;
    g.fillRect(p.x, p.y, 1.2, 1.2);
  }
  g.strokeStyle = "rgba(235,233,228,0.5)";
  g.beginPath();
  g.moveTo(0, groundY + 0.5);
  g.lineTo(W, groundY + 0.5);
  g.stroke();

  for (const tree of scene.trees) {
    g.strokeStyle = `rgba(160,132,92,${tree.depth ? 0.25 : 0.6})`;
    g.lineWidth = tree.depth ? 1 : 1.4;
    g.beginPath();
    g.moveTo(tree.x, groundY);
    g.lineTo(tree.x, tree.trunkTop);
    for (const branch of tree.branches) {
      g.moveTo(tree.x, branch.y);
      g.lineTo(tree.x + branch.d * 16 * tree.scale, branch.y - 14 * tree.scale);
    }
    g.stroke();
  }
  g.fillStyle = "rgb(98,150,110)";
  for (const p of scene.pts) {
    if (!p.depth) continue;
    g.globalAlpha = p.a;
    g.beginPath();
    g.arc(p.x, p.y, p.r, 0, TAU);
    g.fill();
  }
  g.globalAlpha = 1;
};

const drawSatellite = (g: CanvasRenderingContext2D, geo: PulseGeometry): void => {
  g.save();
  g.translate(geo.sx, geo.sy);
  g.strokeStyle = "rgba(235,233,228,0.85)";
  g.lineWidth = 1.2;
  // Solar wing with its cells, the arm, the gold bus, the radar box and the boom.
  g.strokeRect(-98, -4, 66, 8);
  g.beginPath();
  for (let k = -90; k < -32; k += 8) {
    g.moveTo(k, -4);
    g.lineTo(k, 4);
  }
  g.moveTo(-32, 0);
  g.lineTo(-12, 0);
  g.stroke();
  const foil = g.createLinearGradient(-12, -10, 12, 10);
  foil.addColorStop(0, "#e0c27a");
  foil.addColorStop(1, "#9c7636");
  g.fillStyle = foil;
  g.fillRect(-12, -10, 24, 20);
  g.strokeRect(-12, -10, 24, 20);
  g.strokeRect(-8, -20, 16, 10);
  g.beginPath();
  g.moveTo(8, -12);
  g.lineTo(30, -10);
  g.stroke();
  // The reflector turns to face along the beam.
  g.translate(30, -10);
  g.rotate(Math.atan2(geo.uy, geo.ux) - Math.PI / 2);
  g.strokeStyle = SENT;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(-34, 0);
  g.quadraticCurveTo(0, 16, 34, 0);
  g.stroke();
  g.strokeStyle = "rgba(233,207,149,0.45)";
  g.lineWidth = 0.8;
  g.beginPath();
  for (let k = -24; k <= 24; k += 8) {
    g.moveTo(k, (1 - (k / 34) ** 2) * 8);
    g.lineTo(0, -6);
  }
  g.stroke();
  g.restore();
};

type WaveLine = {
  ax: number;
  ay: number;
  dx: number;
  dy: number;
  length: number;
  colour: string;
  phase: number;
  /** HV: a straight line with dots, the echo "twisted" out of the drawing plane. */
  dotted: boolean;
  alpha: number;
};

const drawWave = (
  g: CanvasRenderingContext2D,
  geo: PulseGeometry,
  px: number,
  line: WaveLine,
): void => {
  const amp = waveAmp(px);
  const k = TAU / px;
  g.save();
  g.globalCompositeOperation = "lighter";
  g.globalAlpha = line.alpha;
  g.shadowColor = line.colour;
  g.shadowBlur = 10;
  g.strokeStyle = line.colour;
  g.lineWidth = 1.8;
  g.beginPath();
  for (let s = 0; s <= line.length; s += 1.5) {
    const q = line.dotted ? 0 : Math.sin(k * s - line.phase) * amp;
    const x = line.ax + line.dx * s + geo.nx * q;
    const y = line.ay + line.dy * s + geo.ny * q;
    if (s === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
  if (line.dotted) {
    for (let s = 0; s <= line.length; s += echoDotStep(px)) {
      const q = Math.abs(Math.sin(k * s - line.phase));
      g.globalAlpha = line.alpha * (0.25 + 0.75 * q);
      g.beginPath();
      g.arc(line.ax + line.dx * s, line.ay + line.dy * s, 1.2 + 2.6 * q, 0, TAU);
      g.stroke();
    }
  }
  g.restore();
};

const label = (g: CanvasRenderingContext2D, text: string, x: number, y: number): void => {
  const width = g.measureText(text).width;
  g.fillStyle = BACKING;
  g.fillRect(x - 4, y - 11, width + 8, 15);
  g.fillStyle = INK_2;
  g.fillText(text, x, y);
};

const leader = (g: CanvasRenderingContext2D, scene: Scene, y: number, text: string): void => {
  g.strokeStyle = "rgba(235,233,228,0.4)";
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(scene.W - 70, y);
  g.lineTo(scene.W - 90, y);
  g.stroke();
  label(g, text, scene.W - 85, y + 3);
};

export const drawFrame = (
  g: CanvasRenderingContext2D,
  scene: Scene,
  staticLayer: CanvasImageSource,
  geo: PulseGeometry,
  state: FrameState,
): void => {
  const { W, H, canopyTop, canopyH, groundY } = scene;
  const { band, pol, t, reduced } = state;
  g.drawImage(staticLayer, 0, 0, W, H);

  // Front leaves: the ones inside the beam light up gold, the rest twinkle softly.
  for (const p of scene.pts) {
    if (p.depth) continue;
    g.beginPath();
    if (inBeam(scene, geo, band, p)) {
      const d = beamDistance(geo, p.x, p.y);
      const k = 1 - d / BEAM_HALF;
      g.fillStyle = `rgba(233,207,149,${Math.min(1, 0.4 + k * 0.8)})`;
      g.arc(p.x, p.y, p.r + 0.6 * k, 0, TAU);
    } else {
      const twinkle = reduced ? 1 : 0.75 + 0.25 * Math.sin(t * 1.4 + p.tw);
      g.fillStyle = `rgba(126,190,138,${p.a * twinkle})`;
      g.arc(p.x, p.y, p.r, 0, TAU);
    }
    g.fill();
  }

  // Beam envelope.
  g.strokeStyle = "rgba(233,207,149,0.12)";
  g.lineWidth = 1;
  g.setLineDash([2, 6]);
  g.beginPath();
  for (const side of [-1, 1]) {
    g.moveTo(geo.ex + geo.nx * 6 * side, geo.ey + geo.ny * 6 * side);
    g.lineTo(geo.hx + geo.nx * BEAM_HALF * side, geo.hitY + geo.ny * BEAM_HALF * side);
  }
  g.stroke();
  g.setLineDash([]);

  drawSatellite(g, geo);

  const px = wavePx(bandById(band).cm, W);
  const phase = t * 6;
  drawWave(g, geo, px, {
    ax: geo.ex,
    ay: geo.ey,
    dx: geo.ux,
    dy: geo.uy,
    length: geo.length,
    colour: SENT,
    phase,
    dotted: false,
    alpha: 1,
  });
  drawWave(g, geo, px, {
    ax: geo.hx + geo.nx * ECHO_OFFSET,
    ay: geo.hitY + geo.ny * ECHO_OFFSET,
    dx: -geo.ux,
    dy: -geo.uy,
    length: geo.length * 0.88,
    colour: ECHO_INK[pol],
    phase: phase + Math.PI,
    dotted: pol === "HV",
    alpha: 0.45 + 0.55 * echoStrength(band, pol),
  });

  // Scatter flash at the hit point.
  const pulse = reduced ? 0.6 : 0.5 + 0.5 * Math.sin(t * 5);
  const flash = g.createRadialGradient(geo.hx, geo.hitY, 0, geo.hx, geo.hitY, 18 + 8 * pulse);
  flash.addColorStop(0, "rgba(255,240,210,0.85)");
  flash.addColorStop(1, "rgba(255,240,210,0)");
  g.fillStyle = flash;
  g.beginPath();
  g.arc(geo.hx, geo.hitY, 28, 0, TAU);
  g.fill();

  // Annotations.
  g.font = `500 10px ${state.monoFont}`;
  g.textAlign = "left";
  const lx = Math.max(8, geo.sx - 98);
  const ly = Math.max(16, geo.sy - 64);
  const lw = Math.max(
    g.measureText(RADAR_WAVES_COPY.nisar).width,
    g.measureText(RADAR_WAVES_COPY.nisarSub).width,
  );
  g.fillStyle = BACKING;
  g.fillRect(lx - 4, ly - 11, lw + 8, 28);
  g.fillStyle = INK;
  g.fillText(RADAR_WAVES_COPY.nisar, lx, ly);
  g.fillStyle = MUTED;
  g.fillText(RADAR_WAVES_COPY.nisarSub, lx, ly + 12);

  leader(g, scene, canopyTop + canopyH * 0.2, RADAR_WAVES_COPY.leaves);
  leader(g, scene, canopyTop + canopyH * 0.62, RADAR_WAVES_COPY.branches);
  leader(g, scene, groundY + (H - groundY) * 0.5, RADAR_WAVES_COPY.soil);

  // Reach line and its label.
  g.setLineDash([3, 5]);
  g.strokeStyle = "rgba(235,233,228,0.35)";
  g.beginPath();
  g.moveTo(0, geo.hitY + 0.5);
  g.lineTo(geo.hx - 34, geo.hitY + 0.5);
  g.stroke();
  g.setLineDash([]);
  const reach = bandById(band).reachLabel;
  g.fillStyle = BACKING;
  g.fillRect(8, geo.hitY - 18, g.measureText(reach).width + 8, 15);
  g.fillStyle = INK;
  g.fillText(reach, 12, geo.hitY - 7);

  // Incidence angle from the vertical at the hit point.
  const inc = (state.inc * Math.PI) / 180;
  g.strokeStyle = "rgba(235,233,228,0.5)";
  g.beginPath();
  g.moveTo(geo.hx, geo.hitY);
  g.lineTo(geo.hx, geo.hitY - 64);
  g.stroke();
  g.beginPath();
  g.arc(geo.hx, geo.hitY, 44, -Math.PI / 2 - inc, -Math.PI / 2);
  g.stroke();
  g.fillStyle = "rgba(4,7,14,0.8)";
  g.fillRect(geo.hx + 8, geo.hitY - 70, 30, 16);
  g.fillStyle = INK;
  g.fillText(`${state.inc}°`, geo.hx + 12, geo.hitY - 58);

  // 24 cm scale bar, at the same cm → px factor as the waves.
  const bar = wavePx(24, W);
  g.fillRect(W - bar - 16, H - 16, bar, 1.5);
  g.fillText(RADAR_WAVES_COPY.scaleBar, W - bar - 16, H - 22);
};
