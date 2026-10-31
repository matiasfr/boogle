// Network flow: a Sankey from the files that put keys on the wire to the four channels. Band width is the number of
// keys. ctx = { S, M, N, ... }.
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { select as d3select } from 'd3-selection';
import { CHANNEL_IDS, KINDS } from '../layout.js';
import { wireOf } from '../model.js';

export function flowView(ctx, el) {
  const { S, M, N, css, select } = ctx;
  const W = 1000;
  const H = 600;
  const src = M.files.filter((f) => wireOf(f).length);
  if (!src.length) {
    el.innerHTML =
      '<div class="frame"><p class="note">No files put keys on the wire (or the code facts could not be read).</p></div>';
    flowView.update = () => {};
    return;
  }
  const chName = (id) => N.channels[id]?.name ?? KINDS[id]?.name ?? id;
  const nodes = [
    ...src.map((f) => ({ id: f.f, label: f.name.replace(/\.js$/, ''), f })),
    ...CHANNEL_IDS.map((id) => ({ id: 'ch:' + id, label: chName(id), ch: id })),
  ];
  const links = src.flatMap((f) =>
    wireOf(f).map(([c, keys]) => ({ source: f.f, target: 'ch:' + c, value: keys.length, keys, kind: c })),
  );
  const { nodes: SN, links: SL } = sankey()
    .nodeId((d) => d.id)
    .nodeWidth(12)
    .nodePadding(10)
    .nodeSort((a, b) => (a.ch || b.ch ? 0 : a.f.dir.localeCompare(b.f.dir)))
    .extent([
      [200, 20],
      [W - 260, H - 20],
    ])({ nodes: nodes.map((d) => ({ ...d })), links: links.map((d) => ({ ...d })) });
  el.innerHTML = '';
  const svg = d3select(el)
    .append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .style('display', 'block')
    .style('width', '100%')
    .style('min-width', '720px');
  d3select(el).style('overflow-x', 'auto');
  const link = svg
    .append('g')
    .attr('fill', 'none')
    .selectAll('path')
    .data(SL)
    .join('path')
    .attr('d', sankeyLinkHorizontal())
    .attr('stroke', (d) => css(KINDS[d.kind].c))
    .attr('stroke-width', (d) => Math.max(2, d.width))
    .attr('stroke-opacity', 0.45)
    .style('cursor', 'pointer')
    .on('click', (e, d) => select({ t: 'file', id: d.source.id }, false));
  link.append('title').text((d) => `${d.source.label} → ${d.target.label}: ${d.keys.join(', ')}`);
  svg
    .append('g')
    .selectAll('text.k')
    .data(SL)
    .join('text')
    .attr('x', (d) => d.source.x1 + 8)
    .attr('y', (d) => d.y0 + 4)
    .style('font', `11px ${css('--mono')}`)
    .style('fill', (d) => css(KINDS[d.kind].c))
    .style('paint-order', 'stroke')
    .style('stroke', css('--panel'))
    .style('stroke-width', 3)
    .style('pointer-events', 'none')
    .text((d) => (d.keys.join(' ').length > 22 ? d.keys.slice(0, 2).join(' ') + ' …' : d.keys.join(' ')));
  const node = svg
    .append('g')
    .selectAll('g')
    .data(SN)
    .join('g')
    .style('cursor', 'pointer')
    .on('click', (e, d) => select(d.ch ? { t: 'channel', id: d.ch } : { t: 'file', id: d.id }, false));
  node
    .append('rect')
    .attr('x', (d) => d.x0)
    .attr('y', (d) => d.y0)
    .attr('width', (d) => d.x1 - d.x0)
    .attr('height', (d) => Math.max(2, d.y1 - d.y0))
    .attr('rx', 2)
    .attr('fill', (d) => (d.ch ? css(KINDS[d.ch].c) : css('--fg')));
  node
    .append('text')
    .attr('x', (d) => (d.ch ? d.x1 + 10 : d.x0 - 8))
    .attr('y', (d) => (d.y0 + d.y1) / 2 + 4)
    .attr('text-anchor', (d) => (d.ch ? 'start' : 'end'))
    .style('font', (d) => (d.ch ? `600 14px ${css('--sans')}` : `12px ${css('--mono')}`))
    .style('fill', css('--fg'))
    .text((d) => d.label);
  node
    .filter((d) => d.ch)
    .append('text')
    .attr('x', (d) => d.x1 + 10)
    .attr('y', (d) => (d.y0 + d.y1) / 2 + 22)
    .style('font', `12px ${css('--sans')}`)
    .style('fill', css('--mute'))
    .text((d) => N.channels[d.ch]?.tag ?? '');
  flowView.update = (c) => {
    const sel = c.S.sel;
    link.attr('stroke-opacity', (d) =>
      sel.t === 'file'
        ? d.source.id === sel.id
          ? 0.85
          : 0.12
        : sel.t === 'channel'
          ? d.kind === sel.id
            ? 0.8
            : 0.12
          : 0.45,
    );
  };
  flowView.update({ S });
}
