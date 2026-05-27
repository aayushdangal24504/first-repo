# Avyukta Life Architecture

## Stack Decision

Avyukta Life uses Electron, React, TypeScript, TailwindCSS, Zustand, Framer Motion, TipTap, and SQLite.

Electron is the recommended first choice for this project because the app is explicitly local-only and needs mature desktop access to SQLite, local filesystem media storage, backups, imports, exports, notifications, and native packaging. Tauri is lighter, but it requires Rust tooling and adds a second language/runtime to the project. Electron keeps Phase 1-7 development fast and consistent in TypeScript while still supporting a premium desktop experience.

## Local-Only Data Model

The renderer never talks directly to SQLite or the filesystem. React calls typed APIs exposed through Electron preload. The main process owns the database, local paths, file movement, backups, imports, and future media optimization.

Data flow:

1. React UI dispatches a typed action or loads a feature snapshot.
2. Preload exposes a narrow `window.avyukta` API.
3. Electron IPC handlers validate and execute work in the main process.
4. SQLite and filesystem changes happen only in the main process.
5. Renderer stores UI state in Zustand and renders feature state.

## Folder Structure

```text
avyukta-life/
  electron/
    database/        SQLite client, schema, migrations later
    ipc/             Typed IPC handlers per domain
    services/        Local path, media, backup, notification services
    main.ts          Desktop app bootstrap
    preload.ts       Safe renderer API bridge
  src/
    app/             React app entry composition
    components/      Reusable UI and layout components
    features/        Feature-specific screens as phases expand
    lib/             Utilities and constants
    store/           Zustand stores
    styles/          Design tokens and global CSS
    types/           Shared TypeScript contracts
  docs/              Architecture, schema, phase plans
```

## UI Direction

The visual system uses warm editorial typography, glass panels, soft gradients, rounded cards, and restrained animation. It should feel closer to a polished personal operating system than a generic admin dashboard.

Principles:

- Minimal, premium, and calm.
- Strong typography hierarchy.
- Sidebar-first desktop navigation.
- Fast keyboard-first interactions with command palette.
- Light and dark themes through CSS variables.
- Accent themes without redesigning components.
- Empty states explain phase ownership honestly.

## Phase Plan

Phase 1: app setup, navigation, database setup, theme system, dashboard skeleton.
Phase 2: tasks, recurring reminders, Kanban, subtasks, filters, notifications.
Phase 3: notes, TipTap editor, folders, markdown, attachments, global search.
Phase 4: journals, travel journals, memories, scrapbook layouts, templates.
Phase 5: media manager, image ingestion, compression, gallery, large-library performance.
Phase 6: backups, JSON export, ZIP export, restore, autosave hardening.
Phase 7: polish, virtualization, query tuning, animation refinement, keyboard shortcuts.
