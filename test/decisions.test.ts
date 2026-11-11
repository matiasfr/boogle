// The decision log split (dev/decisions): a small old-format log goes in, topic files come out with every line kept,
// the no-loss check passes, and it fails when a line is lost or an entry lands in a retired location.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { manifestOf, ruleText, split } from '../dev/decisions/log.ts';
import { checkDecisions } from '../dev/decisions/check.ts';
import { ARCHIVE_FILE, CALLS_FILE, MANIFEST_FILE, ROUTING_FILE, TOPICS } from '../dev/decisions/topics.ts';
import type { TopicId } from '../dev/decisions/topics.ts';

const fileOf = (id: TopicId) => TOPICS.find((t) => t.id === id)!.file;

const LOG = `# Decisions

This is the owner's decision log.

## Current-decision index

### Audio

[Sound](#sound-listening-pack-audit-2026-11-01) owns the calls.

_Decision log, 1 November 2026. Authoritative over older notes._

## Decided

- **2026-11-10, Firefox is supported, at P2** (owner: "Yes, at P2"). Firefox is a supported browser.
- **The hotbar is cut: one thing in your hands** (2 November, owner: "we cut it"). Picking something up replaces what you hold.

### The audit picks (2 November)

The owner's answers. **Where an older entry below disagrees, these win.**

- **Hauling:** you haul each track segment, and the network brings materials closer.
- **While nobody plays:** the network banks one project. _(Superseded 2026-11-06: an empty world is paused.)_

### Sound (listening-pack audit, 2026-11-01)

- **2026-11-01, keep:** prompt pop, deny, honk.

## Changed

- **2026-11-02:** "the hotbar stays for now" became "one thing in your hands".

## Parked by the owner

- **The fourth melon:** waiting on collaborators.

## Open questions (round 8 and the architecture review)

1. Apply the proposed re-ordering?
`;

const CALLS = `# Calls made without the owner

Intro.

| Date | Call | Where | By | Why this pick | Status |
| --- | --- | --- | --- | --- | --- |
| 2026-11-10 | A glider call | [glider-placement](brainstorms/glider-placement.md) | designer | Because | open |
| 2026-11-10 | A sea call | [water-sunshine](plans/water-sunshine.md) | designer | Because | confirmed (owner 10 November: "Yes") |
`;

function tree(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'boogle-decisions-'));
  const out = split(LOG, CALLS, 'the test log');
  for (const [file, text] of Object.entries(out.files)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  }
  fs.mkdirSync(path.join(root, 'dev/decisions'), { recursive: true });
  fs.writeFileSync(path.join(root, MANIFEST_FILE), JSON.stringify(manifestOf(LOG, CALLS, 'test')));
  return root;
}

test('split is deterministic and places entries, rules lines, archive and calls', () => {
  const a = split(LOG, CALLS, 'the test log');
  assert.deepEqual(a.files, split(LOG, CALLS, 'the test log').files);
  const look = a.files[fileOf('look')]!;
  assert.match(
    look,
    /^- 2026-11-10 · Firefox is supported, at P2 \(\[entry\]\(#d-2026-11-10-firefox-is-supported-at-p2\)\)$/m,
  );
  assert.match(look, /^- <a id="d-2026-11-10-firefox-is-supported-at-p2"><\/a>\*\*2026-11-10, Firefox/m);
  const core = a.files[fileOf('core-loop')]!;
  assert.match(core, /- 2026-11-02 · Hauling: you haul each track segment/);
  assert.doesNotMatch(core, /While nobody plays/, 'a superseded entry leaves the topic file');
  const archive = a.files[ARCHIVE_FILE]!;
  assert.match(archive, /^- \*\*While nobody plays:\*\* the network banks one project/m);
  assert.match(archive, /\| A sea call \|/);
  assert.match(a.files[CALLS_FILE]!, /\| A glider call \|/);
  assert.doesNotMatch(a.files[CALLS_FILE]!, /A sea call/);
  assert.match(a.files[fileOf('controls')]!, /2026-11-02 · The hotbar is cut/);
  assert.doesNotMatch(a.files[ROUTING_FILE]!, /^- \*\*/m);
});

test('a lead that is a label reads on into its first sentence', () => {
  assert.equal(ruleText('Home:', ' a busy town at most. More here.'), 'Home: a busy town at most.');
  assert.equal(
    ruleText('The mainland port city', ' is visible from the start.'),
    'The mainland port city is visible from the start.',
  );
  assert.equal(
    ruleText('Loop orders', ' (9 November, owner). The second jump comes after station 3.'),
    'Loop orders: The second jump comes after station 3.',
  );
});

test('the no-loss check passes on the split and fails on a lost line or an entry in a retired location', () => {
  const root = tree();
  try {
    assert.deepEqual(checkDecisions(root).errors, []);
    const look = path.join(root, fileOf('look'));
    const kept = fs.readFileSync(look, 'utf8');
    fs.writeFileSync(look, kept.replace(/^- <a id[^\n]*Firefox[^\n]*\n/m, ''));
    const lost = checkDecisions(root).errors.join('\n');
    assert.match(lost, /no longer anywhere in the new files/);
    assert.match(lost, /Current rules links #d-2026-11-10-firefox/);
    fs.writeFileSync(look, kept);
    fs.appendFileSync(path.join(root, ROUTING_FILE), '\n- **2026-11-11, a new rule** (owner: "x").\n');
    assert.match(checkDecisions(root).errors.join('\n'), /a decision entry in the routing table/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
