import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Check, Heart, Pencil, Star, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useMemoryStore } from '@/store/memory-store';
import { useUiStore } from '@/store/ui-store';
import type { Memory } from '@/types/ipc';

const today = () => new Date().toISOString().slice(0, 10);
const toInputDate = (value: string | null) => (value ? value.slice(0, 10) : today());

export const MemoryVaultView = () => {
  const { memories, loading, saving, error, load, create, update, delete: deleteMemory } = useMemoryStore();
  const navigationTarget = useUiStore((state) => state.navigationTarget);
  const clearNavigationTarget = useUiStore((state) => state.clearNavigationTarget);
  const [form, setForm] = useState({ title: '', memoryDate: today(), category: 'Life', text: '', emotionalTags: '' });
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (navigationTarget?.type === 'memory') {
      setHighlightId(navigationTarget.id);
      clearNavigationTarget();
    }
  }, [navigationTarget, clearNavigationTarget]);

  const grouped = useMemo(() => memories.reduce<Record<string, typeof memories>>((acc, memory) => { const key = String(memory.year ?? 'Undated'); acc[key] = [...(acc[key] ?? []), memory]; return acc; }, {}), [memories]);
  const submit = async (event: FormEvent) => { event.preventDefault(); setSavedMessage(null); const ok = await create({ ...form, emotionalTags: form.emotionalTags.split(',') }); if (!ok) return; setSavedMessage(`Saved "${form.title.trim()}" to your Memory Vault.`); setForm({ title: '', memoryDate: today(), category: 'Life', text: '', emotionalTags: '' }); };
  const runSaveTest = async () => { setDiagnostic(null); const ok = await create({ title: `Memory save test ${new Date().toLocaleTimeString()}`, memoryDate: today(), category: 'System Test', text: 'This confirms Memory Vault can write to local SQLite.', emotionalTags: ['test'] }); setDiagnostic(ok ? 'Memory save test worked. SQLite + Electron IPC are saving correctly.' : 'Memory save test failed. Check the red error message above.'); };

  return <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} className="grid gap-5 xl:grid-cols-[390px_1fr]">
    <Card className="p-6"><p className="text-xs font-bold uppercase tracking-[0.25em] text-accent">Memory vault</p><h2 className="mt-2 font-display text-4xl font-bold">Save a life moment</h2><form onSubmit={submit} className="mt-6 space-y-3"><input className="w-full rounded-2xl border border-line bg-elevated/70 px-4 py-3" placeholder="Memory title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /><div className="grid grid-cols-2 gap-3"><input type="date" className="rounded-2xl border border-line bg-elevated/70 px-4 py-3" value={form.memoryDate} onChange={(e) => setForm({ ...form, memoryDate: e.target.value })} /><input className="rounded-2xl border border-line bg-elevated/70 px-4 py-3" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div><input className="w-full rounded-2xl border border-line bg-elevated/70 px-4 py-3" placeholder="Tags: grateful, proud, peaceful" value={form.emotionalTags} onChange={(e) => setForm({ ...form, emotionalTags: e.target.value })} /><textarea className="min-h-[170px] w-full rounded-3xl border border-line bg-elevated/70 px-4 py-3" placeholder="What happened? Why does it matter?" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} /><Button type="submit" variant="primary" className="w-full" disabled={saving || !form.title.trim()}>{saving ? 'Saving...' : 'Save memory'}</Button><Button className="w-full" onClick={() => void runSaveTest()} disabled={saving}>Test Memory Save</Button>{savedMessage && <p className="rounded-2xl border border-accent/30 bg-accent/10 p-3 text-sm text-accent">{savedMessage}</p>}{diagnostic && <p className="rounded-2xl border border-line bg-elevated/60 p-3 text-sm text-muted">{diagnostic}</p>}{error && <p className="rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}</form></Card>
    <div className="space-y-5">{loading ? <Card>Loading memories...</Card> : Object.keys(grouped).length === 0 ? <Card className="p-10 text-center text-muted">Your vault is empty. Add the first one and future-you gets a tiny museum.</Card> : Object.entries(grouped).map(([year, items]) => <section key={year}><h3 className="mb-3 font-display text-3xl font-bold">{year}</h3><div className="grid gap-4 lg:grid-cols-2">{items.map((memory) => <MemoryCard key={memory.id} memory={memory} highlighted={highlightId === memory.id} onUpdate={update} onDelete={() => window.confirm('Delete this memory?') && void deleteMemory(memory.id)} />)}</div></section>)}</div>
  </motion.div>;
};

const MemoryCard = ({ memory, highlighted, onUpdate, onDelete }: { memory: Memory; highlighted: boolean; onUpdate: (input: { id: string; title?: string; memoryDate?: string | null; category?: string; text?: string; emotionalTags?: string[]; isFavorite?: boolean }) => void; onDelete: () => void }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: memory.title, memoryDate: toInputDate(memory.memoryDate), category: memory.category ?? '', text: memory.content.text, tags: memory.emotionalTags.join(', ') });
  useEffect(() => { if (!editing) setDraft({ title: memory.title, memoryDate: toInputDate(memory.memoryDate), category: memory.category ?? '', text: memory.content.text, tags: memory.emotionalTags.join(', ') }); }, [memory, editing]);
  const save = () => { onUpdate({ id: memory.id, title: draft.title, memoryDate: draft.memoryDate, category: draft.category, text: draft.text, emotionalTags: draft.tags.split(',') }); setEditing(false); };
  return <Card className={`p-5 ${highlighted ? 'ring-2 ring-accent' : ''}`}>{editing ? <div className="space-y-3"><input className="w-full rounded-2xl border border-line bg-elevated/70 px-4 py-3" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /><div className="grid grid-cols-2 gap-2"><input type="date" className="rounded-2xl border border-line bg-elevated/70 px-4 py-3" value={draft.memoryDate} onChange={(e) => setDraft({ ...draft, memoryDate: e.target.value })} /><input className="rounded-2xl border border-line bg-elevated/70 px-4 py-3" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} /></div><input className="w-full rounded-2xl border border-line bg-elevated/70 px-4 py-3" value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} /><textarea className="min-h-[130px] w-full rounded-3xl border border-line bg-elevated/70 px-4 py-3" value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} /><div className="flex gap-2"><Button variant="primary" className="h-9 flex-1" onClick={save}><Check className="mr-1 h-4 w-4" />Save</Button><Button className="h-9 flex-1" onClick={() => setEditing(false)}><X className="mr-1 h-4 w-4" />Cancel</Button></div></div> : <><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">{memory.category ?? 'Memory'}</p><h4 className="mt-2 font-display text-2xl font-bold">{memory.title}</h4></div><div className="flex gap-2"><button onClick={() => void onUpdate({ id: memory.id, isFavorite: !memory.isFavorite })} className="rounded-full border border-line p-2 text-accent">{memory.isFavorite ? <Star className="h-4 w-4 fill-current" /> : <Heart className="h-4 w-4" />}</button><button onClick={() => setEditing(true)} className="rounded-full border border-line p-2 text-accent"><Pencil className="h-4 w-4" /></button><button onClick={onDelete} className="rounded-full border border-line px-3 py-2 text-red-400">Delete</button></div></div><p className="mt-3 text-sm leading-7 text-muted">{memory.content.text || 'No text yet.'}</p><div className="mt-4 flex flex-wrap gap-2">{memory.emotionalTags.map((tag) => <span key={tag} className="rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent">{tag}</span>)}</div></>}</Card>;
};
