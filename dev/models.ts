// Which model and effort each kind of work uses: the single source of truth (docs/agents/models.md).
// `npm run models` prints the active table. Set `codexFrom` to switch modes.
import fs from 'node:fs';
import path from 'node:path';

export type Mode = 'normal' | 'withCodex';
export type Pick = { who: string; model: string; effort: string };
export type Route = { work: string; withCodex: Pick; normal: Pick };

/**
 * Normal mode is Claude only. withCodex gives Codex everything below Opus and saves Claude for Opus and Fable; it is
 * on from `codexFrom` (owner's local date) onward, and off when `codexFrom` is null.
 */
export const codexFrom: string | null = '2026-11-12';
export const codexWhy =
  'Codex allowance is back (owner, 12 November): Codex takes the work below Opus on Sol, and Astra the high-risk and review work';

const codex = (model: string, effort: string): Pick => ({ who: 'Codex (dev/codex/run.ts)', model, effort });
const claude = (who: string, model: string, effort: string): Pick => ({ who, model, effort });

export const routes: Route[] = [
  {
    work: 'Orchestration, review of returned work, owner conversation',
    withCodex: claude('main session', 'opus or fable', 'medium, or high for opus'),
    normal: claude('main session', 'opus or fable', 'medium, or high for opus'),
  },
  {
    work: 'Design review of a plan or brief with gameplay calls, before it is built',
    withCodex: claude('designer agent', 'fable', 'medium'),
    normal: claude('designer agent', 'fable', 'medium'),
  },
  {
    work: 'Planning complex work (docs/plans/<topic>.md)',
    withCodex: claude('planner agent', 'fable', 'medium'),
    normal: claude('planner agent', 'fable', 'medium'),
  },
  {
    work: 'Implementation of an approved plan (docs/plans/ or a written brief)',
    withCodex: codex('gpt-6.1-sol', 'medium'),
    normal: claude('implementer agent', 'sonnet', 'medium'),
  },
  {
    work: 'Player-visible implementation: views, cameras, effects, characters, prompts, feel, assets and look work',
    withCodex: claude('implementer agent, spawned with model fable', 'fable', 'medium'),
    normal: claude('implementer agent, spawned with model fable', 'fable', 'medium'),
  },
  {
    work: 'Visual review of a player-visible change before it ships (opens the stills and motion sheets; names what looks wrong)',
    withCodex: claude('a fresh general-purpose subagent that did not build it', 'fable', 'medium'),
    normal: claude('a fresh general-purpose subagent that did not build it', 'fable', 'medium'),
  },
  {
    work: 'Fixes, tooling and captures-driven tasks with no plan to follow',
    withCodex: codex('gpt-6.1-sol', 'high'),
    normal: claude('general-purpose subagent', 'opus', 'medium'),
  },
  {
    work: 'High-risk implementation (server, sync, src/world, src/net)',
    withCodex: codex('gpt-6-astra', 'high'),
    normal: claude('implementer agent, spawned with model opus', 'opus', 'medium'),
  },
  {
    work: 'Independent review before merge of src/sim, src/net, src/world, server/ or the wire format (a failing test per suspected defect)',
    withCodex: {
      who: "a fresh reviewer with none of the author's context: a Codex review job or a Claude general-purpose subagent",
      model: 'gpt-6-astra first, or fable or opus',
      effort: 'high for astra (xhigh for one unresolved question), medium for fable or opus',
    },
    normal: claude('a fresh general-purpose subagent that did not write the code', 'fable', 'medium'),
  },
  {
    work: 'Code review before shipping (/code-review, e.g. on src/net*, src/world/ or server/)',
    withCodex: {
      who: 'a Codex review job on the committed branch (node dev/codex/run.ts review), not the main session',
      model: 'gpt-6-astra',
      effort: 'high',
    },
    normal: claude('general-purpose subagent running /code-review medium, not the main session', 'opus', 'medium'),
  },
  {
    work: 'Runner: owed proofs on a built branch (rebase, bot runs, stills, tick marks); reports failures, changes no design or game code',
    withCodex: codex('gpt-6.1-sol', 'medium'),
    normal: claude('general-purpose subagent', 'sonnet', 'medium'),
  },
  {
    work: 'Hardest design, research or second-opinion review',
    withCodex: codex('gpt-6-astra', 'xhigh'),
    normal: claude('general-purpose subagent', 'fable', 'medium'),
  },
  {
    work: 'Search, file finding, log reading and summaries (the Explore agent; mistakes are cheap to spot)',
    withCodex: claude('Explore agent', 'haiku', 'medium'),
    normal: claude('Explore agent', 'haiku', 'medium'),
  },
  {
    work: 'Quick, easy, mechanical jobs',
    withCodex: codex('gpt-6.1-sol', 'medium'),
    normal: claude('general-purpose subagent', 'sonnet', 'medium'),
  },
  {
    work: 'Brainstorm (light: one agent, three lenses; --panel: three panelists)',
    withCodex: codex('gpt-6.1-sol', 'high'),
    normal: claude('one general-purpose subagent (light), or three with the role files (--panel)', 'fable', 'medium'),
  },
  {
    work: 'Images and previz (only Codex paints)',
    withCodex: codex('gpt-6.1-sol', 'medium'),
    normal: {
      who: 'Codex, tried anyway (at a limit, wait and tell the owner)',
      model: 'gpt-6.1-sol',
      effort: 'medium',
    },
  },
];

/**
 * Opus runs at medium; raise one task to high only when it hits bugs medium can't fix or medium falls short (owner,
 * 9 November). Before raising, check the task can verify its own work (docs/agents/models.md, "Escalating").
 */
export const opusEscalation = 'high';

/** Fable never runs above this effort, on any route or at spawn (owner, 10 November; docs/agents/models.md). */
export const fableTopEffort = 'high';

/** Frontmatter of .claude/agents/*.md must match these (test/models.test.ts). */
export const agents: Record<string, { model: string; effort: string }> = {
  planner: { model: 'fable', effort: 'medium' },
  implementer: { model: 'sonnet', effort: 'medium' },
  designer: { model: 'fable', effort: 'medium' },
  Explore: { model: 'haiku', effort: 'medium' },
};

/** Default Codex model for dev/codex/run.ts. */
export const codexDefault = 'gpt-6.1-sol';

function localDate(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function activeMode(now = new Date(), from = codexFrom): Mode {
  return from && localDate(now) >= from ? 'withCodex' : 'normal';
}

/** Codex modes still allowed in normal (Claude-only) mode. */
export const codexInNormal = ['previz'];

export function table(mode: Mode): string {
  const cell = (p: Pick) => `${p.who}: ${p.model} ${p.effort}`;
  const rows = routes.map((r) => `| ${r.work} | ${cell(r[mode])} |`);
  return ['| Work | Who: model effort |', '| --- | --- |', ...rows].join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fs.realpathSync(new URL(import.meta.url))) {
  const mode = activeMode();
  const note =
    mode === 'normal' ? ` (Claude only${codexFrom ? `; withCodex from ${codexFrom}: ${codexWhy}` : ''})` : '';
  console.log(`Mode: ${mode}${note}\n\n${table(mode)}`);
}
