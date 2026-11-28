import type { OwnedView } from '../../render/owned-view.ts';
import { onHonk } from '../../features/honk.ts';
import { conversation } from '../../player/conversation.ts';
import { answerFor } from './signal-state.ts';

export function townGreeting(
  owner: OwnedView,
  slot: number,
  at: { x: number; z: number },
  built: () => boolean,
  reply: () => void,
) {
  const answer = answerFor(slot);
  owner.cleanup(
    onHonk((p) => {
      if (built() && !conversation.open && Math.hypot(p.x - at.x, p.z - at.z) <= 260)
        answer.call(performance.now(), true);
    }),
  );
  owner.cleanup(() => answer.cancel(true));
  return (now: number) => {
    if (built() && answer.update(now, true) && !conversation.open) reply();
  };
}
