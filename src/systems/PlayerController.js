/**
 * PlayerController.js
 * First-person movement:
 *   - Pointer Lock API for mouse look
 *   - WASD + arrow keys
 *   - Smooth look with pitch clamp
 *   - Axis-separated AABB collision
 */

import * as THREE from 'three';

const SPEED       = 6.0;
const SENSITIVITY = 0.002;
const HEIGHT      = 1.72;
const RADIUS      = 0.38;
const BOUND       = 19.2;

export class PlayerController {
  constructor(camera, canvas, collidables) {
    this.camera      = camera;
    this.canvas      = canvas;
    this.collidables = collidables;

    this.yaw         = 0;
    this.pitch       = 0;
    this.keys        = {};
    this.locked      = false;

    this._move  = new THREE.Vector3();
    this._yawQ  = new THREE.Quaternion();
    this._box   = new THREE.Box3();
    this._test  = new THREE.Vector3();

    this._bindEvents();
  }

  _bindEvents() {
    document.addEventListener('keydown', e => { this.keys[e.code] = true; });
    document.addEventListener('keyup',   e => { this.keys[e.code] = false; });

    this.canvas.addEventListener('click', () => {
      if (!this.locked) this.canvas.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
    });

    document.addEventListener('mousemove', e => {
      if (!this.locked) return;
      this.yaw   -= e.movementX * SENSITIVITY;
      this.pitch -= e.movementY * SENSITIVITY;
      this.pitch  = Math.max(-Math.PI / 2.8, Math.min(Math.PI / 2.8, this.pitch));
    });
  }

  requestLock()  { this.canvas.requestPointerLock(); }
  releaseLock()  { if (document.pointerLockElement) document.exitPointerLock(); }

  setPosition(x, z) {
    this.camera.position.set(x, HEIGHT, z);
    this.yaw = 0; this.pitch = 0;
  }

  update(dt) {
    // Always apply look
    this.camera.quaternion.setFromEuler(
      new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ')
    );

    if (!this.locked) return;

    const fwd  = (this.keys['KeyW'] || this.keys['ArrowUp'])    ? 1 : 0;
    const back = (this.keys['KeyS'] || this.keys['ArrowDown'])  ? 1 : 0;
    const lft  = (this.keys['KeyA'] || this.keys['ArrowLeft'])  ? 1 : 0;
    const rgt  = (this.keys['KeyD'] || this.keys['ArrowRight']) ? 1 : 0;

    this._move.set(rgt - lft, 0, back - fwd);
    if (this._move.lengthSq() > 0) {
      this._move.normalize();
      this._yawQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
      this._move.applyQuaternion(this._yawQ);
    }

    const spd = SPEED * dt;
    const cur = this.camera.position;

    let nx = Math.max(-BOUND, Math.min(BOUND, cur.x + this._move.x * spd));
    let nz = Math.max(-BOUND, Math.min(BOUND, cur.z + this._move.z * spd));

    // X-axis collision
    this._test.set(nx, cur.y, cur.z);
    this._box.setFromCenterAndSize(this._test, new THREE.Vector3(RADIUS * 2, 1.8, RADIUS * 2));
    if (this.collidables.some(b => this._box.intersectsBox(b))) nx = cur.x;

    // Z-axis collision
    this._test.set(nx, cur.y, nz);
    this._box.setFromCenterAndSize(this._test, new THREE.Vector3(RADIUS * 2, 1.8, RADIUS * 2));
    if (this.collidables.some(b => this._box.intersectsBox(b))) nz = cur.z;

    this.camera.position.set(nx, HEIGHT, nz);
  }

  get position() { return this.camera.position; }
}
