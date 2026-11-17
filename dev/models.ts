// Which model and effort each kind of work uses: the single source of truth (docs/agents/models.md).
// `npm run models` prints the table. One table, no modes: the owner edits a row when the mix should change
// (owner, 15 November: "just have one schema for model routing that I will update when we need to").
import fs from 'node:fs';
import path from 'node:path';

export type Route = { work: string; who: string; model: string; effort: string };

const codex = (work: string, model: string, effort: string): Route => ({
  work,
  who: 'Codex (T3 delegate_task)',
  model,
  effort,
});
const claude = (work: string, who: string, model: string, effort: string): Route => ({ work, who, model, effort });

export const routes: Route[] = [
  claude('Orchestration, review of returned work, owner conversation', 'main session', 'opus', 'medium or high'),
  claude(
    "The hourly heartbeat, the unattended orchestrator run with its workflow review (the orchestrate skill's section 9)",
    'the heartbeat thread (a T3 scheduled task; its model is set in that thread)',
    'fable',
    'medium',
  ),
  claude(
    'Design review of a plan or brief with gameplay calls, before it is built (the design-review skill)',
    "the plan's or brief's author, in the same context; no separate agent",
    "the author's model",
    "at the author's effort",
  ),
  claude(
    'Planning high-risk work (src/sim, src/net, src/world, server/, the wire format) or a plan the owner asks for (docs/plans/<topic>.md), with its design review',
    'planner agent (fable medium only for extremely complex work)',
    'opus',
    'high',
  ),
  codex(
    'Implementation from a brief or an approved plan; the builder writes its own short plan first and revises it as it builds (the build skill)',
    'gpt-6.2-sol',
    'medium',
  ),
  codex(
    'Player-visible implementation: views, cameras, effects, characters, prompts, feel, assets and look work',
    'gpt-6.2-astra',
    'high',
  ),
  claude(
    'Visual review of a player-visible change before it ships (opens the stills and motion sheets; names what looks wrong)',
    'main session (opens the stills itself)',
    'opus',
    'medium or high',
  ),
  codex('Fixes, tooling and captures-driven tasks with no plan to follow', 'gpt-6.2-sol', 'high'),
  codex(
    'High-risk implementation (server, sync, src/world, src/net)',
    'gpt-6.2-astra',
    'high (medium may be tried as a first pass; check the result)',
  ),
  {
    work: 'Independent review before merge of src/sim, src/net, src/world, server/ or the wire format (a failing test per suspected defect)',
    who: "a fresh reviewer with none of the author's context: a fresh Codex review delegate or a Claude delegate (T3 delegate_task)",
    model: 'gpt-6.2-astra first, or opus',
    effort: 'high for astra (medium may be tried as a first pass; xhigh for one unresolved question), medium for opus',
  },
  {
    work: 'Code review before shipping (e.g. on src/net*, src/world/ or server/)',
    who: 'a fresh Codex review delegate on the committed branch (T3 delegate_task), not the main session',
    model: 'gpt-6.2-astra',
    effort: 'high (medium may be tried as a first pass; check the result)',
  },
  {
    work: 'Owed proofs on a built branch (rebase, bot runs, stills, tick marks)',
    who: "the builder's own thread (T3 t3_thread_send); a fresh runner delegate only when that thread is gone, and it reports failures and changes no design or game code",
    model: "the builder's model, or gpt-6.2-sol for a fresh runner",
    effort: "at the builder's effort, or medium",
  },
  codex('Hardest design, research or second-opinion review', 'gpt-6.2-astra', 'xhigh'),
  claude(
    'Search, file finding, log reading and summaries (the Explore agent; mistakes are cheap to spot)',
    'Explore agent',
    'haiku',
    'medium',
  ),
  claude(
    'Small fixes and mechanical edits: about 3 files or 150 lines at most, nothing `npm run review-stamp` marks `review`',
    'the session that found it; no delegate',
    'its own model',
    'at its own effort',
  ),
  codex('Mechanical jobs above that size', 'gpt-6.2-sol', 'medium'),
  codex('Brainstorm (light: one agent, three lenses; --panel: three panelists)', 'gpt-6.2-sol', 'high'),
  codex('Images and previz (only Codex paints)', 'gpt-6.2-sol', 'medium'),
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
  planner: { model: 'opus', effort: 'high' },
  Explore: { model: 'haiku', effort: 'medium' },
};

/** Default Codex model for dev/codex/run.ts. */
export const codexDefault = 'gpt-6.2-sol';

export function table(): string {
  const rows = routes.map((r) => `| ${r.work} | ${r.who}: ${r.model} ${r.effort} |`);
  return ['| Work | Who: model effort |', '| --- | --- |', ...rows].join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fs.realpathSync(new URL(import.meta.url))) {
  console.log(table());
}
