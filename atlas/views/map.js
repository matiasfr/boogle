// Map: the same code three ways (layers, circle pack, treemap). Area is lines of code. ctx = { S, M, N, ... }.
import { hierarchy, pack, treemap, treemapSquarify } from 'd3-hierarchy';
import { select as d3select } from 'd3-selection';
import { interpolateZoom } from 'd3-interpolate';
import 'd3-transition';
import { KINDS, LAYERS } from '../layout.js';
import { layerDirs } from '../model.js';
import { stackBar } from './inspector.js';

const sum = (l) => l.reduce((a, x) => a + x.loc, 0);

// With a file selected, what it uses (blue) and what uses it (orange) light up and the rest dims.
function neighbours({ S, M }) {
  if (S.sel.t !== 'file') return null;
  const f = M.byPath.get(S.sel.id);
  if (!f) return null;
  return { uses: new Set([...f.imports, ...f.lazy]), usedby: new Set(f.users) };
}

export function mapLayers(ctx, el) {
  const { S, M, N, kc, esc } = ctx;
  const nb = neighbours(ctx);
  const sel = S.sel;
  el.innerHTML = `<div class="layers${nb ? ' dim' : ''}">${LAYERS.map((L) => {
    const ds = layerDirs(M, L);
    return `<section class="band" style="--lc:var(${L.c})"><header><b>${L.name}</b><span>${ds.length} folder${ds.length > 1 ? 's' : ''} · ${sum(ds.flatMap((d) => M.dirs[d])).toLocaleString()} lines</span></header><div class="boxes">${ds
      .map((d) => {
        const list = M.dirs[d];
        const lit = nb && list.some((f) => f.f === sel.id || nb.uses.has(f.f) || nb.usedby.has(f.f));
        if (d === S.openDir) {
          return `<div class="box open lit${sel.t === 'dir' && sel.id === d ? ' sel' : ''}" style="--g:1"><b>${esc(d)}/</b><small>${esc(N.folders[d] ?? '')}</small><div class="cells">${list
            .map((f) => {
              const c =
                f.f === sel.id ? 'sel lit' : nb?.uses.has(f.f) ? 'uses lit' : nb?.usedby.has(f.f) ? 'usedby lit' : '';
              return `<button class="cell ${c}" data-file="${esc(f.f)}" style="--g:${Math.sqrt(f.loc)};--c:${kc(f.kind)}" title="${esc(f.f)} · ${f.loc} lines">${esc(f.name.replace(/\.js$/, ''))}</button>`;
            })
            .join('')}</div></div>`;
        }
        return `<button class="box${lit ? ' lit' : ''}${sel.t === 'dir' && sel.id === d ? ' sel' : ''}" data-dir="${esc(d)}" style="--g:${sum(list)}"><b>${esc(d)}/</b><small>${list.length} files · ${sum(list).toLocaleString()} lines</small>${stackBar(ctx, list)}</button>`;
      })
      .join('')}</div></section>`;
  }).join('')}</div>`;
}

// The hierarchy d3 lays out: boogle > layer > folder > file (value = lines).
function hier(ctx) {
  const { M } = ctx;
  return hierarchy({
    name: 'boogle',
    children: LAYERS.map((L) => ({
      name: L.short,
      layer: L,
      children: layerDirs(M, L).map((d) => ({
        name: d,
        dir: d,
        children: M.dirs[d].map((f) => ({ name: f.name.replace(/\.js$/, ''), file: f, value: f.loc })),
      })),
    })),
  })
    .sum((d) => d.value || 0)
    .sort((a, b) => b.value - a.value);
}

const nodeSel = (d) =>
  d.data.file
    ? { t: 'file', id: d.data.file.f }
    : d.data.dir
      ? { t: 'dir', id: d.data.dir }
      : d.data.layer
        ? { t: 'layer', id: d.data.layer.id }
        : { t: 'root' };

function fillFor({ css }, d) {
  if (d.data.file) return css(KINDS[d.data.file.kind].c);
  if (d.data.layer) return css(d.data.layer.c);
  if (d.data.dir) return css('--panel');
  return css('--sunk');
}

