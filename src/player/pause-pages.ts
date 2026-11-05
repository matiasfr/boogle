// Optional Local pages share Pause's modal and navigation; features never import each other.
export type PausePage = {
  id: string;
  label: string;
  compact?: boolean;
  mount(parent: HTMLElement, resume: () => void): () => void;
  open?(): void;
};
export const pausePages: PausePage[] = [];
// Persistent local sections move into the main page whenever it is rebuilt.
export const pauseSections: HTMLElement[] = [];
export const pauseNavigation: { open?: (page: string) => boolean; close?: () => void } = {};
