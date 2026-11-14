// Owner-requested parser regression: pure Markdown fixtures, no DOM or game imports.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBacklog, renderBacklog } from '../dev/development/backlog.ts';

const fixture = [
  '# Backlog',
  '',
  '## Committed work',
  '',
  '| Rank | Effort | Status | Plan or source | Next step | Owner words |',
  '| --- | --- | --- | --- | --- | --- |',
  '| P2 | First <script>alert(1)</script> & "quoted" | blocked: on `a < b` | [plan](plans/one.md#next) | Run `a & b\\|c` and [source](docs/source.md) | PRIVATE OWNER WORDS |',
  '| P1 | Priority | building | [external](https://example.com/a?q=1&x=2) | See [<img src=x>](src/example.ts) | PRIVATE OWNER WORDS |',
  '| P2 | Second | scoped | [unsafe](javascript:alert) | [escape](https://example.com/"onclick="bad) | PRIVATE OWNER WORDS |',
  '| P3 | Later | parked by owner | [bad](//example.com) | [bad](data:text/html,hello) | PRIVATE OWNER WORDS |',
  '',
  '## Dropped',
  '',
  'One line each: the effort, his words, the date.',
  '- Dropped secret one',
  '- Dropped secret two',
].join('\n');

test('backlog parses public cells, groups ranks in file order and safely renders inline Markdown', () => {
  const { rows, dropped } = parseBacklog(fixture);
  assert.equal(dropped, 2);
  assert.deepEqual(
    rows.map((row) => row.rank),
    ['P2', 'P1', 'P2', 'P3'],
  );
  assert.equal(rows[0]!.nextStep, 'Run `a & b|c` and [source](docs/source.md)');
  assert.ok(!JSON.stringify(rows).includes('PRIVATE OWNER WORDS'));
  const html = renderBacklog(fixture);
  assert.ok(html.indexOf('id="P1"') < html.indexOf('id="P2"'));
  assert.ok(html.indexOf('First &lt;script&gt;') < html.indexOf('Second'));
  assert.ok(html.indexOf('Second') < html.indexOf('id="P3"'));
  assert.ok(html.includes('<code>a &amp; b|c</code>'));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;quoted&quot;'));
  assert.ok(html.includes('href="https://github.com/matiasfr/boogle/blob/main/docs/plans/one.md#next"'));
  assert.ok(html.includes('href="https://github.com/matiasfr/boogle/blob/main/docs/source.md"'));
  assert.ok(html.includes('href="https://github.com/matiasfr/boogle/blob/main/src/example.ts"'));
  assert.ok(html.includes('href="https://example.com/a?q=1&amp;x=2"'));
  assert.ok(html.includes('&lt;img src=x&gt;'));
  assert.ok(html.includes('&quot;onclick=&quot;bad'));
  assert.ok(html.includes('<span class="status">blocked</span>'));
  assert.ok(!/PRIVATE OWNER WORDS|Dropped secret|javascript:|data:text|<script>|<img /.test(html));
  assert.ok(html.includes('docs/backlog.md#dropped">Dropped: 2</a>'));
  assert.equal(parseBacklog(fixture.replace(/- Dropped secret (one|two)/g, 'Nothing yet.')).dropped, 0);
});

test('backlog rejects missing tables and malformed rows with source line numbers', () => {
  assert.throws(() => parseBacklog('# Backlog'), /docs\/backlog.md:1: Missing Committed work table/);
  assert.throws(
    () => parseBacklog('## Committed work\nNothing yet.'),
    /docs\/backlog.md:1: Missing Committed work table/,
  );
  const row = '| P1 | Too short |';
  const malformed = fixture.replace(/^\| P1 .*$/m, row);
  assert.throws(() => parseBacklog(malformed), /docs\/backlog.md:8: .*6 columns; found 2/);
  assert.throws(() => parseBacklog(malformed.replace(row, row + ' a | b | c | d | e |')), /:8: .*found 7/);
});
