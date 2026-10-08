# Revival Jam / Preserve: Content Data Sheets

Companion to `revival-jam.md`. Every row has a semantic ID so the builder can load it as data (rule 7). Numbers are first-pass defaults; `revival-jam-tuning.md` governs them. Tiles are 1 unit; rooms are 32 × 18 tiles.

---

## 1. Hazards and the materials they leave

| Hazard ID | Kills when | Material ID | Material rule |
|---|---|---|---|
| `hazard.fall` | Landing after falling 7+ tiles | `mat.splat` | One solid tile at the landing cell, on top of the ground. Stacks if you splat onto a splat (still needs a 7-tile fall) |
| `hazard.spikes` | Pip sinks into the spike tile | `mat.coat` | Converts up to 3 contiguous spike tiles (centered on the death) to solid, walkable coat |
| `hazard.fire` | Pip touches a fire tile | `mat.crust` | Converts up to 4 contiguous fire tiles to solid crust. Crumbles back to fire the moment Pip is no longer standing on it (jumping off counts). Single use |
| `hazard.vat` | Pip sinks into a pit or vat tile | `mat.fill` | Fills up to 4 contiguous pit tiles in that row, flush with the floor. If the pit is deeper, the row above becomes the new surface of the vat |
| `hazard.press` | The press head overlaps Pip | `mat.pad` | The press jams at the top for good; the floor tiles under its footprint become bounce pads (launch 5.8 tiles) |
| `hazard.frost` | Pip holds nearly still inside frost for 0.45 s | `mat.ice` | One solid ice block at Pip's feet cell (the frost there is used up) |
| `hazard.wire` | Pip touches a live wire or arc gap | `mat.strand` | A jam strand fills the wire gap (up to 4 tiles) and conducts: whatever the wire powers stays on while the strand exists. Solid only for halves (a half can walk a strand like a tightrope) |
| `hazard.cutter` | Pip crosses a cutter beam | (none) | Splits Pip into two halves (§3). A half crossing a cutter dies and leaves nothing *(default)* |
| `hazard.void` | Falling off the bottom of the room | (none) | Nothing. A wasted death |

**Wind** (`env.wind`, the Surface only) pushes Pip and halves sideways and never kills. It also carries halves farther than whole Pip.

### Half materials (when a split half dies)
| Material | Whole | Half |
|---|---|---|
| Splat | 1 tile | Half-height step (0.5 tile) |
| Coat | 3 tiles | 1 tile |
| Crust | 4 tiles | 2 tiles |
| Fill | 4 tiles | 2 tiles |
| Pad | Full press footprint | Full (the press jams either way) |
| Ice | 1 block | 1 block |
| Strand | Up to 4 tiles | Up to 2 tiles |

## 2. Material interactions (introduced one at a time; first room in `revival-jam-rooms.md`)

First rooms: `ix.crust.coat` 2.07, `ix.heat.ice` 4.04, `ix.pad.ice` 4.05, `ix.frost.fill` 4.07, `ix.heat.coat` 4.09, `ix.strand.press` 6.07, `ix.water.strand` 6.04, `ix.press.ice` Cryo Hall 4.12. Applied the moment a material forms or a neighbor changes. All are deterministic grid rules in `DeathMaterials`.

| ID | Interaction | Result |
|---|---|---|
| `ix.heat.ice` | Ice orthogonally next to fire, or touching crust | Melts in 1.5 s. Over a pit it becomes fill; otherwise it's gone |
| `ix.heat.coat` | Coat next to fire | Hardens into permanent stone-like coat (no longer flammable) *(default)* |
| `ix.crust.coat` | Crust formed next to coat | The crust no longer crumbles (the coat holds it) |
| `ix.pad.ice` | An ice block formed on a pad | The block launches straight up until it hits something, then sticks there |
| `ix.press.ice` | An unjammed press comes down on ice | The press stops on the ice for good (jammed, no pad) |
| `ix.frost.fill` | Fill inside frost | Freezes into slick ice floor (you slide; see tuning §1) |
| `ix.water.strand` | A strand touching water | Shorts out after 1 s and is gone |
| `ix.strand.press` | A strand powering a press motor | The press runs while the strand exists, and stops when it shorts |

## 3. Splitting rules

| Rule | Value |
|---|---|
| Split trigger | Whole Pip crosses `hazard.cutter`; the halves appear on either side of the beam |
| Control | One active half; `swap` changes it; the idle half holds still and is affected by gravity and wind |
| Half size | 0.5 × 0.5 tile; fits half-height gaps (`tile.gap.half`) |
| Half jump | 75% of whole Pip's height |
| Half deaths | Count 1 each toward par; leave half materials (§1) |
| Merge | Touching halves merge into whole Pip at the active half's position |
| Both dead | Pip respawns whole at the room entry |
| Seeds and exits | Either half can collect a seed. The exit jar needs **all living mass**: if one half is alive elsewhere, the jar waits for it *(default)* |

