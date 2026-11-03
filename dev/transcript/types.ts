export type Call = {
  id: string;
  name: string;
  input: unknown;
  start: number;
  end?: number;
  output?: unknown;
  error?: boolean;
};
export type Sample = { time: number; context: number };
export type Session = {
  format: 'claude' | 'codex';
  path: string;
  start: number;
  end: number;
  model?: string;
  first: string;
  calls: Call[];
  messages: number;
  skipped: number;
  output: number | null;
  cacheRead: number | null;
  cacheWrite: number | null;
  cachedInput: number | null;
  samples: Sample[];
};
export type Obj = Record<string, unknown>;
export const obj = (x: unknown): Obj => (x && typeof x === 'object' && !Array.isArray(x) ? (x as Obj) : {});
export const str = (x: unknown): string => (typeof x === 'string' ? x : '');
export const num = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null);
export function base(format: Session['format'], path: string): Session {
  return {
    format,
    path,
    start: Infinity,
    end: 0,
    first: '',
    calls: [],
    messages: 0,
    skipped: 0,
    output: null,
    cacheRead: null,
    cacheWrite: null,
    cachedInput: null,
    samples: [],
  };
}
export function stamp(s: Session, x: unknown): number {
  const t = Date.parse(str(x));
  if (Number.isFinite(t)) {
    s.start = Math.min(s.start, t);
    s.end = Math.max(s.end, t);
    return t;
  }
  return 0;
}
export function firstText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((x) => str(obj(x).text)).find(Boolean) || '';
  return '';
}
