// Task ownership, shared by map and registry. Paths are data so registry can reject stale guidance.
import fs from 'node:fs';
import path from 'node:path';
import { readFile } from './read.ts';
import { readSection } from './sections.ts';

type Route = {
  scope: string;
  owners: string[];
  example: string;
  copy: string;
  mustRead: string[];
  readIf: { when: string; refs: string[] }[];
  sync: string;
  checks: string;
  lookalikes: string[];
  warning: string;
};
const look = 'npm run check; look at the changed action (motion: curves/video; real-time feel separately)';
const core = ['AGENTS.md', 'docs/agents/tests.md#tests'];
const plugins = 'docs/agents/plugins.md#a-feature-is-a-plug-in';
const safety = 'docs/agents/room-safety.md#dont-each-of-these-has-broken-a-room';
const sync = 'docs/agents/sync.md#pick-a-sync-kind-for-each-piece-of-state';
const mixed = 'docs/agents/mixed-builds.md#mixed-builds';
const registers = 'docs/agents/registries.md#shared-registries';
const rulesDocs = [
  'src/world/AGENTS.md',
  'src/sim/AGENTS.md',
  'docs/agents/lockstep.md#lockstep',
  safety,
  mixed,
  'src/world/rules/README.md#contract',
];
const design = {
  when: 'Making a design decision, adding a mechanic, or prototype work',
  refs: [
    'docs/agents/context.md',
    'DESIGN.md',
    'docs/plans/find-the-fun.md#rules-for-every-prototype',
    'docs/decisions.md#decided',
  ],
};
/** The decision log's topics: after the routing table, read only the Current rules of the topic the task touches. */
const decisionTopics = {
  when: "Making a design decision in a topic: that topic's Current rules (decisions.md#decided routes them)",
  refs: [
    'docs/decisions-core-loop.md#current-rules',
    'docs/decisions-rail.md#current-rules',
    'docs/decisions-rewards.md#current-rules',
    'docs/decisions-characters.md#current-rules',
    'docs/decisions-look.md#current-rules',
    'docs/decisions-audio.md#current-rules',
    'docs/decisions-controls.md#current-rules',
    'docs/decisions-process.md#current-rules',
  ],
};
/** The rail loop's own reads: one command instead of the layout files, the plans and the bot. */
const rail = {
  when: 'Touching the rail loop (a bill, gate, order, cue or pacing): `npm run loop -- node <id>` before, `npm run loop -- run` after, no browser; usage',
  refs: ['dev/loop/cli.ts'],
};
const visible = {
  when: 'Changing what a player sees or feels (update the owning game-design section)',
  refs: ['docs/agents/verification.md#see-it-before-you-ship', '.claude/skills/look/SKILL.md'],
};
const processReads = [
  { when: 'Editing code', refs: ['docs/agents/typescript.md#typescript-everywhere'] },
  { when: 'Changing imports, boundaries or service/loop ownership', refs: ['docs/agents/lint-boundaries.md'] },
  { when: 'Using tools/scripts', refs: ['docs/agents/tools.md#tools-and-skills'] },
  { when: 'Running as Codex', refs: ['docs/agents/codex.md#codex'] },
  {
    when: 'Substantial work, committing or shipping',
    refs: ['docs/agents/shipping.md#shipping', 'docs/agents/context.md#principle-index'],
  },
];
// Core guidance for narrow tasks fits 14k; new persistent systems need the rules recipe (21k).
// Prototypes necessarily include design principles and prototype rules (30k, with room: 32k was hit on 9 and 10
// November). The decision log's routing table is must-read; a topic file's Current rules are read per task (the log
// was split by topic on 10 November 2026). These are relevance budgets, not investigation limits. Conditional
// sections and path reminders are printed separately.
const ROUTE_BUDGETS: Record<string, number> = { 'lockstep-system': 21000, prototype: 30000 };
const DEFAULT_ROUTE_BUDGET = 14000;

