// Pure decision over page readbacks, never over source-file similarity.
export type Restored = {
  position: { x: number; y: number; z: number };
  room: string;
  interior: string | null;
  progress: { track: number; town: number };
};
export type RestorePair = { pair: boolean; reason: string };
export type ExpectedRestore = Omit<Restored, 'interior'>;

export function expectedRestore(save: {
  room: string;
  query: string;
  pose: Restored['position'] | null;
  storage: Record<string, string>;
}): ExpectedRestore | null {
  const key = new URLSearchParams(save.query).get('coop') === '1' ? 'boogle-place-coop-v2:' : 'boogle-place-v4:';
  try {
    const saved = JSON.parse(save.storage[key + save.room] ?? 'null') as {
      shared?: { job?: { score?: { metres?: number }; people?: number } };
    } | null;
    const expected = {
      position: save.pose,
      room: save.room,
      interior: null,
      progress: { track: saved?.shared?.job?.score?.metres, town: saved?.shared?.job?.people },
    };
    return valid(expected) ? expected : null;
  } catch {
    return null;
  }
}

function valid(value: unknown): value is Restored {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<Restored>;
  return (
    typeof v.room === 'string' &&
    v.room.length > 0 &&
    (v.interior === null || typeof v.interior === 'string') &&
    [v.position?.x, v.position?.y, v.position?.z, v.progress?.track, v.progress?.town].every(
      (n) => typeof n === 'number' && Number.isFinite(n),
    )
  );
}

export function pairRestores(before: unknown, after: unknown, expected: ExpectedRestore | null): RestorePair {
  if (!valid(before) || !valid(after)) return { pair: false, reason: 'Missing or invalid restored-state readback' };
  if (!expected || !valid({ ...expected, interior: null }))
    return { pair: false, reason: 'Checkpoint has no readable expected position, room or progress' };
  const mismatches: string[] = [];
  const distance = Math.hypot(
    before.position.x - after.position.x,
    before.position.y - after.position.y,
    before.position.z - after.position.z,
  );
  if (distance > 1) mismatches.push(`position differs by ${distance.toFixed(2)} m (limit 1 m)`);
  if (before.room !== after.room) mismatches.push(`room ${before.room} → ${after.room}`);
  if (before.interior !== after.interior)
    mismatches.push(`interior ${before.interior ?? 'outside'} → ${after.interior ?? 'outside'}`);
  if (Math.abs(before.progress.track - after.progress.track) > 1e-6)
    mismatches.push(`track ${before.progress.track} → ${after.progress.track} m`);
  if (before.progress.town !== after.progress.town)
    mismatches.push(`town ${before.progress.town} → ${after.progress.town}`);
  for (const [side, actual] of [
    ['before', before],
    ['after', after],
  ] as const) {
    const fromSave = Math.hypot(
      actual.position.x - expected.position.x,
      actual.position.y - expected.position.y,
      actual.position.z - expected.position.z,
    );
    if (fromSave > 1) mismatches.push(`${side} position ${fromSave.toFixed(2)} m from checkpoint (limit 1 m)`);
    if (actual.room !== expected.room) mismatches.push(`${side} room ${actual.room}, checkpoint ${expected.room}`);
    if (Math.abs(actual.progress.track - expected.progress.track) > 1e-6)
      mismatches.push(`${side} track ${actual.progress.track} m, checkpoint ${expected.progress.track} m`);
    if (actual.progress.town !== expected.progress.town)
      mismatches.push(`${side} town ${actual.progress.town}, checkpoint ${expected.progress.town}`);
  }
  return mismatches.length
    ? { pair: false, reason: mismatches.join('; ') }
    : {
        pair: true,
        reason: `Restore matched checkpoint: ${distance.toFixed(2)} m apart; same room, interior, track and town`,
      };
}

// Read the live owners after restore and warm-up, before any action. Never read the seed back as proof.
export const READ_RESTORED = `
  const { me } = await import('/src/player/player.ts');
  const { getRoomId } = await import('/src/netplay/net.ts');
  const { job } = await import('/src/proto/place/job.ts');
  const { indoors } = await import('/src/proto/place/place-rooms.ts');
  const p = me.body?.position;
  return {
    position: p ? { x: p.x, y: p.y, z: p.z } : null,
    room: getRoomId(), interior: indoors.room?.id ?? null,
    progress: { track: job.score.metres, town: job.people }
  };
`;
