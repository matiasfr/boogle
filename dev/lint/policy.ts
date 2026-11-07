// Ordered safety policy. Native rules go to Oxlint; selectors, imports and entity counts go to safety.ts.
export type Restriction = { selector: string; message: string };
export type ImportBan = {
  name?: string;
  group?: string[];
  regex?: string;
  importNames?: string[];
  message: string;
  allowTypeImports?: boolean;
};
export type ImportOptions = { paths?: ImportBan[]; patterns?: ImportBan[] };
export type Rule = string | [string, ...unknown[]];
export type PolicyBlock = { files?: string[]; ignores?: string[]; rules?: Record<string, Rule> };

// Rapier's plain and SIMD builds (src/physics/backend-rapier.ts loads one).
const rapierBans = ['@dimforge/rapier3d', '@dimforge/rapier3d-simd'].map((name) => ({
  name,
  message: 'Physics goes through src/physics/engine.ts (docs/plans/done/rapier.md).',
}));
const simMessage = 'src/sim/ is pure logic: no three.js, physics, DOM or other src/ modules.';
const rulesMessage =
  'src/world/rules/ is lockstep only: src/sim/, ../grid.ts and sibling rules (docs/agents/lockstep.md).';
const netplayMessage = 'src/netplay/ is infrastructure: expose a hook and let the game side subscribe (see net.ts).';
// Browser and timer globals a rules module must not read (src/world/rules/README.md).
const RULES_GLOBALS = [
  'window',
  'document',
  'navigator',
  'localStorage',
  'location',
  'performance',
  'setTimeout',
  'setInterval',
];
// Lockstep registration belongs to the rules modules; everything else in src/ reacts to them (B1, docs/tech-plan.md).
const syncBan = {
  group: ['**/world/sync.js', '**/world/sync.ts', './sync.js', './sync.ts'],
  importNames: ['registerOp', 'registerState', 'onTick'],
  message:
    'Lockstep ops/state/ticks live in src/world/rules/<name>.ts (docs/agents/lockstep.md). Adapters use submitEdit, onApplied, onAfterTick, onSnapshot.',
};
// src/world/ runs on the server too (server/src/host/world-host.ts) and src/net/ is only the room layer: neither may
// reach the renderer, the player or a feature.
const headlessBan = {
  regex: '^(three(/|$)|(\\.\\./)+(render|player|features|components)/)',
  message:
    'src/world/ and src/net/ stay headless: no three.js, src/render/, src/player/, src/features/ or src/components/.',
};
// A prototype or debug tool loads with a dynamic import() so the normal game doesn't carry it. flags.ts and mark.ts are
// the small, eager way in.
const protoBan = {
  regex: '(^|/)proto/(?!(flags|mark)\\.[jt]s$)',
  message: 'Outside src/proto/, import only proto/flags.ts and proto/mark.ts statically; use import() for the rest.',
};
const debugBan = {
  regex: '(^|/)debug/',
  message: 'Outside src/debug/, load debug tools with a dynamic import().',
};

// Lockstep code must give the same bits on every machine (DESIGN.md, "Determinism from day one"). Rules modules
// (src/world/rules/) are covered; add any other pure module that feeds lockstep state.
export const LOCKSTEP_FILES = [
  'src/sim/**/*.{js,ts}',
  'src/world/rules/**/*.{js,ts}',
  'src/world/grid.{js,ts}',
  'src/ecs/**/*.{js,ts}',
];
// E, the ECS-shaped store (docs/plans/ecs-e.md, section 7): pure, reached only through its facade, and its components
// and systems declared only in headless code (src/sim/, src/world/), so none of them can hold a three.js object.
const ecsMessage = 'src/ecs/ is pure: it imports nothing from src/ (docs/plans/ecs-e.md).';
const ecsBan = {
  regex: '(^|/)ecs/(?!index\\.ts$)',
  message: 'Reach E through src/ecs/index.ts only: its tables are not an API (docs/plans/ecs-e.md, section 7).',
};
const ecsDeclare = {
  selector: 'CallExpression[callee.name=/^define(Component|System)$/]',
  message: 'E components and systems are declared in headless code only: src/sim/ or src/world/ (docs/plans/ecs-e.md).',
};
const det = (what: string) => `${what} is not deterministic across browsers; see docs/agents/lockstep.md.`;
const UNSAFE_MATH = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'sinh', 'cosh', 'tanh', 'asinh', 'acosh']
  .concat(['atanh', 'pow', 'exp', 'expm1', 'log', 'log2', 'log10', 'log1p', 'hypot', 'cbrt'])
  .map((property) => ({ object: 'Math', property, message: det(`Math.${property}`) + ' Use a table or polynomial.' }));

