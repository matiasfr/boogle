// Same-origin first visit, using the existing look eval route (as with asset-stage).
// Only the disposable harness profile is cleared. No save, staged pose or old proto=fall.
localStorage.removeItem('boogle.name');
localStorage.removeItem('boogle.lastVisit');
const frame = document.createElement('iframe');
frame.id = 'sheet-opening';
frame.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;border:0;z-index:2147483647';
frame.src = '/?proto=place&intro=1&dpr=fixed&room=sheet-opening-' + Date.now();
document.body.append(frame);
const deadline = performance.now() + 90000;
while (
  !frame.contentDocument?.querySelector('#enter:not([disabled])') ||
  frame.contentDocument.querySelector('.splash')
) {
  if (performance.now() > deadline) throw new Error('Opening never offered Jump in');
  await new Promise((resolve) => setTimeout(resolve, 100));
}
const child = frame.contentWindow! as Window;
child.addEventListener('error', (event) => console.error('OPENING child error: ' + event.message));
if (child.boogle?.gfx !== 'webgpu') throw new Error('Opening child is not WebGPU');
console.log('OPENING ready: fresh round 4 trolley card');
export {};
