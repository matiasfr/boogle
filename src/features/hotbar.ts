// The hotbar (src/player/inventory.ts) on screen and in hand: five slots along the bottom (on touch at the top, or down the
// right edge in portrait), keys 1-5 (pad LB/RB, or tap a slot) to change what you hold, and whatever you hold drawn in
// your hand. Everyone sees what everyone holds through the presence field `hd` (a catalog index, -1 for empty hands;
// the beach ball shows itself). On touch the bar shows only filled slots (tap the held one again for empty hands) and
// a Toss button appears whenever you hold something throwable and the main button would do something other than throw
// (a tool's verb, or Talk / Pick up near a target). Serves DESIGN.md 1 (toys before chores: anything you carry is a toy
// you can throw) and 10 (slapstick over precision). A select ticks (one soft tone) and the slot bounces, and a note ("Hotbar
// full") goes to the shared notification lane (src/ui/notify.ts); docs/research/ui-patterns.md, recs 1, 2, 4 and 5.
import '../ui/ui-kit.css';
import './hotbar.css';
import * as THREE from 'three';
import { onFrame, onStart } from '../loop.ts';
import { me, ITEM_HAND } from '../player/player.ts';
import { remotes, addPresenceField, onRemotePresence } from '../netplay/net.ts';
import { inv, SLOTS, heldId, select, type Slot } from '../player/inventory.ts';
import { updateHands, throwDown, releaseThrow, useVerb, canThrow, handsNote } from '../player/hands.ts';
import { pouring } from '../adapters/mushroom-garden.ts';
import { itemModel } from '../player/item-models.ts';
import { warmUp } from '../render/precompile.ts';
import { setIcon, warmIcons } from '../player/item-icons.ts';
import { glyph, inputKind } from '../player/glyphs.ts';
import { describeControl, onKey } from '../player/controls.ts';
import { GIFTS, giftIndex, carryable } from '../sim/gift-catalog.ts';
import { uiSound, replay } from '../ui/ui-sound.ts';
import { notify } from '../ui/notify.ts';

// ---------------------------------------------------------------- in hand
// How each thing sits in the hand: the model's offset below the hand, and the hand's tilt (x tips it forward).
type Grip = { p: [number, number, number]; r?: [number, number, number] };
const GRIP: Record<string, Grip> = {
  can: { p: [0, -0.33, 0.05] },
  seeds: { p: [0, -0.3, 0] },
  frisbee: { p: [0, -0.02, 0], r: [0.25, 0, -0.5] },
};
const DEFAULT_GRIP: Grip = { p: [0, -0.12, 0] };

function heldModel(id: string) {
  const g = GRIP[id] ?? DEFAULT_GRIP;
  const hand = new THREE.Group();
  const model = itemModel(id);
  model.position.set(...g.p);
  hand.add(model);
  hand.position.set(ITEM_HAND.x, ITEM_HAND.y, ITEM_HAND.z);
  hand.userData.tilt = g.r ?? [0, 0, 0];
  return hand;
}

function setHeld(avatar: THREE.Object3D, id: string | null | undefined): THREE.Group | null {
  const u = avatar.userData as { heldId?: string | null; held?: THREE.Group | null };
  const want = id && id !== 'ball' ? id : null;
  if (u.heldId !== want) {
    if (u.held) avatar.remove(u.held);
    u.heldId = want;
    u.held = want ? heldModel(want) : null;
    if (u.held) avatar.add(u.held);
  }
  return u.held ?? null;
}

function updateInHand() {
  if (me.avatar) {
    const hand = setHeld(me.avatar, heldId());
    if (hand) {
      const [x, y, z] = hand.userData.tilt;
      const pour = heldId() === 'can' && pouring() ? -0.9 : 0;
      const wind = me.charging ? -0.6 : 0;
      hand.rotation.set(x + pour + wind, y, z);
    }
  }
  for (const r of remotes.values()) {
    if (!r.avatar) continue;
    const hand = setHeld(r.avatar, r.hd);
    if (hand) hand.rotation.set(...(hand.userData.tilt as [number, number, number]));
  }
}

