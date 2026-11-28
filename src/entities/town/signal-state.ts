import { townAnswer } from './signal-timing.ts';
const answers = new Map<number, ReturnType<typeof townAnswer>>();
export function answerFor(slot: number) {
  let answer = answers.get(slot);
  if (!answer) {
    answer = townAnswer();
    answers.set(slot, answer);
  }
  return answer;
}
/** The room excludes the sender from cosmetic relays. These listeners hear this client's own actions. */
export const localTownPulls = new Set<(slot: number) => void>();
export const townHonks = new Set<(from: string, now: number) => void>();
