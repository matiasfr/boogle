// Stills for the engine garage mock (docs/world/engine-garage-mock.html, docs/brainstorms/engine-garage.md): the
// game's own train parts (engine-kit, car-kit, the place kit's flatbed and wheels, the cargo fittings) in their game
// paint, staged as a showroom on the 9.6 m table: a dark stall, a warm key, a cool rim, a pool of light on the deck.
// Inspection only; nothing here changes the game. It draws over the running game on its own canvas, one 1280×720
// tile per (camera, variant), in a sheet the look's still captures whole; crop the tiles afterwards.
//   npm run look -- --eval dev/look/evals/garage-showroom.ts --until window.__garageDone --size 3840x2880 \
//     --name garage-sheet --question "Does each tile read as a showroom still of the real engine?"
// Variants: base (boiler fitted, today), longGhost / long (the longer boiler's nodes as a ghost, then fitted),
// roofGhost / roof (car_upgrade), teal (a stand-in repaint of the engine's red), wagon2Ghost / wagon2 (a second
// footing wagon). Ghosts are the real nodes in a translucent yellow material, drawn in the capture.
import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import * as engineKit from '../../src/proto/place/engine-kit.ts';
import * as carKit from '../../src/proto/place/car-kit.ts';
import * as look from '../../src/place/look.ts';
import * as wagonLook from '../../src/render/wagon-look.ts';
import * as engineSpec from '../../src/proto/wagon/engine.ts';

