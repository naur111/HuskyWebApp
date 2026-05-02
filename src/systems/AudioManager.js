/**
 * AudioManager.js
 * Plays species sounds on discovery.
 * Missing files fail silently — the game continues uninterrupted.
 *
 * TO ADD SOUNDS: Place .mp3 files in /public/sounds/
 * using the filenames defined in species.js soundFile fields.
 */

export class AudioManager {
  constructor() { this._cache = {}; }

  play(path) {
    if (!path) return;
    try {
      if (!this._cache[path]) {
        const a = new Audio(path);
        a.volume = 0.5;
        this._cache[path] = a;
      }
      const a = this._cache[path];
      a.currentTime = 0;
      a.play().catch(() => {});
    } catch (_) {}
  }
}
