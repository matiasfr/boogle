// The hotbar (src/inventory.js) on screen and in hand: eight slots along the bottom, keys 1-8 (pad LB/RB, or tap a
// slot) to change what you hold, and whatever you hold drawn in your hand. Everyone sees what everyone holds through
// the presence field `hd` (a catalog index, -1 for empty hands; the beach ball shows itself). Touch gets a Toss button
// that throws whatever you hold. Serves DESIGN.md 1 (toys before chores: anything you carry is a toy you can throw)
// and 10 (slapstick over precision).
import './hotbar.css';
import * as THREE from 'three';
import { onFrame, onStart } from '../loop.js';
import { renderer } from '../scene.js';
import { me, ITEM_HAND } from '../player.js';
import { ball } from '../ball.js';
import { remotes, addPresenceField, onRemotePresence } from '../net.js';
import { inv, SLOTS, heldId, select } from '../inventory.js';
import { updateHands, throwDown, releaseThrow } from '../hands.js';
import { shovel } from '../world/terrain-edits.js';
import { pouring } from '../mushroom-garden.js';
import { itemModel } from '../item-models.js';
import { GIFTS, giftIndex } from '../sim/gift-catalog.js';
import { reducedMotion } from '../constants.js';

// ---------------------------------------------------------------- in hand
// How each thing sits in the hand: the model's offset below the hand, and the hand's tilt (x tips it forward).
const GRIP = {
  shovel: { p: [0, -0.6, 0], r: [0.35, 0, -0.2] },
  can: { p: [0, -0.33, 0.05] },
  seeds: { p: [0, -0.3, 0] },
  frisbee: { p: [0, -0.02, 0], r: [0.25, 0, -0.5] },
  driftwood: { p: [0, -0.07, 0], r: [0, 1.2, 0] },
};
const DEFAULT_GRIP = { p: [0, -0.12, 0] };

function heldModel(id) {
  const g = GRIP[id] ?? DEFAULT_GRIP;
  const hand = new THREE.Group();
  const model = itemModel(id);
  model.position.set(...g.p);
  hand.add(model);
  hand.position.set(ITEM_HAND.x, ITEM_HAND.y, ITEM_HAND.z);
  hand.userData.tilt = g.r ?? [0, 0, 0];
  return hand;
}

function setHeld(avatar, id) {
  const u = avatar.userData;
  const want = id && id !== 'ball' ? id : null;
  if (u.heldId !== want) {
    if (u.held) avatar.remove(u.held);
    u.heldId = want;
    u.held = want ? heldModel(want) : null;
    if (u.held) avatar.add(u.held);
  }
  return u.held;
}

function updateInHand(now) {
  if (me.avatar) {
    const hand = setHeld(me.avatar, heldId());
    if (hand) {
      const [x, y, z] = hand.userData.tilt;
      const t = now / 1000;
      const dig = heldId() === 'shovel' && shovel.hold && !reducedMotion ? Math.sin(t * 14) * 0.45 : 0;
      const pour = heldId() === 'can' && pouring() ? -0.9 : 0;
      const wind = me.charging ? -0.6 : 0;
      hand.rotation.set(x + dig + pour + wind, y, z);
    }
  }
  for (const r of remotes.values()) {
    if (!r.avatar) continue;
    const hand = setHeld(r.avatar, r.hd);
    if (hand) hand.rotation.set(...hand.userData.tilt);
  }
}

// ---------------------------------------------------------------- icons
// Each item's slot icon is its own model, rendered once to a small image.
const ICON = 96;
const icons = new Map();
const iconScene = new THREE.Scene();
iconScene.add(new THREE.HemisphereLight('#ffffff', '#8a7a66', 2.2));
const keyLight = new THREE.DirectionalLight('#ffffff', 2.2);
keyLight.position.set(2, 3, 2);
iconScene.add(keyLight);
const iconCam = new THREE.PerspectiveCamera(28, 1, 0.01, 50);
let iconTarget = null;
const toSrgb = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

