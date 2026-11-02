// `&v=snatch` on the wagon card (docs/research/train-riding.md, rec 3: Spirit Tracks' one verb, Overcooked's flinging
// across moving trucks, real railways' mail-bag exchange; vehicle-feel.md §2: hold, don't time). A mail bag hangs from
// a lineside arm at chest height, and further on a hopper with a 2 m mouth stands by the line. Coming up to the arm the
// prompt shows ("Hold to grab"): hold Interact, or press it once, and your arm stays out until you have passed. Pass
// within 2.1 m and you have it (only the deck's far edge is too far); pass wider and you whiff and spin. With the bag on your shoulder the prompt says
// "Throw": it flies where you look, with the deck's speed; look about at the hopper in range and it lands in the mouth
// (no leading the throw from a moving deck: you only have to look and press in the 3 s it goes by). In the hopper: a puff and the prompt's pop. It earns nothing.
// A new bag hangs on the arm a few seconds after the last was taken. Local: your reach and the throw are this tab's.
// Serves DESIGN.md 1 (Toys before chores): something to do on the ride, for no reason.
import * as THREE from 'three/webgpu';
import { onFrame } from '../../loop.ts';
import { scene } from '../../render/scene.ts';
import { emit } from '../../render/particles.ts';
import { groundHeight } from '../../island/terrain.ts';
import { me, camForward } from '../../player/player.ts';
import { input } from '../../player/input.ts';
import { registerInteractable, NO_TARGETS, type Interactable } from '../../player/hands.ts';
import { carry } from '../../physics/platforms.ts';
import { uiSound } from '../../ui/ui-sound.ts';
import { protoMark } from '../mark.ts';
import { besideLine, type WagonCtx } from './ctx.ts';

const ARM_D = 25, // m along the line: between Palm Walk and the third stop, past a run-up from Palm Walk
  ARM_LAT = -1.75, // m to the right going out: on the left (the sea side at home), just clear of the deck's edge
  BAG_H = 1.75, // the bag's middle over the ground: a rider's chest
  GRAB_R = 2.1, // m: pass this close with your arm out and you have it: from anywhere but the deck's far edge
  WARN_S = 3, // s of the ride before the arm when the prompt shows
  WAGON_M_S = 3, // its cruising speed (from a standing start it shows the same 9 m out)
  WARN_MIN = 3, // m: on foot, or at a crawl
  HOPPER_D = 33, // before the third stop: the line climbs steeply past it, the mouth would be out of a throw's reach
  HOPPER_LAT = -3.2,
  MOUTH_H = 1.45, // the mouth's rim over the ground: below a rider's hands
  MOUTH_R = 1, // half its 2 m
  COME_BACK_S = 6, // s until the next bag hangs on the arm
  THROW_V = 5, // m/s along your aim
  THROW_UP = 4.5, // m/s upward
  G = 11,
  ASSIST_R = 8, // m from the mouth, and
  ASSIST_COS = 0.8, // the cosine of how far off it you can look (37°), for the throw to land in it
  SPIN_S = 0.55, // the whiff's spin
  SNATCH_S = 0.18; // the bag's hop to your shoulder

