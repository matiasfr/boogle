// The ROM dialog: talking to Yoshi before this browser has a Super Mario 64 ROM opens it. Drop the ROM on the page
// (anywhere works) or pick the file; Esc, pad B or Not now closes it.
import { openModal, closeModal } from '../player/modal.js';

let dlg = null,
  note = null,
  handle = null;

const picker = document.createElement('input');
picker.type = 'file';
picker.accept = '.z64,.n64,.v64';
picker.addEventListener('change', () => picker.files[0] && handle?.(picker.files[0]));
function pick() {
  picker.value = '';
  picker.click();
}

function build() {
  dlg = document.createElement('dialog');
  dlg.className = 'rom-dlg';
  dlg.innerHTML = `
    <div class="rom-dim"></div>
    <div class="rom-card">
      <h2 class="rom-title"></h2>
      <p>Drag in your Super Mario 64 (USA) ROM.</p>
      <div class="rom-drop">Drop the .z64 here</div>
      <p class="rom-note" hidden></p>
      <div class="rom-actions">
        <button type="button" class="rom-pick">Choose ROM</button>
        <button type="button" class="rom-close">Not now</button>
      </div>
      <p class="rom-small">It stays in this browser. Nothing is uploaded.</p>
    </div>`;
  note = dlg.querySelector('.rom-note');
  dlg.querySelector('.rom-pick').addEventListener('click', pick);
  dlg.querySelector('.rom-close').addEventListener('click', closeRomDialog);
  dlg.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeRomDialog();
  });
  dlg.addEventListener('dragover', () => dlg.classList.add('rom-over'));
  dlg.addEventListener('dragleave', () => dlg.classList.remove('rom-over'));
  document.body.append(dlg);
}

// handleFile(file) gets the dropped or picked file; romDialogSays shows why it was refused.
export function openRomDialog(handleFile) {
  if (!dlg) build();
  if (dlg.open || !openModal({ onKey, onPad })) return;
  handle = handleFile;
  dlg.querySelector('.rom-title').textContent = '...Yoshi?';
  note.hidden = true;
  dlg.classList.remove('rom-over');
  dlg.showModal();
}

export function closeRomDialog() {
  if (!dlg?.open) return;
  dlg.close();
  closeModal();
}

export const romDialogOpen = () => !!dlg?.open;

// A good ROM: Yoshi brightens up, then the dialog closes. Resolves once it has.
export function romDialogAccepts() {
  if (!dlg?.open) return Promise.resolve();
  dlg.classList.remove('rom-over');
  dlg.querySelector('.rom-title').textContent = 'Yoshi!';
  note.hidden = true;
  return new Promise((resolve) =>
    setTimeout(() => {
      closeRomDialog();
      resolve();
    }, 900),
  );
}

export function romDialogSays(text) {
  if (!dlg?.open) return;
  dlg.classList.remove('rom-over');
  note.textContent = text;
  note.hidden = false;
}

function onKey(e) {
  if (e.code === 'Escape') closeRomDialog();
  else if (e.code === 'Enter' || e.code === 'Space') pick();
}

function onPad(slot) {
  if (slot === 'b') closeRomDialog();
  else if (slot === 'a') pick();
}
