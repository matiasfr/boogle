// Narrow membership guard: authoritative built sources and existing pure factory registries only.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, readManifest } from './manifest.ts';
import { descriptors } from '../../character/descriptors.ts';
import { codeDescriptors } from '../../character/code-descriptors.ts';
import { itemModelIds } from '../../src/player/item-models.ts';
import { propModels } from '../../src/render/prop-models.ts';

export function checkCatalogue() {
  const problems: string[] = [];
  for (const id of Object.keys(readManifest()))
    if (!descriptors[id]) problems.push(`Built asset ${id} needs a character descriptor`);
  const ids = new Set<string>(codeDescriptors.map((d) => d.id));
  for (const id of [...itemModelIds, ...Object.keys(propModels)])
    if (!ids.has(id)) problems.push(`Code model ${id} needs a preview descriptor`);
  for (const descriptor of codeDescriptors)
    if (!fs.existsSync(path.join(ROOT, descriptor.source)))
      problems.push(`Missing descriptor source: ${descriptor.source}`);
  if (ids.size !== codeDescriptors.length) problems.push('Duplicate code preview ids');
  if (problems.length) throw new Error('Asset catalogue:\n' + problems.join('\n'));
  console.log(
    `catalogue: ${Object.keys(readManifest()).length} built roots + generated kit parts, ${ids.size} code previews; coverage registry OK`,
  );
}
