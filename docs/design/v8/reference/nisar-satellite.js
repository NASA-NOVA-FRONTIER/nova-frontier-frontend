// <nisar-satellite>: an interactive three.js model of NISAR built to the published dimensions
// (12 m mesh reflector on a ring truss, 9 m boom, octagonal L/S-band instrument structure, ISRO bus).
// Attributes: deploy (0–1), beam (0–1), hotspots, autorotate, scroll-driven, earth="<image path>".
(() => {
  if (customElements.get("nisar-satellite")) return;
  const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
  let threeP;
  const loadThree = () => (threeP ||= import(THREE_URL));
  const RU = (p) => (p && window.__resources && window.__resources[p.replace(/[^a-z0-9]/gi, "_")]) || p;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ss = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const PARTS = {
    reflector: ["12 m reflector", "Gold-plated wire mesh stretched on a ring truss. It focuses the radar into a swath more than 240 km wide."],
    boom: ["9 m boom", "Holds the reflector away from the spacecraft. It unfolded in orbit after launch."],
    lband: ["L-band radar · 24 cm", "Built by NASA/JPL. The long wave passes leaves and reaches branches, trunks and soil."],
    sband: ["S-band radar · 9.4 cm", "Built by ISRO. A shorter wave that responds more to leaves and the top of crops."],
    bus: ["Spacecraft bus", "Provided by ISRO, carrying NASA's 3.5 Gbps Ka-band link that sends the data down."],
    solar: ["Solar array", "Keeps both radars and the recorder powered around the orbit."],
  };

  class NisarSatellite extends HTMLElement {
    static get observedAttributes() { return ["deploy", "beam"]; }
    attributeChangedCallback() { this._dirty = true; }
    connectedCallback() {
      if (this._root) return;
      const root = (this._root = this.attachShadow({ mode: "open" }));
      root.innerHTML = `<style>
        :host{display:block;position:relative;width:100%;height:100%;min-height:300px;touch-action:pan-y;user-select:none}
        canvas{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:grab;outline:none}
        canvas.drag{cursor:grabbing}
        .hs{position:absolute;left:0;top:0;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;border:1.5px solid #c9b48b;background:rgba(4,7,14,.6);display:grid;place-items:center;cursor:pointer;padding:0;transition:opacity .35s,background .2s}
        .hs::after{content:"";width:6px;height:6px;border-radius:50%;background:#c9b48b;transition:background .2s}
        .hs:hover,.hs[aria-pressed="true"]{transform:scale(1.18);background:#c9b48b}
        .hs:hover::after,.hs[aria-pressed="true"]::after{background:#04070e}
        .hs:focus-visible{outline:2px solid #ebe9e4;outline-offset:3px}
        .tip{position:absolute;left:0;top:0;width:250px;padding:12px 14px;border-radius:14px;background:rgba(8,16,31,.95);border:1px solid rgba(235,233,228,.14);backdrop-filter:blur(14px);color:#ebe9e4;font:14px/1.45 'Albert Sans',system-ui,sans-serif;pointer-events:none;opacity:0;transition:opacity .2s}
        .tip b{display:block;font:500 11px 'JetBrains Mono',monospace;letter-spacing:.06em;color:#c9b48b;text-transform:uppercase;margin-bottom:4px}
        .hint{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);font:11px 'JetBrains Mono',monospace;letter-spacing:.08em;color:#a9a69e;pointer-events:none;transition:opacity .5s;white-space:nowrap}
        .load{position:absolute;inset:0;display:grid;place-items:center;font:11px 'JetBrains Mono',monospace;letter-spacing:.08em;color:#8d8a83}
      </style><div class="load">LOADING NISAR…</div><canvas tabindex="0" aria-label="3D model of the NISAR satellite. Drag to rotate."></canvas><div class="layer"></div><div class="tip" role="status"></div><div class="hint">DRAG TO ROTATE</div>`;
      this._canvas = root.querySelector("canvas");
      this._layer = root.querySelector(".layer");
      this._tip = root.querySelector(".tip");
      this._hint = root.querySelector(".hint"); if (this._has("no-hint")) this._hint.style.display = "none";
      this._start().catch((e) => { root.querySelector(".load").textContent = "3D VIEW UNAVAILABLE"; console.warn(e); });
    }
    disconnectedCallback() {
      cancelAnimationFrame(this._raf); this._ro?.disconnect(); this._io?.disconnect();
      window.removeEventListener("scroll", this._onScroll); this._renderer?.dispose();
    }
    _has(n) { return this.hasAttribute(n) || this.hasAttribute(n.replace(/-/g, "")); }
    _num(name, d) { if (!this.hasAttribute(name)) name = name.replace(/-/g, ""); const v = parseFloat(this.getAttribute(name)); return Number.isFinite(v) ? v : d; }
    async _start() {
      const T = await loadThree();
      this._root.querySelector(".load").remove();
      const canvas = this._canvas;
      const r = (this._renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: "high-performance" }));
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.1;
      const scene = new T.Scene();
      const cam = (this._cam = new T.PerspectiveCamera(34, 1, 0.1, 2000));

      // Studio-like environment from a painted equirect, so metals and foil catch light.
      const env = document.createElement("canvas"); env.width = 512; env.height = 256;
      const g = env.getContext("2d"); const grad = g.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0, "#9fb2d6"); grad.addColorStop(0.45, "#2a3550"); grad.addColorStop(0.55, "#0b1222"); grad.addColorStop(1, "#04070e");
      g.fillStyle = grad; g.fillRect(0, 0, 512, 256); g.fillStyle = "rgba(255,240,215,.9)"; g.fillRect(60, 40, 120, 26); g.fillRect(330, 70, 70, 14);
      const envTex = new T.CanvasTexture(env); envTex.mapping = T.EquirectangularReflectionMapping; envTex.colorSpace = T.SRGBColorSpace;
      const pmrem = new T.PMREMGenerator(r); scene.environment = pmrem.fromEquirectangular(envTex).texture; envTex.dispose(); pmrem.dispose();
      scene.add(new T.HemisphereLight(0xbcc8dc, 0x070b14, 0.5));
      const sun = new T.DirectionalLight(0xfff1d8, 3); sun.position.set(18, 22, 16); scene.add(sun);
      const rim = new T.DirectionalLight(0x8fb0e6, 1.2); rim.position.set(-20, 6, -18); scene.add(rim);

      const ctex = (size, draw, rep = [1, 1], srgb = true) => {
        const c = document.createElement("canvas"); c.width = c.height = size; draw(c.getContext("2d"), size);
        const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(...rep); if (srgb) t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t;
      };
      let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const foil = ctex(512, (c, s) => { c.fillStyle = "#b08a4a"; c.fillRect(0, 0, s, s); for (let i = 0; i < 1100; i++) { c.fillStyle = rnd() > 0.5 ? `rgba(255,228,170,${0.05 + rnd() * 0.14})` : `rgba(60,38,10,${0.05 + rnd() * 0.16})`; c.beginPath(); const x = rnd() * s, y = rnd() * s; c.moveTo(x, y); for (let k = 0; k < 3; k++) c.lineTo(x + (rnd() - 0.5) * 80, y + (rnd() - 0.5) * 80); c.fill(); } }, [1.4, 1.4]);
      const cells = ctex(512, (c, s) => { c.fillStyle = "#8a929e"; c.fillRect(0, 0, s, s); const n = 8, w = s / n; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const gr = c.createLinearGradient(x * w, y * w, x * w + w, y * w + w); gr.addColorStop(0, "#22366a"); gr.addColorStop(1, "#0b1530"); c.fillStyle = gr; c.fillRect(x * w + 3, y * w + 3, w - 6, w - 6); } });
      const tiles = ctex(256, (c, s) => { c.fillStyle = "#1b2331"; c.fillRect(0, 0, s, s); for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { c.fillStyle = (x + y) % 2 ? "#2c374a" : "#344156"; c.fillRect(x * 64 + 3, y * 64 + 3, 58, 58); c.fillStyle = "#c9b48b"; c.fillRect(x * 64 + 28, y * 64 + 28, 8, 8); } });
      const mesh = ctex(512, (c, s) => { c.fillStyle = "#000"; c.fillRect(0, 0, s, s); c.strokeStyle = "#fff"; c.lineWidth = 2.5; for (let i = 4; i < s; i += 22) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, s); c.moveTo(0, i); c.lineTo(s, i); c.stroke(); } }, [7, 7], false);

      const M = (color, o = {}) => new T.MeshStandardMaterial({ color, metalness: o.m ?? 0.3, roughness: o.r ?? 0.55, map: o.map || null, bumpMap: o.bump || null, bumpScale: o.bs ?? 1, alphaMap: o.alpha || null, transparent: !!(o.alpha || o.op != null), opacity: o.op ?? 1, side: o.ds ? T.DoubleSide : T.FrontSide, envMapIntensity: o.env ?? 1, depthWrite: o.dw ?? true, emissive: o.em ?? 0x000000 });
      const gold = () => M(0xffe2a8, { m: 0.6, r: 0.38, map: foil, bump: foil, bs: 1.5, env: 1.6 });
      const silver = M(0xcfd4da, { m: 0.85, r: 0.28 });
      const white = M(0xe9e6df, { m: 0.12, r: 0.55 });
      const dark = M(0x1d2330, { m: 0.5, r: 0.45 });
      const sat = (this._sat = new T.Group()); scene.add(sat);
      const anchors = (this._anchors = {});
      const anchor = (id, parent, x, y, z) => { const o = new T.Object3D(); o.position.set(x, y, z); parent.add(o); anchors[id] = o; };

      // Bus (ISRO), gold foil with radiator panels and the Ka-band dish below.
      const bus = new T.Group(); sat.add(bus);
      bus.add(new T.Mesh(new T.BoxGeometry(2.2, 2.0, 2.2), gold()));
      [[0, 1.03, 0], [0, -1.03, 0]].forEach((p) => { const m = new T.Mesh(new T.BoxGeometry(2.3, 0.08, 2.3), silver); m.position.set(...p); bus.add(m); });
      const rad = new T.Mesh(new T.BoxGeometry(1.6, 1.4, 0.04), M(0xd8dde4, { m: 0.2, r: 0.3 })); rad.position.set(0, 0, 1.12); bus.add(rad);
      const ka = new T.Mesh(new T.SphereGeometry(0.42, 32, 12, 0, Math.PI * 2, 0, 0.9), M(0xe5e2db, { m: 0.2, r: 0.4, ds: true })); ka.rotation.x = Math.PI; ka.position.set(-0.4, -1.45, 0.3); bus.add(ka);
      const kaPost = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 0.4, 8), silver); kaPost.position.set(-0.4, -1.2, 0.3); bus.add(kaPost);
      anchor("bus", bus, 0, 0, 1.25);

      // Solar array: one wing of three panels on a yoke.
      const solar = new T.Group(); solar.position.set(-1.1, 0.2, 0); sat.add(solar);
      const yoke = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 1.0, 10), silver); yoke.rotation.z = Math.PI / 2; yoke.position.x = -0.5; solar.add(yoke);
      for (let i = 0; i < 3; i++) { const f = () => M(0x8b939d, { m: 0.8 }); const p = new T.Mesh(new T.BoxGeometry(2.1, 0.05, 2.6), [f(), f(), M(0xffffff, { m: 0.6, r: 0.22, map: cells }), M(0x3a414c, { m: 0.4 }), f(), f()]); p.position.x = -2.1 - i * 2.18; solar.add(p); }
      anchor("solar", solar, -4.3, 0.2, 0);

      // Octagonal instrument structure (NASA) with the L-band feed tiles and the S-band feed.
      const inst = new T.Group(); inst.position.y = 2.35; sat.add(inst);
      const oct = new T.Mesh(new T.CylinderGeometry(1.35, 1.35, 2.7, 8), white); oct.rotation.y = Math.PI / 8; inst.add(oct);
      [-1.35, 0, 1.35].forEach((y) => { const b = new T.Mesh(new T.CylinderGeometry(1.37, 1.37, 0.07, 8), silver); b.rotation.y = Math.PI / 8; b.position.y = y; inst.add(b); });
      const feed = new T.Group(); feed.position.set(1.27, -0.15, 0); inst.add(feed);
      const plate = new T.Mesh(new T.BoxGeometry(0.06, 1.7, 1.05), dark); feed.add(plate);
      for (let y = 0; y < 4; y++) for (let z = 0; z < 3; z++) { const t = new T.Mesh(new T.BoxGeometry(0.05, 0.36, 0.3), M(0xffffff, { m: 0.5, r: 0.45, map: tiles })); t.position.set(0.05, -0.6 + y * 0.4, -0.34 + z * 0.34); feed.add(t); }
      anchor("lband", feed, 0.2, -0.2, 0);
      const sfeed = new T.Mesh(new T.BoxGeometry(0.06, 0.42, 0.9), gold()); sfeed.position.set(1.28, 1.0, 0); inst.add(sfeed);
      anchor("sband", inst, 1.45, 1.0, 0);

      // 9 m boom: four hinged truss segments, folded at deploy 0.
      const base = new T.Vector3(0.9, 3.75, 0), dir = new T.Vector3(0.6, 0.8, 0).normalize();
      const boomRoot = new T.Group(); boomRoot.position.copy(base); boomRoot.quaternion.setFromUnitVectors(new T.Vector3(1, 0, 0), dir); sat.add(boomRoot);
      const strut = M(0xece9e2, { m: 0.15, r: 0.45 }), joint = M(0x8b939d, { m: 0.9, r: 0.25 });
      const SEG = 2.25, segs = []; let parent = boomRoot;
      for (let k = 0; k < 4; k++) {
        const hinge = new T.Group(); if (k) hinge.position.x = SEG; parent.add(hinge);
        for (let j = 0; j < 3; j++) { const a = (j / 3) * Math.PI * 2, l = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, SEG, 8), strut); l.rotation.z = Math.PI / 2; l.position.set(SEG / 2, Math.cos(a) * 0.13, Math.sin(a) * 0.13); hinge.add(l); }
        for (let j = 0; j < 6; j++) { const d = new T.Mesh(new T.CylinderGeometry(0.016, 0.016, 0.4, 6), strut); d.position.set(0.2 + j * 0.36, 0, 0); d.rotation.x = j % 2 ? 0.9 : -0.9; hinge.add(d); }
        const h = new T.Mesh(new T.CylinderGeometry(0.17, 0.17, 0.26, 16), joint); h.rotation.x = Math.PI / 2; hinge.add(h);
        segs.push(hinge); parent = hinge;
      }
      const tip = new T.Group(); tip.position.x = SEG; parent.add(tip);
      anchor("boom", segs[1], SEG / 2, 0.35, 0);

      // 12 m reflector: shallow paraboloid of gold mesh, radial ribs and a ring truss (the drum).
      sat.updateMatrixWorld(true);
      const tipW = tip.getWorldPosition(new T.Vector3());
      const feedW = feed.getWorldPosition(new T.Vector3());
      const C = tipW.clone().add(new T.Vector3(4.9, 2.2, 0));
      const axis = feedW.clone().sub(C).normalize();
      const refl = new T.Group(); refl.position.copy(C); refl.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), axis); scene.add(refl);
      const dish = (this._dish = new T.Group()); refl.add(dish);
      const F = 6.5, prof = []; for (let i = 0; i <= 32; i++) { const rr = (6 * i) / 32; prof.push(new T.Vector2(rr, (rr * rr) / (4 * F))); }
      const dg = new T.LatheGeometry(prof, 96);
      dish.add(new T.Mesh(dg, M(0xc9a560, { m: 0.35, r: 0.5, op: 0.22, ds: true, dw: false, em: 0x3a2c12 })));
      dish.add(new T.Mesh(dg, M(0xf3d38c, { m: 0.4, r: 0.35, alpha: mesh, ds: true, op: 0.95, dw: false, em: 0x6b5424 })));
      const ribs = []; for (let a = 0; a < 24; a++) { const t = (a / 24) * Math.PI * 2; for (let i = 0; i < 16; i++) { const r0 = (6 * i) / 16, r1 = (6 * (i + 1)) / 16; ribs.push(r0 * Math.cos(t), (r0 * r0) / (4 * F), r0 * Math.sin(t), r1 * Math.cos(t), (r1 * r1) / (4 * F), r1 * Math.sin(t)); } }
      const rg = new T.BufferGeometry(); rg.setAttribute("position", new T.Float32BufferAttribute(ribs, 3));
      dish.add(new T.LineSegments(rg, new T.LineBasicMaterial({ color: 0xe8cf95, transparent: true, opacity: 0.8 })));
      const rimY = 36 / (4 * F), depth = 0.95;
      [rimY, rimY - depth].forEach((y) => { const ring = new T.Mesh(new T.TorusGeometry(6, 0.06, 8, 160), strut); ring.rotation.x = Math.PI / 2; ring.position.y = y; dish.add(ring); });
      const tr = []; for (let a = 0; a < 36; a++) { const t0 = (a / 36) * Math.PI * 2, t1 = ((a + 1) / 36) * Math.PI * 2; const p0 = [6 * Math.cos(t0), rimY, 6 * Math.sin(t0)], q0 = [6 * Math.cos(t0), rimY - depth, 6 * Math.sin(t0)], q1 = [6 * Math.cos(t1), rimY - depth, 6 * Math.sin(t1)]; tr.push(...p0, ...q0, ...p0, ...q1); }
      const tg = new T.BufferGeometry(); tg.setAttribute("position", new T.Float32BufferAttribute(tr, 3));
      dish.add(new T.LineSegments(tg, new T.LineBasicMaterial({ color: 0xe9e6df, transparent: true, opacity: 0.9 })));
      const hub = new T.Mesh(new T.CylinderGeometry(0.35, 0.45, 0.35, 24), joint); dish.add(hub);
      anchor("reflector", refl, 0, rimY + 0.4, 5.2);
      tip.attach(refl);
      this._segs = segs; this._refl = refl;
      this._reflP1 = refl.position.clone(); this._reflQ1 = refl.quaternion.clone();
      this._reflP0 = new T.Vector3(0.2, 0, 0); this._reflQ0 = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(1, 0, 0));

      // Earth, atmosphere, stars, and the side-looking beam with its swath.
      const ER = 70, earthC = new T.Vector3(0, -88, 0);
      const earthMat = new T.MeshStandardMaterial({ color: 0x223355, roughness: 0.95, metalness: 0, emissive: 0xffffff, emissiveIntensity: 0.18, envMapIntensity: 0.2 });
      const earth = (this._earth = new T.Mesh(new T.SphereGeometry(ER, 128, 96), earthMat)); earth.position.copy(earthC); earth.rotation.set(0.45, 2.2, 0); scene.add(earth);
      const src = this.getAttribute("earth");
      if (src) new T.TextureLoader().load(RU(src), (tx) => { tx.colorSpace = T.SRGBColorSpace; tx.anisotropy = 8; earthMat.map = tx; earthMat.emissiveMap = tx; earthMat.color.set(0xffffff); earthMat.needsUpdate = true; this._dirty = true; });
      const atm = new T.Mesh(new T.SphereGeometry(ER * 1.006, 96, 64), new T.ShaderMaterial({ transparent: true, blending: T.AdditiveBlending, depthWrite: false,
        vertexShader: "varying vec3 vN;varying vec3 vP;void main(){vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vP=mv.xyz;gl_Position=projectionMatrix*mv;}",
        fragmentShader: "varying vec3 vN;varying vec3 vP;void main(){float f=pow(clamp(1.-dot(normalize(-vP),vN),0.,1.),4.);gl_FragColor=vec4(.42,.6,.95,1.)*f*.6;}" }));
      atm.position.copy(earthC); scene.add(atm);
      const st = []; for (let i = 0; i < 2400; i++) { const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, rr = 700 * Math.sqrt(1 - u * u); st.push(rr * Math.cos(a), 700 * u, rr * Math.sin(a)); }
      const sg = new T.BufferGeometry(); sg.setAttribute("position", new T.Float32BufferAttribute(st, 3));
      scene.add(new T.Points(sg, new T.PointsMaterial({ color: 0xcfd6e6, size: 1.2, sizeAttenuation: false, transparent: true, opacity: 0.7 })));
      sat.updateMatrixWorld(true);
      const Cw = refl.getWorldPosition(new T.Vector3());
      const look = new T.Vector3(0.62, -1, 0).normalize();
      const ray = new T.Ray(Cw, look), hit = new T.Vector3();
      ray.intersectSphere(new T.Sphere(earthC, ER), hit);
      const len = Cw.distanceTo(hit);
      const bg = new T.ConeGeometry(7, len, 64, 1, true); bg.translate(0, -len / 2, 0);
      const beamMat = new T.MeshBasicMaterial({ color: 0xe9cf95, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide });
      const beam = new T.Mesh(bg, beamMat); beam.position.copy(Cw); beam.quaternion.setFromUnitVectors(new T.Vector3(0, -1, 0), look); beam.scale.set(1, 1, 3.2); scene.add(beam);
      const swC = document.createElement("canvas"); swC.width = 64; swC.height = 256; const sx = swC.getContext("2d"); const sgr = sx.createLinearGradient(0, 0, 64, 0); sgr.addColorStop(0, "rgba(201,180,139,0)"); sgr.addColorStop(0.2, "rgba(201,180,139,.9)"); sgr.addColorStop(0.8, "rgba(201,180,139,.9)"); sgr.addColorStop(1, "rgba(201,180,139,0)"); sx.fillStyle = sgr; sx.fillRect(0, 0, 64, 256);
      const swathMat = new T.MeshBasicMaterial({ map: new T.CanvasTexture(swC), transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide });
      const swath = new T.Mesh(new T.PlaneGeometry(14, 34), swathMat);
      const n = hit.clone().sub(earthC).normalize(); swath.position.copy(hit.clone().add(n.clone().multiplyScalar(0.15)));
      swath.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), n); swath.rotateZ(Math.PI / 2 + Math.PI / 2); scene.add(swath);
      this._beamMat = beamMat; this._swathMat = swathMat;

      // Hotspots.
      this._hs = Object.entries(PARTS).map(([id, [t, d]]) => {
        const b = document.createElement("button"); b.className = "hs"; b.setAttribute("aria-label", t); b.setAttribute("aria-pressed", "false");
        const show = () => { this._tip.innerHTML = `<b>${t}</b>${d}`; this._tipFor = id; this._tip.style.opacity = "1"; };
        b.addEventListener("pointerenter", show); b.addEventListener("focus", show);
        b.addEventListener("pointerleave", () => { if (this._pinned !== id) this._hideTip(); });
        b.addEventListener("blur", () => { if (this._pinned !== id) this._hideTip(); });
        b.addEventListener("click", () => { this._pinned = this._pinned === id ? null : id; this._hs.forEach((h) => h.el.setAttribute("aria-pressed", String(h.id === this._pinned))); if (this._pinned) show(); else this._hideTip(); this.dispatchEvent(new CustomEvent("part", { detail: this._pinned, bubbles: true, composed: true })); });
        this._layer.appendChild(b); return { id, el: b };
      });

      // Interaction: drag to orbit, keyboard arrows.
      this._yaw = this._yawT = -0.5; this._pitch = this._pitchT = 0.22;
      let drag = null;
      canvas.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); canvas.classList.add("drag"); this._hint.style.opacity = "0"; this._touched = true; });
      canvas.addEventListener("pointermove", (e) => { if (!drag) return; this._yawT -= (e.clientX - drag.x) * 0.006; this._pitchT = clamp(this._pitchT + (e.clientY - drag.y) * 0.004, -0.5, 1.1); drag = { x: e.clientX, y: e.clientY }; });
      const end = () => { drag = null; canvas.classList.remove("drag"); };
      canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", end);
      canvas.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") this._yawT += 0.2; else if (e.key === "ArrowRight") this._yawT -= 0.2; else if (e.key === "ArrowUp") this._pitchT = clamp(this._pitchT + 0.1, -0.5, 1.1); else if (e.key === "ArrowDown") this._pitchT = clamp(this._pitchT - 0.1, -0.5, 1.1); else return; e.preventDefault(); this._touched = true; });

      this._ro = new ResizeObserver(() => { const w = this.clientWidth, h = this.clientHeight; r.setSize(w, h, false); cam.aspect = w / Math.max(1, h); this._off = null; cam.updateProjectionMatrix(); this._dirty = true; });
      this._ro.observe(this);
      this._visible = true;
      this._io = new IntersectionObserver(([e]) => { this._visible = e.isIntersecting; if (this._visible) this._loop(); }, { rootMargin: "100px" });
      this._io.observe(this);
      this._onScroll = () => { this._dirty = true; };
      window.addEventListener("scroll", this._onScroll, { passive: true });
      this._T = T; this._scene = scene; this._t0 = performance.now();
      this._loop();
    }
    _hideTip() { this._tip.style.opacity = "0"; this._tipFor = null; }
    _progress() {
      const track = this.closest("[data-sat-track]") || this;
      const rc = track.getBoundingClientRect(), vh = window.innerHeight || 1;
      const span = Math.max(1, rc.height - vh);
      return clamp(-rc.top / span);
    }
    _loop() {
      cancelAnimationFrame(this._raf);
      if (!this._visible || !this._renderer) return;
      const T = this._T, rm = reduced();
      let dep = this._num("deploy", 1), beam = this._num("beam", 0), zoom = 1;
      if (this._has("scroll-driven")) {
        const p = this._progress();
        dep = rm ? 1 : ss(0.05, 0.45, p); beam = ss(0.55, 0.8, p); zoom = 0.62 + 0.38 * ss(0.05, 0.5, p);
        this.dispatchEvent(new CustomEvent("progress", { detail: p }));
      }
      const e = ss(0, 0.55, dep);
      this._segs.forEach((s, k) => { s.rotation.z = k === 0 ? (1 - e) * 0.6435 : (1 - e) * (k % 2 ? 3.08 : -3.08); });
      const rs = 0.08 + 0.92 * ss(0.62, 1, dep); this._dish.scale.set(rs, 1, rs);
      const ep = ss(0.5, 0.8, dep); this._refl.position.lerpVectors(this._reflP0, this._reflP1, ep); this._refl.quaternion.slerpQuaternions(this._reflQ0, this._reflQ1, ep);
      this._beamMat.opacity = 0.11 * beam; this._swathMat.opacity = 0.7 * beam;
      const t = (performance.now() - this._t0) / 1000;
      if (this.hasAttribute("autorotate") && !this._touched && !rm) this._yawT -= 0.0016;
      this._yaw += (this._yawT - this._yaw) * 0.1; this._pitch += (this._pitchT - this._pitch) * 0.1;
      if (!rm) this._earth.rotation.y = 2.2 + t * 0.006;
      const target = new T.Vector3(3.5 + 2.5 * zoom, 3.5 + 3 * zoom - 2.5 * beam, 0);
      const d = (30 + 14 * zoom) * (1 + 0.35 * beam);
      const cam = this._cam;
      cam.position.set(target.x + d * Math.sin(this._yaw) * Math.cos(this._pitch), target.y + d * Math.sin(this._pitch), target.z + d * Math.cos(this._yaw) * Math.cos(this._pitch));
      cam.lookAt(target);
      const off = this._num("offset-x", 0) * this.clientWidth; if (off !== this._off) { this._off = off; if (off) cam.setViewOffset(this.clientWidth, this.clientHeight, -off, 0, this.clientWidth, this.clientHeight); else cam.clearViewOffset(); }
      this._renderer.render(this._scene, cam);
      const show = this.hasAttribute("hotspots") && dep > 0.92;
      const w = this.clientWidth, h = this.clientHeight, v = new T.Vector3();
      this._hs.forEach(({ id, el }) => {
        this._anchors[id].getWorldPosition(v); v.project(cam);
        const x = ((v.x + 1) / 2) * w, y = ((1 - v.y) / 2) * h, vis = show && v.z < 1 && x > 8 && x < w - 8 && y > 8 && y < h - 8;
        el.style.transform = `translate(${x}px,${y}px)${el.matches(":hover") || el.getAttribute("aria-pressed") === "true" ? " scale(1.18)" : ""}`;
        el.style.opacity = vis ? "1" : "0"; el.style.pointerEvents = vis ? "auto" : "none"; el.tabIndex = vis ? 0 : -1;
        if (this._tipFor === id) { const left = x + 270 > w ? x - 268 : x + 18; this._tip.style.transform = `translate(${left}px,${clamp(y - 40, 8, h - 120)}px)`; if (!vis) this._hideTip(); }
      });
      this._raf = requestAnimationFrame(() => this._loop());
    }
  }
  customElements.define("nisar-satellite", NisarSatellite);
})();
