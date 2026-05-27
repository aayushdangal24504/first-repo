import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { useCalendarStore } from '@/store/calendar-store';
import { useUiStore } from '@/store/ui-store';
import type { CalendarEventItem } from '@/types/ipc';

const eventStyles: Record<CalendarEventItem['type'], string> = {
  task: 'bg-blue-500/15 text-blue-300 border-blue-400/30',
  reminder: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  journal: 'bg-rose-500/15 text-rose-300 border-rose-400/30',
  trip: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  memory: 'bg-violet-500/15 text-violet-300 border-violet-400/30'
};
const dayKey = (date: Date) => date.toISOString().slice(0, 10);
const monthTitle = (date: Date) => date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

export const CalendarView = () => {
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => dayKey(new Date()));
  const { snapshot, loading, error, load } = useCalendarStore();
  const goTo = useUiStore((state) => state.goTo);
  const year = cursor.getFullYear();
  const month = cursor.getMonth() + 1;

  useEffect(() => { void load(year, month); }, [load, year, month]);

  const days = useMemo(() => {
    const first = new Date(year, month - 1, 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date; });
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
  const openEvent = (item: CalendarEventItem) => {
    const view = item.type === 'trip' ? 'travel' : item.type === 'journal' ? 'journal' : item.type === 'memory' ? 'memories' : item.type === 'task' ? 'tasks' : 'reminders';
    goTo(view, { type: item.type, id: item.id, parentId: item.targetId ?? undefined });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-line/60 p-5">
          <div><p className="text-xs font-bold uppercase tracking-[0.25em] text-accent">Life calendar</p><h2 className="font-display text-4xl font-bold">{monthTitle(cursor)}</h2></div>
          <div className="flex gap-2"><Button variant="ghost" onClick={() => setCursor(new Date(year, month - 2, 1))}><ChevronLeft className="h-4 w-4" /></Button><Button variant="ghost" onClick={() => setCursor(new Date())}>Today</Button><Button variant="ghost" onClick={() => setCursor(new Date(year, month, 1))}><ChevronRight className="h-4 w-4" /></Button></div>
        </div>
        <div className="grid grid-cols-7 border-b border-line/60 text-center text-xs font-bold uppercase tracking-[0.18em] text-muted">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day) => <div key={day} className="p-3">{day}</div>)}</div>
        <div className="grid grid-cols-7">
          {days.map((date) => {
            const key = dayKey(date);
            const items = eventsByDay.get(key) ?? [];
            const inMonth = date.getMonth() === month - 1;
            return <button key={key} onClick={() => setSelectedDay(key)} className={cn('min-h-[112px] border-b border-r border-line/40 p-3 text-left transition hover:bg-elevated/50', !inMonth && 'opacity-35', selectedDay === key && 'bg-accent/10 ring-2 ring-inset ring-accent/40')}>
              <span className="text-sm font-bold">{date.getDate()}</span>
              <div className="mt-2 space-y-1">{items.slice(0, 3).map((item) => <div key={`${item.type}-${item.id}`} className={cn('truncate rounded-full border px-2 py-1 text-[11px] font-semibold', eventStyles[item.type])}>{item.title}</div>)}</div>
            </button>;
          })}
        </div>
      </Card>
      <Card className="p-6">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted">Selected day</p>
        <h3 className="mt-2 font-display text-3xl font-bold">{new Date(`${selectedDay}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</h3>
        {loading && <p className="mt-4 text-sm text-muted">Loading your calendar...</p>}
        {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
        <div className="mt-5 space-y-3">{selectedEvents.length === 0 ? <p className="rounded-3xl border border-dashed border-line p-5 text-sm text-muted">Nothing scheduled here yet. Tasks, reminders, journal pages, trips, and memories will appear automatically.</p> : selectedEvents.map((item) => <div key={`${item.type}-${item.id}`} className="rounded-3xl border border-line/60 bg-elevated/50 p-4"><span className={cn('rounded-full border px-2 py-1 text-xs font-bold capitalize', eventStyles[item.type])}>{item.type}</span><h4 className="mt-3 font-display text-xl font-bold">{item.title}</h4>{item.subtitle && <p className="mt-1 text-sm text-muted">{item.subtitle}</p>}<Button className="mt-3 h-9 w-full" variant="primary" onClick={() => openEvent(item)}>Go To</Button></div>)}</div>
      </Card>
    </motion.div>
  );
};
