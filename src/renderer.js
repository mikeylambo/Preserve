import * as THREE from "../vendor/three.module.js";
import { ACTS } from "./rooms.js";
import { paintTexture, storyTexture } from "./art.js";
const GEL = "#2bc4a8",
  EYE = "#1b2a26";
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
    this.renderer.setClearColor(0x0a1014);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.shadowMap.enabled = settings.world !== "low";
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-16, 16, 9, -9, 0.1, 160);
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.dynamic = new THREE.Group();
    this.scene.add(this.dynamic);
    this.background = new THREE.Group();
    this.scene.add(this.background);
    this.actorRoot = new THREE.Group();
    this.scene.add(this.actorRoot);
    this.effects = [];
    this.geos = {
      box: new THREE.BoxGeometry(1, 1, 1),
      sphere: new THREE.SphereGeometry(1, 24, 16),
      cone: new THREE.ConeGeometry(0.15, 0.72, 5),
    };
    this.materials = {};
    this.textures = {
      concrete: paintTexture("concrete"),
      wood: paintTexture("wood"),
      photo: storyTexture("photo"),
      label: storyTexture("label"),
    };
    this.clock = 0;
    this.cameraX = 16;
    this.cameraY = -9;
    this.lastGrid = "";
    this.jamMeshes = [];
    this.seedMeshes = [];
    this.light = new THREE.PointLight(0x7ff0d8, 20, 11, 2);
    this.scene.add(this.light);
    this.scene.add(new THREE.HemisphereLight(0xaebdcb, 0x20212b, 1.1));
    this.key = new THREE.DirectionalLight(0xffffff, 2.5);
    this.key.position.set(8, 8, 14);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024, 1024);
    this.key.shadow.camera.left = -50;
    this.key.shadow.camera.right = 50;
    this.key.shadow.camera.top = 40;
    this.key.shadow.camera.bottom = -40;
    this.scene.add(this.key);
    this.createGel();
    const hc = document.createElement("canvas");
    hc.width = hc.height = 64;
    const hcctx = hc.getContext("2d"),
      hg = hcctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    hg.addColorStop(0, "rgba(98,255,215,.3)");
    hg.addColorStop(0.4, "rgba(44,196,168,.12)");
    hg.addColorStop(1, "rgba(44,196,168,0)");
    hcctx.fillStyle = hg;
    hcctx.fillRect(0, 0, 64, 64);
    this.haloMat = new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(hc),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.highGel = new THREE.MeshPhysicalMaterial({
      color: 0x2bc4a8,
      transmission: 0.8,
      thickness: 0.55,
      ior: 1.35,
      roughness: 0.13,
      clearcoat: 1,
      clearcoatRoughness: 0.09,
      emissive: 0x0e6b5c,
      emissiveIntensity: 0.45,
    });
    this.rippleGeo = new THREE.TorusGeometry(1, 0.04, 5, 32);
    this.ripples = [];
    this.resize();
  }
  mat(key, color, roughness = 0.85, metalness = 0) {
    if (!this.materials[key])
      this.materials[key] = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    const m = this.materials[key];
    if (/^stone/.test(key)) m.map = this.textures.concrete;
    else if (["boards", "tree", "photoFrame"].includes(key)) m.map = this.textures.wood;
    if (["coat", "splat", "fill", "pad", "strand", "drop", "crust"].includes(key)) {
      m.emissive.copy(m.color);
      m.emissiveIntensity = 0.12;
    }
    if (key === "ice") {
      m.transparent = true;
      m.opacity = 0.72;
      m.depthWrite = false;
    }
    return m;
  }
  box(group, x, y, z, w, h, d, mat) {
    const m = new THREE.Mesh(this.geos.box, mat);
    m.position.set(x, -y, z);
    m.scale.set(w, h, d);
    m.castShadow = this.settings.world !== "low";
    m.receiveShadow = true;
    group.add(m);
    return m;
  }
  createGel() {
    const points = [new THREE.Vector2(0, 0)];
    for (let i = 0; i <= 24; i++) {
      const a = ((i / 24) * Math.PI) / 2;
      points.push(new THREE.Vector2(0.42 * Math.cos(a), 0.76 * Math.sin(a)));
    }
    this.gelGeo = new THREE.LatheGeometry(points, 32);
    this.gel = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, tint: { value: new THREE.Color(GEL) }, low: { value: 0 } },
      vertexShader: `varying vec3 vN;varying vec3 vP;uniform float time;void main(){vec3 p=position;p.x+=sin(time*3.0+p.y*7.0)*.008*p.y;vec4 wp=modelMatrix*vec4(p,1.0);vP=wp.xyz;vN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*wp;}`,
      fragmentShader: `varying vec3 vN;varying vec3 vP;uniform vec3 tint;uniform float low;void main(){vec3 n=normalize(vN),v=normalize(cameraPosition-vP);float rim=pow(1.0-max(dot(n,v),0.0),2.4);float spec=pow(max(dot(reflect(-normalize(vec3(-.6,1.,2.)),n),v),0.),42.);float core=pow(max(dot(n,v),0.),3.);vec3 col=mix(tint*.30,tint,core*.70+.2)+vec3(.38,.94,.83)*rim*.75+vec3(.85,1.,.96)*spec*.75;col=mix(col,tint*.85+vec3(.15,.28,.22)*rim,low);gl_FragColor=vec4(col,1.0);}`,
      transparent: false,
    });
  }
  pip(ghost = false) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      this.gelGeo,
      ghost
        ? (this.materials.ghost ??= new THREE.MeshBasicMaterial({
            color: 0x8affdf,
            transparent: true,
            opacity: 0.22,
            depthWrite: false,
          }))
        : this.gel,
    );
    g.add(body);
    if (!ghost) {
      const eyeMat = (this.materials.eye ??= new THREE.MeshBasicMaterial({ color: EYE }));
      for (const s of [-1, 1]) {
        const eye = new THREE.Mesh(this.geos.sphere, eyeMat);
        eye.position.set(s * 0.13, 0.4, 0.35);
        eye.scale.set(0.043, 0.071, 0.025);
        g.add(eye);
      }
      const glint = new THREE.Mesh(
        this.geos.sphere,
        (this.materials.glint ??= new THREE.MeshBasicMaterial({
          color: 0xc3fff0,
          transparent: true,
          opacity: 0.55,
        })),
      );
      glint.position.set(-0.15, 0.56, 0.27);
      glint.scale.set(0.045, 0.09, 0.015);
      g.add(glint);
      const halo = new THREE.Sprite(this.haloMat);
      halo.position.set(0, 0.3, -0.5);
      halo.scale.set(1.6, 1.6, 1);
      g.add(halo);
    }
    this.actorRoot.add(g);
    return g;
  }
  clear(group) {
    for (const child of [...group.children]) {
      group.remove(child);
      if (child.isInstancedMesh) child.dispose();
      if (
        child.geometry &&
        !Object.values(this.geos).includes(child.geometry) &&
        child.geometry !== this.gelGeo &&
        child.geometry !== this.rippleGeo
      )
        child.geometry.dispose();
      if (child.material?.userData?.transient) child.material.dispose();
    }
  }
  load(world) {
    for (const r of this.ripples ?? []) r.m.material.dispose();
    this.world = world;
    this.clear(this.root);
    this.clear(this.dynamic);
    this.clear(this.background);
    this.clear(this.actorRoot);
    this.jamMeshes = [];
    this.seedMeshes = [];
    this.effects = [];
    this.ripples = [];
    this.pressGroup = null;
    this.ghost = this.pip(true);
    this.lastGrid = "";
    this.cameraX = Math.min(16, world.w / 2);
    this.cameraY = -Math.min(9, world.h / 2);
    const act = world.room.act;
    this.key.color.setHex(ACTS[act].color);
    this.key.intensity = act === 0 ? 0.8 : act === 8 ? 3.2 : 2;
    this.renderer.setClearColor(act === 8 ? 0x40352d : act === 7 ? 0x182331 : 0x0a1014);
    const concrete = this.mat(
      `stone${act}`,
      act === 8 ? 0x8a5a36 : act === 7 ? 0x525661 : 0x44494e,
      act === 8 ? 0.65 : 0.9,
    );
    const metal = this.mat("steel", 0x6b7379, 0.4, 0.65);
    this.box(
      this.background,
      world.w / 2,
      world.h / 2,
      -7,
      world.w + 6,
      world.h + 6,
      1,
      this.mat("back", act === 8 ? 0x544539 : 0x171f26),
    );
    for (let x = 3; x < world.w; x += 8) {
      this.box(this.background, x, world.h / 2, -4, 0.28, world.h + 4, 0.35, metal);
      this.box(this.background, x + 3, 2, -4, 4, 0.6, 0.8, metal);
      const lamp = this.box(
        this.background,
        x + 3,
        2.1,
        -3.5,
        2.4,
        0.13,
        0.15,
        new THREE.MeshBasicMaterial({ color: ACTS[act].color }),
      );
      if (act >= 5) {
        this.box(
          this.background,
          x + 3,
          world.h / 2,
          -5,
          3,
          world.h - 5,
          0.1,
          this.mat("window", act === 8 ? 0xac885a : 0x23313c),
        );
        for (let i = 0; i < 3; i++)
          this.box(this.background, x + 3, 4 + i * 3, -4.8, 3, 0.08, 0.1, metal);
      }
      if (act === 1 || act === 2)
        this.box(
          this.background,
          x + 3,
          2.3,
          -3.5,
          0.7,
          0.15,
          0.17,
          this.mat("beacon", 0xd8382e, 0.3),
        );
    }
    // Painted story photo and specimen desk are geometry; all stay behind the play plane.
    const sx = world.spawn.x;
    this.box(this.background, sx + 1, world.spawn.y + 0.7, -2, 2, 0.12, 1, concrete);
    this.box(
      this.background,
      sx + 1.5,
      world.spawn.y - 0.3,
      -3,
      0.8,
      0.6,
      0.08,
      this.mat("photoFrame", 0x8a7051),
    );
    const photo = new THREE.Mesh(
      new THREE.PlaneGeometry(0.66, 0.46),
      (this.materials.photo ??= new THREE.MeshBasicMaterial({ map: this.textures.photo })),
    );
    photo.position.set(sx + 1.5, -world.spawn.y + 0.3, -2.9);
    this.background.add(photo);
    if (act === 7) {
      for (let x = 4; x < world.w; x += 11) {
        this.box(this.background, x, 11, -4, 0.55, 8, 0.7, this.mat("tree", 0x433a34));
        const crown = new THREE.Mesh(this.geos.sphere, this.mat("foliage", 0x333b3e));
        crown.scale.set(2.7, 3, 1.5);
        crown.position.set(x, -6, -4);
        this.background.add(crown);
      }
    }
    if (act === 8) {
      for (let x = 0; x < world.w; x += 2)
        this.box(this.background, x + 1, 17.8, -1.5, 1.98, 0.12, 5, this.mat("boards", 0x7e5536));
    }
    this.decorate(world);
    this.jar = this.makeJar(world.exit.x + 0.5, world.exit.y + 1);
    this.refreshGrid();
    for (const s of world.seeds) {
      const m = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.13),
        new THREE.MeshBasicMaterial({ color: 0xf6d58d }),
      );
      m.position.set(s.x + 0.5, -s.y - 0.5, 0.7);
      this.dynamic.add(m);
      this.seedMeshes.push({ m, s });
    }
    this.resize();
  }
  makeJar(x, y) {
    const g = new THREE.Group();
    const glass = (this.materials.glass ??= new THREE.MeshPhysicalMaterial({
      color: 0xb6d8d7,
      roughness: 0.12,
      metalness: 0.05,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false,
    }));
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.39, 0.65, 24, 1, true), glass);
    body.position.set(x, -y + 0.38, 0.15);
    this.root.add(body);
    g.add(body);
    const edgeMat = this.mat("jarRim", 0xc3d4cf, 0.2, 0.6);
    for (const h of [0.12, 0.68]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 6, 24), edgeMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, -y + h, 0.15);
      this.root.add(ring);
    }
    const lid = this.box(
      this.root,
      x,
      y - 0.87,
      0.15,
      0.78,
      0.12,
      0.74,
      this.mat("lid", 0xb39355, 0.35, 0.5),
    );
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(0.39, 0.29),
      (this.materials.label ??= new THREE.MeshBasicMaterial({ map: this.textures.label })),
    );
    label.position.set(x, -y + 0.37, 0.57);
    this.root.add(label);
    const jelly = new THREE.Mesh(this.geos.sphere, this.gel);
    jelly.position.set(x, -y + 0.18, 0.14);
    jelly.scale.set(0.31, 0.12, 0.31);
    this.root.add(jelly);
    return { body, lid, jelly, x, y };
  }
  refreshGrid() {
    const world = this.world;
    const hash = world.grid.map((r) => r.join("")).join("");
    if (hash === this.lastGrid) return;
    this.lastGrid = hash;
    this.clear(this.root);
    this.jar = this.makeJar(world.exit.x + 0.5, world.exit.y + 1);
    const groups = {};
    for (let y = 0; y < world.h; y++)
      for (let x = 0; x < world.w; x++) {
        const c = world.grid[y][x];
        if (c !== "." && c !== "*" && c !== "o") (groups[c] ??= []).push([x, y]);
      }
    const mats = {
      "#": this.mat(
        `stone${world.room.act}`,
        world.room.act === 8 ? 0x8a5a36 : world.room.act === 7 ? 0x525661 : 0x44494e,
      ),
      "^": this.mat("spikeBase", 0x2d3035),
      f: this.mat("fireBase", 0x39221b),
      v: this.mat("vat", 0x121620),
      c: this.mat("coat", 0x3ecab0, 0.19, 0.2),
      b: this.mat("crust", 0x5a8e75, 0.8),
      j: this.mat("fill", 0x167d71, 0.18),
      p: this.mat("pad", 0x25b598, 0.25),
      i: this.mat("ice", 0xbcd9ff, 0.16, 0.12),
      x: this.mat("splat", 0x2bc4a8, 0.25),
      s: this.mat("slick", 0x9bb9c7, 0.1),
      ">": this.mat("belt", 0x58616a, 0.55, 0.5),
      "<": this.mat("belt", 0x58616a, 0.55, 0.5),
      h: this.mat("steel", 0x6b7379, 0.4, 0.65),
      "~": this.mat("water", 0x45678d, 0.12),
      D: this.mat("door", 0x565e65, 0.5, 0.5),
      t: this.mat("strand", 0x75dbc0, 0.12),
      w: this.mat("wire", 0x766a3c, 0.3, 0.6),
      "|": (this.materials.cutter ??= new THREE.MeshBasicMaterial({ color: 0xe4cc8e })),
    };
    const transform = new THREE.Object3D();
    for (const [c, cells] of Object.entries(groups)) {
      const mat = mats[c] ?? mats["#"];
      const inst = new THREE.InstancedMesh(this.geos.box, mat, cells.length);
      inst.castShadow = this.settings.world !== "low";
      inst.receiveShadow = true;
      cells.forEach(([x, y], i) => {
        let h = 1,
          dy = 0.5,
          d = 1.8;
        if (c === "h") {
          h = 0.45;
          dy = 0.225;
        }
        if ("^fv".includes(c)) {
          h = 0.22;
          dy = 0.9;
        }
        if (c === "p") {
          h = 0.4;
          dy = 0.8;
        }
        if (c === "t" || c === "w") {
          h = 0.09;
          dy = 0.9;
          d = 0.18;
        }
        if (c === "|") {
          h = 1;
          d = 0.12;
        }
        if (c === "D" && world.power >= (world.room.circuitDoors?.[`${x},${y}`] ?? 1)) {
          h = 0.1;
          dy = 0.05;
        }
        if (c === "x" && world.materialAt(x, y)?.half) {
          h = 0.5;
          dy = 0.75;
        }
        transform.position.set(x + 0.5, -y - dy, 0);
        transform.scale.set(0.98, h * 0.98, d);
        transform.updateMatrix();
        inst.setMatrixAt(i, transform.matrix);
      });
      this.root.add(inst);
      if (this.settings.outlines && "cbpjixst".includes(c)) {
        const edgeGeo = new THREE.EdgesGeometry(this.geos.box),
          edgeMat = (this.materials.outline ??= new THREE.LineBasicMaterial({ color: 0xe2f4e8 }));
        for (const [x, y] of cells) {
          const line = new THREE.LineSegments(edgeGeo, edgeMat);
          line.position.set(x + 0.5, -y - 0.5, 0.95);
          line.scale.set(0.98, 0.98, 0.05);
          this.root.add(line);
        }
      }
      if ("cxpj".includes(c)) {
        const skins = new THREE.InstancedMesh(this.geos.sphere, mat, cells.length);
        cells.forEach(([x, y], i) => {
          transform.position.set(x + 0.5, -y - (c === "p" ? 0.78 : c === "x" ? 0.45 : 0.12), 0.08);
          transform.scale.set(0.51, c === "p" ? 0.22 : c === "x" ? 0.52 : 0.14, 0.94);
          transform.updateMatrix();
          skins.setMatrixAt(i, transform.matrix);
        });
        skins.castShadow = this.settings.world !== "low";
        this.root.add(skins);
      }
      if (c === "^") {
        const spikes = new THREE.InstancedMesh(
          this.geos.cone,
          this.mat("bone", 0xe9e1d3, 0.5, 0.3),
          cells.length * 3,
        );
        cells.forEach(([x, y], i) => {
          for (let j = 0; j < 3; j++) {
            transform.position.set(x + (j + 0.5) / 3, -y - 0.62, 0.15);
            transform.scale.set(1, 1, 1);
            transform.updateMatrix();
            spikes.setMatrixAt(i * 3 + j, transform.matrix);
          }
        });
        this.root.add(spikes);
      }
      if (
        c === "f" &&
        !(world.room.machine === "furnace" && Math.floor(world.time / 3) % 2 === 1)
      ) {
        const coals = new THREE.InstancedMesh(
          this.geos.sphere,
          (this.materials.coals ??= new THREE.MeshBasicMaterial({ color: 0xff8f38 })),
          cells.length * 2,
        );
        cells.forEach(([x, y], i) => {
          for (let j = 0; j < 2; j++) {
            transform.position.set(x + (j + 0.5) / 2, -y - 0.72, 0.4);
            transform.scale.set(0.18, 0.12, 0.19);
            transform.updateMatrix();
            coals.setMatrixAt(i * 2 + j, transform.matrix);
          }
        });
        this.root.add(coals);
      }
      if (c === "#") {
        const lips = cells.filter(([x, y]) => !world.baseSolid(world.cell(x, y - 1)));
        const edges = new THREE.InstancedMesh(
          this.geos.box,
          this.mat("edge", world.room.act === 8 ? 0xb78452 : 0x697178),
          lips.length,
        );
        lips.forEach(([x, y], i) => {
          transform.position.set(x + 0.5, -y - 0.035, 0.92);
          transform.scale.set(0.98, 0.07, 0.06);
          transform.updateMatrix();
          edges.setMatrixAt(i, transform.matrix);
        });
        this.root.add(edges);
      }
      if ("bpi".includes(c)) {
        for (const [x, y] of cells) {
          if (c === "b") {
            for (let j = 0; j < 2; j++) {
              const seam = this.box(
                this.root,
                x + 0.25 + j * 0.5,
                y + 0.4,
                0.94,
                0.025,
                0.7,
                0.015,
                this.mat("seam", 0xd3ae70),
              );
              seam.rotation.z = 0.35;
            }
          }
          if (c === "p") {
            const v = this.box(
              this.root,
              x + 0.4,
              y + 0.75,
              0.96,
              0.04,
              0.24,
              0.02,
              this.mat("padMark", 0xb9ffe8),
            );
            v.rotation.z = -0.65;
            const b = this.box(
              this.root,
              x + 0.6,
              y + 0.75,
              0.96,
              0.04,
              0.24,
              0.02,
              this.mat("padMark", 0xb9ffe8),
            );
            b.rotation.z = 0.65;
          }
          if (c === "i") {
            const inner = new THREE.Mesh(this.gelGeo, this.gel);
            inner.position.set(x + 0.5, -y - 0.95, 0.1);
            inner.scale.set(0.7, 0.75, 0.7);
            this.root.add(inner);
          }
        }
      }
    }
    // Frost is a volume with sparse, recognizable crystalline flecks.
    const frost = [];
    for (let y = 0; y < world.h; y++)
      for (let x = 0; x < world.w; x++)
        if (world.cell(x, y) === "*" || world.frostMask.has(`${x},${y}`)) frost.push([x, y]);
    if (frost.length) {
      const flakes = new THREE.InstancedMesh(
        new THREE.OctahedronGeometry(0.045),
        (this.materials.frost ??= new THREE.MeshBasicMaterial({
          color: 0xbcd9ff,
          transparent: true,
          opacity: 0.5,
        })),
        frost.length * 3,
      );
      frost.forEach(([x, y], i) => {
        for (let j = 0; j < 3; j++) {
          transform.position.set(
            x + 0.2 + j * 0.3,
            -y - 0.2 - ((x * 13 + y * 7 + j * 3) % 7) / 10,
            0.4,
          );
          transform.scale.set(1, 1, 1);
          transform.updateMatrix();
          flakes.setMatrixAt(i * 3 + j, transform.matrix);
        }
      });
      this.root.add(flakes);
    }
  }
  resize() {
    const w = this.canvas.clientWidth || innerWidth,
      h = this.canvas.clientHeight || innerHeight;
    this.renderer.setPixelRatio(
      Math.min(
        devicePixelRatio || 1,
        this.settings.world === "high" ? 2 : this.settings.world === "medium" ? 1.25 : 1,
      ),
    );
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    const width = Math.min(this.world?.w ?? 32, 32);
    const height = Math.min(this.world?.h ?? 18, 18);
    const viewH = Math.max(height + 1, width / aspect + 1),
      viewW = viewH * aspect;
    this.viewW = viewW;
    this.viewH = viewH;
    this.camera.left = -viewW / 2;
    this.camera.right = viewW / 2;
    this.camera.top = viewH / 2;
    this.camera.bottom = -viewH / 2;
    this.camera.updateProjectionMatrix();
  }
  burst(x, y, color = GEL) {
    if (this.settings.motion === false) return;
    for (let i = 0; i < 16 && this.effects.length < 96; i++) {
      const m = new THREE.Mesh(this.geos.sphere, this.mat("drop", color, 0.2));
      m.scale.setScalar(0.035 + Math.random() * 0.045);
      m.position.set(x, -y, 0.7);
      this.actorRoot.add(m);
      this.effects.push({ m, vx: (Math.random() - 0.5) * 8, vy: Math.random() * 5, life: 0.6 });
    }
  }
  render(dt, ghostState = null) {
    if (!this.world) return;
    const w = this.world;
    this.clock += dt;
    this.gel.uniforms.time.value = this.clock;
    this.gel.uniforms.low.value = this.settings.pip === "low" ? 1 : 0;
    if (w.power !== this.prevPower) {
      this.prevPower = w.power;
      this.lastGrid = "";
    }
    if (w.room.machine === "cryo" && Math.floor(w.time / 4) !== this.prevFrost) {
      this.prevFrost = Math.floor(w.time / 4);
      this.lastGrid = "";
    }
    if (w.room.machine === "furnace" && Math.floor(w.time / 3) !== this.furnacePhase) {
      this.furnacePhase = Math.floor(w.time / 3);
      this.lastGrid = "";
    }
    this.refreshGrid();
    const p = w.players[w.active] ?? w.players[0];
    const cx =
      w.w > 32 ? THREE.MathUtils.clamp(p.x, this.viewW / 2, w.w - this.viewW / 2) : w.w / 2;
    const cy =
      w.h > 18 ? -THREE.MathUtils.clamp(p.y, this.viewH / 2, w.h - this.viewH / 2) : -w.h / 2;
    const lerp = this.settings.motion === false ? 1 : Math.min(1, dt * 6);
    this.cameraX += (cx - this.cameraX) * lerp;
    this.cameraY += (cy - this.cameraY) * lerp;
    this.camera.position.set(this.cameraX, this.cameraY + 1.3, 36);
    this.camera.lookAt(this.cameraX, this.cameraY, -1);
    while (this.jamMeshes.length < w.players.length) this.jamMeshes.push(this.pip());
    this.jamMeshes.forEach((mesh, i) => {
      const p = w.players[i];
      mesh.visible = !!p && !p.dead && !p.inJar;
      if (!p) return;
      mesh.children[0].material = this.settings.pip === "high" ? this.highGel : this.gel;
      mesh.children[4].visible = this.settings.pip !== "low";
      mesh.position.set(p.x + p.w / 2, -p.y - p.h, 0.7);
      const size = p.half ? 0.66 : 1;
      const sq = this.settings.motion === false ? 0 : p.sq;
      mesh.scale.set(size * (1 + sq * 0.35), size * (1 - sq * 0.3), size);
      mesh.rotation.z = this.settings.motion === false ? 0 : -p.vx * 0.015;
      for (let k = 1; k < 3; k++) {
        mesh.children[k].position.x = (k === 1 ? -0.13 : 0.13) + p.face * 0.03;
        mesh.children[k].scale.y = Math.sin(this.clock * 1.3) > 0.989 ? 0.008 : 0.071;
      }
    });
    this.light.position.set(p.x + 0.38, -p.y + 0.4, 3);
    this.light.intensity = this.settings.pip === "low" ? 6 : 18;
    for (const { s, m } of this.seedMeshes) {
      m.visible = !s.collected;
      m.rotation.y = this.clock;
      m.position.y = -s.y - 0.5 + Math.sin(this.clock * 2) * 0.04;
    }
    if (this.pressGroup) this.clear(this.pressGroup);
    else {
      this.pressGroup = new THREE.Group();
      this.dynamic.add(this.pressGroup);
    }
    for (const k of w.presses) {
      this.box(
        this.pressGroup,
        k.x + k.w / 2,
        k.pos + 0.5,
        0.1,
        k.w,
        0.85,
        1.9,
        this.mat("press", 0x70777c, 0.4, 0.7),
      );
      this.box(
        this.pressGroup,
        k.x + k.w / 2,
        (k.top + k.pos) / 2,
        -0.1,
        0.3,
        k.pos - k.top + 0.5,
        0.35,
        this.mat("rod", 0x899194, 0.3, 0.8),
      );
      for (let i = 0; i < k.w * 2; i++)
        this.box(
          this.pressGroup,
          k.x + 0.25 + i * 0.5,
          k.pos + 0.5,
          1.09,
          0.18,
          0.35,
          0.02,
          this.mat("stripe", 0xc0a65c, 0.6),
        );
    }
    for (const c of w.cutterRects())
      this.box(
        this.pressGroup,
        c.x + c.w / 2,
        c.y + c.h / 2,
        1.1,
        c.w,
        c.h,
        0.1,
        (this.materials.cutter ??= new THREE.MeshBasicMaterial({ color: 0xe4cc8e })),
      );
    for (const l of w.lifts)
      this.box(
        this.pressGroup,
        l.x + l.w / 2,
        l.y + 0.17,
        0.1,
        l.w,
        0.34,
        1.8,
        this.mat("lift", 0x8a9399, 0.4, 0.65),
      );
    if (w.room.machine === "impact")
      this.box(
        this.pressGroup,
        w.w / 2,
        w.plateRow() + 0.5,
        0,
        w.w - 2,
        1,
        2,
        this.mat("press", 0x70777c, 0.4, 0.7),
      );
    this.ghost.visible = !!ghostState && !ghostState.dead && !ghostState.inJar;
    if (ghostState) {
      this.ghost.position.set(
        ghostState.x + (ghostState.half ? 0.25 : 0.38),
        -ghostState.y - (ghostState.half ? 0.5 : 0.76),
        1,
      );
      this.ghost.scale.setScalar(ghostState.half ? 0.66 : 1);
    }
    if (this.jar) {
      this.jar.lid.position.y = -this.jar.y + 0.88 + Math.sin(this.clock * 2) * 0.04;
      this.jar.jelly.scale.y = w.players.some((p) => p.inJar) ? 0.32 : 0.12;
    }
    if (this.atmosphere) {
      this.atmosphere.visible = this.settings.world !== "low" && this.settings.motion !== false;
      this.atmosphere.position.y = Math.sin(this.clock * 0.15) * 0.35;
    }
    if (this.weather) {
      this.weather.visible = this.settings.motion !== false;
      this.weather.position.y = -((this.clock * 2) % 3);
    }
    if (
      this.settings.motion !== false &&
      p.ground &&
      Math.abs(p.vx) > 3 &&
      this.clock - (this.lastTrail ?? 0) > 0.08
    ) {
      this.lastTrail = this.clock;
      const m = new THREE.Mesh(this.geos.sphere, this.mat("drop", GEL, 0.2));
      m.scale.set(0.035, 0.02, 0.03);
      m.position.set(p.x + p.w / 2, -p.y - p.h + 0.015, 0.8);
      this.actorRoot.add(m);
      if (this.effects.length < 96) this.effects.push({ m, vx: 0, vy: 0.3, life: 0.28 });
      else this.actorRoot.remove(m);
    }
    for (const r of this.ripples) {
      r.life -= dt;
      const size = (0.42 - r.life) * 2.2 + 0.12;
      r.m.scale.set(size, size * 0.25, 1);
      r.m.material.opacity = (r.life / 0.42) * 0.6;
      if (r.life <= 0) {
        this.actorRoot.remove(r.m);
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
      if (e.life <= 0) this.actorRoot.remove(e.m);
    }
    this.effects = this.effects.filter((e) => e.life > 0);
    this.renderer.render(this.scene, this.camera);
  }
  event(event) {
    if (this.settings.motion === false) return;
    if (["jam.land", "pad.bounce", "jam.merge"].includes(event.id) && Number.isFinite(event.x)) {
      const m = new THREE.Mesh(
        this.rippleGeo,
        new THREE.MeshBasicMaterial({
          color: 0x9cffe5,
          transparent: true,
          opacity: 0.6,
          depthWrite: false,
        }),
      );
      m.position.set(event.x + 0.38, -event.y - 0.75, 0.94);
      this.actorRoot.add(m);
      this.ripples.push({ m, life: 0.42 });
    }
    if (event.id === "seed.collect") this.burst(event.x + 0.5, event.y + 0.5, "#eed09a");
  }
  decorate(world) {
    const act = world.room.act,
      steel = this.mat("steel", 0x6b7379, 0.4, 0.65),
      dark = this.mat("duct", 0x333c45, 0.7, 0.35),
      bone = this.mat("paint", 0xc8c5ae, 0.88),
      transform = new THREE.Object3D();
    const rivets = new THREE.InstancedMesh(this.geos.sphere, steel, Math.ceil(world.w / 4) * 4);
    let index = 0;
    for (let x = 2; x < world.w; x += 4)
      for (const y of [3, 6, 9, 12]) {
        transform.position.set(x, -y, -3.75);
        transform.scale.set(0.075, 0.075, 0.06);
        transform.updateMatrix();
        rivets.setMatrixAt(index++, transform.matrix);
      }
    rivets.count = index;
    this.background.add(rivets);
    for (let x = 5; x < world.w; x += 16) {
      this.box(this.background, x, world.h - 3.5, -5, 4, 2.2, 0.2, dark);
      for (let i = 0; i < 5; i++)
        this.box(this.background, x, world.h - 4.2 + i * 0.3, -4.8, 3.5, 0.08, 0.03, steel);
      this.box(this.background, x - 2.6, world.h - 3.2, -3, 0.13, 2, 0.13, steel);
      this.box(this.background, x - 1.3, world.h - 3.2, -3, 0.13, 2, 0.13, steel);
      this.box(this.background, x - 1.9, world.h - 4.2, -3, 1.8, 0.12, 1.2, dark);
      const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.24, 12), bone);
      mug.position.set(x - 2, -world.h + 4.4, -2.7);
      this.background.add(mug);
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 5, 12), bone);
      handle.position.set(x - 1.84, -world.h + 4.4, -2.7);
      this.background.add(handle);
      const sign = this.box(this.background, x + 2.9, 5, -3.4, 0.8, 1.1, 0.04, bone);
      this.box(this.background, x + 2.9, 5.23, -3.36, 0.5, 0.06, 0.02, dark);
      this.box(this.background, x + 2.9, 4.9, -3.36, 0.07, 0.45, 0.02, dark);
      if (act === 1 || act === 2) {
        const beacon = new THREE.Mesh(
          new THREE.SphereGeometry(0.18, 12, 8),
          (this.materials.redLamp ??= new THREE.MeshBasicMaterial({ color: 0xc83b2e })),
        );
        beacon.position.set(x + 2, -2.3, -3.2);
        this.background.add(beacon);
      }
    }
    if (act >= 5 && act < 8)
      for (let x = 5; x < world.w; x += 20) {
        const beam = this.box(
          this.background,
          x,
          8,
          -5,
          2,
          13,
          0.05,
          (this.materials.shaftLight ??= new THREE.MeshBasicMaterial({
            color: 0xc2c9c6,
            transparent: true,
            opacity: 0.055,
            depthWrite: false,
          })),
        );
        beam.rotation.z = -0.14;
      }
    const count = this.settings.world === "low" ? 32 : 96,
      positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (((i * 127) % 997) / 997) * world.w;
      positions[i * 3 + 1] = (-((i * 83) % 991) / 991) * world.h;
      positions[i * 3 + 2] = -2 - (i % 7) * 0.3;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.atmosphere = new THREE.Points(
      geo,
      (this.materials.dust ??= new THREE.PointsMaterial({
        color: 0xc4c7b5,
        size: 0.035,
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
      })),
    );
    this.background.add(this.atmosphere);
    this.weather = null;
    if (act === 7) {
      const rain = new THREE.BufferGeometry(),
        vertices = [];
      for (let i = 0; i < 100; i++) {
        const x = (((i * 79) % 997) / 997) * world.w,
          y = (-((i * 157) % 991) / 991) * world.h;
        vertices.push(x, y, -2, x - 0.09, y - 0.55, -2);
      }
      rain.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
      this.weather = new THREE.LineSegments(
        rain,
        (this.materials.rain ??= new THREE.LineBasicMaterial({
          color: 0xc0cbd6,
          transparent: true,
          opacity: 0.21,
          depthWrite: false,
        })),
      );
      this.background.add(this.weather);
    }
    const batches = new Map();
    for (const m of [...this.background.children])
      if (m.isMesh && !m.isInstancedMesh && m.geometry === this.geos.box) {
        m.updateMatrix();
        const list = batches.get(m.material) ?? [];
        list.push(m);
        batches.set(m.material, list);
      }
    for (const [mat, meshes] of batches) {
      const inst = new THREE.InstancedMesh(this.geos.box, mat, meshes.length);
      inst.receiveShadow = true;
      meshes.forEach((m, i) => {
        inst.setMatrixAt(i, m.matrix);
        this.background.remove(m);
      });
      this.background.add(inst);
    }
  }

  dispose() {
    this.renderer.dispose();
  }
}
