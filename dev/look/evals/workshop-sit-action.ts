// npm run look -- --rail-seed q1-done --eval dev/look/evals/workshop-chair.ts --query 'chair=front&sit=3' \
//   --until window.__chairDone --action dev/look/evals/workshop-sit-action.ts --video --seconds 6 --name sit-stand
// The --action for workshop-chair.ts's `&sit=3` (stood at the stool's exit spot, nothing pressed): sit on the press,
// hold 2.5 s, stand on the press, so a --video shows sitting down and standing up at real speed.
const press = () => {
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true }));
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', bubbles: true }));
};
setTimeout(press, 800);
setTimeout(press, 3300);
export {};
