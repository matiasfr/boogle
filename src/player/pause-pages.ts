// Optional Local pages share Pause's modal and navigation; features never import each other.
export type PausePage = {
  id: string;
  label: string;
  compact?: boolean;
  /** Pause opens on this page while it says yes (the wardrobe's You, once you own a wearable); Options is the other
   * way in. A start page isn't listed under More. */
  start?(): boolean;
  mount(parent: HTMLElement, resume: () => void): () => void;
  open?(): void;
};
export const pausePages: PausePage[] = [
  {
    id: 'graphics',
    label: 'Graphics',
    mount(parent, resume) {
      let disposed = false;
      let cleanup = () => {};
      parent.textContent = 'Loading graphics…';
      void import('./graphics-page.ts')
        .then(({ mountGraphics }) => {
          if (!disposed) cleanup = mountGraphics(parent, resume);
        })
        .catch(() => {
          if (disposed) return;
          parent.textContent = 'Graphics could not load. Go back and try again.';
          const back = document.createElement('button');
          back.className = 'pause-btn';
          back.textContent = 'Back';
          back.onclick = () => {
            pauseNavigation.open?.('options');
          };
          parent.append(back);
          back.focus();
        });
      return () => {
        disposed = true;
        cleanup();
      };
    },
  },
];
// Persistent local sections move into the main page whenever it is rebuilt.
export const pauseSections: HTMLElement[] = [];
export const pauseNavigation: { open?: (page: string) => boolean; close?: () => void } = {};
/** The page Pause opens on instead of Options, or undefined: today's main list. Never "the last page used". */
export const startPage = (pages: readonly Pick<PausePage, 'id' | 'start'>[] = pausePages) =>
  pages.find((entry) => entry.start?.() === true);
