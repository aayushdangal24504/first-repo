# Phase 4 Start: Book-Style Journal

The journal feature is now usable as a local book-style writing space.

## What Works Now

- Create multiple journals/books.
- Choose journal type: daily, thoughts, memory, travel, or custom.
- Choose a cover color.
- Open journals from a local shelf.
- Write page titles and long text.
- Autosave page title/text into SQLite.
- Add new pages.
- Slide/flip through pages with Previous and Next controls.
- Add page metadata: date, mood, weather, location.
- Mark pages as favorites.
- Add local pictures to a journal page.
- Pictures are copied into Avyukta Life's local media folder.
- Picture metadata is stored in SQLite.

## How To Use

1. Run the app with `npm run dev`.
2. Click `Journal` in the sidebar.
3. Create a new book from the Journal Shelf.
4. Write in the book page.
5. Click `Add Photos` to attach local pictures.
6. Use `Previous`, `Next`, and `New Page` to move through the book.

## Important Local Storage Note

Images are not uploaded anywhere. When you add a photo, Avyukta copies it into the local app media folder and stores only metadata in SQLite.

## What Is Not Finished Yet

This is the first real journal implementation, not the final dream version yet.

Still upcoming:

- Rich TipTap/Lexical editor formatting.
- Drag-and-drop scrapbook image placement.
- Text wrapping around images.
- Stickers and stamps.
- Custom page templates.
- Multiple fonts per journal.
- Export journal as PDF/ZIP.
- Travel-journal maps and expenses.
- Memory vault timeline.
