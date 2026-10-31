// Files the player brings (an engine build, the pieces cut from their ROM), kept in this browser's IndexedDB so later
// visits need not ask again. Nothing here ever goes over the network. IndexedDB can be missing or blocked (private
// windows); then loadFile gives null and the file is asked for again next visit.
const DB = 'boogle-decomp';
const STORE = 'files';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function request(mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const req = fn(db.transaction(STORE, mode).objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export async function loadFile(key) {
  try {
    return (await request('readonly', (s) => s.get(key))) ?? null;
  } catch {
    return null;
  }
}

export async function saveFile(key, data) {
  try {
    await request('readwrite', (s) => s.put(data, key));
  } catch {
    // not kept; this visit still has it
  }
}
