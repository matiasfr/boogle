// What you hold (src/player/inventory.ts), in hand and named on screen: drawn in your hand, its name and what the main
// button does fading in when it changes. Everyone sees what everyone holds through the presence field `hd` (a catalog
// index, -1 for empty hands; the beach ball shows itself). On touch a Toss button appears whenever you hold something
// throwable and the main button would do something other than throw (a tool's verb, or Talk / Pick up near a target).
// Serves DESIGN.md 1 (toys before chores: anything you carry is a toy you can throw) and 10 (slapstick over precision).
// A new thing in your hand ticks (one soft tone) and the tag bounces, and a note goes to the shared notification lane
// (src/ui/notify.ts); docs/research/ui-patterns.md, recs 1, 2, 4 and 5.
import '../ui/ui-kit.css';
import './held.css';
import * as THREE from 'three';
import { onStart } from '../loop.ts';
import { defineKind, spawn } from '../entity/entity.ts';
import { me, ITEM_HAND } from '../player/player.ts';
import { remotes, addPresenceField, onRemotePresence } from '../netplay/net.ts';
import { inv, heldId } from '../player/inventory.ts';
import { updateHands, throwDown, releaseThrow, useVerb, canThrow, handsNote } from '../player/hands.ts';
import { itemModel } from '../player/item-models.ts';
import { warmUp } from '../render/precompile.ts';
import { warmIcons } from '../player/item-icons.ts';
import { glyph, inputKind } from '../player/glyphs.ts';
import { describeControl, touchHold } from '../player/controls.ts';
import { GIFTS, giftIndex, carryable } from '../sim/gift-catalog.ts';
import { uiSound, replay } from '../ui/ui-sound.ts';
import { notify } from '../ui/notify.ts';

// ---------------------------------------------------------------- in hand
// How each thing sits in the hand: the model's offset below the hand, and the hand's tilt (x tips it forward).
type Grip = { p: [number, number, number]; r?: [number, number, number] };
const GRIP: Record<string, Grip> = {
  seeds: { p: [0, -0.3, 0] },
  frisbee: { p: [0, -0.02, 0], r: [0.25, 0, -0.5] },
};
const DEFAULT_GRIP: Grip = { p: [0, -0.12, 0] };
const HANGS = new Set(['seeds']); // carried by a handle, down at the hip on a body with arms

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
  const u = avatar.userData as {
    heldId?: string | null;
    held?: THREE.Group | null;
    handSocket?: THREE.Object3D;
    holdKind?: 'item' | 'hang' | 'ball' | null;
  };
  const want = id && id !== 'ball' ? id : null;
  u.holdKind = id === 'ball' ? 'ball' : !want ? null : HANGS.has(want) ? 'hang' : 'item';
  if (u.heldId !== want) {
    u.held?.removeFromParent();
    u.heldId = want;
    u.held = want ? heldModel(want) : null;
    if (u.held) {
      // On a body with a hand of its own (AvatarData.handSocket) it hangs from that, not from a spot beside the figure.
      (u.handSocket ?? avatar).add(u.held);
      if (u.handSocket) u.held.position.set(0, 0, 0);
    }
  }
  return u.held ?? null;
}

function updateInHand() {
  if (me.avatar) {
    const hand = setHeld(me.avatar, heldId());
    if (hand) {
      const [x, y, z] = hand.userData.tilt;
      const wind = me.charging ? -0.6 : 0;
      hand.rotation.set(x + wind, y, z);
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
  toss: null as HTMLButtonElement | null,
  version: -1,
  held: inv.held,
  kind: '',
  nameUntil: 0,
  noteAt: 0,
};
const label = (id: string) => {
  const name = id === 'ball' ? 'Beach ball' : GIFTS[giftIndex(id)]!.name;
  return name[0]!.toUpperCase() + name.slice(1);
};

function buildHud() {
  const hud = document.querySelector('.hud') ?? document.body;
  ui.root = document.createElement('div');
  ui.root.className = 'held';
  ui.root.hidden = true;
  ui.name = document.createElement('div');
  ui.name.className = 'held-name';
  ui.root.append(ui.name);
  hud.append(ui.root);

  const touch = document.getElementById('touch');
  if (touch) {
    const toss = (ui.toss = document.createElement('button'));
    toss.className = 'tbtn toss';
    toss.type = 'button';
    toss.textContent = 'Toss';
    touchHold(toss, { down: throwDown, up: releaseThrow, cancel: () => (me.charging = false) });
    touch.append(toss);
  }
}

// The held thing's name, and on a computer or gamepad what its buttons do.
function nameTag(id: string | null, kind: string) {
  if (!id) return '';
  const verb = useVerb();
  if (!verb || kind === 'touch') return `<span>${label(id)}</span>`;
  return `<span>${label(id)}</span><span class="held-use">${glyph('use')}${verb}</span>`;
}

function renderHud(now: number) {
  ui.root.hidden = !me.entered;
  document.body.classList.toggle('holding-throwable', canThrow());
  const kind = inputKind();
  if (ui.version !== inv.version || ui.kind !== kind) {
    if (ui.version !== inv.version) ui.nameUntil = now + NAME_MS;
    ui.version = inv.version;
    ui.kind = kind;
    ui.name.innerHTML = nameTag(inv.held, kind);
    if (ui.held !== inv.held) {
      ui.held = inv.held;
      if (inv.held) {
        replay(ui.name, 'ui-press');
        uiSound('tick');
      }
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
// And every item icon (The Boogler's gift answer shows one), drawn behind the lobby too: the first one drawn in play
// built its pipelines mid-frame.
warmUp(() => warmIcons(['ball', ...GIFTS.filter(carryable).map((it) => it.id)]));

// ---------------------------------------------------------------- keys, presence, frame
onStart(() => {
  buildHud();
  // The touch Toss button (built in buildHud) throws what you hold when the main button does something else.
  describeControl('toss', {
    label: 'Throw what you hold',
    detail: { touch: 'Shows up when the main button does something else' },
    pad: 'rt',
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
  r.hd = Number.isInteger(hd) && carryable(GIFTS[hd]) ? GIFTS[hd]!.id : null;
});

defineKind('held', { update: 0 });
spawn({
  kind: 'held',
  update({ now }) {
    updateHands();
    updateInHand();
    if (ui.root) renderHud(now);
  },
});
