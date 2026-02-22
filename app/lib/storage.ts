/**
 * IndexedDB Storage Adapter for Prompt Chronicle
 *
 * Provides persistent storage via IndexedDB with automatic migration
 * from the legacy localStorage-based window.storage polyfill.
 *
 * No external dependencies — uses the browser IndexedDB API directly.
 */

const DB_NAME = 'prompt-chronicle-db';
const DB_VERSION = 1;
const STORE_LIBRARY = 'library';
const STORE_META = 'meta';

const LEGACY_LIBRARY_KEY = 'prompt-library-v3';
const LEGACY_SETTINGS_KEY = 'prompt-refinery-settings';

class ChronicleStorage {
  private db: IDBDatabase | null = null;
  private dbReady: Promise<IDBDatabase>;

  constructor() {
    this.dbReady = this.openDB();
  }

  // ── Internal: open or create the database ──────────────────────────

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      let request: IDBOpenDBRequest;
      try {
        request = indexedDB.open(DB_NAME, DB_VERSION);
      } catch (err) {
        console.error('[ChronicleStorage] Failed to open IndexedDB:', err);
        reject(err);
        return;
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORE_LIBRARY)) {
          db.createObjectStore(STORE_LIBRARY, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;

        // Handle unexpected close (e.g. browser clearing storage)
        this.db.onclose = () => {
          console.warn('[ChronicleStorage] Database connection closed unexpectedly');
          this.db = null;
        };

        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('[ChronicleStorage] IndexedDB open error:', (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return this.dbReady;
  }

  // ── Helpers ────────────────────────────────────────────────────────

  private tx(
    storeName: string,
    mode: IDBTransactionMode = 'readonly'
  ): Promise<{ store: IDBObjectStore; complete: Promise<void> }> {
    return this.getDB().then((db) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const complete = new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
      return { store, complete };
    });
  }

  private request<T>(req: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // ── Public API ─────────────────────────────────────────────────────

  /**
   * Initialize the database and migrate legacy localStorage data if
   * the IndexedDB stores are empty.
   */
  async init(): Promise<void> {
    try {
      await this.getDB();
      await this.migrateFromLocalStorage();
    } catch (err) {
      console.error('[ChronicleStorage] init failed:', err);
    }
  }

  /**
   * Return all library items sorted by createdAt descending
   * (newest first).
   */
  async getLibrary(): Promise<any[]> {
    try {
      const { store, complete } = await this.tx(STORE_LIBRARY);
      const items: any[] = await this.request(store.getAll());
      await complete;

      items.sort((a, b) => {
        const ta = a.createdAt ?? 0;
        const tb = b.createdAt ?? 0;
        return tb - ta;
      });

      return items;
    } catch (err) {
      console.error('[ChronicleStorage] getLibrary failed:', err);
      return [];
    }
  }

  /**
   * Insert or update a single library item.
   */
  async saveItem(item: any): Promise<void> {
    try {
      const { store, complete } = await this.tx(STORE_LIBRARY, 'readwrite');
      store.put(item);
      await complete;
    } catch (err) {
      console.error('[ChronicleStorage] saveItem failed:', err);
    }
  }

  /**
   * Delete a library item by id.
   */
  async deleteItem(id: string): Promise<void> {
    try {
      const { store, complete } = await this.tx(STORE_LIBRARY, 'readwrite');
      store.delete(id);
      await complete;
    } catch (err) {
      console.error('[ChronicleStorage] deleteItem failed:', err);
    }
  }

  /**
   * Write multiple items in a single transaction.
   * Useful for chain-repair or bulk operations.
   */
  async batchUpdate(items: any[]): Promise<void> {
    if (!items.length) return;
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_LIBRARY, 'readwrite');
      const store = tx.objectStore(STORE_LIBRARY);

      for (const item of items) {
        store.put(item);
      }

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } catch (err) {
      console.error('[ChronicleStorage] batchUpdate failed:', err);
    }
  }

  /**
   * Get a value from the meta store by key.
   * Returns the stored value (unwrapped from the `{ key, value }` envelope)
   * or null if not found.
   */
  async getMeta(key: string): Promise<any> {
    try {
      const { store, complete } = await this.tx(STORE_META);
      const record = await this.request(store.get(key));
      await complete;
      return record ? record.value : null;
    } catch (err) {
      console.error('[ChronicleStorage] getMeta failed:', err);
      return null;
    }
  }

  /**
   * Set a value in the meta store.
   * Pass `null` as value to effectively delete the entry.
   */
  async setMeta(key: string, value: any): Promise<void> {
    try {
      const { store, complete } = await this.tx(STORE_META, 'readwrite');
      if (value === null || value === undefined) {
        store.delete(key);
      } else {
        store.put({ key, value });
      }
      await complete;
    } catch (err) {
      console.error('[ChronicleStorage] setMeta failed:', err);
    }
  }

  /**
   * Export the full library as a JSON string.
   * Mirrors the format previously stored in localStorage under
   * 'prompt-library-v3'.
   */
  async exportAsJSON(): Promise<string> {
    const items = await this.getLibrary();
    return JSON.stringify(items);
  }

  /**
   * Import library items from a JSON string (an array of items).
   * Replaces the current library content.
   */
  async importFromJSON(json: string): Promise<void> {
    try {
      const items: any[] = JSON.parse(json);
      if (!Array.isArray(items)) {
        console.warn('[ChronicleStorage] importFromJSON: expected array, got', typeof items);
        return;
      }

      const db = await this.getDB();
      const tx = db.transaction(STORE_LIBRARY, 'readwrite');
      const store = tx.objectStore(STORE_LIBRARY);

      // Clear existing data then insert new
      store.clear();
      for (const item of items) {
        if (item && item.id) {
          store.put(item);
        }
      }

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } catch (err) {
      console.error('[ChronicleStorage] importFromJSON failed:', err);
    }
  }

  // ── Migration ──────────────────────────────────────────────────────

  private async migrateFromLocalStorage(): Promise<void> {
    try {
      // Migrate library items
      const libraryCount = await this.countStoreItems(STORE_LIBRARY);
      if (libraryCount === 0) {
        const raw = localStorage.getItem(LEGACY_LIBRARY_KEY);
        if (raw) {
          const items: any[] = JSON.parse(raw);
          if (Array.isArray(items) && items.length > 0) {
            const db = await this.getDB();
            const tx = db.transaction(STORE_LIBRARY, 'readwrite');
            const store = tx.objectStore(STORE_LIBRARY);

            for (const item of items) {
              if (item && item.id) {
                store.put(item);
              }
            }

            await new Promise<void>((resolve, reject) => {
              tx.oncomplete = () => resolve();
              tx.onerror = () => reject(tx.error);
              tx.onabort = () => reject(tx.error);
            });

            console.log(
              `[ChronicleStorage] Migrated ${items.length} library items from localStorage`
            );
          }
        }
      }

      // Migrate settings
      const settingsRecord = await this.getMeta(LEGACY_SETTINGS_KEY);
      if (settingsRecord === null) {
        const raw = localStorage.getItem(LEGACY_SETTINGS_KEY);
        if (raw) {
          try {
            const settings = JSON.parse(raw);
            await this.setMeta(LEGACY_SETTINGS_KEY, settings);
            console.log('[ChronicleStorage] Migrated settings from localStorage');
          } catch {
            // Settings string wasn't valid JSON — store as-is
            await this.setMeta(LEGACY_SETTINGS_KEY, raw);
            console.log('[ChronicleStorage] Migrated raw settings string from localStorage');
          }
        }
      }
    } catch (err) {
      console.error('[ChronicleStorage] Migration from localStorage failed:', err);
    }
  }

  private async countStoreItems(storeName: string): Promise<number> {
    const { store, complete } = await this.tx(storeName);
    const count = await this.request(store.count());
    await complete;
    return count;
  }
}

