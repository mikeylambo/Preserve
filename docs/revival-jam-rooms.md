# Revival Jam / Preserve: Room Briefs (all 101)

Companion to `revival-jam-content.md` (Intake and Sublevel 6 are briefed there in §4; this file covers rooms 2.01 to 8.06 and every Anomaly). Each brief gives the layout idea, par and intended solution. The builder authors the grid in the room editor, writes the solution script, and the room bot (tuning §4) confirms par and searches for cheaper clears. **Par numbers are targets; the bot has the final word.** Birdie rooms are flagged on purpose.

Rooms are 32 × 18 tiles unless marked **(3 screens)**. "Low ceiling" means a 1- or 2-tile corridor where full jumps are blocked.

---

## Sublevel 2: Thermal (fire, vats)

| ID | Name | Layout and intended solution | Par |
|---|---|---|---|
| `room.2.01` | Hot Strip | A 4-wide fire strip under a low ceiling. Die in it, cross the crust, watch it crumble behind you | 1 |
| `room.2.02` | Sump Tunnel | A 1-tile tunnel with two 3-wide vats (prototype level 2). Fill each | 2 |
| `room.2.03` | Deep Vat | A vat 2 rows deep, too wide to jump. The first fill sinks below the floor line; the second brings it flush | 2 |
| `room.2.04` | Long Burn | A 14-wide fire floor (prototype level 3). Make crust A, use it to place crust B, re-make A, then cross A to B. Teaches that order matters | 3 |
| `room.2.05` | Seed: Vat Pocket | Main route is one crust. The seed sits above a side vat; filling it lets you reach the seed | 1 (+1 seed) |
| `room.2.06` | Grate Stairs | Five stair steps topped with fire grates. Crust each step in turn; each crumbles as you step up, so the climb must be one clean run | 3 |
| `room.2.07` | Bonded Bridge | A spike field running straight into a fire field. Coat first; crust formed next to coat no longer crumbles (`ix.crust.coat`, introduced here) | 2 |
| `room.2.08` | Birdie: Ember Gap | Fire, vat, fire. Obvious line: crust, fill, crust (3). Birdie: the second fire strip is 4.3 tiles; a full-run jump from the fill's far edge clears it | 3 (birdie 2) |
| `room.2.09` | Furnace Ducts | A low duct with 2-wide fire patches and a vat. Order so no crust you still need gets stepped off early | 3 |
| `room.2.10` | Seed: Double Sump | Main route is one fill. The seed is across a 2-deep side vat | 1 (+2 seed) |
| `room.2.11` | Order of Burning | Two long fire floors with a vat between them; crust B can only be placed from crust A, and A is needed again after | 4 |
| `room.2.12` | Test Chamber: The Furnace **(3 screens)** | Grate floors are lit while the furnace door is open (3 s) and dark when it's shut (3 s). Dying on a lit grate makes crust; a crust over a grate that relights burns away after 1 s unless you're on it. Cross in rhythm | 5 |
| `room.2.A` | Anomaly: Ember Run | One 18-wide fire floor and a ceiling with gaps. Pure crust ordering | 4 |

## Sublevel 3: Compression (presses, conveyors)

| ID | Name | Layout and intended solution | Par |
|---|---|---|---|
| `room.3.01` | First Press | Exit on a high ledge; a press beside it (prototype level 4). Jam it, bounce up | 1 |
| `room.3.02` | Belt Feed | A conveyor carries you under a press. Let it; the pad then launches you up a shaft at the belt's end | 1 |
| `room.3.03` | Which Press | A short press (jams low, blocks its own shaft) and a tall press (jams clear). Only the tall one's pad gets you out | 1 |
| `room.3.04` | Pad Chain | Two presses at two heights up a tall room; the first pad reaches the second press | 2 |
| `room.3.05` | Seed: Housing | Main route is one pad. The seed sits on top of a press housing, reached from a second pad | 1 (+1 seed) |
| `room.3.06` | Spike Press | Spikes, then a press, then a high ledge (prototype level 6) | 2 |
| `room.3.07` | Belt to Spikes | A belt running into spikes. The first death coats them; the belt then carries you over the coat and under a press | 2 |
| `room.3.08` | Birdie: Overleap | Obvious line: coat, pad, pad (3). Birdie: the first pad's arc clears the spike field, so the coat isn't needed | 3 (birdie 2) |
| `room.3.09` | Splat or Pad | A long drop onto a press bay. Fall while the press is down and it kills you (pad); fall while it's up and you splat (wasted step). Timing decides the material | 1 |
| `room.3.10` | Seed: Stacked | A splat step plus a pad reach a high seed shelf | 2 (+1 seed) |
| `room.3.11` | Hot Belt | A belt carries you across a crust over fire (it crumbles behind you) into a press bay | 2 |
| `room.3.12` | Test Chamber: The Great Press **(3 screens)** | A ceiling-wide plate made of press teeth descends 1 tile every 6 s. Each tooth you jam stops in a raised notch and leaves a pad below. Build a staircase of notches up through the plate to the exit above it | 5 |
| `room.3.A` | Anomaly: Piston Organ | Six presses with offset timings and one belt. Only one jam is needed; the rest is timing | 1 |

