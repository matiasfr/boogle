// npm run look -- --rail-seed fares-running --eval dev/look/evals/first-town-riders.ts --query riderShot=walk --until window.__placeDone --action dev/look/evals/first-town-walk.ts --video --seconds 4
// Start only after capture warm-up, so the recorded frames contain the deck-length walk.
(window as Window & { __startDeckWalk?: boolean }).__startDeckWalk = true;
export {};
