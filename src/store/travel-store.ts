import { create } from 'zustand';
import type { CreateTripDayInput, CreateTripInput, Trip, UpdateTripDayInput, UpdateTripInput } from '@/types/ipc';

type TravelState = { trips: Trip[]; selectedTripId: string | null; loading: boolean; saving: boolean; error: string | null; load: () => Promise<void>; select: (id: string) => void; create: (input: CreateTripInput) => Promise<void>; update: (input: UpdateTripInput) => Promise<void>; delete: (id: string) => Promise<void>; createDay: (input: CreateTripDayInput) => Promise<void>; updateDay: (input: UpdateTripDayInput) => Promise<void>; deleteDay: (id: string) => Promise<void> };
const getApi = () => { if (!window.avyukta?.travel) throw new Error('Travel tools are not loaded. Restart the app with npm run dev.'); return window.avyukta.travel; };
export const useTravelStore = create<TravelState>((set, get) => ({
  trips: [], selectedTripId: null, loading: false, saving: false, error: null,
  load: async () => { set({ loading: true, error: null }); try { const trips = await getApi().list(); set((state) => ({ trips, selectedTripId: state.selectedTripId ?? trips[0]?.id ?? null, loading: false })); } catch (error) { set({ error: error instanceof Error ? error.message : 'Failed to load trips', loading: false }); } },
  select: (id) => set({ selectedTripId: id }),
  create: async (input) => { set({ saving: true, error: null }); try { const trip = await getApi().create(input); await get().load(); set({ selectedTripId: trip.id, saving: false }); } catch (error) { set({ error: error instanceof Error ? error.message : 'Failed to create trip', saving: false }); } },
  update: async (input) => { set({ saving: true, error: null }); try { await getApi().update(input); await get().load(); set({ saving: false }); } catch (error) { set({ error: error instanceof Error ? error.message : 'Failed to update trip', saving: false }); } },
  delete: async (id) => { await getApi().delete(id); set({ selectedTripId: null }); await get().load(); },
  createDay: async (input) => { await getApi().createDay(input); await get().load(); },
  updateDay: async (input) => { await getApi().updateDay(input); await get().load(); },
  deleteDay: async (id) => { await getApi().deleteDay(id); await get().load(); }
}));