function litFor({ S }, d, nb) {
  if (!nb) return true;
  return d.leaves().some((l) => {
    const f = l.data.file?.f;
    return f === S.sel.id || nb.uses.has(f) || nb.usedby.has(f);
  });
}

/* ---------- Circle pack ---------- */
let packZoom = null;
export const resetPackZoom = () => (packZoom = null);

export function mapPack(ctx, el) {
  const { css, select } = ctx;
  const W = 900;
  const H = 900;
  const root = pack()
    .size([W, H])
    .padding((d) => (d.depth === 0 ? 14 : d.depth === 1 ? 10 : 3))(hier(ctx));
  el.innerHTML = '';
  const svg = d3select(el)
    .append('svg')
    .attr('viewBox', `-${W / 2} -${H / 2} ${W} ${H}`)
    .style('display', 'block')
    .style('width', '100%')
    .style('max-height', '80vh')
    .style('cursor', 'pointer');
  svg
    .append('rect')
    .attr('x', -W / 2)
    .attr('y', -H / 2)
    .attr('width', W)
    .attr('height', H)
    .attr('fill', css('--panel'))
    .on('click', () => zoom(root));
  const node = svg
    .append('g')
    .selectAll('circle')
    .data(root.descendants().slice(1))
    .join('circle')
    .attr('fill', (d) => fillFor(ctx, d))
    .attr('stroke', (d) => (d.data.file ? 'none' : css('--line')))
    .on('click', (e, d) => {
      e.stopPropagation();
      if (d.children) zoom(d);
      select(nodeSel(d), false);
    });
  node
    .append('title')
    .text((d) =>
      d.data.file ? `${d.data.file.f} · ${d.value} lines` : `${d.data.name} · ${d.value.toLocaleString()} lines`,
    );
  const label = svg
    .append('g')
    .style('pointer-events', 'none')
    .selectAll('text')
    .data(root.descendants())
    .join('text')
    .attr('text-anchor', 'middle')
    .style('font-size', (d) => (d.data.file ? '11px' : '13px'))
    .style('font-family', (d) => (d.data.dir || d.data.file ? css('--mono') : css('--sans')))
    .style('font-weight', (d) => (d.data.layer ? 600 : 400))
    .style('paint-order', 'stroke')
    .style('stroke', css('--panel'))
    .style('stroke-width', 3)
    .text((d) => d.data.name);
  let focus = packZoom ? root.descendants().find((d) => d.data.name === packZoom) || root : root;
  let cur;
  label.style('display', (d) => (d.parent === focus ? 'inline' : 'none'));
  const place = (v) => {
    const k = W / v[2];
    cur = v;
    node.attr('transform', (d) => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`).attr('r', (d) => d.r * k);
    label.attr(
      'transform',
      (d) => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k + (d.children ? -d.r * k + 18 : 4)})`,
    );
  };
  place([focus.x, focus.y, focus.r * 2]);
  function zoom(d) {
    focus = d;
    packZoom = d === root ? null : d.data.name;
    const t = svg
      .transition()
      .duration(650)
      .tween('zoom', () => {
        const i = interpolateZoom(cur, [d.x, d.y, d.r * 2]);
        return (u) => place(i(u));
      });
    label
      .filter(function (n) {
        return n.parent === focus || this.style.display === 'inline';
      })
      .transition(t)
      .style('fill-opacity', (n) => (n.parent === focus ? 1 : 0))
      .on('start', function (n) {
        if (n.parent === focus) this.style.display = 'inline';
      })
      .on('end', function (n) {
        if (n.parent !== focus) this.style.display = 'none';
      });
    if (d === root) select({ t: 'root' }, false);
  }
  mapPack.update = (c) => {
    const nb = neighbours(c);
    const { S } = c;
    node
      .attr('opacity', (d) => (litFor(c, d, nb) ? 1 : 0.25))
      .attr('stroke', (d) =>
        d.data.file && d.data.file.f === S.sel.id
          ? css('--fg')
          : d.data.file && nb?.uses.has(d.data.file.f)
            ? css('--uses')
            : d.data.file && nb?.usedby.has(d.data.file.f)
              ? css('--usedby')
              : d.data.file
                ? 'none'
                : css('--line'),
      )
      .attr('stroke-width', (d) =>
        d.data.file && nb && (d.data.file.f === S.sel.id || nb.uses.has(d.data.file.f) || nb.usedby.has(d.data.file.f))
          ? 3
          : 1,
      );
  };
  mapPack.update(ctx);
  el.insertAdjacentHTML(
    'beforeend',
    '<div class="hint">Click a circle to zoom in · click the background to zoom out</div>',
  );
}