// WebGPURenderer (docs/plans/done/webgpu-migration.md) never calls onBeforeCompile, can't draw ShaderMaterial and draws
// THREE.Points as 1 px dots.
const GL_ONLY = 'WebGL-only: use a NodeMaterial with TSL node slots (src/render/README.md).';
const glOnly = {
  selector:
    'MemberExpression[property.name=/^(ShaderMaterial|RawShaderMaterial|ShaderChunk|ShaderLib|UniformsLib|UniformsUtils|WebGLRenderer|Points|onBeforeCompile|customProgramCacheKey|readRenderTargetPixels)$/], ' +
    'ImportDeclaration[source.value=/^three(\\/webgpu|\\/tsl)?$/]:has(ImportSpecifier[imported.name=/^(ShaderMaterial|RawShaderMaterial|ShaderChunk|ShaderLib|UniformsLib|UniformsUtils|WebGLRenderer|Points)$/])',
  message: GL_ONLY,
};
// One door per shared service: one socket, one audio context, one frame loop. A file on `allow` may use that service;
// `requestAnimationFrame`'s list is one-shots and what runs outside the loop, never a second loop (use onFrame). The
// Match names even when destructured/aliased, as for rAF; type-only references do not open a service.
const DOORS = [
  {
    allow: ['src/net/ws-room.ts'],
    selector: "Identifier[name='WebSocket']:not(TSTypeReference > Identifier):not(TSTypeQuery > Identifier)",
    message: 'One socket: rooms go through src/net/ (onRoomReady, room.send), never a WebSocket of your own.',
  },
  {
    allow: ['src/render/audio.ts'],
    selector:
      'Identifier[name=/^(webkit)?AudioContext$/]:not(TSTypeReference > Identifier):not(TSTypeQuery > Identifier)',
    message: 'One audio context: use the one in src/render/audio.ts.',
  },
  {
    allow: [
      'src/main.ts', // one frame, to finish the pipelines before the loop starts
      'src/boot/splash.ts', // the splash, before the loop
      'src/features/welcome-back.ts', // one-shot, starts a CSS transition
      'src/player/pad-diagram.ts', // one-shot, measures after layout
      'src/debug/look-lab.ts', // waits a frame between captures
      'src/debug/startup-record.ts', // opt-in wrapper of existing callbacks; no second frame loop
    ],
    selector: "Identifier[name='requestAnimationFrame']",
    message: 'One frame loop: use onFrame (src/loop.ts). A one-shot joins the allow-list in dev/lint/policy.ts.',
  },
];
const doorRule = ({ selector, message }: { selector: string; message: string }) => ({ selector, message });

// The entity ratchet (docs/plans/entity-architecture.md, step 11): new things in the world or on screen are entities.
// Today's offenders are listed in lint-suppressions.json, generated, which can only shrink: a file adding one more
// fails, and a file with one fewer fails until `npm run lint -- --prune-suppressions`. Its own rule, so that file's counts
// mean this and nothing else.
export const ENTITY_MESSAGE =
  'A thing in the world or on screen is an entity: copy src/entities/ball (long-lived) or src/features/ping.ts (short-lived). A service other things call goes on the allow-list in dev/lint/policy.ts.';
// src/pois/ stays suppressed: the home redesign replaces it, so migrating it now would be wasted.
// The services that stay on onFrame ("Entity or system" in that plan).
const ENTITY_SERVICES = [
  'src/features/identity.ts', // keeps this player's name and colour on the room's roster; no screen and no object
  'src/loop.ts', // onFrame itself, and the profiler
  'src/physics/physics.ts', // the static ground and spheres: fixed collision, no mesh, no frame work and no end
  'src/render/scene.ts', // the scene's base lights, which shaders and shadows read
  'src/render/particles.ts', // the particle simulation behind emit()
  'src/render/sprites.ts', // instancedSprite, behind particles, fireflies and the throw preview
  'src/render/lights.ts', // the lights pool
  'src/render/assets.ts', // the glTF animation mixer
  'src/netplay/net.ts', // the presence send
  'src/features/world.ts', // the lockstep tick driver
  'src/features/gamepad.ts', // gamepad polling
  'src/features/adaptive-res.ts', // adaptive resolution
  'src/features/feel.ts', // the spring and flop layer over every avatar; owns no object
  'src/features/impact.ts', // hit-stop and squash over the ball's mesh; owns no object
];

