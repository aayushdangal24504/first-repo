import { create } from 'zustand';
import type { CreateTaskInput, Task, TaskStatus, UpdateTaskInput } from '@/types/ipc';

type TaskState = {
  tasks: Task[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  load: () => Promise<void>;
  create: (input: CreateTaskInput) => Promise<void>;
  update: (input: UpdateTaskInput) => Promise<void>;
  move: (id: string, status: TaskStatus) => Promise<void>;
  delete: (id: string) => Promise<void>;
};

const getApi = () => {
  if (!window.avyukta?.tasks) throw new Error('Task tools are not loaded. Restart the app with npm run dev.');
  return window.avyukta.tasks;
};

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,
  saving: false,
  error: null,
  load: async () => {
    set({ loading: true, error: null });
    try {
      set({ tasks: await getApi().list(), loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load tasks', loading: false });
    }
  },
  create: async (input) => {
    set({ saving: true, error: null });
    try {
      await getApi().create(input);
      await get().load();
      set({ saving: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create task', saving: false });
    }
  },
  update: async (input) => {
    set({ saving: true, error: null });
    try {
      await getApi().update(input);
      await get().load();
      set({ saving: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update task', saving: false });
    }
  },
  move: async (id, status) => get().update({ id, status, progress: status === 'done' ? 100 : undefined }),
  delete: async (id) => {
    await getApi().delete(id);
    await get().load();
  }
}));
