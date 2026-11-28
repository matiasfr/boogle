/** Each pull owns its remaining notes. A frame may catch up several notes after a stall. */
export function chimeCalls() {
  const calls: { time: number; from: string; beat: number }[] = [];
  return {
    pull(time: number, from: string) {
      calls.push({ time, from, beat: 0 });
    },
    harmonizes(time: number, from: string) {
      return calls.some((c) => c.from !== from && time - c.time < 3000);
    },
    update(time: number, note: (beat: number) => void) {
      for (let i = calls.length - 1; i >= 0; i--) {
        const c = calls[i]!;
        while (c.beat < 4 && time - c.time >= c.beat * 420) note(c.beat++);
        if (time - c.time >= 3000) calls.splice(i, 1);
      }
    },
  };
}
export function townAnswer() {
  let next = -Infinity,
    due = Infinity;
  return {
    call(now: number) {
      if (now < next || due !== Infinity) return;
      due = now + 800;
      next = now + 4000;
    },
    update(now: number) {
      if (now < due) return false;
      due = Infinity;
      return true;
    },
  };
}