// Input goes through the action interface (docs/agents/owner-calls.md, owner, 6 November). Outside the input layer
// nothing listens for keys, mouse buttons, wheel, touch or pointer events, reads a pad, or names their event types;
// gameplay uses registerAction / onKey / touchHold / onMenuKey in src/player/controls.ts. Checked by
// boogle/input-through-actions (safety.ts), a rule of its own so no other block's no-restricted-syntax replaces it.
export const INPUT_MESSAGE =
  'Input goes through the action interface (owner call, 6 November): outside the input layer nothing reads key codes, pad buttons or touch events. Use registerAction, onKey, onMenuKey or touchHold in src/player/controls.ts (docs/agents/owner-calls.md). A file that is not gameplay input joins INPUT_ALLOW in dev/lint/policy.ts with its reason.';
const INPUT_EVENTS =
  'keydown|keyup|keypress|wheel|touchstart|touchmove|touchend|touchcancel|pointerdown|pointerup|pointermove|pointercancel|mousedown|mouseup|mousemove|gamepadconnected|gamepaddisconnected';
export const INPUT_SELECTORS = [
  // Any event-name string: a listener, a list of names to loop over, a dispatched event.
  `Literal[value=/^(${INPUT_EVENTS})$/]`,
  'MemberExpression[property.name="getGamepads"]',
  'Identifier[name=/^(KeyboardEvent|TouchEvent|WheelEvent|MouseEvent|PointerEvent|GamepadEvent|Gamepad)$/]',
];
// The input layer: the only code that reads raw input.
export const INPUT_LAYER = [
  'src/player/controls.ts', // the action registry, key / mouse / touch binding and the menu-key listener
  'src/player/input.ts', // keyboard, mouse look, touch stick and buttons, wheel
  'src/player/dev-input.ts', // lets the dev tools take the input
  'src/player/input-state.ts', // the state input.ts fills
  'src/player/dismiss-pointer.ts', // the shared tap-to-dismiss for the reward card and celebration camera
  'src/features/gamepad.ts', // the pad driver: polls the pad and dispatches to actions
];
// Not gameplay input, or not ours to change yet. Each entry says why.
export const INPUT_ALLOW = [
  'src/debug/**', // dev and debug tools: free camera, record, dev menu, panels
  'src/proto/**', // prototypes load by import() and carry their own bindings
  'src/render/audio.ts', // any gesture unlocks the audio context; reads no control
  'src/features/wake-lock.ts', // any input takes the screen wake lock; reads no control
  'src/boogler/dialogue.ts', // keeps clicks inside the DOM dialogue from reaching the canvas; reads no control
  'src/render/reward-reveal.ts', // TODO: render file, owned by the performance agent for now; move to onMenuKey and dismissPointer
];

