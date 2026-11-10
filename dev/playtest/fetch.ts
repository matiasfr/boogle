// Reading play sessions from our own server (GET /playdata, server/src/playdata.ts) with the report token
// (scripts/report-token.ts): the one download path, for `npm run playtest` and `npm run loop -- trace`. Downloads land
// in .look/playtest/<id>.jsonl. Server: BOOGLE_SERVER if set, else the production server.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, reportToken } from '../../scripts/report-token.ts';
import type { PlaySession } from '../../server/src/playdata.ts';
import { parseSession, type Session } from './read.ts';

export const SERVER = process.env.BOOGLE_SERVER || 'https://boogle-server.fly.dev';
export const OUT = path.join(ROOT, '.look/playtest');
export const NO_TOKEN =
  'No REPORT_TOKEN: set it in the environment or as REPORT_TOKEN=... in .env.local (the Fly secret).';

/** The server's session list and downloads, or an error naming what is missing (the token, or the server's answer). */
export function playdata() {
  const token = reportToken();
  if (!token) throw new Error(NO_TOKEN);
  const headers = { authorization: `Bearer ${token}` };
  async function get(p: string) {
    const r = await fetch(`${SERVER}${p}`, { headers });
    if (r.status === 401) throw new Error('the server refused the token (401)');
    if (!r.ok) throw new Error(`GET ${p}: ${r.status}`);
    return r;
  }
  return {
    list: async (): Promise<PlaySession[]> => (await get('/playdata?limit=200')).json() as Promise<PlaySession[]>,
    async download(id: string): Promise<Session> {
      const text = await (await get(`/playdata/${id}`)).text();
      fs.mkdirSync(OUT, { recursive: true });
      fs.writeFileSync(path.join(OUT, `${id}.jsonl`), text);
      return parseSession(id, text);
    },
  };
}

/** `latest` (the newest that `person` accepts), an exact id, or an id's start or end. */
export function resolveSession(list: PlaySession[], want: string, person: (s: PlaySession) => boolean = () => true) {
  if (want === 'latest') {
    const hit = list.find(person);
    if (!hit) throw new Error('no sessions yet');
    return hit;
  }
  const hit = list.find((s) => s.id === want) ?? list.find((s) => s.id.endsWith(want) || s.id.startsWith(want));
  if (!hit) throw new Error(`no session like "${want}" among the newest ${list.length}`);
  return hit;
}
