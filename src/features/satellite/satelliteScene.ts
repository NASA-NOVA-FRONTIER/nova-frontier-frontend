// three.js scene of NISAR, ported from the design reference nisar-satellite.js (published NASA/JPL
// dimensions: 12 m mesh reflector on a ring truss, 9 m boom, octagonal L/S-band instrument, ISRO bus).
// Loaded with a dynamic import, so three and the model sit in their own chunk.
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  type ColorRepresentation,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  EquirectangularReflectionMapping,
  Float32BufferAttribute,
  FrontSide,
  Group,
  HemisphereLight,
  LatheGeometry,
  LineBasicMaterial,
  LineSegments,
  type Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Points,
  PointsMaterial,
  Quaternion,
  Ray,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  Sphere,
  SphereGeometry,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";

import type { SatellitePartId } from "@/features/satellite/satelliteParts";
import { pixelRatioFor, type SatellitePose, type Vec3 } from "@/features/satellite/satelliteMotion";

export type FrameInput = {
  pose: SatellitePose;
  camera: { position: Vec3; target: Vec3 };
  /** 0–1 share of the width the model shifts right. */
  offsetX: number;
  /** Seconds since start; undefined keeps the Earth still (reduced motion). */
  time: number | undefined;
};

export type SatelliteScene = {
  render: (frame: FrameInput) => void;
  /** A part's anchor in normalised device coordinates for the last rendered camera. */
  project: (id: SatellitePartId) => { x: number; y: number; z: number };
  resize: (width: number, height: number) => void;
  dispose: () => void;
};

type SceneOptions = {
  earth?: string | undefined;
  /** Called when a late asset (the Earth texture) arrives, so a paused stage can redraw. */
  onAssetLoad: () => void;
};

type MaterialOptions = {
  m?: number;
  r?: number;
  map?: Texture;
  bump?: Texture;
  bs?: number;
  alpha?: Texture;
  op?: number;
  ds?: boolean;
  env?: number;
  dw?: boolean;
  em?: ColorRepresentation;
};

// Same seed as the reference, so the foil looks the same.
const seededRandom = () => {
  let seed = 11;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
};