// ---------------------------------------------------------------- HUD
const NAME_MS = 2400;
// The HUD's elements: made in buildHud, before the first render.
const ui = {
  root: null as unknown as HTMLElement,
  name: null as unknown as HTMLElement,
  slots: [] as HTMLButtonElement[],
  toss: null as HTMLButtonElement | null,
  version: -1,
  sel: inv.sel,
  kind: '',
  nameUntil: 0,
  noteAt: 0,
};
const label = (s: Slot | null | undefined) => {
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
  tags.append(ui.name);
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
    const toss = (ui.toss = document.createElement('button'));
    toss.className = 'tbtn toss';
    toss.type = 'button';
    toss.textContent = 'Toss';
    toss.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      throwDown();
    });
    toss.addEventListener('pointerup', (e) => {
      e.stopPropagation();
      releaseThrow();
    });
    toss.addEventListener('pointercancel', () => (me.charging = false));
    touch.append(toss);
  }
}

// The held thing's name, and on a computer or gamepad what its buttons do.
function nameTag(s: Slot | null | undefined, kind: string) {
  if (!s) return '';
  const verb = useVerb();
  if (!verb || kind === 'touch') return `<span>${label(s)}</span>`;
  // On a pad X uses what you hold whenever nothing is in reach (its prompt shows when something is).
  return `<span>${label(s)}</span><span class="hotbar-use">${glyph(kind === 'pad' ? 'interact' : 'use')}${verb}</span>`;
}

function renderHud(now: number) {
  ui.root.hidden = !me.entered;
  document.body.classList.toggle('holding-throwable', canThrow());
  const kind = inputKind();
  if (ui.version !== inv.version || ui.kind !== kind) {
    if (ui.version !== inv.version) ui.nameUntil = now + NAME_MS;
    ui.version = inv.version;
    ui.kind = kind;
    inv.slots.forEach((s, k) => {
      const b = ui.slots[k];
      const img = b.querySelector('img')!;
      b.classList.toggle('on', k === inv.sel);
      b.hidden = !s && kind === 'touch';
      b.title = label(s);
      img.hidden = !s;
      if (s) setIcon(img, s.id);
      b.querySelector('.hotbar-n')!.textContent = s?.id === 'seeds' ? String(s.n) : '';
    });
    ui.name.innerHTML = nameTag(inv.slots[inv.sel], kind);
    if (ui.sel !== inv.sel) {
      replay(ui.slots[inv.sel < 0 ? ui.sel : inv.sel], 'ui-press');
      ui.sel = inv.sel;
      uiSound('tick');
    }
  }
  const noting = now < handsNote.until && !!handsNote.text;
  if (noting && ui.noteAt !== handsNote.until) {
    ui.noteAt = handsNote.until;
    notify(handsNote.text, { kind: 'deny', ttl: handsNote.until - now, key: 'hands' });
  }
  ui.name.classList.toggle('shown', !noting && !!ui.name.innerHTML && now < ui.nameUntil);
}

// Every catalog model, built once behind the lobby so the first time one is held or thrown draws without a compile.
warmUp(() => {
  const g = new THREE.Group();
  for (const it of GIFTS) if (carryable(it)) g.add(itemModel(it.id));
  return g;
});
// And every hotbar icon, drawn behind the lobby too: the first one drawn in play built its pipelines mid-frame.
warmUp(() => warmIcons(['ball', ...GIFTS.filter(carryable).map((it) => it.id)]));

// ---------------------------------------------------------------- keys, presence, frame
onStart(() => {
  buildHud();
  for (let k = 0; k < SLOTS; k++) onKey(`Digit${k + 1}`, { owner: 'hotbar', down: () => me.entered && select(k) });
  describeControl('hotbar', {
    label: 'Hold something from your hotbar',
    detail: { kbm: 'Press the same slot again for empty hands', pad: 'Cycle through the slots' },
    keys: ['Digit1-5'],
    pad: ['lb', 'rb'],
    touch: 'Tap a slot',
    group: 'hands',
    order: 2,
  });
  // The touch Toss button (built in buildHud) throws what you hold when the main button does something else.
  describeControl('toss', {
    label: 'Throw what you hold',
    detail: { touch: 'Shows up when the main button does something else' },
    pad: 'right',
    touch: 'Toss',
    group: 'hands',
    order: 3,
    context: 'holding',
  });
});

addPresenceField('hd', () => {
  if (!me.entered) return null;
  const id = heldId();
  return id && id !== 'ball' ? giftIndex(id) : -1;
});
onRemotePresence((r, pr) => {
  // An unknown or uncarryable index shows as empty hands.
  const hd = pr.hd as number;
  r.hd = Number.isInteger(hd) && carryable(GIFTS[hd]) ? GIFTS[hd].id : null;
});

onFrame(({ now }) => {
  updateHands();
  updateInHand();
  if (ui.root) renderHud(now);
});
