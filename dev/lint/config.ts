import globals from 'globals';
import base from '../../.oxlintrc.json' with { type: 'json' };
import { policy } from './policy.ts';
import { customRules } from './safety.ts';

const readonly = (values: Record<string, boolean>) =>
  Object.fromEntries(Object.entries(values).map(([key, writable]) => [key, writable ? 'writable' : 'readonly']));

// Oxlint consumes stable JSON, never its experimental TS-config or alpha jsPlugins API.
// Build native safety overrides from the same policy as the AST checks (including LOCKSTEP_FILES).
export function nativeConfig() {
  return {
    ...base,
    overrides: [
      ...base.overrides,
      { files: ['**/*.js', '**/*.mjs', '**/*.ts'], globals: readonly(globals.browser) },
      ...policy
        .filter((b) => b.files)
        .map((b) => ({
          files: b.files,
          ...(b.ignores ? { excludeFiles: b.ignores } : {}),
          rules: Object.fromEntries(Object.entries(b.rules ?? {}).filter(([name]) => !customRules.has(name))),
        })),
      { files: ['vite.config.ts', 'native/**/*.ts', 'dev/**/*.mjs'], globals: readonly(globals.node) },
    ],
  };
}
