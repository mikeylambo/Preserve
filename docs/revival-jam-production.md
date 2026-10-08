# Revival Jam / Preserve: Production Sheets

Companion to `revival-jam.md`. Everything a builder needs beyond rules and rooms: the seven Test Chamber scripts, the storyboards, the asset list, the audio cue sheet, UI screens and flows, and the save format. Mike's four production calls are recorded in §7.

---

## 1. Test Chamber scripts

Each Test Chamber is 3 screens wide (96 × 18 tiles), pans with Pip, and has one machine that changes the room over time. The machine is presentation-heavy but its state is a deterministic timeline in `DeathMaterials` (rule 6), so retries and the room bot see the same thing.

| Chamber | Room | Machine timeline | Ends when |
|---|---|---|---|
| **Impact Hall** | 1.12 | A ceiling plate starts 16 tiles up and lowers 1 tile every 8 s, to a floor of 4 tiles above the ground. As it lowers, the tall drops that make splats disappear, so the high deaths must happen first | Pip reaches the exit jar on the far right; the plate stops and lifts with a hiss |
| **The Furnace** | 2.12 | The furnace door cycles: open 3 s (grates lit), shut 3 s (grates dark). A crust over a relit grate burns away after 1 s unless Pip is on it | Exit jar above the furnace mouth; the door slams shut for good behind Pip |
| **The Great Press** | 3.12 | A ceiling-wide plate made of 1-tile press teeth descends 1 tile every 6 s. A tooth that kills Pip jams in a raised notch and leaves a pad beneath. The exit is above the plate | Pip passes through a notch; the plate stops |
| **The Cryo Hall** | 4.12 | Frost creeps left to right one column every 4 s; fill it passes becomes slick. Burners along the way melt ice near them | The frost reaches the right wall; if Pip's out, the hall freezes solid behind |
| **The Separator** | 5.12 | A cutter array rotates 90° every 5 s around three hubs. Halves crossing a beam die with no material | All living halves reach the exit jar |
| **The Main Breaker** | 6.12 | Three breakers with wire gaps up a tall shaft (this chamber scrolls vertically: 32 × 54). Each strand lights one third of the shaft and powers a lift section | The third strand powers the surface hatch; daylight floods in |
| **The Mill** | 7.12 | The waterwheel turns the mill press (cycle 2.5 s); the race water shorts strands; wind gusts on the roof | Pip reaches the roof ridge; the farmhouse appears in the distance at dawn |

## 2. Storyboards (in-engine, wordless)

### Opening (6 s, plays once; skippable on replays)
1. Black. A faint teal glow.
2. Slow push-in: the glow is a jar on a steel shelf in a dark room. Pip floats inside, still.
3. A drip from the ceiling hits the lid. A crack runs down the glass with a sharp tick.
4. The glass gives. Pip slumps out onto the floor, wobbles, and its seed-eyes blink open and look around.
5. Control is handed over on room 0.01 with no cut.

### The intake photo (room 0.01, 1 s, first time only)
- As Pip passes the intake desk, the camera eases toward a handwritten sample label (unreadable) and a faded photo of a farmhouse kitchen with a jam jar on a sunny table. It then eases back. No prompt, no pause.

### Between sublevels (the lift, 4 s)
- Pip steps onto the lift. The camera pulls back to the cross-section map as a small lit window climbs one floor. The next sublevel's light color washes over the screen. In each sublevel's office there's the same kitchen photo, sunnier and closer each time.

### Breaking out (end of 6.12 into 7.01, 8 s)
1. The third strand sparks; the hatch above grinds open.
2. Rain falls in through the hatch. A lightning flash shows sky for the first time.
3. Pip climbs out into a field at night. The storm is loud, then the music drops out. Control resumes.

### The farmhouse (end of 7.12, 5 s)
- From the mill roof at dawn, the camera rises to show the farmhouse across the field with one lit window. Cut to 8.01.

