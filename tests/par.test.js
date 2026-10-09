import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { ROOMS } from "../src/rooms.js";
import { verifyReplay } from "../src/replays.js";

// Every room ships with a bot-proven clear at exactly par (tools/prove.mjs writes these).
for (const room of ROOMS)
  test(`clears at exactly par: ${room.id}`, () => {
    const file = new URL(`./par/${room.id}.json`, import.meta.url);
    assert.ok(existsSync(file), "no par tape; run node tools/prove.mjs " + room.id);
    const tape = JSON.parse(readFileSync(file, "utf8"));
    const v = verifyReplay(tape);
    assert.equal(v.deaths, room.par);
  });

test("the par ghost ships every room's proven tape", async () => {
  const { GUIDES } = await import("../src/guides.js");
  for (const room of ROOMS) {
    const file = new URL(`./par/${room.id}.json`, import.meta.url);
    if (existsSync(file))
      assert.deepEqual(GUIDES[room.id], JSON.parse(readFileSync(file, "utf8")), room.id);
  }
});
