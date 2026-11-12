// Line 2's longer boiler, installed by a plain hold at the Roundhouse table (docs/plans/ring-island-build2.md, V3, on
// the coordinator's ruling of 12 November): the steel that came home on a pallet east of the table, a post beside it,
// and the one prompt. Greybox: boxes, placeholder labels, no sound, no camera. The garage's own install moment
// (garage-view.ts, `?home=b`) waits for the Home flip, when the table and the server's install point are one place.
// A Local view of accepted state, mounted by works-live.ts. It reads the Shed, Line, Aperture and Train rows through
// `adapter.read.world()` at the head of every entry point and keeps nothing from a world. The install is not predicted
// (railway-predict.ts), so the banner and the post's lamp follow the accepted event and the rows, on every page.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter } from '../../adapters/railway-session.ts';
import type { RailwayAccepted } from '../../adapters/railway-effects.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Interactable } from '../../player/hands.ts';
import { onStart } from '../../loop.ts';
import { me } from '../../player/player.ts';
import { touchHold, wrapAction } from '../../player/controls.ts';
import { dom } from '../../player/dom.ts';
import { showMomentBanner } from '../../ui/moment-banner.ts';
import { SHED_TABLE } from '../../sim/railway-works-layout.ts';
import { STEEL } from '../../sim/railway-ring-layout.ts';
import { LINE2 } from '../../sim/railway-lines.ts';
import { aperture, line, shed, trains } from '../../sim/railway-rows.ts';
import { createBoxBatch } from './works-box-view.ts';
import { playSharedMoment } from './shared-moment.ts';

// Placeholder labels (docs/agent-calls.md; none is The Boogler's).
const INSTALL = 'Hold: install the longer boiler',
  HOLDING = 'Keep holding',
  TAPPED = 'Hold to install',
  BUSY = 'The table’s busy',
  NOT_NOW = 'Not now',
  BANNER = ['Longer boiler installed', 'Line 2’s trains take it at the Village'] as const;
/** Seconds of hold (the garage's Large install, garage-data.ts SIZES.large.hold). */
const HOLD_S = 1.2;
const GREY = '#9c9ea1',
  GREY_DARK = '#6f7275',
  STEEL_BLOCK = '#e8742c', // the island's steel (ring-steel/view.ts)
  READY = '#e8742c',
  FITTED = '#58b368';
/** Metres from the table's centre, on the open ground between line 2's two roads east of the deck: the post 5.2 m out
 * (inside the 6 m the server judges the install from) and the pallet north of it, 3 m clear of the road to the
 * Village platform and of line 2's frame. */
const TABLE = { x: SHED_TABLE.x / 100, z: SHED_TABLE.z / 100, y: SHED_TABLE.y / 100 - 0.2 };
export const POST = { x: TABLE.x + 5.2, z: TABLE.z + 0.2 },
  PALLET = { x: TABLE.x + 5.7, z: TABLE.z - 1.8, w: 1.5, d: 2.1 };

let release: (() => void) | null = null;
onStart(() => {
  wrapAction('interact', {
    up: (next) => {
      release?.();
      next();
    },
  });
  // The touch Grab button presses through touchDown but releases through useUp (src/player/input.ts), so the interact
  // action's release never fires for it: a tap would run the hold out. Its own pointer release lets go as well.
  touchHold(dom.grabBtn, { down: () => {}, up: () => release?.(), cancel: () => release?.() });
});

