# Blacktop Police Chase — MODDED

An original arcade police-chase driving game built from scratch with WebGL (three.js),
inspired by the blacktop-police-chase genre. Drive a procedurally generated city, farm
coins, dodge cruisers — and abuse the mods.

No build step, no bundler, no external requests at runtime. Drop it on any static host.

## The mods

| Mod | How |
| --- | --- |
| **Fly** | Press <kbd>E</kbd> any time during a run to lift off. <kbd>W</kbd>/<kbd>S</kbd> thrust, <kbd>A</kbd>/<kbd>D</kbd> yaw, <kbd>Space</kbd> climb, <kbd>Ctrl</kbd> (or <kbd>Shift</kbd>+<kbd>Space</kbd>) descend. Police can't reach you above ~16 m, so heat cools while airborne. |
| **Instant coins** | Press <kbd>R</kbd> for +1000 coins, anywhere — menu, garage or mid-pursuit. |
| **Free respawn** | The watch-an-ad-to-respawn gate is removed. Get wrecked or busted and you respawn instantly with one click or <kbd>Enter</kbd>. |
| **Admin car** | 100,000 coins unlocks the Admin Prototype plus a dev console you open **before** you spawn: top speed, acceleration, brakes, boost, grip, handbrake grip, steering rate, weight, fly thrust, climb rate, gravity, body length/width, wheel size, paint, trim, rims, underglow, rear wing, plus *No Damage* and *Police Ignore You*. Six presets included (Balanced, Rocket, Drift King, Monster, Jet, God Mode). |

## Controls

- <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / arrows — drive
- <kbd>Space</kbd> — handbrake / drift (climb while flying)
- <kbd>Shift</kbd> — boost
- <kbd>E</kbd> — toggle fly · <kbd>R</kbd> — +1000 coins · <kbd>F</kbd> — reset car
- <kbd>C</kbd> — camera · <kbd>M</kbd> — mute · <kbd>Esc</kbd> — pause

## The map

One fixed city, generated from a seed (`WORLD.seed` in `js/config.js`) — same streets,
skyline, hazards and coin placements for every player on every load, so the layout is
learnable. Append `?seed=<number-or-word>` to the URL to roll a different city; the same
seed always rebuilds the same one.

Built to match the shape of the original's map rather than a tidy grid:

- **Twisted street network** — irregular block spacing, wide arterials, narrow downtown
  side streets, and alley shortcuts carved through blocks.
- **Districts** — a tower-heavy downtown, midtown mid-rise, warehouse/freight docks with
  stacked shipping containers, and green park blocks.
- **Civilian traffic** — ~130 cars driving the lane network, queueing at junctions and
  bunching up downtown. They route around roadblocks; you and the police do not.
- **Roadblocks** — striped barriers that close streets. Hit one above ~30 km/h and you
  smash through; crawl into it and it stops you. More get thrown down ahead of you as
  your wanted level climbs.
- **Speed traps** — camera posts that call in units when you blast past.
- **The river and harbour** — a river splits the city with only four bridges across it,
  plus a harbour bay in the docks. Drive in and you sink (free rescue, it's a mod).
- **Ramps** — yellow-tipped kickers on the arterials and big ones in the yards and parks,
  with real launch physics and an air-time payout.

## Earning coins the honest way

Coin rings around the city (25 each), drift chains that pay per second, ramp air time,
and a heat bounty every 10 seconds scaled to your wanted level.

Cars: City Cruiser (free), Blacktop V8 (6,500), Nightline GT (24,000), Admin Prototype (100,000).
Progress, purchases and admin tuning persist in `localStorage`.

## Run locally

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

Any static file server works — it's plain ES modules, and three.js is vendored in
`vendor/` so nothing is fetched from a CDN.

## Deploy to Netlify

Drag the folder into Netlify, or link the repo. `netlify.toml` already sets
`publish = "."` with no build command, so it deploys as-is.

## Layout

```
index.html          markup, HUD and screens
css/style.css       all styling
js/main.js          entry point
js/game.js          renderer, game loop, heat/bust/economy logic
js/world.js         city generation, street network, water, bridges, ramps, collision grid
js/traffic.js       civilian traffic on the lane network
js/hazards.js       roadblocks and speed traps
js/vehicle.js       arcade car + flight physics
js/carmesh.js       car model builder
js/police.js        pursuit AI
js/ui.js            menus, garage, admin tuning console
js/preview.js       turntable car preview
js/hud.js           speedometer, bars, toasts
js/minimap.js       radar
js/state.js         localStorage save + economy
js/config.js        car specs, tuning schema, presets
js/input.js         keyboard
js/audio.js         WebAudio engine, siren, pickups
vendor/three.module.js  three.js r160 (MIT)
```
