// The canyon kit as built (content/built/levels/canyon-kit.json): every placed piece's tilted box solids against the
// kit's rules (dev/prefab/canyon-kit.ts `kitPieceProblems`): clear of every tread by 0.4 m, 6 m from the alcove, the
// bell and the first device pad. Place's flood does not read prop solids, so this is the kit's own audit.
import fs from 'node:fs';
import { loadLevelArtifact } from '../../src/prefab/validate.ts';
import { compiled } from '../../src/prefab/catalogue.ts';
import { kitPieceProblems } from '../prefab/canyon-kit.ts';

export function checkCanyonKit(file = 'content/built/levels/canyon-kit.json') {
  const level = loadLevelArtifact(JSON.parse(fs.readFileSync(file, 'utf8')) as unknown, compiled.prefabs);
  const problems = level.placements.flatMap(kitPieceProblems);
  return { name: 'canyon kit', pieces: level.placements.length, failures: problems.length, problems };
}