export const TASK_ROUTES: Record<string, Route[]> = {
  review: [
    {
      scope: 'Focused review of an existing contract',
      owners: ['src'],
      example: 'src/sim/rng.ts',
      copy: 'Map the proposed location, then its nested AGENTS.md and the section governing the reviewed behavior',
      mustRead: ['AGENTS.md'],
      readIf: [
        {
          when: 'Reviewing math or a helper location in src/sim',
          refs: ['src/sim/AGENTS.md', 'docs/agents/lockstep.md#lockstep'],
        },
        { when: 'Reviewing apply or acceptance effects', refs: ['src/world/AGENTS.md', safety] },
      ],
      sync: 'Keep the existing kind unless the proposal changes ownership',
      checks: 'Read-only review: inspect evidence relevant to the finding',
      lookalikes: [],
      warning: 'Review is not design work; follow only the contract being reviewed and affected path reminders.',
    },
  ],
  'feature-fix': [
    {
      scope: 'Small bug fix within an existing feature recipe',
      owners: ['src/features'],
      example: 'src/features/held.ts',
      copy: 'Keep the owning feature and its established lifecycle',
      mustRead: [...core, 'src/features/AGENTS.md'],
      readIf: [rail, { when: 'Changing feature lifecycle, DOM or loading', refs: [plugins] }],
      sync: 'Preserve the existing state ownership; ownership changes take the sync route',
      checks: look,
      lookalikes: ['index.html'],
      warning: 'No feature unit test. Read the owning game-design section only if documented behavior changes.',
    },
  ],
  tooling: [
    {
      scope: 'Developer tooling with no game behavior or design change',
      owners: ['dev', 'scripts', '.github'],
      example: 'dev/map.ts',
      copy: 'Existing CLI entry and shared scanner ownership; map the affected folder next',
      mustRead: [...core],
      readIf: [],
      sync: 'No game state; take the game route too if scope reaches runtime behavior',
      checks: 'npm run check; exercise the changed tool locally; no browser for tooling-only work',
      lookalikes: ['src/debug'],
      warning:
        'Read the affected tool contract. src/debug changes that alter player-visible behavior need visual verification.',
    },
  ],
  docs: [
    {
      scope: 'Documentation with no game design decision',
      owners: ['docs', 'AGENTS.md', 'src/README.md'],
      example: 'docs/game-design.md',
      copy: 'As-built index with chapters owned by their systems; distinguish current guidance from dated records',
      mustRead: [...core],
      readIf: [],
      sync: 'No game state; design decisions also take the relevant game route',
      checks: 'npm run check; verify links and guidance against owners; no browser for documentation-only work',
      lookalikes: ['docs/ideas.md', 'docs/proposals'],
      warning: 'Proposals and parked ideas are not implementation authority; preserve dated decisions.',
    },
  ],
  hat: [
    {
      scope: 'Built-in wear_head meshes',
      owners: ['assets/src/buddy.py', 'src/player/buddy/body.ts', 'character/main.ts'],
      example: 'assets/src/buddy.py',
      copy: 'cap/beanie mesh parts on the Head bone; preview choices in character',
      mustRead: [...core],
      readIf: [
        {
          when: 'Authoring/rebuilding a built-in mesh',
          refs: ['docs/plans/asset-pipeline.md#the-pipeline', 'docs/plans/asset-pipeline.md#authoring'],
        },
        {
          when: 'Changing documented avatar behavior',
          refs: ['docs/game-design/player.md#the-buddy-and-the-follow-camera'],
        },
      ],
      sync: 'Local query-selected appearance; this is not a per-player earned hat protocol',
      checks: `${look}; npm run assets -- --check (rebuild authored asset through its pipeline first)`,
      lookalikes: ['src/render/cosmetic-parts.ts', 'src/sim/gift-catalog.ts'],
      warning:
        'Choose built-in vs earned scope first; the sim gift catalog is throwable/carried items, not wearable rewards.',
    },
    {
      scope: 'Earned place hats',
      owners: ['src/entities/wardrobe', 'src/render/cosmetic-parts.ts'],
      example: 'src/render/cosmetic-parts.ts',
      copy: 'hat/beanie catalog entries, hat slot and WEAR fit; copy data, not prototype lifecycle into core',
      mustRead: [...core],
      readIf: [
        {
          when: 'Changing earned place hats or clothes',
          refs: ['docs/game-design/place.md#the-run', 'docs/game-design/player.md#the-buddy-and-the-follow-camera'],
        },
        {
          when: 'Changing clothes presence',
          refs: ['docs/agents/sync.md', 'docs/agents/room-safety.md', 'docs/agents/mixed-builds.md'],
        },
      ],
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
      mustRead: [...core, 'src/features/AGENTS.md', plugins],
      readIf: [{ when: 'Changing documented wildlife', refs: ['docs/game-design/critters.md'] }],
      sync: 'Local; shared/interactive critters need an explicit sync choice',
      checks: `${look}; perf before/after many meshes`,
      lookalikes: ['src/place/folk.ts'],
      warning: 'Place residents are prototype NPCs, not the cosmetic critter lifecycle recipe.',
    },
  ],
  tuning: [
    {
      scope: 'Jump tuning',
      owners: ['src/constants.ts', 'src/entities/player/state.ts', 'dev/level/rules.ts'],
      example: 'src/entities/player/state.ts',
      copy: 'JUMP arc, pressJump input buffer; constants own launch speed and gravity',
      mustRead: [
        ...core,
        'src/entities/AGENTS.md',
        'docs/game-design/player.md#movement-and-jump',
        'docs/agents/test-details/simulation.md',
      ],
      readIf: [],
      sync: 'Owner physics; other tabs interpolate presence',
      checks: `${look}; npm run level-check (reachability derives from launch speed/gravity)`,
      lookalikes: ['src/player/player.ts', 'src/player/state.ts'],
      warning: 'player/player is a facade; player/state stores records. Neither owns the controller.',
    },
  ],
  'lockstep-op': [
    {
      scope: 'Op in an existing system',
      owners: ['src/world/rules', 'src/sim', 'src/adapters'],
      example: 'src/world/rules/tune.ts',
      copy: 'tune.commit validation/apply, edits generator and typed fields',
      mustRead: [...core, ...rulesDocs],
      readIf: [
        rail,
        { when: 'Changing tick/acceptance semantics', refs: ['src/world/README.md#contract-syncts'] },
        { when: 'Changing replay generators', refs: ['src/world/rules/README.md#edit-generators-and-invariants'] },
      ],
      sync: 'Lockstep; adapter effects in onApplied after acceptance',
      checks: 'npm run check; lockstep determinism/conservation/validation tests; look for visible adapter changes',
      lookalikes: ['src/world/rules/roster.ts', 'src/world/sync.ts'],
      warning:
        'Register with the owning rules module. New shared state follows Server kind; this route covers retained classic transport.',
    },
  ],
  'lockstep-system': [
    {
      scope: 'New shared persistent system',
      owners: ['src/sim', 'src/world/rules', 'src/world/rules/index.ts', 'src/world/rules/types.ts', 'src/features'],
      example: 'src/world/rules/tune.ts',
      copy: 'TuneApi, state, edits and invariants; sim and adapter are separate owners',
      mustRead: [
        ...core,
        ...rulesDocs,
        sync,
        'src/world/rules/README.md#adding-a-lockstep-system',
        'src/world/rules/README.md#edit-generators-and-invariants',
        'docs/agents/test-details/atlas.md',
      ],
      readIf: [rail, { when: 'Adding a game-design chapter', refs: ['docs/game-design.md'] }],
      sync: 'Lockstep; append RULES and typed Rules API; WORLD_NS break for development shape changes',
      checks: 'npm run check; lockstep tests; new sync contract scenario when needed; look; atlas story/check',
      lookalikes: ['src/world/rules/roster.ts'],
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
      mustRead: [...core, 'src/features/AGENTS.md', plugins],
      readIf: [
        {
          when: 'Changing feedback or carried-item behavior',
          refs: ['docs/game-design/hud.md', 'docs/game-design/held.md'],
        },
      ],
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
      mustRead: [
        ...core,
        plugins,
        'src/island/README.md#add-a-poi',
        'src/island/README.md#rules',
        'docs/agents/test-details/level.md',
      ],
      readIf: [
        {
          when: 'Changing documented POIs/placement',
          refs: ['docs/game-design/pois.md', 'docs/game-design/island.md#points-of-interest'],
        },
      ],
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
      mustRead: [...core, registers, '.claude/rules/state-consumers.md'],
      readIf: [{ when: 'Changing documented input mapping', refs: ['docs/game-design/controls.md'] }],
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
      example: 'src/entities/railway/sources.ts',
      copy: 'registerInteractable returns targets in reach; run sends a railway action',
      mustRead: [...core, registers, '.claude/rules/state-consumers.md', safety],
      readIf: [
        rail,
        { when: 'Changing documented controls', refs: ['docs/game-design/controls.md'] },
        { when: 'Changing log-source interaction', refs: ['docs/game-design/haul.md#sources-log-bundles'] },
      ],
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
      mustRead: [...core, 'src/entities/AGENTS.md', plugins],
      readIf: [
        rail,
        { when: 'Changing the example ball', refs: ['docs/game-design/ball.md'] },
        { when: 'Choosing/changing state ownership', refs: ['docs/agents/sync.md'] },
      ],
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
      mustRead: [...core, sync, safety, mixed, 'src/net/README.md'],
      readIf: [
        { when: 'Changing documented social messages', refs: ['docs/game-design/social.md'] },
        { when: 'Changing network topology', refs: ['docs/game-design/multiplayer.md#81-topology'] },
      ],
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
      mustRead: [...core, 'src/netplay/AGENTS.md', sync, safety, mixed, 'docs/agents/test-details/load.md'],
      readIf: [
        { when: 'Changing room interface semantics', refs: ['src/net/README.md'] },
        {
          when: 'Changing documented shared values',
          refs: ['docs/game-design/multiplayer.md#83-sync-kind-per-feature'],
        },
        { when: 'Changing held-item presence', refs: ['docs/game-design/held.md'] },
      ],
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
      example: 'src/features/proto-greybox.ts',
      copy: 'Small flag-gated dynamic loader; keep implementation under proto',
      mustRead: [
        ...core,
        'docs/agents/context.md',
        'DESIGN.md',
        'docs/plans/find-the-fun.md#rules-for-every-prototype',
        'docs/decisions.md#decided',
      ],
      readIf: [decisionTopics, { when: 'Changing the place prototype', refs: ['docs/game-design/place.md#the-run'] }],
      sync: 'Choose per state; lockstep number changes need a separate proto room',
      checks: `${look}; card question/one-line change and live status when shipped; owner playtest stops further work`,
      lookalikes: ['src/proto/flags.ts', 'src/entities'],
      warning:
        'Place now also opens by default; do not copy that policy for a new experiment. Prototypes may use onFrame until promoted; keep core seams explicit and update the experiment chapter.',
    },
  ],
};

