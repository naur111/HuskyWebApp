# 🌿 Greenbelt Explorer

A 3D educational exploration game set in Ontario's Greenbelt.
Walk through a regenerating forest world and discover species hidden along the paths.
Every discovery makes the world more alive.

---

## Quick Start

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173` automatically.

---

## Controls

| Action | Input |
|---|---|
| Move | WASD or Arrow Keys |
| Look | Mouse (click canvas first to capture) |
| Release mouse | ESC |
| Restart | ↩ button top-right |

---

## Project Structure

```
greenbelt-explorer/
├── index.html
├── vite.config.js
├── package.json
├── public/
│   └── sounds/          ← drop .mp3 files here
└── src/
    ├── main.js          ← game loop + UI wiring
    ├── styles.css
    ├── data/
    │   └── species.js   ← all 8 species + pixel art draw functions
    └── systems/
        ├── WorldGenerator.js   ← generative 3D scene
        ├── SpeciesCards.js     ← 3D card objects with pixel art
        ├── PlayerController.js ← WASD + mouse look + collision
        ├── DiscoveryCard.js    ← full-screen discovery modal
        └── AudioManager.js     ← graceful sound playback
```

---

## Adding Animal Sounds

Drop `.mp3` files into `/public/sounds/` with these exact names:
`bobolink.mp3`, `bald-eagle.mp3`, `peregrine-falcon.mp3`, `rapids-clubtail.mp3`,
`redside-dace.mp3`, `jefferson-salamander.mp3`, `common-snapping-turtle.mp3`, `hooded-warbler.mp3`

Free bird calls with Creative Commons licences: **https://xeno-canto.org**

---

## World Regeneration Effects

Each species discovery triggers a visual world change:

| Species | Effect |
|---|---|
| Bobolink | Grass blades grow, ground greens |
| Bald Eagle | Tree canopies fill in and deepen |
| Peregrine Falcon | Sky brightens, sun warms |
| Rapids Clubtail | Stream ribbon appears |
| Redside Dace | Stream widens + sparkle particles |
| Jefferson Salamander | Ferns and undergrowth emerge |
| Common Snapping Turtle | Wetland pool appears with ripples |
| Hooded Warbler | Birds fly across the sky |

---

## Upgrading Visuals

**Replace pixel art with custom images:**
In `SpeciesCards.js`, swap `CanvasTexture` with a `THREE.TextureLoader` pointing to `/public/textures/species-name.png`.

**Replace box trees with 3D models:**
In `WorldGenerator.js`, import GLTF via `THREE.GLTFLoader` from `/public/models/`.
The `_buildTrees()` method is the right place to swap them in.

**Post-processing bloom:**
Add `three/examples/jsm/postprocessing/EffectComposer.js` + `UnrealBloomPass` for
a dreamy forest glow effect.

---

## Build for Production

```bash
npm run build
```

Output goes to `/dist/`. Deploy to Netlify, Vercel, or GitHub Pages.
