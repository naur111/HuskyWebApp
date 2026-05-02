/**
 * SpeciesCards.js
 * Places 8 species cards as 3D objects in the world.
 * Each card is a billboard plane showing the pixel art portrait.
 * Cards bob, rotate, and glow to attract the player.
 * On discovery they dim and stop animating.
 */

import * as THREE from 'three';
import { SPECIES, drawPixelBg } from '../data/species.js';

// Card positions spread through the navigable area
const POSITIONS = [
  [-5, 0, -9],   // bobolink
  [ 6, 0, -13],  // bald eagle
  [-13, 0, -1],  // peregrine
  [ 13, 0, -3],  // clubtail
  [ -2, 0, 12],  // redside dace
  [ 10, 0, 11],  // salamander
  [-11, 0, 11],  // snapping turtle
  [  3, 0, -5],  // hooded warbler
];

const PIXEL_SCALE = 4;   // px per grid cell on the card canvas
const GRID        = 24;  // grid size
const CANVAS_W    = GRID * PIXEL_SCALE;  // 96px
const CANVAS_H    = GRID * PIXEL_SCALE;

export class SpeciesCards {
  constructor(scene) {
    this.scene   = scene;
    this.entries = [];  // { group, sp, discovered, phase }
    this._build();
  }

  _build() {
    SPECIES.forEach((sp, i) => {
      const [x, , z] = POSITIONS[i] || [0, 0, 0];

      // Render pixel art to an offscreen canvas → Three.js texture
      const offscreen = document.createElement('canvas');
      offscreen.width  = CANVAS_W;
      offscreen.height = CANVAS_H;
      const octx = offscreen.getContext('2d');

      // Background
      drawPixelBg(octx, CANVAS_W, CANVAS_H, sp.bgHue, PIXEL_SCALE);

      // Species art — centred on the grid
      const ox = Math.floor(CANVAS_W / 2 - 12 * PIXEL_SCALE);
      const oy = Math.floor(CANVAS_H / 2 - 10 * PIXEL_SCALE);
      sp.draw(octx, ox, oy, PIXEL_SCALE);

      const tex = new THREE.CanvasTexture(offscreen);
      tex.magFilter = THREE.NearestFilter;  // keep pixelated look
      tex.minFilter = THREE.NearestFilter;

      const group = new THREE.Group();
      group.position.set(x, 0, z);

      // Stake post
      const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.8, 6);
      const postMat = new THREE.MeshLambertMaterial({ color: 0x5a3010 });
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.y = 0.9;
      group.add(post);

      // Card plane with pixel art texture
      const cardGeo = new THREE.PlaneGeometry(1.4, 1.4);
      const cardMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
      const card = new THREE.Mesh(cardGeo, cardMat);
      card.position.y = 2.1;
      group.add(card);

      // Glow orb on top
      const glowGeo = new THREE.SphereGeometry(0.1, 8, 8);
      const glowMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(sp.cardColor),
        transparent: true,
        opacity: 0.9,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.y = 2.9;
      group.add(glow);

      this.scene.add(group);

      this.entries.push({
        group,
        sp,
        discovered: false,
        phase: Math.random() * Math.PI * 2,
        cardMesh: card,
        glowMesh: glow,
      });
    });
  }

  /** Animate undiscovered cards each frame */
  update(elapsed) {
    this.entries.forEach(e => {
      if (e.discovered) return;
      const t = elapsed + e.phase;
      e.group.position.y = Math.sin(t * 1.1) * 0.14;
      e.group.rotation.y = t * 0.45;
      e.glowMesh.material.opacity = 0.5 + 0.45 * Math.abs(Math.sin(t * 1.9));
    });
  }

  /**
   * Check if player is within discovery range of any undiscovered card.
   * Returns { entry, sp } or null.
   */
  checkDiscovery(playerPos, radius = 2.5) {
    for (const e of this.entries) {
      if (e.discovered) continue;
      const cp = e.group.position.clone(); cp.y = playerPos.y;
      if (playerPos.distanceTo(cp) < radius) return e;
    }
    return null;
  }

  /** True if any undiscovered card is within hint range */
  isNearby(playerPos, radius = 5.0) {
    for (const e of this.entries) {
      if (e.discovered) continue;
      const cp = e.group.position.clone(); cp.y = playerPos.y;
      if (playerPos.distanceTo(cp) < radius) return true;
    }
    return false;
  }

  /** Mark a card discovered — dims it, stops animation */
  markDiscovered(entry) {
    entry.discovered = true;
    entry.group.rotation.y = 0;
    // Dim the card
    entry.cardMesh.material = new THREE.MeshBasicMaterial({
      map: entry.cardMesh.material.map,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    entry.glowMesh.material.opacity = 0;
  }

  /** Reset all cards for a new game */
  reset() {
    this.entries.forEach(e => {
      e.discovered = false;
      e.cardMesh.material = new THREE.MeshBasicMaterial({
        map: e.cardMesh.material.map,
        side: THREE.DoubleSide,
      });
      e.glowMesh.material.opacity = 0.9;
    });
  }
}
