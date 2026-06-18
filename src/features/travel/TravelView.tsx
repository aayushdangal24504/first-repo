import { FormEvent, useEffect, useState } from 'react';
import { Check, Luggage, MapPin, Pencil, Plus, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { useTravelStore } from '@/store/travel-store';
import { useUiStore } from '@/store/ui-store';
import type { TripDay } from '@/types/ipc';

const today = () => {
  const date = new Date();
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
};
const toInputDate = (value: string | null) => (value ? value.slice(0, 10) : '');
const formatStoredDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString();
};
const isUpcomingDate = (value: string | null | undefined) => {
  if (!value) return false;
  const date = new Date(`${value.slice(0, 10)}T23:59:59`);
  const todayDate = new Date();
  todayDate.setHours(23, 59, 59, 999);
  return date.getTime() > todayDate.getTime();
};
const tripDayPrompt = (dayDate: string, tripEndsAt?: string | null) =>
  isUpcomingDate(dayDate) || isUpcomingDate(tripEndsAt) ? 'What are you going to do today or what is your plan for this day?' : 'What are you going to do today or what is your plan for this day?';

export const TravelView = () => {
  const { trips, selectedTripId, loading, saving, error, load, select, create, update, delete: deleteTrip, createDay, updateDay, deleteDay } = useTravelStore();
  const selected = trips.find((trip) => trip.id === selectedTripId) ?? null;
  const navigationTarget = useUiStore((state) => state.navigationTarget);
  const clearNavigationTarget = useUiStore((state) => state.clearNavigationTarget);
  const [tripForm, setTripForm] = useState({ title: '', destination: '', startsAt: today(), endsAt: today(), notes: '', favoriteMoment: '' });
  const [dayForm, setDayForm] = useState({ dayDate: today(), title: '', text: '', activities: '', plans: '', placesVisited: '', foodTried: '', highlights: '', notes: '', packing: '' });
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (navigationTarget?.type === 'trip') {
      select(navigationTarget.parentId ?? navigationTarget.id);
      clearNavigationTarget();
    }
  }, [navigationTarget, select, clearNavigationTarget]);
  const submitTrip = async (event: FormEvent) => { event.preventDefault(); await create(tripForm); setTripForm({ title: '', destination: '', startsAt: today(), endsAt: today(), notes: '', favoriteMoment: '' }); };
  const submitDay = async (event: FormEvent) => { event.preventDefault(); if (!selected) return; const planned = isUpcomingDate(dayForm.dayDate) || isUpcomingDate(selected.endsAt); await createDay({ tripId: selected.id, ...dayForm, activities: planned ? '' : dayForm.activities || dayForm.text, plans: planned ? dayForm.plans || dayForm.text : dayForm.plans, placesVisited: dayForm.placesVisited.split('\n').filter(Boolean), foodTried: dayForm.foodTried.split('\n').filter(Boolean), packing: dayForm.packing.split('\n').filter(Boolean) }); setDayForm({ dayDate: today(), title: '', text: '', activities: '', plans: '', placesVisited: '', foodTried: '', highlights: '', notes: '', packing: '' }); };
  const confirmDeleteTrip = () => { if (selected && window.confirm(`Delete trip \"${selected.title}\" and all day entries?`)) void deleteTrip(selected.id); };

  return <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} className="grid gap-5 xl:grid-cols-[360px_1fr]">
    <div className="space-y-5"><Card className="p-6"><p className="text-xs font-bold uppercase tracking-[0.25em] text-accent">Travel journal</p><h2 className="mt-2 font-display text-4xl font-bold">Plan a trip</h2><form onSubmit={submitTrip} className="mt-6 space-y-3"><input className="w-full rounded-2xl border border-line bg-elevated/70 px-4 py-3" placeholder="Trip name" value={tripForm.title} onChange={(e) => setTripForm({ ...tripForm, title: e.target.value })} /><input className="w-full rounded-2xl border border-line bg-elevated/70 px-4 py-3" placeholder="Destination" value={tripForm.destination} onChange={(e) => setTripForm({ ...tripForm, destination: e.target.value })} /><div className="grid grid-cols-2 gap-3"><input type="date" className="rounded-2xl border border-line bg-elevated/70 px-4 py-3" value={tripForm.startsAt} onChange={(e) => setTripForm({ ...tripForm, startsAt: e.target.value })} /><input type="date" className="rounded-2xl border border-line bg-elevated/70 px-4 py-3" value={tripForm.endsAt} onChange={(e) => setTripForm({ ...tripForm, endsAt: e.target.value })} /></div><textarea className="min-h-[90px] w-full rounded-3xl border border-line bg-elevated/70 px-4 py-3" placeholder="Trip notes" value={tripForm.notes} onChange={(e) => setTripForm({ ...tripForm, notes: e.target.value })} /><input className="w-full rounded-2xl border border-line bg-elevated/70 px-4 py-3" placeholder="Favorite moment" value={tripForm.favoriteMoment} onChange={(e) => setTripForm({ ...tripForm, favoriteMoment: e.target.value })} /><Button type="submit" variant="primary" className="w-full" disabled={saving || !tripForm.title.trim()}><Plus className="mr-2 h-4 w-4" />Create trip</Button>{error && <p className="text-sm text-red-300">{error}</p>}</form></Card><Card className="p-4"><div className="space-y-2">{loading ? <p className="p-3 text-sm text-muted">Loading trips...</p> : trips.map((trip) => <button key={trip.id} onClick={() => select(trip.id)} className={cn('w-full rounded-3xl border p-4 text-left transition hover:bg-elevated/60', selectedTripId === trip.id ? 'border-accent bg-accent/10' : 'border-line/60')}><h3 className="font-display text-xl font-bold">{trip.title}</h3><p className="mt-1 flex items-center gap-2 text-sm text-muted"><MapPin className="h-4 w-4" />{trip.destination || 'No destination yet'}</p></button>) }</div></Card></div>
    {selected ? <div className="space-y-5"><Card className="relative overflow-hidden p-7"><div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 20% 20%, rgba(212,163,115,.35), transparent 32%), radial-gradient(circle at 80% 0%, rgba(79,119,45,.25), transparent 30%)' }} /><div className="relative"><p className="text-xs font-bold uppercase tracking-[0.25em] text-muted">Current trip</p><input className="mt-2 w-full bg-transparent font-display text-5xl font-bold outline-none" value={selected.title} onChange={(e) => void update({ id: selected.id, title: e.target.value })} /><div className="mt-4 grid gap-3 md:grid-cols-3"><input className="rounded-2xl border border-line bg-elevated/70 px-4 py-3" value={selected.destination ?? ''} onChange={(e) => void update({ id: selected.id, destination: e.target.value })} /><input type="date" className="rounded-2xl border border-line bg-elevated/70 px-4 py-3" value={toInputDate(selected.startsAt)} onChange={(e) => void update({ id: selected.id, startsAt: e.target.value })} /><input type="date" className="rounded-2xl border border-line bg-elevated/70 px-4 py-3" value={toInputDate(selected.endsAt)} onChange={(e) => void update({ id: selected.id, endsAt: e.target.value })} /></div><textarea className="mt-4 min-h-[90px] w-full rounded-3xl border border-line bg-elevated/70 px-4 py-3" value={selected.notes ?? ''} onChange={(e) => void update({ id: selected.id, notes: e.target.value })} placeholder="Notes, ideas, map links, booking details..." /><Button className="mt-4 text-red-500" onClick={confirmDeleteTrip}>Delete Trip</Button></div></Card><Card className="p-6"><h3 className="font-display text-3xl font-bold">Add day entry</h3><form onSubmit={submitDay} className="mt-4 grid gap-3 lg:grid-cols-2"><input type="date" className="rounded-2xl border border-line bg-elevated/70 px-4 py-3" value={dayForm.dayDate} onChange={(e) => setDayForm({ ...dayForm, dayDate: e.target.value })} /><input className="rounded-2xl border border-line bg-elevated/70 px-4 py-3" placeholder="Day title" value={dayForm.title} onChange={(e) => setDayForm({ ...dayForm, title: e.target.value })} /><textarea className="min-h-[110px] rounded-3xl border border-line bg-elevated/70 px-4 py-3 lg:col-span-2" placeholder={tripDayPrompt(dayForm.dayDate, selected.endsAt)} value={dayForm.text} onChange={(e) => setDayForm({ ...dayForm, text: e.target.value })} /><textarea className="min-h-[90px] rounded-3xl border border-line bg-elevated/70 px-4 py-3 lg:col-span-2" placeholder="Packing list, one item per line" value={dayForm.packing} onChange={(e) => setDayForm({ ...dayForm, packing: e.target.value })} /><Button type="submit" variant="primary" className="lg:col-span-2">Add day</Button></form></Card><div className="grid gap-4 lg:grid-cols-2">{selected.days.map((day) => <TravelDayCard key={day.id} day={day} tripEndsAt={selected.endsAt} onUpdate={(input) => void updateDay(input)} onDelete={() => window.confirm('Delete this travel day?') && void deleteDay(day.id)} />)}</div></div> : <Card className="grid min-h-[540px] place-items-center p-10 text-center"><div><h2 className="font-display text-4xl font-bold">No trip selected</h2><p className="mt-3 max-w-md text-muted">Create a trip on the left. Then add day-by-day memories, packing notes, favorite moments, and later we can attach photos/maps.</p></div></Card>}
  </motion.div>;
};


