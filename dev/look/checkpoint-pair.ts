import type { SaveState } from './observe.ts';

// One room checkpoint with two personal saves/poses, captured at the coordinator
// barrier. Never combine the independently timed arrival snapshots of a beat.
export function checkpointPair(peers: { authority: boolean; save: SaveState }[], room: string): SaveState[] {
  if (peers.length !== 2 || peers.filter((p) => p.authority).length !== 1)
    throw new Error('Checkpoint needs exactly two peers and one authority');
  const key = `boogle-place-coop-v2:${room}`;
  const authority = peers.find((p) => p.authority)!;
  const source = JSON.parse(authority.save.storage[key]!) as { shared: Record<string, unknown> };
  const job = source.shared?.job as { people?: number; score?: { metres?: number } } | undefined;
  if (!Number.isInteger(job?.people) || !Number.isFinite(job?.score?.metres))
    throw new Error('Checkpoint authority has no population or track progress');
  return peers.map(({ save }) => {
    if (
      !save.pose ||
      save.beat !== authority.save.beat ||
      save.route?.mode !== 'coop' ||
      save.route.step !== authority.save.route?.step
    )
      throw new Error('Checkpoint peers did not reach the same route barrier');
    const personal = JSON.parse(save.storage[key]!) as { personal: Record<string, unknown> };
    return {
      ...save,
      storage: { ...save.storage, [key]: JSON.stringify({ shared: source.shared, personal: personal.personal }) },
    };
  });
}
