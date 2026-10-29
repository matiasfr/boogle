import js from '@eslint/js';
import globals from 'globals';

const peerjsBan = { name: 'peerjs', message: 'Use createPeerRoom from src/net/ (see src/net/README.md).' };
const simMessage = 'src/sim/ is pure logic: no three.js, physics, DOM or other src/ modules.';

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
  // Module boundaries (AGENTS.md). Later blocks replace the rule, so each repeats the peerjs ban.
  {
    files: ['src/**/*.js'],
    ignores: ['src/net/**'],
    rules: { 'no-restricted-imports': ['error', { paths: [peerjsBan] }] },
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
          patterns: [{ group: ['../*', 'three/*'], message: simMessage }],
        },
      ],
      'no-restricted-globals': ['error', 'window', 'document', 'navigator', 'localStorage'],
    },
  },
  {
    files: ['eslint.config.js', 'vite.config.js'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['dev/**/*.mjs'],
    languageOptions: { ecmaVersion: 2024, globals: { ...globals.node, ...globals.browser } },
  },
];
