// The docs/playtests.md entry for what this browser recorded (store.ts): one card's part, or every card's under one
// date ("Copy all", on the protos page and the in-game prototype bar). Per variant: its verdict, its line on why and its
// counters, so one sitting comparing variants reads as one entry. Nothing here talks to a server.
import { PROTOS, PLAYTEST_ORDER, type Proto } from './protos.ts';
import { VERDICTS, countsLine, read, sittingLine, sittings, type Saved, type VariantSaved } from './store.ts';

const PLACEHOLDER = /<(\w+)>/;
export const stepLabel = (p: Proto) => (p.step === 'depth' ? 'Depth track' : `Step ${p.step}`);
const today = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local
const oneLine = (s: string) => s.trim().replace(/\s*\n\s*/g, ' ');
/** A verdict's button label ('' for none). */
export const label = (v: Saved['verdict']) => VERDICTS.find((x) => x.id === v)?.label ?? '';

/** Whether anything was written or recorded for a card. */
export function hasNotes(p: Proto): boolean {
  const s = read(p.id);
  return (
    s.notes.trim() !== '' ||
    s.values.trim() !== '' ||
    s.variant.trim() !== '' ||
    s.verdict !== '' ||
    Object.keys(s.counts).length > 0 ||
    sittings(p.id).length > 0
  );
}

// "barrow: No: too slow downhill (2 spills, 4 min in prototype)"
function variantLine(name: string, v: VariantSaved): string {
  const quick = v.verdict ? `${label(v.verdict)}${v.note.trim() ? `: ${oneLine(v.note)}` : ''}` : '(no verdict)';
  const did = countsLine(v.counts);
  return `${name}: ${quick}${did ? ` (${did})` : ''}`;
}

/** The card's part of an entry (one bullet list, like the entries there). */
export function body(p: Proto): string {
  const s = read(p.id);
  const flag = p.url.replace(PLACEHOLDER, s.name.trim() || `<${p.url.match(PLACEHOLDER)?.[1]}>`);
  const lines = [`- Prototype: ${p.title} (\`${flag}\`, find the fun ${stepLabel(p).toLowerCase()})`];
  const perV = Object.entries(s.byV).filter(([, v]) => v.verdict || v.note.trim() || Object.keys(v.counts).length);
  // Older saves have only the card's latest verdict; newer ones list each variant under the question.
  const quick =
    !perV.length && s.verdict
      ? `${label(s.verdict)}${s.verdictV ? ` (on ${s.verdictV})` : ''}${s.verdictNote.trim() ? `: ${oneLine(s.verdictNote)}` : ''}.`
      : '';
  const answer = [quick, oneLine(s.notes)].filter(Boolean).join(' ');
  lines.push(`- ${p.question} ${answer || (perV.length ? '' : '(no answer)')}`.trimEnd());
  for (const [name, v] of perV) lines.push(`  - ${variantLine(name, v)}`);
  const did = countsLine(s.counts);
  if (did) lines.push(`- Did: ${did}`);
  const sat = sittingLine(sittings(p.id).at(-1));
  if (sat) lines.push(`- Last sitting: ${sat}`);
  if (p.variants?.length) lines.push(`- Variant preferred: ${oneLine(s.variant) || '___'}`);
  if (s.values.trim()) lines.push(`- Values: \`${oneLine(s.values)}\``);
  return lines.join('\n');
}

export const header = () => `## ${today()}\n- Who: Matias, solo`;

/** Every card with something recorded, in playlist order then the rest (all the live ones if nothing is yet). */
export function allEntries(): string {
  const order = [...new Set(PLAYTEST_ORDER.map((o) => o.id))];
  const rank = (p: Proto) => (order.includes(p.id) ? order.indexOf(p.id) : order.length);
  const sorted = PROTOS.map((p, i) => ({ p, i }))
    .sort((a, b) => rank(a.p) - rank(b.p) || a.i - b.i)
    .map((x) => x.p);
  const some = sorted.filter(hasNotes);
  const pick = some.length ? some : sorted.filter((p) => p.status === 'live');
  return `${header()}\n${pick.map(body).join('\n')}\n`;
}

/** Copies `text`, saying so in `said`; without a clipboard (http, an old browser, a press that wasn't a tap) it puts
 * the text in a selected box instead, so a long-press copies it. */
export async function copy(text: string, said: HTMLElement) {
  try {
    await navigator.clipboard.writeText(text);
    said.textContent = 'Copied.';
  } catch {
    const box = document.createElement('textarea');
    box.className = 'fallback';
    box.value = text;
    box.readOnly = true;
    said.replaceChildren(box);
    box.select();
    return;
  }
  setTimeout(() => (said.textContent = ''), 2500);
}
