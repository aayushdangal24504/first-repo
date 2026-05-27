# Current App Status

Avyukta Life is now a usable local-first MVP, but it is not the final dream version yet.

## Working Now

- Dashboard with mood tracker and mood-based quotes.
- Local reminders with macOS desktop notifications while the app is running.
- Task board with create, due date, priority, archive/delete, done, and drag between columns.
- Notes with a TipTap rich text editor, headings, lists, code blocks, highlights, and local SQLite saving.
- Book-style journals with pages, autosave writing, page metadata, favorites, photos, and page-flip animation.
- Media library for imported local images.
- JSON backup export of local SQLite data.
- Light/dark theme shell, sidebar navigation, command palette, local-only filesystem/data architecture.

## Still Not Final

These are not finished yet:

- Full ZIP backup/restore including media files.
- PDF export for journals.
- Advanced scrapbook drag/drop page layouts.
- Text wrapping around images.
- Stickers/stamps/decorative assets.
- Full travel journal expenses/maps/packing UX.
- Memory vault timeline UX.
- Global FTS search screen.
- Settings screen for fonts/accent/layout widgets.
- Packaged signed macOS `.app` polish.

## Important Restart Rule

When we add or change Electron main-process code, you must quit the running app and start it again:

```bash
npm run dev
```

If a button appears to do nothing after a coding change, the most likely cause is an old Electron process still running.

## What You Need To Do

1. Quit the currently running Avyukta Life/Electron window.
2. Stop the old terminal process with `Ctrl+C`.
3. Run:

```bash
cd /Users/aayushdangal/Desktop/avyukta-website/avyukta-life
npm run dev
```

4. Try `Journal > Create Book` again.
5. Try `Tasks`, `Notes`, `Media`, and `Backups` from the sidebar.

## Calendar, Memory Vault, and Travel Update

Added working local-first Calendar, Memory Vault, and Travel views.

- Calendar now aggregates due tasks, reminders, journal entries, trip starts, and dated memories into a month grid.
- Memory Vault can create memories with category, date, text, favorite state, and emotional tags.
- Travel can create trips, edit trip details, and add day-by-day entries with packing lists.
- All three features use SQLite through Electron IPC and run offline on the Mac.
- Production build passed with `npm run build`.

## Memory Save and Reminder Alarm Fix

- Memory Vault now only clears the form after a confirmed successful SQLite save.
- Memory Vault now shows a success message or the actual save error.
- Reminder scheduler now emits an in-app alarm event in addition to macOS desktop notifications.
- The renderer now plays a short audible alarm and shows an in-app reminder popup when a reminder fires.
- Reminders page now includes Enable Notifications and Test Alarm Now buttons.
- Production build passed with `npm run build`.
