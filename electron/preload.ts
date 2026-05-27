import { contextBridge, ipcRenderer } from 'electron';
import type {
  AppSnapshot,
  AuthResult,
  AuthUser,
  BackupResult,
  CalendarMonthInput,
  CalendarSnapshot,
  CreateJournalInput,
  CreateMemoryInput,
  CreateNoteInput,
  CreateReminderInput,
  CreateTaskInput,
  CreateTripDayInput,
  CreateTripInput,
  DashboardSnapshot,
  ExportJournalInput,
  ExportJournalResult,
  ImportJournalImagesInput,
  Journal,
  JournalBook,
  JournalEntry,
  LocalPaths,
  LoginInput,
  MediaFile,
  Memory,
  MoodLog,
  MoodName,
  Note,
  Reminder,
  RegisterInput,
  SnoozeReminderInput,
  Trip,
  TripDay,
  Task,
  UpdateJournalEntryInput,
  UpdateJournalInput,
  UpdateMemoryInput,
  UpdateNoteInput,
  UpdateTaskInput,
  UpdateTripDayInput,
  UpdateTripInput
} from '../src/types/ipc';

const api = {
  auth: {
    getSession: (): Promise<{ user: AuthUser | null }> => ipcRenderer.invoke('auth:get-session'),
    register: (input: RegisterInput): Promise<AuthResult> => ipcRenderer.invoke('auth:register', input),
    login: (input: LoginInput): Promise<AuthResult> => ipcRenderer.invoke('auth:login', input),
    logout: (): Promise<{ ok: true }> => ipcRenderer.invoke('auth:logout'),
    requestPasswordReset: (email: string): Promise<{ ok: true }> => ipcRenderer.invoke('auth:request-password-reset', email),
    resetPassword: (input: { email: string; code: string; password: string }): Promise<{ ok: true }> => ipcRenderer.invoke('auth:reset-password', input)
  },
  app: {
    getSnapshot: (): Promise<AppSnapshot> => ipcRenderer.invoke('app:get-snapshot'),
    getLocalPaths: (): Promise<LocalPaths> => ipcRenderer.invoke('app:get-local-paths')
  },
  dashboard: {
    getSnapshot: (): Promise<DashboardSnapshot> => ipcRenderer.invoke('dashboard:get-snapshot')
  },
  mood: {
    log: (input: { mood: MoodName; note?: string }): Promise<MoodLog> => ipcRenderer.invoke('mood:log', input),
    getLatest: (): Promise<MoodLog | null> => ipcRenderer.invoke('mood:get-latest')
  },
  calendar: {
    getMonth: (input: CalendarMonthInput): Promise<CalendarSnapshot> => ipcRenderer.invoke('calendar:get-month', input)
  },
  reminders: {
    list: (): Promise<Reminder[]> => ipcRenderer.invoke('reminders:list'),
    create: (input: CreateReminderInput): Promise<Reminder> => ipcRenderer.invoke('reminders:create', input),
    complete: (id: string): Promise<Reminder> => ipcRenderer.invoke('reminders:complete', id),
    delete: (id: string): Promise<{ ok: true }> => ipcRenderer.invoke('reminders:delete', id),
    snooze: (input: SnoozeReminderInput): Promise<Reminder> => ipcRenderer.invoke('reminders:snooze', input),
    testNotification: (): Promise<{ ok: true }> => ipcRenderer.invoke('reminders:test-notification'),
    stopAlarm: (id: string): Promise<{ ok: true }> => ipcRenderer.invoke('reminders:stop-alarm', id),
    onAlarm: (callback: (reminder: Pick<Reminder, 'id' | 'title' | 'body' | 'priority' | 'category' | 'remindAt'>) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, reminder: Pick<Reminder, 'id' | 'title' | 'body' | 'priority' | 'category' | 'remindAt'>) => callback(reminder);
      ipcRenderer.on('reminders:alarm', listener);
      return () => ipcRenderer.removeListener('reminders:alarm', listener);
    }
  },
  journals: {
    list: (): Promise<Journal[]> => ipcRenderer.invoke('journals:list'),
    create: (input: CreateJournalInput): Promise<JournalBook> => ipcRenderer.invoke('journals:create', input),
    update: (input: UpdateJournalInput): Promise<JournalBook> => ipcRenderer.invoke('journals:update', input),
    delete: (journalId: string): Promise<{ ok: true }> => ipcRenderer.invoke('journals:delete', journalId),
    getBook: (journalId: string): Promise<JournalBook> => ipcRenderer.invoke('journals:get-book', journalId),
    createEntry: (journalId: string): Promise<JournalEntry> => ipcRenderer.invoke('journals:create-entry', journalId),
    deleteEntry: (entryId: string): Promise<{ ok: true; journalId: string }> => ipcRenderer.invoke('journals:delete-entry', entryId),
    updateEntry: (input: UpdateJournalEntryInput): Promise<JournalEntry> => ipcRenderer.invoke('journals:update-entry', input),
    importImages: (input: ImportJournalImagesInput): Promise<JournalEntry> => ipcRenderer.invoke('journals:import-images', input),
    exportBook: (input: ExportJournalInput): Promise<ExportJournalResult> => ipcRenderer.invoke('journals:export-book', input)
  },
  tasks: {
    list: (): Promise<Task[]> => ipcRenderer.invoke('tasks:list'),
    create: (input: CreateTaskInput): Promise<Task> => ipcRenderer.invoke('tasks:create', input),
    update: (input: UpdateTaskInput): Promise<Task> => ipcRenderer.invoke('tasks:update', input),
    delete: (id: string): Promise<{ ok: true }> => ipcRenderer.invoke('tasks:delete', id)
  },
  notes: {
    list: (): Promise<Note[]> => ipcRenderer.invoke('notes:list'),
    create: (input: CreateNoteInput): Promise<Note> => ipcRenderer.invoke('notes:create', input),
    update: (input: UpdateNoteInput): Promise<Note> => ipcRenderer.invoke('notes:update', input),
    delete: (id: string): Promise<{ ok: true }> => ipcRenderer.invoke('notes:delete', id)
  },
  memories: {
    list: (): Promise<Memory[]> => ipcRenderer.invoke('memories:list'),
    create: (input: CreateMemoryInput): Promise<Memory> => ipcRenderer.invoke('memories:create', input),
    update: (input: UpdateMemoryInput): Promise<Memory> => ipcRenderer.invoke('memories:update', input),
    delete: (id: string): Promise<{ ok: true }> => ipcRenderer.invoke('memories:delete', id)
  },
  travel: {
    list: (): Promise<Trip[]> => ipcRenderer.invoke('travel:list'),
    create: (input: CreateTripInput): Promise<Trip> => ipcRenderer.invoke('travel:create', input),
    update: (input: UpdateTripInput): Promise<Trip> => ipcRenderer.invoke('travel:update', input),
    delete: (id: string): Promise<{ ok: true }> => ipcRenderer.invoke('travel:delete', id),
    createDay: (input: CreateTripDayInput): Promise<TripDay> => ipcRenderer.invoke('travel:create-day', input),
    updateDay: (input: UpdateTripDayInput): Promise<TripDay> => ipcRenderer.invoke('travel:update-day', input),
    deleteDay: (id: string): Promise<{ ok: true }> => ipcRenderer.invoke('travel:delete-day', id)
  },
  media: {
    list: (): Promise<MediaFile[]> => ipcRenderer.invoke('media:list'),
    importImages: (): Promise<MediaFile[]> => ipcRenderer.invoke('media:import-images')
  },
  backups: {
    exportJson: (): Promise<BackupResult> => ipcRenderer.invoke('backups:export-json')
  }
};

contextBridge.exposeInMainWorld('avyukta', api);

export type AvyuktaApi = typeof api;
