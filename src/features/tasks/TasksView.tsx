import { FormEvent, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Calendar, Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { useTaskStore } from '@/store/task-store';
import type { Task, TaskStatus, UpdateTaskInput } from '@/types/ipc';

const columns: Array<{ status: TaskStatus; label: string; hint: string }> = [
  { status: 'inbox', label: 'Inbox', hint: 'Capture' },
  { status: 'planned', label: 'Planned', hint: 'Scheduled' },
  { status: 'doing', label: 'Doing', hint: 'In motion' },
  { status: 'waiting', label: 'Waiting', hint: 'Blocked' },
  { status: 'done', label: 'Done', hint: 'Completed' }
];

const toDateTimeLocal = (value: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

export const TasksView = () => {
  const { tasks, loading, saving, error, load, create, update, move, delete: deleteTask } = useTaskStore();
  const [title, setTitle] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [priority, setPriority] = useState(2);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => { void load(); }, [load]);

  const grouped = useMemo(() => Object.fromEntries(columns.map((column) => [column.status, tasks.filter((task) => task.status === column.status)])) as Record<TaskStatus, Task[]>, [tasks]);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    await create({ title, dueAt: dueAt ? new Date(dueAt).toISOString() : null, priority, status: 'inbox' });
    setTitle('');
    setDueAt('');
    setPriority(2);
  };

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="p-5">
        <form className="grid grid-cols-[1fr_220px_150px_auto] gap-3" onSubmit={(event) => void handleCreate(event)}>
          <input className="rounded-2xl border border-line/70 bg-surface/60 px-4 py-3 text-sm outline-none focus:border-accent" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add a task and toss it into Inbox..." />
          <input className="rounded-2xl border border-line/70 bg-surface/60 px-4 py-3 text-sm outline-none focus:border-accent" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
          <select className="rounded-2xl border border-line/70 bg-surface/60 px-4 py-3 text-sm outline-none focus:border-accent" value={priority} onChange={(event) => setPriority(Number(event.target.value))}>
            <option value={1}>P1 urgent</option>
            <option value={2}>P2 normal</option>
            <option value={3}>P3 low</option>
            <option value={4}>P4 someday</option>
          </select>
          <Button type="submit" variant="primary" className="gap-2" disabled={saving}><Plus className="h-4 w-4" />Add</Button>
        </form>
        {error && <p className="mt-3 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-500">{error}</p>}
      </Card>

      <div className="grid grid-cols-5 gap-4">
        {columns.map((column) => (
          <Card key={column.status} className="min-h-[560px] p-4" >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-2xl font-bold">{column.label}</h3>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">{column.hint}</p>
              </div>
              <span className="rounded-full bg-accent/15 px-2 py-1 text-xs font-bold text-accent">{grouped[column.status]?.length ?? 0}</span>
            </div>
            <div
              className="min-h-[460px] space-y-3 rounded-[1.5rem] border border-dashed border-line/60 p-2"
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (draggingId) void move(draggingId, column.status);
                setDraggingId(null);
              }}
            >
              {loading && <p className="p-3 text-sm text-muted">Loading...</p>}
              {grouped[column.status]?.map((task) => (
                <TaskCard key={task.id} task={task} onDragStart={() => setDraggingId(task.id)} onDone={() => void move(task.id, 'done')} onDelete={() => void deleteTask(task.id)} onUpdate={(input) => void update(input)} />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </motion.div>
  );
};

const TaskCard = ({ task, onDragStart, onDone, onDelete, onUpdate }: { task: Task; onDragStart: () => void; onDone: () => void; onDelete: () => void; onUpdate: (input: UpdateTaskInput) => void }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    title: task.title,
    description: task.description ?? '',
    dueAt: toDateTimeLocal(task.dueAt),
    priority: task.priority,
    status: task.status,
    progress: task.progress
  });

  useEffect(() => {
    if (!editing) {
      setDraft({ title: task.title, description: task.description ?? '', dueAt: toDateTimeLocal(task.dueAt), priority: task.priority, status: task.status, progress: task.progress });
    }
  }, [editing, task]);

  const save = () => {
    if (!draft.title.trim()) return;
    onUpdate({ id: task.id, title: draft.title, description: draft.description, dueAt: draft.dueAt ? new Date(draft.dueAt).toISOString() : null, priority: draft.priority, status: draft.status, progress: draft.progress });
    setEditing(false);
  };

  if (editing) {
    return (
      <motion.div layout className="rounded-2xl border border-accent/40 bg-surface/80 p-4 shadow-soft">
        <div className="space-y-2">
          <input className="w-full rounded-xl border border-line/70 bg-elevated/60 px-3 py-2 text-sm font-semibold outline-none focus:border-accent" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
          <textarea className="min-h-20 w-full resize-none rounded-xl border border-line/70 bg-elevated/60 px-3 py-2 text-sm outline-none focus:border-accent" placeholder="Description" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
          <input className="w-full rounded-xl border border-line/70 bg-elevated/60 px-3 py-2 text-sm outline-none focus:border-accent" type="datetime-local" value={draft.dueAt} onChange={(event) => setDraft({ ...draft, dueAt: event.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <select className="rounded-xl border border-line/70 bg-elevated/60 px-3 py-2 text-sm outline-none focus:border-accent" value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: Number(event.target.value) })}>
              <option value={1}>P1 urgent</option><option value={2}>P2 normal</option><option value={3}>P3 low</option><option value={4}>P4 someday</option>
            </select>
            <select className="rounded-xl border border-line/70 bg-elevated/60 px-3 py-2 text-sm outline-none focus:border-accent" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as TaskStatus })}>
              {columns.map((column) => <option key={column.status} value={column.status}>{column.label}</option>)}
            </select>
          </div>
          <label className="block text-xs font-bold uppercase tracking-[0.16em] text-muted">Progress {draft.progress}%</label>
          <input type="range" min={0} max={100} step={5} value={draft.progress} onChange={(event) => setDraft({ ...draft, progress: Number(event.target.value) })} className="w-full" />
        </div>
        <div className="mt-3 flex gap-2">
          <Button className="h-8 flex-1 gap-1" variant="primary" onClick={save}><Check className="h-4 w-4" />Save</Button>
          <Button className="h-8 flex-1 gap-1" onClick={() => setEditing(false)}><X className="h-4 w-4" />Cancel</Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div layout draggable onDragStart={onDragStart} className="cursor-grab rounded-2xl border border-line/70 bg-surface/70 p-4 shadow-soft active:cursor-grabbing">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-semibold">{task.title}</h4>
          {task.description && <p className="mt-1 text-sm text-muted">{task.description}</p>}
        </div>
        <div className="flex shrink-0 gap-1">
          <button type="button" className="rounded-xl p-1 text-muted hover:bg-accent/10 hover:text-accent" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /></button>
          <button type="button" className="rounded-xl p-1 text-muted hover:bg-red-500/10 hover:text-red-500" onClick={onDelete}><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs font-bold uppercase tracking-[0.16em] text-muted">
        <span className={cn(task.priority === 1 && 'text-red-500')}>P{task.priority}</span>
        <span>{task.progress}%</span>
        {task.dueAt && <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(task.dueAt), 'MMM d')}</span>}
      </div>
      {task.status !== 'done' && <Button className="mt-3 h-8 w-full" variant="ghost" onClick={onDone}>Mark Done</Button>}
    </motion.div>
  );
};
