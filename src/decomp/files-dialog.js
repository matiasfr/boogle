// The files dialog, for any character that needs files the player brings themselves (an engine build, their own copy
// of a game: docs/plans/decomp-characters.md). Drop a file on the page (anywhere works), pick one, or paste a link to
// your own copy (link.js); Esc, pad B or Not now closes it. The text comes from the caller:
//   openFilesDialog({ title, needs, ext, onFile })
//     title   the heading ('...rawr?')
//     needs   what is asked for, as a checklist: [{ label, done }]; filesDialogNeeds(needs) ticks it off
//     ext     accepted file extensions (['.wasm', '.z64'])
//     onFile  (file) for each dropped or picked file; filesDialogSays shows why it was refused, filesDialogAccepts
//             that everything is there
import './files-dialog.css';
import { openModal, closeModal } from '../player/modal.js';
import { directLink, fetchLinkedFile } from './link.js';

let dlg = null,
  note = null,
  list = null,
  handle = null;

const picker = document.createElement('input');
picker.type = 'file';
picker.addEventListener('change', () => picker.files[0] && handle?.(picker.files[0]));
function pick() {
  picker.value = '';
  picker.click();
}

function build() {
  dlg = document.createElement('dialog');
  dlg.className = 'files-dlg';
  dlg.innerHTML = `
    <div class="files-dim"></div>
    <div class="files-card">
      <h2 class="files-title"></h2>
      <p>Drag in, one at a time:</p>
      <ul class="files-needs"></ul>
      <div class="files-drop">Drop a file here</div>
      <form class="files-link" novalidate>
        <input type="url" placeholder="or paste a link to it" aria-label="Link to the file" autocomplete="off" />
        <button type="submit">Get</button>
      </form>
      <p class="files-note" hidden></p>
      <div class="files-actions">
        <button type="button" class="files-pick">Choose file</button>
        <button type="button" class="files-close">Not now</button>
      </div>
      <p class="files-small">They stay in this browser. Nothing is uploaded, and links aren't kept.</p>
    </div>`;
  note = dlg.querySelector('.files-note');
  list = dlg.querySelector('.files-needs');
  dlg.querySelector('.files-pick').addEventListener('click', pick);
  dlg.querySelector('.files-close').addEventListener('click', closeFilesDialog);
  const form = dlg.querySelector('.files-link');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    fromLink(form.elements[0]);
  });
  dlg.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeFilesDialog();
  });
  dlg.addEventListener('dragover', () => dlg.classList.add('files-over'));
  dlg.addEventListener('dragleave', () => dlg.classList.remove('files-over'));
  document.body.append(dlg);
}

export function filesDialogNeeds(needs) {
  if (!list) return;
  list.replaceChildren(
    ...needs.map(({ label, done }) => {
      const li = document.createElement('li');
      li.textContent = label;
      li.classList.toggle('done', !!done);
      return li;
    }),
  );
}

export function openFilesDialog({ title, needs, ext, onFile }) {
  if (!dlg) build();
  if (dlg.open || !openModal({ onKey, onPad })) return;
  handle = onFile;
  picker.accept = ext.join(',');
  dlg.querySelector('.files-title').textContent = title;
  filesDialogNeeds(needs);
  note.hidden = true;
  dlg.classList.remove('files-over');
  dlg.showModal();
}

export function closeFilesDialog() {
  if (!dlg?.open) return;
  dlg.close();
  closeModal();
}

export const filesDialogOpen = () => !!dlg?.open;

// Everything is there: the heading changes to `title`, then the dialog closes. Resolves once it has.
export function filesDialogAccepts(title) {
  if (!dlg?.open) return Promise.resolve();
  dlg.classList.remove('files-over');
  dlg.querySelector('.files-title').textContent = title;
  note.hidden = true;
  return new Promise((resolve) =>
    setTimeout(() => {
      closeFilesDialog();
      resolve();
    }, 900),
  );
}

// `text` under the checklist ('' hides it).
export function filesDialogSays(text) {
  if (!dlg?.open) return;
  dlg.classList.remove('files-over');
  note.textContent = text;
  note.hidden = !text;
}

async function fromLink(input) {
  const href = directLink(input.value);
  if (!href) return filesDialogSays("That doesn't look like a link.");
  filesDialogSays('Getting it...');
  const file = await fetchLinkedFile(href);
  if (!dlg.open) return;
  if (!file) return filesDialogSays("Couldn't get that link. Download the file and drop it in instead.");
  input.value = '';
  filesDialogSays('');
  handle?.(file);
}

function onKey(e) {
  if (e.target instanceof HTMLInputElement) {
    if (e.code === 'Escape') e.target.blur(); // typing in the link box: only Esc leaves it (Enter submits the form)
    return;
  }
  if (e.code === 'Escape') closeFilesDialog();
  else if (e.code === 'Enter' || e.code === 'Space') pick();
}

function onPad(slot) {
  if (slot === 'b') closeFilesDialog();
  else if (slot === 'a') pick();
}
