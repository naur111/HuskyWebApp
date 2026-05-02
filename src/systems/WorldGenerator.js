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
      ecosystem: 0,   // cumulative — rises 1/8 per animal caught
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

    // Ecosystem growth objects
    this._flowers    = [];
    this._bushes     = [];
    this._lilyPads   = [];
    this._mushrooms  = [];
    this._puddles    = [];
    this._fireflyPts = null;
    this._fireflyVel = [];
    this._bursts     = [];      // transient discovery-burst particles

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

  /** Advance ecosystem by 1/8 per animal caught (call with discoveredCount / 8) */
  setEcosystem(fraction) {
    this.targets.ecosystem = Math.min(1, Math.max(0, fraction));
  }

  /** Spawn a confetti burst at world position (x, z) with a hex colour string */
  spawnBurst(x, z, hexColor) {
    const count = 48;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const vels = [];
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = x;
      positions[i * 3 + 1] = 0.6;
      positions[i * 3 + 2] = z;
      const angle = (i / count) * Math.PI * 2 + rand(-0.15, 0.15);
      const speed = 0.04 + Math.random() * 0.09;
      vels.push({
        vx: Math.cos(angle) * speed,
        vy: 0.07 + Math.random() * 0.11,
        vz: Math.sin(angle) * speed,
      });
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: new THREE.Color(hexColor || '#88ff44'),
      size: 0.22,
      transparent: true,
      opacity: 1.0,
      sizeAttenuation: true,
    });
    const pts = new THREE.Points(geo, mat);
    this.scene.add(pts);
    this._bursts.push({ pts, vels, life: 1.0 });
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
    this._updateFlowers();
    this._updateBushes();
    this._updateLilyPads();
    this._updateMushrooms();
    this._updatePuddles();
    this._updateFireflies();
    this._updateBursts(dt);
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
    this._buildFlowers();
    this._buildBushes();
    this._buildLilyPads();
    this._buildMushrooms();
    this._buildPuddles();
    this._buildFireflies();
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

    // Sky and background colour — stay in warm green/gold tones, never slide into blue
    const skyCol = new THREE.Color().setHSL(
      0.33 + skyG * 0.07,   // green → golden-green (max 0.40), not cyan
      0.25 + skyG * 0.15,
      0.04 + skyG * 0.28    // get visibly brighter
    );
    this.scene.background = skyCol;

    // Fog thins as the sky opens; keep it in warm-green tones
    this.scene.fog.color.setHSL(
      0.30 + skyG * 0.05,   // stays green, not cyan
      0.30 + skyG * 0.1,
      0.12 + skyG * 0.20    // brighter haze, less colour saturation
    );
    this.scene.fog.density = 0.045 - skyG * 0.022;  // clears as canopy opens

    // Ambient — warms to a golden-green with sky
    this._ambientLight.color.setHSL(
      0.28 + skyG * 0.04,   // stays in warm green-yellow
      0.35 + skyG * 0.15,
      0.12 + skyG * 0.35
    );
    this._ambientLight.intensity = 0.4 + skyG * 0.9;

    // Sun — brightens and warms (warm yellow, not blue)
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

  // ── flowers ───────────────────────────────────────────────

  _buildFlowers() {
    const palette = [
      0xff3366, 0xff8811, 0xffdd00, 0xff55bb,
      0xbb44ff, 0xffffff, 0x55ffcc, 0xff8888,
      0xffaa33, 0xee55ff, 0x44ffaa, 0xffcc44,
    ];
    for (let i = 0; i < 120; i++) {
      const stemH = rand(0.18, 0.44);
      const headR = 0.05 + rand(0, 0.04);

      const stemGeo = new THREE.CylinderGeometry(0.012, 0.02, stemH, 4);
      const stemMat = new THREE.MeshLambertMaterial({
        color: 0x2d6b1a, transparent: true, opacity: 0,
      });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.y = stemH / 2;

      const headGeo = new THREE.SphereGeometry(headR, 6, 4);
      const headMat = new THREE.MeshLambertMaterial({
        color: palette[i % palette.length], transparent: true, opacity: 0,
      });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.y = stemH + headR;

      const centerGeo = new THREE.SphereGeometry(0.02, 4, 3);
      const centerMat = new THREE.MeshLambertMaterial({
        color: 0xffee44, transparent: true, opacity: 0,
      });
      const center = new THREE.Mesh(centerGeo, centerMat);
      center.position.y = stemH + headR * 1.35;

      const group = new THREE.Group();
      group.position.set(sr(i * 13.7) * 64 - 32, 0, sr(i * 6.9) * 64 - 32);
      group.rotation.y = sr(i * 2.3) * Math.PI * 2;
      group.add(stem, head, center);
      this.scene.add(group);

      this._flowers.push({ stem, head, center, delay: i / 120 });
    }
  }

  _updateFlowers() {
    const g = this._ease(this.growth.ecosystem);
    this._flowers.forEach(({ stem, head, center, delay }) => {
      const lg = Math.max(0, Math.min(1, g - delay));
      stem.material.opacity   = lg * 0.9;
      head.material.opacity   = lg * 0.95;
      center.material.opacity = lg * 0.95;
    });
  }

  // ── bushes ────────────────────────────────────────────────

  _buildBushes() {
    for (let i = 0; i < 30; i++) {
      const group = new THREE.Group();
      group.position.set(sr(i * 17.3) * 60 - 30, 0, sr(i * 11.9) * 60 - 30);
      const count = 2 + Math.floor(sr(i * 5.5) * 3);
      const meshes = [];
      for (let s = 0; s < count; s++) {
        const r = 0.28 + sr((i * 7 + s) * 3.3) * 0.45;
        const geo = new THREE.SphereGeometry(r, 6, 5);
        const hue = 0.27 + sr((i + s) * 2.1) * 0.05;
        const mat = new THREE.MeshLambertMaterial({
          color: new THREE.Color().setHSL(hue, 0.5, 0.13),
          transparent: true, opacity: 0,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(
          sr((i * 9 + s) * 2.7) * 0.5 - 0.25,
          r * 0.75,
          sr((i * 11 + s) * 1.9) * 0.5 - 0.25,
        );
        group.add(mesh);
        meshes.push(mesh);
      }
      this.scene.add(group);
      this._bushes.push({ meshes, delay: i / 30 });
    }
  }

  _updateBushes() {
    const g = this._ease(this.growth.ecosystem);
    this._bushes.forEach(({ meshes, delay }) => {
      const lg = Math.max(0, Math.min(1, g - delay));
      meshes.forEach(m => { m.material.opacity = lg * 0.88; });
    });
  }

  // ── lily pads ─────────────────────────────────────────────

  _buildLilyPads() {
    const cx = -13, cz = 10;  // wetland centre
    for (let i = 0; i < 10; i++) {
      const r = 0.22 + rand(0, 0.22);
      // Partial circle with a small notch
      const geo = new THREE.CircleGeometry(r, 10, 0.15, Math.PI * 1.85);
      const mat = new THREE.MeshLambertMaterial({
        color: new THREE.Color().setHSL(0.30 + rand(0, 0.04), 0.55, 0.18),
        transparent: true, opacity: 0, side: THREE.DoubleSide,
      });
      const pad = new THREE.Mesh(geo, mat);
      const angle = (i / 10) * Math.PI * 2;
      const dist  = rand(0.4, 3.1);
      pad.rotation.x = -Math.PI / 2;
      pad.rotation.z = rand(0, Math.PI * 2);
      pad.position.set(cx + Math.cos(angle) * dist, 0.05, cz + Math.sin(angle) * dist);
      this.scene.add(pad);
      this._lilyPads.push({ mesh: pad, delay: i / 10 });
    }
  }

  _updateLilyPads() {
    const wg = this._ease(this.growth.wetland);
    this._lilyPads.forEach(({ mesh, delay }, i) => {
      const lg = Math.max(0, Math.min(1, wg - delay * 0.8));
      mesh.material.opacity = lg * 0.82;
      mesh.position.y = 0.05 + Math.sin(this.elapsed * 0.4 + i * 1.2) * 0.012;
    });
  }

  // ── mushrooms ─────────────────────────────────────────────

  _buildMushrooms() {
    const capColors = [0xcc4422, 0xdd7733, 0xbb3311, 0xee9944, 0xddbb66, 0xffd4aa];
    for (let i = 0; i < 35; i++) {
      const stemH = rand(0.08, 0.22);
      const capR  = rand(0.07, 0.17);

      const stemGeo = new THREE.CylinderGeometry(0.018, 0.026, stemH, 5);
      const stemMat = new THREE.MeshLambertMaterial({
        color: 0xd4bca0, transparent: true, opacity: 0,
      });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.y = stemH / 2;

      // Hemisphere cap
      const capGeo = new THREE.SphereGeometry(capR, 7, 4, 0, Math.PI * 2, 0, Math.PI * 0.55);
      const capMat = new THREE.MeshLambertMaterial({
        color: capColors[i % capColors.length], transparent: true, opacity: 0,
      });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.y = stemH + capR * 0.12;

      const group = new THREE.Group();
      group.position.set(sr(i * 15.3) * 58 - 29, 0, sr(i * 8.1) * 58 - 29);
      group.rotation.y = sr(i * 3.7) * Math.PI * 2;
      group.add(stem, cap);
      this.scene.add(group);

      this._mushrooms.push({ stem, cap, delay: i / 35 });
    }
  }

  _updateMushrooms() {
    const ug = this._ease(this.growth.undergrowth);
    const eg = this._ease(this.growth.ecosystem) * 0.55;
    const g  = Math.max(ug, eg);
    this._mushrooms.forEach(({ stem, cap, delay }) => {
      const lg = Math.max(0, Math.min(1, g - delay));
      stem.material.opacity = lg * 0.85;
      cap.material.opacity  = lg * 0.9;
    });
  }

  // ── puddles ───────────────────────────────────────────────

  _buildPuddles() {
    const spots = [
      [ 5,  8], [-8, -5], [12,  2], [-3, 14],
      [ 8, -10], [-15, -10], [0, -16],
    ];
    spots.forEach(([x, z], i) => {
      const r = 0.45 + rand(0, 1.1);
      const geo = new THREE.CircleGeometry(r, 12);
      const mat = new THREE.MeshLambertMaterial({
        color: 0x2266bb, transparent: true, opacity: 0,
      });
      const puddle = new THREE.Mesh(geo, mat);
      puddle.rotation.x = -Math.PI / 2;
      puddle.position.set(x, 0.02, z);
      this.scene.add(puddle);
      this._puddles.push({ mesh: puddle, delay: i / spots.length });
    });
  }

  _updatePuddles() {
    const sg = Math.max(
      this._ease(this.growth.stream),
      this._ease(this.growth.wetland),
    );
    const eg = this._ease(this.growth.ecosystem);
    const g  = Math.max(sg * 0.8, eg * 0.6);
    this._puddles.forEach(({ mesh, delay }, i) => {
      const lg = Math.max(0, Math.min(1, g - delay));
      mesh.material.opacity = lg * (0.45 + 0.1 * Math.sin(this.elapsed * 0.9 + i * 1.7));
      mesh.material.color.setHSL(
        0.57 + Math.sin(this.elapsed * 0.3 + i) * 0.02,
        0.55,
        0.20 + lg * 0.1,
      );
    });
  }

  // ── fireflies ─────────────────────────────────────────────

  _buildFireflies() {
    const count = 60;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const vels = [];
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = rand(-16, 16);
      positions[i * 3 + 1] = rand(0.5, 3.5);
      positions[i * 3 + 2] = rand(-16, 16);
      vels.push({
        phase: Math.random() * Math.PI * 2,
        speed: rand(0.25, 0.75),
        cx: rand(-14, 14),
        cz: rand(-14, 14),
      });
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this._fireflyPts = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xccff66, size: 0.18, transparent: true, opacity: 0, sizeAttenuation: true,
    }));
    this._fireflyVel = vels;
    this.scene.add(this._fireflyPts);
  }

  _updateFireflies() {
    const g = this._ease(this.growth.ecosystem);
    // Only visible once ecosystem is at least 40% grown
    const vis = Math.max(0, (g - 0.4) / 0.6);
    this._fireflyPts.material.opacity =
      vis * 0.75 * (0.5 + 0.5 * Math.abs(Math.sin(this.elapsed * 1.8)));

    if (vis < 0.01) return;
    const pos = this._fireflyPts.geometry.attributes.position;
    this._fireflyVel.forEach((v, i) => {
      const a = this.elapsed * v.speed + v.phase;
      pos.setXYZ(i,
        v.cx + Math.sin(a) * 2.5,
        1.2 + Math.sin(a * 0.5) * 0.8,
        v.cz + Math.cos(a * 0.7) * 2.0,
      );
    });
    pos.needsUpdate = true;
  }

  // ── discovery burst ───────────────────────────────────────

  _updateBursts(dt) {
    this._bursts = this._bursts.filter(b => {
      b.life -= dt * 0.85;
      if (b.life <= 0) {
        this.scene.remove(b.pts);
        b.pts.geometry.dispose();
        b.pts.material.dispose();
        return false;
      }
      b.pts.material.opacity = b.life;
      const pos = b.pts.geometry.attributes.position;
      b.vels.forEach((v, i) => {
        v.vy -= dt * 0.18;  // gravity
        pos.setXYZ(i,
          pos.getX(i) + v.vx,
          Math.max(0.05, pos.getY(i) + v.vy),
          pos.getZ(i) + v.vz,
        );
      });
      pos.needsUpdate = true;
      return true;
    });
  }

  // ── util ──────────────────────────────────────────────────
  _ease(t) { return 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3); }
}
