import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

/** Read-only inventory. Shared bundle caches are deliberately never deleted. */
export function hostAudit() {
  let processes = 'unavailable';
  let cacheRoot = 'unavailable';
  try {
    processes = execFileSync('ps', ['-axo', 'pid,command'], { encoding: 'utf8' })
      .split('\n')
      .filter((s) => /Chromium|chrome.*(?:testing|helper)|dev\/(?:look|scenarios)|look-broker/i.test(s))
      .join('\n');
  } catch {
    /* sandbox */
  }
  try {
    cacheRoot = execFileSync('getconf', ['DARWIN_USER_CACHE_DIR'], { encoding: 'utf8' }).trim();
  } catch {
    /* non-Mac */
  }
  const metal = ['com.google.chrome.for.testing.helper', 'org.chromium.Chromium.helper'].flatMap((bundle) =>
    ['com.apple.metal', 'com.apple.metalfe'].map((cache) => {
      const location = path.join(cacheRoot, bundle, cache);
      return {
        location,
        exists: fs.existsSync(location),
        cleared: false,
        reason: 'Shared bundle identity across profiles; test-exclusive ownership not established.',
      };
    }),
  );
  return { platform: process.platform, release: os.release(), processes, metal, trueCold: false };
}

export function profileInventory(profile: string) {
  const matches: { path: string; bytes: number }[] = [];
  const walk = (dir: string, depth: number) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isFile() && /cache|dawn|gpu|shader|service worker/i.test(file.slice(profile.length)))
        matches.push({ path: file, bytes: fs.statSync(file).size });
      if (entry.isDirectory() && depth < 5) walk(file, depth + 1);
    }
  };
  walk(profile, 0);
  return matches;
}