// ── Backward-compatible polyfill ─────────────────────────────────────

/**
 * Creates a drop-in replacement for the legacy `window.storage` polyfill
 * that routes reads/writes through ChronicleStorage (IndexedDB).
 */
export function createStoragePolyfill(storage: ChronicleStorage) {
  return {
    get: async (key: string) => {
      if (key === LEGACY_LIBRARY_KEY) {
        const items = await storage.getLibrary();
        return items.length > 0 ? { value: JSON.stringify(items) } : null;
      }
      const meta = await storage.getMeta(key);
      return meta !== null && meta !== undefined
        ? { value: typeof meta === 'string' ? meta : JSON.stringify(meta) }
        : null;
    },

    set: async (key: string, value: string) => {
      if (key === LEGACY_LIBRARY_KEY) {
        await storage.importFromJSON(value);
        return;
      }
      await storage.setMeta(key, value);
    },

    delete: async (key: string) => {
      if (key === LEGACY_LIBRARY_KEY) {
        const items = await storage.getLibrary();
        for (const item of items) {
          await storage.deleteItem(item.id);
        }
        return;
      }
      await storage.setMeta(key, null);
    },
  };
}

// ── Singleton ────────────────────────────────────────────────────────

export { ChronicleStorage };
export const chronicleStorage = new ChronicleStorage();