/* ---------- Treemap ---------- */
export function mapTree(ctx, el) {
  const { css, select } = ctx;
  const W = 1000;
  const H = 640;
  const root = treemap()
    .size([W, H])
    .tile(treemapSquarify.ratio(1.2))
    .paddingOuter(4)
    .paddingInner(2)
    .paddingTop((d) => (d.depth === 0 ? 4 : d.depth === 1 ? 22 : 18))
    .round(true)(hier(ctx));
  el.innerHTML = '';
  const svg = d3select(el)
    .append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .style('display', 'block')
    .style('width', '100%');
  const g = svg
    .selectAll('g')
    .data(root.descendants().slice(1))
    .join('g')
    .attr('transform', (d) => `translate(${d.x0},${d.y0})`);
  const rect = g
    .append('rect')
    .attr('width', (d) => d.x1 - d.x0)
    .attr('height', (d) => d.y1 - d.y0)
    .attr('rx', (d) => (d.depth === 3 ? 3 : 6))
    .attr('fill', (d) => fillFor(ctx, d))
    .attr('fill-opacity', (d) => (d.data.file ? 0.85 : 1))
    .attr('stroke', css('--line'))
    .style('cursor', 'pointer')
    .on('click', (e, d) => select(nodeSel(d), false));
  rect
    .append('title')
    .text((d) =>
      d.data.file ? `${d.data.file.f} · ${d.value} lines` : `${d.data.name} · ${d.value.toLocaleString()} lines`,
    );
  g.filter((d) => d.depth < 3 || (d.x1 - d.x0 > 46 && d.y1 - d.y0 > 16))
    .append('text')
    .attr('x', 6)
    .attr('y', (d) => (d.depth === 1 ? 15 : 13))
    .style('font', (d) =>
      d.depth === 1 ? `600 11px ${css('--sans')}` : `${d.depth === 2 ? 500 : 400} 11px ${css('--mono')}`,
    )
    .style('pointer-events', 'none')
    .style('fill', (d) => (d.depth === 3 ? '#11151b' : css('--fg')))
    .style('text-transform', (d) => (d.depth === 1 ? 'uppercase' : 'none'))
    .style('letter-spacing', (d) => (d.depth === 1 ? '.07em' : 0))
    .text((d) => {
      const w = d.x1 - d.x0;
      const n = d.depth === 1 ? d.data.layer.name : d.data.name;
      const max = Math.floor((w - 10) / 6.8);
      return n.length > max ? n.slice(0, Math.max(1, max - 1)) + '…' : n;
    });
  mapTree.update = (c) => {
    const nb = neighbours(c);
    const { S } = c;
    const on = (d) => d.data.file?.f === S.sel.id || (S.sel.t === 'dir' && d.data.dir === S.sel.id);
    rect
      .attr('opacity', (d) => (d.depth < 2 || litFor(c, d, nb) ? 1 : 0.25))
      .attr('stroke', (d) =>
        on(d)
          ? css('--fg')
          : d.data.file && nb?.uses.has(d.data.file.f)
            ? css('--uses')
            : d.data.file && nb?.usedby.has(d.data.file.f)
              ? css('--usedby')
              : css('--line'),
      )
      .attr('stroke-width', (d) =>
        on(d) || (d.data.file && nb && (nb.uses.has(d.data.file.f) || nb.usedby.has(d.data.file.f))) ? 2.5 : 1,
      );
  };
  mapTree.update(ctx);
}
