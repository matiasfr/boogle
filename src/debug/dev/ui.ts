import type { Args, Context } from './types.ts';

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', cls = '') {
  const node = document.createElement(tag);
  node.textContent = text;
  node.className = cls;
  return node;
}
export function button(label: string, action: () => unknown) {
  const node = el('button', label, 'pause-btn');
  node.type = 'button';
  node.addEventListener('click', () => void action());
  return node;
}
export function command(
  parent: HTMLElement,
  ctx: Context,
  tool: string,
  label: string,
  name: string,
  args?: Args | (() => Args),
) {
  const b = button(label, async () => {
    b.disabled = true;
    try {
      const result = await ctx.run(tool, name, typeof args === 'function' ? args() : args);
      status.textContent = result.message;
      if (result.data !== undefined) output.textContent = JSON.stringify(result.data, null, 2);
    } finally {
      b.disabled = false;
    }
  });
  b.dataset.devCommand = `${tool}.${name}`;
  const status = el('p', '', 'dev-status');
  status.setAttribute('role', 'status');
  const output = el('pre', '', 'dev-output');
  const item = el('div', '', 'dev-command');
  item.append(b, status, output);
  parent.append(item);
  return b;
}
export function more(parent: HTMLElement, label = 'More') {
  const details = el('details', '', 'dev-more');
  details.append(el('summary', label));
  parent.append(details);
  return details;
}
export function note(parent: HTMLElement, text: string) {
  parent.append(el('p', text, 'dev-note'));
}
export function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = el('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
