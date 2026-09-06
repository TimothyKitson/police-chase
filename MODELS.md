# Replacing the models with AI-generated ones

Every vehicle in the game is currently built procedurally from boxes and tapered hulls in
`js/carmesh.js`. That is deliberately swappable: drop a `.glb` into `models/`, flip one flag,
and the game uses it instead — no code changes.

I can't generate these for you. Generating a mesh needs an account and API key on a service
like Tripo, Meshy or Rodin, and this environment has neither, so the prompts below are for you
to paste in. Everything else — loading, scaling, orienting, painting, wheel spin — is already
wired up and tested.

## How to install a model

1. Generate the model, export **GLB** (not FBX/OBJ), and download it.
2. Rename it to the slot filename from the table below and put it in `models/`.
3. In `models/manifest.json`, set that slot's `"enabled"` to `true`.
4. Reload. If it looks wrong, fix it in the manifest (see *Fixing orientation*) — not in code.

| Slot file | Used for | Length it is fitted to |
| --- | --- | --- |
| `car_cruiser.glb` | City Cruiser (starter hatchback) | 3.9 m |
| `car_van.glb` | Haulaway Van (4-crew truck) | 5.4 m |
| `car_muscle.glb` | Blacktop V8 (muscle car) | 4.6 m |
| `car_interceptor.glb` | Nightline GT (coupe) | 4.4 m |
| `car_bullion.glb` | Bullion Hauler (6-crew box truck) | 6.6 m |
| `car_admin.glb` | Admin Prototype (tunable mod car) | 4.5 m |
| `car_police.glb` | Every police cruiser | 4.5 m |
| `car_traffic.glb` | Civilian traffic *(not yet wired — see Limits)* | 4.3 m |
| `cockpit.glb` | First-person interior *(see Limits)* | — |

## What the loader does for you

- **Scale**: auto-fits the model so its Z length matches the car's spec length. A 100× oversized
  export is fine.
- **Pivot**: recentres X/Z and seats the lowest point on y = 0, so it never floats or sinks.
- **Paint**: any mesh or material whose name matches `body`, `paint`, `shell` or `chassis` is
  recoloured to the car's paint colour (and to the admin car's live colour picker). Name your
  bodyshell material `body_paint` and this just works.
- **Wheels**: if the model has four nodes named `wheel_fl`, `wheel_fr`, `wheel_rl`, `wheel_rr`
  (or `front_left` / `rear_right` etc.), they are detached into spin pivots and rotate with
  speed, and the front pair steers. If it can't find them, it keeps the procedural wheels and
  your model should be a bodyshell only.
- **Police lights**: the red/blue bar is added on top of `car_police.glb` automatically, so don't
  model one.

## Fixing orientation

Generators rarely agree on which way is forward. The game needs **nose toward +Z, roof toward +Y**.
If your car faces backwards or is on its side, edit its manifest entry — degrees, no rebuild:

```json
"car_muscle": { "enabled": true, "rotate": [0, 180, 0], "scale": 1, "offset": [0, 0, 0] }
```

- Facing backwards → `"rotate": [0, 180, 0]`
- Lying on its roof / Z-up export → `"rotate": [-90, 0, 0]`
- Sitting too low or high → `"offset": [0, 0.05, 0]`
- Too big/small after auto-fit (e.g. long spoiler skews the length) → `"scale": 0.95`

`?models=auto` on the URL probes for every slot file without editing the manifest — handy while
testing, but it logs 404s for missing files, so leave it off normally.

## Prompts

All of these should be generated **without wheels** unless you want to name wheel nodes yourself;
the game's own wheels are already animated. Append this to every prompt:

> Low-poly game asset, under 15k triangles, single mesh, clean flat-shaded surfaces, no interior,
> no wheels, no baked shadows, neutral mid-grey bodywork so it can be recoloured in-engine,
> real-world scale, nose pointing along +Z, wheels-down flat on the ground plane, centred on the
> origin, PBR textures baked into one atlas, export GLB.

**`car_cruiser` — City Cruiser**
> A small modern 5-door city hatchback, plain and slightly worn, like a cheap rental. Compact
> 3.9 m body, short bonnet, upright rear hatch, unpainted plastic bumpers, small steel wheels,
> no spoiler, no decals.

**`car_muscle` — Blacktop V8**
> A 1970s American muscle coupe. Long flat bonnet with a raised hood scoop, wide rear haunches,
> fastback roofline, quad round tail lights, chrome bumpers, twin exhaust tips, a small rear
> ducktail spoiler.

**`car_interceptor` — Nightline GT**
> A modern low-slung two-door sports coupe. Sharp wedge nose, thin LED headlights, deeply
> sculpted side sills, wide rear track, large rear wing, centre-exit exhaust, aggressive front
> splitter and diffuser.

**`car_van` — Haulaway Van**
> A battered short-wheelbase panel van, 5.4 m, high square cargo box behind a stubby cab, sliding
> side door with no window, twin rear doors, roof vent, dented corners and a couple of mismatched
> panels, no windows in the cargo area.

**`car_bullion` — Bullion Hauler**
> A heavy ex-security cash-transport truck, 6.6 m. Armoured slab-sided cargo box with riveted
> panels and narrow slit windows, small reinforced cab, chunky bumpers, roof beacon mount, heavy
> duty steel wheel arches.

**`car_admin` — Admin Prototype**
> An angular concept prototype hypercar with exposed carbon-fibre panels, a large rear wing,
> aircraft-style canopy glass, vents cut through the bodywork, and thin light bars front and rear.
> Futuristic but plausible, like a manufacturer test mule with camouflage panels removed.

**`car_police` — police cruiser**
> A modern police interceptor sedan, 4.5 m. White bodywork with flat dark blue door and bonnet
> panels, a heavy tubular push bar across the front bumper, A-pillar spotlight, black steel wheels,
> antenna stubs on the boot lid. Leave the roof clear and flat — the light bar is added in-engine.
> (Override the last line of the common suffix: keep the white/blue livery rather than mid-grey.)

**`cockpit` — first-person interior** *(read Limits first)*
> The interior of a car seen from the driver's seat: dashboard, instrument binnacle, centre
> console, door cards, A-pillars and roof header framing a large windscreen opening. Left-hand
> drive. No steering wheel, no hands, no seats, no exterior body. Dark grey plastic and cloth
> materials. The windscreen opening must be an empty hole, not glass.

## Limits — read before you spend credits

- **Draco-compressed GLB is not supported.** If your export fails to load, re-export with Draco
  or mesh compression turned off (Tripo has a toggle; otherwise run it through
  `gltf-transform` first).
- **`car_traffic` is loaded but not yet used.** Civilian traffic draws 130 cars through one
  instanced mesh for performance; using a GLB there needs its geometry merged into that
  instancer, which isn't written yet. The file is accepted so the plumbing is ready.
- **`cockpit.glb` loads but nothing binds to it yet.** The animated wheel, hands and gear lever
  are still the procedural ones. Wiring a generated interior needs nodes named `wheel`,
  `hand_left`, `hand_right` and `lever` so the animation can drive them; the loader exposes
  `namedNode()` for exactly this, but the binding isn't written yet either.
- Buildings, roads, props and pedestrians are generated as merged/instanced geometry and are not
  GLB-swappable. Generated buildings would cost far more to draw than the current city does.
- Keep each car under ~15k triangles. Eight police cars, 130 traffic cars and a whole city are
  already on screen; a 500k-triangle hero car will tank the frame rate.
