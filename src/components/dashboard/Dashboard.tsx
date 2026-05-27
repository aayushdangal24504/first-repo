import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { BellRing, ChevronLeft, ChevronRight, CloudSun, ListTodo, NotebookPen, Quote, Sparkles, Trash2, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { useCalendarStore } from '@/store/calendar-store';
import { useDashboardStore } from '@/store/dashboard-store';
import { useUiStore } from '@/store/ui-store';
import type { CalendarEventItem, MoodName } from '@/types/ipc';

type MoodOption = {
  mood: MoodName;
  label: string;
  icon: string;
  description: string;
};

const moods: MoodOption[] = [
  { mood: 'calm', label: 'Calm', icon: '○', description: 'Slow and steady' },
  { mood: 'focused', label: 'Focused', icon: '◆', description: 'Locked in' },
  { mood: 'grateful', label: 'Grateful', icon: '✦', description: 'Noticing good' },
  { mood: 'curious', label: 'Curious', icon: '?', description: 'Following sparks' },
  { mood: 'tired', label: 'Tired', icon: '☾', description: 'Gentle pace' },
  { mood: 'stressed', label: 'Stressed', icon: '!', description: 'Needs clarity' },
  { mood: 'happy', label: 'Happy', icon: '☀', description: 'Extra light' },
  { mood: 'low', label: 'Low', icon: '◒', description: 'Soft landing' }
];

export const Dashboard = () => {
  const { snapshot, loading, error, load, logMood } = useDashboardStore();
  const setActiveView = useUiStore((state) => state.setActiveView);
  const goTo = useUiStore((state) => state.goTo);
  const [loggingMood, setLoggingMood] = useState<MoodName | null>(null);
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    void load();
  }, [load]);

  const deleteTask = async (id: string) => {
    if (!window.confirm('Delete this task?')) return;
    await window.avyukta.tasks.delete(id);
    await load();
  };

  const deleteReminder = async (id: string) => {
    if (!window.confirm('Delete this reminder?')) return;
    await window.avyukta.reminders.delete(id);
    await load();
  };

  const handleMood = async (mood: MoodName) => {
    setLoggingMood(mood);
    try {
      await logMood(mood);
      await load();
    } finally {
      setLoggingMood(null);
    }
  };

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <section className="grid grid-cols-[1.25fr_0.75fr] gap-6">
        <Card className="relative min-h-[260px] overflow-hidden p-8">
          <div className="absolute right-10 top-8 h-32 w-32 rounded-full bg-glow/30 blur-3xl" />
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-accent">{format(today, 'EEEE, MMMM d')}</p>
          <h1 className="mt-4 max-w-2xl font-display text-6xl font-bold leading-[0.95]">Design a day that feels lived in.</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted">
            Your dashboard is now interactive: log your mood, create reminders, jump into planning, and watch local data update from SQLite.
          </p>
          <div className="mt-6 max-w-2xl rounded-[1.5rem] border border-accent/25 bg-accent/10 p-4">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-accent"><Quote className="h-4 w-4" />Quote of the Day</p>
            <p className="mt-2 font-display text-2xl leading-8 text-ink">{snapshot?.quoteOfTheDay ?? 'Loading today’s quote...'}</p>
          </div>
          <div className="mt-8 flex gap-3">
            <Button variant="primary" onClick={() => setActiveView('reminders')}>New Reminder</Button>
            <Button onClick={() => setActiveView('tasks')}>Plan Today</Button>
            <Button variant="ghost" onClick={() => setActiveView('notes')}>Quick Note</Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-muted">Mood Check</p>
              <h2 className="mt-2 font-display text-3xl font-bold">How are we today?</h2>
            </div>
            <CloudSun className="h-8 w-8 text-accent" />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {moods.map((option) => {
              const active = snapshot?.mood?.mood === option.mood;
              return (
                <button
                  key={option.mood}
                  className={cn(
                    'rounded-2xl border px-4 py-3 text-left transition hover:border-accent/50 hover:text-ink',
                    active ? 'border-accent bg-accent text-white shadow-soft' : 'border-line/70 bg-surface/45 text-muted'
                  )}
                  onClick={() => void handleMood(option.mood)}
                  disabled={loggingMood !== null}
                >
                  <span className="flex items-center gap-2 text-sm font-bold"><span>{option.icon}</span>{option.label}</span>
                  <span className={cn('mt-1 block text-xs', active ? 'text-white/75' : 'text-muted')}>{loggingMood === option.mood ? 'Logging...' : option.description}</span>
                </button>
              );
            })}
          </div>
          <motion.div key={snapshot?.mood?.id ?? 'empty'} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 rounded-[1.5rem] border border-line/70 bg-surface/45 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted">Mood Quote</p>
            <p className="mt-2 text-sm leading-6 text-ink">{snapshot?.mood?.quote ?? 'Choose a mood and I’ll give you a quote that matches the energy of the day.'}</p>
          </motion.div>
        </Card>
      </section>

      {error && <Card className="border-red-400/40 text-red-500">{error}</Card>}

      <section className="grid grid-cols-4 gap-4">
        <StatCard icon={ListTodo} label="Open Tasks" value={snapshot?.stats.openTasks ?? 0} loading={loading} onClick={() => setActiveView('tasks')} />
        <StatCard icon={NotebookPen} label="Notes" value={snapshot?.stats.notes ?? 0} loading={loading} onClick={() => setActiveView('notes')} />
        <StatCard icon={Sparkles} label="Journal Entries" value={snapshot?.stats.journalEntries ?? 0} loading={loading} onClick={() => setActiveView('journal')} />
        <StatCard icon={BellRing} label="Reminders" value={snapshot?.upcomingReminders.length ?? 0} loading={loading} onClick={() => setActiveView('reminders')} />
      </section>

      <section className="grid grid-cols-3 gap-6">
        <ListCard title="Today’s Tasks" empty="No tasks due today." items={snapshot?.todayTasks.map((task) => ({ id: task.id, label: task.title })) ?? []} actionLabel="Open Tasks" onAction={() => setActiveView('tasks')} onDelete={deleteTask} />
        <ListCard title="Recent Notes" empty="No recent notes yet." items={snapshot?.recentNotes.map((note) => ({ id: note.id, label: note.title })) ?? []} actionLabel="Open Notes" onAction={() => setActiveView('notes')} onDelete={async (id) => { if (window.confirm('Archive this note?')) { await window.avyukta.notes.delete(id); await load(); } }} />
        <ListCard title="Upcoming Reminders" empty="No reminders yet. Create your first local alarm." items={snapshot?.upcomingReminders.map((reminder) => ({ id: reminder.id, label: `${reminder.title} · ${format(new Date(reminder.remindAt), 'h:mm a')}` })) ?? []} actionLabel="Add Reminder" onAction={() => setActiveView('reminders')} onDelete={deleteReminder} />
      </section>

      <section className="grid grid-cols-[0.8fr_1.2fr] gap-6">