function routeCost(root: string, route: Route): number {
  return [...new Set(route.mustRead)].reduce((sum, ref) => sum + [...readSection(root, ref).text].length, 0);
}

export function checkTaskRoutes(root: string): string[] {
  const errors: string[] = [];
  for (const [kind, routes] of Object.entries(TASK_ROUTES)) {
    for (const r of routes) {
      for (const p of new Set([...r.owners, r.example, ...r.lookalikes])) {
        if (!fs.existsSync(path.join(root, p))) errors.push(`stale task route ${kind}: ${p} does not exist`);
      }
      for (const ref of new Set([
        ...r.mustRead,
        ...[...r.readIf, design, visible, ...processReads].flatMap((c) => c.refs),
      ])) {
        try {
          readSection(root, ref);
        } catch (error) {
          errors.push(`stale task route ${kind}: ${String(error)}`);
        }
      }
      try {
        const cost = routeCost(root, r);
        const budget = ROUTE_BUDGETS[kind] ?? DEFAULT_ROUTE_BUDGET;
        if (cost > budget)
          errors.push(
            `task route ${kind} (${r.scope}): must-read ${cost} characters exceeds ${budget}; narrow relevant sections in dev/scan/task-routes.ts`,
          );
      } catch {
        /* Reference error already reported above. */
      }
    }
  }
  return errors;
}

