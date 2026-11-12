// npm run playthrough                     a bot plays the whole round in game time, about a minute. It prints what happened
//                                         to it: time per beat, what never happened, where it stalled, every line on screen.
// npm run playthrough -- --name before    keeps this run under that name (the default is the current commit)
// npm run playthrough -- --compare a b    two runs side by side: time per beat, text gone and new
//   --full                                print the whole report, not just what changed since the last run
//   --to t1-done                          stop after that beat of the production railway route (segments.ts, RAIL_STOPS)
//   --from q5-done                        start from an accepted --rail-seed server save (RAIL_FROM), with its seeded bot
//   --players 2                           two peers in one room, on the shared warp clock (rail-coop.ts)
//   --wall 2700                           the wall-clock limit in seconds (default 300, or 3000 with --long: a full run takes about 1700)
//   --query 'shot=play'                   the page and the bot's own settings (the default: the production entry)
//   --eval dev/look/evals/railway-job.ts  the file with the bot (the default); it must set window.__placeDone
//   --root <checkout>                     play another checkout's build, with this harness
//   --stall 600                           give up after this many game seconds with no new beat or bot line
// Everything lands in .look/playthrough/<name>/: report.txt (what's printed), bot.txt (all it said), summary.txt (the full session, as
// `npm run playtest` reads one), session.jsonl, text.json, saves/ (a state per beat, for `npm run look -- --at <beat>`), a
// still at the end. The bot plays at a person's speed but already knows the way: these are a floor for a first-timer's
// times, not an estimate of them. Not for feel or frame rate: nothing here runs in real time.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { stripTypeScriptTypes } from 'node:module';
import type { Browser } from 'playwright';
import { Game, launch, root, sleep, startStack, reportGfxErrors, type Stack } from './lib.ts';
import { IGNORE_TEXT, installObserver, WATCH_MARKS, type Observed } from './observe.ts';
import { beatsOf } from '../playtest/beats.ts';
import { clock, parseSession, span, str, num, type Ev, type Session } from '../playtest/read.ts';
import { marksByName, objectiveSteps, summarize, compare } from '../playtest/summary.ts';
import { railSegmentOptions, RAIL_COOP_STOPS, RAIL_STOPS } from './segments.ts';
import { writeRailSeed } from './rail-seed.ts';
import { railCoopPlaythrough } from './rail-coop.ts';
import { finishRun, runOpen, startRun } from './verdict.ts';

const SIZE = [1180, 820];
const ROOM = 'playthrough';

const args = process.argv.slice(2);
const opt = (name: string, fallback: string) => {
  const i = args.indexOf(name);
  return i < 0 ? fallback : args[i + 1]!;
};
const has = (name: string) => args.includes(name);
export const OUT = path.resolve(opt('--out', path.join(root, '.look/playthrough')));

/** A session's times on the game's clock: a warped run's wall clock says nothing. */
function onGameClock(s: Session): Session {
  const events = s.events.map((e) => ({ ...e, wall: e.t * 1000 }));
  return { ...s, events, start: (events[0]?.t ?? 0) * 1000, end: (events.at(-1)?.t ?? 0) * 1000 };
}

function readRun(dir: string): { session: Session; text: Observed } {
  const at = fs.existsSync(dir) ? dir : path.join(OUT, dir);
  const session = onGameClock(parseSession(path.basename(at), fs.readFileSync(path.join(at, 'session.jsonl'), 'utf8')));
  return { session, text: JSON.parse(fs.readFileSync(path.join(at, 'text.json'), 'utf8')) as Observed };
}

/** Marks in the order they first happened, with the time since the one before: where the run spends itself. */
function beats(s: Session) {
  return [...marksByName(s).entries()]
    .sort((a, b) => a[1].first - b[1].first)
    .map(([name, o], k, all) => ({
      name,
      n: o.n,
      at: o.first,
      gap: o.first - (k ? all[k - 1]![1].first : s.start / 1000),
    }));
}

