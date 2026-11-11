// test/helpers/scratch-git.ts under a git hook's environment: GIT_DIR and GIT_WORK_TREE pointing at another repository
// (as pre-push sets them) must not let a scratch repo's init, config or commit touch that repository.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { scratchRepo } from './helpers/scratch-git.ts';

test('a scratch repo stays sealed when GIT_DIR and GIT_WORK_TREE name another repository', () => {
  const outer = scratchRepo('scratch-outer-');
  const saved = { dir: process.env.GIT_DIR, tree: process.env.GIT_WORK_TREE, index: process.env.GIT_INDEX_FILE };
  try {
    outer.write('a.txt', 'a\n');
    outer.git('add', '-A');
    outer.git('commit', '-qm', 'outer');
    const config = path.join(outer.dir, '.git', 'config');
    const before = fs.readFileSync(config, 'utf8');
    process.env.GIT_DIR = path.join(outer.dir, '.git');
    process.env.GIT_WORK_TREE = outer.dir;
    process.env.GIT_INDEX_FILE = path.join(outer.dir, '.git', 'index');
    const inner = scratchRepo('scratch-inner-');
    try {
      inner.git('config', 'user.name', 'inner'); // what the 11 November test wrote into the real config
      inner.write('b.txt', 'b\n');
      inner.git('add', '-A');
      inner.git('commit', '-qm', 'inner');
      // git prints '/' separators on Windows too; compare the resolved paths, not their spelling.
      assert.equal(path.resolve(inner.git('rev-parse', '--absolute-git-dir').trim()), path.join(inner.dir, '.git'));
    } finally {
      inner.remove();
    }
    assert.equal(fs.readFileSync(config, 'utf8'), before, "the outer repository's config changed");
    assert.equal(outer.git('rev-list', '--count', 'HEAD').trim(), '1', 'the outer repository gained a commit');
  } finally {
    for (const [k, v] of [
      ['GIT_DIR', saved.dir],
      ['GIT_WORK_TREE', saved.tree],
      ['GIT_INDEX_FILE', saved.index],
    ] as const)
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    outer.remove();
  }
});
