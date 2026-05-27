import { create } from 'zustand';
import type { CreateNoteInput, Note, UpdateNoteInput } from '@/types/ipc';

type NoteState = {
  notes: Note[];
  activeNoteId: string | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  load: () => Promise<void>;
  create: (input: CreateNoteInput) => Promise<void>;
  update: (input: UpdateNoteInput) => Promise<void>;
  delete: (id: string) => Promise<void>;
  setActiveNoteId: (id: string | null) => void;
};

const getApi = () => {
  if (!window.avyukta?.notes) throw new Error('Note tools are not loaded. Restart the app with npm run dev.');
  return window.avyukta.notes;
};

export const useNoteStore = create<NoteState>((set, get) => ({
  notes: [],
  activeNoteId: null,
  loading: false,
  saving: false,
  error: null,
  load: async () => {
    set({ loading: true, error: null });
    try {
      const notes = await getApi().list();
      set((state) => ({ notes, activeNoteId: state.activeNoteId ?? notes[0]?.id ?? null, loading: false }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load notes', loading: false });
    }
  },
  create: async (input) => {
    set({ saving: true, error: null });
    try {
      const note = await getApi().create(input);
      await get().load();
      set({ activeNoteId: note.id, saving: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create note', saving: false });
    }
  },
  update: async (input) => {
    set({ saving: true, error: null });
    try {
      const note = await getApi().update(input);
      set((state) => ({ notes: state.notes.map((current) => (current.id === note.id ? note : current)), saving: false }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to save note', saving: false });
    }
  },
  delete: async (id) => {
    await getApi().delete(id);
    set({ activeNoteId: null });
    await get().load();
  },
  setActiveNoteId: (activeNoteId) => set({ activeNoteId })
}));
