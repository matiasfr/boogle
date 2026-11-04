// Optional Local pages share Pause's modal and navigation; features never import each other.
export type PausePage = {
  id: string;
  label: string;
  mount(parent: HTMLElement, resume: () => void): () => void;
};
export const pausePages: PausePage[] = [];
export const pauseNavigation: { open?: (page: string) => boolean; close?: () => void } = {};
