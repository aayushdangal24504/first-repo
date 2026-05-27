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

export const TravelView = () => {
  const { trips, selectedTripId, loading, saving, error, load, select, create, update, delete: deleteTrip, createDay, updateDay, deleteDay } = useTravelStore();
  const selected = trips.find((trip) => trip.id === selectedTripId) ?? null;
  const navigationTarget = useUiStore((state) => state.navigationTarget);
  const clearNavigationTarget = useUiStore((state) => state.clearNavigationTarget);
  const [tripForm, setTripForm] = useState({ title: '', destination: '', startsAt: today(), endsAt: today(), notes: '', favoriteMoment: '' });
  const [dayForm, setDayForm] = useState({ dayDate: today(), title: '', text: '', packing: '' });
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (navigationTarget?.type === 'trip') {
      select(navigationTarget.parentId ?? navigationTarget.id);
      clearNavigationTarget();
    }
  }, [navigationTarget, select, clearNavigationTarget]);
  const submitTrip = async (event: FormEvent) => { event.preventDefault(); await create(tripForm); setTripForm({ title: '', destination: '', startsAt: today(), endsAt: today(), notes: '', favoriteMoment: '' }); };
  const submitDay = async (event: FormEvent) => { event.preventDefault(); if (!selected) return; await createDay({ tripId: selected.id, ...dayForm, packing: dayForm.packing.split('\n') }); setDayForm({ dayDate: today(), title: '', text: '', packing: '' }); };
  const confirmDeleteTrip = () => { if (selected && window.confirm(`Delete trip \"${selected.title}\" and all day entries?`)) void deleteTrip(selected.id); };

  return <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} className="grid gap-5 xl:grid-cols-[360px_1fr]">
    <div className="space-y-5"><Card className="p-6"><p className="text-xs font-bold uppercase tracking-[0.25em] text-accent">Travel journal</p><h2 className="mt-2 font-display text-4xl font-bold">Plan a trip</h2><form onSubmit={submitTrip} className="mt-6 space-y-3"><input className="w-full rounded-2xl border border-line bg-elevated/70 px-4 py-3" placeholder="Trip name" value={tripForm.title} onChange={(e) => setTripForm({ ...tripForm, title: e.target.value })} /><input className="w-full rounded-2xl border border-line bg-elevated/70 px-4 py-3" placeholder="Destination" value={tripForm.destination} onChange={(e) => setTripForm({ ...tripForm, destination: e.target.value })} /><div className="grid grid-cols-2 gap-3"><input type="date" className="rounded-2xl border border-line bg-elevated/70 px-4 py-3" value={tripForm.startsAt} onChange={(e) => setTripForm({ ...tripForm, startsAt: e.target.value })} /><input type="date" className="rounded-2xl border border-line bg-elevated/70 px-4 py-3" value={tripForm.endsAt} onChange={(e) => setTripForm({ ...tripForm, endsAt: e.target.value })} /></div><textarea className="min-h-[90px] w-full rounded-3xl border border-line bg-elevated/70 px-4 py-3" placeholder="Trip notes" value={tripForm.notes} onChange={(e) => setTripForm({ ...tripForm, notes: e.target.value })} /><input className="w-full rounded-2xl border border-line bg-elevated/70 px-4 py-3" placeholder="Favorite moment" value={tripForm.favoriteMoment} onChange={(e) => setTripForm({ ...tripForm, favoriteMoment: e.target.value })} /><Button type="submit" variant="primary" className="w-full" disabled={saving || !tripForm.title.trim()}><Plus className="mr-2 h-4 w-4" />Create trip</Button>{error && <p className="text-sm text-red-300">{error}</p>}</form></Card><Card className="p-4"><div className="space-y-2">{loading ? <p className="p-3 text-sm text-muted">Loading trips...</p> : trips.map((trip) => <button key={trip.id} onClick={() => select(trip.id)} className={cn('w-full rounded-3xl border p-4 text-left transition hover:bg-elevated/60', selectedTripId === trip.id ? 'border-accent bg-accent/10' : 'border-line/60')}><h3 className="font-display text-xl font-bold">{trip.title}</h3><p className="mt-1 flex items-center gap-2 text-sm text-muted"><MapPin className="h-4 w-4" />{trip.destination || 'No destination yet'}</p></button>) }</div></Card></div>
    {selected ? <div className="space-y-5"><Card className="relative overflow-hidden p-7"><div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 20% 20%, rgba(212,163,115,.35), transparent 32%), radial-gradient(circle at 80% 0%, rgba(79,119,45,.25), transparent 30%)' }} /><div className="relative"><p className="text-xs font-bold uppercase tracking-[0.25em] text-muted">Current trip</p><input className="mt-2 w-full bg-transparent font-display text-5xl font-bold outline-none" value={selected.title} onChange={(e) => void update({ id: selected.id, title: e.target.value })} /><div className="mt-4 grid gap-3 md:grid-cols-3"><input className="rounded-2xl border border-line bg-elevated/70 px-4 py-3" value={selected.destination ?? ''} onChange={(e) => void update({ id: selected.id, destination: e.target.value })} /><input type="date" className="rounded-2xl border border-line bg-elevated/70 px-4 py-3" value={toInputDate(selected.startsAt)} onChange={(e) => void update({ id: selected.id, startsAt: e.target.value })} /><input type="date" className="rounded-2xl border border-line bg-elevated/70 px-4 py-3" value={toInputDate(selected.endsAt)} onChange={(e) => void update({ id: selected.id, endsAt: e.target.value })} /></div><textarea className="mt-4 min-h-[90px] w-full rounded-3xl border border-line bg-elevated/70 px-4 py-3" value={selected.notes ?? ''} onChange={(e) => void update({ id: selected.id, notes: e.target.value })} placeholder="Notes, ideas, map links, booking details..." /><Button className="mt-4 text-red-500" onClick={confirmDeleteTrip}>Delete Trip</Button></div></Card><Card className="p-6"><h3 className="font-display text-3xl font-bold">Add day entry</h3><form onSubmit={submitDay} className="mt-4 grid gap-3 lg:grid-cols-2"><input type="date" className="rounded-2xl border border-line bg-elevated/70 px-4 py-3" value={dayForm.dayDate} onChange={(e) => setDayForm({ ...dayForm, dayDate: e.target.value })} /><input className="rounded-2xl border border-line bg-elevated/70 px-4 py-3" placeholder="Day title" value={dayForm.title} onChange={(e) => setDayForm({ ...dayForm, title: e.target.value })} /><textarea className="min-h-[110px] rounded-3xl border border-line bg-elevated/70 px-4 py-3 lg:col-span-2" placeholder="What happened this day?" value={dayForm.text} onChange={(e) => setDayForm({ ...dayForm, text: e.target.value })} /><textarea className="min-h-[90px] rounded-3xl border border-line bg-elevated/70 px-4 py-3 lg:col-span-2" placeholder="Packing list, one item per line" value={dayForm.packing} onChange={(e) => setDayForm({ ...dayForm, packing: e.target.value })} /><Button type="submit" variant="primary" className="lg:col-span-2">Add day</Button></form></Card><div className="grid gap-4 lg:grid-cols-2">{selected.days.map((day) => <TravelDayCard key={day.id} day={day} onUpdate={(input) => void updateDay(input)} onDelete={() => window.confirm('Delete this travel day?') && void deleteDay(day.id)} />)}</div></div> : <Card className="grid min-h-[540px] place-items-center p-10 text-center"><div><h2 className="font-display text-4xl font-bold">No trip selected</h2><p className="mt-3 max-w-md text-muted">Create a trip on the left. Then add day-by-day memories, packing notes, favorite moments, and later we can attach photos/maps.</p></div></Card>}
  </motion.div>;
};