const TravelDayCard = ({ day, tripEndsAt, onUpdate, onDelete }: { day: TripDay; tripEndsAt?: string | null; onUpdate: (input: { id: string; dayDate?: string; title?: string | null; text?: string; activities?: string; plans?: string; placesVisited?: string[]; foodTried?: string[]; highlights?: string; notes?: string; packing?: string[] }) => void; onDelete: () => void }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ 
    dayDate: toInputDate(day.dayDate), 
    title: day.title ?? '', 
    text: day.entry.text, 
    activities: day.activities ?? '', 
    plans: day.plans ?? '', 
    placesVisited: day.placesVisited?.join('\n') ?? '',
    foodTried: day.foodTried?.join('\n') ?? '',
    highlights: day.highlights ?? '',
    notes: day.notes ?? '',
    packing: day.packing.join('\n') 
  });

  useEffect(() => {
    if (!editing) setDraft({ 
      dayDate: toInputDate(day.dayDate), 
      title: day.title ?? '', 
      text: day.entry.text, 
      activities: day.activities ?? '', 
      plans: day.plans ?? '', 
      placesVisited: day.placesVisited?.join('\n') ?? '',
      foodTried: day.foodTried?.join('\n') ?? '',
      highlights: day.highlights ?? '',
      notes: day.notes ?? '',
      packing: day.packing.join('\n') 
    });
  }, [day, editing]);

  const save = () => {
    onUpdate({ 
      id: day.id, 
      dayDate: draft.dayDate, 
      title: draft.title, 
      text: draft.text,
      activities: draft.activities,
      plans: draft.plans,
      placesVisited: draft.placesVisited.split('\n').filter(Boolean),
      foodTried: draft.foodTried.split('\n').filter(Boolean),
      highlights: draft.highlights,
      notes: draft.notes,
      packing: draft.packing.split('\n').filter(Boolean)
    });
    setEditing(false);
  };

  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">{formatStoredDate(day.dayDate)}</p>
      {editing ? (
        <div className="mt-3 space-y-3">
          <input type="date" className="w-full rounded-2xl border border-line bg-elevated/70 px-4 py-3" value={draft.dayDate} onChange={(e) => setDraft({ ...draft, dayDate: e.target.value })} />
          <input className="w-full rounded-2xl border border-line bg-elevated/70 px-4 py-3" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Day title" />
          
          <div className="border-t border-line/30 pt-3">
            <p className="text-xs font-bold text-muted mb-2">Travel Diary Prompts</p>
            {isUpcomingDate(draft.dayDate) || isUpcomingDate(tripEndsAt) ? (
              <textarea className="min-h-[80px] w-full rounded-2xl border border-line bg-elevated/60 px-4 py-3 text-sm" value={draft.plans} onChange={(e) => setDraft({ ...draft, plans: e.target.value })} placeholder="What are you going to do today?" />
            ) : (
              <textarea className="min-h-[80px] w-full rounded-2xl border border-line bg-elevated/60 px-4 py-3 text-sm" value={draft.activities} onChange={(e) => setDraft({ ...draft, activities: e.target.value })} placeholder="What did you do today?" />
            )}
            <textarea className="min-h-[60px] w-full rounded-2xl border border-line bg-elevated/60 px-4 py-3 text-sm mt-2" value={draft.placesVisited} onChange={(e) => setDraft({ ...draft, placesVisited: e.target.value })} placeholder="Places visited (one per line)" />
            <textarea className="min-h-[60px] w-full rounded-2xl border border-line bg-elevated/60 px-4 py-3 text-sm mt-2" value={draft.foodTried} onChange={(e) => setDraft({ ...draft, foodTried: e.target.value })} placeholder="Food tried (one per line)" />
            <textarea className="min-h-[80px] w-full rounded-2xl border border-line bg-elevated/60 px-4 py-3 text-sm mt-2" value={draft.highlights} onChange={(e) => setDraft({ ...draft, highlights: e.target.value })} placeholder="Memories & highlights" />
            <textarea className="min-h-[60px] w-full rounded-2xl border border-line bg-elevated/60 px-4 py-3 text-sm mt-2" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="General notes" />
          </div>
          
          <div className="border-t border-line/30 pt-3">
            <p className="text-xs font-bold text-muted mb-2">Entry & Packing</p>
            <textarea className="min-h-[80px] w-full rounded-2xl border border-line bg-elevated/60 px-4 py-3 text-sm" value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} placeholder="General entry / journal notes" />
            <textarea className="min-h-[60px] w-full rounded-2xl border border-line bg-elevated/60 px-4 py-3 text-sm mt-2" value={draft.packing} onChange={(e) => setDraft({ ...draft, packing: e.target.value })} placeholder="Packing list (one item per line)" />
          </div>
          
          <div className="flex gap-2">
            <Button variant="primary" className="h-9 flex-1 gap-1" onClick={save}><Check className="h-4 w-4" />Save</Button>
            <Button className="h-9 flex-1 gap-1" onClick={() => setEditing(false)}><X className="h-4 w-4" />Cancel</Button>
          </div>
        </div>
      ) : (
        <>
          <h4 className="mt-2 font-display text-2xl font-bold">{day.title || 'Untitled day'}</h4>
          
          {day.plans && <div className="mt-3 rounded-2xl bg-elevated/30 p-3"><p className="text-xs font-bold text-muted mb-1">📋 Plans</p><p className="text-sm leading-6 text-muted">{day.plans}</p></div>}
          {day.activities && <div className="mt-2 rounded-2xl bg-elevated/30 p-3"><p className="text-xs font-bold text-muted mb-1">✨ What I did</p><p className="text-sm leading-6 text-muted">{day.activities}</p></div>}
          {day.placesVisited && day.placesVisited.length > 0 && <div className="mt-2 rounded-2xl bg-elevated/30 p-3"><p className="text-xs font-bold text-muted mb-1">📍 Places Visited</p><p className="text-sm text-muted">{day.placesVisited.join(', ')}</p></div>}
          {day.foodTried && day.foodTried.length > 0 && <div className="mt-2 rounded-2xl bg-elevated/30 p-3"><p className="text-xs font-bold text-muted mb-1">🍽️ Food Tried</p><p className="text-sm text-muted">{day.foodTried.join(', ')}</p></div>}
          {day.highlights && <div className="mt-2 rounded-2xl bg-elevated/30 p-3"><p className="text-xs font-bold text-muted mb-1">⭐ Highlights & Memories</p><p className="text-sm leading-6 text-muted">{day.highlights}</p></div>}
          {day.notes && <div className="mt-2 rounded-2xl bg-elevated/30 p-3"><p className="text-xs font-bold text-muted mb-1">📝 Notes</p><p className="text-sm leading-6 text-muted">{day.notes}</p></div>}
          
          {day.entry.text && <div className="mt-3 rounded-2xl bg-elevated/50 p-3"><p className="text-xs font-bold text-muted mb-1">📖 Entry</p><p className="text-sm leading-6 text-muted whitespace-pre-wrap">{day.entry.text}</p></div>}
          
          {day.packing.length > 0 && <div className="mt-3 rounded-2xl bg-elevated/50 p-3"><p className="flex items-center gap-2 text-xs font-bold text-muted mb-1"><Luggage className="h-4 w-4" />Packing</p><p className="text-sm text-muted">{day.packing.join(', ')}</p></div>}
          
          <div className="mt-3 flex gap-2">
            <Button className="h-9 flex-1 gap-1" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" />Edit Day</Button>
            <Button className="h-9 flex-1 text-red-500" onClick={onDelete}>Delete Day</Button>
          </div>
        </>
      )}
    </Card>
  );
};
