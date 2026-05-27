# SQLite Schema

The Phase 1 schema is intentionally broad enough to support all requested phases without forcing a destructive redesign later.

## Core Tables

- `local_profile`: optional local-only user profile metadata.
- `settings`: theme, layout, widget, backup, and editor preferences.
- `folders`: nested organization across notes, journals, tasks, memories, and media.
- `tags`: reusable tags with colors and icons.
- `entity_tags`: many-to-many tagging across entity types.
- `search_index`: FTS5 table for global search.

## Productivity

- `tasks`: priorities, due dates, recurrence, progress, hierarchy, and Kanban status.
- `reminders`: desktop notification schedule, recurrence, snooze, and linked entities.

## Knowledge And Journaling

- `notes`: rich JSON content, markdown export content, pins, favorites, covers.
- `journals`: daily, travel, memory, thought, and custom journal containers.
- `journal_entries`: dated entries with mood, weather, location, rich content, and layout JSON.
- `templates`: reusable note, journal, task, trip, and memory templates.

## Travel And Memories

- `trips`: trip-level destination, dates, cover, notes, and favorite moment.
- `trip_days`: day-by-day entries, expenses, and packing lists as structured JSON.
- `memories`: memory vault entries with emotional tags and timeline metadata.

## Media

- `media_files`: local file metadata. Actual binary files live in the app's local media folder, not in SQLite.
- `journal_entry_media`: page-to-image links for book-style journal pages.

## Performance Choices

- WAL mode for smoother local writes.
- Foreign keys enabled for consistency.
- Indexes on due tasks, recent notes, journal dates, and media dates.
- FTS5 search table prepared for global search in Phase 3.
- Filesystem media storage avoids bloating SQLite with large images.