function report(s: Session, text: Observed, wall: { game: number; wall: number; done: boolean }, botLog: string[]) {
  const out: string[] = [];
  const say = (line = '') => out.push(line);
  say(
    `${s.card}: ${span(s.end / 1000 - s.start / 1000)} of game in ${span(wall.wall)} (${(wall.game / wall.wall).toFixed(0)}x)`,
  );
  const missed = botLog.filter((l) => /NEVER:/.test(l));
  say(
    wall.done
      ? missed.length
        ? `The bot reached the end, but ${missed.length} things it expected never came:`
        : 'The bot finished, and everything it expected came.'
      : 'THE BOT DID NOT FINISH: see the last bot lines and the still.',
  );
  for (const l of missed.slice(0, 12)) say('  ' + l.replace(/^PLAY /, '').slice(0, 110));
  say();
  say('Beats (first time, then the wait before it; x how often):');
  for (const b of beats(s))
    say(`  ${clock(b.at).padStart(6)}  +${span(b.gap).padEnd(9)} ${b.name}${b.n > 1 ? ` x${Math.round(b.n)}` : ''}`);
  say();
  say('Objective, time on each:');
  const steps = objectiveSteps(s);
  for (const st of steps)
    if (st.s >= 3) say(`  ${clock(st.t).padStart(6)}  ${span(st.s).padEnd(10)} ${st.last || '(nothing showing)'}`);
  const flips = steps.filter((st) => st.s < 3).length;
  if (flips) say(`  (and ${flips} under 3 s: summary.txt has them all)`);
  const list = beatsOf(s.card);
  if (list.length) {
    const names = [...marksByName(s).keys()];
    const never = list.filter(([, re]) => !names.some((n) => re.test(n))).map(([label]) => label);
    say();
    say(`Never happened (or isn't marked): ${never.join(', ') || 'nothing'}`);
  }
  const of = (k: string) => s.events.filter((e) => e.k === k);
  const sum = (evs: Ev[]) => evs.reduce((a, e) => a + num(e.s), 0);
  const samples = of('p');
  if (samples.length) {
    const doing = new Map<string, number>();
    for (const e of samples) doing.set(str(e.a), (doing.get(str(e.a)) ?? 0) + 1);
    say();
    say(
      'Time doing: ' +
        [...doing.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([k, n]) => `${k} ${Math.round((n / samples.length) * 100)}%`)
          .join(', '),
    );
  }
  say(
    `Stalls: stood still ${of('idle').length} times (${span(sum(of('idle')))}), walked into something ` +
      `${of('into').length} times (${span(sum(of('into')))}), fell in water ` +
      `${s.events.filter((e) => e.k === 'm' && str(e.n) === 'fell in water').length} times`,
  );
  const long = [...of('idle'), ...of('into')].filter((e) => num(e.s) >= 8).sort((a, b) => num(b.s) - num(a.s));
  for (const e of long.slice(0, 5))
    say(
      `  ${clock(e.t).padStart(6)}  ${e.k === 'idle' ? 'still' : 'pushing'} ${span(num(e.s))} at (${num(e.x)}, ${num(e.z)})`,
    );
  say();
  say("On screen (Show, don't tell): shown for, times, first at, the line. Cut what the world already shows:");
  const beatAt = (t: number) => {
    let name = 'start';
    for (const b of beats(s)) if (b.at <= t) name = b.name;
    return name;
  };
  for (const l of [...text.lines].sort((a, b) => b.shown - a.shown))
    say(
      `  ${span(l.shown).padStart(9)} x${String(l.shows).padEnd(3)} ${clock(l.first).padStart(6)}  ` +
        `"${l.text.slice(0, 90)}"  [${l.where.split(' ')[0]}, at ${beatAt(l.first)}]`,
    );
  say();
  say('Painted in the world (signs and boards; drawn, not necessarily seen):');
  for (const p of [...text.painted].sort((a, b) => a.first - b.first))
    say(`  ${clock(p.first).padStart(6)} x${String(p.times).padEnd(4)} "${p.text.slice(0, 70)}"`);
  if (botLog.length) {
    say();
    say("The bot's last lines:");
    for (const l of botLog.slice(-6)) say('  ' + l.slice(0, 120));
    say(`  (all of them: ${botLog.length} lines, bot.log)`);
  }
  const errors = of('error');
  say();
  say(errors.length ? `Errors (${errors.length}):` : 'Errors: none');
  for (const e of errors) say(`  ${clock(e.t)} ${str(e.msg)}`);
  return out;
}

