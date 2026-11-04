// Upload two existing look captures; REPORT_TOKEN stays in the CLI Authorization header.
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
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
const site = new URL(required('site'));
if (
  !['http:', 'https:'].includes(server.protocol) ||
  server.username ||
  server.password ||
  server.search ||
  server.hash ||
  server.pathname !== '/'
)
  throw new Error('--server must be an HTTP(S) origin without credentials or query');
if (!['http:', 'https:'].includes(site.protocol) || site.username || site.password)
  throw new Error('--site must be an HTTP(S) site without credentials');
const token = reportToken();
if (!token) throw new Error('Set REPORT_TOKEN in the environment or .env.local');
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
  if (bytes.length > 4 * 1024 * 1024) throw new Error(`${side} exceeds 4 MiB`);
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
if (!response.ok) throw new Error(`Create review: HTTP ${response.status}: ${await response.text()}`);
const card = (await response.json()) as ReviewCard;
for (const side of ['before', 'after'] as const)
  if (card.evidence?.[side]?.sha256 !== hashes[side]) throw new Error(`Uploaded ${side} hash did not match`);
const link = new URL('protos/', site.href.endsWith('/') ? site : new URL(site.href + '/'));
link.searchParams.set('review', card.id);
// The dev page accepts this only for loopback HTTP. Production uses its configured service.
if (server.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(server.hostname))
  link.searchParams.set('reviewServer', server.origin);
console.log(JSON.stringify({ link: link.href, server: server.origin, card }, null, 2));
