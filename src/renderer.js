import * as THREE from "../vendor/three.module.js";
import { paintTexture, storyTexture } from "./art.js";
import { lookFor } from "./looks.js";
import { Bloom } from "./bloom.js";
// Presentation for the authoritative grid (rule 6). The grid, bodies and machines
// come from DeathMaterials; everything here is mapped from them and never feeds back.
//
// Layers, back to front: far shaft light, mid machine hall, near architecture and
// props, the play plane (tile kit, hazards, materials, machines), Pip, then dust,
// steam and rain. Only Pip and what Pip leaves behind is teal (art bible §2).
const GEL = 0x2bc4a8,
  GLOW = 0x7ff0d8,
  DEEP = 0x0e6b5c,
  EYE = 0x1b2a26,
  BONE = 0xe9e1d3,
  HEAT = 0xff6a1a,
  ARC = 0xfff7a8,
  FROST = 0xeaf6ff;
const FOV = 12;
const TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
const DEPTH = 1.6; // play-plane slab depth; the front face sits at z = DEPTH / 2

// Deterministic per-cell noise so a room always dresses the same way.
const darken = (c, k) =>
  (Math.round(((c >> 16) & 255) * k) << 16) |
  (Math.round(((c >> 8) & 255) * k) << 8) |
  Math.round((c & 255) * k);
const hash = (x, y, k = 0) => {
  let h = (x * 374761393 + y * 668265263 + k * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

// A unit cube with chamfered edges, centred on the origin.
function chamferBox(b = 0.07) {
  const s = new THREE.Shape();
  const h = 0.5 - b;
  s.moveTo(-h, -h);
  s.lineTo(h, -h);
  s.lineTo(h, h);
  s.lineTo(-h, h);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 1 - 2 * b,
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 1,
  });
  g.translate(0, 0, -(1 - 2 * b) / 2);
  g.computeVertexNormals();
  return g;
}
// A soft rounded block (splat, fill skin), centred on the origin.
function roundedBox(r = 0.22) {
  const s = new THREE.Shape();
  const h = 0.5 - r;
  s.moveTo(-h, -0.5);
  s.lineTo(h, -0.5);
  s.quadraticCurveTo(0.5, -0.5, 0.5, -h);
  s.lineTo(0.5, h);
  s.quadraticCurveTo(0.5, 0.5, h, 0.5);
  s.lineTo(-h, 0.5);
  s.quadraticCurveTo(-0.5, 0.5, -0.5, h);
  s.lineTo(-0.5, -h);
  s.quadraticCurveTo(-0.5, -0.5, -h, -0.5);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 1 - 2 * r,
    bevelEnabled: true,
    bevelThickness: r,
    bevelSize: r * 0.5,
    bevelSegments: 4,
    curveSegments: 6,
  });
  g.translate(0, 0, -(1 - 2 * r) / 2);
  g.computeVertexNormals();
  return g;
}

// One InstancedMesh per piece of kit, filled from a list of transforms.
class Batch {
  constructor() {
    this.items = new Map();
  }
  add(geo, mat, x, y, z, sx, sy, sz, rz = 0, color = null) {
    const key = geo.uuid + mat.uuid;
    let b = this.items.get(key);
    if (!b) this.items.set(key, (b = { geo, mat, list: [] }));
    b.list.push([x, y, z, sx, sy, sz, rz, color]);
  }
  build(group, shadows) {
    const o = new THREE.Object3D(),
      c = new THREE.Color();
    for (const { geo, mat, list } of this.items.values()) {
      const inst = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach(([x, y, z, sx, sy, sz, rz, color], i) => {
        o.position.set(x, -y, z);
        o.scale.set(sx, sy, sz);
        o.rotation.set(0, 0, rz);
        o.updateMatrix();
        inst.setMatrixAt(i, o.matrix);
        if (color !== null) inst.setColorAt(i, c.setHex(color));
      });
      inst.castShadow = shadows && !mat.transparent;
      inst.receiveShadow = shadows;
      group.add(inst);
    }
    this.items.clear();
  }
}

