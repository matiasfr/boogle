// Code bundles or tests read these directories, whatever the extension: atlas/main.ts bundles docs/atlas/ (its
// changes.md included), the greybox and sickle backdrop import docs/world/map-prototypes.html, and tests read both.
// test/ fixtures and public/ (copied into the site as is) are never prose. .github/ is CI itself.
const READ_BY_CODE = /^(?:docs\/(?:atlas|world)|test|server\/test|public|\.github)\//;
const IMAGE = /^docs\/.+\.(?:png|jpe?g|gif|webp|svg)$/;

/** True for a path no build, bundle or test reads apart from the docs checks. test/change-class.test.ts keeps it so. */
export function isDocs(file: string): boolean {
  const f = file.replace(/^\.\//, '');
  if (!f || f.startsWith('/') || f.split('/').includes('..') || READ_BY_CODE.test(f)) return false;
  return f.endsWith('.md') || IMAGE.test(f);
}
