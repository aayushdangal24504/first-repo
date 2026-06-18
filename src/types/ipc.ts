export type LocalPaths = {
  rootPath: string;
  databasePath: string;
  mediaPath: string;
  backupsPath: string;
  exportsPath: string;
  tempPath: string;
};

export type AppSnapshot = {
  appName: string;
  storageMode: 'fully-local';
  localPaths: LocalPaths;
  phase: string;
};

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  avatarInitials: string;
  createdAt: string;
  lastLoginAt: string | null;
};

export type AuthResult = {
  user: AuthUser;
  sessionToken: string;
};

export type LoginInput = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

export type RegisterInput = LoginInput & {
  displayName?: string;
};

export type DashboardTask = {
  id: string;
  title: string;
  priority: number;
  dueAt: string | null;
  status: string;
  progress: number;
};

export type DashboardNote = {
  id: string;
  title: string;
  summary: string | null;
  updatedAt: string;
};

export type DashboardJournalEntry = {
  id: string;
  title: string | null;
  entryDate: string;
  mood: string | null;
  locationLabel: string | null;
};

export type DashboardReminder = {
  id: string;
  title: string;
  remindAt: string;
  body: string | null;
  priority: ReminderPriority;
};

export type MoodName = 'calm' | 'focused' | 'grateful' | 'curious' | 'tired' | 'stressed' | 'happy' | 'low';

export type MoodLog = {
  id: string;
  mood: MoodName;
  quote: string;
  note: string | null;
  loggedAt: string;
  createdAt: string;
};

export type ReminderRepeat = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
export type ReminderPriority = 'low' | 'normal' | 'high';
export type ReminderMode = 'standard' | 'event';

