// The action half of dev/look/evals/place.ts: sets off the moment a shot has staged, after warm-up, for the motion sheet or
// the video: npm run look -- --eval dev/look/evals/place.ts --action dev/look/evals/place-act.ts --seconds 4
(window as unknown as { __placeAct?: () => unknown }).__placeAct?.();
export {};
