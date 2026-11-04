// A new identity per invocation prevents concurrent benchmarks sharing a Metal namespace.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) return []; // Chrome framework aliases are preserved, never traversed.
    return entry.isDirectory() ? walk(file) : [file];
  });
}

export function prepareIdentity(sourceExecutable: string, out: string) {
  const marker = '.app/Contents/MacOS/';
  const at = sourceExecutable.lastIndexOf(marker);
  if (at < 0 || !sourceExecutable.includes('Google Chrome for Testing.app/'))
    throw new Error('Expected Playwright Chrome for Testing app');
  const source = sourceExecutable.slice(0, at + 4);
  const id = `club.boogle.coldstart.${randomUUID().replaceAll('-', '')}`;
  const owned = fs.mkdtempSync(path.join(out, 'browser-'));
  const app = path.join(owned, path.basename(source));
  execFileSync('/usr/bin/ditto', [source, app]);
  const plists = walk(app).filter((file) => file.endsWith('.app/Contents/Info.plist'));
  const bundles = plists.map((plist, i) => {
    const bundleId = plist === path.join(app, 'Contents/Info.plist') ? id : `${id}.helper${i}`;
    execFileSync('/usr/libexec/PlistBuddy', ['-c', `Set :CFBundleIdentifier ${bundleId}`, plist]);
    const actual = execFileSync('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleIdentifier', plist], {
      encoding: 'utf8',
    }).trim();
    if (actual !== bundleId) throw new Error(`Identity mismatch: ${plist}`);
    return { plist, id: bundleId };
  });
  if (bundles.length < 2) throw new Error('Missing main/helper app plists');
  execFileSync('/usr/bin/codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'pipe' });
  execFileSync('/usr/bin/codesign', ['--verify', '--deep', '--strict', app], { stdio: 'pipe' });
  const cacheRoot = fs.realpathSync(
    execFileSync('/usr/bin/getconf', ['DARWIN_USER_CACHE_DIR'], { encoding: 'utf8' }).trim(),
  );
  return { id, source, app, bundles, cacheRoot, executable: path.join(app, path.relative(source, sourceExecutable)) };
}

function targets(root: string, id: string) {
  if (!/^club\.boogle\.coldstart\.[a-f0-9]{32}$/.test(id)) throw new Error('Not an exclusive cold-start identity');
  const realRoot = fs.realpathSync(root);
  return fs
    .readdirSync(realRoot)
    .filter((name) => name === id || name.startsWith(`${id}.`))
    .flatMap((name) => {
      const parent = path.join(realRoot, name);
      if (!fs.lstatSync(parent).isDirectory() || fs.lstatSync(parent).isSymbolicLink())
        throw new Error(`Unsafe cache parent: ${parent}`);
      return ['com.apple.metal', 'com.apple.metalfe'].map((leaf) => path.join(parent, leaf));
    });
}

function filesBelow(location: string): { path: string; bytes: number; mtimeMs: number }[] {
  if (!fs.existsSync(location) && !fs.lstatSync(location, { throwIfNoEntry: false })) return [];
  const stat = fs.lstatSync(location);
  if (stat.isSymbolicLink()) throw new Error(`Refuse symlink in Metal cache: ${location}`);
  if (stat.isFile()) return [{ path: location, bytes: stat.size, mtimeMs: stat.mtimeMs }];
  if (!stat.isDirectory()) throw new Error(`Unexpected cache entry: ${location}`);
  return fs.readdirSync(location).flatMap((entry) => filesBelow(path.join(location, entry)));
}

export function metalInventory(root: string, id: string) {
  return targets(root, id).flatMap(filesBelow);
}

export function clearExclusiveMetal(root: string, id: string) {
  const locations = targets(root, id);
  // Validate ALL paths and descendants before removing anything. Never follow symlinks.
  for (const location of locations) {
    if (!location.includes(id) || path.dirname(path.dirname(location)) !== fs.realpathSync(root))
      throw new Error(`Refuse nonexclusive Metal path: ${location}`);
    filesBelow(location);
  }
  const before = metalInventory(root, id);
  for (const location of locations) fs.rmSync(location, { recursive: true, force: true });
  return { id, locations, before, cleared: locations.length > 0 && locations.every((file) => !fs.existsSync(file)) };
}
