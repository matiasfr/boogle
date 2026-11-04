// boogle.club/protos/: prototype cards with play links, recorded answers, behaviour counters and local heat maps.
// A direct ?review= link opens the internal retained comparison instead of the prototype list.
import './protos.css';
import { ANSWERED, PROTOS, type Proto, type ProtoStatus } from './protos.ts';
import { countsLine, read } from './store.ts';
import { heatMap } from './heat.ts';

const reviewId = new URLSearchParams(location.search).get('review');
if (reviewId) await (await import('./review.ts')).showReview(reviewId);

const ORDER: Record<ProtoStatus, number> = { live: 0, building: 1, graduated: 2, answered: 2, parked: 2, retired: 3 };
const touch = matchMedia('(pointer: coarse)').matches;
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = '') => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

function card(p: Proto): HTMLElement {
  const c = el('article', `card ${p.status}`);
  c.id = p.id;
  const head = el('div', 'head');
  const step = p.step === 'depth' ? 'Depth track' : `Step ${p.step}`;
  const meta = el('p', 'meta', `${step} · since ${p.since}`);
  if (p.status !== 'live')
    meta.append(
      ' · ',
      el(
        'strong',
        'badge',
        p.status === 'building' ? 'not live yet' : `retired${p.retired ? `: ${p.retired.why}` : ''}`,
      ),
    );
  head.append(meta, el('h2', '', p.title), el('p', 'what', p.what));
  if (p.note) head.append(el('p', 'note', p.note));
  if (p.retired?.note) head.append(el('p', 'note', p.retired.note));
  if (p.answer) head.append(el('p', 'note', `“${p.answer.verdict}” ${p.answer.next}`));
  c.append(head);

  if (p.archived) c.append(el('p', 'note', `Archived: git tag ${p.archived}.`));
  else {
    const play = el('a', p.merged ? 'btn' : 'btn play', p.merged ? `Merged into: ${p.merged.label}` : 'Play');
    play.href = import.meta.env.BASE_URL + (p.merged?.url ?? p.url).replace(/^\//, '');
    if (!touch) play.target = '_blank';
    c.append(play);
    if (!p.merged) c.append(el('p', 'url', p.url));
  }
  if (p.variants?.length) {
    const row = el('div', 'variants');
    for (const v of p.variants) {
      const a = el('a', 'btn variant');
      a.href = import.meta.env.BASE_URL + v.url.replace(/^\//, '');
      if (!touch) a.target = '_blank';
      a.title = v.url;
      a.append(el('strong', '', v.name), el('span', '', v.what));
      row.append(a);
    }
    c.append(row);
  }
  c.append(el('p', 'question', p.question));

  const played = el('p', 'played');
  played.setAttribute('aria-live', 'polite');
  const drawPlayed = () => {
    const did = countsLine(read(p.id).counts);
    played.textContent = did;
    played.hidden = !did;
  };
  drawPlayed();
  redraws.push(drawPlayed);
  c.append(played);
  const heat = heatMap(p);
  redraws.push(heat.redraw);
  c.append(heat.el);
  return c;
}

const redraws: (() => void)[] = [];
// Game tabs save counters and sittings: show them without a reload.
addEventListener('storage', () => redraws.forEach((fn) => fn()));
addEventListener('focus', () => redraws.forEach((fn) => fn()));

// Settled cards retain the owner's answer and what happens next.
function answered(): HTMLElement {
  const wrap = el('section', 'settled');
  wrap.append(el('h2', '', 'Answered'));
  const ul = el('ul', 'answers');
  for (const p of PROTOS.filter((q) => ANSWERED.includes(q.status))) {
    const li = el('li', `answer ${p.status}`);
    const head = el('p', 'a-head');
    head.append(el('strong', 'badge', p.status), ' ', el('strong', '', p.title));
    li.append(head);
    if (p.answer) li.append(el('q', 'a-verdict', p.answer.verdict), el('p', 'a-next', p.answer.next));
    if (p.archived) li.append(el('p', 'a-next', `Archived: git tag ${p.archived}.`));
    ul.append(li);
  }
  wrap.append(ul);
  return wrap;
}
if (!reviewId && PROTOS.some((p) => ANSWERED.includes(p.status))) document.getElementById('list')!.before(answered());

const sorted = PROTOS.map((p, i) => ({ p, i }))
  .filter(({ p }) => !ANSWERED.includes(p.status))
  .sort((a, b) => ORDER[a.p.status] - ORDER[b.p.status] || a.i - b.i)
  .map((x) => x.p);
if (!reviewId) document.getElementById('list')!.append(...sorted.map(card));