/** Builds the arm, the bag and the hopper (hidden until `setOn(true)`); returns the switch. */
export function wagonSnatch(ctx: WagonCtx) {
  const root = new THREE.Group();
  root.visible = false;
  scene.add(root);
  const mat = (color: string) => new THREE.MeshStandardNodeMaterial({ color, roughness: 0.85 });
  const post = mat('#6e5a43'),
    sack = mat('#d9c89a'),
    strap = mat('#7a4a2c'),
    iron = mat('#4d5660'),
    ironDark = mat('#343a42'),
    rim = mat('#e2b33a'),
    coal = mat('#1d1d20');
  const box = (parent: THREE.Object3D, w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const makeBag = () => {
    const g = new THREE.Group();
    box(g, 0.42, 0.56, 0.3, sack);
    box(g, 0.44, 0.07, 0.32, strap, 0, 0.05, 0);
    box(g, 0.12, 0.14, 0.12, strap, 0, 0.32, 0); // the neck
    return g;
  };

  // The arm: a post 1 m further from the line (its frame's +x is left going out, so the line is towards -x), reaching
  // back over the bag.
  const armAt = besideLine(ctx, ARM_D, ARM_LAT);
  const postAt = besideLine(ctx, ARM_D, ARM_LAT - 1);
  const armPost = new THREE.Group();
  armPost.position.set(postAt.x, groundHeight(postAt.x, postAt.z), postAt.z);
  armPost.rotation.y = armAt.yaw;
  box(armPost, 0.18, 2.6, 0.18, post, 0, 1.3, 0);
  box(armPost, 1.2, 0.12, 0.12, post, -0.5, 2.55, 0);
  box(armPost, 0.03, 0.42, 0.03, strap, -1, 2.3, 0); // the bag's cord
  root.add(armPost);
  const hung = makeBag();
  hung.position.set(armAt.x, groundHeight(armAt.x, armAt.z) + BAG_H, armAt.z);
  root.add(hung);

  // The hopper: an open iron bin on legs, coal inside, rim at MOUTH_H, 2 m across.
  const hopAt = besideLine(ctx, HOPPER_D, HOPPER_LAT);
  const hopY = groundHeight(hopAt.x, hopAt.z);
  const hopper = new THREE.Group();
  hopper.position.set(hopAt.x, hopY, hopAt.z);
  hopper.rotation.y = hopAt.yaw;
  const W = MOUTH_R * 2,
    H = 0.85,
    T = 0.09;
  for (const s of [-1, 1]) {
    box(hopper, W + T, H, T, iron, 0, MOUTH_H - H / 2, (s * W) / 2);
    box(hopper, T, H, W, iron, (s * W) / 2, MOUTH_H - H / 2, 0);
    for (const e of [-1, 1])
      box(hopper, 0.14, MOUTH_H - H, 0.14, ironDark, (s * W) / 2.2, (MOUTH_H - H) / 2, (e * W) / 2.2);
  }
  box(hopper, W, 0.1, W, coal, 0, MOUTH_H - 0.35, 0); // what's in it, a little below the rim
  for (const s of [-1, 1]) {
    // a yellow rim, so it reads as somewhere to aim from the deck
    box(hopper, W + 0.24, 0.1, 0.12, rim, 0, MOUTH_H + 0.03, (s * W) / 2);
    box(hopper, 0.12, 0.1, W, rim, (s * W) / 2, MOUTH_H + 0.03, 0);
  }
  root.add(hopper);
  const mouth = new THREE.Vector3(hopAt.x, hopY + MOUTH_H, hopAt.z);

  // ---------------------------------------------------------------- the bag's life
  let on = false,
    hanging = true,
    backAt = 0, // performance.now() a new bag hangs
    carrying = false,
    latched = false, // Interact pressed in the window: your arm stays out until you have passed
    near = false, // your arm was out as you came within reach this pass
    closest = Infinity,
    spin = 0, // s of the whiff's spin left
    snatched = 0, // s left of the bag's hop from the arm to your shoulder
    grabs = 0,
    whiffs = 0,
    bags = 0;
  const flying = { on: false, mesh: makeBag(), p: new THREE.Vector3(), v: new THREE.Vector3(), rest: 0 };
  flying.mesh.visible = false;
  root.add(flying.mesh);
  const shoulder = makeBag();
  shoulder.visible = false;
  shoulder.scale.setScalar(0.8);
  scene.add(shoulder);

  const dust = new THREE.Color('#c9b48a'),
    soot = new THREE.Color('#55585e'),
    paper = new THREE.Color('#f2ecd8');
  function puff(x: number, y: number, z: number, n: number, color: THREE.Color, up: number) {
    for (let k = 0; k < n; k++)
      emit({
        x: x + (Math.random() - 0.5) * 0.5,
        y,
        z: z + (Math.random() - 0.5) * 0.5,
        vx: (Math.random() - 0.5) * 1.6,
        vy: up * (0.6 + Math.random() * 0.8),
        vz: (Math.random() - 0.5) * 1.6,
        life: 0.5 + Math.random() * 0.4,
        size: 0.3,
        color,
        alpha: 0.8,
        drag: 2,
        grow: [1, 2.6],
        fade: 0.5,
      });
  }

  const reaching = () => latched || input.keys.has('KeyE');
  const armOut = () => {
    latched = true;
  };
  function grab() {
    hanging = false;
    hung.visible = false;
    backAt = performance.now() + COME_BACK_S * 1000;
    carrying = true;
    latched = near = false;
    closest = Infinity;
    shoulder.visible = true;
    snatched = SNATCH_S;
    grabs++;
    protoMark('grab');
  }
  function whiff() {
    spin = SPIN_S;
    latched = false;
    whiffs++;
    protoMark('whiff');
  }
  const aim = new THREE.Vector3();
  function throwBag() {
    if (!carrying || !me.body) return;
    carrying = false;
    shoulder.visible = false;
    camForward(aim);
    const b = me.body;
    flying.on = true;
    flying.rest = 0;
    flying.p.copy(b.interpolatedPosition);
    flying.p.y += 0.9;
    const dx = mouth.x - flying.p.x,
      dz = mouth.z - flying.p.z,
      hd = Math.hypot(dx, dz),
      an = Math.hypot(aim.x, aim.z) || 1;
    if (hd < ASSIST_R && (dx * aim.x + dz * aim.z) / (hd * an) > ASSIST_COS) {
      // in range and looked at: the arc that drops into the mouth's middle
      const t = Math.max(0.5, Math.min(1, hd / 6));
      flying.v.set(dx / t, (mouth.y + 0.05 - flying.p.y) / t + 0.5 * G * t, dz / t);
    } else {
      flying.v.set(b.velocity.x, 0, b.velocity.z).addScaledVector(aim, THROW_V);
      flying.v.y = THROW_UP;
    }
    flying.mesh.visible = true;
  }

  // ---------------------------------------------------------------- the interact button
  const promptAt = new THREE.Vector3();
  registerInteractable((): Interactable[] => {
    if (!on || !me.body) return NO_TARGETS;
    const p = me.body.interpolatedPosition;
    if (carrying) {
      promptAt.set(p.x, p.y + 1.5, p.z);
      return [{ id: 'wagon-throw', verb: 'Throw', at: promptAt, run: throwBag }];
    }
    if (!hanging) return NO_TARGETS;
    const dist = Math.hypot(p.x - hung.position.x, p.z - hung.position.z);
    const v = me.body.velocity;
    const speed = Math.hypot(v.x, v.z);
    // the arm's coming up, or the train's standing at the stop before it
    const closing = speed < 0.3 || (hung.position.x - p.x) * v.x + (hung.position.z - p.z) * v.z > 0;
    const window = carry.on ? Math.max(speed, WAGON_M_S) * WARN_S : 0;
    if (dist > WARN_MIN && !(closing && dist < window)) return NO_TARGETS;
    promptAt.copy(hung.position).setY(hung.position.y + 0.6);
    return [{ id: 'wagon-grab', verb: latched ? 'Arm out' : 'Hold to grab', at: promptAt, run: armOut }];
  });

  // ---------------------------------------------------------------- each frame
  const reach = new THREE.Vector3();
  onFrame(
    ({ dt }) => {
      if (!on || !me.body) return;
      if (!hanging && performance.now() >= backAt) {
        hanging = true;
        hung.visible = true;
      }
      const p = me.body.interpolatedPosition;
      // Your arm out: grab within GRAB_R; drawing away again without having it: a whiff.
      if (hanging && !carrying) {
        const dist = Math.hypot(p.x - hung.position.x, p.z - hung.position.z);
        const dy = Math.abs(p.y + 0.5 - hung.position.y);
        if (reaching()) {
          if (dist < GRAB_R && dy < 1.3) grab();
          else {
            if (dist < 3.2) near = true;
            closest = Math.min(closest, dist);
            if (near && dist > closest + 0.5) {
              near = false;
              closest = Infinity;
              whiff();
            } else if (latched && dist > 16) {
              latched = false; // pressed, then it never came near
              closest = Infinity;
            }
          }
        } else {
          near = false;
          closest = Infinity;
        }
      }
      if (me.avatar) {
        const inner = (me.avatar.userData as { inner?: THREE.Object3D }).inner;
        if (inner && reaching() && hanging && !carrying) {
          // lean towards the bag (avatar frame: x right, -z forward)
          reach.copy(hung.position).sub(me.avatar.position).setY(0);
          const yaw = me.avatar.rotation.y;
          const side = reach.x * Math.cos(yaw) - reach.z * Math.sin(yaw);
          inner.rotation.z = Math.max(-0.5, Math.min(0.5, -side * 0.25));
        } else if (inner) inner.rotation.z *= Math.exp(-dt * 10);
        if (spin > 0) {
          spin = Math.max(0, spin - dt);
          me.avatar.rotation.y += (1 - spin / SPIN_S) * Math.PI * 2;
        }
        if (carrying) {
          const yaw = me.avatar.rotation.y;
          shoulder.position.copy(me.avatar.position);
          shoulder.position.y += 0.95;
          shoulder.position.x += Math.cos(yaw) * 0.42;
          shoulder.position.z -= Math.sin(yaw) * 0.42;
          shoulder.rotation.y = yaw;
          // just snatched: it hops across from the arm
          if (snatched > 0) {
            snatched = Math.max(0, snatched - dt);
            shoulder.position.lerp(hung.position, snatched / SNATCH_S);
          }
        }
      }
      if (flying.on) fly(dt);
    },
    { phase: 'update', order: 10 },
  );

  function fly(dt: number) {
    const { p, v, mesh } = flying;
    if (flying.rest > 0) {
      // landed: lies there a moment, then shrinks away
      flying.rest -= dt;
      mesh.scale.setScalar(Math.min(1, Math.max(0, flying.rest / 0.3)));
      if (flying.rest <= 0) {
        flying.on = false;
        mesh.visible = false;
        mesh.scale.setScalar(1);
      }
      return;
    }
    const was = p.y;
    v.y -= G * dt;
    p.addScaledVector(v, dt);
    mesh.position.copy(p);
    mesh.rotation.x += dt * 5;
    mesh.rotation.z += dt * 3;
    // through the mouth's plane, going down (the mouth turns a little with the line; close enough at this size)
    if (was >= mouth.y && p.y < mouth.y && Math.hypot(p.x - mouth.x, p.z - mouth.z) < MOUTH_R + 0.15) {
      flying.on = false;
      mesh.visible = false;
      puff(mouth.x, mouth.y + 0.15, mouth.z, 22, soot, 3);
      puff(mouth.x, mouth.y + 0.25, mouth.z, 10, paper, 3.6);
      uiSound('pop');
      bags++;
      protoMark('bag');
      return;
    }
    const g = groundHeight(p.x, p.z);
    if (p.y < g + 0.25) {
      p.y = g + 0.25;
      mesh.position.copy(p);
      flying.rest = 2.2;
      puff(p.x, g + 0.1, p.z, 6, dust, 1);
    }
  }

  return {
    setOn(v: boolean) {
      on = v;
      root.visible = v;
      if (v) return;
      carrying = latched = false;
      shoulder.visible = false;
      flying.on = false;
      flying.mesh.visible = false;
    },
    /** For the look evals. */
    get state() {
      return { hanging, carrying, latched, flying: flying.on, grabs, whiffs, bags };
    },
    mouth,
    armOut,
    throwBag,
    giveBag: grab,
  };
}