const policyBlocks: PolicyBlock[] = [
  { ignores: ['dist/', 'node_modules/', 'server/', '.claude/', '.look/'] },
  // Module boundaries (AGENTS.md). Later blocks replace the rule, so each repeats the sync, proto and debug bans.
  {
    files: ['src/**/*.{js,ts}'],
    rules: { 'no-restricted-imports': ['error', { paths: rapierBans, patterns: [syncBan, protoBan, debugBan] }] },
  },
  {
    files: ['src/proto/**/*.{js,ts}'],
    rules: { 'no-restricted-imports': ['error', { paths: rapierBans, patterns: [syncBan, debugBan] }] },
  },
  {
    files: ['src/debug/**/*.{js,ts}'],
    rules: { 'no-restricted-imports': ['error', { paths: rapierBans, patterns: [syncBan, protoBan] }] },
  },
  {
    files: ['src/world/*.{js,ts}', 'src/net/**/*.{js,ts}'],
    ignores: ['src/world/game-world.{js,ts}'],
    rules: {
      'no-restricted-imports': ['error', { paths: rapierBans, patterns: [headlessBan, syncBan, protoBan, debugBan] }],
    },
  },
  {
    files: ['src/world/game-world.{js,ts}'],
    rules: { 'no-restricted-imports': ['error', { paths: rapierBans, patterns: [headlessBan, protoBan, debugBan] }] },
  },
  {
    files: ['src/world/rules/**/*.{js,ts}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            ...['three', '@dimforge/rapier3d', '@dimforge/rapier3d-simd'].map((name) => ({
              name,
              message: rulesMessage,
            })),
          ],
          patterns: [
            {
              // three/*, and any ../ path except ../grid and ../../sim/<file> (.js or .ts)
              regex: '^(three/|\\.\\./(?!grid\\.[jt]s$|\\.\\./sim/[^/.]+\\.[jt]s$))',
              message: rulesMessage,
            },
          ],
        },
      ],
      'no-restricted-globals': ['error', ...RULES_GLOBALS],
    },
  },
  {
    files: ['src/features/**/*.{js,ts}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: rapierBans,
          patterns: [
            {
              group: ['./*', '!./*.css'],
              message: 'Features stay independent: share code via src/, not another feature.',
            },
            syncBan,
            protoBan,
            debugBan,
          ],
        },
      ],
    },
  },
  {
    files: ['src/sim/**/*.{js,ts}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            ...['three', '@dimforge/rapier3d', '@dimforge/rapier3d-simd'].map((name) => ({
              name,
              message: simMessage,
            })),
          ],
          patterns: [{ regex: '^(three/|\\.\\./(?!ecs/index\\.ts$))', message: simMessage }, syncBan],
        },
      ],
      'no-restricted-globals': ['error', 'window', 'document', 'navigator', 'localStorage'],
    },
  },
  // Game networking is infrastructure: it never reaches up into what it carries (docs/plans/entity-architecture.md,
  // "Layers"). identity.ts is the one exception: it lives in player/, but imports only src/sim/ and src/net/ and holds
  // the id and key a room join needs. The core rule also counts `import type`; net.ts needs none of these.
  {
    files: ['src/netplay/**/*.{js,ts}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [...rapierBans, { name: 'three', message: netplayMessage }],
          patterns: [
            {
              group: [
                'three/*',
                '**/render/**',
                '**/physics/**',
                '**/player/**',
                '!**/player/identity.ts',
                '**/entities/**',
                '**/components/**',
                '**/boogler/**',
                '**/features/**',
              ],
              message: netplayMessage,
            },
            syncBan,
            protoBan,
            debugBan,
          ],
        },
      ],
    },
  },
  // src/physics/ is infrastructure: game objects call it, not the reverse. Type imports are fine (this is the typed rule,
  // beside the core one above, which counts them): a step hook takes what it needs from main.ts as an argument.
  {
    files: ['src/physics/**/*.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/player/**', '**/netplay/**', '**/entities/**', '**/features/**', '**/components/**'],
              message: 'src/physics/ is infrastructure: pass it what it needs, or let the object call it.',
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  // An entity's state.ts is its body and rules, and loads in Node (test/entity-state-node.test.ts): the scene, the screen
  // and the DOM go in its view.ts (docs/plans/entity-architecture.md, "File shape").
  {
    files: ['src/entities/*/state.ts', 'src/components/*/state.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: rapierBans,
          patterns: [
            {
              group: [
                '**/render/**',
                '**/ui/**',
                '**/player/hud.ts',
                '**/island/terrain.ts',
                '**/components/**/view.ts',
                '../*/view.ts',
                './view.ts',
                './sync.ts',
              ],
              message:
                'state.ts holds no scene, DOM or HUD, and imports neither its view nor its sync: they read it. Ground lookups are in src/island/heights.ts.',
            },
            syncBan,
            protoBan,
            debugBan,
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'document', message: 'state.ts holds no DOM: pass the value in from index.ts, or use view.ts.' },
        { name: 'window', message: 'state.ts holds no DOM: pass the value in from index.ts, or use view.ts.' },
      ],
    },
  },
  // Owned behaviours are called by their entity, never independently scheduled or registered.
  {
    files: ['src/components/**/*.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**'],
              importNames: [
                'defineKind',
                'spawn',
                'despawn',
                'onFrame',
                'onStart',
                'onPreStep',
                'onPostStep',
                'addBody',
                'removeBody',
                'addPresenceField',
                'addHostField',
                'keepPresenceWhile',
                'setLocalPresence',
                'onRemotePresence',
                'onRoomReady',
                'onNetState',
                'onPeerAdded',
                'onPeerLeftIsland',
                'onPeerRemoved',
                'onPeopleChanged',
                'createOwnerSync',
                'registerInteractable',
              ],
              allowTypeImports: true,
              message: 'Components are owned behaviours: their entity owns scheduling, bodies and registrations.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.{js,ts}'],
    ignores: LOCKSTEP_FILES,
    rules: {
      'no-restricted-syntax': ['error', glOnly, ...DOORS.map(doorRule)],
    },
  },
  {
    files: ['src/**/*.{js,ts}'],
    ignores: [...LOCKSTEP_FILES, 'src/world/**'],
    rules: {
      'no-restricted-syntax': ['error', glOnly, ...DOORS.map(doorRule), ecsDeclare],
    },
  },
  {
    files: ['src/ecs/**/*.{js,ts}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: ['three', ...rapierBans.map((b) => b.name)].map((name) => ({ name, message: ecsMessage })),
          patterns: [{ regex: '^(three/|\\.\\./)', message: ecsMessage }],
        },
      ],
    },
  },
  // A door's allow-list keeps every other door, and the WebGL ban, in force on that file.
  ...DOORS.map((door): PolicyBlock => ({
    files: door.allow,
    rules: { 'no-restricted-syntax': ['error', glOnly, ...DOORS.filter((d) => d !== door).map(doorRule)] },
  })),
  {
    files: ['src/**/*.ts'],
    ignores: ['src/proto/**', 'src/debug/**', 'src/entity/**', ...ENTITY_SERVICES],
    rules: { 'boogle/use-an-entity': 'error' },
  },
  {
    files: ['src/**/*.{js,ts}'],
    ignores: [...INPUT_LAYER, ...INPUT_ALLOW],
    rules: { 'boogle/input-through-actions': 'error' },
  },
  // The physics backend is the only module that imports a physics library (docs/plans/done/rapier.md).
  {
    files: ['src/physics/backend-*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: [syncBan, protoBan, debugBan] }] },
  },
  // Separate block with its own rules, so it composes with the src/sim one above (a later block setting the same rule
  // for these files would replace it).
  {
    files: LOCKSTEP_FILES,
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: det('Math.random') + ' Use mulberry32 from src/sim/rng.ts.' },
        ...['getRandomValues', 'randomUUID'].map((property) => ({
          object: 'crypto',
          property,
          message: det(`crypto.${property}`) + ' Use mulberry32 from src/sim/rng.ts.',
        })),
        ...UNSAFE_MATH,
        { object: 'Date', property: 'now', message: det('Date.now') + ' Use the world tick.' },
        { object: 'performance', property: 'now', message: det('performance.now') + ' Use the world tick.' },
      ],
      'no-restricted-syntax': [
        'error',
        { selector: "BinaryExpression[operator='**']", message: det('**') + ' Multiply, or use a table.' },
        { selector: "AssignmentExpression[operator='**=']", message: det('**=') + ' Multiply, or use a table.' },
        { selector: "NewExpression[callee.name='Date']", message: det('new Date()') + ' Use the world tick.' },
        { selector: "CallExpression[callee.name='Date']", message: det('Date()') + ' Use the world tick.' },
        {
          selector:
            'MemberExpression[object.property.name=/^(Math|crypto|Date|performance)$/][object.object.name=/^(globalThis|window|self)$/]',
          message: 'Write Math.x (crypto.x, ...), not globalThis.Math.x, so the determinism lint can check it.',
        },
        ...DOORS.map(doorRule),
      ],
    },
  },
];
// Every import block but E's own carries the facade ban (a later block replaces the rule for its files).
export const policy: PolicyBlock[] = policyBlocks.map((block) => {
  const rule = block.rules?.['no-restricted-imports'];
  if (!Array.isArray(rule) || block.files?.includes('src/ecs/**/*.{js,ts}')) return block;
  const [level, options] = rule as [string, ImportOptions];
  return {
    ...block,
    rules: {
      ...block.rules,
      'no-restricted-imports': [level, { ...options, patterns: [...(options.patterns ?? []), ecsBan] }],
    },
  };
});
