import { readFile, writeFile, readdir } from "node:fs/promises";
import { verifyReplay } from "../src/replays.js";
import { runPlan } from "./plan-runner.js";
import { plans } from "./prototype-plans.js";
import { MAIN_ROOMS, ROOM_BY_ID } from "../src/rooms.js";
plans[2].splice(plans[2].length - 1, 0, [{ r: 1 }, "pl.x>13.8", 2], [{ r: 1, j: 1 }, "WON", 4, 1]);
plans[2].pop();
plans[5].splice(7, 1, [{ r: 1 }, "pl.x>12.8", 2], [{}, "pl.dead>0", 5]);
const refs = ["room.1.01", "room.2.02", "room.2.04", "room.3.01", "room.4.01", "room.3.06"];
const guides = {};
for (let i = 0; i < refs.length; i++) {
  const r = runPlan(refs[i], plans[i]);
  const t = {
    version: "0.1.0",
    roomId: refs[i],
    deaths: r.world.deaths,
    ticks: r.world.tick,
    inputs: r.runs,
  };
  verifyReplay(t);
  guides[refs[i]] = t;
}
for (const file of await readdir("tests/solutions")) {
  const { tape } = JSON.parse(await readFile("tests/solutions/" + file, "utf8"));
  if (!tape) continue;
  try {
    verifyReplay(tape);
    guides[tape.roomId] = tape;
  } catch {}
}
let old = {};
try {
  old = JSON.parse(await readFile("tests/solutions.json"));
} catch {}
for (const { id, tape } of Object.values(old)) {
  if (!tape || guides[tape.roomId]) continue;
  try {
    verifyReplay(tape);
    guides[tape.roomId] = tape;
  } catch {}
}
await writeFile("src/guides.js", "export const GUIDES=" + JSON.stringify(guides) + ";\n");
console.log("Verified guides", Object.keys(guides).length);
console.log(
  "First 16 missing",
  MAIN_ROOMS.slice(0, 16)
    .filter((r) => !guides[r.id])
    .map((r) => r.id),
);
await writeFile("tests/verified-solutions.json", JSON.stringify(guides, null, 2));
