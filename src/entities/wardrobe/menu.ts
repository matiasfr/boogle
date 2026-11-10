// The You page of the pause view (src/features/pause.ts, through src/player/pause-pages.ts): dress Buddy from the menu.
// One row for each slot (hat, accessory, outfit, pet) and your colour: left and right step through what you own, applied
// at once and shown on you and to your partners (the wardrobe's own `wardrobe` and `stowaway` presence). The pips under a
// value count the slot's catalog: filled for what you own (the worn one larger), hollow for what you don't: no names.
// Pause opens here from your first wearable on. Local DOM over ./state.ts; no wire, op or save of its own.
import './menu.css';
import type { PausePage } from '../../player/pause-pages.ts';
import { pauseNavigation } from '../../player/pause-pages.ts';
import { colourSwatches } from '../../player/you-editor.ts';
import { inputKind, padGlyph } from '../../player/glyphs.ts';
import { WORN_SLOTS, type WardrobeApi, type WardrobeCatalog, type WornSlot } from './state.ts';
import type { createMirror } from './mirror.ts';

// Draft copy for the owner (docs/brainstorms/pause-wardrobe.md); none of it The Boogler's.
const LABEL: Record<WornSlot, string> = { hat: 'Hat', accessory: 'Accessory', outfit: 'Outfit', pet: 'Pet' };
const NOTHING = 'Nothing';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

export function createWardrobePage(
  wardrobe: WardrobeApi,
  catalog: WardrobeCatalog,
  mirror: ReturnType<typeof createMirror>,
): PausePage {
  const nameOf = (id: string | null) => catalog.items.find((g) => g.id === id)?.name ?? NOTHING;

  return {
    id: 'you',
    label: 'You',
    start: () => wardrobe.ownsWearable(),
    mount(parent, resume) {
      const page = el('div', 'you');
      const paint: (() => void)[] = [];

      const resumeBtn = el('button', 'pause-btn primary you-resume', 'Resume');
      resumeBtn.type = 'button';
      resumeBtn.dataset.act = 'resume';
      resumeBtn.addEventListener('click', resume);
      page.append(resumeBtn);

      for (const slot of WORN_SLOTS) {
        const row = el('div', 'you-row');
        row.dataset.cycle = slot;
        row.dataset.slot = slot;
        const label = el('span', 'you-label', LABEL[slot]);
        label.id = `you-${slot}-label`;
        const step = (dir: 1 | -1) => {
          wardrobe.cycleSlot(slot, dir);
          mirror.changed();
        };
        const arrow = (dir: 1 | -1) => {
          const b = el('button', 'pause-btn you-step', dir < 0 ? '‹' : '›');
          b.type = 'button';
          b.dataset.nostop = '';
          b.tabIndex = -1;
          b.setAttribute('aria-label', `${dir < 0 ? 'Previous' : 'Next'} ${LABEL[slot].toLowerCase()}`);
          b.addEventListener('click', () => step(dir));
          return b;
        };
        const value = el('button', 'pause-btn you-val');
        value.type = 'button';
        value.dataset.slot = slot;
        const name = el('span', 'you-name');
        name.id = `you-${slot}-name`;
        name.setAttribute('aria-live', 'polite');
        const pips = el('span', 'you-pips');
        pips.setAttribute('aria-hidden', 'true');
        value.append(name, pips);
        value.setAttribute('aria-labelledby', `${label.id} ${name.id}`);
        value.addEventListener('click', () => step(1));
        row.addEventListener('cycle', (e) => step((e as CustomEvent<number>).detail < 0 ? -1 : 1));
        row.append(label, arrow(-1), value, arrow(1));
        page.append(row);

        paint.push(() => {
          const here = wardrobe.current(slot);
          name.textContent = nameOf(here);
          const all = catalog.items.filter((g) => g.slot === slot);
          const own = all.filter((g) => wardrobe.isOwned(g.id));
          const pip = (cls: string) => el('i', `you-pip ${cls}`);
          const marks = own.map((g) => pip(g.id === here ? 'on worn' : 'on'));
          const hollow = Array.from({ length: all.length - own.length }, () => pip('off'));
          hollow[0]?.classList.add('gap');
          pips.replaceChildren(...marks, ...hollow);
        });
      }

      const colour = el('div', 'you-row you-colour');
      const swatches = colourSwatches(() => mirror.changed());
      colour.append(el('span', 'you-label', 'Colour'), swatches.el);
      page.append(colour);

      const options = el('button', 'pause-btn you-options');
      options.type = 'button';
      options.dataset.act = 'options';
      options.append(el('span', '', 'Options'));
      if (inputKind() === 'pad') {
        const rb = el('span', 'you-glyph');
        rb.innerHTML = padGlyph('rb');
        options.append(rb);
      }
      options.addEventListener('click', () => pauseNavigation.open?.('options'));
      page.append(options);
      parent.append(page);

      const redraw = () => {
        for (const fn of paint) fn();
      };
      redraw();
      // A reveal can finish behind the pane: the rows follow whatever changes the wardrobe.
      const unsubscribe = wardrobe.onWardrobe(redraw);
      mirror.open(() => document.querySelector('.pause-card')?.getBoundingClientRect() ?? null);
      return () => {
        mirror.close();
        unsubscribe();
        page.remove();
      };
    },
  };
}
