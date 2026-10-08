# Revival Jam / Preserve: Tuning Model and Room Bot

First-pass numbers for the builder, and a bot-driven check to set pars. All gameplay values live in one data file so the bot and the game read the same numbers. Units: tiles and seconds.

## 1. Movement (from the prototype; protected feel, rule 5)

| Value | Default | Notes |
|---|---|---|
| Pip size | 0.76 × 0.76 | Halves 0.5 × 0.5 |
| Run speed | 6.5 | Halves 6.0 |
| Ground acceleration / friction | 70 / 60 | Snappy start and stop |
| Air acceleration | 45 | |
| Gravity | 38 | Terminal fall 20 |
| Jump velocity | 13 | About 2.2 tiles high, 4.4 tiles long at full run |
| Jump cut | Velocity × 0.5 on early release | Variable height |
| Coyote time / jump buffer | 0.09 / 0.12 | |
| Respawn delay | 0.45 to 0.55 | Long enough to see the material form |
| Slick floor friction | 8 | Frozen fill, ice floors |
| Half jump | 75% height | About 1.65 tiles |
| Water | Gravity × 0.25, terminal 2.5 | Pip floats down slowly |

**Rule:** every room is designed against these numbers. If movement changes, the room bot re-validates every par.

## 2. Hazards and materials

| Value | Default |
|---|---|
| Splat fall threshold | 7 tiles of free fall (measured from the jump apex or ledge) |
| Coat spread | 3 tiles (half: 1) |
| Crust spread | 4 tiles (half: 2); crumbles when Pip stops standing on it |
| Fill spread | 4 tiles (half: 2) |
| Pad launch | Velocity 21 (about 5.8 tiles) |
| Frost freeze | 0.45 s inside frost at speed below 2.5; the timer decays while moving |
| Strand spread | 4 tiles (half: 2); shorts 1 s after touching water |
| Ice melt near heat | 1.5 s |
| Press cycle | Wait 1.0 s at top, slam at 30 tiles/s, hold 0.35 s, rise at 3.2 tiles/s |
| Wind gust (Surface) | Sideways acceleration 20 (halves 30), 1.5 s gusts every 3 s *(default)*; never kills |
| Fan (powered) | Upward acceleration 50 inside its column, 6 tiles tall |
| Furnace grates (2.12) | Lit 3 s, dark 3 s; relit crust burns away after 1 s unless stood on |
| Great Press plate (3.12) | Descends 1 tile every 6 s |
| Cryo Hall frost creep (4.12) | 1 column every 4 s |
| Hazard fairness | Pip's hazard box is inset 0.1 on each side; standing on solid ground next to spikes never kills |

## 3. Par rules

- **Par** is the death count of the intended solution, set by a human, then checked by the bot.
- **Minimum** is the lowest death count the bot (and playtesters) can find. If the minimum is below par, the room is either fixed or the difference is kept on purpose and labeled as a **birdie room** in its data.
- **Ace rooms** (minimum 0 while par is 1 or more) are allowed only when flagged, and are listed after the credits.
- **Golf names:** Ace, Eagle (−2), Birdie (−1), Par, Bogey (+1), Double bogey (+2), +N.
- **Sublevel total par** is the sum of its rooms. The **game total par** for 101 rooms is about 212 (187 main + 25 Anomaly; `revival-jam-rooms.md`).

### Par curve per sublevel *(targets)*
| Sublevel | Typical room par | Test Chamber par |
|---|---|---|
| Intake | 0 to 2 | none |
| 1 Impact | 1 to 3 | 5 |
| 2 Thermal | 1 to 3 | 5 |
| 3 Compression | 1 to 3 | 5 |
| 4 Cryogenic | 2 to 3 | 6 |
| 5 Separation | 2 to 4 | 6 |
| 6 Power | 2 to 4 | 7 |
| 7 Surface | 2 to 4 | 7 |
| 8 Home | 0 | none |

Difficulty rises through information and execution (rule 19): tighter jumps, longer death orders and more interactions. Never by making rooms longer or adding hazards for their own sake.

## 4. Room bot (CI)

A headless, deterministic runner of `DeathMaterials` plus the movement controller, at a fixed 240 Hz timestep, with no rendering. It's the prototype's harness (`prototypes/revival-jam-wip/test-par.js`) promoted.

- **Solution scripts:** every room ships with its intended solution as a short input script (phases like "run right until x > 5, jump, wait for death"). CI replays it and asserts a clear at exactly par.
- **Minimum search:** a bounded search over death placements (where each death lands, in which order) looks for clears below par. A hit fails CI unless the room is flagged as a birdie or Ace room.
- **Regression:** any change to movement or material numbers re-runs every room.
- **Ghosts:** solution scripts double as the optional par ghost assist (onboarding §7) through `GhostStore`.

## 5. Telemetry for tuning *(default, opt-in)*

Per room: retries before first clear, deaths at first clear vs par, quit points, and time to first death. Rooms where median first-clear deaths are more than double par get a design pass. Rooms where players retry more than 15 times before a first clear get a readability pass before a difficulty pass.
