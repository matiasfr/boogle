// Yoshi waits outside the wine cellar's cave. Talk to him and you play as Mario, with the decomp's full move set and
// controller (src/mario/); talk to him again to be yourself. Mario's animations and textures come from the player's
// own Super Mario 64 (USA) ROM, asked for the first time (src/mario/rom.js). Serves DESIGN.md 1 (toys before
// chores): a second way to move around the island, and everything else (hands, hotbar, ball, friends) still works.
//
// Small and eager: Yoshi, the controls, presence. The simulation and model load on first use.
import './mario.css';
import * as THREE from 'three';
import { onFrame, onStart } from '../loop.js';
import { camera } from '../render/scene.js';
import { emit } from '../render/particles.js';
import { me } from '../player/player.js';
import { dom } from '../player/hud.js';
import { registerInteractable, interactTarget } from '../player/hands.js';
import { heldId } from '../player/inventory.js';
import { registerAction, describeControl, wrapAction } from '../player/controls.js';
import { addPresenceField, onRemotePresence, remotes } from '../netplay/net.js';
import { yoshi, yoshiSays, updateYoshi, showRealYoshi } from '../mario/yoshi.js';
import { mario } from '../mario/state.js';
import { readRom, loadSaved, save } from '../mario/rom.js';
import { openRomDialog, romDialogAccepts, romDialogOpen, romDialogSays } from '../mario/rom-dialog.js';

const TALK_R = 2.2;
const POSE_LEN = 24;
const SPARK = new THREE.Color('#fff4b8');

let rom = null; // { anims, textures } once known
let module = null;
const load = async () => (module ??= await import('../mario/mario.js'));

function puff() {
  const p = me.body.position;
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    emit('soft', {
      x: p.x,
      y: p.y + 0.4,
      z: p.z,
      vx: Math.cos(a) * 3,
      vy: 1 + Math.random() * 2,
      vz: Math.sin(a) * 3,
      color: SPARK,
      life: 0.7,
      size: 0.4,
      fade: 1,
      drag: 3,
    });
  }
}

async function becomeMario() {
  mario.busy = true;
  try {
    const m = await load();
    await m.startMario(rom);
    puff();
    yoshiSays('Yoshi!');
  } finally {
    mario.busy = false;
  }
}

function knowRom(data) {
  rom = data;
  showRealYoshi(data);
}

async function useRomFile(file) {
  const data = await readRom(file).catch(() => null);
  if (!data) {
    romDialogSays("That's not a Super Mario 64 (USA) ROM.");
    return;
  }
  knowRom(data);
  save(data);
  await romDialogAccepts();
  if (!mario.active && me.body) becomeMario();
}

function talk() {
  if (mario.busy) return;
  if (mario.active) {
    module.stopMario();
    puff();
    yoshiSays('Yoshi!');
  } else if (rom) {
    becomeMario();
  } else {
    openRomDialog(useRomFile);
  }
}

addEventListener('dragover', (e) => {
  if (e.dataTransfer?.types.includes('Files')) e.preventDefault();
});
addEventListener('drop', (e) => {
  const file = e.dataTransfer?.files[0];
  if (!file || !(romDialogOpen() || /\.(z64|n64|v64)$/i.test(file.name))) return;
  e.preventDefault();
  useRomFile(file);
});

registerInteractable(() => {
  if (!me.entered || !me.body) return [];
  const p = me.body.position;
  if (Math.abs(p.y - yoshi.pos.y) > 2 || Math.hypot(p.x - yoshi.pos.x, p.z - yoshi.pos.z) > TALK_R) return [];
  return [{ id: 'yoshi', verb: 'Talk', at: yoshi.head, r: 0.3, run: talk }];
});

// B (punch, kick, dive) is the use button (click, pad X) with empty hands, unless something other than the ball is in
// reach: near the ball it punches, and the interact button (E, pad B) grabs. The touch Grab button punches only when
// nothing is in reach, since it interacts first.
function punches() {
  if (!mario.active || heldId()) return false;
  const t = interactTarget();
  return !t || t.id === 'ball';
}
function pressB() {
  mario.b = true;
  mario.bHeld = true;
}
const releaseB = () => (mario.bHeld = false);
dom.grabBtn.addEventListener('pointerdown', () => mario.active && !heldId() && !interactTarget() && pressB());
dom.grabBtn.addEventListener('pointerup', releaseB);

onStart(() => {
  loadSaved().then((data) => data && !rom && knowRom(data));
  wrapAction('use', {
    down: (next) => (punches() ? pressB() : next()),
    up: (next) => {
      releaseB();
      next();
    },
  });
  registerAction('mario-crouch', {
    pad: 'lt',
    label: 'Crouch, ground pound',
    detail: 'With jump: long jump while running, backflip while still',
    keys: ['ShiftLeft'],
    group: 'move',
    order: 3,
    context: 'as Mario',
    down: () => (mario.zHeld = true),
    up: () => (mario.zHeld = false),
  });
  describeControl('mario-punch', {
    label: 'Punch, kick, dive',
    keys: ['Mouse0'],
    pad: 'x',
    touch: 'Grab',
    group: 'move',
    order: 4,
    context: 'as Mario',
  });
});

// Owner state: this player's Mario pose, or nothing while they are themselves.
addPresenceField('mr', () =>
  mario.active && mario.pose
    ? mario.pose.map((v, i) => (i < 18 ? v : i < 21 ? Math.round(v * 10) / 10 : Math.round(v * 100) / 100))
    : null,
);
let remotesAreMario = false;
onRemotePresence((r, pr) => {
  const p = pr.mr;
  r.mario = Array.isArray(p) && p.length === POSE_LEN && p.every(Number.isFinite) ? p : null;
  if (r.mario) remotesAreMario = true;
});

onFrame(({ now }) => {
  updateYoshi(camera, now);
  if (!remotesAreMario) return;
  if (module) module.updateRemoteMarios(remotes);
  else if (rom && !mario.busy) {
    mario.busy = true;
    load()
      .then((m) => m.loadSim(rom))
      .finally(() => (mario.busy = false));
  }
});
