import { FormEvent, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { format } from 'date-fns';
import { BookOpen, Camera, ChevronLeft, ChevronRight, Download, Heart, ImagePlus, Map, Move, Pencil, Plus, Save, Sparkles, Trash2, Type } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { useJournalStore } from '@/store/journal-store';
import { useUiStore } from '@/store/ui-store';
import type { JournalEntry, JournalKind, JournalPageBlock } from '@/types/ipc';

const coverColors = ['#6f4a2c', '#4f3b25', '#735230', '#483224', '#7d6040'];
const journalKinds: Array<{ value: JournalKind; label: string }> = [
  { value: 'daily', label: 'Daily' },
  { value: 'thoughts', label: 'Thoughts' },
  { value: 'memory', label: 'Memory' },
  { value: 'travel', label: 'Travel' },
  { value: 'custom', label: 'Custom' }
];

const toDateInput = (isoDate: string): string => new Date(isoDate).toISOString().slice(0, 10);
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const getTextFit = (text = '') => {
  const lines = text.split('\n');
  const longestLine = Math.max(10, ...lines.map((line) => line.trim().length));
  return {
    width: clamp(longestLine * 10 + 58, 160, 420),
    height: clamp(lines.length * 32 + 78, 92, 320)
  };
};
const normalizeTextBlock = (block: JournalPageBlock): JournalPageBlock => {
  if (block.type === 'image') return block;
  const fit = getTextFit(block.text ?? '');
  if ((block.text ?? '').trim().length === 0 && (block.width > 380 || block.height > 190)) {
    return { ...block, width: 240, height: 110 };
  }
  if ((block.text ?? '').trim().length < 40 && (block.width > fit.width + 120 || block.height > fit.height + 120)) {
    return { ...block, width: fit.width, height: fit.height };
  }
  return block;
};

export const JournalView = () => {
  const {
    journals,
    activeBook,
    selectedPageIndex,
    loading,
    saving,
    error,
    loadJournals,
    createJournal,
    updateJournal,
    deleteJournal,
    exportBook,
    openJournal,
    createPage,
    deletePage,
    updateEntry,
    importImages,
    setSelectedPageIndex
  } = useJournalStore();
  const [newTitle, setNewTitle] = useState('My Life Book');
  const [newKind, setNewKind] = useState<JournalKind>('daily');
  const [newCover, setNewCover] = useState(coverColors[0]);
  const [bookTitle, setBookTitle] = useState('');
  const [exportPath, setExportPath] = useState<string | null>(null);
  const navigationTarget = useUiStore((state) => state.navigationTarget);
  const clearNavigationTarget = useUiStore((state) => state.clearNavigationTarget);

  useEffect(() => {
    void loadJournals();
  }, [loadJournals]);

  useEffect(() => {
    setBookTitle(activeBook?.journal.title ?? '');
  }, [activeBook?.journal.id, activeBook?.journal.title]);

  useEffect(() => {
    if (navigationTarget?.type === 'journal' && navigationTarget.parentId) {
      void openJournal(navigationTarget.parentId, navigationTarget.id);
      clearNavigationTarget();
    }
  }, [navigationTarget, openJournal, clearNavigationTarget]);

  const entry = activeBook?.entries[selectedPageIndex] ?? null;
  const canGoBack = selectedPageIndex > 0;
  const canGoForward = Boolean(activeBook && selectedPageIndex < activeBook.entries.length - 1);

  const handleCreateJournal = async (event: FormEvent) => {
    event.preventDefault();
    if (!newTitle.trim()) return;
    await createJournal({ title: newTitle, kind: newKind, coverColor: newCover });
  };

  const saveBookTitle = async () => {
    if (!activeBook || !bookTitle.trim()) return;
    await updateJournal({ id: activeBook.journal.id, title: bookTitle });
  };

  const doExport = async (format: 'pdf' | 'docx') => {
    if (!activeBook) return;
    const result = await exportBook({ journalId: activeBook.journal.id, format });
    if (result) setExportPath(result.path);
  };

  const goBack = () => canGoBack && setSelectedPageIndex(selectedPageIndex - 1);
  const goForward = () => canGoForward && setSelectedPageIndex(selectedPageIndex + 1);
  const confirmDeleteJournal = () => {
    if (!activeBook) return;
    if (window.confirm(`Delete journal \"${activeBook.journal.title}\" and all its pages?`)) void deleteJournal(activeBook.journal.id);
  };
  const confirmDeletePage = () => {
    if (!entry) return;
    if (window.confirm('Delete this journal page?')) void deletePage(entry.id);
  };

  return (
    <motion.div className="grid grid-cols-[300px_minmax(920px,1fr)] gap-6" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <aside className="space-y-5">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-accent">Journal Shelf</p>
              <h2 className="mt-2 font-display text-3xl font-bold">Your books</h2>
            </div>
            <BookOpen className="h-7 w-7 text-accent" />
          </div>
          <form className="mt-5 space-y-3" onSubmit={(event) => void handleCreateJournal(event)}>
            <input className="w-full rounded-2xl border border-line/70 bg-surface/60 px-4 py-3 text-sm outline-none transition focus:border-accent" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="Journal title" />
            <div className="grid grid-cols-2 gap-2">
              <select className="rounded-2xl border border-line/70 bg-surface/60 px-3 py-3 text-sm outline-none transition focus:border-accent" value={newKind} onChange={(event) => setNewKind(event.target.value as JournalKind)}>
                {journalKinds.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}
              </select>
              <div className="flex items-center justify-end gap-2 rounded-2xl border border-line/70 bg-surface/60 px-3">
                {coverColors.map((color) => <button key={color} type="button" className={cn('h-5 w-5 rounded-full ring-offset-2 ring-offset-surface transition', newCover === color && 'ring-2 ring-accent')} style={{ background: color }} onClick={() => setNewCover(color)} aria-label="Choose cover color" />)}
              </div>
            </div>
            <Button type="submit" variant="primary" className="w-full gap-2" disabled={saving}><Plus className="h-4 w-4" />Create Book</Button>
          </form>
          {error && <p className="mt-3 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-500">{error}</p>}
        </Card>

        <div className="space-y-3">
          {loading && <Card className="p-4 text-sm text-muted">Loading your journal shelf...</Card>}
          {journals.map((journal) => {
            const active = activeBook?.journal.id === journal.id;
            return (
              <button key={journal.id} type="button" onClick={() => void openJournal(journal.id)} className={cn('group w-full rounded-[1.5rem] border p-4 text-left transition hover:-translate-y-0.5 hover:border-accent/50', active ? 'border-accent bg-accent text-white shadow-soft' : 'border-line/70 bg-elevated/50 text-ink')}>
                <div className="flex items-center gap-3">
                  <div className="h-16 w-11 rounded-lg shadow-soft" style={{ background: `linear-gradient(135deg, ${journal.coverColor ?? '#6f4a2c'}, #2f2116)` }} />
                  <div className="min-w-0">
                    <p className="truncate font-display text-xl font-bold">{journal.title}</p>
                    <p className={cn('mt-1 text-xs font-bold uppercase tracking-[0.18em]', active ? 'text-white/70' : 'text-muted')}>{journal.kind} · {journal.entryCount} pages</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="space-y-5">
        {!activeBook || !entry ? (
          <EmptyJournalState onCreate={() => void createJournal({ title: 'My First Journal', kind: 'daily', coverColor: coverColors[1] })} />
        ) : (
          <>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-muted">Vintage {activeBook.journal.kind} journal</p>
                <div className="mt-2 flex items-center gap-2">
                  <input className="min-w-0 bg-transparent font-display text-4xl font-bold outline-none" value={bookTitle} onChange={(event) => setBookTitle(event.target.value)} />
                  <Button className="gap-2" onClick={() => void saveBookTitle()}><Pencil className="h-4 w-4" />Rename</Button>
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button onClick={goBack} disabled={!canGoBack} className="gap-2"><ChevronLeft className="h-4 w-4" />Previous</Button>
                <Button onClick={goForward} disabled={!canGoForward} className="gap-2">Next<ChevronRight className="h-4 w-4" /></Button>
                <Button variant="primary" onClick={() => void createPage()} className="gap-2"><Plus className="h-4 w-4" />New Page</Button>
                <Button onClick={confirmDeletePage} className="gap-2 text-red-500"><Trash2 className="h-4 w-4" />Delete Page</Button>
                <Button onClick={confirmDeleteJournal} className="gap-2 text-red-500"><Trash2 className="h-4 w-4" />Delete Book</Button>
                <Button onClick={() => void doExport('pdf')} className="gap-2"><Download className="h-4 w-4" />PDF</Button>
                <Button onClick={() => void doExport('docx')} className="gap-2"><Download className="h-4 w-4" />DOCX</Button>
              </div>
            </div>

            {/* Page Navigation Indicators */}
            {activeBook && activeBook.entries.length > 0 && (
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-elevated/30 p-4 overflow-x-auto">
                <span className="shrink-0 text-sm font-bold text-muted">
                  Page {selectedPageIndex + 1} of {activeBook.entries.length}:
                </span>
                <div className="flex gap-1.5 px-2">
                  {activeBook.entries.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedPageIndex(index)}
                      className={cn(
                        'h-2.5 w-2.5 rounded-full transition-all',
                        index === selectedPageIndex
                          ? 'bg-accent w-8'
                          : 'bg-line/50 hover:bg-line'
                      )}
                      title={`Go to page ${index + 1}`}
                      aria-label={`Page ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            )}
            {exportPath && <p className="rounded-2xl border border-accent/30 bg-accent/10 p-3 text-sm text-accent">Saved export to: <span className="font-mono">{exportPath}</span></p>}

            <div className="grid grid-cols-[minmax(860px,1fr)_330px] gap-6">
              <BookPage key={entry.id} entry={entry} pageNumber={selectedPageIndex + 1} totalPages={activeBook.entries.length} saving={saving} onUpdate={(input) => void updateEntry({ id: entry.id, ...input })} onAddPhotos={() => void importImages(entry.id)} />
              <PageInspector key={`${entry.id}-inspector`} entry={entry} saving={saving} onUpdate={(input) => void updateEntry({ id: entry.id, ...input })} onAddPhotos={() => void importImages(entry.id)} />
            </div>
          </>
        )}
      </section>
    </motion.div>
  );
};

const EmptyJournalState = ({ onCreate }: { onCreate: () => void }) => (
  <Card className="grid min-h-[720px] place-items-center p-10 text-center">
    <div className="max-w-xl">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-[2rem] bg-accent/15 text-accent"><Sparkles className="h-10 w-10" /></div>
      <h2 className="mt-6 font-display text-5xl font-bold">Start your first old journal.</h2>
      <p className="mt-4 text-base leading-8 text-muted">Create a vintage book, drag photos and text around like a scrapbook map, then export it where you want.</p>
      <Button variant="primary" className="mt-7" onClick={onCreate}>Create First Journal</Button>
    </div>
  </Card>
);

type EntryPatch = {
  title?: string | null;
  text?: string;
  blocks?: JournalPageBlock[];
  mood?: string | null;
  weather?: string | null;
  locationLabel?: string | null;
  entryDate?: string;
  isFavorite?: boolean;
};

const BookPage = ({ entry, pageNumber, totalPages, saving, onUpdate, onAddPhotos }: { entry: JournalEntry; pageNumber: number; totalPages: number; saving: boolean; onUpdate: (input: EntryPatch) => void; onAddPhotos: () => void }) => {
  const pageRef = useRef<HTMLDivElement | null>(null);
  const [title, setTitle] = useState(entry.title ?? '');
  const [blocks, setBlocks] = useState<JournalPageBlock[]>(entry.blocks);
  const [dragging, setDragging] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const selectedBlock = blocks.find((block) => block.id === selectedBlockId) ?? null;

  useEffect(() => {
    setTitle(entry.title ?? '');
    setSelectedBlockId(null);
    setBlocks(entry.blocks.length > 0 ? entry.blocks.map(normalizeTextBlock) : [{ id: crypto.randomUUID(), type: 'text', text: entry.text, x: 96, y: 150, width: 240, height: 110, rotation: -0.2, zIndex: 2 }]);
  }, [entry.id]);

  useEffect(() => {
    setTitle(entry.title ?? '');
  }, [entry.id, entry.title]);

  useEffect(() => {
    setBlocks((current) => {
      const next = entry.blocks.length > 0 ? entry.blocks.map(normalizeTextBlock) : [{ id: crypto.randomUUID(), type: 'text' as const, text: entry.text, x: 96, y: 150, width: 240, height: 110, rotation: -0.2, zIndex: 2 }];
      return JSON.stringify(current) === JSON.stringify(next) ? current : next;
    });
  }, [entry.id, entry.blocks, entry.text]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const text = blocks.filter((block) => block.type !== 'image').map((block) => block.text ?? '').join('\n\n');
      if (JSON.stringify(blocks) !== JSON.stringify(entry.blocks) || title !== (entry.title ?? '')) {
        onUpdate({ title, text, blocks });
      }
    }, 550);
    return () => clearTimeout(timer);
  }, [blocks, title, entry.blocks, entry.title, onUpdate]);

  const addTextBlock = () => {
    const maxZ = Math.max(1, ...blocks.map((block) => block.zIndex));
    const id = crypto.randomUUID();
    setBlocks((current) => [...current, { id, type: 'text', text: 'New note...', x: 160, y: 190, width: 240, height: 120, rotation: -1.5, zIndex: maxZ + 1 }]);
    setSelectedBlockId(id);
  };

  const updateBlock = (id: string, patch: Partial<JournalPageBlock>) => setBlocks((current) => current.map((block) => (block.id === id ? { ...block, ...patch } : block)));
  const deleteBlock = (id: string) => {
    setBlocks((current) => current.filter((block) => block.id !== id));
    setSelectedBlockId((current) => (current === id ? null : current));
  };
  const deleteSelectedBlock = () => {
    if (!selectedBlock) return;
    deleteBlock(selectedBlock.id);
  };
  const updateSelectedBlock = (patch: Partial<JournalPageBlock>) => {
    if (!selectedBlock) return;
    updateBlock(selectedBlock.id, patch);
  };
  const resizeSelectedBlock = (dw: number, dh: number) => {
    if (!selectedBlock) return;
    updateSelectedBlock({ width: clamp(selectedBlock.width + dw, 100, 680), height: clamp(selectedBlock.height + dh, 70, 560) });
  };
  const fitSelectedTextBlock = () => {
    if (!selectedBlock || selectedBlock.type === 'image') return;
    updateSelectedBlock(getTextFit(selectedBlock.text ?? ''));
  };

  const startDrag = (event: ReactPointerEvent, block: JournalPageBlock) => {
    setSelectedBlockId(block.id);
    if ((event.target as HTMLElement).closest('[data-editable="true"]')) return;
    const rect = pageRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDragging({ id: block.id, dx: event.clientX - rect.left - block.x, dy: event.clientY - rect.top - block.y });
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: ReactPointerEvent) => {
    if (!dragging || !pageRef.current) return;
    const rect = pageRef.current.getBoundingClientRect();
    const block = blocks.find((item) => item.id === dragging.id);
    if (!block) return;
    updateBlock(dragging.id, {
      x: clamp(event.clientX - rect.left - dragging.dx, 12, 830 - block.width),
      y: clamp(event.clientY - rect.top - dragging.dy, 64, 650 - block.height)
    });
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.closest('input, textarea, select, [contenteditable="true"]');
      if (isTyping || !selectedBlockId || (event.key !== 'Backspace' && event.key !== 'Delete')) return;
      event.preventDefault();
      deleteBlock(selectedBlockId);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedBlockId]);

  return (
    <div className="relative min-h-[780px] rounded-[2.8rem] bg-[#3b281a] p-5 shadow-glass" style={{ perspective: '1700px' }}>
      <div className="absolute bottom-14 left-8 top-14 w-7 rounded-full bg-black/30 blur-md" />
      <AnimatePresence mode="wait">
        <motion.article key={entry.id} className="relative ml-7 min-h-[740px] overflow-hidden rounded-[2.2rem] border border-[#b9945d] bg-[#e9d2a3] p-8 text-[#352515] shadow-[0_34px_80px_rgba(0,0,0,0.32)]" initial={{ opacity: 0, x: 80, rotateY: -20 }} animate={{ opacity: 1, x: 0, rotateY: 0 }} exit={{ opacity: 0, x: -80, rotateY: 20 }} transition={{ duration: 0.42, ease: 'easeOut' }} style={{ transformStyle: 'preserve-3d' }}>
          <div className="pointer-events-none absolute inset-0 opacity-80" style={{ background: 'radial-gradient(circle at 16% 18%, rgba(92,52,21,.22), transparent 160px), radial-gradient(circle at 82% 74%, rgba(95,56,22,.20), transparent 210px), radial-gradient(circle at 70% 20%, rgba(255,245,207,.35), transparent 170px), linear-gradient(90deg, rgba(69,42,20,.20), transparent 110px)' }} />
          <div className="pointer-events-none absolute inset-0 opacity-[0.16]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'180\' height=\'180\' viewBox=\'0 0 180 180\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'180\' height=\'180\' filter=\'url(%23n)\' opacity=\'0.55\'/%3E%3C/svg%3E")' }} />
          <div className="relative z-20 flex items-center justify-between border-b border-[#8b6536]/30 pb-4">
            <input className="w-full bg-transparent font-display text-4xl font-bold outline-none placeholder:text-[#7c5a33]" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Untitled page" />
            <span className="ml-4 shrink-0 rounded-full bg-[#d7b87d]/55 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#6a4924]">{saving ? 'Saving' : 'Saved'}</span>
          </div>
          <div className="relative z-30 mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-[#8b6536]/25 bg-[#fff2c9]/55 p-2 text-xs font-bold uppercase tracking-[0.14em] text-[#6a4924]">
            <span className="mr-1">{selectedBlock ? `Selected ${selectedBlock.type}` : 'Click a text/photo block to edit size & rotation'}</span>
            <button type="button" className="rounded-full bg-[#352515]/80 px-3 py-1 text-[#f7e5bd] disabled:opacity-40" disabled={!selectedBlock} onClick={() => resizeSelectedBlock(28, 0)}>Width +</button>
            <button type="button" className="rounded-full bg-[#352515]/80 px-3 py-1 text-[#f7e5bd] disabled:opacity-40" disabled={!selectedBlock} onClick={() => resizeSelectedBlock(-28, 0)}>Width -</button>
            <button type="button" className="rounded-full bg-[#352515]/80 px-3 py-1 text-[#f7e5bd] disabled:opacity-40" disabled={!selectedBlock} onClick={() => resizeSelectedBlock(0, 28)}>Height +</button>
            <button type="button" className="rounded-full bg-[#352515]/80 px-3 py-1 text-[#f7e5bd] disabled:opacity-40" disabled={!selectedBlock} onClick={() => resizeSelectedBlock(0, -28)}>Height -</button>
            <button type="button" className="rounded-full bg-[#352515]/80 px-3 py-1 text-[#f7e5bd] disabled:opacity-40" disabled={!selectedBlock} onClick={() => selectedBlock && updateSelectedBlock({ rotation: selectedBlock.rotation - 5 })}>Rotate Left</button>
            <button type="button" className="rounded-full bg-[#352515]/80 px-3 py-1 text-[#f7e5bd] disabled:opacity-40" disabled={!selectedBlock} onClick={() => selectedBlock && updateSelectedBlock({ rotation: selectedBlock.rotation + 5 })}>Rotate Right</button>
            <button type="button" className="rounded-full bg-[#352515]/80 px-3 py-1 text-[#f7e5bd] disabled:opacity-40" disabled={!selectedBlock || selectedBlock.type === 'image'} onClick={fitSelectedTextBlock}>Fit Text</button>
            <button type="button" className="inline-flex items-center gap-1 rounded-full bg-red-950/80 px-3 py-1 text-red-100 disabled:opacity-40" disabled={!selectedBlock} onClick={deleteSelectedBlock}><Trash2 className="h-3 w-3" />Delete</button>
          </div>

          <div
            ref={pageRef}
            className="relative z-10 mt-4 h-[650px] overflow-hidden rounded-[1.4rem]"
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) setSelectedBlockId(null);
            }}
            onPointerMove={moveDrag}
            onPointerUp={() => setDragging(null)}
            onPointerCancel={() => setDragging(null)}
          >
            {blocks.map((block) => (
              <FreeBlock key={block.id} block={block} selected={selectedBlockId === block.id} onPointerDown={(event) => startDrag(event, block)} onSelect={() => setSelectedBlockId(block.id)} onChange={(patch) => updateBlock(block.id, patch)} onDelete={() => deleteBlock(block.id)} />
            ))}
          </div>

          <div className="relative z-20 mt-3 flex items-center justify-between text-xs font-bold uppercase tracking-[0.2em] text-[#6a4924]">
            <span>{format(new Date(entry.entryDate), 'MMMM d, yyyy')}</span>
            <div className="flex gap-2">
              <button type="button" className="inline-flex items-center gap-2 rounded-full bg-[#d7b87d]/55 px-3 py-2 transition hover:bg-[#d3aa61]" onClick={addTextBlock}><Type className="h-4 w-4" />Text Box</button>
              <button type="button" className="inline-flex items-center gap-2 rounded-full bg-[#d7b87d]/55 px-3 py-2 transition hover:bg-[#d3aa61]" onClick={onAddPhotos}><ImagePlus className="h-4 w-4" />Add Photos</button>
            </div>
            <span>Page {pageNumber} / {totalPages}</span>
          </div>
        </motion.article>
      </AnimatePresence>
    </div>
  );
};

const FreeBlock = ({ block, selected, onPointerDown, onSelect, onChange, onDelete }: { block: JournalPageBlock; selected: boolean; onPointerDown: (event: ReactPointerEvent) => void; onSelect: () => void; onChange: (patch: Partial<JournalPageBlock>) => void; onDelete: () => void }) => {
  const blockRef = useRef<HTMLDivElement | null>(null);
  const [gesture, setGesture] = useState<
    | { type: 'resize'; corner: 'nw' | 'ne' | 'sw' | 'se'; startX: number; startY: number; startWidth: number; startHeight: number; startLeft: number; startTop: number }
    | { type: 'rotate'; centerX: number; centerY: number; startAngle: number; startRotation: number }
    | null
  >(null);
  const imageSrc = block.image?.dataUrl ?? block.image?.fileUrl;
  const style = { left: block.x, top: block.y, width: block.width, height: block.height, transform: `rotate(${block.rotation}deg)`, zIndex: block.zIndex };

  useEffect(() => {
    if (!gesture) return;

    const onPointerMove = (event: PointerEvent) => {
      if (gesture.type === 'rotate') {
        const angle = Math.atan2(event.clientY - gesture.centerY, event.clientX - gesture.centerX) * (180 / Math.PI);
        onChange({ rotation: gesture.startRotation + angle - gesture.startAngle });
        return;
      }

      const dx = event.clientX - gesture.startX;
      const dy = event.clientY - gesture.startY;
      const growsLeft = gesture.corner.includes('w');
      const growsTop = gesture.corner.includes('n');
      const nextWidth = clamp(gesture.startWidth + (growsLeft ? -dx : dx), 90, 680);
      const nextHeight = clamp(gesture.startHeight + (growsTop ? -dy : dy), 70, 560);

      onChange({
        width: nextWidth,
        height: nextHeight,
        x: growsLeft ? gesture.startLeft + (gesture.startWidth - nextWidth) : gesture.startLeft,
        y: growsTop ? gesture.startTop + (gesture.startHeight - nextHeight) : gesture.startTop
      });
    };

    const onPointerUp = () => setGesture(null);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp, { once: true });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [gesture, onChange]);

  const startResize = (event: ReactPointerEvent, corner: 'nw' | 'ne' | 'sw' | 'se') => {
    event.preventDefault();
    event.stopPropagation();
    onSelect();
    setGesture({ type: 'resize', corner, startX: event.clientX, startY: event.clientY, startWidth: block.width, startHeight: block.height, startLeft: block.x, startTop: block.y });
  };

  const startRotate = (event: ReactPointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onSelect();
    const rect = blockRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const startAngle = Math.atan2(event.clientY - centerY, event.clientX - centerX) * (180 / Math.PI);
    setGesture({ type: 'rotate', centerX, centerY, startAngle, startRotation: block.rotation });
  };

  return (
    <div ref={blockRef} className={cn('group absolute cursor-grab rounded-2xl active:cursor-grabbing', selected && 'ring-2 ring-[#5c3518] ring-offset-2 ring-offset-[#e9d2a3]')} style={style} onPointerDown={onPointerDown}>
      <div className={cn('absolute -top-8 left-0 hidden items-center gap-1 rounded-full bg-[#352515]/90 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#f7e5bd] group-hover:flex', selected && 'flex')}>
        <Move className="h-3 w-3" /> Drag
        <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onDelete(); }} className="ml-2 text-red-200">Delete</button>
      </div>
      {block.type === 'image' && block.image && imageSrc ? (
        <figure className="h-full rounded-2xl bg-[#fff8e6] p-2 shadow-[0_18px_38px_rgba(54,31,14,.28)]">
          <img src={imageSrc} alt="" className="h-full w-full rounded-xl object-cover" draggable={false} />
        </figure>
      ) : (
        <textarea
          data-editable="true"
          className="h-full min-h-[80px] w-full resize-none rounded-2xl border border-[#9e7440]/20 bg-[#fff2c9]/35 p-4 font-serif text-lg leading-8 text-[#352515] shadow-sm outline-none placeholder:text-[#8a663b]"
          value={block.text ?? ''}
          onFocus={onSelect}
          onClick={onSelect}
          onChange={(event) => onChange({ text: event.target.value, ...getTextFit(event.target.value) })}
          placeholder="Write a movable note..."
        />
      )}
      {selected && (
        <>
          {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
            <button
              key={corner}
              type="button"
              aria-label={`Resize ${corner}`}
              onPointerDown={(event) => startResize(event, corner)}
              className={cn(
                'absolute h-4 w-4 rounded-full border-2 border-[#352515] bg-[#f7e5bd] shadow-[0_2px_8px_rgba(54,31,14,.35)]',
                corner === 'nw' && '-left-2 -top-2 cursor-nwse-resize',
                corner === 'ne' && '-right-2 -top-2 cursor-nesw-resize',
                corner === 'sw' && '-bottom-2 -left-2 cursor-nesw-resize',
                corner === 'se' && '-bottom-2 -right-2 cursor-nwse-resize'
              )}
            />
          ))}
          <button
            type="button"
            aria-label="Rotate block"
            onPointerDown={startRotate}
            className="absolute left-1/2 top-full mt-5 grid h-7 w-7 -translate-x-1/2 cursor-grab place-items-center rounded-full border-2 border-[#352515] bg-[#f7e5bd] text-sm font-black text-[#352515] shadow-[0_4px_12px_rgba(54,31,14,.35)] active:cursor-grabbing"
          >
            ↻
          </button>
          <div className="absolute left-1/2 top-full h-5 w-px -translate-x-1/2 bg-[#352515]/55" />
        </>
      )}
    </div>
  );
};

const PageInspector = ({ entry, saving, onUpdate, onAddPhotos }: { entry: JournalEntry; saving: boolean; onUpdate: (input: EntryPatch) => void; onAddPhotos: () => void }) => {
  const [mood, setMood] = useState(entry.mood ?? '');
  const [weather, setWeather] = useState(entry.weather ?? '');
  const [locationLabel, setLocationLabel] = useState(entry.locationLabel ?? '');
  const [entryDate, setEntryDate] = useState(toDateInput(entry.entryDate));
  const [localPaths, setLocalPaths] = useState<{ mediaPath: string; exportsPath: string } | null>(null);

  useEffect(() => {
    setMood(entry.mood ?? '');
    setWeather(entry.weather ?? '');
    setLocationLabel(entry.locationLabel ?? '');
    setEntryDate(toDateInput(entry.entryDate));
  }, [entry.id, entry.mood, entry.weather, entry.locationLabel, entry.entryDate]);

  useEffect(() => {
    void window.avyukta.app.getLocalPaths().then((paths) => setLocalPaths({ mediaPath: paths.mediaPath, exportsPath: paths.exportsPath }));
  }, []);

  const saveDetails = () => onUpdate({ mood, weather, locationLabel, entryDate: new Date(entryDate).toISOString() });

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex items-center justify-between"><h3 className="font-display text-2xl font-bold">Page Details</h3><span className="text-xs font-bold uppercase tracking-[0.18em] text-muted">{saving ? 'Saving' : 'Ready'}</span></div>
        <div className="mt-5 space-y-3">
          <label className="block"><span className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Date</span><input type="date" className="mt-2 w-full rounded-2xl border border-line/70 bg-surface/60 px-4 py-3 text-sm outline-none transition focus:border-accent" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} /></label>
          <label className="block"><span className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Mood</span><input className="mt-2 w-full rounded-2xl border border-line/70 bg-surface/60 px-4 py-3 text-sm outline-none transition focus:border-accent" value={mood} onChange={(event) => setMood(event.target.value)} placeholder="Peaceful, nostalgic, excited..." /></label>
          <label className="block"><span className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Weather</span><input className="mt-2 w-full rounded-2xl border border-line/70 bg-surface/60 px-4 py-3 text-sm outline-none transition focus:border-accent" value={weather} onChange={(event) => setWeather(event.target.value)} placeholder="Rainy, warm, cloudy..." /></label>
          <label className="block"><span className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Location</span><input className="mt-2 w-full rounded-2xl border border-line/70 bg-surface/60 px-4 py-3 text-sm outline-none transition focus:border-accent" value={locationLabel} onChange={(event) => setLocationLabel(event.target.value)} placeholder="Home, Chicago, airport..." /></label>
          <div className="grid grid-cols-2 gap-2"><Button className="gap-2" onClick={saveDetails}><Save className="h-4 w-4" />Save</Button><Button variant={entry.isFavorite ? 'primary' : 'secondary'} className="gap-2" onClick={() => onUpdate({ isFavorite: !entry.isFavorite })}><Heart className="h-4 w-4" />Favorite</Button></div>
        </div>
      </Card>
      <Card className="p-5">
        <div className="flex items-center justify-between"><h3 className="font-display text-2xl font-bold">Photos</h3><Button variant="ghost" className="h-9 gap-2" onClick={onAddPhotos}><Camera className="h-4 w-4" />Add</Button></div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {entry.images.length === 0 ? <p className="col-span-2 rounded-2xl border border-dashed border-line bg-surface/40 p-4 text-sm leading-6 text-muted">No pictures yet. Add local photos and they will appear directly on the vintage page.</p> : entry.images.map((image) => <img key={image.id} src={image.dataUrl ?? image.fileUrl} alt={image.originalName} className="aspect-square rounded-2xl object-cover shadow-soft" />)}
        </div>
      </Card>
      <Card className="p-5">
        <div className="flex items-center gap-2"><Map className="h-5 w-5 text-accent" /><h3 className="font-display text-2xl font-bold">Saved Locally</h3></div>
        <p className="mt-3 text-sm leading-6 text-muted">Photos are copied into this app media folder. Exports ask you where to save.</p>
        <p className="mt-3 break-all rounded-2xl bg-surface/45 p-3 font-mono text-xs text-muted">{localPaths?.mediaPath ?? 'Loading media path...'}</p>
      </Card>
    </div>
  );
};
