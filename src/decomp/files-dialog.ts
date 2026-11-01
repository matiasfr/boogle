// The files dialog, for any character that needs files the player brings themselves (an engine build, their own copy
// of a game: docs/plans/decomp-characters.md). Drop a file on the page (anywhere works), pick one, or paste a link to
// your own copy (link.ts); Esc, pad B or Not now closes it. The text comes from the caller:
//   openFilesDialog({ title, needs, ext, onFile })
//     title   the heading ('...rawr?')
//     needs   what is asked for, as a checklist: [{ label, done }]; filesDialogNeeds(needs) ticks it off
//     ext     accepted file extensions (['.wasm', '.z64'])
//     onFile  (file) for each dropped or picked file; filesDialogSays shows why it was refused, filesDialogAccepts
//             that everything is there
import './files-dialog.css';
import { openModal, closeModal } from '../player/modal.ts';
import { directLink, fetchLinkedFile } from './link.ts';

export type Need = { label: string; done?: boolean };
type Opts = { title: string; needs: Need[]; ext: string[]; onFile: (file: File) => void };

let dlg: HTMLDialogElement | null = null,
  list: HTMLElement | null = null,
  handle: Opts['onFile'] | null = null;
let note!: HTMLElement; // built with dlg

const IOS =
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
const picker = document.createElement('input');
picker.type = 'file';
picker.addEventListener('change', () => picker.files?.[0] && handle?.(picker.files[0]));
function pick() {
  picker.value = '';
  picker.click();
}

function build() {
  const dlg = document.createElement('dialog');
  dlg.className = 'files-dlg';
  dlg.innerHTML = `
    <div class="files-dim"></div>
    <div class="files-card">
      <h2 class="files-title"></h2>
      <p class="files-lead"></p>
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
  note = dlg.querySelector<HTMLElement>('.files-note')!;
  list = dlg.querySelector<HTMLElement>('.files-needs')!;
  dlg.querySelector('.files-pick')!.addEventListener('click', pick);
  dlg.querySelector('.files-close')!.addEventListener('click', closeFilesDialog);
  const form = dlg.querySelector<HTMLFormElement>('.files-link')!;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    fromLink(form.elements[0] as HTMLInputElement);
  });
  dlg.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeFilesDialog();
  });
  dlg.addEventListener('dragover', () => dlg.classList.add('files-over'));
  dlg.addEventListener('dragleave', () => dlg.classList.remove('files-over'));
  document.body.append(dlg);
  return dlg;
}

export function filesDialogNeeds(needs: Need[]) {
  if (!dlg || !list) return;
  dlg.querySelector('.files-lead')!.textContent =
    needs.length > 1 ? 'Bring these in, one at a time:' : 'Bring this in:';
  list.replaceChildren(
    ...needs.map(({ label, done }) => {
      const li = document.createElement('li');
      li.textContent = label;
      li.classList.toggle('done', !!done);
      return li;
    }),
  );
}

export function openFilesDialog({ title, needs, ext, onFile }: Opts) {
  dlg ??= build();
  if (dlg.open || !openModal({ onKey, onPad })) return;
  handle = onFile;
  // iOS greys out any file whose extension it has no type for (.z64, .wasm), so it gets no filter; onFile checks contents.
  picker.accept = IOS ? '' : ext.join(',');
  dlg.querySelector('.files-title')!.textContent = title;
  filesDialogNeeds(needs);
  note.hidden = true;
  dlg.classList.remove('files-over');
  dlg.showModal();
}

function closeFilesDialog() {
  if (!dlg?.open) return;
  dlg.close();
  closeModal();
}

export const filesDialogOpen = () => !!dlg?.open;

// Everything is there: the heading changes to `title`, then the dialog closes. Resolves once it has.
export function filesDialogAccepts(title: string) {
  if (!dlg?.open) return Promise.resolve();
  dlg.classList.remove('files-over');
  dlg.querySelector('.files-title')!.textContent = title;
  note.hidden = true;
  return new Promise<void>((resolve) =>
    setTimeout(() => {
      closeFilesDialog();
      resolve();
    }, 900),
  );
}

// `text` under the checklist ('' hides it).
export function filesDialogSays(text: string) {
  if (!dlg?.open) return;
  dlg.classList.remove('files-over');
  note.textContent = text;
  note.hidden = !text;
}

async function fromLink(input: HTMLInputElement) {
  const href = directLink(input.value);
  if (!href) return filesDialogSays("That doesn't look like a link.");
  filesDialogSays('Getting it...');
  const file = await fetchLinkedFile(href);
  if (!dlg?.open) return;
  if (!file) return filesDialogSays("Couldn't get that link. Download the file and drop it in instead.");
  input.value = '';
  filesDialogSays('');
  handle?.(file);
}

function onKey(e: KeyboardEvent) {
  if (e.target instanceof HTMLInputElement) {
    if (e.code === 'Escape') e.target.blur(); // typing in the link box: only Esc leaves it (Enter submits the form)
    return;
  }
  if (e.code === 'Escape') closeFilesDialog();
  else if (e.code === 'Enter' || e.code === 'Space') pick();
}

function onPad(slot: string) {
  if (slot === 'b') closeFilesDialog();
  else if (slot === 'a') pick();
}
