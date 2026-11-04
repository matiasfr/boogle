// Upload two existing look captures; REPORT_TOKEN stays in the CLI Authorization header.
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { reportToken } from './report-token.ts';
import type { ReviewCard, ReviewInput } from '../protos/review-types.ts';

const args = process.argv.slice(2);
const arg = (name: string, fallback = '') => {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return fallback;
  const value = args[i + 1];
  if (!value || value.startsWith('--')) throw new Error(`Missing --${name}`);
  return value;
};
const required = (name: string) => {
  const value = arg(name);
  if (!value || value.startsWith('--')) throw new Error(`Missing --${name}`);
  return value;
};
const server = new URL(arg('server', process.env.BOOGLE_SERVER || 'https://boogle-server.fly.dev'));
if (
  !['http:', 'https:'].includes(server.protocol) ||
  server.username ||
  server.password ||
  server.search ||
  server.hash ||
  server.pathname !== '/'
)
  throw new Error('--server must be an HTTP(S) origin without credentials or query');
const token = reportToken();
if (!token) throw new Error('Set REPORT_TOKEN in the environment or .env.local');
const auth = { authorization: `Bearer ${token}` };
async function request(route: string, init: RequestInit = {}) {
  const response = await fetch(new URL(route, server), {
    ...init,
    headers: { ...auth, ...init.headers },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Review service: HTTP ${response.status}: ${await response.text()}`);
  return response;
}
if (args.includes('--submit')) {
  const value = JSON.parse(await fs.readFile(required('submit'), 'utf8'));
  const response = await request('/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value.submission ?? value),
  });
  console.log(JSON.stringify(await response.json(), null, 2));
  process.exit(0);
}
if (args.includes('--archive')) {
  const id = required('archive');
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error('Invalid review ID');
  const out = path.resolve(required('out'));
  await fs.mkdir(out);
  const card = (await (await request(`/reviews/${id}`)).json()) as ReviewCard;
  await fs.writeFile(path.join(out, 'card.json'), JSON.stringify(card, null, 2), { flag: 'wx', flush: true });
  for (const side of ['before', 'after'] as const) {
    const bytes = Buffer.from(await (await request(card.evidence[side].url)).arrayBuffer());
    if (createHash('sha256').update(bytes).digest('hex') !== card.evidence[side].sha256)
      throw new Error('Archive media hash mismatch');
    const ext =
      card.evidence[side].mime === 'image/jpeg' ? '.jpg' : card.evidence[side].mime === 'image/webp' ? '.webp' : '.png';
    await fs.writeFile(path.join(out, side + ext), bytes, { flag: 'wx', flush: true });
  }
  let after = '',
    count = 0;
  do {
    const page = (await (
      await request(`/reviews?review=${id}&limit=20&after=${encodeURIComponent(after)}`)
    ).json()) as { receipts: import('../protos/review-types.ts').ReviewReceipt[]; next: string | null };
    for (const receipt of page.receipts) {
      await fs.writeFile(path.join(out, receipt.submission.submissionId + '.json'), JSON.stringify(receipt, null, 2), {
        flag: 'wx',
        flush: true,
      });
      count++;
    }
    after = page.next || '';
  } while (after);
  await fs.writeFile(path.join(out, 'archive.json'), JSON.stringify({ server: server.origin, id, receipts: count }), {
    flag: 'wx',
    flush: true,
  });
  for (const dir of [out, path.dirname(out)]) {
    const handle = await fs.open(dir, 'r');
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
  }
  if (args.includes('--delete')) await request(`/reviews/${id}?receipts=${count}`, { method: 'DELETE' });
  console.log(JSON.stringify({ archived: id, out, receipts: count, deleted: args.includes('--delete') }, null, 2));
  process.exit(0);
}
if (args.includes('--delete')) throw new Error('--delete requires --archive <id> --out <new-directory>');
const site = new URL(required('site'));
if (!['http:', 'https:'].includes(site.protocol) || site.username || site.password)
  throw new Error('--site must be an HTTP(S) site without credentials');
const body: ReviewInput & { before: string; after: string } = {
  question: required('question'),
  change: required('change'),
  topic: required('topic'),
  build: required('build'),
  launcher: required('launcher'),
  before: '',
  after: '',
};
const hashes: Record<string, string> = {};
for (const side of ['before', 'after'] as const) {
  const bytes = await fs.readFile(required(side));
  if (bytes.length > 1.5 * 1024 * 1024) throw new Error(`${side} exceeds 1.5 MiB; use a smaller PNG capture`);
  body[side] = bytes.toString('base64');
  hashes[side] = createHash('sha256').update(bytes).digest('hex');
}
if (arg('context')) body.context = JSON.parse(await fs.readFile(arg('context'), 'utf8')) as Record<string, unknown>;
const response = await fetch(new URL('/reviews', server), {
  method: 'POST',
  headers: { authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
  signal: AbortSignal.timeout(30000),
});
if (!response.ok) {
  const recovery =
    response.status === 507
      ? `\nArchive an existing card and free capacity:\nnpm run --silent review-card -- --archive <review-id> --out <new-local-directory> --delete --server ${server.origin}`
      : '';
  throw new Error(`Create review: HTTP ${response.status}: ${await response.text()}${recovery}`);
}
const card = (await response.json()) as ReviewCard;
for (const side of ['before', 'after'] as const)
  if (card.evidence?.[side]?.sha256 !== hashes[side]) throw new Error(`Uploaded ${side} hash did not match`);
const link = new URL('protos/', site.href.endsWith('/') ? site : new URL(site.href + '/'));
link.searchParams.set('review', card.id);
// The dev page accepts this only for loopback HTTP. Production uses its configured service.
if (server.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(server.hostname))
  link.searchParams.set('reviewServer', server.origin);
console.log(JSON.stringify({ link: link.href, server: server.origin, card }, null, 2));
