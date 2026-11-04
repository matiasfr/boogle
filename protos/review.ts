import './review.css';
import type { ReviewAck, ReviewCard, ReviewSide, ReviewSubmission, ReviewVerdict } from './review-types.ts';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '') => {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
};
export async function showReview(id: string) {
  document.title = 'Boogle review';
  document.body.className = 'review-page';
  const main = el('main');
  main.id = 'review-card';
  document.body.replaceChildren(main);
  const status = el('p', 'Loading review…');
  status.id = 'review-status';
  status.setAttribute('role', 'status');
  main.append(status);
  try {
    let server = import.meta.env.VITE_BOOGLE_SERVER as string | undefined;
    const override = new URLSearchParams(location.search).get('reviewServer');
    if (import.meta.env.DEV && override) {
      const url = new URL(override);
      if (
        url.protocol === 'http:' &&
        ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) &&
        !url.username &&
        !url.password
      )
        server = url.origin;
    }
    if (!server) throw new Error('Review service is not configured.');
    if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error('Invalid review link.');
    const response = await fetch(new URL(`/reviews/${id}`, server), { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`Review unavailable (${response.status}).`);
    const card = (await response.json()) as ReviewCard;
    if (card.version !== 1 || card.id !== id || !card.evidence?.before || !card.evidence.after)
      throw new Error('This review format is unavailable.');
    const { acknowledgeReport } = await import('./report-transport.ts');
    const key = `boogle-review-v1:${new URL(server).origin}:${id}`;
    let draft: ReviewSubmission = {
      kind: 'review-v1',
      reviewId: id,
      submissionId: crypto.randomUUID(),
      verdict: 'cant',
    };
    let received = false;
    let storageOkay = true;
    try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null');
      if (
        saved?.submission?.reviewId === id &&
        saved.submission.kind === 'review-v1' &&
        typeof saved.submission.submissionId === 'string'
      ) {
        draft = saved.submission;
        received = saved.received === true;
      }
    } catch {
      storageOkay = false;
    }
    const persist = () => {
      try {
        localStorage.setItem(key, JSON.stringify({ submission: draft, received }));
      } catch {
        storageOkay = false;
      }
    };
    const state = (message = '') => {
      status.textContent = `${received ? 'Received' : 'Pending'}${message ? ' · ' + message : ''}${storageOkay ? '' : ' · Local draft could not be saved; download a copy.'}`;
      status.dataset.state = received ? 'received' : 'pending';
    };
    const changed = () => {
      draft = { ...draft, submissionId: crypto.randomUUID() };
      received = false;
      persist();
      state('Not sent yet');
    };
    const heading = el('h1', card.question);
    const change = el('p', card.change);
    change.className = 'review-change';
    main.prepend(el('p', 'INTERNAL REVIEW'), heading, change);
    const compare = el('div');
    compare.className = 'review-compare';
    const pins = new Map<ReviewSide, HTMLElement>();
    const drawPin = () => {
      for (const [side, marker] of pins) {
        marker.hidden = draft.pin?.image !== side;
        if (draft.pin?.image === side) {
          marker.style.left = `${draft.pin.x * 100}%`;
          marker.style.top = `${draft.pin.y * 100}%`;
        }
      }
    };
    const note = el('textarea');
    note.id = 'review-note';
    note.maxLength = 2000;
    note.rows = 2;
    note.value = draft.pin?.text || '';
    note.placeholder = 'Tap an image, then leave a note at that point';
    for (const side of ['before', 'after'] as const) {
      const figure = el('figure');
      figure.append(el('figcaption', side === 'before' ? 'Before' : 'After'));
      const surface = el('button');
      surface.type = 'button';
      surface.className = 'review-image';
      surface.dataset.image = side;
      surface.setAttribute('aria-label', `Pin a note on ${side}; Enter places a center pin`);
      const img = el('img');
      img.src = new URL(card.evidence[side].url, server).href;
      img.alt = `${side === 'before' ? 'Before' : 'After'} comparison`;
      const marker = el('span', '1');
      marker.className = 'review-pin';
      marker.setAttribute('aria-hidden', 'true');
      pins.set(side, marker);
      surface.append(img, marker);
      surface.addEventListener('click', (event) => {
        const bounds = img.getBoundingClientRect();
        const clamp = (n: number) => Math.max(0, Math.min(1, n));
        draft.pin = {
          image: side,
          x: event.detail ? clamp((event.clientX - bounds.left) / bounds.width) : 0.5,
          y: event.detail ? clamp((event.clientY - bounds.top) / bounds.height) : 0.5,
          text: note.value,
        };
        changed();
        drawPin();
        note.focus({ preventScroll: true });
      });
      figure.append(surface);
      compare.append(figure);
    }
    main.append(compare);
    const noteLabel = el('label', 'Pinned note');
    noteLabel.htmlFor = note.id;
    main.append(noteLabel, note);
    note.addEventListener('input', () => {
      if (!draft.pin) draft.pin = { image: 'after', x: 0.5, y: 0.5, text: '' };
      draft.pin.text = note.value;
      changed();
      drawPin();
    });
    const controls = el('div');
    controls.className = 'review-controls';
    const buttons: HTMLButtonElement[] = [];
    let busy = false;
    const send = async () => {
      if (busy) return;
      if (draft.pin && !draft.pin.text.trim()) {
        state('Add text to the pin before sending');
        note.focus();
        return;
      }
      persist();
      const sent = structuredClone(draft);
      busy = true;
      buttons.forEach((button) => (button.disabled = true));
      received = false;
      state('Sending…');
      try {
        const ack = (await acknowledgeReport(server!, sent)) as Partial<ReviewAck> | null;
        if (
          ack?.status !== 'received' ||
          ack.reviewId !== id ||
          ack.submissionId !== sent.submissionId ||
          typeof ack.at !== 'string'
        )
          throw new Error('No matching receipt; retry safely.');
        if (draft.submissionId === sent.submissionId) {
          received = true;
          persist();
          state(ack.duplicate ? 'Already received; no duplicate' : 'Note stored by the server');
        }
      } catch (error) {
        if (draft.submissionId === sent.submissionId)
          state(error instanceof Error ? error.message : 'Retry when connected');
      } finally {
        busy = false;
        buttons.forEach((button) => (button.disabled = false));
      }
    };
    for (const [value, label] of [
      ['accept', 'Accept'],
      ['changes', 'Changes'],
      ['cant', "Can't tell"],
    ] as const) {
      const button = el('button', label);
      button.type = 'button';
      button.dataset.verdict = value;
      button.setAttribute('aria-pressed', String(draft.verdict === value));
      button.addEventListener('click', () => {
        if (draft.verdict !== value) {
          draft.verdict = value as ReviewVerdict;
          changed();
        }
        for (const choice of buttons)
          if (choice.dataset.verdict)
            choice.setAttribute('aria-pressed', String(choice.dataset.verdict === draft.verdict));
        void send();
      });
      buttons.push(button);
      controls.append(button);
    }
    const retry = el('button', 'Retry / resend');
    retry.id = 'review-retry';
    retry.type = 'button';
    retry.addEventListener('click', () => void send());
    buttons.push(retry);
    controls.append(retry);
    const download = el('button', 'Download note');
    download.type = 'button';
    download.addEventListener('click', () => {
      const url = URL.createObjectURL(
        new Blob([JSON.stringify({ submission: draft, card }, null, 2)], { type: 'application/json' }),
      );
      const link = el('a');
      link.href = url;
      link.download = `review-${id}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    controls.append(download);
    main.append(controls, status);
    const details = el('details');
    details.append(el('summary', 'Build and evidence'), el('pre', JSON.stringify(card, null, 2)));
    main.append(details);
    drawPin();
    state(received ? 'Stored by the server' : 'Choose a verdict to send');
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Review unavailable';
  }
}
