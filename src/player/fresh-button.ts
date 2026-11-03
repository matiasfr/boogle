// The same confirmed local restart on the pause menu and its You page.
import { freshStart, startFresh } from './arrival.ts';

export function freshButton(): HTMLElement[] {
  const fresh = document.createElement('button');
  fresh.type = 'button';
  fresh.className = 'pause-btn pause-fresh';
  fresh.dataset.act = 'fresh';
  fresh.textContent = 'Start fresh';
  const warn = document.createElement('p');
  warn.className = 'pause-fresh-warn';
  warn.textContent = freshStart.warning;
  warn.hidden = true;
  let until = 0;
  fresh.addEventListener('click', () => {
    if (performance.now() < until) return startFresh();
    until = performance.now() + 6000;
    fresh.textContent = 'Yes, start fresh';
    fresh.classList.add('sure');
    warn.hidden = false;
    setTimeout(() => {
      until = 0;
      fresh.textContent = 'Start fresh';
      fresh.classList.remove('sure');
      warn.hidden = true;
    }, 6000);
  });
  return [fresh, warn];
}
