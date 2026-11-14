// Artifact-local shared authored operands. No arithmetic, rounding or runtime-derived data.
import type { Json, JsonObject } from './types.ts';

export function expandOperands(layout: JsonObject): JsonObject {
  if (layout.operands === undefined) return layout;
  if (!Array.isArray(layout.operands)) throw new Error('prefabs: operands must be an array');
  const definitions = layout.operands;
  const visit = (value: Json, definition = false): Json => {
    if (Array.isArray(value)) return value.map((v) => visit(v, definition));
    if (!value || typeof value !== 'object') return value;
    if (Object.hasOwn(value, 'operand')) {
      const index = (value as JsonObject).operand;
      if (
        definition ||
        Object.keys(value).length !== 1 ||
        typeof index !== 'number' ||
        !Number.isInteger(index) ||
        index < 0 ||
        index >= definitions.length
      )
        throw new Error('prefabs: invalid shared operand reference');
      return definitions[index]!;
    }
    return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, visit(v, definition)]));
  };
  // Definitions cannot reference definitions: cycles and recursive expansion are impossible.
  for (const value of definitions) visit(value, true);
  const body = { ...layout };
  delete body.operands;
  return visit(body) as JsonObject;
}
