import { create } from 'zustand';
import type { MediaFile } from '@/types/ipc';

type MediaState = {
  media: MediaFile[];
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  importImages: () => Promise<void>;
};

const getApi = () => {
  if (!window.avyukta?.media) throw new Error('Media tools are not loaded. Restart the app with npm run dev.');
  return window.avyukta.media;
};

export const useMediaStore = create<MediaState>((set, get) => ({
  media: [],
  loading: false,
  error: null,
  load: async () => {
    set({ loading: true, error: null });
    try {
      set({ media: await getApi().list(), loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load media', loading: false });
    }
  },
  importImages: async () => {
    await getApi().importImages();
    await get().load();
  }
}));
