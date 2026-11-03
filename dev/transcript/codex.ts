import { base, firstText, num, obj, stamp, str } from './types.ts';
import type { Session, Call } from './types.ts';
export function codex(path: string, lines: string[]): Session {
  const s = base('codex', path),
    calls = new Map<string, Call>();
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
      p = obj(x.payload),
      type = str(p.type);
    if (x.type === 'turn_context') {
      if (p.model) s.model = str(p.model);
      continue;
    }
    if (x.type === 'session_meta') continue;
    if (x.type === 'event_msg' && type === 'token_count') {
      const info = obj(p.info),
        total = obj(info.total_token_usage),
        last = obj(info.last_token_usage);
      s.output = num(total.output_tokens) ?? s.output;
      s.cachedInput = num(total.cached_input_tokens) ?? s.cachedInput;
      s.cacheWrite = num(total.cache_write_input_tokens) ?? s.cacheWrite;
      const context = num(last.input_tokens);
      if (context !== null) s.samples.push({ time: t, context });
      continue;
    }
    if (x.type === 'response_item') {
      if (type === 'message') {
        if (p.role === 'user' && !s.first) s.first = firstText(p.content);
        if (p.role === 'assistant') s.messages++;
        continue;
      }
      if (type.endsWith('_call') && p.call_id) {
        let input = p.arguments ?? p.input;
        if (typeof input === 'string' && type === 'function_call') {
          try {
            input = JSON.parse(input);
          } catch {
            /* raw input */
          }
        }
        const c: Call = { id: str(p.call_id), name: str(p.name) || type, input, start: t };
        calls.set(c.id, c);
        s.calls.push(c);
        continue;
      }
      if (type.endsWith('_call_output')) {
        const c = calls.get(str(p.call_id));
        if (c) {
          c.end = t;
          c.output = p.output;
          const o = typeof p.output === 'string' ? p.output : JSON.stringify(p.output);
          c.error =
            /(?:exit code: [1-9]|process exited with code [1-9]|"isError"\s*:\s*true|approval.*(?:denied|rejected))/i.test(
              o,
            );
        }
        continue;
      }
    }
    s.skipped++;
  }
  return s;
}
