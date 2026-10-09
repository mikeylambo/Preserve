import test from "node:test";
import assert from "node:assert/strict";
import { DeathMaterials } from "../src/simulation.js";
import { ROOMS, MAIN_ROOMS, ROOM_BY_ID } from "../src/rooms.js";
import { golfName, VERSION } from "../src/tuning.js";
import { verifyReplay } from "../src/replays.js";

// First cell holding `c` in a room, scanning rows top to bottom.
const find = (room, c, from = 0) => {
  for (let y = 0; y < room.rows.length; y++) {
    const x = room.rows[y].indexOf(c, from);
    if (x >= 0) return [x, y];
  }
  throw Error(`${room.id} has no ${c}`);
};

test("101 unique valid rooms, 94 main, seven anomalies", () => {
  assert.equal(ROOMS.length, 101);
  assert.equal(MAIN_ROOMS.length, 94);
  assert.equal(new Set(ROOMS.map((r) => r.id)).size, 101);
  assert.equal(ROOMS.filter((r) => r.anomaly).length, 7);
  for (const r of ROOMS) {
    assert.ok(
      r.rows.every((row) => row.length === r.rows[0].length),
      r.id,
    );
    assert.equal(r.rows.join("").split("S").length - 1, 1, r.id + " spawn");
    assert.equal(r.rows.join("").split("E").length - 1, 1, r.id + " exit");
    new DeathMaterials(r);
  }
});
test("golf names treat a zero-death clear as an Ace", () => {
  assert.equal(golfName(0, 4), "Ace");
  assert.equal(golfName(0, 0), "Par");
  assert.equal(golfName(2, 3), "Birdie");
});
test("coat spread respects a contiguous hazard run and halves use one tile", () => {
  const room = ROOM_BY_ID["room.1.01"];
  const [x, y] = find(room, "^^^");
  const w = new DeathMaterials(room);
  w.die(w.players[0], "^", x + 1, y);
  assert.equal(w.materials[0].cells.length, 3);
  assert.equal(w.deaths, 1);
  const q = new DeathMaterials(room);
  q.players[0].half = true;
  q.die(q.players[0], "^", x + 1, y);
  assert.equal(q.materials[0].cells.length, 1);
});
test("retry reloading restores hazards and whole body", () => {
  const r = ROOM_BY_ID["room.1.01"],
    [x, y] = find(r, "^"),
    w = new DeathMaterials(r);
  w.die(w.players[0], "^", x, y);
  const again = new DeathMaterials(r);
  assert.equal(again.deaths, 0);
  assert.equal(again.materials.length, 0);
  assert.equal(again.cell(x, y), "^");
});
test("seed semantic event keeps the seed identifier separate", () => {
  const w = new DeathMaterials(ROOM_BY_ID["room.4.06"]);
  const s = w.seeds[0];
  w.players[0].x = s.x;
  w.players[0].y = s.y;
  w.step({ right: true });
  const e = w.drain().find((e) => e.id === "seed.collect");
  assert.equal(e.seedId, s.id);
});
test("strands power doors then short next to water after one second", () => {
  const room = ROOM_BY_ID["room.6.04"],
    [x, y] = find(room, "w"),
    w = new DeathMaterials(room);
  w.die(w.players[0], "w", x, y);
  w.step();
  assert.equal(w.power, 1);
  for (let i = 0; i < 250; i++) w.step();
  assert.equal(w.power, 0);
  assert.equal(w.cell(x, y), "w");
});
test("ice freezes the water beside it, so a strand there stays dry", () => {
  const room = ROOM_BY_ID["room.7.07"],
    [fx, fy] = find(room, "*"),
    w = new DeathMaterials(room);
  w.die(w.players[0], "frost", fx, fy);
  assert.equal(w.cell(fx + 1, fy + 1), "s");
});
test("a cut knocks the halves apart; one dead half leaves the other alive", () => {
  const w = new DeathMaterials(ROOM_BY_ID["room.5.02"]);
  w.players[0].vx = 6;
  w.split(w.players[0], 7.5, 9);
  const [a, b] = w.players;
  assert.ok(a.vx < 0 && b.vx > 0);
  w.die(a, "^", 14, 11);
  assert.equal(w.respawnTimer, 0);
  assert.equal(b.dead, false);
  w.die(b, "void");
  for (let i = 0; i < 140; i++) w.step();
  assert.equal(w.players.length, 1);
  assert.equal(w.players[0].half, false);
  assert.equal(w.deaths, 2);
});
test("crust remains while Pip stands on it and crumbles once he steps off", () => {
  const room = ROOM_BY_ID["room.2.01"],
    [x, y] = find(room, "f"),
    w = new DeathMaterials(room);
  const m = w.form("b", [[x, y]]);
  const p = w.players[0];
  p.x = x;
  p.y = y - p.h;
  p.ground = true;
  w.updateMaterials(0.01);
  assert.ok(m.touched);
  w.updateMaterials(0.01);
  assert.ok(w.materials.includes(m));
  p.x = x + 5;
  w.updateMaterials(0.01);
  assert.ok(!w.materials.includes(m));
  assert.equal(w.cell(x, y), "f");
});
test("fixed-step simulation reproduces the same input tape", () => {
  const a = new DeathMaterials(ROOM_BY_ID["room.1.01"]),
    b = new DeathMaterials(ROOM_BY_ID["room.1.01"]);
  for (let i = 0; i < 1500; i++) {
    const inp = { right: i < 1300, jump: i > 120 && i < 260, jumpPressed: i === 120 };
    a.step(inp);
    b.step(inp);
  }
  assert.deepEqual(a.state(), b.state());
  assert.deepEqual(a.grid, b.grid);
});
test("forged leaderboard submissions are rejected", () => {
  assert.throws(
    () =>
      verifyReplay({
        version: VERSION,
        roomId: "room.0.01",
        deaths: 0,
        ticks: 1,
        inputs: [[0, 1]],
      }),
    /does not reproduce/,
  );
});
