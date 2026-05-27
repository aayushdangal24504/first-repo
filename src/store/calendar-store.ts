import { create } from 'zustand';
import type { CalendarSnapshot } from '@/types/ipc';

type CalendarState = { snapshot: CalendarSnapshot | null; loading: boolean; error: string | null; load: (year: number, month: number) => Promise<void> };
const getApi = () => { if (!window.avyukta?.calendar) throw new Error('Calendar tools are not loaded. Restart the app with npm run dev.'); return window.avyukta.calendar; };
export const useCalendarStore = create<CalendarState>((set) => ({
  snapshot: null,
  loading: false,
  error: null,
  load: async (year, month) => {
    set({ loading: true, error: null });
    try { set({ snapshot: await getApi().getMonth({ year, month }), loading: false }); }
    catch (error) { set({ error: error instanceof Error ? error.message : 'Failed to load calendar', loading: false }); }
  }
}));
