// The hotbar (src/inventory.js) on screen and in hand: eight slots along the bottom (on touch at the top, or down the
// right edge in portrait), keys 1-8 (pad LB/RB, or tap a slot) to change what you hold, and whatever you hold drawn in
// your hand. Everyone sees what everyone holds through the presence field `hd` (a catalog index, -1 for empty hands;
// the beach ball shows itself). On touch the bar shows only filled slots (tap the held one again for empty hands) and
// a Toss button appears whenever you hold something throwable and the main button would do something other than throw
// (a tool's verb, or Talk / Pick up near a target). The shovel is never thrown (canThrow in src/hands.js); a save that
// lost it anyway gets body.no-shovel, which shows the touch Pile button to hand a new one back. Serves DESIGN.md 1
// (toys before chores: anything you carry is a toy you can throw, and the shovel is always at hand) and 10 (slapstick
// over precision).
import './hotbar.css';
import * as THREE from 'three';
import { onFrame, onStart } from '../loop.js';
import { me, ITEM_HAND } from '../player.js';
import { remotes, addPresenceField, onRemotePresence } from '../net.js';
import { inv, SLOTS, heldId, select, has } from '../inventory.js';
import { updateHands, throwDown, releaseThrow, useVerb, canThrow, handsNote } from '../hands.js';
import { shovel } from '../world/terrain-edits.js';
import { pouring } from '../mushroom-garden.js';
import { itemModel } from '../item-models.js';
import { iconFor } from '../item-icons.js';
import { glyph, inputKind } from '../glyphs.js';
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

// ---------------------------------------------------------------- HUD
const NAME_MS = 2400;
const ALT_VERB = { shovel: 'Pile' };
const ui = {
  root: null,
  name: null,
  note: null,
  slots: [],
  toss: null,
  version: -1,
  kind: '',
  nameUntil: 0,
  noteAt: 0,
};
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
  const tags = document.createElement('div');
  tags.className = 'hotbar-tags';
  ui.name = document.createElement('div');
  ui.name.className = 'hotbar-name';
  ui.note = document.createElement('div');
  ui.note.className = 'hotbar-note';
  tags.append(ui.name, ui.note);
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
  ui.root.append(tags, row);
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

// The held thing's name, and on a computer or gamepad what its buttons do.
function nameTag(s, kind) {
  if (!s) return '';
  const verb = useVerb();
  if (!verb || kind === 'touch') return `<span>${label(s)}</span>`;
  const use = (g, v) => `<span class="hotbar-use">${g}${v}</span>`;
  const alt = ALT_VERB[s.id];
  return `<span>${label(s)}</span>${use(glyph('use'), verb)}${alt ? use(glyph('alt'), alt) : ''}`;
}

function renderHud(now) {
  ui.root.hidden = !me.entered;
  document.body.classList.toggle('holding-throwable', canThrow());
  const kind = inputKind();
  if (ui.version !== inv.version || ui.kind !== kind) {
    if (ui.version !== inv.version) ui.nameUntil = now + NAME_MS;
    ui.version = inv.version;
    ui.kind = kind;
    document.body.classList.toggle('no-shovel', !has('shovel'));
    inv.slots.forEach((s, k) => {
      const b = ui.slots[k];
      const img = b.querySelector('img');
      b.classList.toggle('on', k === inv.sel);
      b.hidden = !s && kind === 'touch';
      b.title = label(s);
      img.hidden = !s;
      if (s) img.src = iconFor(s.id);
      b.querySelector('.hotbar-n').textContent = s?.id === 'seeds' ? String(s.n) : '';
    });
    ui.name.innerHTML = nameTag(inv.slots[inv.sel], kind);
  }
  const noting = now < handsNote.until && !!handsNote.text;
  if (noting && ui.noteAt !== handsNote.until) {
    ui.noteAt = handsNote.until;
    ui.note.textContent = handsNote.text;
    ui.note.classList.remove('shake');
    void ui.note.offsetWidth; // restart the shake
    ui.note.classList.add('shake');
  }
  ui.note.classList.toggle('shown', noting);
  ui.name.classList.toggle('shown', !noting && !!ui.name.innerHTML && now < ui.nameUntil);
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
    ['E', 'Talk, pick up, take, shake a palm'],
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
