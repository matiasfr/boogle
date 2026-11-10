// One banner for the railway's big moments, in Place's banner style (src/proto/place/celebrate.ts, showBanner): a big
// line and an optional small one, high on the screen for a few seconds. Local and cosmetic; inside .hud.
import './moment-banner.css';

let banner: HTMLElement | null = null;
let timer = 0;
export function showMomentBanner(title: string, line = '', seconds = 3.4) {
  if (!banner) {
    banner = document.createElement('div');
    banner.className = 'moment-banner';
    banner.setAttribute('role', 'status');
    banner.append(document.createElement('b'), document.createElement('span'));
    (document.querySelector('.hud') ?? document.body).append(banner);
  }
  banner.children[0]!.textContent = title;
  banner.children[1]!.textContent = line;
  banner.classList.remove('on');
  void banner.offsetWidth; // so the animation runs again
  banner.classList.add('on');
  clearTimeout(timer);
  timer = window.setTimeout(() => banner?.classList.remove('on'), seconds * 1000);
}
/** The banner's text while it shows, else null (for inspect). */
export const momentBanner = () => (banner?.classList.contains('on') ? banner.textContent : null);
