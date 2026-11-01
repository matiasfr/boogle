// Files the player brings (an engine build, the pieces cut from their ROM), kept in this browser's IndexedDB so later
// visits need not ask again. Nothing here ever goes over the network. IndexedDB can be missing or blocked (private
// windows); then loadFile gives null and the file is asked for again next visit.
const DB = 'boogle-decomp';
const STORE = 'files';

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function request<T = unknown>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const req = fn(db.transaction(STORE, mode).objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

// T is what was saved under key; nothing checks it.
export async function loadFile<T = unknown>(key: string): Promise<T | null> {
  try {
    return (await request<T>('readonly', (s) => s.get(key))) ?? null;
  } catch {
    return null;
  }
}

export async function saveFile(key: string, data: unknown) {
  try {
    await request('readwrite', (s) => s.put(data, key));
  } catch {
    // not kept; this visit still has it
  }
}
