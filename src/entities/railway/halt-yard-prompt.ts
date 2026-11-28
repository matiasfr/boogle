/** A bin's kind addresses both the prompt and the single yard op sent on press. */
export function binPut(
  adapter: { haltPut(yard: number, kind: 0 | 1 | 2): boolean },
  yard: number,
  kind: 0 | 1 | 2,
  carried: readonly number[],
  gift: boolean,
) {
  return {
    note: `${carried[kind]} ${['logs', 'stone', 'rails'][kind]}`,
    verb: gift ? 'Give to works' : 'Leave it here',
    run: () => void adapter.haltPut(yard, kind),
  };
}
