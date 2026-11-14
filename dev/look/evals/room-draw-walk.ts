// npm run look -- --eval dev/look/evals/room-draw.ts --action dev/look/evals/room-draw-walk.ts --query 'drawcam=follow&drawfrom=16' --seconds 6 --name room-draw-walk --wall 600
// The --action half of room-draw.ts (drawcam=follow): start the walk in, and return so the sheet samples it.
void (window as unknown as { __roomWalk?: () => Promise<void> }).__roomWalk?.();
export {};
