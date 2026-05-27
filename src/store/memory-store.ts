import { create } from 'zustand';
import type { CreateMemoryInput, Memory, UpdateMemoryInput } from '@/types/ipc';

type MemoryState = { memories: Memory[]; loading: boolean; saving: boolean; error: string | null; load: () => Promise<void>; create: (input: CreateMemoryInput) => Promise<boolean>; update: (input: UpdateMemoryInput) => Promise<void>; delete: (id: string) => Promise<void> };
const getApi = () => { if (!window.avyukta?.memories) throw new Error('Memory tools are not loaded. Restart the app with npm run dev.'); return window.avyukta.memories; };
export const useMemoryStore = create<MemoryState>((set, get) => ({
  memories: [], loading: false, saving: false, error: null,
  load: async () => { set({ loading: true, error: null }); try { set({ memories: await getApi().list(), loading: false }); } catch (error) { set({ error: error instanceof Error ? error.message : 'Failed to load memories', loading: false }); } },
  create: async (input) => { set({ saving: true, error: null }); try { await getApi().create(input); await get().load(); set({ saving: false }); return true; } catch (error) { set({ error: error instanceof Error ? error.message : 'Failed to save memory', saving: false }); return false; } },
  update: async (input) => { set({ saving: true, error: null }); try { await getApi().update(input); await get().load(); set({ saving: false }); } catch (error) { set({ error: error instanceof Error ? error.message : 'Failed to update memory', saving: false }); } },
  delete: async (id) => { await getApi().delete(id); await get().load(); }
}));