const TravelDayCard = ({ day, onUpdate, onDelete }: { day: TripDay; onUpdate: (input: { id: string; dayDate?: string; title?: string | null; text?: string; packing?: string[] }) => void; onDelete: () => void }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ dayDate: toInputDate(day.dayDate), title: day.title ?? '', text: day.entry.text, packing: day.packing.join('\\n') });

  useEffect(() => {
    if (!editing) setDraft({ dayDate: toInputDate(day.dayDate), title: day.title ?? '', text: day.entry.text, packing: day.packing.join('\\n') });
  }, [day, editing]);

  const save = () => {
    onUpdate({ id: day.id, dayDate: draft.dayDate, title: draft.title, text: draft.text, packing: draft.packing.split('\\n') });
    setEditing(false);
  };

  return <Card className="p-5"><p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">{formatStoredDate(day.dayDate)}</p>{editing ? <div className="mt-3 space-y-3"><input type="date" className="w-full rounded-2xl border border-line bg-elevated/70 px-4 py-3" value={draft.dayDate} onChange={(e) => setDraft({ ...draft, dayDate: e.target.value })} /><input className="w-full rounded-2xl border border-line bg-elevated/70 px-4 py-3" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Day title" /><textarea className="min-h-[120px] w-full rounded-3xl border border-line bg-elevated/60 px-4 py-3" value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} /><textarea className="min-h-[90px] w-full rounded-3xl border border-line bg-elevated/60 px-4 py-3" value={draft.packing} onChange={(e) => setDraft({ ...draft, packing: e.target.value })} placeholder="Packing, one per line" /><div className="flex gap-2"><Button variant="primary" className="h-9 flex-1 gap-1" onClick={save}><Check className="h-4 w-4" />Save</Button><Button className="h-9 flex-1 gap-1" onClick={() => setEditing(false)}><X className="h-4 w-4" />Cancel</Button></div></div> : <><h4 className="mt-2 font-display text-2xl font-bold">{day.title || 'Untitled day'}</h4><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted">{day.entry.text || 'No entry yet.'}</p><div className="mt-4 rounded-3xl bg-elevated/50 p-4"><p className="flex items-center gap-2 text-sm font-bold"><Luggage className="h-4 w-4" />Packing</p><p className="mt-2 whitespace-pre-wrap text-sm text-muted">{day.packing.length ? day.packing.join(', ') : 'No packing items yet.'}</p></div><div className="mt-3 flex gap-2"><Button className="h-9 flex-1 gap-1" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" />Edit Day</Button><Button className="h-9 flex-1 text-red-500" onClick={onDelete}>Delete Day</Button></div></>}</Card>;
};
