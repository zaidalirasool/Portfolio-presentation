# Merchant Stack Map (Interactive)

This folder contains a small interactive experience for the “merchant stack map” image.

## Run locally

Because `app.js` is loaded as an ES module, the simplest way is to serve the folder with a tiny static server:

```bash
cd "Portfolio presentation"
python3 -m http.server 5173
```

Then open:

- `http://localhost:5173/`

## Controls

- **Pan**: click + drag on empty space
- **Zoom**: trackpad pinch / mouse wheel
- **Select**: click a node
- **Focus**: click “Focus” in the right panel (or press Enter while the map is focused)
- **Clear**: click empty space or use the “Clear” button
- **Reset view**: “Reset view” button (or Cmd/Ctrl + 0 while the map is focused)

## Local logos (recommended)

If your browser/network blocks third-party logo hosts, place logo files here so they render reliably:

- `assets/logos/privy.png`
- `assets/logos/octaneai.png`
- `assets/logos/justuno.png`

The `Personalization` card is wired to these paths by default.

## A/B testing image

To set the default combined image for the `A/B Testing (WISER / ONE)` card, save it as:

- `ab-testing.png` (in this folder, next to `index.html`)

If it’s present, it will be used automatically (no upload needed).

