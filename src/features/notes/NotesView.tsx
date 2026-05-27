import { FormEvent, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { motion } from 'framer-motion';
import { Bold, Brush, Code, Eraser, Grid3X3, Heading2, Highlighter, Italic, List, Paintbrush, Plus, RotateCcw, Save, TableColumnsSplit, TableRowsSplit, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { useNoteStore } from '@/store/note-store';

const DRAWING_PREFIX = '<!-- avyukta-drawing-layer:';
const DRAWING_SUFFIX = ' -->';
const SHEET_PREFIX = '<!-- avyukta-sheet:';
const SHEET_SUFFIX = ' -->';

type BrushType = 'pen' | 'marker' | 'highlighter' | 'eraser';
type SheetData = { cells: string[][]; columnWidths: number[]; rowHeights: number[]; x: number; y: number; width: number; height: number };

const brushColors = ['#1f2937', '#7c2d12', '#b91c1c', '#1d4ed8', '#047857', '#7c3aed', '#f59e0b', '#ffffff'];

const defaultSheet = (): SheetData => ({
  cells: Array.from({ length: 12 }, () => Array.from({ length: 8 }, () => '')),
  columnWidths: Array.from({ length: 8 }, () => 110),
  rowHeights: Array.from({ length: 12 }, () => 34),
  x: 0,
  y: 0,
  width: 920,
  height: 470
});

const extractSheet = (html: string) => {
  const start = html.indexOf(SHEET_PREFIX);
  if (start === -1) return { html, sheet: null as SheetData | null };
  const valueStart = start + SHEET_PREFIX.length;
  const end = html.indexOf(SHEET_SUFFIX, valueStart);
  if (end === -1) return { html, sheet: null as SheetData | null };
  try {
    const encoded = html.slice(valueStart, end);
    const sheet = JSON.parse(decodeURIComponent(encoded)) as SheetData;
    return { html: `${html.slice(0, start)}${html.slice(end + SHEET_SUFFIX.length)}`.trim() || '<p></p>', sheet };
  } catch {
    return { html: `${html.slice(0, start)}${html.slice(end + SHEET_SUFFIX.length)}`.trim() || '<p></p>', sheet: null as SheetData | null };
  }
};

const attachSheet = (html: string, sheet: SheetData | null) => {
  const clean = extractSheet(html).html;
  return sheet ? `${clean}\n${SHEET_PREFIX}${encodeURIComponent(JSON.stringify(sheet))}${SHEET_SUFFIX}` : clean;
};

const extractDrawingLayer = (html: string) => {
  const start = html.indexOf(DRAWING_PREFIX);
  if (start === -1) return { html, drawing: null as string | null };
  const valueStart = start + DRAWING_PREFIX.length;
  const end = html.indexOf(DRAWING_SUFFIX, valueStart);
  if (end === -1) return { html, drawing: null as string | null };
  const drawing = html.slice(valueStart, end);
  return { html: `${html.slice(0, start)}${html.slice(end + DRAWING_SUFFIX.length)}`.trim() || '<p></p>', drawing: drawing || null };
};

const attachDrawingLayer = (html: string, drawing: string | null) => {
  const clean = extractDrawingLayer(html).html;
  return drawing ? `${clean}\n${DRAWING_PREFIX}${drawing}${DRAWING_SUFFIX}` : clean;
};

export const NotesView = () => {
  const { notes, activeNoteId, loading, saving, error, load, create, update, delete: deleteNote, setActiveNoteId } = useNoteStore();
  const [newTitle, setNewTitle] = useState('Untitled Note');
  const activeNote = useMemo(() => notes.find((note) => note.id === activeNoteId) ?? null, [notes, activeNoteId]);
  const activeNoteContent = useMemo(() => extractSheet(extractDrawingLayer(activeNote?.html ?? '<p></p>').html), [activeNote?.html]);
  const activeDrawingContent = useMemo(() => extractDrawingLayer(activeNote?.html ?? '<p></p>'), [activeNote?.html]);
  const [title, setTitle] = useState(activeNote?.title ?? '');
  const [drawingOpen, setDrawingOpen] = useState(false);
  const [drawingLayer, setDrawingLayer] = useState<string | null>(activeDrawingContent.drawing);
  const [sheet, setSheet] = useState<SheetData | null>(activeNoteContent.sheet);
  const autosaveTimerRef = useRef<number | null>(null);
  const textAutosaveTimerRef = useRef<number | null>(null);
  const activeNoteIdRef = useRef<string | null>(activeNoteId);
  const titleRef = useRef(title);
  const drawingLayerRef = useRef<string | null>(drawingLayer);
  const sheetRef = useRef<SheetData | null>(sheet);
  const editorShellRef = useRef<HTMLDivElement | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight,
      Table.configure({ resizable: true, HTMLAttributes: { class: 'avyukta-table' } }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: 'Write, draw, plan, paste code, make lists...' })
    ],
    content: activeNoteContent.html,
    onUpdate: ({ editor: currentEditor }) => {
      const noteId = activeNoteIdRef.current;
      if (!noteId) return;
      if (textAutosaveTimerRef.current) window.clearTimeout(textAutosaveTimerRef.current);
      textAutosaveTimerRef.current = window.setTimeout(() => {
        void update({ id: noteId, title: titleRef.current, html: attachDrawingLayer(attachSheet(currentEditor.getHTML(), sheetRef.current), drawingLayerRef.current) });
      }, 700);
    },
    editorProps: {
      attributes: {
        class: 'min-h-[520px] rounded-[1.5rem] bg-surface/45 p-5 text-base leading-8 outline-none'
      }
    }
  });

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    setTitle(activeNote?.title ?? '');
    setDrawingLayer(activeDrawingContent.drawing);
    setSheet(activeNoteContent.sheet);
    activeNoteIdRef.current = activeNote?.id ?? null;
    titleRef.current = activeNote?.title ?? '';
    drawingLayerRef.current = activeDrawingContent.drawing;
    sheetRef.current = activeNoteContent.sheet;
    if (editor && activeNote && editor.getHTML() !== activeNoteContent.html) editor.commands.setContent(activeNoteContent.html || '<p></p>', false);
  }, [activeNote, activeDrawingContent.drawing, activeNoteContent.html, editor]);

  useEffect(() => { activeNoteIdRef.current = activeNoteId; }, [activeNoteId]);
  useEffect(() => { titleRef.current = title; }, [title]);
  useEffect(() => { drawingLayerRef.current = drawingLayer; }, [drawingLayer]);
  useEffect(() => { sheetRef.current = sheet; }, [sheet]);

  const persist = async (nextDrawing = drawingLayer, nextSheet = sheet) => {
    if (!activeNote || !editor) return;
    await update({ id: activeNote.id, title, html: attachDrawingLayer(attachSheet(editor.getHTML(), nextSheet), nextDrawing) });
  };

  const queueAutosave = (nextDrawing: string | null) => {
    setDrawingLayer(nextDrawing);
    drawingLayerRef.current = nextDrawing;
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = window.setTimeout(() => void persist(nextDrawing), 550);
  };

  useEffect(() => () => {
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
    if (textAutosaveTimerRef.current) window.clearTimeout(textAutosaveTimerRef.current);
  }, []);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    await create({ title: newTitle });
    setNewTitle('Untitled Note');
  };

  const save = async () => {
    await persist();
  };

  useEffect(() => {
    const shell = editorShellRef.current;
    if (!shell || !editor) return;

    type TableAction =
      | { type: 'move'; table: HTMLTableElement; startX: number; startY: number; startLeft: number; startTop: number }
      | { type: 'resize-table'; table: HTMLTableElement; startX: number; startY: number; startWidth: number; startHeight: number; fromLeft: boolean; fromTop: boolean; startLeft: number; startTop: number }
      | { type: 'resize-row'; row: HTMLTableRowElement; startY: number; startHeight: number }
      | { type: 'resize-column'; table: HTMLTableElement; columnIndex: number; startX: number; startWidth: number };

    let action: TableAction | null = null;
    const persistTableDom = () => {
      window.setTimeout(() => {
        if (!editor.view.dom) return;
        editor.commands.setContent(editor.view.dom.innerHTML, false);
        void persist();
      }, 0);
    };

    const pointerZone = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const cell = target?.closest('td,th') as HTMLTableCellElement | null;
      const table = target?.closest('table') as HTMLTableElement | null;
      if (!table) return null;
      const tableRect = table.getBoundingClientRect();
      const cellRect = cell?.getBoundingClientRect();
      const nearLeft = event.clientX < tableRect.left + 34;
      const nearRight = event.clientX > tableRect.right - 34;
      const nearTop = event.clientY < tableRect.top + 34;
      const nearBottom = event.clientY > tableRect.bottom - 34;
      const inCorner = (nearLeft || nearRight) && (nearTop || nearBottom);
      const inTopBand = event.clientY < tableRect.top + 28;
      const inRowBottom = Boolean(cell && cellRect && event.clientY > cellRect.bottom - 10);
      const columnEdge = cell
        ? Array.from(cell.parentElement?.children ?? []).findIndex((candidate) => {
            const rect = candidate.getBoundingClientRect();
            return Math.abs(event.clientX - rect.right) < 10;
          })
        : -1;
      const rowEdge = Array.from(table.rows).find((row) => {
        const rowRect = row.getBoundingClientRect();
        return Math.abs(event.clientY - rowRect.bottom) < 10 && event.clientX > tableRect.left + 8 && event.clientX < tableRect.right - 8;
      });
      const rowAtRightEdge = Array.from(table.rows).find((row) => {
        const rowRect = row.getBoundingClientRect();
        const nearRightEdge = event.clientX > tableRect.right - 30 && event.clientX < tableRect.right + 14;
        const insideRow = event.clientY > rowRect.top + 8 && event.clientY < rowRect.bottom - 8;
        return nearRightEdge && insideRow;
      });
      if (inCorner) return { kind: 'resize-table' as const, table, fromLeft: nearLeft, fromTop: nearTop };
      if (inTopBand) return { kind: 'move' as const, table };
      if (rowEdge) return { kind: 'resize-row' as const, row: rowEdge };
      if (columnEdge > -1) return { kind: 'resize-column' as const, table, columnIndex: columnEdge };
      if (rowAtRightEdge) return { kind: 'resize-row' as const, row: rowAtRightEdge };
      if (inRowBottom && cell?.parentElement) return { kind: 'resize-row' as const, row: cell.parentElement as HTMLTableRowElement };
      return null;
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!action) {
        const zone = pointerZone(event);
        shell.classList.toggle('grid-can-move', zone?.kind === 'move');
        shell.classList.toggle('grid-can-resize', zone?.kind === 'resize-table');
        shell.classList.toggle('grid-can-resize-row', zone?.kind === 'resize-row');
        shell.classList.toggle('grid-can-resize-column', zone?.kind === 'resize-column');
        return;
      }

      event.preventDefault();
      if (action.type === 'move') {
        const nextLeft = Math.max(0, action.startLeft + event.clientX - action.startX);
        const nextTop = Math.max(0, action.startTop + event.clientY - action.startY);
        action.table.style.marginLeft = `${nextLeft}px`;
        action.table.style.marginTop = `${nextTop}px`;
      }
      if (action.type === 'resize-table') {
        const deltaX = event.clientX - action.startX;
        const deltaY = event.clientY - action.startY;
        const nextWidth = Math.max(180, action.startWidth + (action.fromLeft ? -deltaX : deltaX));
        const nextHeight = Math.max(120, action.startHeight + (action.fromTop ? -deltaY : deltaY));
        action.table.style.width = `${nextWidth}px`;
        action.table.style.height = `${nextHeight}px`;
        if (action.fromLeft) action.table.style.marginLeft = `${Math.max(0, action.startLeft + deltaX)}px`;
        if (action.fromTop) action.table.style.marginTop = `${Math.max(0, action.startTop + deltaY)}px`;
      }
      if (action.type === 'resize-row') {
        const nextHeight = `${Math.max(36, action.startHeight + event.clientY - action.startY)}px`;
        Array.from(action.row.cells).forEach((cell) => {
          cell.style.height = nextHeight;
          cell.style.minHeight = nextHeight;
        });
      }
      if (action.type === 'resize-column') {
        const columnAction = action;
        const nextWidth = `${Math.max(52, action.startWidth + event.clientX - action.startX)}px`;
        Array.from(columnAction.table.rows).forEach((row) => {
          const cell = row.cells[columnAction.columnIndex];
          if (!cell) return;
          cell.style.width = nextWidth;
          cell.style.minWidth = nextWidth;
        });
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      const zone = pointerZone(event);
      if (!zone) return;
      event.preventDefault();

      if (zone.kind === 'move') {
        const style = window.getComputedStyle(zone.table);
        action = {
          type: 'move',
          table: zone.table,
          startX: event.clientX,
          startY: event.clientY,
          startLeft: Number.parseFloat(style.marginLeft) || 0,
          startTop: Number.parseFloat(style.marginTop) || 0
        };
      }
      if (zone.kind === 'resize-table') {
        const rect = zone.table.getBoundingClientRect();
        const style = window.getComputedStyle(zone.table);
        zone.table.style.display = 'table';
        action = {
          type: 'resize-table',
          table: zone.table,
          startX: event.clientX,
          startY: event.clientY,
          startWidth: rect.width,
          startHeight: rect.height,
          fromLeft: zone.fromLeft,
          fromTop: zone.fromTop,
          startLeft: Number.parseFloat(style.marginLeft) || 0,
          startTop: Number.parseFloat(style.marginTop) || 0
        };
      }
      if (zone.kind === 'resize-row') {
        action = { type: 'resize-row', row: zone.row, startY: event.clientY, startHeight: zone.row.getBoundingClientRect().height };
      }
      if (zone.kind === 'resize-column') {
        const firstRowCell = zone.table.rows[0]?.cells[zone.columnIndex];
        action = { type: 'resize-column', table: zone.table, columnIndex: zone.columnIndex, startX: event.clientX, startWidth: firstRowCell?.getBoundingClientRect().width ?? 80 };
      }
    };

    const handleMouseUp = () => {
      if (!action) return;
      action = null;
      persistTableDom();
    };

    shell.addEventListener('mousemove', handleMouseMove);
    shell.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      shell.removeEventListener('mousemove', handleMouseMove);
      shell.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [editor, activeNote?.id, title, drawingLayer]);

  const updateSheet = (nextSheet: SheetData | null) => {
    setSheet(nextSheet);
    sheetRef.current = nextSheet;
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = window.setTimeout(() => void persist(drawingLayerRef.current, nextSheet), 450);
  };

  const addGrid = () => updateSheet(sheet ?? defaultSheet());

  return (
    <motion.div className="grid grid-cols-[320px_1fr] gap-6" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <aside className="space-y-5">
        <Card className="p-5">
          <h2 className="font-display text-3xl font-bold">Notes</h2>
          <form className="mt-4 flex gap-2" onSubmit={(event) => void handleCreate(event)}>
            <input className="min-w-0 flex-1 rounded-2xl border border-line/70 bg-surface/60 px-4 py-3 text-sm outline-none focus:border-accent" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} />
            <Button type="submit" variant="primary" className="px-3"><Plus className="h-4 w-4" /></Button>
          </form>
          {error && <p className="mt-3 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-500">{error}</p>}
        </Card>
        <div className="space-y-3">
          {loading && <Card className="p-4 text-sm text-muted">Loading notes...</Card>}
          {notes.map((note) => (
            <button key={note.id} type="button" onClick={() => setActiveNoteId(note.id)} className={cn('w-full rounded-[1.5rem] border p-4 text-left transition hover:border-accent/50', activeNoteId === note.id ? 'border-accent bg-accent text-white shadow-soft' : 'border-line/70 bg-elevated/50')}>
              <p className="truncate font-semibold">{note.title}</p>
              <p className={cn('mt-2 line-clamp-2 text-xs leading-5', activeNoteId === note.id ? 'text-white/70' : 'text-muted')}>{note.summary || 'No text yet'}</p>
            </button>
          ))}
        </div>
      </aside>

      <section>
        {!activeNote ? (
          <Card className="grid min-h-[640px] place-items-center p-8 text-center text-muted">Create a note to start writing.</Card>
        ) : (
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-3">
              <input className="min-w-0 flex-1 bg-transparent font-display text-4xl font-bold outline-none" value={title} onChange={(event) => setTitle(event.target.value)} onBlur={() => void save()} />
              <span className="rounded-full bg-accent/10 px-3 py-2 text-xs font-bold text-accent">{saving ? 'Autosaving...' : 'Autosaves'}</span>
              <Button variant="ghost" className="gap-2" onClick={() => void deleteNote(activeNote.id)}><Trash2 className="h-4 w-4" />Archive</Button>
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              <ToolbarButton active={editor?.isActive('bold')} onClick={() => editor?.chain().focus().toggleBold().run()} icon={Bold} label="Bold" />
              <ToolbarButton active={editor?.isActive('italic')} onClick={() => editor?.chain().focus().toggleItalic().run()} icon={Italic} label="Italic" />
              <ToolbarButton active={editor?.isActive('heading', { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} icon={Heading2} label="Heading" />
              <ToolbarButton active={editor?.isActive('bulletList')} onClick={() => editor?.chain().focus().toggleBulletList().run()} icon={List} label="List" />
              <ToolbarButton active={editor?.isActive('codeBlock')} onClick={() => editor?.chain().focus().toggleCodeBlock().run()} icon={Code} label="Code" />
              <ToolbarButton active={editor?.isActive('highlight')} onClick={() => editor?.chain().focus().toggleHighlight().run()} icon={Highlighter} label="Highlight" />
              <ToolbarButton active={drawingOpen} onClick={() => setDrawingOpen((open) => !open)} icon={Paintbrush} label={drawingOpen ? 'Exit Pen' : 'Pen'} />
              <ToolbarButton onClick={addGrid} icon={Grid3X3} label="Add Grid" />
              {sheet && (
                <>
                  <ToolbarButton onClick={() => updateSheet(addSheetColumn(sheet))} icon={TableColumnsSplit} label="Add Column" />
                  <ToolbarButton onClick={() => updateSheet(addSheetRow(sheet))} icon={TableRowsSplit} label="Add Row" />
                  <Button className="h-10 text-red-500" onClick={() => updateSheet(null)}>Delete Grid</Button>
                </>
              )}
            </div>
            {sheet && <SpreadsheetGrid sheet={sheet} onChange={updateSheet} />}
            <DrawingSurface active={drawingOpen} drawingLayer={drawingLayer} onDrawingChange={queueAutosave}>
              <div ref={editorShellRef} className="prose prose-neutral max-w-none dark:prose-invert"><EditorContent editor={editor} /></div>
            </DrawingSurface>
          </Card>
        )}
      </section>
    </motion.div>
  );
};

