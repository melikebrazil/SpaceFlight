# SpaceFlight / Rhythm

A minimal browser rhythm game built with HTML, CSS, and JavaScript.

## Play locally
1. Download or clone this repository.
2. Open the folder in VS Code.
3. Run `index.html` with a local web server, such as the Live Server extension.

## How to play
The track alternates between two modes every 8 seconds:
- **Four lanes:** press **D**, **F**, **J**, or **K** when a note reaches the hit line.
- **Aim circles:** click or tap each circle when its shrinking ring reaches the target.

The game uses an original synthesized beat, so no music file is required. It runs for one 32-second track at 120 BPM.

## Files
- `index.html` — game layout and screens
- `style.css` — minimal responsive styling
- `game.js` — rhythm chart, timing, input, scoring, visuals, and generated audio

## Deploy with GitHub Pages
In the repository, open **Settings → Pages**, select **Deploy from a branch**, choose `main` and `/(root)`, then save. New commits to `main` publish automatically.
