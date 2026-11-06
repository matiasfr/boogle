// Node runner. Fetch the three 0.21.0 builds once (not committed):
//   mkdir -p $PKGS/{det,simd,plain}
//   (cd $PKGS/det && npm pack @dimforge/rapier3d-deterministic@0.21.0 && tar xzf *.tgz)   likewise rapier3d-simd, rapier3d
// Then: RAPIER_PKGS=$PKGS node --import ./node-hooks.mjs node.mjs [hashes|cost|correct]
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { runAll } from './experiments.js';

const pkgs = process.env.RAPIER_PKGS;
if (!pkgs) throw new Error('set RAPIER_PKGS (see the header)');
const load = (f) => import(pathToFileURL(path.resolve(pkgs, f, 'package/rapier.js')).href);
const mods = { det: await load('det'), simd: await load('simd'), plain: await load('plain') };
const res = runAll(mods, { only: process.argv[2] });
console.log(JSON.stringify({ engine: `node ${process.version} ${process.arch}`, ...res }, null, 1));