const addSheetRow = (sheet: SheetData): SheetData => ({
  ...sheet,
  cells: [...sheet.cells, Array.from({ length: sheet.columnWidths.length }, () => '')],
  rowHeights: [...sheet.rowHeights, 34],
  height: sheet.height + 34
});

const addSheetColumn = (sheet: SheetData): SheetData => ({
  ...sheet,
  cells: sheet.cells.map((row) => [...row, '']),
  columnWidths: [...sheet.columnWidths, 110],
  width: sheet.width + 110
});

const columnName = (index: number) => {
  let name = '';
  let value = index + 1;
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
};

const SpreadsheetGrid = ({ sheet, onChange }: { sheet: SheetData; onChange: (sheet: SheetData) => void }) => {
  const [selected, setSelected] = useState({ row: 0, col: 0 });
  const dragRef = useRef<null | {
    type: 'move' | 'resize-sheet' | 'resize-col' | 'resize-row';
    startX: number;
    startY: number;
    startSheet: SheetData;
    row?: number;
    col?: number;
  }>(null);

  const updateCell = (rowIndex: number, columnIndex: number, value: string) => {
    const cells = sheet.cells.map((row) => [...row]);
    cells[rowIndex][columnIndex] = value;
    onChange({ ...sheet, cells });
  };

  const startDrag = (event: ReactPointerEvent, type: NonNullable<typeof dragRef.current>['type'], row?: number, col?: number) => {
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = { type, row, col, startX: event.clientX, startY: event.clientY, startSheet: structuredClone(sheet) };
    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', stopDrag, { once: true });
  };

  const handleWindowPointerMove = (event: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (drag.type === 'move') {
      onChange({ ...drag.startSheet, x: Math.max(0, drag.startSheet.x + deltaX), y: Math.max(0, drag.startSheet.y + deltaY) });
    }
    if (drag.type === 'resize-sheet') {
      onChange({ ...drag.startSheet, width: Math.max(360, drag.startSheet.width + deltaX), height: Math.max(220, drag.startSheet.height + deltaY) });
    }
    if (drag.type === 'resize-col' && drag.col !== undefined) {
      const columnWidths = [...drag.startSheet.columnWidths];
      columnWidths[drag.col] = Math.max(56, columnWidths[drag.col] + deltaX);
      onChange({ ...drag.startSheet, columnWidths });
    }
    if (drag.type === 'resize-row' && drag.row !== undefined) {
      const rowHeights = [...drag.startSheet.rowHeights];
      rowHeights[drag.row] = Math.max(26, rowHeights[drag.row] + deltaY);
      onChange({ ...drag.startSheet, rowHeights });
    }
  };

  const stopDrag = () => {
    dragRef.current = null;
    window.removeEventListener('pointermove', handleWindowPointerMove);
  };

  return (
    <div className="mb-4 overflow-auto rounded-[1.5rem] border border-line/70 bg-surface/40 p-4">
      <div
        className="avyukta-sheet relative rounded-xl border border-[#b7c2d0] bg-white text-slate-900 shadow-soft"
        style={{ width: sheet.width, height: sheet.height, marginLeft: sheet.x, marginTop: sheet.y }}
      >
        <div className="flex h-9 items-center justify-between border-b border-[#b7c2d0] bg-[#eef3f8] px-3 text-xs font-bold text-slate-600" onPointerDown={(event) => startDrag(event, 'move')}>
          <span>Spreadsheet grid</span>
          <span className="rounded bg-white px-2 py-1 text-[10px] uppercase tracking-[0.16em]">drag bar</span>
        </div>
        <div className="overflow-auto" style={{ width: '100%', height: sheet.height - 36 }}>
          <div className="grid" style={{ gridTemplateColumns: `46px ${sheet.columnWidths.map((width) => `${width}px`).join(' ')}` }}>
            <div className="sticky left-0 top-0 z-20 border-b border-r border-[#b7c2d0] bg-[#e3eaf2]" />
            {sheet.columnWidths.map((width, columnIndex) => (
              <div key={columnIndex} className="relative border-b border-r border-[#b7c2d0] bg-[#e3eaf2] py-1 text-center text-xs font-bold text-slate-600" style={{ width }}>
                {columnName(columnIndex)}
                <button type="button" aria-label="Resize column" className="absolute right-[-4px] top-0 z-30 h-full w-2 cursor-col-resize" onPointerDown={(event) => startDrag(event, 'resize-col', undefined, columnIndex)} />
              </div>
            ))}
            {sheet.cells.map((row, rowIndex) => (
              <div key={rowIndex} className="contents">
                <div className="relative border-b border-r border-[#b7c2d0] bg-[#e3eaf2] text-center text-xs font-bold text-slate-600" style={{ height: sheet.rowHeights[rowIndex] }}>
                  <span className="leading-8">{rowIndex + 1}</span>
                  <button type="button" aria-label="Resize row" className="absolute bottom-[-4px] left-0 z-30 h-2 w-full cursor-row-resize" onPointerDown={(event) => startDrag(event, 'resize-row', rowIndex)} />
                </div>
                {row.map((value, columnIndex) => (
                  <input
                    key={`${rowIndex}-${columnIndex}`}
                    className={cn('border-b border-r border-[#d4dbe5] bg-white px-2 text-sm outline-none focus:bg-[#fffbe8]', selected.row === rowIndex && selected.col === columnIndex && 'ring-2 ring-[#2f73d9] ring-inset')}
                    style={{ width: sheet.columnWidths[columnIndex], height: sheet.rowHeights[rowIndex] }}
                    value={value}
                    onFocus={() => setSelected({ row: rowIndex, col: columnIndex })}
                    onChange={(event) => updateCell(rowIndex, columnIndex, event.target.value)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <button type="button" aria-label="Resize spreadsheet" className="absolute bottom-0 right-0 h-6 w-6 cursor-nwse-resize rounded-tl-lg bg-[#2f73d9]" onPointerDown={(event) => startDrag(event, 'resize-sheet')} />
      </div>
    </div>
  );
};

const DrawingSurface = ({ active, drawingLayer, onDrawingChange, children }: { active: boolean; drawingLayer: string | null; onDrawingChange: (dataUrl: string | null) => void; children: React.ReactNode }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const pointsRef = useRef<Array<{ x: number; y: number }>>([]);
  const holdTimerRef = useRef<number | null>(null);
  const snapshotRef = useRef<ImageData | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const shapeLockedRef = useRef(false);
  const [color, setColor] = useState('#1f2937');
  const [brushType, setBrushType] = useState<BrushType>('pen');
  const [size, setSize] = useState(6);
  const [hasInk, setHasInk] = useState(Boolean(drawingLayer));

  const canvasDataUrl = () => canvasRef.current?.toDataURL('image/png') ?? null;

  const resizeCanvas = (restore = true) => {
    const canvas = canvasRef.current;
    const surface = surfaceRef.current;
    if (!canvas || !surface) return;
    const rect = surface.getBoundingClientRect();
    const existing = restore ? canvas.toDataURL('image/png') : null;
    canvas.width = Math.max(1, Math.floor(rect.width * window.devicePixelRatio));
    canvas.height = Math.max(1, Math.floor(rect.height * window.devicePixelRatio));
    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    if (existing) {
      const image = new window.Image();
      image.onload = () => context.drawImage(image, 0, 0, rect.width, rect.height);
      image.src = existing;
    }
  };

  const loadLayer = (source: string | null) => {
    resizeCanvas(false);
    const canvas = canvasRef.current;
    const surface = surfaceRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !surface || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    historyRef.current = [];
    setHasInk(Boolean(source));
    if (!source) return;
    const rect = surface.getBoundingClientRect();
    const image = new window.Image();
    image.onload = () => context.drawImage(image, 0, 0, rect.width, rect.height);
    image.src = source;
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => loadLayer(drawingLayer), 60);
    return () => window.clearTimeout(timeout);
  }, [drawingLayer]);

  useEffect(() => {
    resizeCanvas();
    const handleResize = () => resizeCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getPoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const persistCanvas = () => onDrawingChange(canvasDataUrl());

  const drawTo = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const point = getPoint(event);
    const last = lastPointRef.current ?? point;
    pointsRef.current = [...pointsRef.current, point];
    if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = window.setTimeout(() => perfectShape(), 650);

    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.globalCompositeOperation = brushType === 'eraser' ? 'destination-out' : 'source-over';
    context.globalAlpha = brushType === 'highlighter' ? 0.28 : brushType === 'marker' ? 0.72 : 1;
    context.strokeStyle = color;
    context.lineWidth = brushType === 'marker' ? size * 1.7 : brushType === 'highlighter' ? size * 2.5 : size;
    context.beginPath();
    context.moveTo(last.x, last.y);
    context.lineTo(point.x, point.y);
    context.stroke();
    setHasInk(true);
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';
    lastPointRef.current = point;
  };

  const startDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    snapshotRef.current = context.getImageData(0, 0, canvas.width, canvas.height);
    historyRef.current = [...historyRef.current.slice(-24), snapshotRef.current];
    const point = getPoint(event);
    pointsRef.current = [point];
    shapeLockedRef.current = false;
    drawingRef.current = true;
    lastPointRef.current = point;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const stopDrawing = () => {
    if (drawingRef.current) persistCanvas();
    drawingRef.current = false;
    lastPointRef.current = null;
    if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
    snapshotRef.current = null;
    pointsRef.current = [];
    shapeLockedRef.current = false;
  };

  const applyStrokeStyle = (context: CanvasRenderingContext2D) => {
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = brushType === 'highlighter' ? 0.28 : brushType === 'marker' ? 0.72 : 1;
    context.strokeStyle = color;
    context.lineWidth = brushType === 'marker' ? size * 1.7 : brushType === 'highlighter' ? size * 2.5 : size;
  };

  const perfectShape = () => {
    if (shapeLockedRef.current || brushType === 'eraser' || pointsRef.current.length < 6) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    const snapshot = snapshotRef.current;
    if (!canvas || !context || !snapshot) return;

    const points = pointsRef.current;
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const width = maxX - minX;
    const height = maxY - minY;
    if (width < 18 && height < 18) return;

    const first = points[0];
    const last = points[points.length - 1];
    const closedDistance = Math.hypot(last.x - first.x, last.y - first.y);
    const pathLength = points.slice(1).reduce((total, point, index) => total + Math.hypot(point.x - points[index].x, point.y - points[index].y), 0);
    const directDistance = Math.hypot(last.x - first.x, last.y - first.y);
    const isLine = pathLength > 0 && directDistance / pathLength > 0.82;
    const isClosed = pathLength > 0 && closedDistance < pathLength * 0.14;

    context.putImageData(snapshot, 0, 0);
    applyStrokeStyle(context);
    context.beginPath();
    if (isLine) {
      context.moveTo(first.x, first.y);
      context.lineTo(last.x, last.y);
    } else if (isClosed) {
      context.ellipse(minX + width / 2, minY + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
    } else {
      context.rect(minX, minY, width, height);
    }
    context.stroke();
    context.globalAlpha = 1;
    shapeLockedRef.current = true;
    setHasInk(true);
    persistCanvas();
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    historyRef.current = [];
    onDrawingChange(null);
  };

  const undo = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    const previous = historyRef.current.pop();
    if (!canvas || !context || !previous) return;
    context.putImageData(previous, 0, 0);
    setHasInk(true);
    persistCanvas();
  };

  return (
    <div className="rounded-[1.5rem]">
      {active && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-[1.25rem] border border-line/70 bg-elevated/70 p-3">
          <div className="flex gap-2">{brushColors.map((swatch) => <button key={swatch} type="button" aria-label={swatch} className={cn('h-7 w-7 rounded-full border-2 border-line shadow-soft', color === swatch && 'ring-2 ring-accent ring-offset-2 ring-offset-surface')} style={{ background: swatch }} onClick={() => setColor(swatch)} />)}</div>
          <input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-8 w-11 rounded-xl border border-line bg-surface" />
          <select className="rounded-2xl border border-line/70 bg-surface/60 px-3 py-2 text-sm" value={brushType} onChange={(event) => setBrushType(event.target.value as BrushType)}>
            <option value="pen">Pen</option>
            <option value="marker">Marker</option>
            <option value="highlighter">Highlighter</option>
            <option value="eraser">Eraser</option>
          </select>
          <label className="flex items-center gap-2 text-sm font-semibold text-muted">Size <input type="range" min={2} max={36} value={size} onChange={(event) => setSize(Number(event.target.value))} /></label>
          <span className="rounded-full bg-surface/60 px-3 py-1 text-xs font-bold text-muted">{size}px</span>
          <Button className="gap-2" onClick={undo}><RotateCcw className="h-4 w-4" />Undo</Button>
          <Button className="gap-2" onClick={clear}><Eraser className="h-4 w-4" />Clear</Button>
          <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent">Autosaving drawing</span>
          <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent">Hold to snap shape</span>
        </div>
      )}
      <div ref={surfaceRef} className="relative rounded-[1.5rem]">
        {children}
        <canvas
          ref={canvasRef}
          className={cn('absolute inset-0 z-20 h-full w-full touch-none rounded-[1.5rem]', active ? 'cursor-crosshair' : hasInk ? 'pointer-events-none' : 'pointer-events-none opacity-0')}
          onPointerDown={startDrawing}
          onPointerMove={drawTo}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          onPointerLeave={stopDrawing}
        />
      </div>
    </div>
  );
};

const ToolbarButton = ({ active, onClick, icon: Icon, label }: { active?: boolean; onClick: () => void; icon: typeof Bold; label: string }) => (
  <button type="button" className={cn('inline-flex items-center gap-2 rounded-2xl border border-line/70 px-3 py-2 text-sm font-semibold text-muted transition hover:text-ink', active && 'border-accent bg-accent text-white')} onClick={onClick}>
    <Icon className="h-4 w-4" />{label}
  </button>
);