/** What's printed: enough to decide what to read next. It stays in an agent's context for the rest of its session. */
function brief(
  s: Session,
  text: Observed,
  wall: { game: number; wall: number; done: boolean },
  botLog: string[],
  was: { session: Session; text: Observed } | null,
) {
  const out: string[] = [];
  const missed = botLog.filter((l) => /NEVER:/.test(l));
  out.push(`${s.card}: ${span(s.end / 1000 - s.start / 1000)} of game in ${span(wall.wall)}.`);
  out.push(
    !wall.done
      ? 'THE BOT DID NOT FINISH.'
      : missed.length
        ? `Finished; ${missed.length} expected things never came:`
        : 'Finished; everything it expected came.',
  );
  for (const l of missed.slice(0, 6)) out.push('  ' + l.replace(/^PLAY /, '').slice(0, 100));
  if (!wall.done) for (const l of botLog.slice(-4)) out.push('  ' + l.slice(0, 100));
  const list = beats(s);
  const names = [...marksByName(s).keys()];
  const never = beatsOf(s.card)
    .filter(([, re]) => !names.some((n) => re.test(n)))
    .map(([label]) => label);
  if (never.length) out.push(`Never marked: ${never.join(', ')}`);
  const of = (k: string) => s.events.filter((e) => e.k === k);
  const sum = (evs: Ev[]) => evs.reduce((a, e) => a + num(e.s), 0);
  out.push(`Stalls: still ${span(sum(of('idle')))}, pushing ${span(sum(of('into')))}; errors ${of('error').length}`);
  if (was) {
    const old = new Map(beats(was.session).map((b) => [b.name, b.at]));
    const moved = list
      .filter((b) => old.has(b.name) && Math.abs(b.at - old.get(b.name)!) >= 10)
      .map((b) => ({ ...b, by: b.at - old.get(b.name)! }));
    const fresh = list.filter((b) => !old.has(b.name)).map((b) => b.name);
    const gone = [...old.keys()].filter((n) => !names.includes(n));
    out.push(`Since the last run (${was.session.id}): ${moved.length} beats moved 10 s or more`);
    for (const b of moved.slice(-6))
      out.push(`  ${clock(b.at).padStart(6)} ${b.by > 0 ? '+' : ''}${Math.round(b.by)} s  ${b.name}`);
    if (fresh.length) out.push(`  new beats: ${fresh.join(', ').slice(0, 160)}`);
    if (gone.length) out.push(`  gone: ${gone.join(', ').slice(0, 160)}`);
    const key = (t: string) => t.replace(/\d[\d,.]*/g, '#');
    const a = new Set(was.text.lines.map((l) => key(l.text)));
    const b = new Set(text.lines.map((l) => key(l.text)));
    const newLines = text.lines.filter((l) => !a.has(key(l.text))).map((l) => `"${l.text.slice(0, 50)}"`);
    const goneLines = was.text.lines.filter((l) => !b.has(key(l.text))).map((l) => `"${l.text.slice(0, 50)}"`);
    if (newLines.length) out.push(`  new on screen: ${newLines.slice(0, 5).join(', ')}`);
    if (goneLines.length) out.push(`  gone from screen: ${goneLines.slice(0, 5).join(', ')}`);
  } else {
    out.push('Longest waits between beats:');
    for (const b of [...list].sort((x, y) => y.gap - x.gap).slice(0, 6))
      out.push(`  ${clock(b.at).padStart(6)} +${span(b.gap).padEnd(9)} ${b.name}`);
  }
  return out;
}

function compareRuns(a: string, b: string) {
  const left = readRun(a);
  const right = readRun(b);
  const lines = compare(left.session, right.session).filter((l) => !/Frame p|Device/.test(l));
  const row = (label: string, x: string, y: string) => `  ${label.padEnd(44).slice(0, 44)} ${x.padEnd(12)} ${y}`;
  const key = (t: string) => t.replace(/\d[\d,.]*/g, '#');
  const texts = (r: typeof left) => new Map(r.text.lines.map((l) => [key(l.text), l]));
  const tl = texts(left);
  const tr = texts(right);
  console.log(lines.join('\n'));
  console.log('\n  On screen:');
  console.log(row('', a, b));
  for (const k of new Set([...tl.keys(), ...tr.keys()])) {
    const x = tl.get(k);
    const y = tr.get(k);
    if (x && y && Math.abs(x.shown - y.shown) < 3) continue;
    console.log(row(k, x ? span(x.shown) : '-', y ? span(y.shown) : '-'));
  }
}

