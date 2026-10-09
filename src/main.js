import { SLUWebShell } from "../vendor/shell/Shell.js";
import { ThreeAdapter } from "../vendor/shell/adapters/three/ThreeAdapter.js";
import { SaveManager } from "../vendor/shell/persistence/SaveManager.js";
import { BrowserStorage } from "../vendor/shell/platform/browser/BrowserStorage.js";
import { ReplayStore, GhostPlayback } from "../vendor/shell/modules/replay/ReplayManager.js";
import { ResultsManager } from "../vendor/shell/modules/results/ResultsManager.js";
import { GUIDES } from "./guides.js";
import { ROOMS, MAIN_ROOMS, ROOM_BY_ID, ACTS } from "./rooms.js";
import { TUNE, VERSION, golfName } from "./tuning.js";
import { DeathMaterials } from "./simulation.js";
import { PreserveRenderer } from "./renderer.js";
import { AudioLayer } from "./audio.js";
import { Cinematics } from "./cinematics.js";
import {
  inputBits,
  appendInput,
  verifyReplay,
  verifyRun,
  encodeReplay,
  decodeReplay,
} from "./replays.js";
const $ = (s) => document.querySelector(s),
  screen = $("#screen"),
  canvas = $("#game");
const defaults = {
  pip: "medium",
  world: "medium",
  motion: true,
  flash: false,
  outlines: false,
  ghost: false,
  guide: false,
  leftHanded: false,
  touchScale: 1,
  sfx: 0.7,
  music: 0.3,
  ambience: 0.35,
  ui: 0.6,
  assisted: false,
};
let storage;
try {
  storage = new BrowserStorage("preserve");
  await storage.get("save");
} catch {
  const mem = new Map();
  storage = {
    get: async (k) => mem.get(k) ?? null,
    set: async (k, v) => mem.set(k, v),
    remove: async (k) => mem.delete(k),
  };
}
const saveManager = new SaveManager(storage, "save", 1),
  replayStore = new ReplayStore(storage, "ghost");
let loaded,
  readOnly = false;
try {
  loaded = await saveManager.load();
} catch (e) {
  readOnly = true;
}
const save = {
  version: 1,
  settings: { ...defaults },
  progress: { reachedRoom: 0, seeds: {}, gameFinished: false, openingSeen: false },
  rooms: {},
  parRuns: {},
  stats: { totalDeaths: 0, deathsByHazard: {}, playTimeMs: 0 },
  ...loaded,
};
save.settings = { ...defaults, ...loaded?.settings };
save.progress = {
  reachedRoom: 0,
  seeds: {},
  gameFinished: false,
  openingSeen: false,
  ...loaded?.progress,
};
// 0.2.0 re-authored every room: scores, ghosts and seed spots from earlier
// layouts no longer describe the same rooms, so they reset. How far you got stays.
if (loaded && loaded.layouts !== 2) {
  save.rooms = {};
  save.parRuns = {};
  save.progress.seeds = {};
}
save.layouts = 2;
const settings = save.settings,
  audio = new AudioLayer(settings);
let renderer;
try {
  renderer = new PreserveRenderer(canvas, settings);
} catch (e) {
  screen.innerHTML =
    '<div class="panel"><h2>WebGL could not start</h2><p>Enable hardware acceleration in your browser, then reload Preserve.</p></div>';
  throw e;
}
const cinema = new Cinematics(renderer, settings, audio);
const shell = new SLUWebShell({
  build: { id: "preserve", version: VERSION },
  renderer: new ThreeAdapter({ onLoadLevel: (_id, world) => renderer.load(world) }),
  settings,
});
const results = new ResultsManager();
const actions = [
  "move.left",
  "move.right",
  "jump",
  "swap",
  "retry",
  "pause",
  "ui.confirm",
  "ui.back",
];
shell.input.setBindings(actions.map((action) => ({ action })));
const heldKeys = new Set(),
  touchHeld = new Map();
let menu = "title",
  world = new DeathMaterials(MAIN_ROOMS[0]),
  roomIndex = 0,
  lastFrame = performance.now(),
  accumulator = 0,
  jumpQueued = false,
  swapQueued = false,
  inputs = [],
  ghost = null,
  importedGhost = null,
  lastTape = null,
  parRun = null,
  retryHeld = 0,
  padPrev = {},
  toastTimeout,
  savePending = false,
  padSuppress = true,
  attemptAssisted = false;
