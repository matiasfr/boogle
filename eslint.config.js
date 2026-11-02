import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Rapier's plain and SIMD builds (src/physics/backend-rapier.ts loads one).
const rapierBans = ['@dimforge/rapier3d', '@dimforge/rapier3d-simd'].map((name) => ({
  name,
  message: 'Physics goes through src/physics/engine.ts (docs/plans/done/rapier.md).',
}));
const simMessage = 'src/sim/ is pure logic: no three.js, physics, DOM or other src/ modules.';
const rulesMessage = 'src/world/rules/ is lockstep only: src/sim/, ../grid.js and sibling rules (see its README).';
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
  group: ['**/world/sync.{js,ts}', './sync.{js,ts}'],
  importNames: ['registerOp', 'registerState', 'onTick'],
  message:
    'Lockstep ops/state/ticks live in src/world/rules/<name>.js (see its README). Adapters use submitEdit, onApplied, onAfterTick, onSnapshot.',
};
// src/world/ runs on the server too (server/src/host/world-host.ts) and src/net/ is only the room layer: neither may
// reach the renderer, the player or a feature.
const headlessBan = {
  regex: '^(three(/|$)|(\\.\\./)+(render|player|features)/)',
  message: 'src/world/ and src/net/ stay headless: no three.js, src/render/, src/player/ or src/features/.',
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
export const LOCKSTEP_FILES = ['src/sim/**/*.{js,ts}', 'src/world/rules/**/*.{js,ts}', 'src/world/grid.{js,ts}'];
const det = (what) => `${what} is not deterministic across browsers; see DESIGN.md "Determinism from day one".`;
const UNSAFE_MATH = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'sinh', 'cosh', 'tanh', 'asinh', 'acosh']
  .concat(['atanh', 'pow', 'exp', 'expm1', 'log', 'log2', 'log10', 'log1p', 'hypot', 'cbrt'])
  .map((property) => ({ object: 'Math', property, message: det(`Math.${property}`) + ' Use a table or polynomial.' }));

// WebGPURenderer (docs/plans/done/webgpu-migration.md) never calls onBeforeCompile, can't draw ShaderMaterial and draws
// THREE.Points as 1 px dots.
const GL_ONLY = 'WebGL-only: use a NodeMaterial with TSL node slots (src/render/README.md).';
const glOnly = {
  selector:
    'MemberExpression[property.name=/^(ShaderMaterial|RawShaderMaterial|ShaderChunk|ShaderLib|UniformsLib|UniformsUtils|WebGLRenderer|Points|onBeforeCompile|customProgramCacheKey|readRenderTargetPixels)$/]',
  message: GL_ONLY,
};
// One door per shared service: one socket, one audio context, one frame loop. A file on `allow` may use that service;
// `requestAnimationFrame`'s list is one-shots and what runs outside the loop, never a second loop (use onFrame). The
// member form covers `window.AudioContext || webkitAudioContext`, which is how src/render/audio.ts reaches it.
const DOORS = [
  {
    allow: ['src/net/ws-room.ts'],
    selector: "NewExpression[callee.name='WebSocket'], NewExpression[callee.property.name='WebSocket']",
    message: 'One socket: rooms go through src/net/ (onRoomReady, room.send), never a WebSocket of your own.',
  },
  {
    allow: ['src/render/audio.ts'],
    selector:
      'NewExpression[callee.name=/^(webkit)?AudioContext$/], MemberExpression[property.name=/^(webkit)?AudioContext$/]',
    message: 'One audio context: use the one in src/render/audio.ts.',
  },
  {
    allow: [
      'src/main.ts', // one frame, to finish the pipelines before the loop starts
      'src/boot/splash.ts', // the splash, before the loop
      'src/features/welcome-back.ts', // one-shot, starts a CSS transition
      'src/player/pad-diagram.ts', // one-shot, measures after layout
      'src/proto/bar/pad.ts', // one-shot, refocus after a redraw
      'src/debug/look-lab.ts', // waits a frame between captures
    ],
    selector: "Identifier[name='requestAnimationFrame']",
    message: 'One frame loop: use onFrame (src/loop.ts). A one-shot joins the allow-list in eslint.config.js.',
  },
];
const doorRule = ({ selector, message }) => ({ selector, message });

