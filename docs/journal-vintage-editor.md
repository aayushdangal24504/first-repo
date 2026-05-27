# Vintage Journal Editor

The journal now uses a larger vintage book layout instead of a fixed grid page.

## What Works

- Bigger book page with old coffee-stained paper texture.
- Editable book name after creation.
- Page title editing.
- Movable text boxes.
- Movable photo blocks.
- Add more text boxes with `Text Box`.
- Add local photos with `Add Photos`.
- Photos appear directly on the page and in the side preview panel.
- Hover a block to show drag/delete/size/rotate controls.
- Page layout saves locally in SQLite.
- Photos are copied into the local app media folder.
- The side panel shows the exact media folder path.
- Export asks where to save the file.
- PDF export generates a real PDF.
- DOCX export saves a Word-openable HTML document using the `.docx` extension as a lightweight local export.

## Where Photos Are Saved

Photos are copied into the app's local media path shown in the Journal side panel under `Saved Locally`.

The path comes from Electron's local app data folder, not the cloud.

## How To Use Freeform Layout

1. Open `Journal`.
2. Create or open a book.
3. Click `Add Photos` and choose images.
4. Drag photos around the page.
5. Click `Text Box` to add movable writing blocks.
6. Hover a block to delete, widen, heighten, or rotate it.
7. Click `PDF` or `DOCX` and choose where to save.

## Still To Improve Later

- True native DOCX document structure with embedded images.
- Better corner resize handles.
- Layer controls / bring forward / send backward.
- Stickers, stamps, washi tape, and decorative elements.
- Page templates like travel, memory, gratitude, scrapbook.

## Image Visibility Fix

Journal and media images are now sent to the renderer as embedded `data:` URLs as well as local file paths. This makes photos visible in the app and in PDF export even when Electron blocks or mishandles `file://` image loading.

If photos still do not appear after this update:

1. Quit the running app.
2. Stop the dev server with `Ctrl+C`.
3. Run `npm run dev` again.
4. Open the journal page again.

Existing imported photos should be re-read from local storage automatically after restart.

## Resize And Rotate Controls

Hover a text or photo block to reveal controls:

- `W+` and `W-` change width.
- `H+` and `H-` change height.
- `↺` and `↻` rotate left or right.
- `Delete` removes the block from the page.

## Easier Resize And Rotate Controls

You no longer need to hunt for hover-only controls.

1. Click any text box or photo once.
2. A dark outline appears around the selected block.
3. Use the control bar above the page:
   - `Width +`
   - `Width -`
   - `Height +`
   - `Height -`
   - `Rotate Left`
   - `Rotate Right`
4. You can still drag the selected block around the page.

New text boxes now start smaller by default so they do not cover most of the page.

## Text Selection And Auto Fit

Text blocks now select when you click inside the text area or focus it for typing.

Short text blocks auto-fit closer to the text length while typing. If an old text block is still too large, click inside it and press `Fit Text` in the selected-block toolbar.
