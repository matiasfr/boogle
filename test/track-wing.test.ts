// ?layer=wing greybox (docs/brainstorms/track-layers-double.md): which side the second hand works, how it folds, and that
// both hands stay inside the 5.8 m beam over every panel of both lines. Seats are the straight-line geometry in the
// flatbed's rig frame (curves are checked live through `machine.wingStats`); the hands are the real mechanism.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three/webgpu';
import { FORMATION, LINKS, upLat } from '../src/place/layout.ts';
import { MAX_PANEL_LENGTH, carriedPiece, trackPanels } from '../src/entities/railway/track-panels.ts';
import { WING, WING_BEAM_LENGTH, panelMechanism, wingSide, wingState } from '../src/entities/railway/machine-panels.ts';

const F = MAX_PANEL_LENGTH + 2.4; // the flatbed's setback behind the head while laying
const bit = new THREE.BoxGeometry(0.1, 0.12, 3.05);
const batch = (n: number) => new THREE.InstancedMesh(bit, new THREE.MeshBasicMaterial(), n);
/** The up track's x in the machine's rig frame (+x its left) at line metre `s`, laying along `dir`. */
const upX = (spec: (typeof LINKS)[number], s: number) => {
  const lat = upLat(FORMATION[spec.id], s);
  // `lateral` is measured facing +s with negative to the left; the machine faces `dir` along s.
  return lat === null ? null : -lat * spec.dir;
};

test("the wing is on the up track side: the machine's right on line 1, its left on line 2", () => {
  for (const spec of LINKS) {
    const s = (FORMATION[spec.id].from + FORMATION[spec.id].to) / 2;
    const x = upX(spec, s)!;
    assert.equal(wingSide(x), spec.dir > 0 ? 1 : -1, spec.id);
  }
  assert.deepEqual(
    LINKS.map((spec) => wingSide(upX(spec, (FORMATION[spec.id].from + FORMATION[spec.id].to) / 2)!)),
    [-1, 1],
  );
});

test('the truck is lifted and the post folded until the gap is about 1.8 m, then sits down and opens to 4 m', () => {
  const folded = wingState(0);
  assert.equal(folded.post, WING.fold);
  assert.equal(folded.lift, WING.lift);
  assert.equal(wingState(WING.fold).lift, WING.lift);
  assert.equal(wingState(WING.set).lift, 0);
  assert.equal(wingState(4).post, 4);
  assert.ok(wingState(1.6).lift > 0 && wingState(1.6).lift < WING.lift);
  // The up stack stays clear of the gantry's own (|x| < 0.9 + the rail column) all the way out.
  for (let gap = 0; gap <= 4; gap += 0.25) assert.ok(wingState(gap).stack - 0.9 > 0.9, `gap ${gap}`);
});

test('both hands stay inside the 5.8 m beam over every panel of both lines', () => {
  let worstDown = 0,
    worstUp = 0,
    doubles = 0;
  for (const spec of LINKS) {
    const f = FORMATION[spec.id];
    const toS = (u: number) => (spec.dir > 0 ? u : spec.line.len - u);
    const side = spec.dir > 0 ? 1 : -1;
    const down = panelMechanism(new THREE.Group(), batch);
    const wing = panelMechanism(new THREE.Group(), batch);
    for (const panel of trackPanels(spec)) {
      const length = panel.to - panel.from;
      const piece = carriedPiece(length);
      const seatU = panel.from + piece.centre,
        startU = panel.from + Math.min(1.5, length / 4);
      const lat = upX(spec, toS(seatU));
      if (lat === null) continue;
      doubles++;
      for (let k = 0; k <= 40; k++) {
        const phase = (k / 40) * 0.98;
        const flatU = panel.from + phase * length - F;
        const postGap = -(upLat(f, toS(flatU) + spec.dir * WING.postZ) ?? 0);
        const postX = side * wingState(postGap).post;
        wing.setStackX(side * wingState(postGap).stack - postX);
        const at = (x: number, u: number) => new THREE.Vector3(x, 0, u - flatU);
        down.pose(phase, 1, at(0, seatU), 0, 0, at(0, startU), piece.length, null);
        worstDown = Math.max(worstDown, Math.hypot(down.trolley.position.x, down.trolley.position.z));
        const rel = (x: number, u: number) => at(x, u).sub(new THREE.Vector3(postX, 0, WING.postZ));
        wing.pose(phase, 1, rel(lat, seatU), 0, 0, rel(upX(spec, toS(startU)) ?? 0, startU), piece.length, null);
        worstUp = Math.max(worstUp, Math.hypot(wing.trolley.position.x, wing.trolley.position.z));
      }
    }
  }
  assert.ok(doubles > 20, `${doubles} double panels`);
  assert.ok(worstDown <= WING_BEAM_LENGTH, `down hand reached ${worstDown.toFixed(2)} m`);
  assert.ok(worstUp <= WING_BEAM_LENGTH, `up hand reached ${worstUp.toFixed(2)} m`);
});
