# Calendar, Memory Vault, and Travel

This phase turns three sidebar items into real local-first features backed by SQLite and Electron IPC.

## Calendar

- Reads tasks, reminders, journal entries, trips, and memories into one month grid.
- Data is queried locally from SQLite only.
- The right panel shows everything scheduled for the selected day.

## Memory Vault

- Saves personal memories with title, date, category, text, favorite state, and emotional tags.
- Memories are grouped by year for timeline-style browsing.
- Stored in the local `memories` table.

## Travel

- Creates trips with destination, date range, notes, and favorite moment.
- Supports day-by-day travel entries.
- Each day can store writing and a packing list.
- Stored in `trips` and `trip_days` locally.

## Local Architecture

- Main process IPC: `electron/ipc/calendar.ts`, `electron/ipc/memories.ts`, `electron/ipc/travel.ts`
- Preload bridge: `window.avyukta.calendar`, `window.avyukta.memories`, `window.avyukta.travel`
- Renderer stores: `src/store/calendar-store.ts`, `src/store/memory-store.ts`, `src/store/travel-store.ts`
- UI modules: `src/features/calendar`, `src/features/memories`, `src/features/travel`

## Restart Needed

Because this phase adds new Electron preload/main IPC methods, stop the running dev app with `Ctrl+C` and restart it from the app folder:

```bash
cd /Users/aayushdangal/Desktop/avyukta-website/avyukta-life
npm run dev
```
