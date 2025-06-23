# Oscillator – Ambient Web Audio Visualiser

This tiny project generates an evolving dark-ambient soundscape with Tone.js and renders real-time Milkdrop-style visuals through the Butterchurn WebGL visualiser.

## Features

- Layered binaural drones, sub-saw, brown-noise pad, bells and more – all procedurally generated in the browser.
- Butterchurn preset "$$$ Royal - mashup (326)" with full-screen WebGL visuals.
- Controls (appear on bottom hover):
  - Preset dropdown – switch to any included Milkdrop preset.
  - ⤢ button – toggle browser fullscreen.
- One-click "Start" button complies with browser autoplay policy.
- Fully client-side – no build step or backend required.

## Getting started

1. Clone or download this repo.
2. Double-click `index.html` to open it in any modern browser (Chrome, Edge, Firefox, Safari).
3. Click **Start** – audio fades in (~3 s) and visuals begin.

No build step or package install is required.

## Deployment

The site is pure static files (`index.html`, `src/visualizer.js`) so it can be deployed on any static host, e.g. Cloudflare Pages:

```bash
# after pushing to GitHub
cloudflare pages create
# build command: (leave blank)
# output directory: /
```

## Credits

- [Tone.js](https://tonejs.github.io/) – Web-Audio framework.
- [Butterchurn](https://github.com/jberg/butterchurn) + presets – Milkdrop 2 port.

## License

MIT – do whatever you like, no warranty.
