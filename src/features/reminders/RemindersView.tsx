import { FormEvent, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { addMinutes, format, formatDistanceToNow } from 'date-fns';
import { AlarmClock, BellRing, Cake, CheckCircle2, Clock3, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { useReminderStore } from '@/store/reminder-store';
import type { Reminder, ReminderPriority, ReminderRepeat } from '@/types/ipc';

const toDateTimeLocal = (date: Date): string => {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const priorityOptions: Array<{ value: ReminderPriority; label: string }> = [
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'Important' },
  { value: 'low', label: 'Gentle' }
];

const repeatOptions: Array<{ value: ReminderRepeat; label: string }> = [
  { value: 'none', label: 'Once' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly (Birthdays, Anniversaries)' },
  { value: 'custom', label: 'Custom (Advanced)' }
];

export const RemindersView = () => {
  const { reminders, loading, saving, error, load, create, complete, delete: deleteReminder, snooze, testNotification } = useReminderStore();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [remindAt, setRemindAt] = useState(() => toDateTimeLocal(addMinutes(new Date(), 15)));
  const [recurrenceRule, setRecurrenceRule] = useState<ReminderRepeat>('none');
  const [priority, setPriority] = useState<ReminderPriority>('normal');
  const [category, setCategory] = useState('Personal');
  const [notifyLikeAlarm, setNotifyLikeAlarm] = useState(false);
  const [eventsMode, setEventsMode] = useState(false);
  const [eventKind, setEventKind] = useState<'birthday' | 'anniversary' | 'event'>('birthday');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [permissionStatus, setPermissionStatus] = useState(() => ('Notification' in window ? Notification.permission : 'unsupported'));

  useEffect(() => {
    void load();
  }, [load]);

  // Listen for notification clicks to navigate to reminder
  useEffect(() => {
    const handleReminderNavigation = (reminderId: string) => {
      // Highlight the reminder by scrolling to it
      const element = document.getElementById(`reminder-${reminderId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-2', 'ring-accent', 'ring-offset-2');
        setTimeout(() => element.classList.remove('ring-2', 'ring-accent', 'ring-offset-2'), 3000);
      }
    };

    window.addEventListener('reminder:navigate', ((event: CustomEvent) => handleReminderNavigation(event.detail)) as EventListener);
    
    return () => {
      window.removeEventListener('reminder:navigate', ((event: CustomEvent) => handleReminderNavigation(event.detail)) as EventListener);
    };
  }, []);

  const activeReminders = useMemo(() => reminders.filter((reminder) => !reminder.isCompleted), [reminders]);
  const completedReminders = useMemo(() => reminders.filter((reminder) => reminder.isCompleted).slice(0, 5), [reminders]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await create({
      title,
      body,
      remindAt: new Date(remindAt).toISOString(),
      recurrenceRule: eventsMode && eventKind === 'birthday' ? 'yearly' : recurrenceRule,
      priority,
      category: eventsMode ? 'Events' : category,
      notifyLikeAlarm,
      mode: eventsMode ? 'event' : 'standard',
      eventKind: eventsMode ? eventKind : undefined,
      dateOfBirth: eventsMode && eventKind === 'birthday' ? dateOfBirth || null : null
    });
    setTitle('');
    setBody('');
    setRemindAt(toDateTimeLocal(addMinutes(new Date(), 15)));
    setRecurrenceRule('none');
    setPriority('normal');
    setNotifyLikeAlarm(false);
    setEventsMode(false);
    setEventKind('birthday');
    setDateOfBirth('');
  };

  const enableNotifications = async () => {
    if (!('Notification' in window)) {
      setPermissionStatus('unsupported');
      return;
    }
    const permission = await Notification.requestPermission();
    setPermissionStatus(permission);
  };

  return (
    <motion.div className="grid grid-cols-[0.85fr_1.15fr] gap-6" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-accent">Local Alarm Center</p>
              <h2 className="mt-2 font-display text-4xl font-bold">Reminders that live on your Mac.</h2>
              <p className="mt-3 text-sm leading-7 text-muted">Create a reminder, keep this app running, and macOS will show a local desktop notification when it is due.</p>
            </div>
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-3xl bg-accent/15 text-accent">
              <BellRing className="h-7 w-7" />
            </div>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button className="w-full justify-center gap-2" onClick={() => void enableNotifications()}>
            <BellRing className="h-4 w-4" />
            Enable Notifications
          </Button>
          <Button className="w-full justify-center gap-2" onClick={() => void testNotification()}>
            <AlarmClock className="h-4 w-4" />
            Test Alarm Now
          </Button>
          </div>
          <p className="mt-3 rounded-2xl bg-surface/45 p-3 text-xs font-semibold text-muted">Notification permission: {permissionStatus}. The in-app alarm sound works while Avyukta Life is open.</p>
        </Card>

        <Card className="p-6">
          <h3 className="font-display text-2xl font-bold">New Reminder</h3>
          <form className="mt-5 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Title</span>
              <input className="mt-2 w-full rounded-2xl border border-line/70 bg-surface/60 px-4 py-3 text-sm outline-none transition focus:border-accent" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Drink water, call mom, submit assignment..." required />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Notes</span>
              <textarea className="mt-2 min-h-24 w-full resize-none rounded-2xl border border-line/70 bg-surface/60 px-4 py-3 text-sm outline-none transition focus:border-accent" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Add details so future-you knows what this is about." />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Alarm Time</span>
              <input className="mt-2 w-full rounded-2xl border border-line/70 bg-surface/60 px-4 py-3 text-sm outline-none transition focus:border-accent" type="datetime-local" value={remindAt} onChange={(event) => setRemindAt(event.target.value)} required />
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[5, 15, 60].map((minutes) => (
                <button key={minutes} type="button" className="rounded-2xl border border-line/70 bg-surface/45 px-3 py-2 text-xs font-bold text-muted transition hover:border-accent/60 hover:text-ink" onClick={() => setRemindAt(toDateTimeLocal(addMinutes(new Date(), minutes)))}>
                  In {minutes < 60 ? `${minutes}m` : '1h'}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Priority</span>
                <select className="mt-2 w-full rounded-2xl border border-line/70 bg-surface/60 px-4 py-3 text-sm outline-none transition focus:border-accent" value={priority} onChange={(event) => setPriority(event.target.value as ReminderPriority)}>
                  {priorityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Repeat</span>
                <select className="mt-2 w-full rounded-2xl border border-line/70 bg-surface/60 px-4 py-3 text-sm outline-none transition focus:border-accent" value={recurrenceRule} onChange={(event) => setRecurrenceRule(event.target.value as ReminderRepeat)}>
                  {repeatOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </div>
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-line/70 bg-surface/45 px-4 py-3 text-sm font-semibold">
              <span className="flex items-center gap-2"><AlarmClock className="h-4 w-4 text-accent" />Notify like alarm</span>
              <input type="checkbox" checked={notifyLikeAlarm} onChange={(event) => setNotifyLikeAlarm(event.target.checked)} />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-line/70 bg-surface/45 px-4 py-3 text-sm font-semibold">
              <span className="flex items-center gap-2"><Cake className="h-4 w-4 text-accent" />Events / Birthdays Mode</span>
              <input type="checkbox" checked={eventsMode} onChange={(event) => setEventsMode(event.target.checked)} />
            </label>
            {eventsMode && (
              <div className="space-y-3 rounded-2xl border border-line/70 bg-surface/35 p-3">
                <select className="w-full rounded-2xl border border-line/70 bg-surface/60 px-4 py-3 text-sm outline-none transition focus:border-accent" value={eventKind} onChange={(event) => setEventKind(event.target.value as typeof eventKind)}>
                  <option value="birthday">Birthday</option>
                  <option value="anniversary">Anniversary</option>
                  <option value="event">Repeating event</option>
                </select>
                {eventKind === 'birthday' && (
                  <input className="w-full rounded-2xl border border-line/70 bg-surface/60 px-4 py-3 text-sm outline-none transition focus:border-accent" type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} aria-label="Date of birth" />
                )}
                <p className="text-xs font-semibold text-muted">Birthdays repeat yearly and include the calculated age in the saved reminder title.</p>
              </div>
            )}
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Category</span>
              <input className="mt-2 w-full rounded-2xl border border-line/70 bg-surface/60 px-4 py-3 text-sm outline-none transition focus:border-accent" value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Personal, School, Health..." />
            </label>
            {error && <p className="rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-500">{error}</p>}
            <Button type="submit" variant="primary" className="w-full gap-2" disabled={saving}>
              <Plus className="h-4 w-4" />
              {saving ? 'Saving...' : 'Create Reminder'}
            </Button>
          </form>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-muted">Upcoming</p>
              <h3 className="mt-2 font-display text-3xl font-bold">{activeReminders.length} active reminders</h3>
            </div>
            <Clock3 className="h-7 w-7 text-accent" />
          </div>
          <div className="mt-5 space-y-3">
            {loading && <p className="rounded-2xl bg-surface/45 p-4 text-sm text-muted">Loading reminders...</p>}
            {!loading && activeReminders.length === 0 && <p className="rounded-2xl border border-dashed border-line bg-surface/40 p-5 text-sm leading-6 text-muted">No reminders yet. Add one on the left, or hit test notification to confirm macOS notifications are working.</p>}
            {activeReminders.map((reminder) => (
              <ReminderCard key={reminder.id} reminder={reminder} onComplete={complete} onDelete={deleteReminder} onSnooze={(id, minutes) => snooze({ id, minutes })} />
            ))}
          </div>
        </Card>

        {completedReminders.length > 0 && (
          <Card className="p-6">
            <h3 className="font-display text-2xl font-bold">Recently Completed</h3>
            <div className="mt-4 space-y-2">
              {completedReminders.map((reminder) => (
                <div key={reminder.id} className="flex items-center gap-3 rounded-2xl bg-surface/45 px-4 py-3 text-sm text-muted">
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                  <span className="min-w-0 flex-1 line-through">{reminder.title}</span>
                  <button
                    className="rounded-xl p-2 text-muted transition hover:bg-red-500/10 hover:text-red-500"
                    onClick={() => window.confirm('Delete this completed reminder?') && void deleteReminder(reminder.id)}
                    aria-label="Delete completed reminder"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </motion.div>
  );
};

const ReminderCard = ({ reminder, onComplete, onDelete, onSnooze }: { reminder: Reminder; onComplete: (id: string) => Promise<void>; onDelete: (id: string) => Promise<void>; onSnooze: (id: string, minutes: number) => Promise<void> }) => {
  const dueDate = new Date(reminder.snoozedUntil ?? reminder.remindAt);
  const overdue = dueDate.getTime() < Date.now();

  return (
    <motion.div layout className={cn('rounded-[1.5rem] border bg-surface/45 p-4', overdue ? 'border-red-400/50' : 'border-line/70')}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold">{reminder.title}</h4>
            <span className={cn('rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em]', reminder.priority === 'high' ? 'bg-red-500/15 text-red-500' : 'bg-accent/15 text-accent')}>{reminder.priority}</span>
            {reminder.notifyLikeAlarm && <span className="rounded-full bg-red-500/15 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-red-500">alarm</span>}
            {reminder.mode === 'event' && <span className="rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-300">{reminder.eventKind ?? 'event'}</span>}
            {reminder.recurrenceRule !== 'none' && <span className="rounded-full bg-elevated/80 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">{reminder.recurrenceRule}</span>}
          </div>
          {reminder.body && <p className="mt-2 text-sm leading-6 text-muted">{reminder.body}</p>}
          <p className="mt-3 text-xs font-semibold text-muted">
            {overdue ? 'Due ' : 'Due in '}{overdue ? formatDistanceToNow(dueDate, { addSuffix: true }) : formatDistanceToNow(dueDate)} · {format(dueDate, 'MMM d, h:mm a')}
          </p>
        </div>
        <button className="rounded-2xl p-2 text-muted transition hover:bg-red-500/10 hover:text-red-500" onClick={() => void onDelete(reminder.id)} aria-label="Delete reminder">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="primary" className="h-9" onClick={() => void onComplete(reminder.id)}>Done</Button>
        <Button variant="secondary" className="h-9" onClick={() => void onSnooze(reminder.id, 5)}>Snooze 5m</Button>
        <Button variant="secondary" className="h-9" onClick={() => void onSnooze(reminder.id, 15)}>Snooze 15m</Button>
      </div>
    </motion.div>
  );
};
