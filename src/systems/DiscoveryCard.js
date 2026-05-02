/**
 * DiscoveryCard.js
 * Shows the full-screen discovery card modal.
 * Renders a large pixel art portrait to the canvas inside the card.
 */

import { drawPixelBg } from '../data/species.js';

const SCALE = 7;    // px per grid cell for the large card art
const W     = 420;
const H     = 240;

export class DiscoveryCard {
  constructor(onClose) {
    this._overlay  = document.getElementById('disc-overlay');
    this._artCanvas = document.getElementById('disc-art');
    this._artCanvas.width  = W;
    this._artCanvas.height = H;
    this._artCtx   = this._artCanvas.getContext('2d');

    this._name     = document.getElementById('disc-name');
    this._msg      = document.getElementById('disc-msg');
    this._habitat  = document.getElementById('disc-habitat');
    this._card     = document.getElementById('disc-card');
    this._closeBtn = document.getElementById('disc-close');

    this._closeBtn.addEventListener('click', () => {
      this.hide();
      if (onClose) onClose();
    });
  }

  show(sp) {
    // Render large pixel art
    const ctx = this._artCtx;
    ctx.clearRect(0, 0, W, H);
    drawPixelBg(ctx, W, H, sp.bgHue, 6);
    const ox = Math.floor(W / 2 - 12 * SCALE);
    const oy = Math.floor(H / 2 - 10 * SCALE);
    sp.draw(ctx, ox, oy, SCALE);

    // Scanlines for texture
    for (let y = 0; y < H; y += 2) {
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(0, y, W, 1);
    }

    this._name.textContent    = sp.name;
    this._msg.textContent     = sp.msg;
    this._habitat.textContent = sp.habitat;

    this._overlay.classList.remove('hidden');
    this._overlay.classList.add('open');

    // Re-trigger pop animation
    this._card.style.animation = 'none';
    void this._card.offsetWidth;
    this._card.style.animation = '';
  }

  hide() {
    this._overlay.classList.remove('open');
    this._overlay.classList.add('hidden');
  }

  get isOpen() {
    return this._overlay.classList.contains('open');
  }
}
