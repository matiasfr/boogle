import { base, firstText, num, obj, stamp, str } from './types.ts';
import type { Session, Call } from './types.ts';
export function claude(path: string, lines: string[]): Session {
  const s = base('claude', path),
    calls = new Map<string, Call>(),
    usage = new Map<string, Record<string, unknown>>();
  for (const line of lines) {
    if (!line.trim()) continue;
    let x: Record<string, unknown>;
    try {
      x = obj(JSON.parse(line));
    } catch {
      s.skipped++;
      continue;
    }
    const t = stamp(s, x.timestamp),
      m = obj(x.message),
      type = str(x.type);
    if (type !== 'assistant' && type !== 'user') {
      s.skipped++;
      continue;
    }
    if (type === 'user' && !s.first) s.first = firstText(m.content);
    if (type === 'assistant') {
      const id = str(m.id);
      if (id && m.usage) usage.set(id, { ...obj(m.usage), time: t });
      if (m.model) s.model = str(m.model);
    }
    if (!Array.isArray(m.content)) continue;
    for (const raw of m.content) {
      const b = obj(raw);
      if (b.type === 'tool_use') {
        const c: Call = { id: str(b.id), name: str(b.name), input: b.input, start: t };
        calls.set(c.id, c);
        s.calls.push(c);
      }
      if (b.type === 'tool_result') {
        const c = calls.get(str(b.tool_use_id));
        if (c) {
          c.end = t;
          c.output = b.content;
          c.error = b.is_error === true;
        }
      }
    }
  }
  s.messages = usage.size;
  for (const u of usage.values()) {
    const out = num(u.output_tokens),
      read = num(u.cache_read_input_tokens),
      write = num(u.cache_creation_input_tokens),
      input = num(u.input_tokens);
    if (out !== null) s.output = (s.output || 0) + out;
    if (read !== null) s.cacheRead = (s.cacheRead || 0) + read;
    if (write !== null) s.cacheWrite = (s.cacheWrite || 0) + write;
    if (input !== null && read !== null && write !== null)
      s.samples.push({ time: Number(u.time), context: input + read + write });
  }
  return s;
}
