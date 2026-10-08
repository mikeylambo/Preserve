# Revival Jam / Preserve: Art Bible and Style-Frame Brief

Companion to `revival-jam.md` (section 10). **Look: soft glowing gel against hard concrete, with light that climbs from emergency red to morning sun.** Side-on 2.5D on Three.js over an authoritative 2D tile grid.

Everything here serves three priorities, in order: gameplay readability (what's solid, what kills, what each death left), the thesis made visible (your deaths are the level), and the climb toward home.

---

## 1. Pillars

1. **Only Pip is soft.** The world is hard, matte and still. Pip and everything made from Pip is translucent, glossy, glowing and wobbly. If it jiggles, it's you.
2. **Light is the story.** Each act has one dominant light, and the player always climbs toward warmer, brighter light.
3. **Warm, not cute.** Physical comedy, no faces on props, no sugary palette, no thick cartoon outlines, no exposition.

## 2. Palette

| Token | Use | Value |
|---|---|---|
| Pip teal | Pip, all materials (tinted per material, §5) | `#2bc4a8` core, `#7ff0d8` glow, `#0e6b5c` deep |
| Seed-eyes | Pip's two eyes (nothing inside the body) | `#1b2a26` |
| Concrete | Facility surfaces | `#3a3d42` to `#6b6e73`, matte |
| Emergency red | Sublevels 6 and 5 key light | `#d8382e` |
| Work sodium | Sublevels 4 and 3 | `#f0a64a` |
| Fluorescent | Sublevels 2 and 1 | `#dfe9f2` |
| Daylight | Shaft light from above, the Surface at dawn | `#fff2d6` |
| Storm | Surface night | `#1d2433` |
| Kitchen sun | Home | `#ffd58a` on warm wood `#8a5a36` |
| Hazard bone | Spikes, blades | `#e9e1d3` |
| Hazard heat | Fire, crust glow | `#ff6a1a` to `#ffd04a` |
| Frost | Frost air, ice (never teal) | `#eaf6ff`, `#bcd9ff` |
| Arc | Live wire, strand power | `#fff7a8` |

**The world never uses teal.** Pip's color belongs to Pip and its deaths. Signage and test placards use pictograms in bone and red (no words).

## 3. Pip

- **Size:** 0.76 tiles, about 6% of screen height on desktop and 8% on phones (camera framing per room).
- **Body:** a rounded dome with a flat, wide base: the Maple slime's readable silhouette, never its face or color. Translucent teal with a bright inner core, a fresnel rim and soft refraction of whatever's behind. **Nothing floats inside** (Mike, 2026-10-07): the only dark marks are the two seed-eyes at the front.
- **Acting is motion (Flubber's energy, not its look):**
  - **Idle:** slow breathing wobble; the eyes glance around and blink. Long idles: Pip leans toward the exit jar.
  - **Run:** leans into the direction, base stretched, a little wet trail of droplets.
  - **Jump:** anticipation squash (2 frames), tall stretch on takeoff, round at the apex, pancake on landing with a ripple.
  - **Eyes (seed-eyes, Mike 2026-10-07):** two small dark seeds on the front surface, always visible on every tier. They track the facing direction, blink, widen at new hazards and peer over ledges.
  - **Death:** a hard splat that freezes for 3 frames before the material forms. Never gore; it reads as a dropped dessert.
- **Halves** are smaller, rounder and higher pitched, each with its own pair of seed-eyes.
- **Never:** blue (the card), green with a face (MapleStory), cartoon eyes and mouth, accessories.

## 4. Camera and scale

- A perspective camera at a long focal length (near-orthographic), side-on, locked per room. Rooms larger than one screen pan smoothly; `look` previews the whole room.
- The play plane is the only gameplay layer. Behind it: a near layer of room architecture (pipes, ducts, beams), a mid layer (the sublevel's machine hall), and a far layer (shaft light, distant floors). Nothing sits in front of the play plane except dust, steam and rain.
- Room transitions: a quick slide along the climb, upward whenever possible, so the climb is felt.

## 5. Materials (readability by shape first, rule 9)

Every material is teal jam, tinted and shaped so it can be told apart without color.

| Material | Shape and motion | Tint |
|---|---|---|
| Splat | A squat rounded block with a dripping lip | Pip teal |
| Coat | A smooth rounded skin over spikes with bumps where the spike tips are; the spikes ghost through faintly | Pip teal, lighter |
| Crust | Cracked, baked plates with glowing seams from the fire below; cracks spread when stepped on | Teal browned toward amber |
| Fill | A flat, glossy surface with a slow ripple | Pip teal, deeper |
| Pad | A domed cushion with an up-chevron pattern pressed into it; pulses slightly; compresses visibly on bounce | Pip teal with a bright rim |
| Ice | A clear faceted cube with Pip's frozen silhouette inside | Frost white with a teal ghost |
| Strand | A thin taut rope of gel with light pulsing along it | Teal core, arc-yellow pulses |
| Split halves | Two small Pips | Pip teal |

The prototype's material art is the reference for shape language; the 3D versions keep those silhouettes.

## 6. The facility tile kit

- **Built from the grid:** rooms are generated from their text grids with a modular tile kit: concrete blocks with chamfered edges, steel plate floors, grates over fire, vat rims, press housings, cryo panels, cable trays.
- **One kit per sublevel**, all from one brutalist family: board-formed concrete, steel, yellow-black hazard paint used sparingly, pictogram test placards.
- **Story props (non-gameplay):** empty desks, coat hooks, coffee cups gone cold, clipboards with pictogram charts of Pip's deaths, and in each sublevel's office the same farmhouse kitchen photo, sunnier and closer each time.
- **The Surface kit:** dry-stone walls, fence posts, thorn hedges (spikes), bonfire coals (fire), a stone well (vat), frost meadows (frost), the mill press (press), fallen power lines (wires).
- **Home kit:** wide wood floorboards, chair legs, a checked tablecloth, the table, the jar.

## 7. Light per act

| Act | Key | Fill | Mood |
|---|---|---|---|
| Intake | Pip only | None | Total dark; Pip is the lamp |
| 1 to 2 | Emergency red, rotating beacons | Pip | Alarm long abandoned |
| 3 to 4 | Sodium work lights, some flickering | Cool bounce | Industrial, humming |
| 5 to 6 | Fluorescent, with daylight leaking down shafts | Daylight shafts | The surface is near |
| 7 Surface | Storm and lightning, then a grey dawn, then sunrise | Sky | Open, weathered, alive |
| 8 Home | Low morning sun through windows | Warm wood bounce | Quiet, safe, done |

Volumetric shafts and fog are presentation only and scale down on low tiers (§9).

## 8. UI

- **Minimal and wordless** (rule 8): deaths and par in the corner as a small teal drop icon with a number and a small flag with a number. Seeds as three small pips.
- **Scorecard:** a paper slip like a specimen tag: the golf name (the only word), deaths vs par, time. Retry and continue as icons.
- **Sublevel map:** a cross-section of the facility, with rooms as small lit windows and the lift shaft running up through them.
- **Type:** one humanist sans for the few words that exist (golf names, settings) *(default)*.

## 9. Performance tiers (presentation only; the grid never changes)

Two independent settings, proven in the look test (https://claude.ai/artifact/8Ls3rhztpEiEFEvRghbNKr). **Defaults: Pip Medium, world Medium.** Smooth frame rate beats fidelity: Mike found Low the best to play and Pip High or Medium the best looking.

| Pip tier | Look |
|---|---|
| High | Physical transmission gel: refraction, clearcoat, inner glow and a teal point light. The most expensive |
| Medium (default) | Fresnel gel shader with a fake inner core and specular. Looks nearly as good for a fraction of the cost |
| Low | Unlit translucent gel; eyes always visible |

| World tier | Look |
|---|---|
| High | Soft shadows, bloom, volumetric shafts, full resolution (up to 2×) |
| Medium (default) | Shadows and bloom, resolution capped at 1.25× |
| Low (phones) | No shadows or bloom, 1× resolution, baked lighting |

The game auto-picks tiers from a short benchmark on first boot and drops a world tier if frames fall under 58 fps for 3 seconds *(default)*.

## 10. Style-frame brief (for the first visual target)

Three frames, all side-on at gameplay scale:
1. **Sublevel 6, room 1.06:** red emergency light, Pip mid-jump over a spike field where a fresh coat glistens. Shows gel against concrete and what a coat looks like.
2. **Sublevel 4, the Cryo Hall:** fluorescent light, three ice blocks stacked with Pip's frozen silhouettes inside, Pip on top glowing. Shows materials reading by shape.
3. **Home, the last room:** morning sun, the jar on the table, Pip at the rim. Shows the end of the light climb.

Each frame is checked at phone size for readability before it's approved.
