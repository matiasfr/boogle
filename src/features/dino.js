// The dino waits outside the wine cellar's cave. Talk to him and you play as the guest, a character with its own full
// move set and controller run by the guest engine (src/guest/); talk to him again to be yourself. The player brings
// their own ROM for the guest's animations and textures (src/guest/rom.js), asked for the first time; the engine
// (src/guest/engine.js) is fetched quietly then, and only asked for too if that fails. Without both the dino is just
// a dino.
// Serves DESIGN.md 1 (toys before chores): a second way to move around the island, and everything else (hands, hotbar,
// ball, friends) still works.
//
// Small and eager: the dino, the controls, presence. The engine, the guest and the models load on first use.
import './dino.css';
import * as THREE from 'three';
import { onFrame, onStart } from '../loop.ts';
import { camera } from '../render/scene.js';
import { emit } from '../render/particles.js';
import { me } from '../player/player.js';
import { dom } from '../player/hud.js';
import { registerInteractable, interactTarget } from '../player/hands.js';
import { heldId } from '../player/inventory.js';
import { registerAction, describeControl, wrapAction } from '../player/controls.js';
import { addPresenceField, onRemotePresence, remotes } from '../netplay/net.ts';
import { dino, dinoSays, updateDino, showRealDino } from '../guest/dino.js';
import { guest } from '../guest/state.js';
import { isPose, quantisePose, hasEngine, findEngine, takeEngineFile, ENGINE_EXT } from '../guest/engine.js';
import { readRom, ROM_EXT, ROM_SHA1 } from '../guest/rom.js';
import { loadFile, saveFile } from '../decomp/store.js';
import {
  openFilesDialog,
  filesDialogAccepts,
  filesDialogNeeds,
  filesDialogOpen,
  filesDialogSays,
} from '../decomp/files-dialog.js';

const TALK_R = 2.2;
const SPARK = new THREE.Color('#fff4b8');
const WORD = 'Rawr!';
const ROM_KEY = 'guest-rom';

let rom = null; // { anims, textures } once known
const ready = () => !!rom && hasEngine();
let module = null;
const load = async () => (module ??= await import('../guest/play.js'));
let switching = false; // becoming the guest takes a moment: the module, the engine
let preloading = null; // loading the engine to draw other players' guests

function puff() {
  const p = me.body.position;
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    emit({
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

async function becomeGuest() {
  switching = true;
  try {
    const m = await load();
    await m.startGuest(rom);
    puff();
    dinoSays(WORD);
  } finally {
    switching = false;
  }
}

// The engine is only listed when the hosted one couldn't be had (offline, link gone): then the player brings it too.
let askEngine = false;
const needs = () => [
  ...(askEngine ? [{ label: 'The engine (engine.wasm, from native/guest/)', done: hasEngine() }] : []),
  { label: `The ROM it is built for (SHA-1 ${ROM_SHA1.slice(0, 8)}…)`, done: !!rom },
];

const isWasm = async (file) => {
  const b = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  return b[0] === 0 && b[1] === 0x61 && b[2] === 0x73 && b[3] === 0x6d; // \0asm
};

async function useFile(file) {
  if (await isWasm(file)) {
    if (!(await takeEngineFile(file))) return filesDialogSays("That's not a guest engine build.");
  } else {
    const data = await readRom(file).catch(() => null);
    if (!data) return filesDialogSays("That's not the ROM the engine is built for.");
    rom = data;
    saveFile(ROM_KEY, data);
  }
  filesDialogSays('');
  filesDialogNeeds(needs());
  if (!ready()) return;
  showRealDino(rom);
  await filesDialogAccepts(WORD);
  if (!guest.active && me.body) becomeGuest();
}

async function talk() {
  if (switching) return;
  if (guest.active) {
    module.stopGuest();
    puff();
    dinoSays(WORD);
    return;
  }
  if (!hasEngine()) {
    switching = true;
    askEngine = !(await findEngine(true).finally(() => (switching = false)));
    if (hasEngine() && rom) showRealDino(rom);
  }
  if (ready()) {
    becomeGuest();
  } else {
    openFilesDialog({ title: '...rawr?', needs: needs(), ext: [...ENGINE_EXT, ...ROM_EXT], onFile: useFile });
  }
}

addEventListener('dragover', (e) => {
  if (e.dataTransfer?.types.includes('Files')) e.preventDefault();
});
addEventListener('drop', (e) => {
  const file = e.dataTransfer?.files[0];
  const ext = file?.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  if (!file || !(filesDialogOpen() || ENGINE_EXT.includes(ext) || ROM_EXT.includes(ext))) return;
  e.preventDefault();
  useFile(file);
});

registerInteractable(() => {
  if (!me.entered || !me.body) return [];
  const p = me.body.position;
  if (Math.abs(p.y - dino.pos.y) > 2 || Math.hypot(p.x - dino.pos.x, p.z - dino.pos.z) > TALK_R) return [];
  return [{ id: 'dino', verb: 'Talk', at: dino.head, r: 0.3, run: talk }];
});

// B (punch, kick, dive) is the use button (click, pad X) with empty hands, unless something other than the ball is in
// reach: near the ball it punches, and the interact button (E, pad B) grabs. The touch Grab button punches only when
// nothing is in reach, since it interacts first.
function punches() {
  if (!guest.active || heldId()) return false;
  const t = interactTarget();
  return !t || t.id === 'ball';
}
function pressB() {
  guest.b = true;
  guest.bHeld = true;
}
const releaseB = () => (guest.bHeld = false);
dom.grabBtn.addEventListener('pointerdown', () => guest.active && !heldId() && !interactTarget() && pressB());
dom.grabBtn.addEventListener('pointerup', releaseB);

// Files this browser already has; the hosted engine is fetched only once someone talks to the dino.
onStart(() => {
  Promise.all([findEngine(), loadFile(ROM_KEY)]).then(([, data]) => {
    rom ??= data;
    if (ready()) showRealDino(rom);
  });
  wrapAction('use', {
    down: (next) => (punches() ? pressB() : next()),
    up: (next) => {
      releaseB();
      next();
    },
  });
  registerAction('guest-crouch', {
    pad: 'lt',
    label: 'Crouch, ground pound',
    detail: 'With jump: long jump while running, backflip while still',
    keys: ['ShiftLeft'],
    group: 'move',
    order: 3,
    context: 'as the guest',
    down: () => (guest.zHeld = true),
    up: () => (guest.zHeld = false),
  });
  describeControl('guest-punch', {
    label: 'Punch, kick, dive',
    keys: ['Mouse0'],
    pad: 'x',
    touch: 'Grab',
    group: 'move',
    order: 4,
    context: 'as the guest',
  });
});

// Owner state: this player's guest pose, or nothing while they are themselves.
addPresenceField('mr', () => (guest.active && guest.pose ? quantisePose(guest.pose) : null));
onRemotePresence((r, pr) => (r.guest = isPose(pr.mr) ? pr.mr : null));

function anyRemoteGuest() {
  for (const r of remotes.values()) if (r.guest) return true;
  return false;
}

// Once loaded, the module draws remote guests and tidies up after those who stop or leave. Without both files a
// player sees remote guests as their usual avatars.
onFrame(({ now }) => {
  updateDino(camera, now);
  if (module) module.updateRemoteGuests(remotes);
  else if (ready() && !preloading && anyRemoteGuest())
    preloading = load()
      .then((m) => m.loadSim(rom))
      .catch(() => (preloading = null));
});