// The entity ratchet (docs/plans/entity-architecture.md, step 11): new things in the world or on screen are entities.
// Today's offenders are listed in eslint-suppressions.json, generated, which can only shrink: a file adding one more
// fails, and a file with one fewer fails until `npm run lint -- --prune-suppressions`. Its own rule, so that file's counts
// mean this and nothing else.
const ENTITY_MESSAGE =
  'A thing in the world or on screen is an entity: copy src/entities/ball (long-lived) or src/features/ping.ts (short-lived). A service other things call goes on the allow-list in eslint.config.js.';
const entityPlugin = {
  rules: {
    'use-an-entity': {
      meta: { type: 'suggestion', schema: [], messages: { useAnEntity: ENTITY_MESSAGE } },
      create: (context) => ({
        CallExpression(node) {
          const c = node.callee;
          const bare = c.type === 'Identifier' && (c.name === 'onFrame' || c.name === 'addBody');
          const sceneAdd =
            c.type === 'MemberExpression' && c.object.name === 'scene' && c.property.name === 'add' && !c.computed;
          if (bare || sceneAdd) context.report({ node, messageId: 'useAnEntity' });
        },
      }),
    },
  },
};
// The services that stay on onFrame ("Entity or system" in that plan).
const ENTITY_SERVICES = [
  'src/loop.ts', // onFrame itself, and the profiler
  'src/render/scene.ts', // the scene and its base lights, which shaders and shadows read; entity.ts imports this file
  'src/render/particles.ts', // the particle simulation behind emit()
  'src/render/sprites.ts', // instancedSprite, behind particles, fireflies and the throw preview
  'src/render/lights.ts', // the lights pool
  'src/render/assets.ts', // the glTF animation mixer
  'src/netplay/net.ts', // the presence send
  'src/features/world.ts', // the lockstep tick driver
  'src/features/gamepad.ts', // gamepad polling
  'src/features/adaptive-res.ts', // adaptive resolution
];

export default [
  { ignores: ['dist/', 'node_modules/', 'server/', '.claude/', '.look/'] },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs', '**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.browser,
    },
  },
  // TypeScript everywhere (AGENTS.md): typescript-eslint's recommended rules on .ts files; tsc does the type checking.
  ...tseslint.configs.recommended.map((c) => ({ ...c, files: ['**/*.ts'] })),
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
          patterns: [{ group: ['../*', 'three/*'], message: simMessage }, syncBan],
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
              group: ['**/player/**', '**/netplay/**', '**/entities/**', '**/features/**'],
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
    files: ['src/entities/*/state.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: rapierBans,
          patterns: [
            {
              group: ['**/render/**', '**/ui/**', '**/player/hud.ts', '**/island/terrain.ts', './view.ts', './sync.ts'],
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
  {
    files: ['src/**/*.{js,ts}'],
    ignores: LOCKSTEP_FILES,
    rules: {
      'no-restricted-syntax': ['error', glOnly, ...DOORS.map(doorRule)],
    },
  },
  // A door's allow-list keeps every other door, and the WebGL ban, in force on that file.
  ...DOORS.map((door) => ({
    files: door.allow,
    rules: { 'no-restricted-syntax': ['error', glOnly, ...DOORS.filter((d) => d !== door).map(doorRule)] },
  })),
  {
    files: ['src/**/*.ts'],
    ignores: ['src/proto/**', 'src/debug/**', 'src/entity/**', ...ENTITY_SERVICES],
    plugins: { boogle: entityPlugin },
    rules: { 'boogle/use-an-entity': 'error' },
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
  {
    files: ['eslint.config.js', 'vite.config.ts', 'native/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['dev/**/*.mjs'],
    languageOptions: { ecmaVersion: 2024, globals: { ...globals.node, ...globals.browser } },
  },
];