let keyboard = {
  moveLeft: ["ArrowLeft", "KeyA"],
  moveRight: ["ArrowRight", "KeyD"],
  jump: ["Space", "KeyW", "ArrowUp", "KeyZ"],
  swap: ["KeyX", "ShiftLeft", "ShiftRight"],
};
if (settings.controls) keyboard = { ...keyboard, ...settings.controls };
renderer.load(world);
await shell.boot();
async function persist() {
  if (readOnly) return;
  try {
    await saveManager.save(save);
  } catch {
    toast("Progress could not be saved. Export your save from Settings.");
  }
}
function toast(text) {
  $("#toast").textContent = text;
  $("#toast").classList.add("visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => $("#toast").classList.remove("visible"), 4000);
}
function button(id, text, cls = "") {
  return `<button id="${id}" class="${cls}">${text}</button>`;
}
function show(html, type) {
  menu = type;
  padSuppress = true;
  screen.innerHTML = html;
  $("#hud").hidden = type !== "play";
  $("#touch").hidden = type !== "play" || !isTouch;
  $("#help").hidden = type !== "play";
  screen
    .querySelector("button:not(:disabled),input,select,textarea")
    ?.focus({ preventScroll: true });
  heldKeys.clear();
  touchHeld.clear();
  jumpQueued = swapQueued = false;
}
function bind(id, fn) {
  $("#" + id)?.addEventListener("click", () => {
    audio.unlock();
    audio.event("ui.confirm");
    fn();
  });
}
function title() {
  shell.session.setPhase("title");
  show(
    `<div class="panel title-panel"><h1 class="jar-title" aria-label="Preserve"><svg viewBox="0 0 360 300" aria-hidden="true"><defs><radialGradient id="jg" cx="50%" cy="85%" r="60%"><stop offset="0" stop-color="#7ff0d8" stop-opacity=".95"/><stop offset=".55" stop-color="#2bc4a8" stop-opacity=".55"/><stop offset="1" stop-color="#0e6b5c" stop-opacity="0"/></radialGradient><filter id="jb" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter></defs><ellipse class="jar-halo" cx="180" cy="230" rx="150" ry="70" fill="url(#jg)" filter="url(#jb)"/><rect x="92" y="22" width="176" height="30" rx="7" class="jar-lid"/><path class="jar-glass" d="M104 58h152c6 0 10 4 10 10v8c18 12 26 30 26 56v118c0 22-14 36-36 36H104c-22 0-36-14-36-36V132c0-26 8-44 26-56v-8c0-6 4-10 10-10Z"/><path class="jar-jelly" d="M74 236c30-16 64-20 106-20s76 4 106 20v14c0 22-14 36-36 36H110c-22 0-36-14-36-36Z"/><circle cx="160" cy="250" r="5" class="jar-eye"/><circle cx="200" cy="250" r="5" class="jar-eye"/><text x="180" y="168" text-anchor="middle" class="jar-word">Preserve</text></svg></h1><div class="menu-list">${button("begin", save.progress.openingSeen ? "Continue" : "Begin", "primary")}${button("map", "Room select")}${button("settings", "Settings")}${button("scores", "Scorecard")}${save.progress.gameFinished ? button("runs", "Par Run") + button("homecoming", "Homecoming") : ""}</div><p class="small">${VERSION} · Mike Parker</p></div>`,
    "title",
  );
  bind("begin", () =>
    save.progress.openingSeen
      ? play(MAIN_ROOMS[Math.min(save.progress.reachedRoom, 93)].id)
      : opening(),
  );
  bind("map", map);
  bind("settings", () => settingsScreen(title));
  bind("scores", scorecard);
  bind("runs", runMenu);
  bind("homecoming", ending);
}
function movie(kind, done) {
  show(
    `<div class="cinema-controls">${button("skip", "Skip", "quiet")}</div><div id="cinema-fade" aria-hidden="true"></div>`,
    "cinema",
  );
  screen.classList.add("cinema-screen");
  cinema.start(
    kind,
    () => {
      screen.classList.remove("cinema-screen");
      done();
    },
    save.stats.mapMarks ?? [],
    world.room.act,
  );
  bind("skip", () => cinema.finish());
}
function opening() {
  movie("opening", () => {
    save.progress.openingSeen = true;
    persist();
    play(MAIN_ROOMS[0].id);
  });
}
// Acts and rooms are marked, never named (no act or room name copy).
const ACT_MARKS = ["0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
const roomMark = (r) => `${ACT_MARKS[r.act]} · ${r.n === "A" ? "◇" : String(r.n).padStart(2, "0")}`;
function actSeeds(act) {
  return Object.keys(save.progress.seeds).filter((id) => id.startsWith(`room.${act}.`)).length;
}
function unlocked(r) {
  return r.anomaly ? actSeeds(r.act) >= 3 : MAIN_ROOMS.indexOf(r) <= save.progress.reachedRoom;
}
const cssHex = (c) => "#" + c.toString(16).padStart(6, "0");
// The sublevel map is a cross-section of the facility (art bible §8): floors
// stacked as you climb, a lift shaft through them, rooms as small windows that
// light up once reached and glow teal once cleared.
function map() {
  shell.session.setPhase("menu");
  const here = world.room.act;
  let floors = "";
  for (let act = 8; act >= 0; act--) {
    const rooms = ROOMS.filter((r) => r.act === act);
    const reached = rooms.some((r) => !r.anomaly && unlocked(r));
    const seeds =
      act > 0 && act < 8
        ? `<span class="floor-seeds" aria-label="${actSeeds(act)} of 3 seeds">${[0, 1, 2].map((i) => SEED_SVG(i < actSeeds(act))).join("")}</span>`
        : "";
    const windows = rooms
      .map((r) => {
        const rec = save.rooms[r.id] ?? save.assistedRooms?.[r.id];
        const open = unlocked(r);
        const cls = [
          "room-window",
          r.anomaly ? "anomaly" : "",
          open ? "lit" : "locked",
          rec ? "cleared" : "",
          rec && rec.bestDeaths <= r.par ? "pin" : "",
          r.id === world.room.id ? "current" : "",
        ].join(" ");
        const label = `${r.name}, par ${r.par}${rec ? ", best " + rec.bestDeaths + " deaths" : ""}${open ? "" : ", locked"}`;
        const mark = r.anomaly ? "◇" : String(r.n).padStart(2, "0");
        return `<button data-room="${r.id}" aria-label="${label}" class="${cls}" ${open ? "" : "disabled"}><span>${open ? mark : ""}</span>${rec ? `<small>${rec.bestDeaths}/${r.par}</small>` : ""}</button>`;
      })
      .join("");
    floors += `<section class="floor ${reached ? "reached" : "dark"} ${act === here ? "here" : ""}" style="--act:${cssHex(ACTS[act].color)}"><div class="shaft"><span class="act-num">${ACT_MARKS[act]}</span>${act === here ? '<span class="car" aria-label="You are here"></span>' : ""}</div><div class="floor-body"><div class="floor-head"><span class="act-name">${reached ? ACTS[act].name : "·  ·  ·"}</span>${seeds}</div><div class="room-grid">${windows}</div></div></section>`;
  }
  show(
    `<div class="panel map-panel"><div class="toolbar"><h2>The climb</h2>${button("back", "Back", "quiet")}</div><div class="facility">${floors}</div><div class="actions">${save.progress.gameFinished ? button("runs", "Par Run") : ""}${button("race", "Race a replay")}${button("scorecard", "Scorecard")}</div></div>`,
    "map",
  );
  screen.querySelectorAll("[data-room]").forEach((b) => (b.onclick = () => play(b.dataset.room)));
  screen.querySelector(".floor.here")?.scrollIntoView({ block: "center" });
  screen.querySelector(".room-window.current")?.focus({ preventScroll: true });
  bind("back", title);
  bind("runs", runMenu);
  bind("race", () => replayScreen(map));
  bind("scorecard", scorecard);
}
const HINTS = {
  "room.0.01": "A / D or ← / → · Space to jump",
  "room.0.02": "A long fall leaves a step. R retries the room.",
  "room.1.01": "Spikes leave a coat. Land deep in the field.",
  "room.2.01": "Fire leaves a crust. It breaks when you leave it.",
  "room.3.01": "A jammed press leaves a bounce pad.",
  "room.4.01": "Hold still in frost to build a step.",
  "room.5.01": "X / Shift swaps halves. Touch to merge.",
  "room.6.01": "A strand powers the door.",
};
async function play(id, { keepRun = false } = {}) {
  if (!keepRun) parRun = null;
  world = new DeathMaterials(ROOM_BY_ID[id]);
  roomIndex = MAIN_ROOMS.findIndex((r) => r.id === id);
  inputs = [];
  accumulator = 0;
  ghost = null;
  attemptAssisted = !!(settings.guide && GUIDES[id]);
  show("", "play");
  shell.session.setPhase("playing");
  await shell.loadLevel(id, world);
  $("#par").textContent = world.room.par;
  $("#deaths").textContent = "0";
  $("#room-mark").textContent = roomMark(world.room);
  $("#help").textContent = HINTS[id] ?? "";
  $("#help").hidden = !HINTS[id];
  setTimeout(() => {
    if (menu === "play") $("#help").hidden = true;
  }, 12000);
  const tape =
    parRun?.race?.find((t) => t.roomId === id) ??
    (importedGhost?.roomId === id
      ? importedGhost
      : settings.guide && GUIDES[id]
        ? GUIDES[id]
        : settings.ghost
          ? await replayStore.load(id)
          : null);
  if (tape) {
    try {
      const data = verifyReplay(tape, { ghost: true });
      ghost = new GhostPlayback({ frames: data.frames });
    } catch {}
  }
  updateHud();
}
const SEED_SVG = (found) =>
  `<svg viewBox="0 0 10 14" class="seed ${found ? "found" : ""}" aria-hidden="true"><path d="M5 1C8.6 4.2 8.6 9.8 5 13C1.4 9.8 1.4 4.2 5 1Z"/></svg>`;
function updateHud() {
  const deaths = $("#deaths");
  if (deaths.textContent !== String(world.deaths)) {
    deaths.textContent = world.deaths;
    // A small bump each time a death is spent.
    deaths.parentElement.classList.remove("bump");
    void deaths.offsetWidth;
    deaths.parentElement.classList.add("bump");
  }
  // Wordless pace: the drop warms once the room goes over par.
  deaths.parentElement.classList.toggle("over", world.deaths > world.room.par);
  const act = world.room.act;
  const found = act > 0 && act < 8 ? Math.min(3, actSeeds(act)) : -1;
  const pips = $("#seed-pips");
  if (pips.dataset.found !== String(found)) {
    pips.dataset.found = found;
    pips.innerHTML = found < 0 ? "" : [0, 1, 2].map((i) => SEED_SVG(i < found)).join("");
    pips.hidden = found < 0;
  }
  document.querySelector("[data-action=swap]").style.visibility =
    world.players.length > 1 ? "visible" : "hidden";
}
function retry() {
  if (menu !== "play" && menu !== "pause" && menu !== "result") return;
  audio.event("room.retry");
  play(world.room.id, { keepRun: true });
}
function pause() {
  if (menu === "play") {
    persist();
    shell.pause();
    show(
      `<div class="card pause-card"><p class="eyebrow">${roomMark(world.room)}</p><h2>Paused</h2><div class="pause-score"><span class="stat ${world.deaths > world.room.par ? "over" : ""}"><svg viewBox="0 0 16 20"><path class="fill" d="M8 1C7 4 1 9 1 13a7 7 0 0014 0C15 9 9 4 8 1Z"/></svg><b>${world.deaths}</b></span><span class="stat par"><svg viewBox="0 0 20 20"><path d="M5 18V2l11 3.5L5 9M2 18h7"/></svg><b>${world.room.par}</b></span></div><div class="menu-list">${button("resume", "Resume", "primary")}${button("retry", "Retry")}${button("room-map", "Room select")}${button("settings", "Settings")}${button("title", "Title")}</div></div>`,
      "pause",
    );
    bind("resume", resume);
    bind("retry", retry);
    bind("room-map", () => {
      parRun = null;
      map();
    });
    bind("settings", () => settingsScreen(pausePanel));
    bind("title", () => {
      parRun = null;
      title();
    });
  } else if (menu === "pause") resume();
}
function pausePanel() {
  menu = "play";
  pause();
}
function resume() {
  shell.resume();
  show("", "play");
}
async function clearRoom() {
  const data = results.build(
    { deaths: world.deaths },
    { score: world.deaths, timeMs: Math.round(world.time * 1000) },
  );
  lastTape = {
    version: VERSION,
    roomId: world.room.id,
    deaths: world.deaths,
    ticks: world.tick,
    inputs: structuredClone(inputs),
  };
  lastTape.assisted = attemptAssisted;
  const records = attemptAssisted ? (save.assistedRooms ??= {}) : save.rooms;
  const previous = records[world.room.id];
  const best =
    !previous ||
    world.deaths < previous.bestDeaths ||
    (world.deaths === previous.bestDeaths && data.timeMs < previous.bestTimeMs);
  records[world.room.id] = {
    ...previous,
    cleared: true,
    bestDeaths: best ? world.deaths : previous.bestDeaths,
    bestTimeMs: best ? data.timeMs : previous.bestTimeMs,
    assisted: attemptAssisted,
  };
  if (best)
    try {
      await replayStore.save({
        ...lastTape,
        id: attemptAssisted ? "guided:" + world.room.id : world.room.id,
        gameVersion: VERSION,
      });
    } catch {
      toast("This ghost is too large to save.");
    }
  if (roomIndex >= 0)
    save.progress.reachedRoom = Math.max(save.progress.reachedRoom, Math.min(93, roomIndex + 1));
  if (world.room.id === "room.8.06") {
    save.progress.gameFinished = true;
  }
  if (parRun) {
    parRun.tapes.push(lastTape);
    parRun.deaths += world.deaths;
    parRun.timeMs += data.timeMs;
    parRun.index++;
  }
  await persist();
  if (world.room.id === "room.8.06" && !parRun) {
    ending();
    return;
  }
  resultPanel(data, best);
}
function resultPanel(data, best) {
  const r = world.room;
  const name = golfName(data.score, r.par);
  show(
    `<div class="tag"><h2>${name}</h2><div class="results"><div><strong>${data.score} / ${r.par}</strong><small>Deaths / par</small></div><div><strong>${(data.timeMs / 1000).toFixed(2)} s</strong><small>${attemptAssisted ? "Guided clear" : best ? "Personal best" : "Room time"}</small></div></div><div class="actions">${button("next", parRun && parRun.index === parRun.ids.length ? "Finish run" : "Continue", "primary")}${button("again", "Retry")}${button("share", "Share replay")}</div><div class="actions">${button("board", "Leaderboard", "quiet")}${button("map", "Room select", "quiet")}</div></div>`,
    "result",
  );
  bind("next", nextRoom);
  bind("again", retry);
  bind("share", () => replayScreen(() => resultPanel(data, best), lastTape));
  bind("board", () => leaderboard(() => resultPanel(data, best)));
  bind("map", () => {
    parRun = null;
    map();
  });
}
function nextRoom() {
  if (parRun) {
    if (parRun.index >= parRun.ids.length) {
      finishRun();
      return;
    }
    play(parRun.ids[parRun.index], { keepRun: true });
    return;
  }
  if (world.room.anomaly) {
    map();
    return;
  }
  const next = MAIN_ROOMS[roomIndex + 1];
  if (!next) {
    map();
    return;
  }
  if (next.act !== world.room.act) {
    liftTransition(next);
    return;
  }
  play(next.id);
}
function liftTransition(next) {
  const kind = next.act === 7 ? "escape" : next.act === 8 ? "farmhouse" : "lift";
  movie(kind, () => play(next.id));
}
function ending() {
  movie("ending", () => {
    save.progress.endingSeen = true;
    persist();
    endingScorecard();
  });
}
function endingScorecard() {
  const records = { ...save.assistedRooms, ...save.rooms };
  const cleared = Object.keys(records).length;
  const deaths = Object.values(records).reduce((n, r) => n + r.bestDeaths, 0);
  show(
    `<div class="tag"><h2>Preserve</h2><div class="results"><div><strong>${cleared} / 101</strong><small>Rooms cleared</small></div><div><strong>${deaths}</strong><small>Best deaths</small></div></div><p class="small">${save.stats.totalDeaths} total deaths · ${(save.stats.playTimeMs / 60000).toFixed(1)} minutes</p><div class="actions">${button("credits", "Credits", "primary")}${button("replay-ending", "Watch again")}${button("map", "Room select", "quiet")}</div></div>`,
    "ending-scorecard",
  );
  bind("credits", credits);
  bind("replay-ending", ending);
  bind("map", map);
}
function climbMap() {
  const height = MAIN_ROOMS.length * 24;
  return `<svg viewBox="0 0 400 ${height}" style="width:100%;max-width:400px" aria-label="The climb, with a mark at every saved death">${[
    ...MAIN_ROOMS,
  ]
    .reverse()
    .map((r, i) => {
      const y = i * 24;
      const marks = (save.stats.mapMarks ?? []).filter((m) => m.room === r.id);
      const width = r.rows[0].length,
        h = r.rows.length;
      return `<rect x="40" y="${y + 2}" width="320" height="20" fill="${r.act === 8 ? "#654a32" : "#202c32"}" stroke="#52645d" stroke-width=".5"/>${marks.map((m) => `<circle cx="${40 + (m.x / width) * 320}" cy="${y + 2 + (m.y / h) * 20}" r="1.7" fill="#7ff0d8"/>`).join("")}`;
    })
    .join("")}</svg>`;
}
function credits() {
  const total = Object.values(save.rooms).reduce((s, r) => s + r.bestDeaths, 0);
  show(
    `<div class="panel"><p class="eyebrow">Preserve</p><h2>Credits</h2><p>Design · Mike Parker</p><p>Built with the SLU Web Game Shell and Three.js.</p><p class="small">${Object.keys(save.rooms).length} rooms cleared · ${total} best deaths</p><div class="actions">${button("map", "The climb", "primary")}${button("runs", "Par Run")}${button("scorecard", "Scorecard")}${button("replay-ending", "Homecoming")}</div><div class="credits-climb">${climbMap()}</div><p class="small">Build ${VERSION} · Three.js MIT · SLU Shell snapshot 6f08d17</p></div>`,
    "credits",
  );
  bind("map", map);
  bind("runs", runMenu);
  bind("scorecard", scorecard);
  bind("replay-ending", ending);
}
function scorecard() {
  const rows = ACTS.map((a, i) => {
    const rs = MAIN_ROOMS.filter((r) => r.act === i),
      cleared = rs.filter((r) => save.rooms[r.id]);
    return `<tr><td>${ACT_MARKS[ACTS.indexOf(a)]}</td><td>${cleared.length} / ${rs.length}</td><td>${cleared.reduce((s, r) => s + save.rooms[r.id].bestDeaths, 0)} / ${rs.reduce((s, r) => s + r.par, 0)}</td></tr>`;
  }).join("");
  show(
    `<div class="panel"><div class="toolbar"><h2>Scorecard</h2>${button("back", "Back", "quiet")}</div><table class="board"><thead><tr><th>Sublevel</th><th>Cleared</th><th>Deaths / par</th></tr></thead><tbody>${rows}</tbody></table><p class="small">${save.stats.totalDeaths} total deaths · ${(save.stats.playTimeMs / 60000).toFixed(1)} minutes</p></div>`,
    "scorecard",
  );
  bind("back", title);
}
function settingsScreen(back) {
  show(
    `<div class="panel"><div class="toolbar"><h2>Settings</h2>${button("back", "Back", "quiet")}</div><fieldset><legend>Video</legend>${["pip", "world"].map((k) => `<label class="settings-row">${k === "pip" ? "Pip" : "World"} quality<select data-setting="${k}">${["low", "medium", "high"].map((v) => `<option value="${v}" ${settings[k] === v ? "selected" : ""}>${v[0].toUpperCase() + v.slice(1)}</option>`).join("")}</select></label>`).join("")}${["motion", "outlines", "ghost", "guide"].map((k) => `<label class="settings-row">${{ motion: "Motion effects", outlines: "Material outlines", ghost: "Personal best ghost", guide: "Guide ghost" }[k]}<input type="checkbox" data-setting="${k}" ${settings[k] ? "checked" : ""}></label>`).join("")}</fieldset><p class="small">Guide ghosts are available in some rooms. Guided scores stay separate.</p><fieldset><legend>Audio</legend>${["music", "sfx", "ambience", "ui"].map((k) => `<label class="settings-row">${{ music: "Music", sfx: "Sound effects", ambience: "Ambience", ui: "Menus" }[k]}<input data-setting="${k}" type="range" min="0" max="1" step=".05" value="${settings[k]}"></label>`).join("")}</fieldset><fieldset><legend>Controls</legend>${Object.entries(
      keyboard,
    )
      .map(
        ([k, v]) =>
          `<div class="settings-row"><span>${{ moveLeft: "Move left", moveRight: "Move right", jump: "Jump", swap: "Swap halves" }[k]}</span><button data-rebind="${k}">${v[0].replace("Key", "")}</button></div>`,
      )
      .join(
        "",
      )}<label class="settings-row">Left-handed touch<input type="checkbox" data-setting="leftHanded" ${settings.leftHanded ? "checked" : ""}></label><label class="settings-row">Touch size<input type="range" data-setting="touchScale" min=".8" max="1.3" step=".1" value="${settings.touchScale}"></label></fieldset><p class="small">R · Retry &nbsp; Esc · Pause<br>Gamepad: A · Jump, X · Swap, hold Y · Retry, Start · Pause</p><div class="actions">${button("export", "Export save")}${button("import", "Import save")}</div><input id="save-file" type="file" accept="application/json" hidden></div>`,
    "settings",
  );
  bind("back", async () => {
    persist();
    renderer.resize();
    renderer.lastGrid = "";
    const tape =
      parRun?.race?.find((t) => t.roomId === world.room.id) ??
      (importedGhost?.roomId === world.room.id
        ? importedGhost
        : settings.guide && GUIDES[world.room.id]
          ? GUIDES[world.room.id]
          : settings.ghost
            ? await replayStore.load(world.room.id)
            : null);
    if (settings.guide && GUIDES[world.room.id]) attemptAssisted = true;
    ghost = null;
    if (tape) {
      try {
        ghost = new GhostPlayback({ frames: verifyReplay(tape, { ghost: true }).frames });
      } catch {}
    }
    back();
  });
  screen.querySelectorAll("[data-setting]").forEach(
    (el) =>
      (el.oninput = () => {
        const k = el.dataset.setting;
        settings[k] =
          el.type === "checkbox" ? el.checked : el.type === "range" ? Number(el.value) : el.value;
        renderer.settings = settings;
        renderer.renderer.shadowMap.enabled = settings.world !== "low";
        $("#touch").classList.toggle("mirrored", settings.leftHanded);
        $("#touch").style.zoom = settings.touchScale;
        renderer.resize();
      }),
  );
  screen.querySelectorAll("[data-rebind]").forEach(
    (el) =>
      (el.onclick = () => {
        el.textContent = "Press a key";
        const capture = (e) => {
          e.preventDefault();
          e.stopImmediatePropagation();
          keyboard[el.dataset.rebind] = [e.code];
          settings.controls = keyboard;
          el.textContent = e.code.replace("Key", "");
          window.removeEventListener("keydown", capture, true);
          persist();
        };
        window.addEventListener("keydown", capture, true);
      }),
  );
  bind("export", () => download("preserve-save.json", JSON.stringify(save, null, 2)));
  bind("import", () => $("#save-file").click());
  $("#save-file").onchange = async (e) => {
    try {
      const text = await e.target.files[0].text();
      if (text.length > 5000000) throw Error();
      const data = JSON.parse(text);
      if (
        data.version !== 1 ||
        !data.rooms ||
        !data.progress ||
        !Number.isInteger(data.progress.reachedRoom) ||
        data.progress.reachedRoom < 0 ||
        data.progress.reachedRoom > 93
      )
        throw Error();
      Object.assign(save, data);
      Object.assign(settings, defaults, data.settings);
      save.settings = settings;
      await persist();
      toast("Save imported.");
    } catch {
      toast("That save could not be imported.");
    }
  };
}
function download(name, text) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function replayScreen(back, tape = null) {
  show(
    `<div class="panel"><div class="toolbar"><h2>${tape ? "Share replay" : "Race a replay"}</h2>${button("back", "Back", "quiet")}</div><p class="small">${tape ? "This code includes the exact inputs. A friend can verify it and race your ghost." : "Paste a replay code to verify the score and race the ghost."}</p><textarea id="replay-code" class="code" aria-label="Replay code" spellcheck="false">${tape ? encodeReplay(tape) : ""}</textarea><div class="actions">${tape ? button("copy", "Copy code", "primary") : button("verify", "Verify and race", "primary")}</div></div>`,
    "replay",
  );
  bind("back", back);
  bind("copy", async () => {
    try {
      await navigator.clipboard.writeText($("#replay-code").value);
      toast("Replay copied.");
    } catch {
      $("#replay-code").select();
      toast("Select and copy this code.");
    }
  });
  bind("verify", () => {
    try {
      const t = decodeReplay($("#replay-code").value);
      if (t.kind === "run") {
        const v = verifyRun(t);
        toast(`Verified · ${v.deaths} deaths · ${(v.timeMs / 1000).toFixed(2)} s`);
        startRun(
          t.tapes.map((t) => t.roomId),
          t.id,
          t.tapes,
        );
        return;
      }
      verifyReplay(t);
      importedGhost = t;
      toast(
        `${golfName(t.deaths, ROOM_BY_ID[t.roomId].par)} · ${t.deaths} deaths · ${(t.ticks / 240).toFixed(2)} s`,
      );
      play(t.roomId);
    } catch (e) {
      toast(e.message);
    }
  });
}
function runMenu() {
  show(
    `<div class="panel"><div class="toolbar"><h2>Par Run</h2>${button("back", "Back", "quiet")}</div><div class="menu-list">${ACTS.map((a, i) => button("run-" + i, ACT_MARKS[i])).join("")}${button("run-all", "Full climb", "primary")}</div></div>`,
    "runs",
  );
  bind("back", map);
  for (let i = 0; i < 9; i++)
    bind("run-" + i, () =>
      startRun(
        MAIN_ROOMS.filter((r) => r.act === i).map((r) => r.id),
        `act.${i}`,
      ),
    );
  bind("run-all", () =>
    startRun(
      MAIN_ROOMS.map((r) => r.id),
      "full",
    ),
  );
}
function startRun(ids, id, race = null) {
  parRun = { id, ids, index: 0, deaths: 0, timeMs: 0, tapes: [], race };
  play(ids[0], { keepRun: true });
}
async function finishRun() {
  const run = parRun;
  const records = run.tapes.some((t) => t.assisted) ? (save.assistedParRuns ??= {}) : save.parRuns;
  const old = records[run.id];
  if (
    !old ||
    run.deaths < old.bestDeaths ||
    (run.deaths === old.bestDeaths && run.timeMs < old.bestTimeMs)
  )
    records[run.id] = { bestDeaths: run.deaths, bestTimeMs: run.timeMs };
  await persist();
  show(
    `<div class="tag"><p class="eyebrow">Par Run</p><h2>${golfName(
      run.deaths,
      run.ids.reduce((s, id) => s + ROOM_BY_ID[id].par, 0),
    )}</h2><div class="results"><div><strong>${run.deaths}</strong><small>Deaths</small></div><div><strong>${(run.timeMs / 1000).toFixed(2)} s</strong><small>Total time</small></div></div><div class="actions">${button("map", "The climb", "primary")}${button("submit-run", "Submit run")}${button("share-run", "Share run")}${button("run-board", "Leaderboard")}</div></div>`,
    "run-result",
  );
  bind("share-run", () =>
    replayScreen(() => finishRun(), {
      kind: "run",
      version: VERSION,
      id: run.id,
      tapes: run.tapes,
    }),
  );
  bind("run-board", () => leaderboard(() => finishRun(), "run." + run.id, "Par Run"));
  bind("map", () => {
    parRun = null;
    map();
  });
  bind("submit-run", async () => {
    try {
      if (run.tapes.some((t) => t.assisted)) {
        toast("Guided runs have separate local scores.");
        return;
      }
      const name = save.playerName || "Pip";
      const r = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, id: run.id, tapes: run.tapes }),
      });
      if (!r.ok) throw Error();
      toast("Verified run submitted.");
    } catch {
      toast("Online boards are unavailable on this host. Your local result is saved.");
    }
  });
}
async function leaderboard(back, boardId = world.room.id, boardTitle = roomMark(world.room)) {
  show(
    `<div class="panel"><div class="toolbar"><h2>${boardTitle}</h2>${button("back", "Back", "quiet")}</div><table class="board"><thead><tr><th>Player</th><th>Deaths</th><th>Time</th></tr></thead><tbody id="board-rows"></tbody></table><p id="board-status" class="small">Local personal best</p><label class="settings-row">Name<input id="player-name" type="text" maxlength="24" value=""></label><div class="actions">${lastTape && !lastTape.assisted && boardId === world.room.id ? button("submit", "Submit verified replay", "primary") : ""}</div></div>`,
    "board",
  );
  $("#player-name").value = save.playerName ?? "Pip";
  bind("back", back);
  const best = boardId.startsWith("run.") ? save.parRuns[boardId.slice(4)] : save.rooms[boardId];
  const tbody = $("#board-rows");
  function addRow(name, deaths, time) {
    const tr = document.createElement("tr");
    for (const v of [name, String(deaths), (time / 1000).toFixed(2) + " s"]) {
      const td = document.createElement("td");
      td.textContent = v;
      tr.append(td);
    }
    tbody.append(tr);
  }
  if (best) addRow("Personal best", best.bestDeaths, best.bestTimeMs);
  try {
    if (location.protocol === "file:") throw Error();
    const r = await fetch("/api/leaderboard?room=" + encodeURIComponent(boardId));
    if (!r.ok) throw Error();
    const rows = await r.json();
    if (!Array.isArray(rows)) throw Error();
    $("#board-status").textContent = "Verified online scores";
    for (const row of rows) addRow(row.name, row.deaths, row.timeMs);
  } catch {
    $("#board-status").textContent =
      "Online boards unavailable on this host. Local scores are saved.";
  }
  bind("submit", async () => {
    save.playerName = $("#player-name").value.trim() || "Pip";
    await persist();
    try {
      const r = await fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: save.playerName, tape: lastTape }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      toast("Replay verified and submitted.");
      leaderboard(back);
    } catch {
      toast("Could not reach the online board. You can still share your replay code.");
    }
  });
}
let isTouch = matchMedia("(pointer:coarse)").matches;
document.body.classList.toggle("touch-device", isTouch);
$("#touch").classList.toggle("mirrored", settings.leftHanded);
$("#touch").style.zoom = settings.touchScale;
for (const b of document.querySelectorAll("[data-action]")) {
  b.onpointerdown = (e) => {
    e.preventDefault();
    audio.unlock();
    b.setPointerCapture(e.pointerId);
    touchHeld.set(e.pointerId, b.dataset.action);
    b.classList.add("on");
  };
  b.onpointermove = (e) => {
    if (!touchHeld.has(e.pointerId) || !b.closest(".move-pad")) return;
    const at = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-action]");
    if (at && at.closest(".move-pad")) {
      touchHeld.set(e.pointerId, at.dataset.action);
      document
        .querySelectorAll(".move-pad button")
        .forEach((btn) => btn.classList.toggle("on", btn === at));
    }
  };
  const off = (e) => {
    touchHeld.delete(e.pointerId);
    document
      .querySelectorAll("[data-action]")
      .forEach((b) => b.classList.toggle("on", [...touchHeld.values()].includes(b.dataset.action)));
  };
  b.onpointerup = off;
  b.onpointercancel = off;
}
window.addEventListener("pointerdown", (e) => {
  audio.unlock();
  if (e.pointerType === "touch") {
    isTouch = true;
    document.body.classList.add("touch-device");
    if (menu === "play") $("#touch").hidden = false;
  }
});
window.addEventListener("keydown", (e) => {
  if (e.target.matches("input,textarea,select")) return;
  audio.unlock();
  heldKeys.add(e.code);
  if (menu === "play") {
    if (["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.code))
      e.preventDefault();
    if (e.code === "Escape") {
      e.preventDefault();
      pause();
    } else if (e.code === "KeyR" && !e.repeat) retry();
  } else if (e.code === "Escape") {
    e.preventDefault();
    if (menu === "pause") resume();
    else if (menu === "result") map();
    else if (menu === "map") title();
    else if (menu === "cinema") $("#skip")?.click();
    else $("#back")?.click();
  }
});
window.addEventListener("keyup", (e) => heldKeys.delete(e.code));
window.addEventListener("blur", () => {
  heldKeys.clear();
  touchHeld.clear();
  if (menu === "play") pause();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && menu === "play") pause();
});
window.addEventListener("resize", () => renderer.resize());
bind("retry-button", retry);
bind("pause-button", pause);
bind("map-button", () => {
  parRun = null;
  map();
});
function focusMove(direction) {
  const els = [
    ...screen.querySelectorAll("button:not(:disabled),input:not([type=file]),select,textarea"),
  ];
  if (!els.length) return;
  const i = els.indexOf(document.activeElement);
  els[(i + direction + els.length) % els.length].focus();
}
function pollInput(dt) {
  const gp = navigator.getGamepads?.();
  const pad = gp && [...gp].find((p) => p?.connected);
  const p = {
    left: !!pad && (pad.buttons[14]?.pressed || pad.axes[0] < -0.4),
    right: !!pad && (pad.buttons[15]?.pressed || pad.axes[0] > 0.4),
    up: !!pad && (pad.buttons[12]?.pressed || pad.axes[1] < -0.5),
    down: !!pad && (pad.buttons[13]?.pressed || pad.axes[1] > 0.5),
    jump: !!pad && !!pad.buttons[0]?.pressed,
    swap: !!pad && !!pad.buttons[2]?.pressed,
    retry: !!pad && !!pad.buttons[3]?.pressed,
    pause: !!pad && !!pad.buttons[9]?.pressed,
    back: !!pad && !!pad.buttons[1]?.pressed,
  };
  if (menu !== "play") {
    if (
      (p.down && !padPrev.down) ||
      (p.right && !padPrev.right && document.activeElement?.type !== "range")
    )
      focusMove(1);
    if (
      (p.up && !padPrev.up) ||
      (p.left && !padPrev.left && document.activeElement?.type !== "range")
    )
      focusMove(-1);
    if (p.jump && !padPrev.jump) {
      const el = document.activeElement;
      if (el?.tagName === "SELECT") {
        el.selectedIndex = (el.selectedIndex + 1) % el.options.length;
        el.dispatchEvent(new Event("input"));
      } else if (el?.type === "checkbox") {
        el.checked = !el.checked;
        el.dispatchEvent(new Event("input"));
      } else el?.click();
    }
    if (p.back && !padPrev.back) {
      if (menu === "pause") resume();
      else if (menu === "result") map();
      else if (menu === "map") title();
      else if (menu === "cinema") $("#skip")?.click();
      else $("#back")?.click();
    }
    if (
      document.activeElement?.type === "range" &&
      ((p.left && !padPrev.left) || (p.right && !padPrev.right))
    ) {
      const el = document.activeElement;
      el.value = Number(el.value) + (p.right ? 1 : -1) * Number(el.step || 0.1);
      el.dispatchEvent(new Event("input"));
    }
  }
  if (p.pause && !padPrev.pause) pause();
  if (menu === "play") {
    retryHeld = p.retry ? retryHeld + dt : 0;
    if (retryHeld >= 0.3 && !padPrev.retryFired) {
      retry();
      p.retryFired = true;
    } else if (p.retry && padPrev.retryFired) p.retryFired = true;
  }
  if (padSuppress && !p.jump && !p.swap && !p.pause) padSuppress = false;
  const touching = (a) => [...touchHeld.values()].includes(a),
    key = (k) => keyboard[k].some((c) => heldKeys.has(c));
  const raw = new Map([
    ["move.left", Number(key("moveLeft") || touching("move.left") || p.left)],
    ["move.right", Number(key("moveRight") || touching("move.right") || p.right)],
    ["jump", Number(key("jump") || touching("jump") || (p.jump && !padSuppress))],
    ["swap", Number(key("swap") || touching("swap") || (p.swap && !padSuppress))],
  ]);
  shell.input.update(raw);
  if (shell.input.wasPressed("jump")) jumpQueued = true;
  if (shell.input.wasPressed("swap")) swapQueued = true;
  padPrev = p;
}
function frame(now) {
  const elapsed = Math.max(0, (now - lastFrame) / 1000),
    dt = Math.min(0.05, elapsed);
  lastFrame = now;
  pollInput(dt);
  if (menu === "play") {
    accumulator += dt;
    let loops = 0;
    while (accumulator >= TUNE.step && loops++ < 16 && !world.won) {
      const input = {
        left: shell.input.isDown("move.left"),
        right: shell.input.isDown("move.right"),
        jump: shell.input.isDown("jump"),
        jumpPressed: jumpQueued,
        swap: swapQueued,
      };
      jumpQueued = swapQueued = false;
      appendInput(inputs, inputBits(input));
      world.step(input);
      accumulator -= TUNE.step;
      save.stats.playTimeMs += TUNE.step * 1000;
      for (const event of world.drain()) {
        audio.event(event.id);
        renderer.event(event);
        shell.events.emit(event.id, event);
        if (event.id.startsWith("jam.die.")) {
          save.stats.totalDeaths++;
          (save.stats.mapMarks ??= []).push({ room: world.room.id, x: event.x, y: event.y });
          if (save.stats.mapMarks.length > 5000) save.stats.mapMarks.shift();
          const k = event.id.slice(8);
          save.stats.deathsByHazard[k] = (save.stats.deathsByHazard[k] ?? 0) + 1;
          renderer.burst(event.x, event.y);
          updateHud();
        }
        if (event.id === "seed.collect") {
          save.progress.seeds[event.seedId] = true;
          persist();
          updateHud();
        }
        if (event.id === "jam.split" || event.id === "jam.merge") updateHud();
        if (event.id === "room.clear") clearRoom();
      }
      for (const s of world.seeds)
        if (s.collected && !save.progress.seeds[s.id]) {
          save.progress.seeds[s.id] = true;
          persist();
          updateHud();
        }
    }
  }
  audio.update(world.room.act, menu === "play", {
    world,
    cinema: cinema.active ? cinema.kind : null,
    credits: menu === "credits",
  });
  if (cinema.active) {
    const fade = cinema.update(Math.min(0.25, elapsed));
    const veil = $("#cinema-fade");
    if (veil) veil.style.opacity = 1 - (fade ?? 1);
  } else {
    const sample = ghost?.sample(world.time * 1000);
    renderer.render(dt, sample?.state?.players[sample.state.active]);
    if (menu === "credits" && settings.motion) {
      const panel = screen.querySelector(".panel");
      if (panel && panel.scrollHeight > panel.clientHeight) panel.scrollTop += dt * 12;
    }
  }
  requestAnimationFrame(frame);
}
// Expose the authoritative state for automated browser verification, with no developer UI.
window.Preserve = {
  get world() {
    return world;
  },
  get menu() {
    return menu;
  },
  get save() {
    return save;
  },
  play,
  renderer,
  shell,
  cinema,
};
title();
if (readOnly) toast("This save is from a newer build. It will not be overwritten.");
requestAnimationFrame(frame);