export async function showroom() {
  const done = window as Window & { __garageDone?: boolean; __garageInfo?: unknown };
  const { ENGINE, ENGINE_WHEELS, ENGINE_BOILER } = engineSpec;
  const { TRAILER, TRAIN_OFFSETS, WAGON_CAR } = wagonLook;
  // Trains run once the boiler is in: the old train's rust is gone (cargo.ts sets this with job.rung.trains).
  look.rustTrainU.value = 0;

  // ---------------------------------------------------------------- the place kit's pieces, baked as the game bakes them
  const kit = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('/assets/built/place-kit.glb');
  kit.scene.updateMatrixWorld(true);
  const kitGeometry = (name: string) => {
    const mesh = kit.scene.getObjectByName(name) as THREE.Mesh | undefined;
    if (!mesh?.isMesh) throw new Error('place kit has no ' + name);
    const src = mesh.geometry;
    const g = new THREE.BufferGeometry();
    for (const attr of ['position', 'normal', 'color']) {
      const a = src.getAttribute(attr);
      if (!a) continue;
      const f = new Float32Array(a.count * 3);
      for (let i = 0; i < a.count; i++) f.set([a.getX(i), a.getY(i), a.getZ(i)], i * 3);
      g.setAttribute(attr, new THREE.BufferAttribute(f, 3));
    }
    g.setIndex(src.index);
    g.applyMatrix4(mesh.matrixWorld);
    g.computeBoundingBox();
    return g;
  };
  // look-kit.ts's machine paints (not exported there): the flatbed's deck and black, the wheels' iron.
  const DECK = { color: '#9a7b55', grain: { axis: 'z' as const, honey: look.honeyOf('#7f5630') } },
    BLACK = { color: '#24262c', rough: 0.65 },
    IRON = { color: '#2c2e34', steel: true, rough: 0.55, rust: 'train' as const };
  const kitMesh = (name: string, p: Parameters<typeof look.paint>[0]) => {
    const m = new THREE.Mesh(kitGeometry(name), look.paint(p));
    m.castShadow = m.receiveShadow = true;
    return m;
  };
  const wheelGeometry = kitGeometry('wheel');
  const wheelMaterial = look.paint(IRON);
  const addWheels = (parent: THREE.Object3D, hz: number, r: number) => {
    for (const sx of [-0.5, 0.5])
      for (const sz of [-1, 1]) {
        const w = new THREE.Mesh(wheelGeometry, wheelMaterial);
        w.position.set(sx, r + 0.15, sz * (hz - 0.5));
        w.scale.set(1, r, r);
        w.castShadow = true;
        parent.add(w);
      }
  };

  // ---------------------------------------------------------------- the ghost and the stand-in repaint
  const ghost = new THREE.MeshStandardNodeMaterial({
    color: '#ffc21a',
    emissive: '#ffb000',
    emissiveIntensity: 0.9,
    roughness: 0.5,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    // Pushed back a little, so where the previewed node coincides with what is already fitted (the long body's cab
    // and footplate are A's own) the fitted paint wins and only what changes shows yellow.
    polygonOffset: true,
    polygonOffsetFactor: 2,
    polygonOffsetUnits: 8,
  });
  const ghostOf = (m: THREE.Mesh) => {
    const g = new THREE.Mesh(m.geometry, ghost);
    g.position.copy(m.position);
    g.rotation.copy(m.rotation);
    g.scale.copy(m.scale);
    g.renderOrder = 2;
    return g;
  };
  const repaint = (m: THREE.Mesh) => {
    const g = (m.geometry as THREE.BufferGeometry).clone();
    const c = g.getAttribute('color') as THREE.BufferAttribute;
    for (let i = 0; i < c.count; i++) {
      const r = c.getX(i),
        gr = c.getY(i),
        b = c.getZ(i);
      if (r > 0.06 && r > gr * 2.2 && r > b * 2.2) {
        const k = r / 0.8;
        c.setXYZ(i, 0.03 * k, 0.42 * k, 0.4 * k);
      }
    }
    const out = new THREE.Mesh(g, m.material);
    out.position.copy(m.position);
    out.scale.copy(m.scale);
    out.castShadow = out.receiveShadow = true;
    return out;
  };

  // ---------------------------------------------------------------- the train, in the game's frames and spacing
  const scene = new THREE.Scene();
  const groups: Record<string, THREE.Object3D[]> = {};
  const tag = (name: string, ...objects: THREE.Object3D[]) => {
    (groups[name] ??= []).push(...objects);
    return objects;
  };
  const E = TRAIN_OFFSETS[0]!;
  const engine = new THREE.Group();
  engine.position.z = E;
  scene.add(engine);
  const part = (name: Parameters<typeof engineKit.enginePart>[0], rust = true) => engineKit.enginePart(name, rust);
  const body = part('engine_body'),
    boiler = part('engine_boiler', false),
    lashing = part('engine_lashing', false);
  const longBody = part('engine_body_long'),
    longBoiler = part('engine_boiler_long', false),
    longLashing = part('engine_lashing_long', false);
  const rods = part('engine_rods');
  rods.position.y = ENGINE_WHEELS.throw;
  engine.add(body, boiler, lashing, longBody, longBoiler, longLashing, rods, part('engine_stool'));
  const doors = [engineKit.engineDoor(1), engineKit.engineDoor(-1)];
  engine.add(...doors);
  addWheels(engine, ENGINE_WHEELS.z + 0.5, ENGINE_WHEELS.r);
  tag('short', body, boiler, lashing);
  tag('long', longBody, longBoiler, longLashing);
  const longGhosts = [longBody, longBoiler, longLashing].map(ghostOf);
  engine.add(...longGhosts);
  tag('longGhost', ...longGhosts);
  const teal = [repaint(body), repaint(boiler), lashing.clone(), ...doors.map(repaint)];
  engine.add(...teal);
  tag('teal', ...teal);
  // The stop lamp on the cab roof (train-view.ts), unlit.
  const lamp = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.16, 0.12),
    new THREE.MeshBasicNodeMaterial({ color: '#5a4a2a' }),
  );
  lamp.position.set(0, engineSpec.ENGINE_CAB.roofTop + 0.08, engineSpec.ENGINE_CAB.zFront);
  engine.add(lamp);

  const flatbed = (z: number) => {
    const g = new THREE.Group();
    g.position.z = z;
    g.add(kitMesh('flat_deck', DECK), kitMesh('flat_black', BLACK));
    addWheels(g, TRAILER.hz, 0.22);
    scene.add(g);
    return g;
  };
  // Car 1: the passenger car (knifeboard, Four), its upgrade built and off.
  const passenger = flatbed(TRAIN_OFFSETS[1]!);
  const fit = carKit.passengerCar(false);
  passenger.add(fit);
  const roof = carKit.passengerCar(true).children.find((c) => c.name === 'car_upgrade') as THREE.Mesh;
  passenger.add(roof);
  tag('roof', roof);
  const roofGhost = ghostOf(roof);
  passenger.add(roofGhost);
  tag('roofGhost', roofGhost);
  // Car 2: the cargo car, stakes and boards, with logs and rails from the kit on it.
  const cargo = flatbed(TRAIN_OFFSETS[2]!);
  const fittings = wagonLook.cargoFittings();
  fittings.position.y = TRAILER.top;
  cargo.add(fittings);
  {
    const log = kitGeometry('log'),
      rail = kitGeometry('rail');
    const lb = log.boundingBox!,
      rb = rail.boundingBox!;
    const logLen = lb.max.x - lb.min.x,
      logR = (lb.max.y - lb.min.y) / 2;
    const logPaint = look.paint({ color: '#ffffff', own: true, rough: 0.9, grain: { axis: 'x', honey: '#ffffff' } });
    const s = 1.7 / logLen;
    for (let layer = 0; layer < 2; layer++)
      for (let k = 0; k < 4 - layer; k++) {
        const m = new THREE.Mesh(log, logPaint);
        m.scale.setScalar(s);
        m.position.set(0, TRAILER.top + logR * s * (1 + layer * 1.7), -1.25 + (k + layer * 0.5) * logR * s * 2.05);
        m.castShadow = m.receiveShadow = true;
        cargo.add(m);
      }
    const railLen = rb.max.z - rb.min.z,
      railH = rb.max.y - rb.min.y;
    const railPaint = look.paint(look.STEEL);
    for (let layer = 0; layer < 3; layer++)
      for (let k = 0; k < 6 - layer; k++) {
        const m = new THREE.Mesh(rail, railPaint);
        m.scale.set(1, 1, 1.5 / railLen);
        m.position.set(-0.6 + (k + layer * 0.5) * 0.24, TRAILER.top + railH * (0.5 + layer), 0.75);
        m.castShadow = m.receiveShadow = true;
        cargo.add(m);
      }
  }
  // Car 3: the footing wagon, in the boxes roundhouse-view.ts draws it with (fitted: brass cradle), and a second one.
  const box = (parent: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, c: string) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      look.paint({ color: c, rough: c === '#d9a23a' ? 0.5 : 0.75 }),
    );
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const footingWagon = (z: number) => {
    const g = new THREE.Group();
    g.position.z = z;
    const BRASS = '#d9a23a';
    box(g, 0, 0.3, 0, 2.2, 0.35, 3.2, '#77766b');
    for (const x of [-0.85, 0.85]) for (const zz of [-1, 1]) box(g, x, 0.05, zz, 0.25, 0.5, 0.5, '#3a3c3c');
    for (const zz of [-0.8, 0.8]) {
      box(g, 0, 0.55, zz, 1.5, 0.16, 1.3, BRASS);
      // A footing standing in each seat: a grey block and its cap.
      box(g, 0, 0.95, zz, 0.9, 0.65, 0.9, '#a7a29a');
      box(g, 0, 1.33, zz, 1.05, 0.12, 1.05, '#8f8a82');
    }
    for (let r = 0; r < 8; r++) {
      const x = r % 2 ? 0.95 : -0.95,
        zz = [-1.35, -0.25, 0.25, 1.35][Math.floor(r / 2)]!;
      box(g, x, 1.05, zz, 0.1, 1.1, 0.1, BRASS);
    }
    for (const x of [-0.95, 0.95]) box(g, x, 1.62, 0, 0.12, 0.12, 2.9, BRASS);
    scene.add(g);
    return g;
  };
  const wagon = footingWagon(TRAIN_OFFSETS[3]!);
  const wagon2 = footingWagon(TRAIN_OFFSETS[3]! - 3.7);
  tag('wagon2', wagon2);
  const wagon2Ghost = wagon2.clone();
  wagon2Ghost.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      (o as THREE.Mesh).material = ghost;
      o.renderOrder = 2;
    }
  });
  scene.add(wagon2Ghost);
  tag('wagon2Ghost', wagon2Ghost);
  tag('consist', cargo, wagon);
  void WAGON_CAR;

  // ---------------------------------------------------------------- the stall: table, pit, track, floor, back wall
  const TABLE_Z = (E + ENGINE.hz + -TRAILER.hz) / 2; // the deck holds the engine and its first car, centred
  const stone = (c: string, rough = 0.9) => new THREE.MeshStandardNodeMaterial({ color: c, roughness: rough });
  const table = new THREE.Group();
  table.position.z = TABLE_Z;
  {
    // As roundhouse-view.ts draws it: a grey stone disc, 9.6 m across, a dark deck strip under the rails. The thin
    // brass edge is the showroom's, not the game's.
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 4.8, 0.3, 96), stone('#5f5d59'));
    deck.position.y = -0.17;
    deck.receiveShadow = true;
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(4.8, 0.035, 8, 128).rotateX(Math.PI / 2),
      stone('#c79a3e', 0.45),
    );
    rim.position.y = -0.02;
    const pit = new THREE.Mesh(new THREE.CylinderGeometry(5.3, 5.3, 0.3, 96), stone('#2a2724'));
    pit.position.y = -0.36;
    pit.receiveShadow = true;
    const strip = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.06, 9.5), stone('#3b3834', 0.85));
    strip.position.y = -0.01;
    strip.receiveShadow = true;
    table.add(deck, rim, pit, strip);
  }
  scene.add(table);
  tag('table', table);
  const track = new THREE.Group();
  {
    const steel = stone('#4c5058', 0.5);
    const z0 = -20,
      z1 = TABLE_Z + 4.8;
    for (const s of [-1, 1]) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, z1 - z0), steel);
      r.position.set(s * 0.5, 0.1, (z0 + z1) / 2);
      r.castShadow = r.receiveShadow = true;
      track.add(r);
    }
    const n = Math.floor((TABLE_Z - 4.8 - z0) / 0.75);
    const sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(2.3, 0.12, 0.42), stone('#5a4128', 0.9), n);
    for (let k = 0; k < n; k++)
      sleepers.setMatrixAt(k, new THREE.Matrix4().makeTranslation(0, -0.02, z0 + 0.375 + k * 0.75));
    sleepers.receiveShadow = true;
    track.add(sleepers);
  }
  scene.add(track);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200).rotateX(-Math.PI / 2), stone('#2b2a29', 0.95));
  floor.position.y = -0.33;
  floor.receiveShadow = true;
  scene.add(floor);
  scene.background = new THREE.Color('#0d0f14');
  scene.fog = new THREE.Fog('#0d0f14', 16, 42);

  // Lights: a dim cool fill, a warm key from the open door's side, a pool of light over the deck, a cool rim behind.
  const hemi = new THREE.HemisphereLight('#9fb4d8', '#2a2018', 0.55);
  const key = new THREE.DirectionalLight('#ffe2b8', 2.2);
  key.castShadow = true;
  key.shadow.mapSize.setScalar(2048);
  Object.assign(key.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 0.5, far: 80 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.03;
  const pool = new THREE.SpotLight('#fff1d6', 260, 34, 0.5, 0.85, 1.4);
  pool.position.set(0, 13, TABLE_Z);
  pool.target.position.set(0, 0, TABLE_Z);
  const rim = new THREE.DirectionalLight('#9cc8ff', 4.5);
  const rim2 = new THREE.DirectionalLight('#ffd7a0', 1.4);
  scene.add(hemi, key, key.target, pool, pool.target, rim, rim.target, rim2, rim2.target);

  // ---------------------------------------------------------------- cameras, variants, tiles
  type V3 = [number, number, number];
  // `shift`: how far left of the frame's middle the subject sits (a fraction of the width), clear of the garage's
  // stats column on the right.
  const CAMS: Record<string, { pos: V3; at: V3; fov: number; table: boolean; shift: number }> = {
    engine: { pos: [6.2, 2.5, E + 7.4], at: [0, 1.2, E + 0.1], fov: 31, table: true, shift: 0.04 },
    cars: { pos: [-7.2, 3.8, -7.0], at: [0, 1.15, 1.4], fov: 33, table: true, shift: 0.1 },
    looks: { pos: [14.1, 2.8, TABLE_Z + 4.1], at: [0, 1.3, TABLE_Z - 0.2], fov: 34, table: true, shift: 0.065 },
    cargo: { pos: [-13, 7.0, -16], at: [0, 0.8, -3.0], fov: 38, table: false, shift: 0.04 },
    whistle: {
      pos: [3.3, 3.2, E + ENGINE.hz + 4.6],
      at: [0, ENGINE_BOILER.chimney.y - 0.35, E + ENGINE_BOILER.chimney.z - 0.3],
      fov: 32,
      table: true,
      shift: 0.24,
    },
  };
  const VARIANTS: Record<string, string[]> = {
    base: ['short'],
    longGhost: ['short', 'longGhost'],
    long: ['long'],
    roofGhost: ['short', 'roofGhost'],
    roof: ['short', 'roof'],
    teal: ['teal'],
    wagon2Ghost: ['short', 'wagon2Ghost'],
    wagon2: ['short', 'wagon2'],
  };
  const TILES: [string, string][] = [
    ['engine', 'base'],
    ['engine', 'longGhost'],
    ['engine', 'long'],
    ['cars', 'base'],
    ['looks', 'base'],
    ['looks', 'roofGhost'],
    ['looks', 'roof'],
    ['looks', 'teal'],
    ['cargo', 'base'],
    ['cargo', 'wagon2Ghost'],
    ['cargo', 'wagon2'],
    ['whistle', 'base'],
  ];
  const all = Object.values(groups).flat();
  const apply = (cam: string, variant: string) => {
    for (const o of all) o.visible = false;
    const on = new Set(VARIANTS[variant]);
    for (const name of on) for (const o of groups[name] ?? []) o.visible = true;
    if (on.has('boilerOnly')) boiler.visible = lashing.visible = true;
    const c = CAMS[cam]!;
    table.visible = c.table;
    for (const o of groups.consist!) o.visible = !c.table;
    for (const d of doors) d.visible = !on.has('teal');
    // The pool of light follows what is staged: the table, or the whole train standing on the road behind it.
    const poolZ = c.table ? TABLE_Z : -3;
    pool.position.set(0, 13, poolZ);
    pool.target.position.set(0, 0, poolZ);
    pool.angle = c.table ? 0.5 : 0.75;
    const camera = new THREE.PerspectiveCamera(c.fov, 16 / 9, 0.1, 200);
    camera.position.set(...c.pos);
    camera.lookAt(...c.at);
    camera.setViewOffset(1280, 720, c.shift * 1280, 0, 1280, 720);
    // The key from the camera's left and above; the rim from behind the model, opposite the camera.
    const at = new THREE.Vector3(...c.at),
      from = new THREE.Vector3(...c.pos).sub(at).setY(0).normalize(),
      side = new THREE.Vector3(-from.z, 0, from.x);
    key.position.copy(at).addScaledVector(from, 8).addScaledVector(side, -7).setY(11);
    key.target.position.copy(at);
    rim.position.copy(at).addScaledVector(from, -10).addScaledVector(side, 4).setY(6);
    rim.target.position.copy(at).setY(1);
    rim2.position.copy(at).addScaledVector(from, -8).addScaledVector(side, -6).setY(3);
    rim2.target.position.copy(at).setY(1);
    return camera;
  };

  const W = 1280,
    H = 720,
    COLS = 3;
  const canvas = document.createElement('canvas');
  canvas.id = 'garage-showroom';
  canvas.style.cssText = `position:fixed;left:0;top:0;width:${W * COLS}px;height:${H * Math.ceil(TILES.length / COLS)}px;z-index:2147483647`;
  document.body.append(canvas);
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W * COLS, H * Math.ceil(TILES.length / COLS), false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  await renderer.init();
  renderer.autoClear = false;
  const cameras = TILES.map(([cam, variant]) => {
    const camera = apply(cam, variant);
    return camera;
  });
  for (let k = 0; k < TILES.length; k++) {
    apply(...TILES[k]!);
    await renderer.compileAsync(scene, cameras[k]!);
  }
  const draw = () => {
    renderer.setScissorTest(true);
    TILES.forEach(([cam, variant], k) => {
      const camera = apply(cam, variant);
      const x = (k % COLS) * W,
        y = Math.floor(k / COLS) * H;
      renderer.setViewport(x, y, W, H);
      renderer.setScissor(x, y, W, H);
      renderer.clear();
      renderer.render(scene, camera);
    });
    renderer.setScissorTest(false);
  };
  draw();
  await new Promise((resolve) => setTimeout(resolve, 400));
  draw();
  setInterval(draw, 1500);
  done.__garageInfo = { tiles: TILES.map((t) => t.join('/')), E, TABLE_Z, W, H, COLS };
  console.log('GARAGE SHEET ' + JSON.stringify(done.__garageInfo));
  done.__garageDone = true;
}