export class PreserveRenderer {
  constructor(canvas, settings) {
    this.settings = settings;
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 1, 600);
    this.far = new THREE.Group(); // shaft light and distant floors
    this.mid = new THREE.Group(); // the sublevel's machine hall
    this.near = new THREE.Group(); // room architecture and story props
    this.kit = new THREE.Group(); // static tile kit
    this.cells = new THREE.Group(); // hazards and materials (rebuilt when the grid changes)
    this.machines = new THREE.Group(); // presses, lifts, blades, the impact plate
    this.actors = new THREE.Group(); // Pip, ghost, droplets
    this.front = new THREE.Group(); // dust, steam, rain
    for (const g of [
      this.far,
      this.mid,
      this.near,
      this.kit,
      this.cells,
      this.machines,
      this.actors,
      this.front,
    ])
      this.scene.add(g);
    this.geos = {
      box: new THREE.BoxGeometry(1, 1, 1),
      chamfer: chamferBox(),
      soft: roundedBox(),
      sphere: new THREE.SphereGeometry(1, 20, 14),
      lowSphere: new THREE.IcosahedronGeometry(1, 1),
      dome: new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      cone: new THREE.ConeGeometry(0.13, 0.62, 6),
      thorn: new THREE.ConeGeometry(0.05, 0.3, 4),
      cyl: new THREE.CylinderGeometry(1, 1, 1, 12),
      rope: new THREE.CylinderGeometry(0.06, 0.06, 1, 8).rotateZ(Math.PI / 2),
      plane: new THREE.PlaneGeometry(1, 1),
      ice: chamferBox(0.12),
      ripple: new THREE.TorusGeometry(1, 0.04, 5, 32),
    };
    this.textures = {
      concrete: this.grainTexture(),
      backConcrete: paintTexture("concrete"),
      backWood: paintTexture("wood"),
      wood: paintTexture("wood"),
      cloth: paintTexture("cloth"),
      photo: storyTexture("photo"),
      label: storyTexture("label"),
      shaft: this.gradientTexture(),
      chevron: this.chevronTexture(),
    };
    this.materials = {};
    this.uniforms = { time: { value: 0 } };
    this.clock = 0;
    this.lastGrid = "";
    this.effects = [];
    this.ripples = [];
    this.fps = { t: 0, frames: 0, slow: 0 };
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 0.5);
    this.key = new THREE.DirectionalLight(0xffffff, 2);
    this.key.castShadow = true;
    this.key.shadow.bias = -0.0006;
    this.key.shadow.normalBias = 0.02;
    this.scene.add(this.hemi, this.key, this.key.target);
    this.pipLight = new THREE.PointLight(GLOW, 6, 7, 1.6);
    this.scene.add(this.pipLight);
    this.createGel();
    this.bloom = new Bloom(this.renderer);
    this.resize();
  }

  // ---------- shared materials ----------
  mat(key, make) {
    return (this.materials[key] ??= make());
  }
  std(key, color, roughness = 0.85, metalness = 0, extra = {}) {
    return this.mat(
      key,
      () => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra }),
    );
  }
  glow(key, color, opacity = 1) {
    return this.mat(
      key,
      () =>
        new THREE.MeshBasicMaterial({
          color,
          transparent: opacity < 1,
          opacity,
          blending: opacity < 1 ? THREE.AdditiveBlending : THREE.NormalBlending,
          depthWrite: opacity >= 1,
          toneMapped: false,
        }),
    );
  }
  // Jam materials share Pip's family: glossy, a little emissive, tinted per material.
  jam(key, color, { roughness = 0.2, emissive = 0.18, opacity = 1, clearcoat = 0.8 } = {}) {
    return this.mat(key, () => {
      const m = new THREE.MeshPhysicalMaterial({
        color,
        roughness,
        metalness: 0,
        clearcoat,
        clearcoatRoughness: 0.12,
        emissive: color,
        emissiveIntensity: emissive,
        transparent: opacity < 1,
        opacity,
        depthWrite: opacity >= 1,
      });
      return m;
    });
  }
  // A pale board-formed grain, so per-instance colour sets each block's tone.
  grainTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    g.fillStyle = "#e6e6e6";
    g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 1800; i++) {
      const a = hash(i, 21) * 0.12;
      g.fillStyle = hash(i, 22) > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
      g.fillRect(hash(i, 23) * 128, hash(i, 24) * 128, 1 + hash(i, 25) * 2, 1 + hash(i, 26) * 2);
    }
    // Board lines from the formwork.
    for (let y = 16; y < 128; y += 32) {
      g.fillStyle = "rgba(0,0,0,.08)";
      g.fillRect(0, y, 128, 2);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  gradientTexture() {
    const c = document.createElement("canvas");
    c.width = 4;
    c.height = 128;
    const g = c.getContext("2d"),
      grad = g.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.6, "rgba(255,255,255,.35)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 4, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  chevronTexture() {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 32;
    const g = c.getContext("2d");
    g.fillStyle = "#24282d";
    g.fillRect(0, 0, 64, 32);
    g.strokeStyle = "#5b6168";
    g.lineWidth = 5;
    for (let x = -16; x < 80; x += 22) {
      g.beginPath();
      g.moveTo(x, 4);
      g.lineTo(x + 10, 16);
      g.lineTo(x, 28);
      g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }
  createGel() {
    const points = [new THREE.Vector2(0, 0)];
    for (let i = 0; i <= 24; i++) {
      const a = ((i / 24) * Math.PI) / 2;
      // A flat, wide base rising to a rounded dome.
      points.push(new THREE.Vector2(0.42 * Math.cos(a) ** 0.8, 0.76 * Math.sin(a)));
    }
    this.gelGeo = new THREE.LatheGeometry(points, 32);
    // Medium tier: fresnel gel with a fake inner core and a specular glint.
    this.gel = new THREE.ShaderMaterial({
      uniforms: {
        time: this.uniforms.time,
        tint: { value: new THREE.Color(GEL) },
        glow: { value: new THREE.Color(GLOW) },
      },
      vertexShader: `varying vec3 vN;varying vec3 vP;varying float vH;uniform float time;void main(){vec3 p=position;p.x+=sin(time*3.0+p.y*7.0)*.01*p.y;vH=position.y;vec4 wp=modelMatrix*vec4(p,1.0);vP=wp.xyz;vN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*wp;}`,
      fragmentShader: `varying vec3 vN;varying vec3 vP;varying float vH;uniform vec3 tint;uniform vec3 glow;void main(){vec3 n=normalize(vN),v=normalize(cameraPosition-vP);float ndv=max(dot(n,v),0.);float rim=pow(1.0-ndv,2.2);float spec=pow(max(dot(reflect(-normalize(vec3(-.5,1.,1.6)),n),v),0.),48.);float core=pow(ndv,2.5)*smoothstep(.0,.35,vH);vec3 col=tint*.28+tint*core*.9+glow*rim*.9+vec3(.9,1.,.97)*spec*.9;gl_FragColor=vec4(col,1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
    });
    // High tier: physical transmission gel.
    this.highGel = new THREE.MeshPhysicalMaterial({
      color: GEL,
      transmission: 0.82,
      thickness: 0.55,
      ior: 1.35,
      roughness: 0.12,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      emissive: DEEP,
      emissiveIntensity: 0.55,
    });
    // Low tier: unlit translucent gel.
    this.lowGel = new THREE.MeshBasicMaterial({
      color: 0x3ed6b8,
      transparent: true,
      opacity: 0.86,
    });
    this.ghostGel = new THREE.MeshBasicMaterial({
      color: 0x8affdf,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    const hc = document.createElement("canvas");
    hc.width = hc.height = 64;
    const g = hc.getContext("2d"),
      grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(98,255,215,.32)");
    grad.addColorStop(0.45, "rgba(44,196,168,.1)");
    grad.addColorStop(1, "rgba(44,196,168,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    this.haloMat = new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(hc),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }
  pipBody() {
    const material =
      this.settings.pip === "high"
        ? this.highGel
        : this.settings.pip === "low"
          ? this.lowGel
          : this.gel;
    return material;
  }
  // Pip: a dome with a flat base and two seed-eyes on the front. Nothing inside.
  pip(ghost = false) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(this.gelGeo, ghost ? this.ghostGel : this.pipBody());
    body.castShadow = !ghost;
    g.add(body);
    g.userData.body = body;
    if (!ghost) {
      const eyeMat = this.mat("eye", () => new THREE.MeshBasicMaterial({ color: EYE }));
      g.userData.eyes = [-1, 1].map((s) => {
        const eye = new THREE.Mesh(this.geos.sphere, eyeMat);
        eye.position.set(s * 0.12, 0.42, 0.33);
        eye.scale.set(0.042, 0.068, 0.03);
        g.add(eye);
        return eye;
      });
      const glint = new THREE.Mesh(
        this.geos.sphere,
        this.mat(
          "glint",
          () => new THREE.MeshBasicMaterial({ color: 0xd6fff4, transparent: true, opacity: 0.6 }),
        ),
      );
      glint.position.set(-0.15, 0.58, 0.25);
      glint.scale.set(0.05, 0.085, 0.015);
      g.add(glint);
      const halo = new THREE.Sprite(this.haloMat);
      halo.position.set(0, 0.3, -0.4);
      halo.scale.set(1.7, 1.7, 1);
      g.add(halo);
      g.userData.halo = halo;
      g.userData.blink = 0;
      g.userData.glance = 0;
    }
    this.actors.add(g);
    return g;
  }
  clear(group) {
    for (const child of [...group.children]) {
      group.remove(child);
      child.traverse?.((o) => {
        if (o.isInstancedMesh) o.dispose();
        if (
          o.geometry &&
          !Object.values(this.geos).includes(o.geometry) &&
          o.geometry !== this.gelGeo
        )
          o.geometry.dispose();
      });
    }
  }

  // ---------- room load ----------
  load(world) {
    this.world = world;
    this.look = lookFor(world.room);
    for (const g of [
      this.far,
      this.mid,
      this.near,
      this.kit,
      this.cells,
      this.machines,
      this.actors,
      this.front,
    ])
      this.clear(g);
    this.effects = [];
    this.ripples = [];
    this.lastGrid = "";
    this.jamMeshes = [];
    this.ghost = this.pip(true);
    const L = this.look;
    this.renderer.setClearColor(L.clear);
    this.scene.fog = new THREE.Fog(L.fog, 70, 140);
    this.hemi.color.setHex(L.sky);
    this.hemi.groundColor.setHex(L.ground);
    this.hemi.intensity = L.ambient;
    this.key.color.setHex(L.key);
    this.key.intensity = L.keyIntensity;
    const home = L.kit === "home";
    this.key.position.set(world.w / 2 + (home ? 18 : -8), -world.h / 2 + 16, 24);
    this.key.target.position.set(world.w / 2, -world.h / 2, 0);
    const sc = this.key.shadow.camera;
    sc.left = -world.w / 2 - 6;
    sc.right = world.w / 2 + 6;
    sc.top = world.h / 2 + 8;
    sc.bottom = -world.h / 2 - 8;
    sc.near = 1;
    sc.far = 90;
    sc.updateProjectionMatrix();
    this.applyTier();
    this.buildBackdrop(world);
    this.buildKit(world);
    this.buildMachines(world);
    this.jar = this.makeJar(world.exit.x + 0.5, world.exit.y + 1);
    this.seedMeshes = world.seeds.map((s) => {
      const m = new THREE.Mesh(
        this.geos.lowSphere,
        this.mat("seed", () => new THREE.MeshBasicMaterial({ color: 0xf2d38c, toneMapped: false })),
      );
      m.scale.set(0.11, 0.15, 0.11);
      m.position.set(s.x + 0.5, -s.y - 0.5, 0.4);
      this.actors.add(m);
      return { m, s };
    });
    this.buildAtmosphere(world);
    this.refreshGrid();
    this.cameraX = null;
    this.resize();
  }

  // Applies the world tier: shadows, bloom, resolution (art bible §9).
  applyTier() {
    const t = this.settings.world;
    this.renderer.shadowMap.enabled = t !== "low";
    const size = t === "high" ? 2048 : 1024;
    if (this.key.shadow.mapSize.x !== size) {
      this.key.shadow.mapSize.set(size, size);
      this.key.shadow.map?.dispose();
      this.key.shadow.map = null;
    }
    this.key.castShadow = t !== "low";
    this.renderer.shadowMap.needsUpdate = true;
  }

  // Far, mid and near layers behind the play plane.
  buildBackdrop(world) {
    const L = this.look,
      W = world.w,
      H = world.h,
      B = new Batch(),
      shadows = this.settings.world !== "low";
    const back = this.std(`back${L.kit}`, 0xffffff, 0.95, 0, {
      map: L.kit === "home" ? this.textures.backWood : this.textures.backConcrete,
    });
    back.color.setHex(L.kit === "home" ? 0x6b4a33 : L.kit === "surface" ? L.fog : L.concrete[0]);
    if (back.map) back.map.repeat.set(W / 6, H / 6);
    // The room's back wall sits just behind the play plane.
    const wall = new THREE.Mesh(this.geos.plane, back);
    wall.position.set(W / 2, -H / 2, -DEPTH / 2 - 0.9);
    wall.scale.set(W + 8, H + 8, 1);
    wall.receiveShadow = shadows;
    if (L.kit !== "surface") this.near.add(wall);
    const steel = this.std("steel", 0x6b7379, 0.45, 0.65),
      duct = this.std("duct", 0x353c44, 0.7, 0.35),
      paint = this.std("paint", 0xc8c5ae, 0.85),
      red = this.std("hazardRed", 0xb83228, 0.6);
    if (L.kit === "facility") {
      // Near: ducts, pipes and beams on the back wall.
      for (let x = 2; x < W; x += 7) {
        B.add(this.geos.box, steel, x, H / 2, -DEPTH / 2 - 0.6, 0.22, H + 4, 0.3);
        B.add(this.geos.cyl, duct, x + 3.5, 1.6, -DEPTH / 2 - 0.45, 0.28, 7, 0.28, Math.PI / 2);
        if (hash(x, 1) > 0.5)
          B.add(this.geos.cyl, steel, x + 1.2, H / 2, -DEPTH / 2 - 0.5, 0.09, H + 4, 0.09);
      }
      // Pictogram test placards: bone and red, no words.
      for (let x = 6; x < W; x += 14) {
        const y = 3 + hash(x, 2) * 3;
        B.add(this.geos.box, paint, x, y, -DEPTH / 2 - 0.7, 0.9, 1.1, 0.04);
        B.add(this.geos.box, red, x, y + 0.28, -DEPTH / 2 - 0.66, 0.6, 0.08, 0.02);
        B.add(this.geos.dome, duct, x, y + 0.15, -DEPTH / 2 - 0.66, 0.16, 0.16, 0.02);
      }
      // Mid: the machine hall, dim tanks and gantries.
      const hall = this.std(`hall${world.room.act}`, L.concrete[0], 0.9, 0.2);
      for (let x = -6; x < W + 8; x += 9) {
        const h = 6 + hash(x, 3) * 8;
        B.add(this.geos.cyl, hall, x, H - h / 2, -14, 1.6, h, 1.6);
        B.add(this.geos.box, hall, x + 4.5, H - 9, -15, 9, 0.4, 1);
      }
      // Far: distant floors as a few lit windows.
      const lamp = this.glow(`farLamp${world.room.act}`, L.key, 0.35);
      for (let i = 0; i < W / 3; i++)
        B.add(
          this.geos.plane,
          lamp,
          hash(i, 4) * (W + 30) - 15,
          hash(i, 5) * (H + 10) - 5,
          -40,
          0.8,
          0.25,
          1,
        );
      if (L.shafts) {
        // Daylight leaking down shafts from above.
        const shaft = this.mat(
          `shaft${world.room.act}`,
          () =>
            new THREE.MeshBasicMaterial({
              color: 0xfff2d6,
              map: this.textures.shaft,
              transparent: true,
              opacity: L.shafts * (this.settings.world === "high" ? 1.5 : 1),
              blending: THREE.AdditiveBlending,
              depthWrite: false,
            }),
        );
        for (let x = 4; x < W; x += 13) {
          const s = new THREE.Mesh(this.geos.plane, shaft);
          s.position.set(x, -H / 2 + 1, -DEPTH / 2 - 0.3);
          s.scale.set(2.4, H + 4, 1);
          s.rotation.z = -0.16;
          this.far.add(s);
        }
      }
    } else if (L.kit === "surface") {
      // Sky dome tint, distant hills, fence posts and the farm on the last rooms.
      const sky = new THREE.Mesh(this.geos.plane, this.std("sky", L.clear, 1, 0, { fog: false }));
      sky.material.color.setHex(L.clear);
      sky.material.emissive = new THREE.Color(L.clear);
      sky.position.set(W / 2, -H / 2, -60);
      sky.scale.set(W * 6 + 120, H * 6 + 80, 1);
      this.far.add(sky);
      const hill = this.std(`hill${world.room.n}`, L.ground, 1);
      for (let i = -2; i < W / 6 + 3; i++)
        B.add(this.geos.sphere, hill, i * 9, H + 4, -30, 9, 6 + hash(i, 6) * 4, 3);
      const post = this.std("post", 0x4a3a2c, 0.95);
      for (let x = 1; x < W; x += 3) {
        B.add(this.geos.box, post, x, H - 2.6, -7, 0.14, 1.4, 0.14);
        B.add(this.geos.box, post, x + 1.5, H - 3, -7, 3, 0.07, 0.06);
      }
      if (world.room.n === 12 || world.room.n > 9) {
        // The farmhouse comes into view: a warm lit window in the distance.
        const house = this.std("house", 0x3a2e28, 1);
        B.add(this.geos.box, house, W * 0.7, H + 2, -55, 7, 5, 4);
        B.add(this.geos.cone, house, W * 0.7, H - 2, -55, 30, 5, 12);
        B.add(
          this.geos.plane,
          this.glow("window", 0xffd58a),
          W * 0.7 + 1.2,
          H + 2,
          -52.9,
          1.2,
          1.2,
          1,
        );
      }
    } else {
      // Home: wide floorboards behind, a window of low morning sun, the table.
      const sun = this.mat(
        "sunbeam",
        () =>
          new THREE.MeshBasicMaterial({
            color: 0xffd58a,
            map: this.textures.shaft,
            transparent: true,
            opacity: 0.12,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
      );
      const frame = this.std("windowFrame", 0xe8dcc2, 0.7);
      for (let x = 5; x < W; x += 11) {
        B.add(
          this.geos.plane,
          this.glow("homeWindow", 0xc9a874),
          x,
          4,
          -DEPTH / 2 - 0.85,
          2.6,
          3.6,
          1,
        );
        B.add(this.geos.box, frame, x, 4, -DEPTH / 2 - 0.82, 2.8, 0.12, 0.08);
        B.add(this.geos.box, frame, x, 4, -DEPTH / 2 - 0.82, 0.12, 3.8, 0.08);
        const beam = new THREE.Mesh(this.geos.plane, sun);
        beam.position.set(x + 2.5, -7, -DEPTH / 2 - 0.2);
        beam.scale.set(3, 10, 1);
        beam.rotation.z = 0.55;
        this.far.add(beam);
      }
    }
    // Story props near the spawn: a desk, a cold coffee cup, and the farmhouse photo,
    // sunnier and closer each sublevel.
    if (L.kit === "facility" && world.room.act > 0) {
      const sx = world.spawn.x + 1.2,
        sy = world.spawn.y + 0.6;
      const desk = this.std("desk", 0x5a5f63, 0.6, 0.4);
      B.add(this.geos.box, desk, sx, sy, -DEPTH / 2 - 0.35, 1.6, 0.08, 0.5);
      B.add(this.geos.box, desk, sx - 0.7, sy + 0.25, -DEPTH / 2 - 0.35, 0.06, 0.5, 0.06);
      B.add(this.geos.box, desk, sx + 0.7, sy + 0.25, -DEPTH / 2 - 0.35, 0.06, 0.5, 0.06);
      B.add(this.geos.cyl, paint, sx + 0.35, sy - 0.12, -DEPTH / 2 - 0.3, 0.07, 0.16, 0.07);
      const scale = 0.6 + world.room.act * 0.08;
      B.add(
        this.geos.box,
        this.std("photoFrame", 0x8a7051, 0.7),
        sx - 0.2,
        sy - 1.2,
        -DEPTH / 2 - 0.8,
        0.85 * scale,
        0.62 * scale,
        0.04,
      );
      const photo = new THREE.Mesh(
        this.geos.plane,
        this.mat("photo", () => new THREE.MeshBasicMaterial({ map: this.textures.photo })),
      );
      photo.position.set(sx - 0.2, -sy + 1.2, -DEPTH / 2 - 0.77);
      photo.scale.set(0.72 * scale, 0.5 * scale, 1);
      this.near.add(photo);
    }
    // Rotating emergency beacons (acts 1 and 2) and sodium lamps (3 and 4).
    this.beacons = [];
    this.lamps = [];
    if (L.beacons)
      for (let x = 4; x < world.w; x += 12) {
        const b = new THREE.Mesh(this.geos.sphere, this.glow("beacon", 0xff4a3a));
        b.scale.setScalar(0.16);
        b.position.set(x, -1.6, -DEPTH / 2 - 0.4);
        const beam = new THREE.Mesh(
          this.geos.plane,
          this.mat(
            "beaconBeam",
            () =>
              new THREE.MeshBasicMaterial({
                color: 0xd8382e,
                map: this.textures.shaft,
                transparent: true,
                opacity: 0.06,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                side: THREE.DoubleSide,
              }),
          ),
        );
        beam.scale.set(0.9, 5, 1);
        beam.position.set(0, -2.5, 0);
        const pivot = new THREE.Group();
        pivot.position.copy(b.position);
        pivot.add(beam);
        this.near.add(b, pivot);
        this.beacons.push(pivot);
      }
    if (L.flicker)
      for (let x = 3; x < world.w; x += 9) {
        const m = new THREE.Mesh(this.geos.box, this.glow(`sodium${x % 2}`, 0xf0a64a));
        m.position.set(x, -1.3, -DEPTH / 2 - 0.35);
        m.scale.set(1.6, 0.12, 0.12);
        this.near.add(m);
        this.lamps.push(m);
      }
    B.build(this.near, shadows);
  }

  // The static tile kit, generated from the grid (art bible §6).
  buildKit(world) {
    const L = this.look,
      B = new Batch(),
      shadows = this.settings.world !== "low";
    const isWall = (x, y) => world.room.rows[y]?.[x] === "#";
    const open = (x, y) => x >= 0 && y >= 0 && x < world.w && y < world.h && !isWall(x, y);
    const block = this.std(`block${L.kit}`, 0xffffff, L.kit === "home" ? 0.6 : 0.92, 0, {
      map: L.kit === "home" ? this.textures.wood : this.textures.concrete,
    });
    const deep = this.std(`deep${L.kit}`, 0xffffff, 0.95);
    const lip = this.std(`lip${world.room.act}`, L.lip, 0.5, L.kit === "facility" ? 0.55 : 0);
    const hazard = this.std("hazardPaint", 0xd8b13a, 0.6);
    const [c0, c1] = L.concrete;
    const tone = (x, y, k = 0) => {
      const t = hash(x, y, k);
      return (
        ((((c0 >> 16) & 255) + (((c1 >> 16) & 255) - ((c0 >> 16) & 255)) * t) << 16) |
        ((((c0 >> 8) & 255) + (((c1 >> 8) & 255) - ((c0 >> 8) & 255)) * t) << 8) |
        ((c0 & 255) + ((c1 & 255) - (c0 & 255)) * t)
      );
    };
    for (let y = 0; y < world.h; y++)
      for (let x = 0; x < world.w; x++) {
        if (!isWall(x, y)) continue;
        const exposed =
          open(x - 1, y) || open(x + 1, y) || open(x, y - 1) || open(x, y + 1) || false;
        if (!exposed) {
          // The rock mass behind exposed faces: recessed and darker.
          B.add(
            this.geos.box,
            deep,
            x + 0.5,
            y + 0.5,
            -0.25,
            1,
            1,
            DEPTH - 0.5,
            0,
            darken(tone(x, y), 0.55),
          );
          continue;
        }
        if (L.kit === "surface") {
          // Dry-stone: two or three stones per exposed cell.
          const n = 2 + (hash(x, y, 1) > 0.5 ? 1 : 0);
          for (let i = 0; i < n; i++) {
            const w = 1 / n;
            B.add(
              this.geos.chamfer,
              block,
              x + w * (i + 0.5),
              y + 0.5 + (hash(x, y, i + 2) - 0.5) * 0.08,
              0,
              w * 0.96,
              0.94 - hash(x, y, i + 5) * 0.12,
              DEPTH,
              (hash(x, y, i + 8) - 0.5) * 0.08,
              tone(x, y, i),
            );
          }
        } else B.add(this.geos.chamfer, block, x + 0.5, y + 0.5, 0, 1, 1, DEPTH, 0, tone(x, y));
        if (open(x, y - 1)) {
          // Top faces: steel plate floors, moss on the Surface, boards at Home.
          B.add(this.geos.box, lip, x + 0.5, y + 0.04, 0, 1.0, 0.08, DEPTH + 0.04);
          if (
            L.kit === "facility" &&
            world.room.act >= 3 &&
            (!isWall(x - 1, y) || !isWall(x + 1, y))
          )
            // Ledge ends get a hazard-paint stripe (sparingly).
            B.add(this.geos.box, hazard, x + 0.5, y + 0.12, DEPTH / 2 + 0.01, 0.9, 0.06, 0.02);
        }
      }
    B.build(this.kit, shadows);
  }

  // Persistent meshes for presses, lifts, blades and the impact plate.
  buildMachines(world) {
    const steel = this.std("pressSteel", 0x737a7f, 0.4, 0.7),
      rod = this.std("rod", 0x8c9396, 0.3, 0.85),
      stripe = this.std("stripe", 0xd8b13a, 0.6);
    const mill = world.room.machine === "mill" || world.room.act === 7;
    const wood = this.std("millWood", 0x5c4430, 0.9);
    this.pressMeshes = world.presses.map((k) => {
      const g = new THREE.Group(),
        head = new THREE.Group();
      const block = new THREE.Mesh(this.geos.chamfer, mill ? wood : steel);
      block.scale.set(k.w, 0.86, DEPTH + 0.2);
      block.castShadow = true;
      head.add(block);
      if (!mill)
        for (let i = 0; i < k.w * 2; i++) {
          const s = new THREE.Mesh(this.geos.box, stripe);
          s.position.set(-k.w / 2 + 0.25 + i * 0.5, -0.1, DEPTH / 2 + 0.12);
          s.scale.set(0.2, 0.3, 0.02);
          s.rotation.z = 0.5;
          head.add(s);
        }
      const shaft = new THREE.Mesh(this.geos.box, rod);
      shaft.scale.set(0.3, 1, 0.35);
      g.add(head, shaft);
      this.machines.add(g);
      return { g, head, shaft };
    });
    this.liftMeshes = world.lifts.map((l) => {
      const g = new THREE.Group();
      const deck = new THREE.Mesh(this.geos.chamfer, this.std("lift", 0x8a9399, 0.4, 0.65));
      deck.scale.set(l.w, 0.34, DEPTH);
      deck.position.set(l.w / 2, -0.17, 0);
      deck.castShadow = true;
      const lamp = new THREE.Mesh(this.geos.box, this.glow("liftLamp", ARC));
      lamp.scale.set(l.w * 0.6, 0.05, 0.05);
      lamp.position.set(l.w / 2, -0.2, DEPTH / 2 + 0.02);
      g.add(deck, lamp);
      g.userData.lamp = lamp;
      this.machines.add(g);
      // Rails run the height of the lift's travel.
      for (const s of [0, l.w]) {
        const rail = new THREE.Mesh(this.geos.box, this.std("rail", 0x50575d, 0.5, 0.7));
        rail.position.set(l.x + s, -(l.top + l.base) / 2, -DEPTH / 2 + 0.1);
        rail.scale.set(0.08, l.base - l.top + 1, 0.08);
        this.machines.add(rail);
      }
      return g;
    });
    this.bladeMeshes = world.cutterRects().map(() => {
      const m = new THREE.Mesh(this.geos.box, this.std("blade", BONE, 0.3, 0.5));
      this.machines.add(m);
      return m;
    });
    this.plate = null;
    if (world.room.machine === "impact") {
      this.plate = new THREE.Mesh(this.geos.chamfer, steel);
      this.plate.scale.set(world.w - 2, 1, DEPTH + 0.3);
      this.plate.castShadow = true;
      this.machines.add(this.plate);
    }
  }

  buildAtmosphere(world) {
    const low = this.settings.world === "low";
    const count = low ? 24 : 80,
      positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = hash(i, 11) * world.w;
      positions[i * 3 + 1] = -hash(i, 12) * world.h;
      positions[i * 3 + 2] = 0.9 + hash(i, 13) * 1.5;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.dust = new THREE.Points(
      geo,
      this.mat(
        "dust",
        () =>
          new THREE.PointsMaterial({
            color: 0xc4c7b5,
            size: 0.04,
            transparent: true,
            opacity: 0.3,
            depthWrite: false,
          }),
      ),
    );
    this.front.add(this.dust);
    this.rain = null;
    if (this.look.rain) {
      const v = [];
      for (let i = 0; i < (low ? 60 : 160); i++) {
        const x = hash(i, 14) * (world.w + 4) - 2,
          y = -hash(i, 15) * world.h,
          z = 1 + hash(i, 16) * 2;
        v.push(x, y, z, x - 0.12, y - 0.6, z);
      }
      const rg = new THREE.BufferGeometry();
      rg.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
      this.rain = new THREE.LineSegments(
        rg,
        this.mat(
          "rain",
          () =>
            new THREE.LineBasicMaterial({
              color: 0xc0cbd6,
              transparent: true,
              opacity: 0.25,
              depthWrite: false,
            }),
        ),
      );
      this.front.add(this.rain);
    }
  }

  // ---------- hazards and materials (rebuilt when the grid changes) ----------
  refreshGrid() {
    const world = this.world;
    const key =
      world.grid.map((r) => r.join("")).join("") +
      world.power +
      (world.room.machine === "furnace" ? Math.floor(world.time / 3) % 2 : "") +
      (world.room.machine === "cryo" ? Math.floor(world.time / 4) : "");
    if (key === this.lastGrid) return;
    this.lastGrid = key;
    this.clear(this.cells);
    const L = this.look,
      B = new Batch(),
      shadows = this.settings.world !== "low",
      surface = L.kit === "surface";
    const steel = this.std("steel", 0x6b7379, 0.45, 0.65);
    const dark = this.std("pit", 0x15181c, 0.9);
    const bone = this.std("bone", BONE, 0.45, 0.2);
    const ghostBone = this.std("ghostBone", BONE, 0.5, 0, { transparent: true, opacity: 0.35 });
    const furnaceDark = world.room.machine === "furnace" && Math.floor(world.time / 3) % 2 === 1;
    const doorOpen = (x, y) => world.power >= (world.room.circuitDoors?.[`${x},${y}`] ?? 1);
    const z = DEPTH / 2;
    const frost = [];
    for (let y = 0; y < world.h; y++)
      for (let x = 0; x < world.w; x++) {
        const c = world.grid[y][x];
        const base = world.room.rows[y][x];
        const cx = x + 0.5;
        if (c === "*" || world.frostMask.has(`${x},${y}`)) frost.push([x, y]);
        // The hazard under a material still shows (coat ghosts the spikes through).
        const under = "^fvw".includes(base) ? base : null;
        if (under && c !== under && !"cbjt".includes(c)) continue;
        if (c === "^" || (c === "c" && under === "^")) {
          const ghost = c === "c";
          if (surface) {
            // Thorn hedge: dark clumps bristling with thorns.
            B.add(
              this.geos.lowSphere,
              this.std("hedge", 0x2d3a26, 0.95),
              cx,
              y + 0.72,
              0,
              0.55,
              0.32,
              0.7,
            );
            for (let j = 0; j < 4; j++)
              B.add(
                this.geos.thorn,
                ghost ? ghostBone : this.std("thorn", 0x6b5a45, 0.7),
                x + 0.15 + j * 0.23,
                y + 0.5,
                0.15 + (j % 2) * 0.3,
                1,
                1,
                1,
                (hash(x, y, j) - 0.5) * 0.6,
              );
          } else {
            B.add(this.geos.box, steel, cx, y + 0.94, 0, 1, 0.12, DEPTH);
            for (let j = 0; j < 3; j++)
              B.add(
                this.geos.cone,
                ghost ? ghostBone : bone,
                x + (j + 0.5) / 3,
                y + 0.58,
                z - 0.3,
                1,
                1,
                1,
              );
          }
        }
        if (c === "f" || (c === "b" && under === "f")) {
          const lit = !furnaceDark;
          B.add(this.geos.box, dark, cx, y + 0.94, 0, 1, 0.12, DEPTH);
          for (let j = 0; j < 3; j++)
            B.add(
              this.geos.lowSphere,
              lit ? this.glow("coal", 0xff7a2a) : this.std("ash", 0x3a2a24, 1),
              x + 0.2 + j * 0.3,
              y + 0.8,
              z - 0.25 - (j % 2) * 0.4,
              0.15,
              0.1,
              0.15,
            );
          if (lit)
            B.add(
              this.geos.plane,
              this.glow("heatGlow", HEAT, 0.22),
              cx,
              y + 0.3,
              z + 0.05,
              1.1,
              1.2,
              1,
            );
          if (surface)
            B.add(
              this.geos.lowSphere,
              this.std("hearthStone", 0x5d5a55, 1),
              cx,
              y + 0.95,
              z - 0.1,
              0.5,
              0.12,
              0.2,
            );
          else
            for (let j = 0; j < 4; j++)
              B.add(this.geos.box, steel, x + 0.125 + j * 0.25, y + 0.62, 0, 0.05, 0.05, DEPTH);
        }
        if (c === "v" || (c === "j" && under === "v")) {
          B.add(
            this.geos.box,
            this.std(surface ? "wellWater" : "vatLiquid", surface ? 0x1d2a33 : 0x182226, 0.15, 0.1),
            cx,
            y + 0.6,
            0,
            1,
            0.8,
            DEPTH - 0.1,
          );
          B.add(
            this.geos.box,
            surface ? this.std("wellStone", 0x6d6a64, 0.95) : steel,
            cx,
            y + 0.06,
            z - 0.02,
            1,
            0.12,
            0.1,
          );
        }
        if (c === "w" || (c === "t" && under === "w")) {
          B.add(this.geos.box, dark, cx, y + 0.85, 0, 1, 0.3, DEPTH);
          if (c === "w") {
            // Live wire ends spitting arc light.
            B.add(
              this.geos.rope,
              this.std("cable", 0x2a2a2a, 0.6),
              cx,
              y + 0.55,
              z - 0.4,
              0.9,
              1,
              1,
              (hash(x, y) - 0.5) * 0.5,
            );
            B.add(
              this.geos.lowSphere,
              this.glow("arc", ARC),
              x + 0.2 + hash(x, y, 2) * 0.6,
              y + 0.5,
              z - 0.3,
              0.07,
              0.07,
              0.07,
            );
          }
        }
        if (c === "~") {
          B.add(
            this.geos.box,
            this.std("water", 0x35587a, 0.08, 0.1, { transparent: true, opacity: 0.6 }),
            cx,
            y + 0.55,
            0,
            1,
            0.9,
            DEPTH,
          );
        }
        if (c === ">" || c === "<") {
          const belt = this.mat(
            "belt",
            () => new THREE.MeshStandardMaterial({ map: this.textures.chevron, roughness: 0.7 }),
          );
          B.add(this.geos.box, belt, cx, y + 0.5, 0, 1, 1, DEPTH, c === "<" ? Math.PI : 0);
          B.add(this.geos.cyl, steel, cx, y + 0.5, z + 0.02, 0.2, 0.05, 0.2, Math.PI / 2);
        }
        if (c === "h") B.add(this.geos.chamfer, steel, cx, y + 0.225, 0, 1, 0.45, DEPTH * 0.6);
        if (c === "D") {
          const open = doorOpen(x, y);
          B.add(
            this.geos.chamfer,
            this.std("door", 0x59616a, 0.45, 0.6),
            cx,
            open ? y + 0.08 : y + 0.5,
            0,
            0.9,
            open ? 0.14 : 1,
            DEPTH * 0.8,
          );
          if (!open)
            B.add(
              this.geos.box,
              this.std("stripe", 0xd8b13a, 0.6),
              cx,
              y + 0.5,
              z * 0.8 + 0.01,
              0.6,
              0.12,
              0.02,
              0.6,
            );
          B.add(
            this.geos.lowSphere,
            open ? this.glow("doorLamp", ARC) : this.std("doorLampOff", 0x3a3a30, 0.5),
            cx,
            y + 0.1,
            z * 0.8 + 0.05,
            0.07,
            0.07,
            0.07,
          );
        }
        if (c === "|")
          B.add(this.geos.box, this.std("blade", BONE, 0.3, 0.5), cx, y + 0.5, 0.2, 0.06, 1, 0.9);
        if (c === "s")
          B.add(
            this.geos.chamfer,
            this.std("slick", 0xcfe3f2, 0.05, 0.1),
            cx,
            y + 0.5,
            0,
            1,
            1,
            DEPTH,
          );
        // ----- what Pip left behind -----
        if (c === "x") {
          const m = world.materialAt(x, y);
          const h = m?.half ? 0.5 : 0.96;
          B.add(this.geos.soft, this.jam("splat", GEL), cx, y + 1 - h / 2, 0, 0.98, h, DEPTH * 0.9);
          // A dripping lip along the front edge.
          for (let j = 0; j < 2; j++)
            B.add(
              this.geos.sphere,
              this.jam("splat", GEL),
              x + 0.3 + j * 0.4,
              y + 1 - h + 0.12 + hash(x, y, j) * 0.1,
              z * 0.9,
              0.06,
              0.12 + hash(x, y, j + 3) * 0.08,
              0.06,
            );
        }
        if (c === "c") {
          // A smooth skin over the spikes, with bumps where the tips are.
          B.add(
            this.geos.soft,
            this.jam("coat", 0x56e0c4, { opacity: 0.82 }),
            cx,
            y + 0.65,
            0,
            1.02,
            0.7,
            DEPTH * 0.95,
          );
          for (let j = 0; j < 3; j++)
            B.add(
              this.geos.dome,
              this.jam("coat", 0x56e0c4, { opacity: 0.82 }),
              x + (j + 0.5) / 3,
              y + 0.32,
              z - 0.3,
              0.13,
              0.1,
              0.13,
            );
        }
        if (c === "b") {
          // Cracked, baked plates with glowing seams.
          const crust = this.jam("crust", 0x6f8a5c, {
            roughness: 0.75,
            emissive: 0.06,
            clearcoat: 0,
          });
          for (let j = 0; j < 3; j++)
            B.add(
              this.geos.chamfer,
              crust,
              x + 0.17 + j * 0.33,
              y + 0.3,
              0,
              0.31,
              0.58,
              DEPTH * 0.95,
              (hash(x, y, j) - 0.5) * 0.12,
            );
          for (let j = 0; j < 2; j++)
            B.add(
              this.geos.box,
              this.glow("seam", 0xffa23a),
              x + 0.34 + j * 0.33,
              y + 0.3,
              z * 0.95 + 0.01,
              0.025,
              0.5,
              0.01,
              (hash(x, y, j + 4) - 0.5) * 0.3,
            );
        }
        if (c === "j") {
          B.add(
            this.geos.box,
            this.jam("fill", 0x168a7b, { roughness: 0.08, clearcoat: 1 }),
            cx,
            y + 0.5,
            0,
            1,
            1,
            DEPTH * 0.95,
          );
        }
        if (c === "p") {
          // A domed cushion on the floor with an up-chevron and a bright rim.
          B.add(this.geos.dome, this.jam("pad", GEL, { emissive: 0.3 }), cx, y, 0, 0.5, 0.32, 0.75);
          for (const sgn of [-1, 1])
            B.add(
              this.geos.box,
              this.glow("padMark", 0xbafff0),
              cx + sgn * 0.08,
              y - 0.14,
              0.66,
              0.04,
              0.2,
              0.01,
              sgn * 0.8,
            );
          B.add(this.geos.box, this.glow("padRim", GLOW), cx, y + 0.02, z + 0.02, 1, 0.04, 0.02);
        }
        if (c === "i") {
          // A clear faceted cube with Pip's frozen silhouette inside.
          B.add(
            this.geos.ice,
            this.std("ice", FROST, 0.06, 0.05, {
              transparent: true,
              opacity: 0.5,
              depthWrite: false,
            }),
            cx,
            y + 0.5,
            0,
            0.98,
            0.98,
            0.98,
          );
          B.add(
            this.gelGeo,
            this.mat(
              "frozenPip",
              () =>
                new THREE.MeshBasicMaterial({
                  color: 0x5fcfbb,
                  transparent: true,
                  opacity: 0.45,
                  depthWrite: false,
                }),
            ),
            cx,
            y + 0.92,
            0,
            0.75,
            0.75,
            0.75,
          );
        }
        if (c === "t") {
          // A thin taut rope of gel with arc light pulsing along it.
          B.add(this.geos.rope, this.strandMat(), cx, y + 0.45, z - 0.4, 1, 1.4, 1.4);
          B.add(this.geos.rope, this.strandMat(), cx, y + 0.45, z - 1.2, 1, 1.4, 1.4);
        }
      }
    if (frost.length) {
      const haze = this.glow("frostHaze", 0xbcd9ff, 0.16);
      for (const [x, y] of frost) {
        B.add(this.geos.plane, haze, x + 0.5, y + 0.5, z + 0.02, 1, 1, 1);
        // Rime on the floor under frost air.
        if (world.baseSolid(world.cell(x, y + 1)))
          B.add(
            this.geos.box,
            this.std("rime", FROST, 0.4),
            x + 0.5,
            y + 0.97,
            0,
            1,
            0.06,
            DEPTH + 0.02,
          );
        for (let j = 0; j < 4; j++)
          B.add(
            this.geos.lowSphere,
            this.glow("flake", 0xd8ecff, 0.6),
            x + 0.1 + hash(x, y, j) * 0.8,
            y + 0.1 + hash(x, y, j + 2) * 0.8,
            z + 0.05,
            0.035,
            0.035,
            0.01,
          );
      }
    }
    B.build(this.cells, shadows);
  }
  strandMat() {
    return this.mat("strand", () => {
      const m = new THREE.MeshStandardMaterial({
        color: GEL,
        emissive: GEL,
        emissiveIntensity: 0.6,
        roughness: 0.2,
      });
      m.onBeforeCompile = (s) => {
        s.uniforms.time = this.uniforms.time;
        s.vertexShader = s.vertexShader
          .replace("#include <common>", "#include <common>\nvarying float vX;")
          .replace(
            "#include <worldpos_vertex>",
            "#include <worldpos_vertex>\nvX=(modelMatrix*instanceMatrix*vec4(transformed,1.)).x;",
          );
        s.fragmentShader = s.fragmentShader
          .replace("#include <common>", "#include <common>\nuniform float time;varying float vX;")
          .replace(
            "#include <emissivemap_fragment>",
            "#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(1.,.97,.66)*pow(max(sin(vX*2.2-time*7.),0.),12.)*2.;",
          );
      };
      return m;
    });
  }

  makeJar(x, y) {
    const g = new THREE.Group();
    const glass = this.mat(
      "glass",
      () =>
        new THREE.MeshPhysicalMaterial({
          color: 0xcfe8e4,
          roughness: 0.08,
          metalness: 0,
          transparent: true,
          opacity: 0.28,
          clearcoat: 1,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
    );
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.7, 24, 1, true), glass);
    body.position.set(x, -y + 0.4, 0.1);
    const rim = this.std("jarRim", 0xc3d4cf, 0.2, 0.6);
    for (const h of [0.08, 0.74]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.035, 6, 24), rim);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, -y + h, 0.1);
      g.add(ring);
    }
    const lid = new THREE.Mesh(this.geos.chamfer, this.std("lid", 0xb39355, 0.35, 0.5));
    lid.scale.set(0.82, 0.12, 0.82);
    lid.position.set(x, -y + 0.88, 0.1);
    const label = new THREE.Mesh(
      this.geos.plane,
      this.mat("label", () => new THREE.MeshBasicMaterial({ map: this.textures.label })),
    );
    label.scale.set(0.4, 0.3, 1);
    label.position.set(x, -y + 0.38, 0.52);
    const jelly = new THREE.Mesh(this.geos.sphere, this.gel);
    jelly.position.set(x, -y + 0.16, 0.1);
    jelly.scale.set(0.33, 0.1, 0.33);
    // The jar glows a little: home is here.
    const halo = new THREE.Sprite(this.haloMat);
    halo.position.set(x, -y + 0.45, -0.2);
    halo.scale.set(2.2, 2.2, 1);
    g.add(body, lid, label, jelly, halo);
    this.actors.add(g);
    return { g, body, lid, jelly, halo, x, y };
  }

  // ---------- frame ----------
  resize() {
    const w = this.canvas.clientWidth || innerWidth,
      h = this.canvas.clientHeight || innerHeight;
    const tier = this.settings.world;
    this.applyTier();
    const ratio = Math.min(
      devicePixelRatio || 1,
      tier === "high" ? 2 : tier === "medium" ? 1.25 : 1,
    );
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(w, h, false);
    this.bloom.setSize(Math.round(w * ratio), Math.round(h * ratio));
    const aspect = w / h;
    this.camera.aspect = aspect;
    // Framing per room: Pip near 6% of screen height on desktop and 8% on phones.
    const phone = Math.min(w, h) < 560;
    const rw = this.world?.w ?? 22,
      rh = this.world?.h ?? 13;
    let viewH = phone ? 10 : Math.min(rh, 13) + 1.4;
    if (!phone) viewH = Math.max(viewH, (Math.min(rw, 22) + 1) / aspect);
    viewH = Math.min(viewH, Math.max(rh + 1.4, (rw + 1) / aspect));
    this.viewH = viewH;
    this.viewW = viewH * aspect;
    this.distance = viewH / 2 / TAN;
    this.camera.near = Math.max(1, this.distance - 30);
    this.camera.far = this.distance + 120;
    this.camera.updateProjectionMatrix();
  }
  burst(x, y, color = GEL) {
    if (this.settings.motion === false) return;
    const mat = this.jam(`drop${color}`, color, { emissive: 0.3 });
    for (let i = 0; i < 14 && this.effects.length < 96; i++) {
      const m = new THREE.Mesh(this.geos.sphere, mat);
      m.scale.setScalar(0.035 + Math.random() * 0.045);
      m.position.set(x, -y, 0.7);
      this.actors.add(m);
      this.effects.push({ m, vx: (Math.random() - 0.5) * 8, vy: Math.random() * 5, life: 0.6 });
    }
  }
  // Drops a world tier when frames stay under 58 fps for 3 seconds (art bible §9).
  watchFrames(dt) {
    const f = this.fps;
    f.t += dt;
    f.frames++;
    if (f.t < 0.5) return;
    const rate = f.frames / f.t;
    f.t = f.frames = 0;
    f.slow = rate < 58 ? f.slow + 0.5 : 0;
    if (f.slow >= 3 && this.settings.world !== "low") {
      this.settings.world = this.settings.world === "high" ? "medium" : "low";
      f.slow = 0;
      this.applyTier();
      this.resize();
    }
  }
  render(dt, ghostState = null) {
    if (!this.world) return;
    const w = this.world,
      L = this.look;
    this.clock += dt;
    this.uniforms.time.value = this.clock;
    if (document.visibilityState === "visible") this.watchFrames(dt);
    this.refreshGrid();
    const p = w.players[w.active] ?? w.players[0];
    // Camera: locked per room, panning smoothly in rooms larger than the view.
    const px = p.x + p.w / 2,
      py = p.y + p.h / 2;
    const fit = (pos, size, view) =>
      size + 0.6 <= view
        ? size / 2
        : THREE.MathUtils.clamp(pos, view / 2 - 0.3, size - view / 2 + 0.3);
    const cx = fit(px, w.w, this.viewW),
      cy = fit(py, w.h, this.viewH);
    if (this.cameraX === null || this.settings.motion === false) {
      this.cameraX = cx;
      this.cameraY = cy;
    } else {
      const k = Math.min(1, dt * 5);
      this.cameraX += (cx - this.cameraX) * k;
      this.cameraY += (cy - this.cameraY) * k;
    }
    this.camera.position.set(this.cameraX, -this.cameraY, this.distance);
    this.camera.lookAt(this.cameraX, -this.cameraY, 0);
    // Light per act.
    let keyI = L.keyIntensity;
    for (const [i, b] of (this.beacons ?? []).entries()) b.rotation.z = this.clock * 2.4 + i;
    if (L.beacons) keyI *= 0.75 + 0.25 * Math.max(0, Math.sin(this.clock * 2.4));
    if (L.flicker) {
      const f = hash(Math.floor(this.clock * 12), 7) > 0.93 ? 0.35 : 1;
      if (this.lamps?.[1]) this.lamps[1].visible = f > 0.5;
      keyI *= 0.92 + 0.08 * f;
    }
    if (L.lightning) {
      const t = this.clock % 9;
      const flash = t > 8.4 ? (t < 8.5 || (t > 8.6 && t < 8.66) ? 1 : 0) : 0;
      keyI += flash * 5;
      this.renderer.setClearColor(flash ? 0x8090a8 : L.clear);
    }
    this.key.intensity = keyI;
    this.textures.chevron.offset.x = -this.clock * 1.5;
    // Pip and halves.
    const bodyMat = this.pipBody();
    while (this.jamMeshes.length < w.players.length) this.jamMeshes.push(this.pip());
    this.jamMeshes.forEach((mesh, i) => {
      const q = w.players[i];
      mesh.visible = !!q && !q.dead && !q.inJar;
      if (!mesh.visible) return;
      mesh.userData.body.material = bodyMat;
      mesh.userData.halo.visible = this.settings.pip !== "low";
      mesh.position.set(q.x + q.w / 2, -q.y - q.h, 0);
      const size = q.half ? 0.62 : 1;
      const motion = this.settings.motion !== false;
      const sq = motion ? q.sq : 0;
      const breathe =
        motion && q.ground && Math.abs(q.vx) < 0.5 ? Math.sin(this.clock * 2.2 + i) * 0.025 : 0;
      const run = motion && q.ground ? Math.min(Math.abs(q.vx) / 6.5, 1) * 0.08 : 0;
      // Halves are smaller and rounder.
      mesh.scale.set(
        size * (1 + sq * 0.35 + run) * (q.half ? 1.12 : 1),
        size * (1 - sq * 0.3 + breathe - run * 0.5) * (q.half ? 0.92 : 1),
        size,
      );
      mesh.rotation.z = motion ? -q.vx * 0.018 : 0;
      // Seed-eyes track the facing direction, blink and glance around.
      const u = mesh.userData;
      u.blink -= dt;
      if (u.blink < -3 - hash(i, Math.floor(this.clock)) * 2) u.blink = 0.12;
      u.glance = Math.sin(this.clock * 0.7 + i * 2) > 0.92 ? 0.04 : 0;
      u.eyes.forEach((eye, k) => {
        eye.position.x = (k ? 0.12 : -0.12) + q.face * 0.05 + u.glance;
        eye.position.y = 0.42 + (q.vy > 4 ? -0.03 : q.vy < -4 ? 0.03 : 0);
        eye.scale.y = u.blink > 0 ? 0.008 : 0.068;
      });
    });
    this.pipLight.position.set(px, -py + 0.3, 1.6);
    this.pipLight.intensity = (this.settings.pip === "low" ? 3 : 6) * L.pipLight;
    this.pipLight.visible = !p.dead;
    // Machines follow the deterministic timeline.
    w.presses.forEach((k, i) => {
      const m = this.pressMeshes[i];
      m.g.position.set(k.x + k.w / 2, 0, 0);
      m.head.position.set(0, -k.pos - 0.5, 0);
      const len = Math.max(0.1, k.pos - k.top + 0.6);
      m.shaft.scale.y = len;
      m.shaft.position.set(0, -(k.top + k.pos) / 2, -0.2);
    });
    w.lifts.forEach((l, i) => {
      const g = this.liftMeshes[i];
      g.position.set(l.x, -l.y, 0);
      g.userData.lamp.visible = w.power >= l.required;
    });
    w.cutterRects().forEach((c, i) => {
      const m = this.bladeMeshes[i];
      if (!m) return;
      m.position.set(c.x + c.w / 2, -c.y - c.h / 2, 0.3);
      m.scale.set(Math.max(c.w, 0.06), Math.max(c.h, 0.06), 0.9);
    });
    if (this.plate) this.plate.position.set(w.w / 2, -w.plateRow() - 0.5, 0);
    // Ghost.
    this.ghost.visible = !!ghostState && !ghostState.dead && !ghostState.inJar;
    if (ghostState) {
      this.ghost.position.set(
        ghostState.x + (ghostState.half ? 0.25 : 0.38),
        -ghostState.y - (ghostState.half ? 0.5 : 0.76),
        0.2,
      );
      this.ghost.scale.setScalar(ghostState.half ? 0.62 : 1);
    }
    for (const { s, m } of this.seedMeshes) {
      m.visible = !s.collected;
      m.rotation.y = this.clock * 1.5;
      m.position.y = -s.y - 0.5 + Math.sin(this.clock * 2) * 0.05;
    }
    if (this.jar) {
      const full = w.players.some((q) => q.inJar);
      this.jar.lid.position.y = -this.jar.y + 0.9 + (full ? 0 : Math.sin(this.clock * 2) * 0.03);
      this.jar.jelly.scale.y += ((full ? 0.3 : 0.1) - this.jar.jelly.scale.y) * Math.min(1, dt * 4);
    }
    if (this.dust) {
      this.dust.visible = this.settings.motion !== false;
      this.dust.position.y = Math.sin(this.clock * 0.15) * 0.3;
    }
    if (this.rain) {
      this.rain.visible = this.settings.motion !== false;
      this.rain.position.y = -((this.clock * 9) % 3);
    }
    if (
      this.settings.motion !== false &&
      p.ground &&
      Math.abs(p.vx) > 3 &&
      this.clock - (this.lastTrail ?? 0) > 0.08 &&
      this.effects.length < 96
    ) {
      // A little wet trail of droplets when running.
      this.lastTrail = this.clock;
      const m = new THREE.Mesh(this.geos.sphere, this.jam("trail", GEL, { emissive: 0.3 }));
      m.scale.set(0.035, 0.02, 0.03);
      m.position.set(px, -p.y - p.h + 0.015, 0.3);
      this.actors.add(m);
      this.effects.push({ m, vx: 0, vy: 0.3, life: 0.28 });
    }
    for (const r of this.ripples) {
      r.life -= dt;
      const size = (0.42 - r.life) * 2.2 + 0.12;
      r.m.scale.set(size, size * 0.25, 1);
      r.m.material.opacity = (r.life / 0.42) * 0.6;
      if (r.life <= 0) {
        this.actors.remove(r.m);
        r.m.material.dispose();
      }
    }
    this.ripples = this.ripples.filter((r) => r.life > 0);
    for (const e of this.effects) {
      e.life -= dt;
      e.m.position.x += e.vx * dt;
      e.m.position.y += e.vy * dt;
      e.vy -= 18 * dt;
      e.m.scale.multiplyScalar(0.985);
      if (e.life <= 0) this.actors.remove(e.m);
    }
    this.effects = this.effects.filter((e) => e.life > 0);
    if (this.settings.world === "low") {
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.scene, this.camera);
    } else this.bloom.render(this.scene, this.camera, this.settings.world === "high" ? 0.95 : 0.75);
  }
  event(event) {
    if (this.settings.motion === false) return;
    if (["jam.land", "pad.bounce", "jam.merge"].includes(event.id) && Number.isFinite(event.x)) {
      const m = new THREE.Mesh(
        this.geos.ripple,
        new THREE.MeshBasicMaterial({
          color: 0x9cffe5,
          transparent: true,
          opacity: 0.6,
          depthWrite: false,
        }),
      );
      m.position.set(event.x + 0.38, -event.y - 0.75, 0.6);
      this.actors.add(m);
      this.ripples.push({ m, life: 0.42 });
    }
    if (event.id === "seed.collect") this.burst(event.x + 0.5, event.y + 0.5, 0xeed09a);
  }
  dispose() {
    this.bloom.dispose();
    this.renderer.dispose();
  }
}