export function createBoilerInstall(adapter: RailwayAdapter, owner: OwnedView) {
  const batch = createBoxBatch(owner, STEEL.total + 6, false);
  /** Seconds held so far, or -1; the tick of a tap that was too short; the wait for the server's answer (ms). */
  let held = -1,
    tappedAt = -1e9,
    askedUntil = 0;

  function rows() {
    if (!adapter.read.whole()) return null;
    const wd = adapter.read.world(),
      l = line(wd, LINE2),
      sh = shed(wd);
    return {
      wd,
      steel: sh.steel,
      boiler: l.boiler,
      fitted: l.boiler >= 1,
      // The roll-out owns the table from the commission until the wagon has coupled (the rule refuses the install).
      busy: sh.ready >= 0 && !trains(wd).some((t) => t.wagon),
      shown: aperture(wd).joined >= 0 || sh.steel > 0 || l.boiler >= 1,
    };
  }
  const inReach = () => {
    const p = me.body?.position;
    return (
      !!p &&
      Math.hypot(p.x - TABLE.x, p.z - TABLE.z) <= SHED_TABLE.reach / 100 - 0.4 &&
      Math.hypot(p.x - POST.x, p.z - POST.z) <= 2.6 &&
      Math.abs(p.y - SHED_TABLE.y / 100) <= 2.6
    );
  };
  /** The prompt's standing: hidden before steel is home and once fitted; 'refused' while the server's answer is out. */
  function standing(r: NonNullable<ReturnType<typeof rows>>) {
    if (r.steel < 1 || r.fitted) return 'hidden' as const;
    if (performance.now() < askedUntil) return 'refused' as const;
    return r.busy ? ('blocked' as const) : ('ready' as const);
  }
  function draw() {
    const r = rows();
    batch.mesh.visible = !!r && r.shown;
    if (!r || !r.shown) return;
    const y = TABLE.y;
    batch.begin();
    batch.box(PALLET.x, y + 0.09, PALLET.z, PALLET.w, 0.18, PALLET.d, GREY_DARK);
    for (let i = 0; i < Math.min(r.steel, STEEL.total); i++) {
      const row = i % 3,
        side = Math.floor(i / 3) % 2,
        layer = Math.floor(i / 6);
      batch.box(
        PALLET.x - 0.33 + side * 0.66,
        y + 0.4 + layer * 0.44,
        PALLET.z - 0.66 + row * 0.66,
        0.56,
        0.4,
        0.56,
        STEEL_BLOCK,
      );
    }
    // The post: a lamp that is grey until steel is home, orange while the install waits, green once fitted, and the
    // hold's bar filling under it.
    batch.box(POST.x, y + 0.06, POST.z, 0.5, 0.12, 0.5, GREY_DARK);
    batch.box(POST.x, y + 0.65, POST.z, 0.2, 1.3, 0.2, GREY);
    batch.box(POST.x, y + 1.42, POST.z, 0.36, 0.24, 0.36, r.fitted ? FITTED : r.steel > 0 ? READY : GREY_DARK);
    const fill = r.fitted ? 1 : held >= 0 ? Math.min(1, held / HOLD_S) : 0;
    batch.box(POST.x, y + 1.02, POST.z, 0.9, 0.12, 0.24, GREY_DARK);
    if (fill > 0)
      batch.box(POST.x - 0.45 + 0.45 * fill, y + 1.02, POST.z, 0.9 * fill, 0.16, 0.28, r.fitted ? FITTED : READY);
    batch.commit();
  }
  function letGo() {
    if (held < 0) return;
    held = -1;
    tappedAt = performance.now();
  }
  release = letGo;
  owner.cleanup(() => {
    if (release === letGo) release = null;
  });
  draw();
  return {
    restore() {
      held = -1;
      askedUntil = 0;
      draw();
    },
    update(dt: number) {
      const r = rows();
      if (held >= 0) {
        if (!r || standing(r) !== 'ready' || !inReach()) held = -1;
        else if ((held += dt) >= HOLD_S) {
          held = -1;
          // Sent on the fit this page saw; the server's answer brings the banner, or the prompt comes back.
          if (adapter.installBoiler(r.boiler)) askedUntil = performance.now() + 4000;
        }
      }
      draw();
    },
    /** The room's moment, from the server's accepted install on every page: a banner, and the lamp goes green with
     * the rows. A restore or a late join gets the green lamp only. */
    accepted(e: RailwayAccepted) {
      if (e.op !== 'rail.install') return;
      askedUntil = 0;
      playSharedMoment('longer boiler', e, adapter.read.pid, () => {
        showMomentBanner(BANNER[0], BANNER[1], 4.5);
        return false;
      });
    },
    targets(): Interactable[] {
      const r = rows();
      if (!r || !adapter.read.ready() || !inReach()) return [];
      const s = standing(r);
      if (s === 'hidden') return [];
      const at = new THREE.Vector3(POST.x, TABLE.y + 1.8, POST.z);
      // The adapter's correction names only a code (refused, noop), not a reason a player can read: a neutral one.
      if (s === 'refused') return [{ id: 'railway-install', verb: INSTALL, at, blocked: NOT_NOW }];
      if (s === 'blocked') return [{ id: 'railway-install', verb: INSTALL, at, blocked: BUSY }];
      const verb = held >= 0 ? HOLDING : performance.now() - tappedAt < 1500 ? TAPPED : INSTALL;
      return [
        {
          id: 'railway-install',
          verb,
          at,
          run: () => {
            if (held < 0) held = 0;
          },
        },
      ];
    },
    inspect: () => {
      const r = rows();
      return {
        installView: {
          shown: batch.mesh.visible,
          steel: r ? r.steel : 0,
          boiler: r ? r.boiler : 0,
          prompt: r ? standing(r) : 'hidden',
          held,
          post: POST,
        },
      };
    },
  };
}