/** Throws when WebGL is unavailable; the component shows the static fallback then. */
export const createSatelliteScene = (
  canvas: HTMLCanvasElement,
  { earth: earthSrc, onAssetLoad }: SceneOptions,
): SatelliteScene => {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(pixelRatioFor(window.devicePixelRatio));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  const scene = new Scene();
  const camera = new PerspectiveCamera(34, 1, 0.1, 2000);
  const textures: Texture[] = [];
  let size = { width: 1, height: 1 };

  // Studio-like environment from a painted equirect, so metals and foil catch light.
  const env = document.createElement("canvas");
  env.width = 512;
  env.height = 256;
  const g = env.getContext("2d");
  if (g !== null) {
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, "#9fb2d6");
    grad.addColorStop(0.45, "#2a3550");
    grad.addColorStop(0.55, "#0b1222");
    grad.addColorStop(1, "#04070e");
    g.fillStyle = grad;
    g.fillRect(0, 0, 512, 256);
    g.fillStyle = "rgba(255,240,215,.9)";
    g.fillRect(60, 40, 120, 26);
    g.fillRect(330, 70, 70, 14);
  }
  const envTex = new CanvasTexture(env);
  envTex.mapping = EquirectangularReflectionMapping;
  envTex.colorSpace = SRGBColorSpace;
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromEquirectangular(envTex).texture;
  envTex.dispose();
  pmrem.dispose();
  scene.add(new HemisphereLight(0xbcc8dc, 0x070b14, 0.5));
  const sun = new DirectionalLight(0xfff1d8, 3);
  sun.position.set(18, 22, 16);
  scene.add(sun);
  const rim = new DirectionalLight(0x8fb0e6, 1.2);
  rim.position.set(-20, 6, -18);
  scene.add(rim);

  const canvasTexture = (
    px: number,
    draw: (c: CanvasRenderingContext2D, s: number) => void,
    repeat: [number, number] = [1, 1],
    srgb = true,
  ): Texture => {
    const c = document.createElement("canvas");
    c.width = px;
    c.height = px;
    const context = c.getContext("2d");
    if (context !== null) draw(context, px);
    const t = new CanvasTexture(c);
    t.wrapS = RepeatWrapping;
    t.wrapT = RepeatWrapping;
    t.repeat.set(...repeat);
    if (srgb) t.colorSpace = SRGBColorSpace;
    t.anisotropy = 8;
    textures.push(t);
    return t;
  };
  const rnd = seededRandom();
  const foil = canvasTexture(
    512,
    (c, s) => {
      c.fillStyle = "#b08a4a";
      c.fillRect(0, 0, s, s);
      for (let i = 0; i < 1100; i++) {
        c.fillStyle =
          rnd() > 0.5
            ? `rgba(255,228,170,${0.05 + rnd() * 0.14})`
            : `rgba(60,38,10,${0.05 + rnd() * 0.16})`;
        c.beginPath();
        const x = rnd() * s;
        const y = rnd() * s;
        c.moveTo(x, y);
        for (let k = 0; k < 3; k++) c.lineTo(x + (rnd() - 0.5) * 80, y + (rnd() - 0.5) * 80);
        c.fill();
      }
    },
    [1.4, 1.4],
  );
  const cells = canvasTexture(512, (c, s) => {
    c.fillStyle = "#8a929e";
    c.fillRect(0, 0, s, s);
    const n = 8;
    const w = s / n;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const gr = c.createLinearGradient(x * w, y * w, x * w + w, y * w + w);
        gr.addColorStop(0, "#22366a");
        gr.addColorStop(1, "#0b1530");
        c.fillStyle = gr;
        c.fillRect(x * w + 3, y * w + 3, w - 6, w - 6);
      }
  });
  const tiles = canvasTexture(256, (c, s) => {
    c.fillStyle = "#1b2331";
    c.fillRect(0, 0, s, s);
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        c.fillStyle = (x + y) % 2 ? "#2c374a" : "#344156";
        c.fillRect(x * 64 + 3, y * 64 + 3, 58, 58);
        c.fillStyle = "#c9b48b";
        c.fillRect(x * 64 + 28, y * 64 + 28, 8, 8);
      }
  });
  const meshAlpha = canvasTexture(
    512,
    (c, s) => {
      c.fillStyle = "#000";
      c.fillRect(0, 0, s, s);
      c.strokeStyle = "#fff";
      c.lineWidth = 2.5;
      for (let i = 4; i < s; i += 22) {
        c.beginPath();
        c.moveTo(i, 0);
        c.lineTo(i, s);
        c.moveTo(0, i);
        c.lineTo(s, i);
        c.stroke();
      }
    },
    [7, 7],
    false,
  );

  const M = (color: ColorRepresentation, o: MaterialOptions = {}) =>
    new MeshStandardMaterial({
      color,
      metalness: o.m ?? 0.3,
      roughness: o.r ?? 0.55,
      map: o.map ?? null,
      bumpMap: o.bump ?? null,
      bumpScale: o.bs ?? 1,
      alphaMap: o.alpha ?? null,
      transparent: o.alpha !== undefined || o.op !== undefined,
      opacity: o.op ?? 1,
      side: o.ds ? DoubleSide : FrontSide,
      envMapIntensity: o.env ?? 1,
      depthWrite: o.dw ?? true,
      emissive: o.em ?? 0x000000,
    });
  const gold = () => M(0xffe2a8, { m: 0.6, r: 0.38, map: foil, bump: foil, bs: 1.5, env: 1.6 });
  const silver = M(0xcfd4da, { m: 0.85, r: 0.28 });
  const white = M(0xe9e6df, { m: 0.12, r: 0.55 });
  const dark = M(0x1d2330, { m: 0.5, r: 0.45 });
  const sat = new Group();
  scene.add(sat);
  const anchors = new Map<SatellitePartId, Object3D>();
  const anchor = (id: SatellitePartId, parent: Object3D, x: number, y: number, z: number) => {
    const o = new Object3D();
    o.position.set(x, y, z);
    parent.add(o);
    anchors.set(id, o);
  };

  // Bus (ISRO): gold foil, radiator panel and the Ka-band dish below.
  const bus = new Group();
  sat.add(bus);
  bus.add(new Mesh(new BoxGeometry(2.2, 2.0, 2.2), gold()));
  for (const y of [1.03, -1.03]) {
    const m = new Mesh(new BoxGeometry(2.3, 0.08, 2.3), silver);
    m.position.set(0, y, 0);
    bus.add(m);
  }
  const radiator = new Mesh(new BoxGeometry(1.6, 1.4, 0.04), M(0xd8dde4, { m: 0.2, r: 0.3 }));
  radiator.position.set(0, 0, 1.12);
  bus.add(radiator);
  const ka = new Mesh(
    new SphereGeometry(0.42, 32, 12, 0, Math.PI * 2, 0, 0.9),
    M(0xe5e2db, { m: 0.2, r: 0.4, ds: true }),
  );
  ka.rotation.x = Math.PI;
  ka.position.set(-0.4, -1.45, 0.3);
  bus.add(ka);
  const kaPost = new Mesh(new CylinderGeometry(0.04, 0.04, 0.4, 8), silver);
  kaPost.position.set(-0.4, -1.2, 0.3);
  bus.add(kaPost);
  anchor("bus", bus, 0, 0, 1.25);

  // Solar array: one wing of three panels on a yoke.
  const solar = new Group();
  solar.position.set(-1.1, 0.2, 0);
  sat.add(solar);
  const yoke = new Mesh(new CylinderGeometry(0.05, 0.05, 1.0, 10), silver);
  yoke.rotation.z = Math.PI / 2;
  yoke.position.x = -0.5;
  solar.add(yoke);
  for (let i = 0; i < 3; i++) {
    const frame = () => M(0x8b939d, { m: 0.8 });
    const panel = new Mesh(new BoxGeometry(2.1, 0.05, 2.6), [
      frame(),
      frame(),
      M(0xffffff, { m: 0.6, r: 0.22, map: cells }),
      M(0x3a414c, { m: 0.4 }),
      frame(),
      frame(),
    ]);
    panel.position.x = -2.1 - i * 2.18;
    solar.add(panel);
  }
  anchor("solar", solar, -4.3, 0.2, 0);

  // Octagonal instrument structure (NASA) with the L-band feed tiles and the S-band feed.
  const inst = new Group();
  inst.position.y = 2.35;
  sat.add(inst);
  const oct = new Mesh(new CylinderGeometry(1.35, 1.35, 2.7, 8), white);
  oct.rotation.y = Math.PI / 8;
  inst.add(oct);
  for (const y of [-1.35, 0, 1.35]) {
    const band = new Mesh(new CylinderGeometry(1.37, 1.37, 0.07, 8), silver);
    band.rotation.y = Math.PI / 8;
    band.position.y = y;
    inst.add(band);
  }
  const feed = new Group();
  feed.position.set(1.27, -0.15, 0);
  inst.add(feed);
  feed.add(new Mesh(new BoxGeometry(0.06, 1.7, 1.05), dark));
  const tileMaterial = M(0xffffff, { m: 0.5, r: 0.45, map: tiles });
  const tileGeometry = new BoxGeometry(0.05, 0.36, 0.3);
  for (let y = 0; y < 4; y++)
    for (let z = 0; z < 3; z++) {
      const t = new Mesh(tileGeometry, tileMaterial);
      t.position.set(0.05, -0.6 + y * 0.4, -0.34 + z * 0.34);
      feed.add(t);
    }
  anchor("lband", feed, 0.2, -0.2, 0);
  const sfeed = new Mesh(new BoxGeometry(0.06, 0.42, 0.9), gold());
  sfeed.position.set(1.28, 1.0, 0);
  inst.add(sfeed);
  anchor("sband", inst, 1.45, 1.0, 0);

  // 9 m boom: four hinged truss segments, folded at deploy 0.
  const base = new Vector3(0.9, 3.75, 0);
  const dir = new Vector3(0.6, 0.8, 0).normalize();
  const boomRoot = new Group();
  boomRoot.position.copy(base);
  boomRoot.quaternion.setFromUnitVectors(new Vector3(1, 0, 0), dir);
  sat.add(boomRoot);
  const strut = M(0xece9e2, { m: 0.15, r: 0.45 });
  const joint = M(0x8b939d, { m: 0.9, r: 0.25 });
  const SEG = 2.25;
  const longeron = new CylinderGeometry(0.035, 0.035, SEG, 8);
  const diagonal = new CylinderGeometry(0.016, 0.016, 0.4, 6);
  const hingeGeometry = new CylinderGeometry(0.17, 0.17, 0.26, 16);
  const segments: Group[] = [];
  let parent: Object3D = boomRoot;
  for (let k = 0; k < 4; k++) {
    const hinge = new Group();
    if (k) hinge.position.x = SEG;
    parent.add(hinge);
    for (let j = 0; j < 3; j++) {
      const a = (j / 3) * Math.PI * 2;
      const l = new Mesh(longeron, strut);
      l.rotation.z = Math.PI / 2;
      l.position.set(SEG / 2, Math.cos(a) * 0.13, Math.sin(a) * 0.13);
      hinge.add(l);
    }
    for (let j = 0; j < 6; j++) {
      const d = new Mesh(diagonal, strut);
      d.position.set(0.2 + j * 0.36, 0, 0);
      d.rotation.x = j % 2 ? 0.9 : -0.9;
      hinge.add(d);
    }
    const h = new Mesh(hingeGeometry, joint);
    h.rotation.x = Math.PI / 2;
    hinge.add(h);
    segments.push(hinge);
    parent = hinge;
  }
  const tip = new Group();
  tip.position.x = SEG;
  parent.add(tip);
  const secondSegment = segments[1];
  if (secondSegment !== undefined) anchor("boom", secondSegment, SEG / 2, 0.35, 0);

  // 12 m reflector: shallow paraboloid of gold mesh, radial ribs and a ring truss (the drum).
  sat.updateMatrixWorld(true);
  const tipW = tip.getWorldPosition(new Vector3());
  const feedW = feed.getWorldPosition(new Vector3());
  const C = tipW.clone().add(new Vector3(4.9, 2.2, 0));
  const axis = feedW.clone().sub(C).normalize();
  const refl = new Group();
  refl.position.copy(C);
  refl.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), axis);
  scene.add(refl);
  const dish = new Group();
  refl.add(dish);
  const F = 6.5;
  const profile: Vector2[] = [];
  for (let i = 0; i <= 32; i++) {
    const rr = (6 * i) / 32;
    profile.push(new Vector2(rr, (rr * rr) / (4 * F)));
  }
  const dishGeometry = new LatheGeometry(profile, 96);
  dish.add(
    new Mesh(
      dishGeometry,
      M(0xc9a560, { m: 0.35, r: 0.5, op: 0.22, ds: true, dw: false, em: 0x3a2c12 }),
    ),
  );
  dish.add(
    new Mesh(
      dishGeometry,
      M(0xf3d38c, {
        m: 0.4,
        r: 0.35,
        alpha: meshAlpha,
        ds: true,
        op: 0.95,
        dw: false,
        em: 0x6b5424,
      }),
    ),
  );
  const ribs: number[] = [];
  for (let a = 0; a < 24; a++) {
    const t = (a / 24) * Math.PI * 2;
    for (let i = 0; i < 16; i++) {
      const r0 = (6 * i) / 16;
      const r1 = (6 * (i + 1)) / 16;
      ribs.push(r0 * Math.cos(t), (r0 * r0) / (4 * F), r0 * Math.sin(t));
      ribs.push(r1 * Math.cos(t), (r1 * r1) / (4 * F), r1 * Math.sin(t));
    }
  }
  const ribGeometry = new BufferGeometry();
  ribGeometry.setAttribute("position", new Float32BufferAttribute(ribs, 3));
  dish.add(
    new LineSegments(
      ribGeometry,
      new LineBasicMaterial({ color: 0xe8cf95, transparent: true, opacity: 0.8 }),
    ),
  );
  const rimY = 36 / (4 * F);
  const depth = 0.95;
  const ringGeometry = new TorusGeometry(6, 0.06, 8, 160);
  for (const y of [rimY, rimY - depth]) {
    const ring = new Mesh(ringGeometry, strut);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    dish.add(ring);
  }
  const truss: number[] = [];
  for (let a = 0; a < 36; a++) {
    const t0 = (a / 36) * Math.PI * 2;
    const t1 = ((a + 1) / 36) * Math.PI * 2;
    const p0 = [6 * Math.cos(t0), rimY, 6 * Math.sin(t0)];
    const q0 = [6 * Math.cos(t0), rimY - depth, 6 * Math.sin(t0)];
    const q1 = [6 * Math.cos(t1), rimY - depth, 6 * Math.sin(t1)];
    truss.push(...p0, ...q0, ...p0, ...q1);
  }
  const trussGeometry = new BufferGeometry();
  trussGeometry.setAttribute("position", new Float32BufferAttribute(truss, 3));
  dish.add(
    new LineSegments(
      trussGeometry,
      new LineBasicMaterial({ color: 0xe9e6df, transparent: true, opacity: 0.9 }),
    ),
  );
  dish.add(new Mesh(new CylinderGeometry(0.35, 0.45, 0.35, 24), joint));
  anchor("reflector", refl, 0, rimY + 0.4, 5.2);
  tip.attach(refl);
  const reflDeployedP = refl.position.clone();
  const reflDeployedQ = refl.quaternion.clone();
  const reflStowedP = new Vector3(0.2, 0, 0);
  const reflStowedQ = new Quaternion().setFromUnitVectors(
    new Vector3(0, 1, 0),
    new Vector3(1, 0, 0),
  );

  // Earth, atmosphere, stars, and the side-looking beam with its swath.
  const ER = 70;
  const earthC = new Vector3(0, -88, 0);
  const earthMat = new MeshStandardMaterial({
    color: 0x223355,
    roughness: 0.95,
    metalness: 0,
    emissive: 0xffffff,
    emissiveIntensity: 0.18,
    envMapIntensity: 0.2,
  });
  const earth = new Mesh(new SphereGeometry(ER, 128, 96), earthMat);
  earth.position.copy(earthC);
  earth.rotation.set(0.45, 2.2, 0);
  scene.add(earth);
  let disposed = false;
  if (earthSrc !== undefined) {
    new TextureLoader().load(earthSrc, (tx) => {
      if (disposed) {
        tx.dispose();
        return;
      }
      tx.colorSpace = SRGBColorSpace;
      tx.anisotropy = 8;
      textures.push(tx);
      earthMat.map = tx;
      earthMat.emissiveMap = tx;
      earthMat.color.set(0xffffff);
      earthMat.needsUpdate = true;
      onAssetLoad();
    });
  }
  const atmosphere = new Mesh(
    new SphereGeometry(ER * 1.006, 96, 64),
    new ShaderMaterial({
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      vertexShader:
        "varying vec3 vN;varying vec3 vP;void main(){vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vP=mv.xyz;gl_Position=projectionMatrix*mv;}",
      fragmentShader:
        "varying vec3 vN;varying vec3 vP;void main(){float f=pow(clamp(1.-dot(normalize(-vP),vN),0.,1.),4.);gl_FragColor=vec4(.42,.6,.95,1.)*f*.6;}",
    }),
  );
  atmosphere.position.copy(earthC);
  scene.add(atmosphere);
  const stars: number[] = [];
  for (let i = 0; i < 2400; i++) {
    const u = rnd() * 2 - 1;
    const a = rnd() * Math.PI * 2;
    const rr = 700 * Math.sqrt(1 - u * u);
    stars.push(rr * Math.cos(a), 700 * u, rr * Math.sin(a));
  }
  const starGeometry = new BufferGeometry();
  starGeometry.setAttribute("position", new Float32BufferAttribute(stars, 3));
  scene.add(
    new Points(
      starGeometry,
      new PointsMaterial({
        color: 0xcfd6e6,
        size: 1.2,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.7,
      }),
    ),
  );
  sat.updateMatrixWorld(true);
  const Cw = refl.getWorldPosition(new Vector3());
  const look = new Vector3(0.62, -1, 0).normalize();
  const hit = new Vector3();
  new Ray(Cw, look).intersectSphere(new Sphere(earthC, ER), hit);
  const len = Cw.distanceTo(hit);
  const beamGeometry = new ConeGeometry(7, len, 64, 1, true);
  beamGeometry.translate(0, -len / 2, 0);
  const beamMat = new MeshBasicMaterial({
    color: 0xe9cf95,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
  });
  const beam = new Mesh(beamGeometry, beamMat);
  beam.position.copy(Cw);
  beam.quaternion.setFromUnitVectors(new Vector3(0, -1, 0), look);
  beam.scale.set(1, 1, 3.2);
  scene.add(beam);
  const swathCanvas = document.createElement("canvas");
  swathCanvas.width = 64;
  swathCanvas.height = 256;
  const sx = swathCanvas.getContext("2d");
  if (sx !== null) {
    const sgr = sx.createLinearGradient(0, 0, 64, 0);
    sgr.addColorStop(0, "rgba(201,180,139,0)");
    sgr.addColorStop(0.2, "rgba(201,180,139,.9)");
    sgr.addColorStop(0.8, "rgba(201,180,139,.9)");
    sgr.addColorStop(1, "rgba(201,180,139,0)");
    sx.fillStyle = sgr;
    sx.fillRect(0, 0, 64, 256);
  }
  const swathTexture = new CanvasTexture(swathCanvas);
  textures.push(swathTexture);
  const swathMat = new MeshBasicMaterial({
    map: swathTexture,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
  });
  const swath = new Mesh(new PlaneGeometry(14, 34), swathMat);
  const normal = hit.clone().sub(earthC).normalize();
  swath.position.copy(hit.clone().add(normal.clone().multiplyScalar(0.15)));
  swath.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), normal);
  swath.rotateZ(Math.PI);
  scene.add(swath);

  let lastOffset: number | undefined;
  const point = new Vector3();

  const render = ({ pose, camera: pose3, offsetX, time }: FrameInput) => {
    segments.forEach((s, k) => {
      s.rotation.z = pose.boomAngles[k] ?? 0;
    });
    dish.scale.set(pose.dishScale, 1, pose.dishScale);
    refl.position.lerpVectors(reflStowedP, reflDeployedP, pose.reflectorT);
    refl.quaternion.slerpQuaternions(reflStowedQ, reflDeployedQ, pose.reflectorT);
    beamMat.opacity = 0.11 * pose.beam;
    swathMat.opacity = 0.7 * pose.beam;
    if (time !== undefined) earth.rotation.y = 2.2 + time * 0.006;
    camera.position.set(...pose3.position);
    camera.lookAt(...pose3.target);
    const off = offsetX * size.width;
    if (off !== lastOffset) {
      lastOffset = off;
      if (off) camera.setViewOffset(size.width, size.height, -off, 0, size.width, size.height);
      else camera.clearViewOffset();
    }
    renderer.render(scene, camera);
  };

  const project = (id: SatellitePartId) => {
    const o = anchors.get(id);
    if (o === undefined) return { x: 0, y: 0, z: 2 };
    o.getWorldPosition(point).project(camera);
    return { x: point.x, y: point.y, z: point.z };
  };

  const resize = (width: number, height: number) => {
    size = { width: Math.max(1, width), height: Math.max(1, height) };
    renderer.setSize(size.width, size.height, false);
    camera.aspect = size.width / size.height;
    lastOffset = undefined;
    camera.updateProjectionMatrix();
  };

  const dispose = () => {
    disposed = true;
    const geometries = new Set<BufferGeometry>();
    const materials = new Set<Material>();
    scene.traverse((object) => {
      if (object instanceof Mesh || object instanceof LineSegments || object instanceof Points) {
        geometries.add(object.geometry);
        const material: Material | Material[] = object.material;
        for (const m of Array.isArray(material) ? material : [material]) materials.add(m);
      }
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    for (const texture of textures) texture.dispose();
    scene.environment?.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  };

  return { render, project, resize, dispose };
};
