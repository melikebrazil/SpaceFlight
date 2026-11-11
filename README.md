# SpaceFlight

A 3D spaceship survival-flight game built with JavaScript and Three.js.

## Play locally

1. Download or clone this repository.
2. Open the project folder in VS Code.
3. Run it with a local web server (for example, the **Live Server** extension).
4. Open the local URL shown by the server.

> Three.js is loaded as an ES module, so opening `index.html` directly with a `file://` URL may not work. Use a local web server.

## Controls

- Move your mouse to steer the ship.
- Avoid the asteroids.
- Try to travel as far as possible.

## Files

- `index.html` — game page and HUD
- `style.css` — interface styling
- `game.js` — Three.js scene, ship, asteroids, and gameplay

## Deploy with GitHub Pages

1. Open the repository's **Settings** tab.
2. Select **Pages** in the sidebar.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the `main` branch and `/(root)`, then save.
5. Wait for GitHub Pages to publish the site. The Pages section will show the live URL.

Three.js is loaded from jsDelivr, and the interface font is loaded from Google Fonts, so those services need to be reachable when playing.