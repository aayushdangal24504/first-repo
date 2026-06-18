import type { IpcMain } from 'electron';
import { randomUUID } from 'node:crypto';
import type { CreateTripDayInput, CreateTripInput, Trip, TripDay, UpdateTripDayInput, UpdateTripInput } from '../../src/types/ipc';
import type { AppDatabase } from '../database/client';
import type { AuthService } from '../services/auth-service';
import type { TrashService } from './trash';

type TripRow = { id: string; title: string; destination: string | null; startsAt: string | null; endsAt: string | null; coverMediaId: string | null; notes: string | null; favoriteMoment: string | null; createdAt: string; updatedAt: string };
type TripDayRow = { id: string; tripId: string; dayDate: string; title: string | null; entryJson: string; activitiesText: string | null; plansText: string | null; placesVisited: string; foodTried: string; highlightsText: string | null; notesText: string | null; expensesJson: string; packingJson: string; createdAt: string; updatedAt: string };
const tripSelect = `SELECT id, title, destination, starts_at as startsAt, ends_at as endsAt, cover_media_id as coverMediaId, notes, favorite_moment as favoriteMoment, created_at as createdAt, updated_at as updatedAt FROM trips`;
const daySelect = `SELECT id, trip_id as tripId, day_date as dayDate, title, entry_json as entryJson, activities_text as activitiesText, plans_text as plansText, places_visited as placesVisited, food_tried as foodTried, highlights as highlightsText, notes_text as notesText, expenses_json as expensesJson, packing_json as packingJson, created_at as createdAt, updated_at as updatedAt FROM trip_days`;
const safeJson = <T>(value: string, fallback: T): T => { try { return JSON.parse(value) as T; } catch { return fallback; } };
const cleanDate = (date?: string | null): string | null => {
  if (!date) return null;
  const normalized = date.length <= 10 ? `${date.slice(0, 10)}T12:00:00` : date;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};
const cleanList = (items?: string[]): string[] => (items ?? []).map((item) => item.trim()).filter(Boolean);
const mapTripDay = (row: TripDayRow): TripDay => ({ id: row.id, tripId: row.tripId, dayDate: row.dayDate, title: row.title, entry: safeJson<{ text: string }>(row.entryJson, { text: '' }), activities: row.activitiesText, plans: row.plansText, placesVisited: safeJson<string[]>(row.placesVisited, []), foodTried: safeJson<string[]>(row.foodTried, []), highlights: row.highlightsText, notes: row.notesText, expenses: safeJson(row.expensesJson, []), packing: safeJson<string[]>(row.packingJson, []), createdAt: row.createdAt, updatedAt: row.updatedAt });
const getDays = (db: AppDatabase, userId: string, tripId: string): TripDay[] => (db.prepare(`${daySelect} WHERE trip_id = ? AND user_id = ? ORDER BY day_date ASC, created_at ASC`).all(tripId, userId) as TripDayRow[]).map(mapTripDay);
const mapTrip = (db: AppDatabase, userId: string, row: TripRow): Trip => ({ ...row, days: getDays(db, userId, row.id) });
const getTrip = (db: AppDatabase, userId: string, id: string): Trip => { const row = db.prepare(`${tripSelect} WHERE id = ? AND user_id = ?`).get(id, userId) as TripRow | undefined; if (!row) throw new Error('Trip not found'); return mapTrip(db, userId, row); };

