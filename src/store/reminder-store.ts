import { create } from 'zustand';
import type { CreateReminderInput, Reminder, SnoozeReminderInput } from '@/types/ipc';

type ReminderState = {
  reminders: Reminder[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  load: () => Promise<void>;
  create: (input: CreateReminderInput) => Promise<void>;
  complete: (id: string) => Promise<void>;
  delete: (id: string) => Promise<void>;
  snooze: (input: SnoozeReminderInput) => Promise<void>;
  testNotification: () => Promise<void>;
  stopAlarm: (id: string) => Promise<void>;
};

export const useReminderStore = create<ReminderState>((set, get) => ({
  reminders: [],
  loading: false,
  saving: false,
  error: null,
  load: async () => {
    set({ loading: true, error: null });
    try {
      const reminders = await window.avyukta.reminders.list();
      set({ reminders, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load reminders', loading: false });
    }
  },
  create: async (input) => {
    set({ saving: true, error: null });
    try {
      await window.avyukta.reminders.create(input);
      await get().load();
      set({ saving: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create reminder', saving: false });
    }
  },
  complete: async (id) => {
    await window.avyukta.reminders.complete(id);
    await get().load();
  },
  delete: async (id) => {
    await window.avyukta.reminders.delete(id);
    await get().load();
  },
  snooze: async (input) => {
    await window.avyukta.reminders.snooze(input);
    await get().load();
  },
  testNotification: async () => {
    await window.avyukta.reminders.testNotification();
  },
  stopAlarm: async (id) => {
    await window.avyukta.reminders.stopAlarm(id);
  }
}));
