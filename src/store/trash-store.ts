import { create } from 'zustand';
import type { TrashItem } from '@/types/ipc';

type TrashState = {
  items: TrashItem[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  load: () => Promise<void>;
  restore: (trashId: string) => Promise<{ ok: true; entityType: string; entityId: string; data: unknown } | null>;
  delete: (trashId: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
};

const getTrashApi = () => {
  if (!window.avyukta?.trash) {
    throw new Error('Trash tools are not loaded yet. Quit Avyukta Life and run npm run dev again so the Electron backend restarts.');
  }
  return window.avyukta.trash;
};

export const useTrashStore = create<TrashState>((set, get) => ({
  items: [],
  loading: false,
  saving: false,
  error: null,
  load: async () => {
    set({ loading: true, error: null });
    try {
      const items = await getTrashApi().list();
      set({ items, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load trash', loading: false });
    }
  },
  restore: async (trashId) => {
    set({ saving: true, error: null });
    try {
      const result = await getTrashApi().restore(trashId);
      await get().load();
      set({ saving: false });
      return result;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to restore item', saving: false });
      return null;
    }
  },
  delete: async (trashId) => {
    set({ saving: true, error: null });
    try {
      await getTrashApi().delete(trashId);
      await get().load();
      set({ saving: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete item', saving: false });
    }
  },
  emptyTrash: async () => {
    set({ saving: true, error: null });
    try {
      await getTrashApi().empty();
      await get().load();
      set({ saving: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to empty trash', saving: false });
    }
  }
}));