## Sublevel 4: Cryogenic (frost, slick floors, first interactions)

| ID | Name | Layout and intended solution | Par |
|---|---|---|---|
| `room.4.01` | First Frost | A frost pocket against a high wall (prototype level 5). Freeze, climb, freeze, climb | 2 |
| `room.4.02` | Slide and Stop | A slick floor ending at a wall inside frost. Slide in, hold still against the wall, freeze in exactly the right column | 1 |
| `room.4.03` | Ice Stairs | Two adjacent frost columns. Build a stair (low block in one column, two-high in the next) rather than a tower you can't climb | 3 |
| `room.4.04` | Thaw | A vat beside a burner, under frost. Ice over the vat next to heat melts into fill (`ix.heat.ice`) | 1 |
| `room.4.05` | Launch | A press (pad) under frost, beneath an overhang. Freeze on the pad; the block launches up and sticks under the overhang as a ledge (`ix.pad.ice`) | 2 |
| `room.4.06` | Seed: Keep Moving | The seed is deep in a frost pocket. Moving keeps you alive; stop and you freeze (one extra death) | 0 (+0 seed if you keep moving) |
| `room.4.07` | Frozen Sump | A vat inside frost: its fill turns slick (`ix.frost.fill`). Use the slide to cross frost without stopping | 2 |
| `room.4.08` | Birdie: Splat on Ice | Obvious line: three ice blocks (3). Birdie: a long fall onto one ice block stacks a splat on it | 3 (birdie 2) |
| `room.4.09` | Hard Coat | Spikes beside a burner: the coat hardens permanent (`ix.heat.coat`) and holds where ice would melt | 2 |
| `room.4.10` | Seed: Overhang | A pad-launched ice block makes the ledge to a high seed | 2 (+1 seed) |
| `room.4.11` | Cold Chain | An ice step and a crust bridge side by side: the crust melts the step. Use the step first, then crust | 3 |
| `room.4.12` | Test Chamber: The Cryo Hall **(3 screens)** | Frost creeps left to right one column every 4 s, turning fill slick as it passes. Freeze your stairs ahead of it before the far side closes | 6 |
| `room.4.A` | Anomaly: Absolute Zero | An all-frost room with one burner. Every block you build has to stay clear of the heat | 4 |

## Sublevel 5: Separation (cutters, halves)

| ID | Name | Layout and intended solution | Par |
|---|---|---|---|
| `room.5.01` | First Split | A cutter at the entry. Two paths: one through half gaps. Swap, bring both halves to the exit (or merge first) | 0 |
| `room.5.02` | Leave a Piece | A spike field with a single gap the active half can't jump. The other half dies there for a 1-tile coat stepping stone | 1 |
| `room.5.03` | Half Gaps | A half-gap maze into a 2-wide vat; one half fills it, the other walks on | 1 |
| `room.5.04` | Die Here, Go There | Half A jams a press (pads are full-size); half B bounces up to the exit | 1 |
| `room.5.05` | Seed: Small Door | The seed is behind a half gap; merge afterward to clear a whole-height jump | 0 (+0 seed) |
| `room.5.06` | Resplit | Two cutters. Merge between them so you split again in a better position (a half that crosses a cutter dies, leaving nothing) | 1 |
| `room.5.07` | Small Fill | A 4-wide vat behind a half gap. Two half fills (2 tiles each) | 2 |
| `room.5.08` | Birdie: Whole Again | Obvious line: two half coats (2) plus a fill (3). Birdie: merge first and make one whole coat (3 tiles) | 3 (birdie 2) |
| `room.5.09` | Half Steps | Half splats are half-height steps; build a stair only halves can climb | 2 |
| `room.5.10` | Seed: Spike Pocket | One half coats a 1-tile spike pocket; the other gets the seed | 1 (+1 seed) |
| `room.5.11` | Two Places at Once | Two half materials are needed in two spots only halves can reach. Both halves die (2 deaths), Pip respawns whole, and the whole Pip uses both materials | 2 |
| `room.5.12` | Test Chamber: The Separator **(3 screens)** | A rotating cutter array splits and resplits you; the exit needs every living half home. Keep both halves alive and herd them through | 6 |
| `room.5.A` | Anomaly: Halves Apart | The halves start on opposite sides of the room and never meet until the exit | 3 |

## Sublevel 6: Power (live wires, doors, lifts, fans, water)

