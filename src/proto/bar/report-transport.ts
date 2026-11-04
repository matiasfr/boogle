// Shared by the prototype bar and the standalone review card; no game imports.
export function queueReport(server: string, body: unknown): boolean {
  try {
    return (
      typeof navigator.sendBeacon === 'function' &&
      navigator.sendBeacon(new URL('/report', server), JSON.stringify(body))
    );
  } catch {
    return false;
  }
}

export async function acknowledgeReport(server: string, body: unknown): Promise<unknown> {
  const response = await fetch(new URL('/report', server), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Server returned ${response.status}; retry keeps the same note ID.`);
  return response.json();
}
