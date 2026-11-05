// Optional Local pages share Pause's modal and navigation; features never import each other.
export type PausePage = {
  id: string;
  label: string;
  compact?: boolean;
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
            pauseNavigation.open?.('main');
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
