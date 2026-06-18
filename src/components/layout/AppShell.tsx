import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BellRing, Moon, SunMedium, X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { CommandPalette } from './CommandPalette';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { Button } from '@/components/ui/Button';
import { CalendarView } from '@/features/calendar/CalendarView';
import { JournalView } from '@/features/journal/JournalView';
import { MemoryVaultView } from '@/features/memories/MemoryVaultView';
import { NotesView } from '@/features/notes/NotesView';
import { RemindersView } from '@/features/reminders/RemindersView';
import { TasksView } from '@/features/tasks/TasksView';
import { TrashView } from '@/features/trash/TrashView';
import { TravelView } from '@/features/travel/TravelView';
import { primaryNavItems, systemNavItems } from '@/lib/navigation';
import { useUiStore } from '@/store/ui-store';
import { useAuthStore } from '@/store/auth-store';
import type { Reminder } from '@/types/ipc';

type ReminderAlarm = Pick<Reminder, 'id' | 'title' | 'body' | 'priority' | 'category' | 'remindAt'>;

export const AppShell = () => {
  const activeView = useUiStore((state) => state.activeView);
  const themeMode = useUiStore((state) => state.themeMode);
  const accent = useUiStore((state) => state.accent);
  const setThemeMode = useUiStore((state) => state.setThemeMode);
  const setCommandPaletteOpen = useUiStore((state) => state.setCommandPaletteOpen);
  const setActiveView = useUiStore((state) => state.setActiveView);
  const [alarm, setAlarm] = useState<ReminderAlarm | null>(null);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = themeMode === 'system' ? (prefersDark ? 'dark' : 'light') : themeMode;
    root.dataset.accent = accent;
  }, [themeMode, accent]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setCommandPaletteOpen]);

  useEffect(() => {
    const playAlarm = () => {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const gain = context.createGain();
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 1.2);
      gain.connect(context.destination);
      [0, 0.28, 0.56].forEach((offset) => {
        const oscillator = context.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, context.currentTime + offset);
        oscillator.connect(gain);
        oscillator.start(context.currentTime + offset);
        oscillator.stop(context.currentTime + offset + 0.18);
      });
      window.setTimeout(() => void context.close(), 1500);
    };

    const cleanup = window.avyukta?.reminders?.onAlarm?.((reminder) => {
      setAlarm(reminder);
      playAlarm();
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(reminder.title, { body: reminder.body ?? 'Reminder due now.' });
      }
    });
    return () => cleanup?.();
  }, []);

  const dismissAlarm = () => {
    if (alarm) void window.avyukta.reminders.stopAlarm(alarm.id);
    setAlarm(null);
  };

  const navItem = [...primaryNavItems, ...systemNavItems].find((item) => item.id === activeView);
  const showDashboard = activeView === 'dashboard';
  const showReminders = activeView === 'reminders';
  const showJournal = activeView === 'journal';
  const showTasks = activeView === 'tasks';
  const showNotes = activeView === 'notes';
  const showTrash = activeView === 'trash';
  const showCalendar = activeView === 'calendar';
  const showTravel = activeView === 'travel';
  const showMemories = activeView === 'memories';

  return (
    <div className="flex h-screen gap-5 p-5">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="drag-region flex h-16 items-center justify-between px-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-muted">Phase {navItem?.phase ?? 1}</p>
            <h1 className="font-display text-3xl font-bold">{navItem?.label ?? 'Dashboard'}</h1>
          </div>
          <div className="no-drag flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-line/70 bg-elevated/70 px-3 py-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-xs font-bold text-white">{user?.avatarInitials ?? 'U'}</span>
              <span className="max-w-[160px] truncate text-sm font-semibold">{user?.email}</span>
            </div>
            <Button variant="ghost" onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}>
              {themeMode === 'dark' ? <SunMedium className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
              {themeMode === 'dark' ? 'Light' : 'Dark'}
            </Button>
            <Button variant="primary" onClick={() => setActiveView('reminders')}>Create Reminder</Button>
            <Button variant="ghost" onClick={() => void logout()}>Logout</Button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4 pt-3">
          <AnimatePresence mode="wait">
            {showDashboard ? (
              <Dashboard key="dashboard" />
            ) : showTasks ? (
              <TasksView key="tasks" />
            ) : showNotes ? (
              <NotesView key="notes" />
            ) : showJournal ? (
              <JournalView key="journal" />
            ) : showCalendar ? (
              <CalendarView key="calendar" />
            ) : showTravel ? (
              <TravelView key="travel" />
            ) : showMemories ? (
              <MemoryVaultView key="memories" />
            ) : showTrash ? (
              <TrashView key="trash" />
            ) : showReminders ? (
              <RemindersView key="reminders" />
            ) : (
              <Dashboard key="dashboard-fallback" />
            )}
          </AnimatePresence>
        </div>
      </main>
      {alarm && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] rounded-[2rem] border border-accent/40 bg-elevated/95 p-5 shadow-glass backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent"><BellRing className="h-6 w-6" /></div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Reminder alarm</p>
              <h3 className="mt-1 font-display text-2xl font-bold">{alarm.title}</h3>
              <p className="mt-1 text-sm leading-6 text-muted">{alarm.body ?? 'Reminder due now.'}</p>
            </div>
            <button className="rounded-full p-2 text-muted transition hover:bg-surface/70 hover:text-ink" onClick={dismissAlarm} aria-label="Close alarm"><X className="h-4 w-4" /></button>
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="primary" className="h-9" onClick={() => { setActiveView('reminders'); dismissAlarm(); }}>Open Reminders</Button>
            <Button className="h-9" onClick={dismissAlarm}>Dismiss</Button>
          </div>
        </div>
      )}
      <CommandPalette />
    </div>
  );
};
