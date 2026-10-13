'use client';

// Assets saved on this device, in the browser's IndexedDB, for deployments with no database yet.
// They stay in this browser only and are not seen by the agents.

export type DeviceDraftFile = { name: string; type: string; blob: Blob };

export type DeviceDraft = {
  id: string;
  savedAt: string;
  fields: Record<string, string>;
  files: DeviceDraftFile[];
};

const DB_NAME = 'ma-agent';
const STORE = 'asset-drafts';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = action(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export async function saveDeviceDraft(fields: Record<string, string>, files: DeviceDraftFile[]): Promise<DeviceDraft> {
  const draft: DeviceDraft = { id: `DRAFT-${Date.now().toString(36).toUpperCase()}`, savedAt: new Date().toISOString(), fields, files };
  await run('readwrite', (store) => store.put(draft));
  return draft;
}

export async function listDeviceDrafts(): Promise<DeviceDraft[]> {
  const drafts = await run<DeviceDraft[]>('readonly', (store) => store.getAll());
  return drafts.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function deleteDeviceDraft(id: string): Promise<void> {
  await run('readwrite', (store) => store.delete(id));
}