### Ending (after 8.06, about 40 s)
1. Pip reaches the rim of the jar on the table. A pause; the seed-eyes look in.
2. Pip pours itself in, slowly, filling the jar. A soft glass chime.
3. The lid settles on its own. Morning light passes through the teal jar onto the tablecloth.
4. Hold. A hand-written label on the jar is shown clearly for the first time: it matches the sample label from the intake room *(default: the label shows only a drawn fruit and a date, no words)*.
5. Fade to the scorecard, then credits over a slow scroll of the whole climb as one long cross-section, with a teal mark at every place the player died *(default)*.

## 3. Asset list

Art production (Mike, 2026-10-07): **code-built** geometry and shaders in Three.js, plus a small set of painted textures (concrete, wood, the photo and labels).

| Group | Items | Notes |
|---|---|---|
| **Pip** | Gel shader (3 tiers), body mesh with blend shapes for squash and stretch, two seed-eyes (blink, look), splat burst, droplet trail, halves | The visual hook. Build the look test first (§8) |
| **Materials** | Splat, coat, crust, fill, pad, ice, strand (each with form, idle and break animations) | Silhouettes per art bible §5 |
| **Hazards** | Spikes, fire grate and flame, vat surface, press (housing, rod, head), frost volume, wire and arc, cutter beam and emitters, conveyor, water, fan | Each reads by shape first |
| **Tile kits** | Intake, Impact, Thermal, Compression, Cryogenic, Separation, Power (concrete family); Surface (stone, wood, hedge, coals, well, meadow, mill); Home (floorboards, chair, tablecloth, table) | Generated from the grid: edge, corner and inner pieces per kit |
| **Story props** | Specimen jar (intact, cracked), intake desk, label, photo (5 versions, sunnier), lift, office desks and chairs, clipboards with pictograms, coffee cups, coat hooks, test placards (pictograms only), farmhouse, jam jar | Non-gameplay; never block readability |
| **Backgrounds** | 3 depth layers per sublevel: near architecture, machine hall, far shaft | Parallax only on room pans |
| **Lighting rigs** | One per act (art bible §7) | Volumetric on high tier only |
| **UI** | Drop and flag icons, seed pips, scorecard tag, sublevel cross-section map, pause and settings, room maker palette | Wordless where possible |
| **VFX** | Splat, material form per type, crust crumble, pad squash, ice crackle, strand pulse, split and merge, seed glint, jar entry | Capped flash brightness |

## 4. Audio cue sheet

### SFX (each is a semantic event; variants in brackets)
| Event | Sound |
|---|---|
| `jam.step` | Soft wet pat (4 variants; per surface: concrete, steel, wood, grass) |
| `jam.jump` / `jam.land` | Rubbery stretch / plop with a short ripple |
| `jam.die.fall` | A heavy low splat |
| `jam.die.spikes` | A quick puncture into a splat |
| `jam.die.fire` | A sizzle into a splat |
| `jam.die.vat` | A deep gloop |
| `jam.die.press` | A clank and a squash |
| `jam.die.frost` | A rising crystalline crackle |
| `jam.die.wire` | An electric snap into a hum |
| `jam.split` / `jam.merge` | A slice and a wet tear / a squelch and a satisfied pop |
| `material.form.<type>` | Per material: settle (splat), smooth skin (coat), crackle (crust), slosh (fill), boing tick (pad), crystal ring (ice), hum (strand) |
| `material.break` | Crust crumble; ice melt drip; strand short fizz |
| `pad.bounce` | Deep boing with a rising pitch |
| `seed.collect` | A bright pluck |
| `room.clear` | A glass chime and a cork pop (the jar) |
| `room.par` / `room.birdie` | A short warm sting / a brighter sting |
| `room.retry` | A quick rewind swish |
| `ui.confirm` / `ui.back` | Soft glass tap / lower tap |