<MiniLifeCalendar onGoTo={(item) => { const view = item.type === 'trip' ? 'travel' : item.type === 'journal' ? 'journal' : item.type === 'memory' ? 'memories' : item.type === 'task' ? 'tasks' : 'reminders'; goTo(view, { type: item.type, id: item.id, parentId: item.targetId ?? undefined }); }} />
        <Card>
          <h3 className="font-display text-2xl font-bold">What Just Became Interactive</h3>
          <p className="mt-3 text-sm leading-7 text-muted">
            Mood buttons now save locally and return custom quotes. Reminders can be created, snoozed, completed, deleted, and scheduled as native macOS notifications.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-muted">
            <button className="rounded-2xl bg-surface/45 p-4 text-left transition hover:bg-elevated" onClick={() => setActiveView('reminders')}>Create a local alarm</button>
            <button className="rounded-2xl bg-surface/45 p-4 text-left transition hover:bg-elevated" onClick={() => setActiveView('tasks')}>Open task planning</button>
            <button className="rounded-2xl bg-surface/45 p-4 text-left transition hover:bg-elevated" onClick={() => void load()}>Refresh dashboard data</button>
            <button className="rounded-2xl bg-surface/45 p-4 text-left transition hover:bg-elevated" onClick={() => setActiveView('roadmap')}>View roadmap</button>
          </div>
        </Card>
      </section>
    </motion.div>
  );
};

const StatCard = ({ icon: Icon, label, value, loading, onClick }: { icon: LucideIcon; label: string; value: number; loading: boolean; onClick: () => void }) => (
  <button onClick={onClick} className="text-left">
    <Card className="p-5 transition hover:-translate-y-0.5 hover:border-accent/50">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted">{label}</p>
          <p className="mt-3 font-display text-4xl font-bold">{loading ? '...' : value}</p>
        </div>
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent/15 text-accent">
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Card>
  </button>
);