export type Reminder = {
  id: string;
  title: string;
  body: string | null;
  remindAt: string;
  recurrenceRule: ReminderRepeat;
  customRecurrencePattern: string | null; // e.g., "RRULE:FREQ=WEEKLY;BYDAY=FR"
  mode: ReminderMode;
  eventKind: 'birthday' | 'anniversary' | 'event' | null;
  dateOfBirth: string | null;
  notifyLikeAlarm: boolean;
  snoozedUntil: string | null;
  category: string | null;
  priority: ReminderPriority;
  lastNotifiedAt: string | null;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateReminderInput = {
  title: string;
  body?: string;
  remindAt: string;
  recurrenceRule?: ReminderRepeat;
  customRecurrencePattern?: string; // e.g., "RRULE:FREQ=WEEKLY;BYDAY=FR"
  mode?: ReminderMode;
  eventKind?: 'birthday' | 'anniversary' | 'event';
  dateOfBirth?: string | null;
  notifyLikeAlarm?: boolean;
  category?: string;
  priority?: ReminderPriority;
};

export type SnoozeReminderInput = {
  id: string;
  minutes: number;
};

export type JournalKind = 'daily' | 'travel' | 'memory' | 'thoughts' | 'custom';

export type MediaFile = {
  id: string;
  originalName: string;
  storedName: string;
  relativePath: string;
  fileUrl: string;
  dataUrl: string | null;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  createdAt: string;
};

export type JournalEntryImage = MediaFile & {
  sortOrder: number;
  caption: string | null;
};

export type JournalPageBlockType = 'text' | 'image' | 'note';

export type JournalPageBlock = {
  id: string;
  type: JournalPageBlockType;
  text?: string;
  mediaId?: string;
  image?: JournalEntryImage;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
};

export type Journal = {
  id: string;
  title: string;
  kind: JournalKind;
  coverMediaId: string | null;
  coverColor: string | null;
  templateId: string | null;
  entryCount: number;
  createdAt: string;
  updatedAt: string;
};

export type JournalEntry = {
  id: string;
  journalId: string;
  entryDate: string;
  title: string | null;
  text: string;
  mood: string | null;
  weather: string | null;
  locationLabel: string | null;
  layout: Record<string, unknown>;
  blocks: JournalPageBlock[];
  isFavorite: boolean;
  images: JournalEntryImage[];
  createdAt: string;
  updatedAt: string;
};

export type JournalBook = {
  journal: Journal;
  entries: JournalEntry[];
};

export type CreateJournalInput = {
  title: string;
  kind?: JournalKind;
  coverColor?: string;
};

export type UpdateJournalEntryInput = {
  id: string;
  title?: string | null;
  text?: string;
  blocks?: JournalPageBlock[];
  mood?: string | null;
  weather?: string | null;
  locationLabel?: string | null;
  entryDate?: string;
  isFavorite?: boolean;
};

export type ImportJournalImagesInput = {
  entryId: string;
};

export type UpdateJournalInput = {
  id: string;
  title?: string;
  kind?: JournalKind;
  coverColor?: string;
};

export type ExportJournalInput = {
  journalId: string;
  format: 'pdf' | 'docx';
};

export type ExportJournalResult = {
  ok: true;
  path: string;
  format: 'pdf' | 'docx';
};

export type TaskStatus = 'inbox' | 'planned' | 'doing' | 'waiting' | 'done' | 'archived';

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: number;
  dueAt: string | null;
  startAt: string | null;
  completedAt: string | null;
  recurrenceRule: string | null;
  progress: number;
  parentTaskId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateTaskInput = {
  title: string;
  description?: string;
  priority?: number;
  dueAt?: string | null;
  status?: TaskStatus;
};

export type UpdateTaskInput = {
  id: string;
  title?: string;
  description?: string | null;
  priority?: number;
  dueAt?: string | null;
  status?: TaskStatus;
  progress?: number;
};

export type Note = {
  id: string;
  folderId: string | null;
  title: string;
  summary: string | null;
  html: string;
  coverMediaId: string | null;
  isPinned: boolean;
  isFavorite: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateNoteInput = {
  title: string;
};

export type UpdateNoteInput = {
  id: string;
  title?: string;
  html?: string;
  isPinned?: boolean;
  isFavorite?: boolean;
};

export type BackupResult = {
  ok: true;
  path: string;
  createdAt: string;
  tables: string[];
};

export type DashboardSnapshot = {
  quoteOfTheDay: string;
  todayTasks: DashboardTask[];
  recentNotes: DashboardNote[];
  recentJournalEntries: DashboardJournalEntry[];
  upcomingReminders: DashboardReminder[];
  mood: MoodLog | null;
  stats: {
    openTasks: number;
    notes: number;
    journalEntries: number;
    mediaFiles: number;
  };
};

export type CalendarEventType = 'task' | 'reminder' | 'journal' | 'trip' | 'memory';

export type CalendarEventItem = {
  id: string;
  title: string;
  date: string;
  type: CalendarEventType;
  subtitle: string | null;
  targetId: string | null;
};

export type CalendarMonthInput = {
  year: number;
  month: number;
};

export type CalendarSnapshot = {
  year: number;
  month: number;
  start: string;
  end: string;
  items: CalendarEventItem[];
};

export type Memory = {
  id: string;
  title: string;
  memoryDate: string | null;
  year: number | null;
  category: string | null;
  content: { text: string };
  emotionalTags: string[];
  coverMediaId: string | null;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateMemoryInput = {
  title: string;
  memoryDate?: string | null;
  category?: string;
  text?: string;
  emotionalTags?: string[];
  isFavorite?: boolean;
};

export type UpdateMemoryInput = Partial<CreateMemoryInput> & {
  id: string;
};

export type TripExpense = {
  label: string;
  amount: number;
  currency: string;
};

export type TripDay = {
  id: string;
  tripId: string;
  dayDate: string;
  title: string | null;
  entry: { text: string };
  activities?: string | null;
  plans?: string | null;
  placesVisited?: string[];
  foodTried?: string[];
  highlights?: string | null;
  notes?: string | null;
  expenses: TripExpense[];
  packing: string[];
  createdAt: string;
  updatedAt: string;
};

export type Trip = {
  id: string;
  title: string;
  destination: string | null;
  startsAt: string | null;
  endsAt: string | null;
  coverMediaId: string | null;
  notes: string | null;
  favoriteMoment: string | null;
  days: TripDay[];
  createdAt: string;
  updatedAt: string;
};

export type CreateTripInput = {
  title: string;
  destination?: string;
  startsAt?: string | null;
  endsAt?: string | null;
  notes?: string;
  favoriteMoment?: string;
};

export type UpdateTripInput = Partial<CreateTripInput> & {
  id: string;
};

export type CreateTripDayInput = {
  tripId: string;
  dayDate: string;
  title?: string;
  text?: string;
  activities?: string;
  plans?: string;
  placesVisited?: string[];
  foodTried?: string[];
  highlights?: string;
  notes?: string;
  packing?: string[];
};

export type UpdateTripDayInput = {
  id: string;
  dayDate?: string;
  title?: string | null;
  text?: string;
  activities?: string | null;
  plans?: string | null;
  placesVisited?: string[];
  foodTried?: string[];
  highlights?: string | null;
  notes?: string | null;
  expenses?: TripExpense[];
  packing?: string[];
};

export type TrashItem = {
  id: string;
  entityType: 'journal' | 'journal_entry' | 'note' | 'task' | 'reminder' | 'trip' | 'trip_day' | 'memory' | 'media';
  entityId: string;
  title: string | null;
  deletedAt: string;
  createdAt: string;
  updatedAt: string;
};