### Music (stems; layers react to the room, never to deaths)
| Act | Palette | Notes |
|---|---|---|
| Intake | A single low pad and Pip's heartbeat-like pulse | Near silence |
| 1 to 2 | Low synth pad, glassy plucks, a slow alarm-tone motif turned into melody | Red light |
| 3 to 4 | Mechanical rhythms from the machines in the mix, sodium hum | Industrial |
| 5 to 6 | The first acoustic notes (a felt piano) under the synths | The surface is near |
| 7 | Storm ambience, then acoustic guitar and soft strings at dawn | Open air |
| 8 | Fully acoustic: piano, guitar and a music-box version of the main motif | Home |
| Test Chambers | The act's stems with a driving percussion layer tied to the machine's timeline | |
| Ending | The main motif, full and slow | |

All cues route through the Shell audio layer's buses (music, SFX, ambience, UI) with fallbacks (rule 17). Every sound has a visual equivalent (rule 9).

## 5. UI screens and flows

`Boot → Title → (first time: Opening → room 0.01) / (returning: Sublevel map) → Room → Scorecard → next room or retry → … → Lift → Sublevel map → … → Ending → Credits → Sublevel map (post-game)`

| Screen | Contents | Back goes to |
|---|---|---|
| Title | Logo, Begin/Continue, Settings, Quit (desktop) | — |
| Sublevel map | Facility cross-section; rooms as windows (lit = cleared, pin = at par); seeds per sublevel; Anomaly doors; Par Run and room maker entries once unlocked | Title |
| Room | The game; HUD corner (deaths, par, seeds); pause on Start/Esc/top-right tap | Pause |
| Pause | Resume, Retry, Room select (this sublevel), Settings, Sublevel map | Room |
| Scorecard | Golf name, deaths vs par, time, personal best, ghost toggle; Next, Retry | Next room |
| Settings | Controls (rebind; touch layout editor), Audio (4 buses), Video (quality tier, reduce motion, reduce flash), Accessibility (assists from onboarding §9, material outlines), Language | Previous |
| Par Run | Pick a sublevel or the full game; local, friends (share codes) and online leaderboards | Map |
| Room maker | Grid editor, tile palette, test play, set par by clearing, export/import share code | Map |
| Credits | Scroll over the climb | Map |

Every screen is fully usable by keyboard, gamepad and touch with a visible focus state and a sensible default focus (rule 10).

## 6. Save format

One versioned save through Shell persistence (rule 20), schema version 1 from day one.

```
save.v1 {
  version: 1,
  settings: { controls, touchLayout, audio{music,sfx,ambience,ui}, video{tier,reduceMotion,reduceFlash}, assists{...}, language },
  progress: { reachedRoom, sublevelsUnlocked[], seeds{roomId: true}, anomaliesUnlocked[], gameFinished, endingSeen },
  rooms: { roomId: { cleared, bestDeaths, bestTimeMs, assisted } },
  parRuns: { sublevelId: { bestDeaths, bestTimeMs } },
  maker: { drafts[ {id, name, grid, par, updatedAt} ] },
  stats: { totalDeaths, deathsByHazard{...}, playTimeMs }
}
```

- Room records are keyed by stable room IDs, so reordering rooms never breaks saves.
- Changing a room's par after launch keeps `bestDeaths` and recomputes the golf name.
- A migration function per version bump; unknown fields are kept, not dropped.

## 7. Calls made (Mike, 2026-10-07)

1. **Art production:** code-built geometry and shaders.
2. **Leaderboards:** local, share codes and online, all at launch.
3. **Title and face:** *Preserve*, with seed-eyes.
4. **Room maker:** free update after launch.

## 8. Pre-handoff prototypes

1. **Gel look test (Three.js): built 2026-10-07**, `prototypes/revival-jam-gel-test.html`. Pip with seed-eyes on concrete, a coat over spikes, an ice block and a pad, six act lights and three tiers. Mike's verdict (2026-10-07): Pip High or Medium looks best, world Medium, and Low plays best (smoothest). Inner seeds removed; tiers split into Pip and world; FPS readout added.
2. **Phone touch pass: passed 2026-10-07** (Mike: "plays flawlessly"). Death Par on a real phone in landscape, checking thumb reach, button size, retry safety and readability at 8% screen height.
