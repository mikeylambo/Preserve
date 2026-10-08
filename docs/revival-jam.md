# Revival Jam / Preserve: Handoff Spec

Status: **design complete, ready for build handoff** (2026-10-07). Codename *Revival Jam* (internal only; the name is Konami's and never ships). Working title: ***Preserve*** (Mike, 2026-10-07).
Owner: Mike. Built on the SLU Web Shell (`mikeylambo/Web-Game-Shell-v1.02`); its `AGENTS.md` constitution applies to every decision below.

**Pitch:** A jam that can't stay dead. Every death becomes part of the level.

**Fantasy:** A small teal specimen wakes at the bottom of an empty research facility dug deep into the earth. It can't stay dead, and whatever kills it decides what it leaves behind. It climbs, death by death, from the darkest sublevel up into daylight, then crosses the open country to a farmhouse kitchen and pours itself into the jar it came from.

**Genre:** single-player precision puzzle-platformer. Single-screen rooms, deaths scored like golf strokes. Side-on 2.5D on Three.js. Web-first on the Shell.

**Thesis (from the card concept):** failure becomes infrastructure. The player progresses by dying in the right places, in the right ways, in the right order. **Every room asks how few of your deaths it takes to build the way through.**

**Look test (2026-10-07):** https://claude.ai/artifact/8Ls3rhztpEiEFEvRghbNKr · `prototypes/revival-jam-gel-test.html` (Pip's gel with seed-eyes, a coat and an ice block, under every act's light and three tiers).

**Playable prototype (2026-10-07):** Death Par (chosen): https://claude.ai/artifact/28T3cBFYdBFXe9631xgYVA · Death Golf (parked): https://claude.ai/artifact/CE2Nrc3QU9PYwCADm8hZGM · source in `prototypes/` (`revival-jam-death-par.html`, `revival-jam-death-golf.html`, build kit in `prototypes/revival-jam-wip/`). A scripted bot cleared every Death Par level at par and a shot search verified every golf hole. Mike played both on desktop. Mobile and gamepad haven't been tested by hand.

---

## 1. Decisions log (Mike)

| Date | Decision | Choice | Rejected |
|---|---|---|---|
| 2026-10-07 | Format | **Death Par: precision puzzle-platformer**, deaths scored like golf strokes, chosen after playing both prototypes | Death Golf (cool but not intuitive; **parked for a later revisit**), mass roguelite, shared graveyard as a base game (kept as a post-launch layer idea) |
| 2026-10-07 | Frame | **Specimen Ascent plus homecoming**: climb out of a deep empty facility into daylight, cross the surface, end in the jam jar at home | Pantry escape ("doesn't feel like me"), pure lab breach, literal underworld climb |
| 2026-10-07 | Character | **Teal jam specimen** (Game Boy Color teal pushed toward green). The Maple slime's readable hop and Flubber's elastic energy, not their looks | Pink (would blend into red emergency light and fire), the card's blue, green slime with a face |
| 2026-10-07 | Tone | **Warm, not cute.** Wordless, physical comedy, no talking props or narration | Sugary mobile cute |
| 2026-10-07 | Render | **2.5D on Three.js**, side-on camera over an authoritative 2D tile grid | Crisp 2D vector, pixel art |
| 2026-10-07 | Art production | **Code-built** geometry and shaders in Three.js (plus a few painted textures) | Generated illustration |
| 2026-10-07 | Leaderboards | **Local, share codes and online, all at launch** | Local only at launch |
| 2026-10-07 | Title and face | Working title ***Preserve***; Pip has **seed-eyes** (two dark seeds on the front surface as eyes) | Faceless |
| 2026-10-07 | Room maker | **Free update after launch** | At launch |
| 2026-10-07 | Look test verdict | **Pip Medium + world Medium is the shipping default** (Mike confirmed after the tier split); frame rate beats fidelity. No inner seeds; the eyes stay | Floating seeds inside Pip |

From the original chat (2026-10-03): death type decides material; deaths are a budget with a par; splitting is the second verb; corpse-as-platform has precedents, so the variety of death types is the differentiator.

Defaults Claude picked where Mike didn't specify are marked *(default)* and are cheap to change.

**Distinct from the other handoffs:** Busted Blader is a survivors game, Last Law a 3D action roguelite, Mirroring authored arena action, Spend Yourself a turn-based deckbuilder. This is the set's only authored puzzle-platformer, and the only one where dying is the main verb.

## 2. World, hero and frame

**The Facility** *(default name, never shown)*: seven sublevels sunk into the earth, abandoned before the game begins. No researchers appear; there are no villains. Each sublevel was built to test one property of the specimen, and its rooms are those tests.

**Pip** *(default name, internal only; a pip is a fruit seed)* is the specimen: a fist-sized, translucent teal jam with a soft inner glow and nothing suspended inside (Mike, 2026-10-07: no inner seeds). It acts through squash, stretch, wobble, lean and splat (art bible §3). Two small dark seeds sit at the front as eyes (seed-eyes, Mike 2026-10-07); they glance, blink and track the direction Pip faces.

**The climb (lighting is the story):**
| Act | Place | Light |
|---|---|---|
| Intake | Sublevel 7: the specimen room | Dead dark; Pip is the only light |
| 1 to 6 | Sublevels 6 to 1 | Red emergency lamps, then failing work lights, then cold daylight leaking down shafts |
| 7 | The Surface | Storm night to grey dawn across fields, orchard and mill |
| 8 | Home | Morning sun in a farmhouse kitchen |

**The two jars (structural, wordless):** the game opens on Pip sealed in a **specimen jar** in the intake room, beside a handwritten sample label and a faded photo of a farmhouse kitchen: the jar of homemade preserves the specimen was cultured from. Every room's exit is a sample jar. The game ends with Pip pouring itself into the **jam jar** on that kitchen table. The same object means containment at the start and belonging at the end.

**Subtle frame (structural, never stated):** death is not wasted; it becomes the way home. "Unless a grain of wheat falls into the earth and dies, it remains alone; but if it dies, it bears much fruit" (John 12:24) maps onto the loop: every death becomes ground you stand on, and the destination is home, not escape. No scripture, religious names or iconography appear in the game.

**Story delivery:** wordless (rule 8). An in-engine opening (the jar cracks), the intake photo, environmental storytelling on the climb (empty desks, test placards with icons only, a kitchen photo pinned in every sublevel's office, each one sunnier), and an in-engine ending.

## 3. Core rules

### Movement (promote the prototype's feel; rule 5)
- Run, jump with variable height, coyote time and jump buffer. Values in `revival-jam-tuning.md` §1, inherited from the prototype.
- No attack, no dash, no double jump. **Dying is the verb.**
- **Retry** (one press) restarts the room instantly with zero deaths. **Respawn** after a death is automatic and fast (0.45 s).

### How you die decides what you leave
Each hazard turns your remains into one material. Materials are solid unless noted, persist until the room restarts, and never fade. Full rules and numbers: `revival-jam-content.md` §1.

| Hazard | Material | What it does |
|---|---|---|
| Long fall (7+ tiles onto ground) | **Splat** | A one-tile step where you landed |
| Spikes, thorns | **Coat** | Covers 3 spike tiles; walkable |
| Heat, fire | **Crust** | Covers 4 tiles of fire; breaks the moment you step off it |
| Pit, vat | **Fill** | Fills the pit row (up to 4 tiles) flush with the floor |
| Press, crusher | **Pad** | Jams the press and leaves a bounce pad in the floor beneath it |
| Frost (hold still in it) | **Ice** | A block where your feet were |
| Live wire, arc | **Strand** | A conducting jam strand: powers whatever the arc fed (doors, lifts, fans) while it exists |
| Cutter beam | **Split** | Cuts you in two (§3, Splitting); no material |

**Order matters.** Materials interact: crust burns off coat, ice melts next to heat (becomes fill if over a pit), a pad under a frozen block launches the block, strands short out in water *(defaults; full matrix in content §2)*. This is where later rooms get their depth: composition before new hazards (rule 12).

### Par (death golf)
- Every room has a **par**: the number of deaths in the intended solution. Room geometry forces a minimum; clever play can beat par.
- Clears are named like golf: **Ace** (0 deaths, only where geometry allows; rare and hidden), **Eagle** (par −2), **Birdie** (par −1), **Par**, **Bogey** (+1), **Double bogey** (+2), then **+N**. Any clear advances the game; par is mastery, never a gate *(default)*.
- **Time** is the tiebreak on leaderboards (deaths first, then time).

### Splitting (the second verb, from Sublevel 2 on)
- A **cutter beam** splits Pip into two half-size jams. **Swap** (one button) changes which half you control; the other waits where it is.
- Halves fit half-height gaps, jump 75% as high, and leave **half materials** when they die (coat 1 tile, crust 2, fill 2, a half step for splat; pads and ice stay full-size) *(defaults)*.
- A half that dies counts as **one death** and leaves its material; the other half carries on. If both halves die, Pip respawns whole.
- Touching halves merge back into one jam. A split is how you place a death somewhere your living body still needs to leave: **die here, keep going there.**

### Rooms, sublevels and progression
- A **room** is one screen (32 × 18 tiles at 16:9, safe-area aware) with an entry, an exit jar and a par. Rooms chain into a **sublevel**; finishing its last room opens the lift to the next.
- Sublevels are linear inside. A sublevel's **Anomaly** (bonus room) unlocks by finding its 3 **seeds** (§6).
- Leaving a room or retrying resets its materials and death count. Within an attempt, everything you've built stays.

## 4. Controls (semantic actions)

`move.left`, `move.right`, `jump`, `swap`, `retry`, `look` (pan the camera to preview the whole room on rooms larger than one screen; off by default), `ui.confirm`, `ui.back`, `pause`. Keyboard, gamepad and touch all map to them, and the whole boot, menu, sublevel map, room, results, retry and return loop works on every device (rule 10).
- **Keyboard:** arrows or A/D to move, Space, W, Up or Z to jump, X or Shift to swap, R to retry (as in the prototype).
- **Gamepad:** stick or d-pad to move, A to jump, X to swap, Y to retry (hold 0.3 s to avoid accidents), Start to pause.
- **Touch:** landscape-first. Left thumb: a two-button move pad (left, right) with a slide-between gesture; right thumb: a large jump button and a smaller swap button; retry sits top-right. Button size and position are adjustable, and a left-handed mirror exists (rule 11). No hover dependence. Portrait is supported with a smaller board and the controls below it *(default)*; landscape is recommended.

## 5. Structure and content

| # | Sublevel | Teaches | Rooms | New hazards |
|---|---|---|---|---|
| 0 | Intake (Sublevel 7) | Move, jump, die, splat | 4 | Long fall |
| 1 | Impact (Sublevel 6) | Choose where you die | 12 | Spikes |
| 2 | Thermal (Sublevel 5) | Single-use bridges, order | 12 | Fire, vats |
| 3 | Compression (Sublevel 4) | Timing, launch | 12 | Presses, conveyors |
| 4 | Cryogenic (Sublevel 3) | Stillness, building up | 12 | Frost, slick floors |
| 5 | Separation (Sublevel 2) | Splitting | 12 | Cutter beams, half gaps |
| 6 | Power (Sublevel 1) | Strands, switching, everything | 12 | Live wires, powered doors and lifts |
| 7 | The Surface | Composition of everything outdoors | 12 | Wind gusts (move you, never kill) |
| 8 | Home | A gentle walk home | 6 | None |

- **94 main rooms**, plus **7 Anomaly rooms** (one per sublevel 1 to 7), **101 rooms** in all *(default)*. Every room is a hand-built grid. Content §4 has room-by-room briefs for Intake and Sublevel 6 (layout, par, intended solution) and the design brief for every later sublevel; the prototype's six grids are the working references.
- **Set pieces:** each sublevel ends in a **Test Chamber**, a three-screen room where the sublevel's main machine reacts to you (the furnace door opens, the great press descends, the cryo hall freezes over) *(default)*. Same rules; just bigger.
- **Run length:** about 4 to 5 hours to finish, 10+ for all pars, Anomalies and Aces *(default target)*.

## 6. Collectibles and scoring

- **Seeds:** 3 per sublevel, hidden in side pockets that usually cost an extra death to reach. Seeds unlock that sublevel's Anomaly room. Collecting a seed counts as soon as you touch it, even if you then die *(default)*.
- **Scorecard:** per room (best deaths, best time, golf name), per sublevel (total vs total par) and for the whole game.
- **Pins** (cosmetic only): finishing a sublevel at or under total par adds a pin to Pip's jar on the sublevel map *(default)*.

## 7. Post-game

- **Par Run:** play a whole sublevel in one go; deaths and time add up across rooms; leaderboards per sublevel and for the full game.
- **Leaderboards (launch, Mike 2026-10-07):** local bests, share codes (a compact string encoding a room or Par Run result and its replay inputs, so friends can verify and race ghosts) and online boards per room, per sublevel Par Run and full game. Online needs a small backend: *(default)* one serverless leaderboard service shared by all of Mike's games, with replay-input validation through the room bot to reject impossible scores.
- **Ace hunting:** a room list that marks which rooms allow an Ace, unlocked after the credits *(default)*.
- **Room maker (free update after launch, Mike 2026-10-07):** an in-game editor for single-screen rooms using every tile and hazard, with **share codes** (a compressed string) and a par set by the maker clearing it.
- **Shared Graveyard** *(post-launch idea only)*: other players' recent deaths appear as faint marks in your rooms. Needs a backend; out of scope for launch.

## 8. Finale and ending

- **Sublevel 1's Test Chamber:** the facility's main power. Pip strands its own way into the circuit to open the surface hatch: three deaths that light the shaft from below.
- **The Surface:** night storm, then dawn. Fields, a creek, an orchard with thorn hedges, a bonfire, a stone well, a frosted morning meadow and an old mill press. Every hazard is natural and maps to the same materials, so the player re-reads everything they learned.
- **Home:** six quiet rooms with almost no hazards: a porch, a kitchen floor, chair legs, a tablecloth to climb. Par is 0 for every Home room. The last climb ends at the jar.
- **The ending (in-engine, wordless):** Pip pours itself into the jar, the lid settles, and morning light comes through it. Then the scorecard and credits, with every death of the run shown as a teal mark on a single long map of the climb *(default)*.

## 9. Launch content

| Item | Count |
|---|---|
| Rooms | 94 main + 7 Anomaly = 101 |
| Sublevels | Intake, 6 sublevels, the Surface, Home |
| Hazards | 9 (long fall, spikes, fire, vats, presses, frost, cutters, live wires, wind) |
| Materials | 7 plus split |
| Test Chambers | 7 |
| Modes | Story, Par Run, Room maker |

Full data sheets: `revival-jam-content.md`.

## 10. Art direction (summary; full rules in the art bible)

- **Gel against concrete:** Pip and everything made of Pip is the only soft, glowing, translucent thing in a world of hard, matte, brutalist surfaces. Every material is recognizably jam and recognizably different by shape (rule 9).
- **Light carries the climb:** red emergency light, then work light, then daylight, then the sun. Each act has one dominant light color and Pip's teal is never used by the world.
- **Side-on 2.5D:** an orthographic-leaning perspective camera over a 2D gameplay plane, with depth layers behind the room and nothing in front of the play plane except dust and rain.
- **Warm, not cute:** no faces on props, no sugary palette, no exaggerated cartoon outlines.

## 11. Audio

- **Pip is a sound:** soft wet footfalls, a rubbery jump, a satisfying low splat on death, and a distinct tone per material forming (a sizzle for crust, a crystalline crack for ice, a boing for pads, a hum for strands).
- **Music:** sparse, warm and textural: a low synth pad and glassy plucks in the facility, with acoustic instruments (guitar, upright piano) creeping in as daylight arrives, so that Home is fully acoustic.
- **Semantic events:** `jam.step`, `jam.jump`, `jam.land`, `jam.die.<hazard>`, `material.form.<type>`, `material.break`, `pad.bounce`, `strand.power`, `jam.split`, `jam.swap`, `jam.merge`, `seed.collect`, `room.clear`, `room.par`, `room.retry`, `ui.confirm`, `ui.back`. Asset choice, layering and buses live in the audio layer (rule 17). Every audio cue has a visual equivalent (rule 9).

## 12. Tech plan

- **Frame:** the Shell's `platformer` frame and assembly, plus `puzzle` for room state, with `checkpoints` (room entry), `results` (scorecards), `leaderboards` (per-room and Par Run), `progression` (sublevels, seeds, Anomalies), `replay` (`GhostStore` for personal-best ghosts and the optional par ghost assist) and `training` (a room-select practice menu).
- **Renderer:** Three.js through the Shell's `three` adapter, in the game repo only (the Shell stays renderer-neutral). Gameplay is an authoritative 2D tile grid; the 3D scene is a presentation mapping of it (rule 6). Room geometry is generated from the grid with tile-kit meshes (art bible §6).
- **New game module: `DeathMaterials`.** Pure, renderer-free rules: the tile grid, hazards, the death to material table, spread rules, persistence within an attempt, brittle and interaction rules, splits and merges, and par and golf naming. It emits semantic events (`material.form`, `material.break`) that presentation and audio subscribe to. It's a direct promotion of the prototype's `deathAt` / `spreadRun` / `consumePuddle` logic. Portable to C# or GDScript. Likely reuse: **Graverobber** (building from what's left behind), **Drillago** (terrain that changes under you).
- **Room data:** rooms are text grids like the prototype's (one character per tile), plus a small header (par, seeds, set-piece scripts). The same format powers the room maker and share codes.
- **Verification:** a headless bot harness like the prototype's checks in CI that every room is clearable at par and that no room can be cleared under its stated minimum unless it's flagged as an intended Ace or birdie.
- **Saves:** scorecards, seeds, unlocks, settings and room-maker drafts go through Shell persistence with schema versioning from day one (rule 20).
- **Performance:** the worst case is a Test Chamber with 20+ persistent materials, live gel refraction on Pip and two halves, rain and volumetric light on a mid-range phone (rule 14). Materials are instanced. Quality is split into a **Pip tier** and a **world tier** (art bible §9). Default: Pip Medium (fresnel gel), world Medium (shadows, bloom, 1.25× resolution cap). **Target a locked 60 fps on a mid-range laptop with other apps open before adding fidelity**: Mike's look test showed smoothness matters more to feel than the High tier's refraction.

## 13. Platforms, price and release *(defaults, matching the other handoffs)*

1. **Web launch on itch.io**, with Intake and Sublevel 6 as a free demo on web portals.
2. **Steam plus iOS/Android together**, through the shared native wrapper chosen once for every game.

Price defaults: **$12.99 on Steam, $5.99 premium on mobile, $9.99 on itch.** Precision puzzle-platformers sell from $9.99 to $19.99.

## 14. Open decisions

1. The name Pip (internal for now). "Revival Jam" can't ship (Konami); *Preserve* still needs its trademark check.
2. Whether Death Golf returns as a separate game or a bonus mode later.
3. Which backend hosts the online leaderboards (shared with the other games).

## 15. Before launch

- Trademark search on the shipping title.
- Check that Pip's color, silhouette and splat never read as the Revival Jam card (blue slime) or the MapleStory slime.
- Tune every default in playtests (`revival-jam-tuning.md`) and keep the room bot green in CI.

## 16. Build milestones to shelf

1. **Core:** `DeathMaterials`, the movement feel promoted from the prototype, the Three.js presentation of the tile grid with Pip's gel, Intake and Sublevel 6 (16 rooms), retry, par and golf naming, scorecards, and the full Shell loop (boot, menu, room, results, retry, return) on keyboard, gamepad and touch. **Playtest whether dying on purpose feels good to a stranger before building more rooms.**
2. **Sublevels 5 to 3:** fire, vats, presses and frost; their Test Chambers; seeds. This is the portal demo plus the first paid stretch.
3. **Sublevels 2 and 1:** splitting and strands; material interactions in full.
4. **Surface and Home:** natural hazards, the ending, credits.
5. **Post-game:** Anomalies, Par Run, leaderboards, Ace list.
6. **Release readiness:** online leaderboards live, then the Shell's release-readiness pass in full.
7. **Free update:** the room maker with share codes.

## 17. Companion docs

- `revival-jam-content.md`: hazards, materials, the interaction matrix, sublevel briefs and briefs for the first 16 rooms, with semantic IDs.
- `revival-jam-onboarding.md`: the first 16 rooms, beat by beat.
- `revival-jam-tuning.md`: movement numbers, hazard and material numbers, par rules and the room bot.
- `revival-jam-rooms.md`: briefs for all 101 rooms.
- `revival-jam-production.md`: Test Chamber scripts, storyboards, asset list, audio cue sheet, UI flows, save format.
- `revival-jam-art-bible.md`: gel rules, palette, light per act, Pip's acting, materials, the tile kit and the style-frame brief.

## Market check (2026-10-07, from knowledge, not a fresh search)

- **Life Goes On: Done to Death** (2014) uses knights' corpses as tools (freeze, cover spikes, weigh switches) and scores with gold per life spent. It's the closest precedent. Our differences: one character whose death type decides seven distinct materials, material interactions, splitting, golf par, and a narrative climb.
- **Celeste** and **Super Meat Boy** set the single-screen precision room and instant retry standard this game inherits.
- **Gish**, **LocoRoco** and **Tales from Space** own blob movement; Pip's distinctness is the death system, not the blob.
- No known commercial platformer scores deaths as golf strokes against a par.
