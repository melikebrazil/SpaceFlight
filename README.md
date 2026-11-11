# SpaceFlight / Rhythm Run

A mouse-steered spaceship rhythm game built with HTML, CSS, Canvas, and JavaScript.

## Play locally
1. Clone or download this repository.
2. Open the folder in VS Code.
3. Run `index.html` with a local web server, such as the Live Server extension.

## How to play
- Move your mouse inside the flight window to steer your ship.
- Line up with **cyan energy gates** as they reach your ship to ram them on the beat.
- Avoid **red mines**. Hitting a mine damages your hull and breaks your combo.
- Build combos to increase your score.
- The track runs for 64 beats at 120 BPM, with a short countdown.

The soundtrack is synthesized with the Web Audio API, so no external music file is required.

## Files
- `index.html` — game layout and screens
- `style.css` — neon spaceflight styling and responsive layout
- `game.js` — flight controls, rhythm chart, collisions, scoring, visuals, and generated audio

## Deploy with GitHub Pages
In the repository, open **Settings → Pages**, select **Deploy from a branch**, choose `main` and `/(root)`, then save. New commits to `main` publish automatically.
