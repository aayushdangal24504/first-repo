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
  TrashItem,
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
} from './ipc';

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
    avyukta: {
      auth: {
        getSession: () => Promise<{ user: AuthUser | null }>;
        register: (input: RegisterInput) => Promise<AuthResult>;
        login: (input: LoginInput) => Promise<AuthResult>;
        logout: () => Promise<{ ok: true }>;
        requestPasswordReset: (email: string) => Promise<{ ok: true }>;
        resetPassword: (input: { email: string; code: string; password: string }) => Promise<{ ok: true }>;
      };
      app: {
        getSnapshot: () => Promise<AppSnapshot>;
        getLocalPaths: () => Promise<LocalPaths>;
      };
      dashboard: {
        getSnapshot: () => Promise<DashboardSnapshot>;
      };
      mood: {
        log: (input: { mood: MoodName; note?: string }) => Promise<MoodLog>;
        getLatest: () => Promise<MoodLog | null>;
      };
      calendar: {
        getMonth: (input: CalendarMonthInput) => Promise<CalendarSnapshot>;
      };
      reminders: {
        list: () => Promise<Reminder[]>;
        create: (input: CreateReminderInput) => Promise<Reminder>;
        complete: (id: string) => Promise<Reminder>;
        delete: (id: string) => Promise<{ ok: true }>;
        snooze: (input: SnoozeReminderInput) => Promise<Reminder>;
        testNotification: () => Promise<{ ok: true }>;
        stopAlarm: (id: string) => Promise<{ ok: true }>;
        onAlarm: (callback: (reminder: Pick<Reminder, 'id' | 'title' | 'body' | 'priority' | 'category' | 'remindAt'>) => void) => () => void;
      };
      journals: {
        list: () => Promise<Journal[]>;
        create: (input: CreateJournalInput) => Promise<JournalBook>;
        update: (input: UpdateJournalInput) => Promise<JournalBook>;
        delete: (journalId: string) => Promise<{ ok: true }>;
        getBook: (journalId: string) => Promise<JournalBook>;
        createEntry: (journalId: string) => Promise<JournalEntry>;
        deleteEntry: (entryId: string) => Promise<{ ok: true; journalId: string }>;
        updateEntry: (input: UpdateJournalEntryInput) => Promise<JournalEntry>;
        importImages: (input: ImportJournalImagesInput) => Promise<JournalEntry>;
        exportBook: (input: ExportJournalInput) => Promise<ExportJournalResult>;
      };
      tasks: {
        list: () => Promise<Task[]>;
        create: (input: CreateTaskInput) => Promise<Task>;
        update: (input: UpdateTaskInput) => Promise<Task>;
        delete: (id: string) => Promise<{ ok: true }>;
      };
      notes: {
        list: () => Promise<Note[]>;
        create: (input: CreateNoteInput) => Promise<Note>;
        update: (input: UpdateNoteInput) => Promise<Note>;
        delete: (id: string) => Promise<{ ok: true }>;
      };
      memories: {
        list: () => Promise<Memory[]>;
        create: (input: CreateMemoryInput) => Promise<Memory>;
        update: (input: UpdateMemoryInput) => Promise<Memory>;
        delete: (id: string) => Promise<{ ok: true }>;
      };
      travel: {
        list: () => Promise<Trip[]>;
        create: (input: CreateTripInput) => Promise<Trip>;
        update: (input: UpdateTripInput) => Promise<Trip>;
        delete: (id: string) => Promise<{ ok: true }>;
        createDay: (input: CreateTripDayInput) => Promise<TripDay>;
        updateDay: (input: UpdateTripDayInput) => Promise<TripDay>;
        deleteDay: (id: string) => Promise<{ ok: true }>;
      };
      media: {
        list: () => Promise<MediaFile[]>;
        importImages: () => Promise<MediaFile[]>;
      };
      backups: {
        exportJson: () => Promise<BackupResult>;
      };
      trash: {
        list: () => Promise<TrashItem[]>;
        add: (entityType: string, entityId: string, entityData: unknown, title?: string | null) => Promise<TrashItem>;
        restore: (trashId: string) => Promise<{ ok: true; entityType: string; entityId: string; data: unknown }>;
        delete: (trashId: string) => Promise<{ ok: true }>;
        empty: () => Promise<{ ok: true }>;
        setRetentionDays: (days: number) => Promise<{ ok: true; days: number }>;
      };
    };
  }
}

export {};
