// What "Fill the kiln" says (owner, 14 November: "it says place stone or wood, when really it needs a specific amount
// of stone and wood"). The bill in the stations' own format on every prompt, what a press would add from your back,
// and a plain reason when nothing on it helps. Pure: the view passes the kiln's row and your account. Draft UI copy.

export type KilnPrompt = {
  /** The bill and progress, as the kiln's sign paints it; with what a press adds when it would add something. */
  note: string;
  /** Why a press does nothing; undefined when the press fills. */
  blocked?: string;
};

/** The kiln's bill line, shared with its sign: `logs 3/16  stone 0/16`. */
export const kilnBill = (logs: number, stone: number, needLogs: number, needStone: number) =>
  `logs ${Math.min(logs, needLogs)}/${needLogs}  stone ${Math.min(stone, needStone)}/${needStone}`;

export function kilnPrompt(
  kiln: { logs: number; stone: number },
  need: { logs: number; stone: number },
  back: { logs: number; stone: number; rails: number },
): KilnPrompt {
  const bill = kilnBill(kiln.logs, kiln.stone, need.logs, need.stone);
  const lackLogs = Math.max(0, need.logs - kiln.logs),
    lackStone = Math.max(0, need.stone - kiln.stone);
  const addLogs = Math.min(back.logs, lackLogs),
    addStone = Math.min(back.stone, lackStone);
  if (addLogs > 0 || addStone > 0) {
    const adds = [addLogs > 0 ? `${addLogs} logs` : '', addStone > 0 ? `${addStone} stone` : ''].filter(Boolean);
    return { note: `${bill} · adds ${adds.join(', ')}` };
  }
  if (!lackLogs && !lackStone) return { note: bill, blocked: 'The kiln is full' };
  const wants = lackLogs && lackStone ? 'logs and stone' : lackLogs ? 'logs' : 'stone';
  // Holding the half that is already full, then holding something it never takes, then an empty back.
  const blocked =
    back.logs > 0 && !lackLogs
      ? `Logs are full: bring ${wants}`
      : back.stone > 0 && !lackStone
        ? `Stone is full: bring ${wants}`
        : back.rails > 0
          ? `Takes ${wants}, not rails`
          : `Bring ${wants}`;
  return { note: bill, blocked };
}
