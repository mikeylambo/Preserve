# Preserve — playable alpha 0.1.0

A web-first precision puzzle platformer by Mike Parker. Play Pip, a translucent gel creature whose deaths leave useful material behind.

## Play

Unzip this folder and open **Preserve.html** in a modern desktop browser. This standalone build includes its assets and works without a server or internet connection. Browser saves are local to the browser and file location; use Settings → Export save before moving to another device.

For the hosted version, install Node.js 20 or newer, run `npm start` in this folder, and open `http://localhost:4173`. No npm install is required. This server enables replay-verified leaderboard endpoints; it has not been deployed publicly.

## Controls

- Keyboard: A/D or arrows to move, Space to jump, X/Shift to swap halves, R to retry, Esc to pause.
- Touch: movement arrows and jump; swap appears when split. Retry and pause are in the top bar.
- Controller: stick/D-pad to move and navigate, A to jump/confirm, X to swap, hold Y to retry, Start to pause, B to go back.

Settings includes quality tiers, motion effects, material outlines, touch handedness/size, keyboard remapping, four audio buses, personal-best ghosts and guide ghosts. Guided clears are saved separately from clean scores.

## Included

101 authored rooms: Intake, seven acts with anomaly rooms, and Homecoming. The simulation implements splats, spike coats, fire crusts, vat filling, press pads, frost/ice, wire circuits, splitting/merging, machinery, seeds and progression. Local records, shared replay codes, guide ghosts, Par Runs, results, save export/import and procedural audio are included.

## Alpha status

The first 16 rooms have replay-verified clears at par or their intended birdie. Fifty guide replays reproduce valid clears, including The Great Press at five deaths. The full later campaign still needs solution validation and balancing; rendering all rooms does not certify that every room can be completed. This presentation pass adds a six-second 3D opening, a forty-second 3D homecoming, lift/surface/farmhouse transitions, ending scorecard, replayable Homecoming and scrolling death-mark credits. Original procedural surface paintings, labels/photos, scenery, gel skins, droplets, landing ripples and rain are included. Audio is an original locally synthesized arrangement with layered material cues, modeled string plucks, bell/piano voices, industrial rhythms, ambience and four volume buses. It still needs subjective listening and final art-direction review on target devices. Public leaderboard hosting and the post-launch room maker are not included. Safari, physical controllers, real phones and hardware frame-rate targets need device testing.

## Development

`npm test` runs deterministic gameplay, protected prototype movement, replay and campaign checks. `npm run build` regenerates `dist/` for static hosting and the standalone `Preserve.html`. Rules live in `src/simulation.js`; room layouts in `src/rooms.js`; presentation in `src/renderer.js`; UI/input/save integration in `src/main.js`. Cinematic timelines live in `src/cinematics.js`, shared procedural paintings in `src/art.js`, and the score/cue arrangement in `src/audio.js`. Original handoff documents are in `docs/`.

Leaderboard storage defaults to `data/`. Configure `PORT`, `PRESERVE_HOST`, and `PRESERVE_DATA_DIR` when hosting. Run private playtests before public deployment; production hosting, abuse controls, storage backup and operational hardening remain deployment work.

Three.js 0.160.0 is vendored under MIT. The user's SLU Web Game Shell is vendored from snapshot `6f08d17c2f1012b19e6e26c87c640762354eb0ec`; its source was marked UNLICENSED. This package is for the user's own project, not a grant to redistribute that framework separately. See `THIRD_PARTY_NOTICES.txt`.

This update preserves the 0.1.0 deterministic simulation/replay format and save schema. Export your save before moving the standalone file. Presentation QA details are in `docs/presentation-pass.md`.
