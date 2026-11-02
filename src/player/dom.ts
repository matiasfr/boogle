// Elements of index.html, always there.
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
export const dom = {
  lobbyEl: $('lobby'),
  joinForm: $<HTMLFormElement>('join'),
  nameInput: $<HTMLInputElement>('name-input'),
  swatchesEl: $('swatches'),
  enterBtn: $<HTMLButtonElement>('enter'),
  rosterEl: $('roster'),
  netEl: $('net'),
  netLabel: $('net-label'),
  hintEl: $('hint'),
  chargeEl: $('charge'),
  chargeFill: $('charge-fill'),
  grabBtn: $('btn-grab'),
  jumpBtn: $('btn-jump'),
  touchEl: $('touch'),
  stickEl: $('stick'),
  knobEl: $('knob'),
};
