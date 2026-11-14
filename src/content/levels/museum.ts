import { defineLevel, type PrefabKey } from '../../prefab/types.ts';
export const levels = [
  defineLevel({
    place: 'museum',
    placements: [
      'plinth',
      'table',
      'bench',
      'alcove-back',
      'alcove-left',
      'alcove-right',
      'floor',
      'cabinet-trim',
      'cushion-0',
      'cushion-1',
      'drawer-0',
      'drawer-1',
      'drawer-2',
      'reflector-0',
      'reflector-1',
      'apron',
      'cornice',
      'spire',
      'label-specimen',
      'label-table',
      'specimen',
      'pool',
      'relief',
      'bits',
      'column-0',
      'column-1',
      'column-2',
      'column-3',
      'sign',
    ].map((name) => ({
      id: `museum-${name}`,
      prefab: `town.museum-${name}` as PrefabKey,
      pos: [0, 0, 0] as const,
      ...(name === 'label-specimen'
        ? { labels: { sign: 'specimen' } }
        : name === 'label-table'
          ? { labels: { sign: 'table' } }
          : name === 'sign'
            ? { labels: { sign: 'museum' } }
            : {}),
    })),
  }),
];
