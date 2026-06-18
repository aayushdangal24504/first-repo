import { create } from 'zustand';
import type {
  CreateJournalInput,
  ExportJournalInput,
  ExportJournalResult,
  Journal,
  JournalBook,
  JournalEntry,
  UpdateJournalEntryInput,
  UpdateJournalInput
} from '@/types/ipc';

type JournalState = {
  journals: Journal[];
  activeBook: JournalBook | null;
  selectedPageIndex: number;
  loading: boolean;
  saving: boolean;
  error: string | null;
  loadJournals: () => Promise<void>;
  createJournal: (input: CreateJournalInput) => Promise<void>;
  updateJournal: (input: UpdateJournalInput) => Promise<void>;
  deleteJournal: (journalId: string) => Promise<void>;
  exportBook: (input: ExportJournalInput) => Promise<ExportJournalResult | null>;
  openJournal: (journalId: string, entryId?: string) => Promise<void>;
  createPage: () => Promise<void>;
  deletePage: (entryId: string) => Promise<void>;
  updateEntry: (input: UpdateJournalEntryInput) => Promise<void>;
  importImages: (entryId: string) => Promise<void>;
  setSelectedPageIndex: (index: number) => void;
};

const replaceEntry = (book: JournalBook, entry: JournalEntry): JournalBook => ({
  ...book,
  entries: book.entries.map((current) => (current.id === entry.id ? entry : current))
});

const getJournalApi = () => {
  if (!window.avyukta?.journals) {
    throw new Error('Journal tools are not loaded yet. Quit Avyukta Life and run npm run dev again so the Electron backend restarts.');
  }

  return window.avyukta.journals;
};

export const useJournalStore = create<JournalState>((set, get) => ({
  journals: [],
  activeBook: null,
  selectedPageIndex: 0,
  loading: false,
  saving: false,
  error: null,
  loadJournals: async () => {
    set({ activeBook: null, selectedPageIndex: 0, loading: true, error: null });
    try {
      const journals = await getJournalApi().list();
      set({ journals, loading: false });
      if (journals[0]) {
        await get().openJournal(journals[0].id);
      }
    } catch (error) {
      set({ activeBook: null, journals: [], selectedPageIndex: 0, error: error instanceof Error ? error.message : 'Failed to load journals', loading: false });
    }
  },
  createJournal: async (input) => {
    set({ activeBook: null, selectedPageIndex: 0, saving: true, error: null });
    try {
      const activeBook = await getJournalApi().create(input);
      const journals = await getJournalApi().list();
      set({ activeBook, journals, selectedPageIndex: 0, saving: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create journal', saving: false });
    }
  },
  updateJournal: async (input) => {
    set({ saving: true, error: null });
    try {
      const activeBook = await getJournalApi().update(input);
      const journals = await getJournalApi().list();
      set({ activeBook, journals, saving: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update journal', saving: false });
    }
  },
  deleteJournal: async (journalId) => {
    set({ saving: true, error: null });
    try {
      await getJournalApi().delete(journalId);
      const journals = await getJournalApi().list();
      set({ journals, activeBook: null, selectedPageIndex: 0, saving: false });
      if (journals[0]) await get().openJournal(journals[0].id);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete journal', saving: false });
    }
  },
  exportBook: async (input) => {
    set({ saving: true, error: null });
    try {
      const result = await getJournalApi().exportBook(input);
      set({ saving: false });
      return result;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to export journal', saving: false });
      return null;
    }
  },
  openJournal: async (journalId, entryId) => {
    set({ loading: true, error: null });
    try {
      const activeBook = await getJournalApi().getBook(journalId);
      const selectedPageIndex = entryId ? Math.max(0, activeBook.entries.findIndex((entry) => entry.id === entryId)) : 0;
      set({ activeBook, selectedPageIndex, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to open journal', loading: false });
    }
  },
  createPage: async () => {
    const activeBook = get().activeBook;
    if (!activeBook) return;

    set({ saving: true, error: null });
    try {
      const entry = await getJournalApi().createEntry(activeBook.journal.id);
      const newEntries = [...activeBook.entries, entry];
      const newPageIndex = newEntries.length - 1;
      set({
        activeBook: { ...activeBook, entries: newEntries },
        selectedPageIndex: newPageIndex,
        saving: false
      });
      // Update journals list but preserve the current page selection
      const journals = await getJournalApi().list();
      set({ journals });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create page', saving: false });
    }
  },
  deletePage: async (entryId) => {
    const activeBook = get().activeBook;
    if (!activeBook) return;
    set({ saving: true, error: null });
    try {
      const result = await getJournalApi().deleteEntry(entryId);
      const nextBook = await getJournalApi().getBook(result.journalId);
      set({ activeBook: nextBook, selectedPageIndex: Math.max(0, Math.min(get().selectedPageIndex, nextBook.entries.length - 1)), saving: false });
      await get().loadJournals();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete page', saving: false });
    }
  },
  updateEntry: async (input) => {
    const activeBook = get().activeBook;
    if (!activeBook) return;

    set({ saving: true, error: null });
    try {
      const entry = await getJournalApi().updateEntry(input);
      set({ activeBook: replaceEntry(activeBook, entry), saving: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to save page', saving: false });
    }
  },
  importImages: async (entryId) => {
    const activeBook = get().activeBook;
    if (!activeBook) return;

    set({ saving: true, error: null });
    try {
      const entry = await getJournalApi().importImages({ entryId });
      set({ activeBook: replaceEntry(activeBook, entry), saving: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to add photos', saving: false });
    }
  },
  setSelectedPageIndex: (selectedPageIndex) => set({ selectedPageIndex })
}));