async function main() {
  if (has('--compare')) {
    const i = args.indexOf('--compare');
    return compareRuns(args[i + 1]!, args[i + 2]!);
  }
  const params = new URLSearchParams(opt('--query', 'shot=play'));
  if (params.get('proto') === 'place')
    throw new Error('The Place route is retired; playthrough plays the production one');
  // Rail stops, and accepted server seeds written per run.
  const rail = railSegmentOptions(args);
  if ((rail.from || rail.to) && has('--eval')) throw new Error('Segments use the railway bot; omit --eval');
  if (rail.seed) {
    params.set('railFrom', rail.seed.railFrom);
    if (rail.to && rail.to !== 'pier') params.set('railStop', RAIL_STOPS[rail.to]);
  } else if (rail.to) params.set('botTo', rail.to);
  const query = params.toString();
  const checkout = path.resolve(opt('--root', root));
  const stallS = Number(opt('--stall', '600'));
  const players = Number(opt('--players', '1'));
  if (players !== 1 && players !== 2) throw new Error('--players must be 1 or 2');
  if (!Number.isFinite(stallS) || stallS <= 0) throw new Error('--stall must be positive game seconds');
  const evalFile = path.resolve(
    checkout,
    opt('--eval', `dev/look/evals/${rail.seed ? 'railway-b5b8-bot.ts' : 'railway-job.ts'}`),
  );
  const commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: checkout, encoding: 'utf8' }).trim();
  const name = opt('--name', commit);
  if (!/^[a-zA-Z0-9_-]+$/.test(name) || name === 'latest') throw new Error('Use a simple run name, other than latest');
  const dir = path.join(OUT, name);
  // The last run, before this one can replace it: the report is what changed since.
  let before: ReturnType<typeof readRun> | null = null;
  try {
    before = readRun(fs.realpathSync(path.join(OUT, 'latest')));
  } catch {
    // the first run here
  }
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, 'saves'), { recursive: true });
  startRun(path.join(dir, 'verdict.json'), { checkout, report: path.join(dir, 'report.txt') });

  if (players === 2) {
    if (rail.from) throw new Error('Two-player runs start fresh; the seeded bot is solo');
    if (rail.to && !RAIL_COOP_STOPS.includes(rail.to))
      throw new Error(`Two-player --to: ${RAIL_COOP_STOPS.join(', ')} (beats both peers pass)`);
    return railCoopPlaythrough({ args, checkout, dir, query, stallS, evalFile, to: rail.to });
  }

  let stack: Stack | undefined, browser: Browser | undefined;
  try {
    const url = opt('--url', '');
    stack = await startStack({ root: checkout, url: url || null });
    if (url) {
      const dataDir = opt('--data-dir', '');
      if (!dataDir) throw new Error('--url needs --data-dir (the local server playtest data)');
      stack.dataDir = path.resolve(dataDir);
    }
    if (rail.from) {
      if (url) throw new Error('--from writes a server seed: it needs a local stack, not --url');
      await writeRailSeed(stack.dataDir!, ROOM, rail.from);
      console.log(`Seeded ${rail.from} (railFrom=${rail.seed!.railFrom}) through the host's save path`);
    }
    browser = await launch();
    const g = await Game.open(browser, stack, {
      out: dir,
      size: SIZE,
      hud: true,
      room: ROOM,
      query,
      warp: true,
      init: `(${installObserver.toString()})(${JSON.stringify(IGNORE_TEXT)})`,
    });
    const botLog: string[] = [];
    let heardAt = 0;
    const heard = new Set<string>();
    const gameNow = () => g.page.evaluate(() => performance.now() / 1000);
    g.page.on('console', (m) => {
      if (/^[A-Z]{3,} /.test(m.text())) {
        botLog.push(m.text());
        // Only something new counts as getting somewhere: the numbers differ every time round a loop.
        const words = m
          .text()
          .replace(/\([^)]*\)/g, '')
          .replace(/[\d.]+/g, '#');
        if (!heard.has(words)) heardAt = Date.now();
        heard.add(words);
      }
    });
    const watching = await g.eval(WATCH_MARKS);
    if (!watching) console.log('(This build has no watchPlayMarks: no save states from this run.)');
    await g.page.evaluate(() => (window as unknown as { __warp: { go(n: number): void } }).__warp.go(Infinity));
    const body = stripTypeScriptTypes(fs.readFileSync(evalFile, 'utf8')).replace(/^export \{\};.*$/m, '');
    await g.eval(body);
    let beatAt = await gameNow();
    let wallAt = Date.now();
    const w = await g.warp({
      until: 'window.__placeDone',
      wallLimit: Number(opt('--wall', '')) || (has('--long') ? 3000 : 300),
      stalled: async (at) => {
        const last = await g.page.evaluate(
          () => (window as unknown as { __observe: { lastBeat: number } }).__observe.lastBeat,
        );
        if (heardAt > wallAt) {
          wallAt = heardAt;
          beatAt = at;
        }
        if (last > beatAt) beatAt = last;
        if (at - beatAt > stallS) console.log(`Stopped: nothing new for ${stallS} s of game (--stall).`);
        return at - beatAt > stallS;
      },
    });
    // An eval may leave `window.__shotList` ([{ name, camera, target, fov? }]): one still per entry, from the same state.
    const shotList = await g.page.evaluate(
      () =>
        (window as unknown as { __shotList?: { name: string; camera: number[]; target: number[]; fov?: number }[] })
          .__shotList ?? [],
    );
    for (const shot of shotList) {
      await g.eval(
        `window.__debugCam.set(${JSON.stringify(shot.camera)}, ${JSON.stringify(shot.target)}, ${shot.fov ?? 65})`,
      );
      await g.warp({ seconds: 1 });
      console.log(`Still ${shot.name}: ${await g.still(shot.name)}`);
    }
    const still = await g.still('end');
    const fps = await g.fps();
    const health = g.healthErrors();
    if (fps <= 0) health.push('No completed game frames during the sample');
    console.log(`completed game frames/s: ${fps.toFixed(1)} (1s sample; not a GPU benchmark)`);
    reportGfxErrors([g]);
    for (const error of health) console.error(error);
    const observed = (await g.page.evaluate(() =>
      (window as unknown as { __observe: { read(): Observed } }).__observe.read(),
    )) as Observed;
    // The tab says goodbye: what it still holds goes out, and the server has written it.
    await g.page.evaluate(() => void window.dispatchEvent(new Event('pagehide')));
    await sleep(800);
    const files = fs.readdirSync(path.join(stack.dataDir!, 'playdata')).filter((f) => f.endsWith('.jsonl'));
    const biggest = files
      .map((f) => path.join(stack!.dataDir!, 'playdata', f))
      .sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0];
    if (!biggest) throw new Error('no playtest data reached the local server');
    fs.copyFileSync(biggest, path.join(dir, 'session.jsonl'));
    fs.writeFileSync(path.join(dir, 'bot.log'), botLog.join('\n'));
    fs.writeFileSync(
      path.join(dir, 'text.json'),
      JSON.stringify({ lines: observed.lines, painted: observed.painted }, null, 1),
    );
    observed.saves.forEach((st, k) => {
      const slug = st.beat
        .replace(/[^a-z0-9]+/gi, '-')
        .toLowerCase()
        .slice(0, 50);
      const file = `${String(k).padStart(2, '0')}-${slug}.json`;
      fs.writeFileSync(path.join(dir, 'saves', file), JSON.stringify({ ...st, room: ROOM, query, run: name }));
    });
    fs.writeFileSync(path.join(dir, 'bot.txt'), botLog.join('\n') + '\n');
    const session = onGameClock(parseSession(name, fs.readFileSync(biggest, 'utf8')));
    const lines = report(session, observed, w, botLog);
    const short = brief(session, observed, w, botLog, before);
    lines.push(
      '',
      `Saved in ${dir}`,
      `Still: ${still}`,
      `Saves: ${observed.saves.length} (npm run look -- --at "<beat>")`,
    );
    const text = lines.join('\n');
    console.log(has('--full') ? text : short.join('\n') + `\nFull report: ${path.join(dir, 'report.txt')}`);
    fs.writeFileSync(path.join(dir, 'report.txt'), text + '\n');
    const full = summarize(session, [], []);
    const perf = full.findIndex((l) => l.startsWith('Performance'));
    const end = full.findIndex((l, k) => k > perf && l === '');
    full.splice(perf, end - perf + 1); // meaningless at this speed
    fs.writeFileSync(path.join(dir, 'summary.txt'), full.join('\n') + '\n');
    const latest = path.join(OUT, 'latest');
    if (fs.existsSync(latest)) fs.unlinkSync(latest);
    fs.symlinkSync(name, latest);
    const missed = botLog.some((l) => /NEVER:/.test(l));
    const verdict = health.length ? 'health-failure' : missed ? 'beat-failure' : w.done ? 'pass' : w.reason;
    finishRun({
      verdict,
      from: rail.from,
      to: rail.to,
      wall: w.wall,
      game: w.game,
      timeoutAfterBeat: w.timeoutAfterBeat,
    });
    if (verdict !== 'pass') process.exitCode = 1;
  } catch (error) {
    const failure = {
      verdict: 'failure',
      from: rail.from,
      to: rail.to,
      error: String(error),
    };
    fs.appendFileSync(path.join(dir, 'report.txt'), `\nFAIL: ${String(error)}\n`);
    finishRun(failure);
    throw error;
  } finally {
    await browser?.close().catch(() => {});
    await stack?.close();
  }
}

await main().catch((e) => {
  console.error(e);
  if (runOpen()) finishRun({ verdict: 'failure', error: String(e) });
  process.exitCode = 1;
});
process.exit(process.exitCode || 0);