export function taskRouteLines(root: string, kind: string): string[] | null {
  const routes = Object.hasOwn(TASK_ROUTES, kind) ? TASK_ROUTES[kind] : undefined;
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
      `  must-read: ${r.mustRead.join(', ')}`,
      `  must-read total: ${routeCost(root, r)} characters / ${ROUTE_BUDGETS[kind] ?? DEFAULT_ROUTE_BUDGET} budget (unique sections; AGENTS included)`,
      ...[...r.readIf, design, visible, ...processReads].map(
        (c) => `  read-if-relevant — ${c.when}: ${c.refs.join(', ')}`,
      ),
      `  sync: ${r.sync}`,
      `  checks: ${r.checks}`,
      `  look-alikes: ${r.lookalikes.join(', ')}`,
      `  warning: ${r.warning}`,
    ];
  });
  return [
    ...out,
    'Apply only literal AGENTS.md triggers; read affected nested AGENTS.md even in reviews. Path rules and conditional reading add to the reported core cost.',
    'A review of one contract uses that contract section and path reminders, not every implementation recipe above. No design corpus for tuning, bug fixes or reviews unless making a design decision.',
    'Use map -- --section <file> <heading-or-anchor>, or line ranges; links are not recursive requirements. Read more whenever the work needs it.',
  ];
}
