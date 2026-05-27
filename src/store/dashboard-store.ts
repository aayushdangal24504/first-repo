import { create } from 'zustand';
import type { DashboardSnapshot, MoodLog, MoodName } from '@/types/ipc';

type DashboardState = {
  snapshot: DashboardSnapshot | null;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  logMood: (mood: MoodName) => Promise<MoodLog>;
};

export const useDashboardStore = create<DashboardState>((set) => ({
  snapshot: null,
  loading: false,
  error: null,
  load: async () => {
    set({ loading: true, error: null });
    try {
      const snapshot = await window.avyukta.dashboard.getSnapshot();
      set({ snapshot, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load dashboard', loading: false });
    }
  },
  logMood: async (mood) => {
    const moodLog = await window.avyukta.mood.log({ mood });
    set((state) => ({
      snapshot: state.snapshot ? { ...state.snapshot, mood: moodLog } : state.snapshot
    }));
    return moodLog;
  }
}));