| ID | Name | Layout and intended solution | Par |
|---|---|---|---|
| `room.6.01` | First Strand | A dead door with a wire gap beside it. Die in the gap; the strand powers the door | 1 |
| `room.6.02` | Lift | A strand powers a lift up a shaft | 1 |
| `room.6.03` | Tightrope | A cutter, then a wire gap over a pit. A half dies to strand the gap; the other half walks the strand | 1 |
| `room.6.04` | Water Short | A strand touching water opens its door for 1 s before shorting. Be ready to run | 1 |
| `room.6.05` | Seed: Updraft | A strand powers a fan that lifts you to a seed shelf | 1 (+1 seed) |
| `room.6.06` | Two Circuits | Two doors, one wire each | 2 |
| `room.6.07` | Powered Press | A strand powers a dead press motor (`ix.strand.press`); then jam it for a pad | 2 |
| `room.6.08` | Birdie: Short Gap | Obvious line: three whole strands (3). Birdie: a half strand fits the narrow gap and frees a death | 3 (birdie 2) |
| `room.6.09` | Flooded Deck | Water slows your fall; strands short in it. Build ice on the water's edge to keep a strand dry | 2 |
| `room.6.10` | Seed: Lift and Crust | A powered lift carries you over fire; crust the landing | 2 (+1 seed) |
| `room.6.11` | Everything | Spikes, fire, a press, frost, a cutter and a wire in one room | 4 |
| `room.6.12` | Test Chamber: The Main Breaker **(3 screens)** | Three breakers with wire gaps across the climb to the surface hatch. Each strand lights a section of the shaft from below | 7 |
| `room.6.A` | Anomaly: Short Circuit | Every strand is near water; timing and ice keep them alive | 4 |

## Sublevel 7: The Surface (natural hazards, wind, storm to dawn)

| ID | Name | Layout and intended solution | Par |
|---|---|---|---|
| `room.7.01` | The Hatch | Out into a night storm. Lightning flashes reveal a thorn hedge; coat it | 1 |
| `room.7.02` | Fence Line | Wind gusts across fence posts push you; time jumps between gusts | 1 |
| `room.7.03` | Bonfire | Bonfire coals (fire) across a farm track; crust and keep moving | 2 |
| `room.7.04` | Old Well | A deep stone well (2 fills) | 2 |
| `room.7.05` | Seed: Hollow Tree | A thorn coat into a hollow tree trunk | 1 (+1 seed) |
| `room.7.06` | Orchard | Thorn hedges between trees; splat from the branches | 3 |
| `room.7.07` | Fallen Line | A downed power line across puddles; strands short in the water unless you freeze the puddle edge first | 2 |
| `room.7.08` | Birdie: Carried | Obvious line: 3. Birdie: split and let the wind carry the light half across | 3 (birdie 2) |
| `room.7.09` | Frost Meadow | At dawn, frost lasts only until the sunlight line reaches it (frost tiles clear as the light moves). Freeze before the sun arrives | 3 |
| `room.7.10` | Seed: Creek | A creek with stepping stones; ice extends them | 2 (+1 seed) |
| `room.7.11` | Last Hill | Every hazard in natural form on the climb to the ridge | 4 |
| `room.7.12` | Test Chamber: The Mill **(3 screens)** | The old mill press and waterwheel. Strands short in the race; pads off the press launch you onto the roof; the farmhouse comes into view at the top | 7 |
| `room.7.A` | Anomaly: Long Way Round | A sprawling night room with every Surface hazard | 5 |

## Sublevel 8: Home (no hazards, par 0)

| ID | Name | Layout |
|---|---|---|
| `room.8.01` | Porch | Three porch steps and a screen door left ajar. Morning birds |
| `room.8.02` | Kitchen Floor | A long walk across sunlit floorboards; nothing can hurt you here |
| `room.8.03` | Chair | Climb the chair's rungs and seat |
| `room.8.04` | Tablecloth | Climb the folds of a checked tablecloth |
| `room.8.05` | Table | Crumbs, a sugar bowl, a coffee cup, and the jar ahead |
| `room.8.06` | The Jar | The final hop to the jar's rim. Entering plays the ending |

Home has no splat danger: no fall in Home is 7 tiles or more.

## Par summary *(targets)*

| Sublevel | Rooms | Total par |
|---|---|---|
| 0 Intake | 4 | 4 |
| 1 Impact | 12 + A | 25 + 4 |
| 2 Thermal | 12 + A | 30 + 4 |
| 3 Compression | 12 + A | 23 + 1 |
| 4 Cryogenic | 12 + A | 27 + 4 |
| 5 Separation | 12 + A | 20 + 3 |
| 6 Power | 12 + A | 27 + 4 |
| 7 Surface | 12 + A | 31 + 5 |
| 8 Home | 6 | 0 |
| **Total** | **101** | **187 main + 25 Anomaly = 212** |
