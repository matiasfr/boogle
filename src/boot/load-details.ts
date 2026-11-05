// The splash and Pause use the same retained marks, view and copy payload. No recorder or polling loop.
import type { bootTimeline, onBootMark } from './timeline.ts';
import { loadStatus } from './load-status.ts';

export function loadDetails(parent: HTMLElement, read: typeof bootTimeline, subscribe: typeof onBootMark) {
  const details = document.createElement('details');
  details.className = 'load-details';
  details.innerHTML =
    '<summary>Load details</summary><p>Times in ms since navigation</p><pre></pre><button type="button">Copy last load</button><span role="status"></span>';
  const text = details.querySelector('pre')!;
  const button = details.querySelector('button')!;
  const status = details.querySelector('span')!;
  let record = '';
  function update() {
    if (!details.open) return;
    const timeline = read();
    const groups = loadStatus(timeline.marks);
    record = JSON.stringify({ groups, ...timeline }, null, 2);
    text.textContent =
      groups.map((g) => `${g.name}: ${g.state}`).join('\n') +
      '\n\n' +
      timeline.marks.map((m) => `${m.name}: ${m.t}`).join('\n');
  }
  try {
    details.open = localStorage.getItem('boogle.loadDetails') === '1';
  } catch {
    /* optional preference */
  }
  details.addEventListener('toggle', () => {
    try {
      localStorage.setItem('boogle.loadDetails', details.open ? '1' : '0');
    } catch {
      /* optional preference */
    }
    update();
  });
  button.addEventListener('click', () => {
    void navigator.clipboard?.writeText(record).then(
      () => {
        status.textContent = 'Load copied';
      },
      () => {
        text.textContent = record;
        status.textContent = 'Select the record to copy';
      },
    );
    if (!navigator.clipboard) {
      text.textContent = record;
      status.textContent = 'Select the record to copy';
    }
  });
  parent.append(details);
  update();
  return subscribe(update);
}
