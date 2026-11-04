import { catalogue, assetHref, type CatalogueEntry } from './catalogue.ts';

export function createBrowser(
  select: (id: string) => Promise<void>,
  thumbnail: (entry: CatalogueEntry) => Promise<string>,
) {
  const grid = document.getElementById('catalogue-grid')!;
  const search = document.getElementById('search') as HTMLInputElement;
  const type = document.getElementById('asset-type') as HTMLSelectElement;
  const count = document.getElementById('catalogue-count')!;
  let selected = '';
  const cards = new Map<string, HTMLAnchorElement>();
  const observer = new IntersectionObserver(
    (changes) => {
      for (const change of changes)
        if (change.isIntersecting) {
          observer.unobserve(change.target);
          const card = change.target as HTMLAnchorElement;
          const entry = catalogue.find((e) => e.id === card.dataset.asset)!;
          void thumbnail(entry)
            .then((url) => {
              const img = card.querySelector('img')!;
              img.src = url;
              img.alt = '';
              updateFacts(card, entry);
            })
            .catch(() => {
              card.querySelector('img')!.alt = 'Preview unavailable';
            });
        }
    },
    { root: grid, rootMargin: '40px' },
  );
  function updateFacts(card: HTMLAnchorElement, entry: CatalogueEntry) {
    card.querySelector('.asset-facts')!.textContent =
      `${entry.triangles === null ? '…' : entry.triangles.toLocaleString()} tris · ${entry.animations.length} clips`;
  }
  for (const category of new Set(catalogue.map((entry) => entry.category))) {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    type.append(option);
  }
  for (const entry of catalogue) {
    const card = document.createElement('a');
    card.className = 'asset-card';
    card.dataset.asset = entry.id;
    card.href = assetHref(entry);
    const img = document.createElement('img');
    img.width = img.height = 112;
    img.alt = 'Loading preview';
    const name = document.createElement('strong');
    name.textContent = entry.label;
    const badge = document.createElement('span');
    badge.className = 'asset-source';
    badge.textContent =
      entry.sourceKind === 'code'
        ? 'in code'
        : entry.node
          ? `built · ${catalogue.find((e) => e.id === entry.assetId)?.label ?? entry.assetId}`
          : 'built';
    const facts = document.createElement('span');
    facts.className = 'asset-facts';
    const health = document.createElement('span');
    health.className = 'asset-health';
    health.textContent = entry.flags.length ? '⚠ ' + entry.flags.join(' · ') : '';
    card.title = `${entry.label}\n${entry.source}\n${entry.flags.join('\n') || (entry.sourceKind === 'built' ? 'Fresh build · within budget' : 'Live code · no build budget')}\nReview: ${entry.reviewStatus}`;
    card.append(img, name, badge, facts, health);
    updateFacts(card, entry);
    if (entry.sourceKind === 'built' && !entry.url) card.setAttribute('aria-disabled', 'true');
    card.onclick = (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (!card.hasAttribute('aria-disabled')) void select(entry.id);
    };
    cards.set(entry.id, card);
  }
  function render() {
    observer.disconnect();
    const query = search.value.trim().toLowerCase();
    const shown = catalogue.filter(
      (e) =>
        (!type.value || e.category === type.value) && `${e.label} ${e.id} ${e.source}`.toLowerCase().includes(query),
    );
    grid.replaceChildren(...shown.map((e) => cards.get(e.id)!));
    count.textContent = shown.length
      ? `${shown.length} / ${catalogue.length} assets`
      : 'No matching assets. Try another search or type.';
    for (const entry of shown) {
      const card = cards.get(entry.id)!;
      card.setAttribute('aria-current', entry.id === selected ? 'true' : 'false');
      if (!card.querySelector('img')!.src) observer.observe(card);
    }
  }
  search.oninput = render;
  type.onchange = render;
  render();
  return {
    select(id: string) {
      selected = id;
      for (const [key, card] of cards) card.setAttribute('aria-current', key === id ? 'true' : 'false');
    },
    refresh(id: string) {
      const entry = catalogue.find((e) => e.id === id);
      const card = cards.get(id);
      if (entry && card) updateFacts(card, entry);
    },
    dispose() {
      observer.disconnect();
    },
  };
}
