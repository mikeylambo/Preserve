import { parentPort, workerData } from "node:worker_threads";
import { verifyReplay, verifyRun } from "./src/replays.js";
try {
  if (workerData.tape?.assisted || workerData.run?.tapes?.some((t) => t.assisted))
    throw Error("Guided scores use separate local boards.");
  const result = workerData.run
    ? verifyRun({ kind: "run", ...workerData.run })
    : verifyReplay(workerData.tape);
  parentPort.postMessage({ ok: true, deaths: result.deaths, timeMs: result.timeMs });
} catch (e) {
  parentPort.postMessage({ ok: false, error: e.message });
}
