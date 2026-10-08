import { TUNE as T } from "./tuning.js";
const MATERIAL = { "^": "c", f: "b", v: "j", w: "t" },
  SPREAD = { "^": 3, f: 4, v: 4, w: 4 };
const BACK = { c: "^", b: "f", j: "v", t: "w", i: "*", x: "." };
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export class DeathMaterials {
  constructor(room) {
    this.room = room;
    this.w = room.rows[0].length;
    this.h = room.rows.length;
    this.grid = room.rows.map((r) => [...r]);
    this.original = room.rows.map((r) => [...r]);
    this.materials = [];
    this.presses = [];
    this.lifts = [];
    this.seeds = [];
    this.events = [];
    this.time = 0;
    this.deaths = 0;
    this.tick = 0;
    this.nextId = 1;
    this.active = 0;
    this.respawnTimer = 0;
    this.won = false;
    this.power = 0;
    this.deathMarks = [];
    this.frostMask = new Set();
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const c = this.grid[y][x];
        if (c === "S") {
          this.spawn = { x, y };
          this.grid[y][x] = ".";
        }
        if (c === "E") {
          this.exit = { x, y };
          this.grid[y][x] = ".";
        }
        if (c === "o") {
          this.seeds.push({ x, y, id: `${room.id}:${x},${y}`, collected: false });
          this.grid[y][x] = ".";
        }
        if (c === "L") {
          this.lifts.push({
            x,
            y,
            base: y,
            top: room.machine === "breaker" ? y - 16 : (room.liftTop ?? y - 6),
            required: room.machine === "breaker" ? this.lifts.length + 1 : 1,
            w: 3,
            h: 0.35,
          });
          this.grid[y][x] = ".";
        }
        if (c === "K") {
          let end = x;
          while (this.grid[y][end + 1] === "K") end++;
          for (let k = x; k <= end; k++) this.grid[y][k] = ".";
          let floor = y + 1;
          while (floor < this.h && !this.baseSolid(this.cell(x, floor))) floor++;
          this.presses.push({
            x,
            w: end - x + 1,
            y,
            top: y,
            initialTop: y,
            floor,
            pos: y,
            phase: 0,
            t: 0.6 + this.presses.length * 0.7,
            jammed: false,
          });
        }
      }
    if (!this.spawn || !this.exit) throw Error(`Missing entry/exit: ${room.id}`);
    if (room.machine === "separator") {
      for (let y = 0; y < this.h; y++)
        for (let x = 0; x < this.w; x++) if (this.grid[y][x] === "|") this.grid[y][x] = ".";
    }
    this.respawn();
  }
  emit(id, data = {}) {
    this.events.push({ ...data, id });
  }
  drain() {
    const e = this.events;
    this.events = [];
    return e;
  }
  cell(x, y) {
    if (x < 0 || x >= this.w || y < 0) return "#";
    if (y >= this.h) return ".";
    return this.grid[y][x];
  }
  baseSolid(c) {
    return "#cbpjixs<>".includes(c);
  }
  powered() {
    return this.materials.filter((m) => m.type === "t" && m.connected !== false).length;
  }
  rect(x, y, half = false) {
    const c = this.cell(x, y);
    if (c === "f" && this.room.machine === "furnace" && Math.floor(this.time / 3) % 2 === 1)
      return { x, y, w: 1, h: 1, c: "#" };
    if (this.baseSolid(c))
      return {
        x,
        y: y + (c === "x" && this.materialAt(x, y)?.half ? 0.5 : 0),
        w: 1,
        h: c === "x" && this.materialAt(x, y)?.half ? 0.5 : 1,
        c,
      };
    if (c === "h") return { x, y, w: 1, h: 0.45, c };
    if (c === "D" && this.power < (this.room.circuitDoors?.[`${x},${y}`] ?? 1))
      return { x, y, w: 1, h: 1, c };
    if (c === "t" && half) return { x, y: y + 0.8, w: 1, h: 0.2, c };
    return null;
  }
  hit(x, y, w, h, half = false) {
    const a = { x, y, w, h };
    for (let cy = Math.floor(y); cy <= Math.floor(y + h - 1e-6); cy++)
      for (let cx = Math.floor(x); cx <= Math.floor(x + w - 1e-6); cx++) {
        const r = this.rect(cx, cy, half);
        if (r && overlap(a, r)) return { cx, cy, ...r };
      }
    for (const k of this.presses)
      if (k.jammed) {
        const r = { x: k.x, y: k.top, w: k.w, h: 1, c: "K" };
        if (overlap(a, r)) return { cx: k.x, cy: k.top, ...r };
      }
    for (const r of this.lifts) if (overlap(a, r)) return { cx: r.x, cy: r.y, ...r, c: "L" };
    if (this.room.machine === "impact") {
      const y = Math.min(12, Math.floor(this.time / 8));
      if (a.y < y + 1) return { cx: Math.floor(x), cy: y, x: Math.floor(x), y, w: 1, h: 1, c: "#" };
    }
    return null;
  }
  materialAt(x, y) {
    return this.materials.find((m) => m.cells.some((c) => c[0] === x && c[1] === y));
  }
  near(x, y, chars) {
    return [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ].some(([a, b]) => chars.includes(this.cell(a, b)));
  }
  spread(x, y, ch, cap) {
    let l = x,
      r = x;
    while (l > 0 && this.cell(l - 1, y) === ch) l--;
    while (r + 1 < this.w && this.cell(r + 1, y) === ch) r++;
    const a = Math.max(l, Math.min(x - Math.floor((cap - 1) / 2), r - cap + 1));
    const out = [];
    for (let i = a; i <= Math.min(r, a + cap - 1); i++)
      if (i !== this.spawn.x || y !== this.spawn.y) out.push([i, y]);
    return out;
  }
  form(type, cells, half = false) {
    if (!cells.length) return null;
    const m = {
      id: this.nextId++,
      type,
      cells,
      half,
      born: this.time,
      timer: 0,
      touched: false,
      bonded: false,
    };
    for (const [x, y] of cells) {
      this.grid[y][x] = type;
      if (type === "b" && this.near(x, y, "c")) m.bonded = true;
      if (type === "c" && this.near(x, y, "fb")) m.hardened = true;
    }
    this.materials.push(m);
    this.emit(`material.form.${type}`, { cells });
    return m;
  }
  remove(m) {
    for (const [x, y] of m.cells)
      if (this.cell(x, y) === m.type) this.grid[y][x] = BACK[m.type] ?? ".";
    this.materials = this.materials.filter((q) => q !== m);
    this.emit("material.break", { type: m.type, cells: m.cells });
  }
  respawn() {
    this.players = [this.body(this.spawn.x + (1 - T.size) / 2, this.spawn.y + 1 - T.size, false)];
    this.active = 0;
    this.respawnTimer = 0;
    this.emit("jam.respawn");
  }
  body(x, y, half) {
    return {
      x,
      y,
      w: half ? T.halfSize : T.size,
      h: half ? T.halfSize : T.size,
      vx: 0,
      vy: 0,
      ground: false,
      coyote: 0,
      buf: 0,
      face: 1,
      dead: false,
      frost: 0,
      sq: 0,
      cut: false,
      padded: false,
      half,
      apex: y,
      cutterGrace: 0,
      inJar: false,
    };
  }
  die(p, kind, x, y, k = null) {
    if (p.dead || p.inJar) return;
    this.deaths++;
    this.deathMarks.push({ x: p.x + p.w / 2, y: p.y + p.h / 2, kind, tick: this.tick });
    this.emit(`jam.die.${kind}`, { x: p.x + p.w / 2, y: p.y + p.h / 2 });
    if (MATERIAL[kind]) {
      let cells = this.spread(x, y, kind, p.half ? (kind === "^" ? 1 : 2) : SPREAD[kind]);
      if (kind === "v" && this.cell(x, y + 1) === "v") {
        let bottom = y;
        while (this.cell(x, bottom + 1) === "v") bottom++;
        cells = this.spread(x, bottom, "v", p.half ? 2 : 4);
      }
      this.form(MATERIAL[kind], cells, p.half);
    } else if (kind === "press" && k) {
      k.jammed = true;
      k.top = this.room.machine === "press" ? k.initialTop : k.top;
      const cells = [];
      for (let i = k.x; i < k.x + k.w; i++)
        if (this.baseSolid(this.cell(i, k.floor))) cells.push([i, k.floor]);
      this.form("p", cells);
    } else if (kind === "frost") {
      let cx = x,
        cy = y;
      if (
        this.players.some((q) => q !== p && !q.dead && overlap(q, { x: cx, y: cy, w: 1, h: 1 }))
      ) {
        const candidate = [
          [x - 1, y],
          [x + 1, y],
          [x, y - 1],
        ].find(
          ([a, b]) =>
            this.cell(a, b) === "*" &&
            !this.players.some((q) => q !== p && !q.dead && overlap(q, { x: a, y: b, w: 1, h: 1 })),
        );
        if (candidate) [cx, cy] = candidate;
        else cy = -1;
      }
      if (cy >= 0) {
        const pad = this.cell(cx, cy + 1) === "p";
        this.form("i", [[cx, cy]], p.half);
        if (pad) {
          const m = this.materialAt(cx, cy);
          let ny = cy;
          this.grid[cy][cx] = ".";
          while (ny > 1 && !this.rect(cx, ny - 1)) {
            ny--;
          }
          m.cells = [[cx, ny]];
          this.grid[ny][cx] = "i";
          this.emit("ice.launch", { x: cx, y: ny });
        }
      }
    } else if (kind === "fall") {
      const cy = Math.max(0, Math.floor(p.y + p.h - 0.001));
      this.form("x", [[Math.floor(p.x + p.w / 2), cy]], p.half);
    }
    p.dead = true;
    p.vx = p.vy = 0;
    for (const q of this.players)
      if (q !== p && !q.dead) {
        const h = this.hit(q.x, q.y, q.w, q.h, q.half);
        if (h) q.y = h.y - q.h;
      }
    if (this.players.every((q) => q.dead)) {
      this.respawnTimer = T.respawn;
    }
  }
  split(p, x, y) {
    p.dead = true;
    const a = this.body(x - 0.55, p.y + 0.26, true),
      b = this.body(x + 0.55, p.y + 0.26, true);
    a.face = -1;
    b.face = 1;
    a.cutterGrace = b.cutterGrace = 0.4;
    a.apex = b.apex = p.apex;
    a.vx = p.vx;
    b.vx = p.vx;
    this.players = [a, b];
    this.active = 1;
    this.emit("jam.split", { x, y });
  }
  step(input = {}, dt = T.step) {
    if (this.won) return;
    this.time += dt;
    this.tick++;
    this.power = this.powered();
    if (input.swap) {
      const alive = this.players.map((p, i) => (!p.dead ? i : null)).filter((i) => i !== null);
      if (alive.length > 1) {
        this.active = alive.find((i) => i !== this.active);
        this.emit("jam.swap");
      }
    }
    this.updateMachines(dt);
    if (this.respawnTimer > 0) {
      this.updateMaterials(dt);
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) this.respawn();
      return;
    }
    if (this.players[this.active]?.dead) this.active = this.players.findIndex((p) => !p.dead);
    const snapshot = [...this.players];
    for (const p of snapshot) {
      if (p.dead || p.inJar) continue;
      this.move(p, p === this.players[this.active] ? input : {}, dt);
      if (this.players !== snapshot && this.players.some((q) => !snapshot.includes(q))) break;
    }
    this.updateMaterials(dt);
    const alive = this.players.filter((p) => !p.dead);
    if (
      alive.length === 2 &&
      alive.every((p) => p.half && p.cutterGrace <= 0) &&
      !alive.some((p) => p.inJar) &&
      overlap(alive[0], alive[1])
    ) {
      const p = alive[this.active === 1 ? 1 : 0];
      const whole = this.body(p.x, p.y + p.h - T.size, false);
      if (!this.hit(whole.x, whole.y, whole.w, whole.h)) {
        whole.vx = p.vx;
        whole.vy = p.vy;
        whole.apex = p.apex;
        this.players = [whole];
        this.active = 0;
        this.emit("jam.merge");
      }
    }
    if (alive.length && alive.every((p) => p.inJar)) {
      this.won = true;
      this.emit("room.clear", { deaths: this.deaths, timeMs: Math.round(this.time * 1000) });
    }
  }
  updateMachines(dt) {
    for (const k of this.presses) {
      const ice = this.materials.find(
        (m) =>
          m.type === "i" &&
          m.cells.some(([x, y]) => x >= k.x && x < k.x + k.w && y >= k.pos && y <= k.pos + 1.15),
      );
      if (ice) {
        k.jammed = true;
        k.top = Math.max(k.top, k.pos - 1);
        this.emit("press.jam");
      }
      if (k.jammed) {
        k.pos = Math.max(k.top, k.pos - 6 * dt);
        continue;
      }
      if (this.room.poweredPress && !this.power) continue;
      if (this.room.machine === "press")
        k.top = Math.min(k.floor - 3, 1 + Math.floor(this.time / 6));
      k.t -= dt;
      if (k.phase === 0 && k.t <= 0) k.phase = 1;
      else if (k.phase === 1) {
        k.pos += 30 * dt;
        if (k.pos >= k.floor - 1) {
          k.pos = k.floor - 1;
          k.phase = 2;
          k.t = 0.35;
          this.emit("press.slam", { x: k.x, y: k.pos });
        }
      } else if (k.phase === 2 && k.t <= 0) k.phase = 3;
      else if (k.phase === 3) {
        k.pos -=
          (this.room.machine === "mill"
            ? (k.floor - k.top - 1) / Math.max(0.2, 2.5 - 1 - 0.35 - (k.floor - k.top - 1) / 30)
            : 3.2) * dt;
        if (k.pos <= k.top) {
          k.pos = k.top;
          k.phase = 0;
          k.t = 1;
        }
      }
    }
    for (const l of this.lifts) {
      const before = l.y;
      if (this.power >= l.required) {
        const travel = (l.base - l.top) / 1.8,
          phase = this.time % (travel * 2 + 2.4);
        l.y =
          phase < 1.2
            ? l.base
            : phase < 1.2 + travel
              ? l.base - (phase - 1.2) * 1.8
              : phase < 2.4 + travel
                ? l.top
                : l.top + (phase - 2.4 - travel) * 1.8;
      } else l.y = Math.min(l.base, l.y + 1.8 * dt);
      for (const p of this.players)
        if (
          p.ground &&
          !p.dead &&
          Math.abs(p.y + p.h - before) < 0.04 &&
          p.x + p.w > l.x &&
          p.x < l.x + l.w
        )
          p.y += l.y - before;
    }
    if (this.room.machine === "cryo") {
      const edge = Math.floor(this.time / 4);
      for (let x = 0; x <= Math.min(edge, this.w - 1); x++)
        for (let y = 0; y < this.h; y++)
          if (this.cell(x, y) === ".") this.frostMask.add(`${x},${y}`);
    }
  }
  updateMaterials(dt) {
    for (const m of [...this.materials]) {
      if (m.type === "b") {
        if (!m.bonded) m.bonded = m.cells.some(([x, y]) => this.near(x, y, "c"));
        const stand = this.players.some(
          (p) =>
            !p.dead &&
            !p.inJar &&
            p.ground &&
            m.cells.some(
              ([x, y]) => Math.abs(p.y + p.h - y) < 0.04 && p.x < x + 1 && p.x + p.w > x,
            ),
        );
        if (stand) m.touched = true;
        if (m.touched && !stand && !m.bonded) this.remove(m);
        else if (this.room.machine === "furnace" && Math.floor(this.time / 3) % 2 === 0 && !stand) {
          m.timer += dt;
          if (m.timer >= 1) this.remove(m);
        } else m.timer = 0;
      }
      if (m.type === "i") {
        if (m.cells.some(([x, y]) => this.near(x, y, "fb"))) m.timer += dt;
        else m.timer = 0;
        if (m.timer >= T.iceMelt) {
          const [x, y] = m.cells[0];
          this.remove(m);
          this.grid[y][x] = ".";
          if (this.cell(x, y + 1) === "v") this.form("j", [[x, y + 1]], m.half);
        }
      }
      if (
        m.type === "j" &&
        m.cells.some(([x, y]) => this.near(x, y, "*") || this.frostMask.has(`${x},${y}`))
      ) {
        for (const [x, y] of m.cells) this.grid[y][x] = "s";
        m.type = "s";
      }
      if (m.type === "t") {
        if (m.cells.some(([x, y]) => this.near(x, y, "~"))) {
          m.timer += dt;
          if (m.timer >= T.short) this.remove(m);
        }
      }
    }
  }
  move(p, input, dt) {
    const active = p === this.players[this.active];
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (dir) p.face = dir;
    const below = this.cell(Math.floor(p.x + p.w / 2), Math.floor(p.y + p.h + 0.02));
    const target = dir * (p.half ? T.halfRun : T.run),
      acc = p.ground ? (dir ? T.acceleration : below === "s" ? 8 : T.friction) : T.air;
    if (p.vx < target) p.vx = Math.min(target, p.vx + acc * dt);
    else if (p.vx > target) p.vx = Math.max(target, p.vx - acc * dt);
    if (p.ground && "< >".includes(below) && below !== " ")
      p.vx += (below === ">" ? 1 : -1) * 2 * dt;
    if (this.room.wind) {
      const targetWind =
        this.time % 3 < 1.5 ? (p.half ? 3.5 : 2.5) * (this.room.windDirection ?? 1) : 0;
      p.windV ??= 0;
      p.windV +=
        Math.sign(targetWind - p.windV) *
        Math.min(Math.abs(targetWind - p.windV), (p.half ? 30 : 20) * dt);
    }
    p.coyote = p.ground ? T.coyote : p.coyote - dt;
    if (input.jumpPressed) p.buf = T.buffer;
    p.buf -= dt;
    if (p.buf > 0 && p.coyote > 0) {
      p.vy = -(p.half ? T.halfJump : T.jump);
      p.buf = p.coyote = 0;
      p.cut = false;
      p.ground = false;
      p.sq = -0.6;
      this.emit("jam.jump", { x: p.x, y: p.y });
    }
    if (active && !input.jump && p.vy < -4 && !p.cut && !p.padded) {
      p.vy *= T.jumpCut;
      p.cut = true;
    }
    const water = this.cell(Math.floor(p.x + p.w / 2), Math.floor(p.y + p.h / 2)) === "~";
    p.vy = Math.min(water ? 2.5 : T.terminal, p.vy + T.gravity * (water ? 0.25 : 1) * dt);
    if (this.room.fan && this.power && p.x >= this.room.fan.x && p.x < this.room.fan.x + 3)
      p.vy -= 50 * dt;
    p.x += (p.vx + (p.windV ?? 0)) * dt;
    let hit = this.hit(p.x, p.y, p.w, p.h, p.half);
    if (hit) {
      p.x = p.vx + (p.windV ?? 0) > 0 ? hit.x - p.w : hit.x + hit.w;
      p.vx = 0;
    }
    const wasGround = p.ground;
    const fall = p.y - p.apex;
    p.ground = false;
    p.y += p.vy * dt;
    hit = this.hit(p.x, p.y, p.w, p.h, p.half);
    let fallHit = false;
    if (hit) {
      if (p.vy > 0) {
        p.y = hit.y - p.h;
        if (
          hit.c === "p" ||
          this.cell(Math.floor(p.x + p.w / 2), Math.floor(p.y + p.h + 0.01)) === "p"
        ) {
          if (this.cell(Math.floor(p.x + p.w / 2), Math.floor(p.y + p.h / 2)) === "*") {
            p.vy = 0;
            p.ground = true;
            p.padded = false;
            p.apex = p.y;
          } else {
            p.vy = -T.pad;
            p.padded = true;
            p.sq = -0.8;
            p.apex = p.y;
            this.emit("pad.bounce", { x: p.x, y: p.y });
          }
        } else {
          fallHit = !wasGround && fall >= T.fall && this.room.act !== 8;
          if (!wasGround && p.vy > 6) {
            p.sq = 0.7;
            this.emit("jam.land", { x: p.x, y: p.y });
          }
          p.vy = 0;
          p.ground = true;
          p.padded = false;
          p.apex = p.y;
        }
      } else {
        p.y = hit.y + hit.h;
        p.vy = 0;
      }
    } else if (p.vy >= 0 && this.hit(p.x, p.y + p.h, p.w, 0.02, p.half)) p.ground = true;
    if (p.vy < 0 || water) p.apex = p.y;
    if (p.vy > 0) p.padded = false;
    p.sq += (0 - p.sq) * Math.min(1, dt * 12);
    p.cutterGrace -= dt;
    const box = { x: p.x + 0.1, y: p.y + 0.1, w: p.w - 0.2, h: p.h - 0.12 };
    for (const s of this.seeds)
      if (!s.collected && overlap(p, { x: s.x + 0.2, y: s.y + 0.2, w: 0.6, h: 0.6 })) {
        s.collected = true;
        this.emit("seed.collect", { seedId: s.id, x: s.x, y: s.y });
      }
    const press = this.presses.find(
      (k) => !k.jammed && overlap(box, { x: k.x, y: k.pos, w: k.w, h: 1 }),
    );
    if (press) return this.die(p, "press", 0, 0, press);
    const movingCutter = this.cutterRects().find((r) => p.cutterGrace <= 0 && overlap(box, r));
    if (movingCutter) {
      if (!p.half) return this.split(p, movingCutter.x + movingCutter.w / 2, movingCutter.y);
      return this.die(p, "cutter");
    }
    let hazard = null;
    const ranks = { "|": 0, w: 1, f: 2, "^": 3, v: 4 };
    for (let y = Math.floor(box.y); y <= Math.floor(box.y + box.h); y++)
      for (let x = Math.floor(box.x); x <= Math.floor(box.x + box.w); x++) {
        let c = this.cell(x, y);
        if (c === "f" && this.room.machine === "furnace" && Math.floor(this.time / 3) % 2 === 1)
          continue;
        if (c === "|" && (p.cutterGrace > 0 || !overlap(box, { x: x + 0.47, y, w: 0.06, h: 1 })))
          continue;
        if (
          ranks[c] !== undefined &&
          (!hazard ||
            ranks[c] < ranks[hazard.c] ||
            (ranks[c] === ranks[hazard.c] && Math.abs(x + 0.5 - (p.x + p.w / 2)) < hazard.d))
        )
          hazard = { x, y, c, d: Math.abs(x + 0.5 - (p.x + p.w / 2)) };
      }
    if (hazard) {
      if (hazard.c === "|" && !p.half) return this.split(p, hazard.x + 0.5, hazard.y);
      return this.die(p, hazard.c === "|" ? "cutter" : hazard.c, hazard.x, hazard.y);
    }
    if (fallHit) return this.die(p, "fall");
    if (p.y > this.h + 1) return this.die(p, "void");
    const cx = Math.floor(p.x + p.w / 2),
      cy = Math.floor(p.y + p.h / 2);
    let frost = this.cell(cx, cy) === "*" || this.frostMask.has(`${cx},${cy}`);
    if (this.room.sun && cx < this.time / 4) frost = false;
    if (frost && Math.hypot(p.vx, p.vy) < 2.5) p.frost += dt;
    else p.frost = Math.max(0, p.frost - dt);
    if (p.frost > T.frost) return this.die(p, "frost", cx, Math.floor(p.y + p.h - 0.05));
    if (overlap(p, { x: this.exit.x + 0.15, y: this.exit.y + 0.1, w: 0.7, h: 0.9 })) {
      p.inJar = true;
      p.vx = p.vy = 0;
      this.emit("jar.enter");
    }
  }
  cutterRects() {
    if (this.room.machine !== "separator") return [];
    const horizontal = Math.floor(this.time / 5) % 2 === 1;
    return [22, 50, 78].map((x) =>
      horizontal ? { x: x - 2, y: 14, w: 4, h: 0.08 } : { x, y: 12, w: 0.08, h: 4 },
    );
  }
  state() {
    return {
      tick: this.tick,
      deaths: this.deaths,
      players: this.players.map((p) => ({
        x: p.x,
        y: p.y,
        half: p.half,
        dead: p.dead,
        inJar: p.inJar,
        face: p.face,
      })),
      active: this.active,
    };
  }
}
