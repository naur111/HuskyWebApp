/**
 * WorldGenerator.js
 * Builds and evolves the 3D Greenbelt scene.
 *
 * The world starts sparse and dark. Each species discovery triggers
 * a named effect that visually regenerates part of the world:
 *
 *   grass       → grass blades grow, ground greens
 *   canopy      → tree canopies fill in and deepen
 *   sky         → sky brightens, sun warmth increases
 *   stream      → a ribbon of water appears east→west
 *   stream2     → stream widens, gets sparkle particles
 *   undergrowth → ferns and low shrubs emerge
 *   wetland     → a pond glimmers in the NW corner
 *   birds       → animated bird silhouettes cross the sky
 *
 * HOW TO UPGRADE:
 *   Replace ConeGeometry/BoxGeometry trees with GLTF imports.
 *   Add THREE.TextureLoader maps from /public/textures/.
 */

import * as THREE from 'three';

// ── helpers ──────────────────────────────────────────────────
function rand(a, b) { return a + Math.random() * (b - a); }
function sr(seed)   { const x = Math.sin(seed + 1) * 10000; return x - Math.floor(x); }

export class WorldGenerator {
  constructor(scene) {
    this.scene = scene;

    // Growth values — each starts at 0, grows to 1 on discovery
    this.growth = {
      grass: 0, canopy: 0, sky: 0,
      stream: 0, stream2: 0,
      undergrowth: 0, wetland: 0, birds: 0,
    };
    this.targets = { ...this.growth };

    // Object references for animated updates
    this._ground       = null;
    this._grassBlades  = [];
    this._trees        = [];
    this._streamMesh   = null;
    this._wetlandMesh  = null;
    this._pondRipples  = [];
    this._birdGroup    = new THREE.Group();
    this._ferns        = [];
    this._skyMesh      = null;   // hemisphere light driven by sky growth
    this._ambientLight = null;
    this._sunLight     = null;
    this._particles    = null;   // sparkle system for stream2

    this.collidables   = [];     // Box3 array for player collision
    this.elapsed       = 0;

    this._build();
  }

  // ── public API ────────────────────────────────────────────

  /** Trigger a world effect (called on species discovery) */
  trigger(effectName) {
    if (effectName in this.targets) {
      this.targets[effectName] = 1;
    }
  }

  /** Call every frame with delta time */
  update(dt) {
    this.elapsed += dt;

    // Smoothly grow each value toward its target
    for (const key in this.growth) {
      if (this.growth[key] < this.targets[key]) {
        this.growth[key] = Math.min(
          this.targets[key],
          this.growth[key] + dt * 0.25   // ~4 seconds to full growth
        );
      }
    }

    this._updateLighting();
    this._updateGround();
    this._updateTrees();
    this._updateStream();
    this._updateWetland();
    this._updateBirds();
    this._updateFerns();
    this._updateParticles();
  }

  // ── build ─────────────────────────────────────────────────

  _build() {
    this._buildLighting();
    this._buildGround();
    this._buildBoundaryWalls();
    this._buildTrees();
    this._buildStream();
    this._buildWetland();
    this._buildFerns();
    this._buildParticles();
    this.scene.add(this._birdGroup);
    this._buildBirds();
  }

  // ── lighting ──────────────────────────────────────────────

  _buildLighting() {
    this.scene.background = new THREE.Color(0x0a1208);
    this.scene.fog = new THREE.FogExp2(0x0d1a0d, 0.045);

    this._ambientLight = new THREE.AmbientLight(0x223322, 0.4);
    this.scene.add(this._ambientLight);

    this._sunLight = new THREE.DirectionalLight(0x445533, 0.3);
    this._sunLight.position.set(20, 35, 15);
    this._sunLight.castShadow = true;
    this._sunLight.shadow.mapSize.set(2048, 2048);
    this._sunLight.shadow.camera.near = 0.1;
    this._sunLight.shadow.camera.far = 80;
    [-25, 25, 25, -25].forEach((v, i) => {
      const k = ['left','right','top','bottom'][i];
      this._sunLight.shadow.camera[k] = v;
    });
    this.scene.add(this._sunLight);

    // Soft fill from opposite side
    this._fillLight = new THREE.DirectionalLight(0x113322, 0.15);
    this._fillLight.position.set(-10, 8, -10);
    this.scene.add(this._fillLight);
  }

