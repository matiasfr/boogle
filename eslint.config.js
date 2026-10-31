import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const peerjsBan = { name: 'peerjs', message: 'Use createPeerRoom from src/net/ (see src/net/README.md).' };
const cannonBan = { name: 'cannon-es', message: 'Physics goes through src/physics/engine.ts (docs/plans/rapier.md).' };
const simMessage = 'src/sim/ is pure logic: no three.js, physics, DOM or other src/ modules.';
const rulesMessage = 'src/world/rules/ is lockstep only: src/sim/, ../grid.js and sibling rules (see its README).';
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

// Lockstep code must give the same bits on every machine (DESIGN.md, "Determinism from day one"). Rules modules
// (src/world/rules/) are covered; add any other pure module that feeds lockstep state.
export const LOCKSTEP_FILES = ['src/sim/**/*.{js,ts}', 'src/world/rules/**/*.{js,ts}', 'src/world/grid.{js,ts}'];
const det = (what) => `${what} is not deterministic across browsers; see DESIGN.md "Determinism from day one".`;
const UNSAFE_MATH = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'sinh', 'cosh', 'tanh', 'asinh', 'acosh']
  .concat(['atanh', 'pow', 'exp', 'expm1', 'log', 'log2', 'log10', 'log1p', 'hypot', 'cbrt'])
  .map((property) => ({ object: 'Math', property, message: det(`Math.${property}`) + ' Use a table or polynomial.' }));

// WebGPURenderer (docs/plans/webgpu-migration.md) never calls onBeforeCompile, can't draw ShaderMaterial and draws
// THREE.Points as 1 px dots.
const GL_ONLY = 'WebGL-only: use a NodeMaterial with TSL node slots (src/render/README.md).';

export default [
  { ignores: ['dist/', 'node_modules/', 'server/', '.claude/'] },
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
  // Module boundaries (AGENTS.md). Later blocks replace the rule, so each repeats the peerjs and sync bans.
  {
    files: ['src/**/*.{js,ts}'],
    ignores: ['src/net/**'],
    rules: { 'no-restricted-imports': ['error', { paths: [peerjsBan, cannonBan], patterns: [syncBan] }] },
  },
  {
    files: ['src/world/game-world.{js,ts}'],
    rules: { 'no-restricted-imports': ['error', { paths: [peerjsBan, cannonBan] }] },
  },
  {
    files: ['src/world/rules/**/*.{js,ts}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [peerjsBan, ...['three', 'cannon-es'].map((name) => ({ name, message: rulesMessage }))],
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
          paths: [peerjsBan, cannonBan],
          patterns: [
            {
              group: ['./*', '!./*.css'],
              message: 'Features stay independent: share code via src/, not another feature.',
            },
            syncBan,
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
          paths: [peerjsBan, ...['three', 'cannon-es'].map((name) => ({ name, message: simMessage }))],
          patterns: [{ group: ['../*', 'three/*'], message: simMessage }, syncBan],
        },
      ],
      'no-restricted-globals': ['error', 'window', 'document', 'navigator', 'localStorage'],
    },
  },
  {
    files: ['src/**/*.{js,ts}'],
    ignores: LOCKSTEP_FILES,
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'MemberExpression[property.name=/^(ShaderMaterial|RawShaderMaterial|ShaderChunk|ShaderLib|UniformsLib|UniformsUtils|WebGLRenderer|Points|onBeforeCompile|customProgramCacheKey|readRenderTargetPixels)$/]',
          message: GL_ONLY,
        },
      ],
    },
  },
  // The physics facade is the one module that may import cannon-es (docs/plans/rapier.md).
  {
    files: ['src/physics/engine.ts'],
    rules: { 'no-restricted-imports': ['error', { paths: [peerjsBan], patterns: [syncBan] }] },
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
      ],
    },
  },
  {
    files: ['eslint.config.js', 'vite.config.js', 'native/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['dev/**/*.mjs'],
    languageOptions: { ecmaVersion: 2024, globals: { ...globals.node, ...globals.browser } },
  },
];
