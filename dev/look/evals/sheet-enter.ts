const frame = document.getElementById('sheet-opening') as HTMLIFrameElement;
const child = frame.contentWindow! as Window;
const before = child.boogle.prof!.last.frames;
// Leave the first sample on the trolley, then use the real card button.
setTimeout(() => (frame.contentDocument!.querySelector('#enter') as HTMLButtonElement).click(), 1000);
setTimeout(() => {
  if (!frame.contentDocument!.body.classList.contains('playing')) console.error('OPENING did not enter');
  if (frame.contentDocument!.body.classList.contains('fall-air')) console.error('OPENING did not land in time');
  if (child.boogle.prof!.last.frames <= before) console.error('OPENING child frames did not advance');
  console.log('OPENING route ' + child.location.search + ' body ' + frame.contentDocument!.body.className);
  console.log('OPENING captured first visit; inspect title, landing and stand-up in order');
}, 13500);
export {};
