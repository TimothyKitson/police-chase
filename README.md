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

The city is generated from a fixed seed (`WORLD.seed` in `js/config.js`), so every
load and every player gets the same streets, the same skyline and the same coin
placements — the layout is learnable. Append `?seed=<number-or-word>` to the URL to
generate a different city; the same seed always rebuilds the same one.

## Earning coins the honest way

Coin rings around the city (25 each), drift chains that pay per second, and a heat
bounty every 10 seconds scaled to your wanted level.

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
js/world.js         procedural city, collision grid, coins
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
