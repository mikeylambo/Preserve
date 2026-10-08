import { readFile } from "node:fs/promises";
import { verifyReplay, bitsInput } from "../src/replays.js";
import { DeathMaterials } from "../src/simulation.js";
import { ROOM_BY_ID } from "../src/rooms.js";
const tapes = JSON.parse(await readFile("tests/solutions.json"));
for (const [id, res] of Object.entries(tapes)) {
  if (!res.tape) continue;
  const w = new DeathMaterials(ROOM_BY_ID[id]);
  let next = 0;
  console.log("\n" + id);
  for (const [b, n] of res.tape.inputs)
    for (let i = 0; i < n; i++) {
      w.step(bitsInput(b));
      for (const e of w.drain())
        if (e.id.startsWith("jam.die") || e.id === "room.clear") console.log(e, w.players[0]);
      if (w.time > next) {
        console.log(
          w.time.toFixed(1),
          w.players[0].x.toFixed(1),
          w.players[0].y.toFixed(1),
          w.materials.map((m) => m.cells),
        );
        next += 1;
      }
    }
}
