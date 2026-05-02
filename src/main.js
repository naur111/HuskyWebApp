/**
 * main.js
 * Greenbelt Explorer — orchestrates all systems.
 *
 * Boot order:
 *  1. Three.js renderer + scene + camera
 *  2. WorldGenerator  (builds scene, exposes collidables)
 *  3. SpeciesCards    (3D card objects)
 *  4. PlayerController (first-person movement)
 *  5. DiscoveryCard   (DOM modal)
 *  6. AudioManager
 *  7. UI wiring + game loop
 */

import * as THREE from 'three';
import { WorldGenerator }   from './systems/WorldGenerator.js';
import { SpeciesCards }     from './systems/SpeciesCards.js';
import { PlayerController } from './systems/PlayerController.js';
import { DiscoveryCard }    from './systems/DiscoveryCard.js';
import { AudioManager }     from './systems/AudioManager.js';
import { SPECIES }          from './data/species.js';

// ── Constants ────────────────────────────────────────────────
const TIMED_DURATION   = 15;   // seconds
const DISCOVERY_RADIUS = 2.5;
const NEARBY_RADIUS    = 5.0;

// ── Three.js setup ───────────────────────────────────────────
const canvas = document.getElementById('game-canvas');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
renderer.setSize(window.innerWidth, window.innerHeight);

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 150);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Systems ───────────────────────────────────────────────────
const world  = new WorldGenerator(scene);
const cards  = new SpeciesCards(scene);
const player = new PlayerController(camera, canvas, world.collidables);
const audio  = new AudioManager();

// DiscoveryCard initialised after DOM is ready
let discCard;

// ── Game state ────────────────────────────────────────────────
let phase          = 'start';   // 'start' | 'playing' | 'ended'
let gameMode       = 'explorer';
let discoveredIds  = [];
let timeLeft       = TIMED_DURATION;
let timerInterval  = null;
let locked         = false;     // prevents double-triggers

// ── DOM refs ──────────────────────────────────────────────────
const $  = id => document.getElementById(id);
const startScr   = $('start-screen');
const hud        = $('hud');
const endScr     = $('end-screen');
const modePill   = $('mode-pill');
const sunTrack   = $('sun-track');
const sunFill    = $('sun-fill');
const sunOrb     = $('sun-orb');
const whisper    = $('whisper');
const foundCount = $('found-count');
const foundNames = $('found-names');
const lockNotice = $('lock-notice');

// ── Screen transitions ────────────────────────────────────────
function showStart() {
  startScr.classList.remove('gone');
  hud.classList.add('hidden');
  endScr.classList.remove('open');
  endScr.classList.add('hidden');
}

function showGame(mode) {
  startScr.classList.add('gone');
  endScr.classList.add('hidden');
  endScr.classList.remove('open');
  hud.classList.remove('hidden');
  modePill.textContent = mode === 'timed' ? '⏱ timed mode' : '🌿 explorer mode';
  sunTrack.classList.toggle('hidden', mode !== 'timed');
}

function showEnd(foundSpecies) {
  hud.classList.add('hidden');
  endScr.classList.remove('hidden');
  endScr.classList.add('open');

  const endTitle = $('end-title');
  const endList  = $('end-list');
  const endEmpty = $('end-empty');

  endList.innerHTML = '';
  if (foundSpecies.length === 0) {
    endTitle.textContent = "Time's up!";
    endEmpty.classList.remove('hidden');
    endList.classList.add('hidden');
  } else {
    endTitle.textContent = 'Congrats! You discovered these Greenbelt species:';
    endEmpty.classList.add('hidden');
    endList.classList.remove('hidden');
    foundSpecies.forEach(sp => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${sp.emoji}</span>${sp.name}`;
      endList.appendChild(li);
    });
  }
}

// ── Game flow ─────────────────────────────────────────────────
function startGame(mode) {
  gameMode      = mode;
  phase         = 'playing';
  discoveredIds = [];
  timeLeft      = TIMED_DURATION;
  locked        = false;

  clearInterval(timerInterval);
  cards.reset();
  player.setPosition(0, 0);
  foundCount.innerHTML = '0<span>/8</span>';
  foundNames.innerHTML = '';
  lockNotice.classList.remove('hidden');

  showGame(mode);
  setTimeout(() => player.requestLock(), 350);

  if (mode === 'timed') {
    updateSunArc(1);
    timerInterval = setInterval(tick, 1000);
  }
}

function tick() {
  timeLeft--;
  updateSunArc(timeLeft / TIMED_DURATION);
  if (timeLeft <= 0) {
    clearInterval(timerInterval);
    endGame();
  }
}

function updateSunArc(fraction) {
  const pct = (fraction * 100).toFixed(1) + '%';
  sunFill.style.width = pct;
  sunOrb.style.left   = pct;
}

function endGame() {
  phase  = 'ended';
  locked = true;
  clearInterval(timerInterval);
  player.releaseLock();
  discCard.hide();
  const found = SPECIES.filter(s => discoveredIds.includes(s.id));
  showEnd(found);
}

// ── Discovery ─────────────────────────────────────────────────
function discover(entry) {
  if (locked || discoveredIds.includes(entry.sp.id)) return;
  discoveredIds.push(entry.sp.id);

  cards.markDiscovered(entry);
  world.trigger(entry.sp.worldEffect);
  audio.play(entry.sp.soundFile);

  // Update HUD counter
  foundCount.innerHTML = `${discoveredIds.length}<span>/8</span>`;
  const nameEl = document.createElement('div');
  nameEl.className = 'found-name-item';
  nameEl.textContent = entry.sp.name;
  foundNames.appendChild(nameEl);

  // Show discovery card — pause everything
  locked = true;
  player.releaseLock();
  discCard.show(entry.sp);
}

// ── Discovery card close callback ─────────────────────────────
function onCardClose() {
  locked = false;
  if (phase === 'playing') player.requestLock();
}

// ── Button wiring ─────────────────────────────────────────────
$('btn-explorer').addEventListener('click', () => startGame('explorer'));
$('btn-timed').addEventListener('click',   () => startGame('timed'));

$('btn-restart').addEventListener('click', () => {
  clearInterval(timerInterval);
  discCard.hide();
  startGame(gameMode);
});

$('btn-again').addEventListener('click', () => startGame(gameMode));
$('btn-home').addEventListener('click', () => {
  phase = 'start';
  clearInterval(timerInterval);
  player.releaseLock();
  discCard.hide();
  showStart();
});

// ── Pointer lock state → HUD notice ──────────────────────────
document.addEventListener('pointerlockchange', () => {
  const isLocked = document.pointerLockElement === canvas;
  if (phase === 'playing') {
    lockNotice.classList.toggle('hidden', isLocked);
  }
});

// ── Main loop ─────────────────────────────────────────────────
const clock = new THREE.Clock();
let elapsed = 0;

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;

  world.update(dt);
  cards.update(elapsed);

  if (phase === 'playing' && !locked) {
    player.update(dt);

    const pos = player.position;

    // Nearby whisper hint
    whisper.classList.toggle('hidden', !cards.isNearby(pos, NEARBY_RADIUS));

    // Discovery check
    const hit = cards.checkDiscovery(pos, DISCOVERY_RADIUS);
    if (hit) discover(hit);
  }

  renderer.render(scene, camera);
}

// ── Boot ──────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  discCard = new DiscoveryCard(onCardClose);
  showStart();
  loop();
});