export const registerTravelIpc = (ipcMain: IpcMain, db: AppDatabase, auth: AuthService, trashService: TrashService): void => {
  ipcMain.handle('travel:list', async (): Promise<Trip[]> => (db.prepare(`${tripSelect} WHERE user_id = ? ORDER BY COALESCE(starts_at, created_at) DESC`).all(auth.getCurrentUserId()) as TripRow[]).map((row) => mapTrip(db, auth.getCurrentUserId(), row)));
  ipcMain.handle('travel:create', async (_event, input: CreateTripInput): Promise<Trip> => {
    const title = input.title.trim();
    if (!title) throw new Error('Trip title is required');
    const id = randomUUID();
    const now = new Date().toISOString();
    const userId = auth.getCurrentUserId();
    db.prepare(`INSERT INTO trips (id, user_id, title, destination, starts_at, ends_at, notes, favorite_moment, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, userId, title, input.destination?.trim() || null, cleanDate(input.startsAt), cleanDate(input.endsAt), input.notes?.trim() || null, input.favoriteMoment?.trim() || null, now, now);
    return getTrip(db, userId, id);
  });
  ipcMain.handle('travel:update', async (_event, input: UpdateTripInput): Promise<Trip> => {
    const userId = auth.getCurrentUserId();
    const current = getTrip(db, userId, input.id);
    db.prepare(`UPDATE trips SET title = ?, destination = ?, starts_at = ?, ends_at = ?, notes = ?, favorite_moment = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`).run(input.title === undefined ? current.title : input.title.trim() || current.title, input.destination === undefined ? current.destination : input.destination?.trim() || null, input.startsAt === undefined ? current.startsAt : cleanDate(input.startsAt), input.endsAt === undefined ? current.endsAt : cleanDate(input.endsAt), input.notes === undefined ? current.notes : input.notes?.trim() || null, input.favoriteMoment === undefined ? current.favoriteMoment : input.favoriteMoment?.trim() || null, input.id, userId);
    return getTrip(db, userId, input.id);
  });
  ipcMain.handle('travel:delete', async (_event, id: string): Promise<{ ok: true }> => {
    const userId = auth.getCurrentUserId();
    const trip = getTrip(db, userId, id);
    await trashService.moveToTrash('trip', id, trip, trip.title);
    db.prepare('DELETE FROM trips WHERE id = ? AND user_id = ?').run(id, userId);
    return { ok: true };
  });
  ipcMain.handle('travel:create-day', async (_event, input: CreateTripDayInput): Promise<TripDay> => {
    const userId = auth.getCurrentUserId();
    getTrip(db, userId, input.tripId);
    const id = randomUUID();
    const now = new Date().toISOString();
    const dayDate = cleanDate(input.dayDate) ?? new Date().toISOString();
    db.prepare(`INSERT INTO trip_days (id, user_id, trip_id, day_date, title, entry_json, activities_text, plans_text, places_visited, food_tried, highlights, notes_text, expenses_json, packing_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, userId, input.tripId, dayDate, input.title?.trim() || null, JSON.stringify({ text: input.text?.trim() || '' }), input.activities?.trim() || null, input.plans?.trim() || null, JSON.stringify(cleanList(input.placesVisited)), JSON.stringify(cleanList(input.foodTried)), input.highlights?.trim() || null, input.notes?.trim() || null, '[]', JSON.stringify(cleanList(input.packing)), now, now);
    return mapTripDay(db.prepare(`${daySelect} WHERE id = ?`).get(id) as TripDayRow);
  });
  ipcMain.handle('travel:delete-day', async (_event, id: string): Promise<{ ok: true }> => {
    const userId = auth.getCurrentUserId();
    const row = db.prepare(`${daySelect} WHERE id = ? AND user_id = ?`).get(id, userId) as TripDayRow | undefined;
    if (row) {
      const tripDay = mapTripDay(row);
      await trashService.moveToTrash('trip_day', id, tripDay, tripDay.title || `Trip Day - ${tripDay.dayDate}`);
    }
    db.prepare('DELETE FROM trip_days WHERE id = ? AND user_id = ?').run(id, userId);
    return { ok: true };
  });

  ipcMain.handle('travel:update-day', async (_event, input: UpdateTripDayInput): Promise<TripDay> => {
    const userId = auth.getCurrentUserId();
    const row = db.prepare(`${daySelect} WHERE id = ? AND user_id = ?`).get(input.id, userId) as TripDayRow | undefined;
    if (!row) throw new Error('Trip day not found');
    const current = mapTripDay(row);
    db.prepare(`UPDATE trip_days SET day_date = ?, title = ?, entry_json = ?, activities_text = ?, plans_text = ?, places_visited = ?, food_tried = ?, highlights = ?, notes_text = ?, expenses_json = ?, packing_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`).run(input.dayDate === undefined ? current.dayDate : cleanDate(input.dayDate) ?? current.dayDate, input.title === undefined ? current.title : input.title?.trim() || null, JSON.stringify({ text: input.text === undefined ? current.entry.text : input.text }), input.activities === undefined ? current.activities : input.activities?.trim() || null, input.plans === undefined ? current.plans : input.plans?.trim() || null, JSON.stringify(input.placesVisited === undefined ? current.placesVisited : cleanList(input.placesVisited)), JSON.stringify(input.foodTried === undefined ? current.foodTried : cleanList(input.foodTried)), input.highlights === undefined ? current.highlights : input.highlights?.trim() || null, input.notes === undefined ? current.notes : input.notes?.trim() || null, JSON.stringify(input.expenses === undefined ? current.expenses : input.expenses), JSON.stringify(input.packing === undefined ? current.packing : cleanList(input.packing)), input.id, userId);
    return mapTripDay(db.prepare(`${daySelect} WHERE id = ?`).get(input.id) as TripDayRow);
  });
};
