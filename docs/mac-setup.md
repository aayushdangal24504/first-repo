# Mac Setup

Avyukta Life is a local Mac desktop app, but it still needs Node.js during development because it is built with Electron, React, and TypeScript.

## Is It Ready?

Phase 1 is ready as a foundation. It includes the desktop shell, local SQLite schema, app navigation, theme system, command palette shell, and dashboard skeleton.

It is not the complete productivity app yet. The task system, notes, journal, media manager, backups, and polish are planned for later phases.

## One-Time Setup

Install Node.js LTS for macOS.

Recommended beginner path:

1. Go to `https://nodejs.org/`
2. Download the LTS macOS installer
3. Install it
4. Reopen Terminal or VS Code
5. Confirm installation:

```bash
node --version
npm --version
```

Alternative Homebrew path:

```bash
brew install node
```

## Run The App In Development

From Terminal:

```bash
cd /Users/aayushdangal/Desktop/avyukta-website/avyukta-life
npm install
npm run dev
```

That should open the Avyukta Life desktop window.

The `npm run dev` script clears `ELECTRON_RUN_AS_NODE` automatically because that environment variable can make Electron behave like Node instead of opening a desktop window.

## If SQLite Install Fails

`better-sqlite3` is a native dependency. If installation fails, install Apple's command line tools:

```bash
xcode-select --install
```

Then run again:

```bash
npm run rebuild:native
npm run dev
```

## Build A Mac App Later

Once the app is running in development, build a macOS app with:

```bash
npm run dist:mac
```

The packaged app will appear in the `release/` folder.

## Local Data Location

Electron stores app data in macOS application support folders. The app creates local folders for:

- SQLite database
- Media files
- Backups
- Exports
- Temp files

No cloud hosting or paid server is used.

## Reminder Notifications

Reminder notifications are local macOS desktop notifications. The app must be running for alarms to fire.

If reminders do not appear, open macOS System Settings, go to Notifications, and allow notifications for Electron or Avyukta Life. Then use `Test Notification Now` in the Reminders screen.