  _updateLighting() {
    const g = this.growth;
    const skyG = this._ease(g.sky);
    const canG = this._ease(g.canopy);

    // Sky and background colour
    const skyCol = new THREE.Color().setHSL(
      0.33 + skyG * 0.22,
      0.25 + skyG * 0.2,
      0.04 + skyG * 0.18
    );
    this.scene.background = skyCol;
    this.scene.fog.color = new THREE.Color().setHSL(
      0.3 + skyG * 0.1,
      0.35 + skyG * 0.15,
      0.07 + skyG * 0.12
    );

    // Ambient — warms with sky
    this._ambientLight.color.setHSL(
      0.28 + skyG * 0.06,
      0.35 + skyG * 0.2,
      0.12 + skyG * 0.35
    );
    this._ambientLight.intensity = 0.4 + skyG * 0.9;

    // Sun — brightens and warms
    this._sunLight.color.setHSL(
      0.13 + skyG * 0.02,
      0.4 + skyG * 0.3,
      0.35 + skyG * 0.45
    );
    this._sunLight.intensity = 0.3 + skyG * 1.4;
    this._fillLight.intensity = 0.15 + canG * 0.25;
  }

  // ── ground ────────────────────────────────────────────────

  _buildGround() {
    const geo = new THREE.PlaneGeometry(80, 80, 32, 32);
    // Gentle undulation
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      pos.setY(i, Math.sin(x * 0.28) * 0.1 + Math.sin(z * 0.35) * 0.07);
    }
    geo.computeVertexNormals();

