import type { IpcMain } from 'electron';
import { randomUUID } from 'node:crypto';
import type { CreateTaskInput, Task, TaskStatus, UpdateTaskInput } from '../../src/types/ipc';
import type { AppDatabase } from '../database/client';
import type { AuthService } from '../services/auth-service';
import type { TrashService } from './trash';

type TaskRow = {
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

const taskSelect = `SELECT id, title, description, status, priority, due_at as dueAt, start_at as startAt,
                          completed_at as completedAt, recurrence_rule as recurrenceRule,
                          progress, parent_task_id as parentTaskId, sort_order as sortOrder,
                          created_at as createdAt, updated_at as updatedAt
                   FROM tasks`;

const statuses = new Set<TaskStatus>(['inbox', 'planned', 'doing', 'waiting', 'done', 'archived']);

const cleanStatus = (status?: TaskStatus): TaskStatus => (status && statuses.has(status) ? status : 'inbox');
const cleanPriority = (priority?: number): number => Math.max(1, Math.min(4, Math.floor(priority ?? 2)));
const cleanProgress = (progress?: number): number => Math.max(0, Math.min(100, Math.floor(progress ?? 0)));
const mapTask = (row: TaskRow): Task => ({ ...row, priority: Number(row.priority), progress: Number(row.progress), sortOrder: Number(row.sortOrder) });

const getTask = (db: AppDatabase, userId: string, id: string): Task => {
  const row = db.prepare(`${taskSelect} WHERE id = ? AND user_id = ?`).get(id, userId) as TaskRow | undefined;
  if (!row) throw new Error('Task not found');
  return mapTask(row);
};

export const registerTaskIpc = (ipcMain: IpcMain, db: AppDatabase, auth: AuthService, trashService: TrashService): void => {
  ipcMain.handle('tasks:list', async (): Promise<Task[]> => {
    const rows = db.prepare(`${taskSelect} WHERE status != 'archived' AND user_id = ? ORDER BY status ASC, due_at IS NULL, due_at ASC, sort_order ASC, created_at DESC`).all(auth.getCurrentUserId()) as TaskRow[];
    return rows.map(mapTask);
  });

  ipcMain.handle('tasks:create', async (_event, input: CreateTaskInput): Promise<Task> => {
    const title = input.title.trim();
    if (!title) throw new Error('Task title is required');

    const id = randomUUID();
    const now = new Date().toISOString();
    const dueAt = input.dueAt ? new Date(input.dueAt).toISOString() : null;
    const userId = auth.getCurrentUserId();

    db.prepare(
      `INSERT INTO tasks (id, user_id, title, description, status, priority, due_at, progress, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
    ).run(id, userId, title, input.description?.trim() || null, cleanStatus(input.status), cleanPriority(input.priority), dueAt, now, now);

    return getTask(db, userId, id);
  });

  ipcMain.handle('tasks:update', async (_event, input: UpdateTaskInput): Promise<Task> => {
    const userId = auth.getCurrentUserId();
    const current = getTask(db, userId, input.id);
    const status = input.status ? cleanStatus(input.status) : current.status;
    const progress = input.progress === undefined ? current.progress : cleanProgress(input.progress);
    const completedAt = status === 'done' && current.completedAt === null ? new Date().toISOString() : status !== 'done' ? null : current.completedAt;
    const dueAt = input.dueAt === undefined ? current.dueAt : input.dueAt ? new Date(input.dueAt).toISOString() : null;

    db.prepare(
      `UPDATE tasks
       SET title = ?, description = ?, status = ?, priority = ?, due_at = ?, progress = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`
    ).run(
      input.title === undefined ? current.title : input.title.trim() || current.title,
      input.description === undefined ? current.description : input.description?.trim() || null,
      status,
      input.priority === undefined ? current.priority : cleanPriority(input.priority),
      dueAt,
      progress,
      completedAt,
      input.id,
      userId
    );

    return getTask(db, userId, input.id);
  });

  ipcMain.handle('tasks:delete', async (_event, id: string): Promise<{ ok: true }> => {
    const userId = auth.getCurrentUserId();
    const task = getTask(db, userId, id);
    await trashService.moveToTrash('task', id, task, task.title);
    db.prepare(`UPDATE tasks SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`).run(id, userId);
    return { ok: true };
  });
};