const ListCard = ({ title, items, empty, actionLabel, onAction, onDelete }: { title: string; items: Array<{ id: string; label: string }>; empty: string; actionLabel: string; onAction: () => void; onDelete?: (id: string) => void | Promise<void> }) => (
  <Card>
    <div className="flex items-center justify-between gap-3">
      <h3 className="font-display text-2xl font-bold">{title}</h3>
      <Button variant="ghost" className="h-9" onClick={onAction}>{actionLabel}</Button>
    </div>
    <div className="mt-4 space-y-3">
      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-surface/40 p-4 text-sm leading-6 text-muted">{empty}</p>
      ) : (
        items.map((item) => <div key={item.id} className="flex items-center gap-2 rounded-2xl bg-surface/45 p-2 transition hover:bg-elevated"><button onClick={onAction} className="min-w-0 flex-1 p-2 text-left text-sm font-semibold">{item.label}</button>{onDelete && <button type="button" onClick={() => void onDelete(item.id)} className="rounded-xl p-2 text-muted hover:bg-red-500/10 hover:text-red-500" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>}</div>)
      )}
    </div>
  </Card>
);


const eventStyles: Record<CalendarEventItem['type'], string> = {
  task: 'bg-blue-500/15 text-blue-300 border-blue-400/30',
  reminder: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  journal: 'bg-rose-500/15 text-rose-300 border-rose-400/30',
  trip: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  memory: 'bg-violet-500/15 text-violet-300 border-violet-400/30'
};

const localDayKey = (date: Date) => {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
};

const MiniLifeCalendar = ({ onGoTo }: { onGoTo: (item: CalendarEventItem) => void }) => {
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => localDayKey(new Date()));
  const { snapshot, load } = useCalendarStore();
  const year = cursor.getFullYear();
  const month = cursor.getMonth() + 1;

  useEffect(() => { void load(year, month); }, [load, year, month]);

  const days = useMemo(() => {
    const first = new Date(year, month - 1, 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 35 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date; });
  }, [year, month]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEventItem[]>();
    for (const item of snapshot?.items ?? []) {
      const key = item.date.slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return map;
  }, [snapshot]);
  const selectedEvents = eventsByDay.get(selectedDay) ?? [];

  return <Card className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Life calendar</p><h3 className="font-display text-2xl font-bold">{cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3></div><div className="flex gap-1"><Button variant="ghost" className="h-8 px-2" onClick={() => setCursor(new Date(year, month - 2, 1))}><ChevronLeft className="h-4 w-4" /></Button><Button variant="ghost" className="h-8 px-2" onClick={() => setCursor(new Date())}>Today</Button><Button variant="ghost" className="h-8 px-2" onClick={() => setCursor(new Date(year, month, 1))}><ChevronRight className="h-4 w-4" /></Button></div></div><div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{['S','M','T','W','T','F','S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div><div className="mt-2 grid grid-cols-7 gap-1">{days.map((date) => { const key = localDayKey(date); const items = eventsByDay.get(key) ?? []; const inMonth = date.getMonth() === month - 1; return <button key={key} onClick={() => setSelectedDay(key)} className={cn('min-h-14 rounded-2xl border border-line/40 p-1 text-left transition hover:bg-elevated/60', !inMonth && 'opacity-35', selectedDay === key && 'border-accent bg-accent/10')}><span className="text-xs font-bold">{date.getDate()}</span><div className="mt-1 flex gap-0.5">{items.slice(0, 3).map((item) => <span key={`${item.type}-${item.id}`} className={cn('h-1.5 w-1.5 rounded-full border', eventStyles[item.type])} />)}</div></button>; })}</div><div className="mt-4 space-y-2">{selectedEvents.length === 0 ? <p className="rounded-2xl border border-dashed border-line p-3 text-sm text-muted">Nothing scheduled here.</p> : selectedEvents.slice(0, 3).map((item) => <div key={`${item.type}-${item.id}`} className="rounded-2xl bg-surface/45 p-3"><span className={cn('rounded-full border px-2 py-1 text-[10px] font-bold capitalize', eventStyles[item.type])}>{item.type}</span><p className="mt-2 truncate text-sm font-semibold">{item.title}</p><Button className="mt-2 h-8 w-full" variant="primary" onClick={() => onGoTo(item)}>Go To</Button></div>)}</div></Card>;
};