    this._groundMat = new THREE.MeshLambertMaterial({ color: 0x0f1e0a });
    this._ground = new THREE.Mesh(geo, this._groundMat);
    this._ground.rotation.x = -Math.PI / 2;
    this._ground.receiveShadow = true;
    this.scene.add(this._ground);
  }

  _updateGround() {
    const g = this._ease(this.growth.grass);
    this._groundMat.color.setHSL(
      0.28 + g * 0.05,
      0.3 + g * 0.35,
      0.07 + g * 0.18
    );

    // Spawn grass blades as grass grows
    const targetBlade = Math.floor(g * 280);
    while (this._grassBlades.length < targetBlade) {
      this._spawnGrassBlade();
    }
  }

  _spawnGrassBlade() {
    const i = this._grassBlades.length;
    const h = rand(0.3, 1.1);
    const geo = new THREE.ConeGeometry(0.04, h, 3);
    const mat = new THREE.MeshLambertMaterial({
      color: new THREE.Color().setHSL(0.28 + rand(0, 0.06), 0.55, 0.22 + rand(0, 0.1)),
    });
    const blade = new THREE.Mesh(geo, mat);
    blade.position.set(sr(i * 7.3) * 70 - 35, h / 2, sr(i * 3.1) * 70 - 35);
    blade.rotation.y = Math.random() * Math.PI;
    blade.rotation.z = rand(-0.15, 0.15);
    this.scene.add(blade);
    this._grassBlades.push(blade);
  }

  // ── trees ─────────────────────────────────────────────────

  _buildTrees() {
    const positions = [
      [-14, -14], [14, -14], [-14, 14], [13, 13],
      [-11, -4],  [11, 3],   [-3, -15], [5, -15],
      [-16, 2],   [16, -7],  [0, 16],   [-6, 15],
      [-13, 9],   [13, 9],
    ];

    positions.forEach(([x, z], i) => {
      const data = this._makeTree(x, z, i);
      this.scene.add(data.group);
      this._trees.push(data);
      // Trunk collision
      this.collidables.push(
        new THREE.Box3(
          new THREE.Vector3(x - 0.45, 0, z - 0.45),
          new THREE.Vector3(x + 0.45, 6, z + 0.45)
        )
      );
    });
  }

  _makeTree(x, z, seed) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = seed * 0.8;

    const trunkH = rand(2.8, 4.8);
    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.28, trunkH, 7);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x3d2010 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    group.add(trunk);

    // Start invisible, grow in
    const canopyMeshes = [];
    const layers = 2 + Math.floor(rand(0, 2));
    for (let l = 0; l < layers; l++) {
      const r = rand(1.0, 2.0) - l * 0.25;
      const h = rand(1.8, 3.2);
      const coneGeo = new THREE.ConeGeometry(r, h, 7);
      const hue = 0.28 + rand(0, 0.06);
      const coneMat = new THREE.MeshLambertMaterial({
        color: new THREE.Color().setHSL(hue, 0.45, 0.15),
        transparent: true,
        opacity: 0,
      });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.y = trunkH + l * h * 0.5;
      cone.castShadow = true;
      group.add(cone);
      canopyMeshes.push({ mesh: cone, targetOpacity: 0.85 });
    }

    return { group, canopyMeshes, trunkH };
  }

  _updateTrees() {
    const g = this._ease(this.growth.canopy);
    this._trees.forEach((data, i) => {
      // Stagger tree growth by index
      const localG = Math.max(0, Math.min(1, (g - i * 0.04)));
      data.canopyMeshes.forEach(({ mesh }, li) => {
        const layerG = Math.max(0, Math.min(1, localG - li * 0.1));
        mesh.material.opacity = layerG * 0.85;
        // Deepen colour as they grow
        const hue = 0.28 + layerG * 0.05;
        const lum = 0.12 + layerG * 0.15;
        mesh.material.color.setHSL(hue, 0.5 + layerG * 0.1, lum);
      });
    });
  }

  // ── boundary walls (invisible collision) ──────────────────

  _buildBoundaryWalls() {
    const W = 19.5, wH = 4;
    const walls = [
      { p: [0, wH / 2, -W], s: [W * 2, wH, 0.5] },
      { p: [0, wH / 2,  W], s: [W * 2, wH, 0.5] },
      { p: [-W, wH / 2, 0], s: [0.5, wH, W * 2] },
      { p: [ W, wH / 2, 0], s: [0.5, wH, W * 2] },
    ];

    // Hedge walls (visible)
    const hedgeMat = new THREE.MeshLambertMaterial({ color: 0x1e3a14 });
    walls.forEach(({ p, s }) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...s), hedgeMat);
      mesh.position.set(...p);
      mesh.castShadow = true;
      this.scene.add(mesh);
      this.collidables.push(new THREE.Box3().setFromObject(mesh));
    });

    // Interior hedge dividers
    const hedges = [
      { p: [-7, 2, 0],  s: [1, 4, 14] },
      { p: [7, 2, -5],  s: [1, 4, 9] },
      { p: [0, 2, -8],  s: [10, 4, 1] },
      { p: [-4, 2, 8],  s: [9, 4, 1] },
    ];
    hedges.forEach(({ p, s }) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...s), hedgeMat);
      mesh.position.set(...p);
      mesh.castShadow = true;
      this.scene.add(mesh);
      this.collidables.push(new THREE.Box3().setFromObject(mesh));
    });
  }

  // ── stream ────────────────────────────────────────────────

  _buildStream() {
    // Flat winding ribbon
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    // Bezier ribbon approximated as quad strip
    const pts = [];
    for (let t = 0; t <= 1; t += 0.05) {
      const x = -19 + t * 38;
      const z = Math.sin(t * Math.PI * 1.5) * 3.5;
      pts.push(new THREE.Vector2(x, z - 1));
      pts.push(new THREE.Vector2(x, z + 1));
    }
    const streamGeo = new THREE.PlaneGeometry(40, 2.5, 30, 1);
    this._streamMat = new THREE.MeshLambertMaterial({
      color: 0x1a5a8a,
      transparent: true,
      opacity: 0,
    });
    this._streamMesh = new THREE.Mesh(streamGeo, this._streamMat);
    this._streamMesh.rotation.x = -Math.PI / 2;
    this._streamMesh.position.set(0, 0.02, 3);
    this.scene.add(this._streamMesh);
  }

  _updateStream() {
    const s1 = this._ease(this.growth.stream);
    const s2 = this._ease(this.growth.stream2);
    const combined = Math.max(s1, s2);
    this._streamMat.opacity = combined * 0.72;
    // Widen and shimmer with stream2
    const w = 1 + s2 * 1.2;
    this._streamMesh.scale.z = w;
    // Colour shifts bluer/lighter with stream2
    this._streamMat.color.setHSL(
      0.58 + s2 * 0.04,
      0.5 + s2 * 0.2,
      0.25 + s2 * 0.15
    );
  }

  // ── wetland pool ──────────────────────────────────────────

  _buildWetland() {
    const geo = new THREE.CircleGeometry(4, 24);
    this._wetlandMat = new THREE.MeshLambertMaterial({
      color: 0x1a4a6a,
      transparent: true,
      opacity: 0,
    });
    this._wetlandMesh = new THREE.Mesh(geo, this._wetlandMat);
    this._wetlandMesh.rotation.x = -Math.PI / 2;
    this._wetlandMesh.position.set(-13, 0.03, 10);
    this.scene.add(this._wetlandMesh);

    // Ripple rings
    for (let i = 0; i < 3; i++) {
      const rGeo = new THREE.RingGeometry(1 + i * 1.2, 1.2 + i * 1.2, 20);
      const rMat = new THREE.MeshBasicMaterial({
        color: 0x4a9ac8,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(rGeo, rMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(-13, 0.04, 10);
      this.scene.add(ring);
      this._pondRipples.push({ mesh: ring, phase: i * 1.2 });
    }
  }

  _updateWetland() {
    const g = this._ease(this.growth.wetland);
    this._wetlandMat.opacity = g * 0.75;
    this._wetlandMat.color.setHSL(
      0.56 + g * 0.04,
      0.45 + g * 0.2,
      0.18 + g * 0.12
    );

    // Animated ripples
    this._pondRipples.forEach(({ mesh, phase }) => {
      const t = this.elapsed * 0.6 + phase;
      const a = g * 0.35 * Math.abs(Math.sin(t));
      mesh.material.opacity = a;
      const sc = 0.7 + 0.6 * ((t % 3) / 3);
      mesh.scale.setScalar(sc);
    });
  }

  // ── ferns / undergrowth ───────────────────────────────────

  _buildFerns() {
    for (let i = 0; i < 60; i++) {
      const h = rand(0.2, 0.55);
      const geo = new THREE.ConeGeometry(rand(0.15, 0.35), h, 4);
      const mat = new THREE.MeshLambertMaterial({
        color: 0x1a3210,
        transparent: true,
        opacity: 0,
      });
      const fern = new THREE.Mesh(geo, mat);
      fern.position.set(
        sr(i * 9.1) * 60 - 30,
        h / 2,
        sr(i * 5.7) * 60 - 30
      );
      fern.rotation.y = Math.random() * Math.PI * 2;
      fern.rotation.z = rand(-0.2, 0.2);
      this.scene.add(fern);
      this._ferns.push({ mesh: fern, delay: i * 0.015 });
    }
  }

  _updateFerns() {
    const g = this._ease(this.growth.undergrowth);
    this._ferns.forEach(({ mesh, delay }) => {
      const localG = Math.max(0, Math.min(1, g - delay));
      mesh.material.opacity = localG * 0.88;
      mesh.material.color.setHSL(
        0.28 + rand(0, 0.04),
        0.5 + localG * 0.2,
        0.1 + localG * 0.15
      );
    });
  }

  // ── birds ─────────────────────────────────────────────────

  _buildBirds() {
    for (let i = 0; i < 8; i++) {
      const geo = new THREE.BufferGeometry();
      // Simple V-shape in local space
      const verts = new Float32Array([
        -0.5, 0, 0,  0, 0.15, 0,  0, 0.15, 0,  0.5, 0, 0,
      ]);
      geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
      const mat = new THREE.LineBasicMaterial({
        color: 0x90c860,
        transparent: true,
        opacity: 0,
      });
      const bird = new THREE.LineSegments(geo, mat);
      bird.userData.index = i;
      this._birdGroup.add(bird);
    }
  }

  _updateBirds() {
    const g = this._ease(this.growth.birds);
    const t = this.elapsed;

    this._birdGroup.children.forEach((bird, i) => {
      bird.material.opacity = g * (0.5 + 0.4 * Math.abs(Math.sin(t * 0.8 + i)));
      // Fly across the sky in lazy arcs
      const speed = 0.18 + i * 0.04;
      bird.position.x = Math.sin(t * speed + i * 2.1) * 14;
      bird.position.y = 8 + Math.sin(t * 0.2 + i * 1.4) * 2.5;
      bird.position.z = Math.cos(t * speed * 0.7 + i * 1.8) * 10;
      // Wing flap
      const flap = Math.sin(t * 3.5 + i) * 0.15 * g;
      const pos = bird.geometry.attributes.position;
      pos.setXYZ(1, 0, 0.15 + flap, 0);
      pos.setXYZ(2, 0, 0.15 + flap, 0);
      pos.needsUpdate = true;
    });
  }

  // ── stream sparkle particles ──────────────────────────────

  _buildParticles() {
    const count = 120;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = rand(-18, 18);
      positions[i * 3 + 1] = rand(0.1, 0.4);
      positions[i * 3 + 2] = rand(0, 6);
      velocities.push({ vx: rand(-0.02, 0.02), vy: rand(0.01, 0.04), life: Math.random() });
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x90d8f8,
      size: 0.12,
      transparent: true,
      opacity: 0,
      sizeAttenuation: true,
    });
    this._particles = new THREE.Points(geo, mat);
    this._particleVel = velocities;
    this.scene.add(this._particles);
  }

  _updateParticles() {
    const g = this._ease(this.growth.stream2);
    this._particles.material.opacity = g * 0.7;
    if (g < 0.05) return;

    const pos = this._particles.geometry.attributes.position;
    this._particleVel.forEach((v, i) => {
      let y = pos.getY(i) + v.vy * g;
      if (y > 1.5) { y = 0.1; }
      pos.setXYZ(i, pos.getX(i) + v.vx, y, pos.getZ(i));
    });
    pos.needsUpdate = true;
  }

  // ── util ──────────────────────────────────────────────────
  _ease(t) { return 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3); }
}