## 4. Rooms

Room IDs are `room.<sublevel>.<nn>`. Pars are first-pass and get set for real by the room bot (tuning §4). The prototype's six rooms (`prototypes/revival-jam-death-par.html`) are working references for 1.01, 1.02, 2.02, 3.01, 4.01 and 3.12.

### Sublevel 0: Intake (4 rooms, teaches move, jump, die)
| ID | Brief | Par |
|---|---|---|
| `room.0.01` | The cracked specimen jar. Walk out of the jar, hop two ledges. No hazards. The exit jar is in plain sight | 0 |
| `room.0.02` | A tall drop shaft into the dark. The only way down kills you: you splat at the bottom and respawn at the top, and now there's a step at the bottom that reaches the exit door | 1 |
| `room.0.03` | Two shafts: one short (safe), one long (splat). The exit ledge needs a step at the foot of the long shaft only | 1 |
| `room.0.04` | Stack it: a ledge 3.5 tiles up from the floor of a long shaft (out of jump reach). Splat once to build a step, then splat again onto it to build a second | 2 |

### Sublevel 1: Impact (12 rooms, spikes and choosing where to die)
| ID | Brief | Par |
|---|---|---|
| `room.1.01` | A spike floor too wide to jump. Jump in as far as you can; your coat is the stepping stone (prototype level 1) | 1 |
| `room.1.02` | The same width, but a low ceiling stops high jumps. You have to die nearer, twice | 2 |
| `room.1.03` | Spikes on a wall. A coat on wall spikes is a solid ledge to stand on | 1 |
| `room.1.04` | A spiked pit 3 deep under a splat shaft: splat onto the spikes and the coat appears, saving a death | 1 |
| `room.1.05` | Seed room: the seed sits above spikes in a side pocket; reaching it costs one extra death | 1 (seed +1) |
| `room.1.06` | Two spike fields; one coat bridges the first, and a splat from a high ledge clears the second | 2 |
| `room.1.07` | A spiked ceiling over a long gap. Jump into the ceiling spikes to coat them, then a ceiling coat stops your jump from going too high | 1 |
| `room.1.08` | A Birdie lesson: par 3 the obvious way, 2 if you notice one coat can serve two crossings | 3 |
| `room.1.09` | Spike stairs: each step is spiked. Coat them bottom to top | 3 |
| `room.1.10` | Seed room: a long fall onto spikes leaves a coat at the bottom of a shaft that hides the seed | 2 (seed) |
| `room.1.11` | A spike corridor with one-tile ceilings: die in exactly the right three spots | 3 |
| `room.1.12` | **Test Chamber: the Impact Hall.** Three screens of spikes and drop shafts. A great ceiling plate lowers over time, cutting off splat heights, so early deaths have to be the high ones | 5 |
| `room.1.A` | **Anomaly:** one wide spike field and a ceiling. Par 4; an Ace exists for a perfect corner-clip jump | 4 |

### Sublevel briefs (rooms 2.01 to 8.06)

Every later room, Anomaly included, is briefed one by one in **`revival-jam-rooms.md`**. The table below is the summary.

Each later sublevel is 12 rooms: about 4 that teach its new hazard, 4 that combine it with what came before, 2 seed rooms, a birdie room, and its Test Chamber. Briefs list the beats the builder must hit; individual rooms are authored in the room editor during milestones 2 to 4.

| Sublevel | Must-hit beats | Test Chamber |
|---|---|---|
| **2 Thermal** (fire, vats) | Crust as a single-use bridge (prototype level 3); fill a vat to cross a tunnel (prototype level 2); order puzzles where using one crust destroys the route to the next; crust plus coat; deep vats needing two fills | **The Furnace:** the furnace door opens and closes on a cycle; crust only holds over the grate while it's shut |
| **3 Compression** (presses, conveyors) | Jam a press for a pad (prototype level 4); conveyors that carry you into presses; a pad under a high ledge; two presses where jamming the wrong one blocks the other; spikes plus presses (prototype level 6) | **The Great Press:** a ceiling-wide press slowly descends; each pad you make holds a column of it up |
| **4 Cryogenic** (frost, slick floors) | Freeze into an ice step (prototype level 5); stack ice by standing on ice; slide on frozen fill; heat melts ice (`ix.heat.ice`); a pad launches an ice block (`ix.pad.ice`) | **The Cryo Hall:** frost creeps across the room over time; freeze your path before it closes |
| **5 Separation** (cutters, half gaps) | First split and swap; a half dies to place a coat while the other half reaches the exit; half gaps; half materials are smaller (half crust, half fill); merging back to make a whole splat height | **The Separator:** a rotating cutter array splits and resplits you; the exit needs every half home |
| **6 Power** (live wires, doors, lifts, fans) | A strand bridges a wire gap to open a door; a strand powers a lift that carries you up; a half walks a strand as a tightrope; strands short out in water; everything combined | **The Main Breaker:** three strands across three breakers light the shaft and open the surface hatch |
| **7 The Surface** (thorns, bonfires, wells, frost meadows, the mill press, wind) | Every earlier hazard in natural form; wind carries halves; storm-night rooms lit only by Pip and lightning; a dawn meadow where frost lasts only until the sun reaches it | **The Mill:** the old mill press and waterwheel; strands short in the race, pads launch you onto the roof |
| **8 Home** (6 rooms, no hazards) | Porch steps, the kitchen floor, chair legs, the tablecloth, the table, the jar. Par 0 everywhere. Gentle, quiet and short | None: the ending |