function iconFor(id) {
  if (icons.has(id)) return icons.get(id);
  iconTarget ??= new THREE.WebGLRenderTarget(ICON, ICON);
  const model = id === 'ball' ? new THREE.Mesh(ball.mesh.geometry, ball.mesh.material) : itemModel(id);
  if (id === 'shovel') model.rotation.z = -0.8; // diagonal, so a long thin thing fills the square
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3()).length() || 1;
  model.position.sub(box.getCenter(new THREE.Vector3()));
  iconScene.add(model);
  iconCam.position.set(size * 1.2, size * 1.25, size * 1.9);
  iconCam.lookAt(0, 0, 0);
  const prev = { target: renderer.getRenderTarget(), color: renderer.getClearColor(new THREE.Color()) };
  const prevAlpha = renderer.getClearAlpha();
  renderer.setRenderTarget(iconTarget);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(iconScene, iconCam);
  const px = new Uint8Array(ICON * ICON * 4);
  renderer.readRenderTargetPixels(iconTarget, 0, 0, ICON, ICON, px);
  renderer.setRenderTarget(prev.target);
  renderer.setClearColor(prev.color, prevAlpha);
  iconScene.remove(model);
  // Render targets hold linear colour and rows bottom-up: convert and flip into a canvas.
  const c = document.createElement('canvas');
  c.width = c.height = ICON;
  const g = c.getContext('2d');
  const img = g.createImageData(ICON, ICON);
  for (let y = 0; y < ICON; y++)
    for (let x = 0; x < ICON; x++) {
      const from = ((ICON - 1 - y) * ICON + x) * 4,
        to = (y * ICON + x) * 4;
      const a = px[from + 3] / 255;
      for (let k = 0; k < 3; k++) img.data[to + k] = a ? Math.round(toSrgb(px[from + k] / 255 / a) * 255) : 0;
      img.data[to + 3] = px[from + 3];
    }
  g.putImageData(img, 0, 0);
  const url = c.toDataURL();
  icons.set(id, url);
  return url;
}

// ---------------------------------------------------------------- HUD
const ui = { root: null, name: null, slots: [], toss: null, version: -1, nameUntil: 0 };
const label = (s) => {
  if (!s) return '';
  const name = s.id === 'ball' ? 'Beach ball' : GIFTS[giftIndex(s.id)].name;
  const cap = name[0].toUpperCase() + name.slice(1);
  return s.id === 'seeds' ? `Mushroom seeds ×${s.n}` : cap;
};

function buildHud() {
  const hud = document.querySelector('.hud') ?? document.body;
  ui.root = document.createElement('div');
  ui.root.className = 'hotbar';
  ui.root.hidden = true;
  ui.name = document.createElement('div');
  ui.name.className = 'hotbar-name';
  const row = document.createElement('div');
  row.className = 'hotbar-slots';
  for (let k = 0; k < SLOTS; k++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hotbar-slot';
    const key = document.createElement('span');
    key.className = 'hotbar-key';
    key.textContent = String(k + 1);
    const img = document.createElement('img');
    img.className = 'hotbar-icon';
    img.alt = '';
    img.hidden = true;
    const n = document.createElement('span');
    n.className = 'hotbar-n';
    b.append(key, img, n);
    b.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      select(k);
    });
    row.append(b);
    ui.slots.push(b);
  }
  ui.root.append(ui.name, row);
  hud.append(ui.root);

  const touch = document.getElementById('touch');
  if (touch) {
    ui.toss = document.createElement('button');
    ui.toss.className = 'tbtn toss';
    ui.toss.type = 'button';
    ui.toss.textContent = 'Toss';
    ui.toss.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      throwDown();
    });
    ui.toss.addEventListener('pointerup', (e) => {
      e.stopPropagation();
      releaseThrow();
    });
    ui.toss.addEventListener('pointercancel', () => (me.charging = false));
    touch.append(ui.toss);
  }
}

function renderHud(now) {
  ui.root.hidden = !me.entered;
  document.body.classList.toggle('holding-thing', !!heldId());
  if (ui.version !== inv.version) {
    ui.version = inv.version;
    inv.slots.forEach((s, k) => {
      const b = ui.slots[k];
      const img = b.querySelector('img');
      b.classList.toggle('on', k === inv.sel);
      b.title = label(s);
      img.hidden = !s;
      if (s) img.src = iconFor(s.id);
      b.querySelector('.hotbar-n').textContent = s?.id === 'seeds' ? String(s.n) : '';
    });
    ui.name.textContent = label(inv.slots[inv.sel]);
    ui.nameUntil = now + 1800;
  }
  ui.name.classList.toggle('shown', !!ui.name.textContent && now < ui.nameUntil);
}

// ---------------------------------------------------------------- keys, presence, frame
onStart(() => {
  buildHud();
  addEventListener('keydown', (e) => {
    if (!me.entered || e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.target?.tagName === 'INPUT') return;
    const k = /^Digit([1-8])$/.exec(e.code);
    if (k) select(Number(k[1]) - 1);
  });
  const help = document.getElementById('help');
  for (const [key, text] of [
    ['1-8', 'Hold something from your hotbar (again: empty hands)'],
    ['E', 'Pick up, pet, take; or hold to throw what you hold'],
  ]) {
    const row = document.createElement('div');
    const kbd = document.createElement('kbd');
    kbd.textContent = key;
    const span = document.createElement('span');
    span.textContent = text;
    row.append(kbd, span);
    help?.append(row);
  }
});

addPresenceField('hd', () => {
  if (!me.entered) return null;
  const id = heldId();
  return id && id !== 'ball' ? giftIndex(id) : -1;
});
onRemotePresence((r, pr) => {
  r.hd = Number.isInteger(pr.hd) && GIFTS[pr.hd] ? GIFTS[pr.hd].id : null;
});

onFrame(({ now }) => {
  updateHands();
  updateInHand(now);
  if (ui.root) renderHud(now);
});
