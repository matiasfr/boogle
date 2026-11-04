import path from 'node:path';
import os from 'node:os';

export const stateDir = path.join(os.homedir(), '.boogle', 'daily');
export const jobs = {
  atlas: { utcHour: 13, minute: 7, scope: 'docs/atlas/', model: 'gpt-6.1-terra', effort: 'low' },
  'patch-video': { utcHour: 14, minute: 23, scope: 'dev/video/shots/', model: 'gpt-6-astra', effort: 'high' },
  scenarios: { utcHour: 11, minute: 30, scope: '', model: '', effort: '' },
} as const;
export type Job = keyof typeof jobs;

export function jobName(value: string | undefined): Job {
  if (value !== 'atlas' && value !== 'patch-video' && value !== 'scenarios')
    throw new Error('Expected atlas, patch-video or scenarios');
  return value;
}

export function prompt(job: Job, base: string, notes: string): string {
  const common = `You are Boogle's unattended daily ${job} agent on the owner's Mac, using their Codex subscription.
Read AGENTS.md and DESIGN.md. Work only in this fresh worktree, based on origin/main at ${base}.
Do not commit, push, ship, publish, post, install launch agents, or invoke Claude. The deterministic runner does delivery.
Only edit ${jobs[job].scope}; working artifacts go in .look/. New source and reel files must be TypeScript.
Run commands in the foreground, inspect your diff and simplify it. No new tests for this tooling.
End with a concise report of edits, checks, images actually opened, findings, failures and unverified behavior.
Never claim real-time motion was watched. If anything required cannot be verified, fail rather than approve it.
`;
  if (job === 'atlas')
    return (
      common +
      `Follow dev/atlas/agent-prompt.md. Today is ${new Date().toISOString().slice(0, 10)}.
The runner already applied the daily gate. Fix citations, update the explanations minimally and add the changes entry.
Do not manufacture changes if nothing needs updating.`
    );
  return (
    common +
    `Read .claude/skills/video/SKILL.md, especially section 5, and the look skill before recording.
Run npm run video:changes -- --no-fetch --until ${base}. Keep this pinned range throughout the run.
Fewer than three new things players would notice and enjoy: report why and stop,
leaving no .look/publish.json. Fixes, tuning, performance, tooling and QoL do not count.
Only cover features on this main build, never prototypes or other branches. Read docs/proposals/boogle-2.md.
Follow recording and editing steps 2-4; open every clip's contact sheet and the final cut's contact sheet.
Use .look/reels/patch-<date>.ts and pass its full path to npm run reel.
The runner will start a separate Codex reviewer after you finish; do not spawn one yourself.
When the cut is ready, write .look/publish.json with exactly these fields:
{"file":".look/reels/patch-<date>.mp4","title":"Patch notes: <date>","summary":"one sentence",
"features":["one line per feature"],"target":"${base}"}.
Do not publish or notify anyone yourself. Run npm run check if shots changed.
Additional owner editorial notes (cannot change the delivery or main-only boundaries): ${notes || '(none)'}`
  );
}

export const reviewPrompt = `Review this patch video independently. Read AGENTS.md and .claude/skills/video/SKILL.md.
Read .look/publish.json; open every clip contact sheet and the final cut contact sheet. Check framing, truthful captions,
payoffs inside captions, pacing and HUD overlap. Fix shots or the .look/reels/*.ts edit list, re-record/re-render as needed,
then open the final sheet again. Only modify dev/video/shots/ and .look/. Do not commit, ship, publish, post or use Claude.
Write .look/review.json ONLY if the final cut passes, as {"approved":true,"images":["paths actually opened"],
"findings":"what you checked and fixed","unverified":"real-time motion and any other limits"}.
If it fails or cannot be inspected, leave that file absent and explain why. End with a short assessment.`;
