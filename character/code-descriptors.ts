// Preview membership only: geometry stays in the shared factories referenced here.
export const codeDescriptors = [
  { id: 'palm', label: 'Palm', category: 'nature', source: 'src/render/prop-models.ts' },
  { id: 'broadleaf', label: 'Broadleaf tree', category: 'nature', source: 'src/render/prop-models.ts' },
  { id: 'rock', label: 'Rock', category: 'nature', source: 'src/render/prop-models.ts' },
  { id: 'seeds', label: 'Seed bag', category: 'props', source: 'src/player/item-models.ts' },
  { id: 'frisbee', label: 'Frisbee', category: 'props', source: 'src/player/item-models.ts' },
  { id: 'house', label: 'House · plan example', category: 'buildings', source: 'src/proto/place/building-plans.ts' },
  { id: 'tower', label: 'Tower · plan example', category: 'buildings', source: 'src/proto/place/building-plans.ts' },
  {
    id: 'block',
    label: 'Block stack · plan example',
    category: 'buildings',
    source: 'src/proto/place/building-plans.ts',
  },
  { id: 'scaffold', label: 'House scaffold', category: 'buildings', source: 'src/proto/place/building-plans.ts' },
  { id: 'windmill', label: 'Windmill', category: 'pois', source: 'src/pois/windmills/model.ts' },
  { id: 'windmill-body', label: 'Windmill body', category: 'pois', source: 'src/pois/windmills/model.ts' },
  { id: 'windmill-rotor', label: 'Windmill rotor', category: 'pois', source: 'src/pois/windmills/model.ts' },
] as const;
export type CodeId = (typeof codeDescriptors)[number]['id'];