## 5. Tiles

| ID | Char | What it is |
|---|---|---|
| `tile.empty` | `.` | Air |
| `tile.solid` | `#` | Concrete, rock, wood (per sublevel kit) |
| `tile.gap.half` | `h` | Solid with a half-height opening at the bottom; only halves pass |
| `tile.spikes` | `^` | Spikes (thorns on the Surface) |
| `tile.fire` | `f` | Fire (grates, burners, bonfire coals) |
| `tile.vat` | `v` | Pit or vat surface (acid, sludge, well water) |
| `tile.frost` | `*` | Frost air (non-solid) |
| `tile.wire` | `w` | Live wire gap (non-solid) |
| `tile.water` | `~` | Water (non-lethal, shorts strands, Pip floats slowly) |
| `tile.conveyor.l`, `.r` | `<` `>` | Conveyors |
| `tile.slick` | `s` | Slick floor (frozen fill, ice) |
| `tile.door` | `D` | Powered door (opens while powered) |
| `tile.lift` | `L` | Powered lift platform |
| `actor.press` | `K` | Press head start (contiguous Ks form one press) |
| `actor.cutter` | `|` | Cutter beam (vertical) |
| `marker.spawn` | `S` | Room entry |
| `marker.exit` | `E` | Exit jar |
| `marker.seed` | `o` | Seed |

Material tiles written at runtime: `c` coat, `b` crust, `j` fill, `p` pad, `i` ice, `t` strand, `x` splat.

## 6. Seeds and unlocks

| Unlock | When |
|---|---|
| Sublevel Anomaly | All 3 seeds in that sublevel |
| Par Run | Finish the game |
| Ace list | Finish the game |
| Room maker | Finish Sublevel 3 *(default)* |
| Pins on the jar | Finish a sublevel at or under total par |
| Photo plates in the sublevel offices (cosmetic, sunnier each time) | Automatic on arrival |

## 7. Rules precedence (edge cases)

Resolved in this order every fixed step by `DeathMaterials`, so every device and the room bot agree.

| Case | Rule |
|---|---|
| Two hazards in the same step | Priority: press > cutter > wire > fire > spikes > vat > frost > fall > void. The highest one decides the material |
| Long fall that lands on spikes, fire, a vat or a wire | The hazard wins (a fall onto spikes makes a coat, not a splat) |
| Long fall onto a pad | No death: the pad bounces you (pads absorb any fall) |
| Long fall into water | No death |
| Spread run shorter than the material's spread | Only the contiguous hazard tiles convert; the material never spreads onto other tile types |
| Death on a hazard tile that is already a material | Impossible: materials are solid, so Pip can't be inside one |
| Material forming where Pip's respawn point is | The entry cell is never converted; spread skips it |
| A half standing on crust while the other half is active | Crust crumbles when no living Pip or half is standing on it. An idle half standing on crust keeps it intact |
| Material forming under an idle half | The half is pushed up onto the new surface |
| Press coming down on an idle half | The half dies (pad forms as normal) |
| Press coming down on a splat or ice | Ice: the press jams on it with no pad (`ix.press.ice`). Splat: the press crushes the splat flat (gone) and keeps running |
| Splat onto splat | Stacks (a 7-tile fall is still needed) |
| Ice forming at a cell Pip's other half occupies | The freeze moves to the nearest empty frost cell; if none, no ice forms and the death still counts |
| Strand formed, then the wire's source is cut by another material | Power follows connectivity each step; a strand that's no longer connected stops powering |
| Retry while halves are split | Retry resets the whole room: one whole Pip, zero deaths, original grid |
| Seed collected, then death in the same attempt | The seed stays collected |
| Exit jar reached by one half while the other is alive | The jar holds the first half and waits for the rest (the room clears when all living mass is in) |
| Pause during a death | Death resolves (the material forms) before the pause menu opens |
