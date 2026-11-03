// Task ownership, shared by map and registry. Paths are data so registry can reject stale guidance.
import fs from 'node:fs';
import path from 'node:path';
import { readFile } from './read.ts';

type Route = {
  scope: string;
  owners: string[];
  example: string;
  copy: string;
  docs: string[];
  sync: string;
  checks: string;
  lookalikes: string[];
  warning: string;
};
const look = 'npm run check; look at the changed action (motion: curves/video; real-time feel separately)';
const rulesDocs = ['src/world/rules/README.md', 'src/world/README.md', 'docs/game-design/haul.md'];

export const TASK_ROUTES: Record<string, Route[]> = {
  hat: [
    {
      scope: 'Built-in wear_head meshes',
      owners: ['assets/src/buddy.py', 'src/player/buddy/body.ts', 'character/main.ts'],
      example: 'assets/src/buddy.py',
      copy: 'cap/beanie mesh parts on the Head bone; preview choices in character',
      docs: ['docs/game-design/player.md', 'docs/plans/asset-pipeline.md'],
      sync: 'Local query-selected appearance; this is not a per-player earned hat protocol',
      checks: `${look}; npm run assets -- --check (rebuild authored asset through its pipeline first)`,
      lookalikes: ['src/proto/place/gifts.ts', 'src/sim/gift-catalog.ts'],
      warning:
        'Choose built-in vs earned scope first; the sim gift catalog is throwable/carried items, not wearable rewards.',
    },
    {
      scope: 'Earned place hats',
      owners: ['src/proto/place/gifts.ts'],
      example: 'src/proto/place/gifts.ts',
      copy: 'hat/beanie catalog entries, hat slot and WEAR fit; copy data, not prototype lifecycle into core',
      docs: ['docs/game-design/place.md', 'docs/game-design/player.md'],
      sync: 'Personal rewards saved locally; equipped clothes use Owner presence placeClothes in co-op',
      checks: `${look}; exercise equipped hat with two players`,
      lookalikes: ['src/sim/gift-catalog.ts', 'assets/src/buddy.py'],
      warning: 'Earned hats are place cosmetics; preserve existing gift lines. The sim catalog is a different system.',
    },
  ],
  critter: [
    {
      scope: 'Cosmetic wildlife',
      owners: ['src/features', 'src/entity/entity.ts'],
      example: 'src/features/critter-fireflies.ts',
      copy: 'Local entity lifetime and update',
      docs: ['docs/game-design/critters.md'],
      sync: 'Local; shared/interactive critters need an explicit sync choice',
      checks: `${look}; perf before/after many meshes`,
      lookalikes: ['src/proto/place/folk.ts'],
      warning: 'Place residents are prototype NPCs, not the cosmetic critter lifecycle recipe.',
    },
  ],
  tuning: [
    {
      scope: 'Jump tuning',
      owners: ['src/constants.ts', 'src/entities/player/state.ts', 'dev/level/rules.ts'],
      example: 'src/entities/player/state.ts',
      copy: 'JUMP arc, pressJump input buffer; constants own launch speed and gravity',
      docs: ['docs/game-design/player.md', 'dev/sim/README.md'],
      sync: 'Owner physics; other tabs interpolate presence',
      checks: `${look}; npm run sim -- replay; npm run level-check (reachability derives from launch speed/gravity)`,
      lookalikes: ['src/player/player.ts', 'src/player/state.ts'],
      warning: 'player/player is a facade; player/state stores records. Neither owns the controller.',
    },
  ],
  'lockstep-op': [
    {
      scope: 'Op in an existing system',
      owners: ['src/world/rules', 'src/sim', 'src/adapters'],
      example: 'src/world/rules/piles.ts',
      copy: 'pile.drop validation/apply, edits generator and typed fields',
      docs: rulesDocs,
      sync: 'Lockstep; adapter effects in onApplied after acceptance',
      checks: 'npm run check; lockstep determinism/conservation/validation tests; look for visible adapter changes',
      lookalikes: ['src/features/piles.ts', 'src/world/sync.ts'],
      warning:
        'Register with the owning rules module, not the feature or sync service. Update the actual system chapter; haul is the example.',
    },
  ],
  'lockstep-system': [
    {
      scope: 'New shared persistent system',
      owners: ['src/sim', 'src/world/rules', 'src/world/rules/index.ts', 'src/world/rules/types.ts', 'src/features'],
      example: 'src/world/rules/piles.ts',
      copy: 'PilesApi, state, edits and invariants; sim and adapter are separate owners',
      docs: [...rulesDocs, 'docs/game-design.md', 'docs/atlas/README.md'],
      sync: 'Lockstep; append RULES and typed Rules API; version/migrate or dev-phase WORLD_NS break',
      checks: 'npm run check; lockstep tests; new sync contract scenario when needed; look; atlas story/check',
      lookalikes: ['src/adapters/piles.ts'],
      warning:
        'Use a feature adapter unless other modules import it. Add a game-design chapter and index line, not just the example haul chapter.',
    },
  ],
  hud: [
    {
      scope: 'Feature HUD, core player HUD, or transient notice',
      owners: ['src/features', 'src/player/hud.ts', 'src/ui/notify.ts', 'src/ui'],
      example: 'src/features/held.ts',
      copy: 'Feature-owned DOM/CSS with entity lifetime',
      docs: ['docs/game-design/hud.md', 'docs/game-design/held.md'],
      sync: 'Local view of the owning system state',
      checks: look,
      lookalikes: ['src/player/dom.ts', 'index.html'],
      warning:
        'Feature UI stays with its feature. player/hud owns core charge/look/roster/lobby; ui is reusable kit, notify the transient lane. No new DOM in index.html.',
    },
  ],
  poi: [
    {
      scope: 'Point of interest site and entity content',
      owners: ['src/pois', 'src/island/index.ts', 'src/features/pois.ts'],
      example: 'src/entities/ball/index.ts',
      copy: 'Entity lifecycle; lighthouse/site is only a placement/reach data example',
      docs: ['src/island/README.md', 'docs/game-design/pois.md', 'docs/game-design/island.md'],
      sync: 'Local static content; deterministic shared ground; interactive state chooses its own sync kind',
      checks: `${look}; npm run level-check; npm run island-map; perf for many meshes/lights`,
      lookalikes: ['src/pois/lighthouse/site.ts', 'src/pois/lighthouse/index.ts'],
      warning:
        'The lighthouse onFrame lifecycle is suppressed debt until the home redesign. New POIs use entities, site reach targets and existing loader globs.',
    },
  ],
  control: [
    {
      scope: 'Key, touch and pad action',
      owners: ['src/player/controls.ts', 'src/features'],
      example: 'src/features/ping.ts',
      copy: 'registerAction with key, touch, free pad slot and guide metadata',
      docs: ['docs/game-design/controls.md'],
      sync: 'Local input; action chooses message/Owner/Host/Lockstep as needed',
      checks: `${look}; registry --json before choosing a pad slot; check all three input modes`,
      lookalikes: ['src/player/input.ts'],
      warning:
        'Hand-bound move/Space/E/R are not the recipe for new keys. Keep a pad slot free; wrapAction changes existing actions.',
    },
  ],
  interactable: [
    {
      scope: 'Target for the existing interact button',
      owners: ['src/player/hands.ts', 'src/features'],
      example: 'src/features/log-sources.ts',
      copy: 'registerInteractable returns targets in reach; run queues an edit',
      docs: ['docs/game-design/controls.md', 'docs/game-design/haul.md'],
      sync: 'Local targeting; action uses its owner state (example: Lockstep)',
      checks: look,
      lookalikes: ['src/player/controls.ts'],
      warning:
        'Use the existing interact action, not a new key. Queued submitEdit is not acceptance; update the target system chapter.',
    },
  ],
  entity: [
    {
      scope: 'World or screen object',
      owners: ['src/entity/entity.ts', 'src/entities', 'src/features'],
      example: 'src/entities/ball/index.ts',
      copy: 'Long-lived state/view/sync split; ping is the short-lived example',
      docs: ['docs/game-design/ball.md', 'docs/game-design.md'],
      sync: 'Choose per state; ball uses Owner with handoff',
      checks: look,
      lookalikes: ['src/features/ping.ts', 'src/loop.ts'],
      warning:
        'Only the main glob imports entity index; consumers use state, presentation may use view. Services stay separate. Update the actual object chapter; ball is the example.',
    },
  ],
  'one-off-message': [
    {
      scope: 'Transient event shared with peers',
      owners: ['src/features', 'src/netplay/net.ts'],
      example: 'src/features/ping.ts',
      copy: 'onRoomReady room.onMessage and room.send, validation/rate limit on receipt',
      docs: ['src/net/README.md', 'docs/game-design/social.md', 'docs/game-design/multiplayer.md'],
      sync: 'One-off reliable ordered message; no persistent state',
      checks: `${look}; registry for message name; exercise two players`,
      lookalikes: ['src/net/ws-room.ts', 'src/netplay/presence-fields.ts'],
      warning:
        'net owns transport; netplay owns game presence/lifecycle. Use the room interface, never a direct WebSocket or sticky presence value for an event.',
    },
  ],
  'presence-field': [
    {
      scope: 'Current Owner value (or Host field)',
      owners: ['src/netplay/net.ts', 'src/netplay/snaps.ts', 'src/features'],
      example: 'src/features/held.ts',
      copy: 'addPresenceField and onRemotePresence with null/missing off state',
      docs: ['src/net/README.md', 'docs/game-design/multiplayer.md', 'docs/game-design/held.md'],
      sync: 'Owner, 20 Hz latest wins; Host via addHostField; changing owner via createOwnerSync',
      checks: `${look}; registry --json; npm run load before/after presence changes; two-player cleanup/interpolation`,
      lookalikes: ['src/net/ws-room.ts', 'src/netplay/owner-sync.ts'],
      warning:
        'net is transport, netplay is game state delivery. Use a descriptive untaken key (old short keys stay), validate inputs, smooth poses and sweep departed peers.',
    },
  ],
  prototype: [
    {
      scope: 'Flagged experiment',
      owners: ['src/proto', 'src/features', 'protos/protos.ts'],
      example: 'src/features/proto-place.ts',
      copy: 'Small flag-gated dynamic loader; keep implementation under proto',
      docs: ['docs/plans/find-the-fun.md', 'docs/proposals/boogle-2.md', 'docs/game-design/place.md'],
      sync: 'Choose per state; lockstep number changes need a separate proto room',
      checks: `${look}; card question/one-line change and live status when shipped; owner playtest stops further work`,
      lookalikes: ['src/proto/flags.ts', 'src/entities'],
      warning:
        'Place now also opens by default; do not copy that policy for a new experiment. Prototypes may use onFrame until promoted; keep core seams explicit and update the experiment chapter.',
    },
  ],
};

