import js from '@eslint/js';
import globals from 'globals';

const peerjsBan = { name: 'peerjs', message: 'Use createPeerRoom from src/net/ (see src/net/README.md).' };
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
  group: ['**/world/sync.js', './sync.js'],
  importNames: ['registerOp', 'registerState', 'onTick'],
  message:
    'Lockstep ops/state/ticks live in src/world/rules/<name>.js (see its README). Adapters use submitEdit, onApplied, onAfterTick, onSnapshot.',
};

// Lockstep code must give the same bits on every machine (DESIGN.md, "Determinism from day one"). Rules modules
// (src/world/rules/) are covered; add any other pure module that feeds lockstep state.
export const LOCKSTEP_FILES = ['src/sim/**/*.js', 'src/world/rules/**/*.js', 'src/world/grid.js'];
const det = (what) => `${what} is not deterministic across browsers; see DESIGN.md "Determinism from day one".`;
const UNSAFE_MATH = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'sinh', 'cosh', 'tanh', 'asinh', 'acosh']
  .concat(['atanh', 'pow', 'exp', 'expm1', 'log', 'log2', 'log10', 'log1p', 'hypot', 'cbrt'])
  .map((property) => ({ object: 'Math', property, message: det(`Math.${property}`) + ' Use a table or polynomial.' }));

export default [
  { ignores: ['dist/', 'node_modules/', 'server/', '.claude/'] },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.browser,
    },
  },
  // Module boundaries (AGENTS.md). Later blocks replace the rule, so each repeats the peerjs and sync bans.
  {
    files: ['src/**/*.js'],
    ignores: ['src/net/**'],
    rules: { 'no-restricted-imports': ['error', { paths: [peerjsBan], patterns: [syncBan] }] },
  },
  {
    files: ['src/world/game-world.js'],
    rules: { 'no-restricted-imports': ['error', { paths: [peerjsBan] }] },
  },
  {
    files: ['src/world/rules/**/*.js'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [peerjsBan, ...['three', 'cannon-es'].map((name) => ({ name, message: rulesMessage }))],
          patterns: [
            {
              // three/*, and any ../ path except ../grid.js and ../../sim/<file>
              regex: '^(three/|\\.\\./(?!grid\\.js$|\\.\\./sim/[^/.]+\\.js$))',
              message: rulesMessage,
            },
          ],
        },
      ],
      'no-restricted-globals': ['error', ...RULES_GLOBALS],
    },
  },
  {
    files: ['src/features/**/*.js'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [peerjsBan],
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
    files: ['src/sim/**/*.js'],
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
  // Separate block with its own rules, so it composes with the src/sim one above (a later block setting the same rule
  // for these files would replace it).
  {
    files: LOCKSTEP_FILES,
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: det('Math.random') + ' Use mulberry32 from src/sim/rng.js.' },
        ...['getRandomValues', 'randomUUID'].map((property) => ({
          object: 'crypto',
          property,
          message: det(`crypto.${property}`) + ' Use mulberry32 from src/sim/rng.js.',
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
