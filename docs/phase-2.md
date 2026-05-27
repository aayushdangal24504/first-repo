# Phase 2 Start: Mood + Reminders

This phase begins turning the app from a static shell into a usable local daily system.

## Mood Tracker

The dashboard mood buttons are now interactive.

When you click a mood:

- The mood is saved locally in SQLite.
- A quote is selected for that mood.
- The quote appears on the dashboard.
- The latest mood reloads when the dashboard loads.

Mood data is stored in `mood_logs`.

## Reminders And Alarms

The Reminders screen is now real.

Supported actions:

- Create a reminder.
- Add notes/body text.
- Pick exact date and time.
- Use quick presets: 5 minutes, 15 minutes, 1 hour.
- Set priority: gentle, normal, important.
- Set repeat: once, daily, weekly, monthly.
- Add a category.
- Mark done.
- Snooze 5 minutes or 15 minutes.
- Delete reminders.
- Test desktop notifications immediately.

Reminders use Electron desktop notifications on macOS and are scheduled locally in the Electron main process.

## Important Notification Note

The app must be running for reminders to fire. In development, that means `npm run dev` must still be running.

If notifications do not appear on macOS:

1. Open System Settings.
2. Go to Notifications.
3. Find Electron or Avyukta Life.
4. Allow notifications and sounds.
5. Return to the app and click `Test Notification Now`.

## Data Tables Added

- `mood_logs`
- New reminder fields: `category`, `priority`, `last_notified_at`

Existing local databases are migrated automatically on startup.

## Next Phase 2 Work

The next natural step is the full task system:

- Create tasks.
- Due dates.
- Priorities.
- Subtasks.
- Kanban statuses.
- Drag-and-drop columns.
- Search/filter/sort.
- Link reminders to tasks.