export function checkTaskRoutes(root: string): string[] {
  return Object.entries(TASK_ROUTES).flatMap(([kind, routes]) =>
    routes.flatMap((r) =>
      [...new Set([...r.owners, r.example, ...r.docs, ...r.lookalikes])]
        .filter((p) => !fs.existsSync(path.join(root, p)))
        .map((p) => `stale task route ${kind} (${r.scope}): ${p} does not exist; update dev/scan/task-routes.ts`),
    ),
  );
}

export function taskRouteLines(root: string, kind: string): string[] | null {
  if (!Object.hasOwn(TASK_ROUTES, kind)) return null;
  const routes = TASK_ROUTES[kind];
  if (!routes) return null;
  const out = routes.flatMap((r) => {
    const facts = r.example.endsWith('.ts')
      ? readFile(r.example, fs.readFileSync(path.join(root, r.example), 'utf8'))
      : null;
    return [
      `${kind}: ${r.scope}`,
      `  owners: ${r.owners.join(', ')}`,
      `  copy: ${r.example} — ${r.copy}`,
      ...(facts ? [`  example exports: ${facts.exports.slice(0, 8).join(', ') || '(entry registration)'}`] : []),
      `  docs: ${r.docs.join(', ')}`,
      `  sync: ${r.sync}`,
      `  checks: ${r.checks}`,
      `  look-alikes: ${r.lookalikes.join(', ')}`,
      `  warning: ${r.warning}`,
    ];
  });
  return [
    ...out,
    'All routes: read AGENTS.md and required docs; update the actual game-design chapter for visible changes.',
    'check:full locally only for src/net*, world/sync.ts, world/game-world.ts or server/; networking/render-pipeline changes also need check:gpu.',
    'Test diet: new tests only for lockstep logic (plus named entity-core exceptions); new scenarios only for sync contracts.',
  ];
}
