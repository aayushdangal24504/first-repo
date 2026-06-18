import { FormEvent, PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useEditor, EditorContent } from '@tiptap/react';

import StarterKit from '@tiptap/starter-kit';

import Placeholder from '@tiptap/extension-placeholder';

import Highlight from '@tiptap/extension-highlight';

import Table from '@tiptap/extension-table';

import TableRow from '@tiptap/extension-table-row';

import TableCell from '@tiptap/extension-table-cell';

import TableHeader from '@tiptap/extension-table-header';

import { motion, AnimatePresence } from 'framer-motion';

import { Bold, Brush, Code, Crop, Eraser, Grid3X3, Heading2, Highlighter, ImagePlus, Italic, List, Maximize2, Minimize2, Move, Paintbrush, Plus, RotateCcw, Save, TableColumnsSplit, TableRowsSplit, Trash2, Type, X, ZoomIn, ZoomOut } from 'lucide-react';

import { Button } from '@/components/ui/Button';

import { Card } from '@/components/ui/Card';

import { cn } from '@/lib/cn';

import { useNoteStore } from '@/store/note-store';

import type { JournalPageBlock } from '@/types/ipc';


const DRAWING_PREFIX = '<!-- avyukta-drawing-layer:';

const DRAWING_SUFFIX = ' -->';

const SHEETS_PREFIX = '<!-- avyukta-sheets:';

const SHEETS_SUFFIX = ' -->';

const NOTE_BLOCKS_PREFIX = '<!-- avyukta-note-blocks:';

const NOTE_BLOCKS_SUFFIX = ' -->';


type BrushType = 'pen' | 'marker' | 'highlighter' | 'eraser';

type SheetData = { cells: string[][]; columnWidths: number[]; rowHeights: number[]; x: number; y: number; width: number; height: number };

type CropData = { top: number; right: number; bottom: number; left: number };


const brushColors = ['#1f2937', '#7c2d12', '#b91c1c', '#1d4ed8', '#047857', '#7c3aed', '#f59e0b', '#ffffff'];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const getTextFit = (text = '') => {

  const lines = text.split('\n');

  const longestLine = Math.max(10, ...lines.map((line) => line.trim().length));

  return { width: clamp(longestLine * 10 + 58, 160, 420), height: clamp(lines.length * 32 + 78, 92, 320) };

};

/** Minimum canvas height — content can grow infinitely beyond this */
const MIN_CANVAS_HEIGHT = 800;
/** Extra padding added below the lowest element so users always have room */
const CANVAS_BOTTOM_PAD = 300;
/** When dragging within this many px of the visible bottom, auto‑scroll */
const AUTO_EXPAND_ZONE = 80;


const defaultSheet = (): SheetData => ({

  cells: Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => '')),

  columnWidths: Array.from({ length: 5 }, () => 110),

  rowHeights: Array.from({ length: 5 }, () => 34),

  x: 0,

  y: 0,

  width: 596,

  height: 206

});


const extractSheets = (html: string) => {

  const start = html.indexOf(SHEETS_PREFIX);

  if (start === -1) return { html, sheets: [] as SheetData[] };

  const valueStart = start + SHEETS_PREFIX.length;

  const end = html.indexOf(SHEETS_SUFFIX, valueStart);

  if (end === -1) return { html, sheets: [] as SheetData[] };

  try {

    const encoded = html.slice(valueStart, end);

    const sheets = JSON.parse(decodeURIComponent(encoded)) as SheetData[];

    return { html: `${html.slice(0, start)}${html.slice(end + SHEETS_SUFFIX.length)}`.trim() || '<p></p>', sheets };

  } catch {

    return { html: `${html.slice(0, start)}${html.slice(end + SHEETS_SUFFIX.length)}`.trim() || '<p></p>', sheets: [] as SheetData[] };

  }

};


const attachSheets = (html: string, sheets: SheetData[]) => {

  const start = html.indexOf(SHEETS_PREFIX);

  const clean = start === -1 ? html : `${html.slice(0, start)}${html.slice(html.indexOf(SHEETS_SUFFIX, start) + SHEETS_SUFFIX.length)}`.trim() || '<p></p>';

  return sheets.length > 0 ? `${clean}\n${SHEETS_PREFIX}${encodeURIComponent(JSON.stringify(sheets))}${SHEETS_SUFFIX}` : clean;

};


const extractNoteBlocks = (html: string) => {

  const start = html.indexOf(NOTE_BLOCKS_PREFIX);

  if (start === -1) return { html, blocks: [] as JournalPageBlock[] };

  const valueStart = start + NOTE_BLOCKS_PREFIX.length;

  const end = html.indexOf(NOTE_BLOCKS_SUFFIX, valueStart);

  if (end === -1) return { html, blocks: [] as JournalPageBlock[] };

  try {

    const blocks = JSON.parse(decodeURIComponent(html.slice(valueStart, end))) as JournalPageBlock[];

    return { html: `${html.slice(0, start)}${html.slice(end + NOTE_BLOCKS_SUFFIX.length)}`.trim() || '<p></p>', blocks };

  } catch {

    return { html: `${html.slice(0, start)}${html.slice(end + NOTE_BLOCKS_SUFFIX.length)}`.trim() || '<p></p>', blocks: [] as JournalPageBlock[] };

  }

};


const attachNoteBlocks = (html: string, blocks: JournalPageBlock[]) => {

  const clean = extractNoteBlocks(html).html;

  return blocks.length > 0 ? `${clean}\n${NOTE_BLOCKS_PREFIX}${encodeURIComponent(JSON.stringify(blocks))}${NOTE_BLOCKS_SUFFIX}` : clean;

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


/* ─────────────────────── Image Preview / Lightbox ─────────────────────── */

const ImagePreviewModal = ({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    setZoom((z) => clamp(z + (e.deltaY > 0 ? -0.15 : 0.15), 0.25, 8));
  }, []);

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsPanning(true);
    panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    setPan({
      x: panStartRef.current.panX + e.clientX - panStartRef.current.x,
      y: panStartRef.current.panY + e.clientY - panStartRef.current.y,
    });
  };

  const handlePointerUp = () => setIsPanning(false);

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

        {/* Controls */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <span className="rounded-full bg-black/60 px-3 py-1.5 text-xs font-bold text-white/80">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom((z) => clamp(z + 0.25, 0.25, 8))} className="grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80 transition"><ZoomIn className="h-4 w-4" /></button>
          <button type="button" onClick={() => setZoom((z) => clamp(z - 0.25, 0.25, 8))} className="grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80 transition"><ZoomOut className="h-4 w-4" /></button>
          <button type="button" onClick={resetView} className="grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80 transition"><Maximize2 className="h-4 w-4" /></button>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80 transition"><X className="h-4 w-4" /></button>
        </div>

        {/* Image */}
        <div
          className="relative z-[1] flex items-center justify-center"
          style={{ width: '90vw', height: '90vh', cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <img
            src={src}
            alt={alt}
            draggable={false}
            className="max-h-full max-w-full select-none"
            style={{
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              transformOrigin: 'center center',
              transition: isPanning ? 'none' : 'transform 0.15s ease-out',
              objectFit: 'contain',
            }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};


/* ─────────────────────── Main NotesView ─────────────────────── */

export const NotesView = () => {

  const { notes, activeNoteId, loading, saving, error, load, create, update, delete: deleteNote, setActiveNoteId } = useNoteStore();

  const [newTitle, setNewTitle] = useState('Untitled Note');

  const activeNote = useMemo(() => notes.find((note) => note.id === activeNoteId) ?? null, [notes, activeNoteId]);

  const activeNoteBlocksContent = useMemo(() => extractNoteBlocks(activeNote?.html ?? '<p></p>'), [activeNote?.html]);

  const activeNoteSheetsContent = useMemo(() => extractSheets(extractDrawingLayer(activeNoteBlocksContent.html).html), [activeNoteBlocksContent.html]);

  const activeDrawingContent = useMemo(() => extractDrawingLayer(activeNote?.html ?? '<p></p>'), [activeNote?.html]);

  const [title, setTitle] = useState(activeNote?.title ?? '');

  const [drawingOpen, setDrawingOpen] = useState(false);

  const [drawingLayer, setDrawingLayer] = useState<string | null>(activeDrawingContent.drawing);

  const [sheets, setSheets] = useState<SheetData[]>(activeNoteSheetsContent.sheets);

  const [blocks, setBlocks] = useState<JournalPageBlock[]>(activeNoteBlocksContent.blocks);

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const [selectedSheetIndex, setSelectedSheetIndex] = useState<number | null>(null);

  const [dragging, setDragging] = useState<{ id: string; dx: number; dy: number } | null>(null);

  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null);

  const autosaveTimerRef = useRef<number | null>(null);

  const textAutosaveTimerRef = useRef<number | null>(null);

  const activeNoteIdRef = useRef<string | null>(activeNoteId);

  const titleRef = useRef(title);

  const drawingLayerRef = useRef<string | null>(drawingLayer);

  const sheetsRef = useRef<SheetData[]>(sheets);

  const blocksRef = useRef<JournalPageBlock[]>(blocks);

  const editorShellRef = useRef<HTMLDivElement | null>(null);

  const blocksCanvasRef = useRef<HTMLDivElement | null>(null);


  /** Compute the dynamic canvas height based on deepest element */
  const canvasHeight = useMemo(() => {
    let deepest = MIN_CANVAS_HEIGHT;
    for (const b of blocks) {
      deepest = Math.max(deepest, b.y + b.height + CANVAS_BOTTOM_PAD);
    }
    for (const s of sheets) {
      deepest = Math.max(deepest, s.y + s.height + CANVAS_BOTTOM_PAD);
    }
    return deepest;
  }, [blocks, sheets]);


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

    content: activeNoteSheetsContent.html,

    onUpdate: ({ editor: currentEditor }) => {

      const noteId = activeNoteIdRef.current;

      if (!noteId) return;

      if (textAutosaveTimerRef.current) window.clearTimeout(textAutosaveTimerRef.current);

      textAutosaveTimerRef.current = window.setTimeout(() => {

        void update({ id: noteId, title: titleRef.current, html: attachNoteBlocks(attachDrawingLayer(attachSheets(currentEditor.getHTML(), sheetsRef.current), drawingLayerRef.current), blocksRef.current) });

      }, 700);

    },

    editorProps: {

      attributes: {

        class: 'prose-content min-h-[200px] w-full rounded-[1.5rem] bg-surface/45 p-5 text-base leading-8 outline-none relative break-words [overflow-wrap:break-word] [word-break:break-word]'

      }

    }

  });


  useEffect(() => { void load(); }, [load]);


  useEffect(() => {

    setTitle(activeNote?.title ?? '');

    setDrawingLayer(activeDrawingContent.drawing);

    setSheets(activeNoteSheetsContent.sheets);

    setBlocks(activeNoteBlocksContent.blocks);

    setSelectedBlockId(null);

    activeNoteIdRef.current = activeNote?.id ?? null;

    titleRef.current = activeNote?.title ?? '';

    drawingLayerRef.current = activeDrawingContent.drawing;

    sheetsRef.current = activeNoteSheetsContent.sheets;

    blocksRef.current = activeNoteBlocksContent.blocks;

    if (editor && activeNote && editor.getHTML() !== activeNoteSheetsContent.html) editor.commands.setContent(activeNoteSheetsContent.html || '<p></p>', false);

  }, [activeNote, activeDrawingContent.drawing, activeNoteBlocksContent.blocks, activeNoteSheetsContent.html, editor]);


  useEffect(() => { activeNoteIdRef.current = activeNoteId; }, [activeNoteId]);

  useEffect(() => { titleRef.current = title; }, [title]);

  useEffect(() => { drawingLayerRef.current = drawingLayer; }, [drawingLayer]);

  useEffect(() => { sheetsRef.current = sheets; }, [sheets]);

  useEffect(() => { blocksRef.current = blocks; }, [blocks]);


  const persist = async (nextDrawing = drawingLayer, nextSheets = sheets, nextBlocks = blocks) => {

    if (!activeNote || !editor) return;

    await update({ id: activeNote.id, title, html: attachNoteBlocks(attachDrawingLayer(attachSheets(editor.getHTML(), nextSheets), nextDrawing), nextBlocks) });

  };


  const queueAutosave = (nextDrawing: string | null) => {

    setDrawingLayer(nextDrawing);

    drawingLayerRef.current = nextDrawing;

    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);

    autosaveTimerRef.current = window.setTimeout(() => void persist(nextDrawing, sheetsRef.current), 550);

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


  const updateSheets = (nextSheets: SheetData[]) => {

    setSheets(nextSheets);

    sheetsRef.current = nextSheets;

    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);

    autosaveTimerRef.current = window.setTimeout(() => void persist(drawingLayerRef.current, nextSheets), 450);

  };


  const addGrid = () => {

    const newSheet = { ...defaultSheet(), x: 20 + sheets.length * 30, y: 20 + sheets.length * 30 };

    updateSheets([...sheets, newSheet]);

  };


  const deleteSheet = (sheetIndex: number) => {

    const nextSheets = sheets.filter((_, index) => index !== sheetIndex);

    updateSheets(nextSheets);

  };

  const insertImages = async () => {

    if (!editor) return;

    const images = await window.avyukta.media.importImages();

    const maxZ = Math.max(1, ...blocksRef.current.map((block) => block.zIndex));

    // Load each image to get its real natural dimensions
    const newBlocks = await Promise.all(images.map((image, index) => {
      const src = image.dataUrl ?? image.fileUrl ?? '';
      return new Promise<JournalPageBlock>((resolve) => {
        const img = new window.Image();
        img.onload = () => {
          const naturalW = img.naturalWidth || 400;
          const naturalH = img.naturalHeight || 300;
          const maxDim = 420;
          const scale = Math.min(1, maxDim / Math.max(naturalW, naturalH));
          resolve({
            id: crypto.randomUUID(),
            type: 'image' as const,
            mediaId: image.id,
            image: { ...image, sortOrder: index, caption: null },
            x: 80 + index * 34,
            y: 82 + index * 28,
            width: Math.round(naturalW * scale),
            height: Math.round(naturalH * scale),
            rotation: 0,
            zIndex: maxZ + index + 1,
            aspectRatio: naturalW / naturalH,
            crop: null,
          } as any);
        };
        img.onerror = () => {
          // Fallback if image fails to load
          const naturalW = image.width ?? 400;
          const naturalH = image.height ?? 300;
          const maxDim = 420;
          const scale = Math.min(1, maxDim / Math.max(naturalW, naturalH));
          resolve({
            id: crypto.randomUUID(),
            type: 'image' as const,
            mediaId: image.id,
            image: { ...image, sortOrder: index, caption: null },
            x: 80 + index * 34,
            y: 82 + index * 28,
            width: Math.round(naturalW * scale),
            height: Math.round(naturalH * scale),
            rotation: 0,
            zIndex: maxZ + index + 1,
            aspectRatio: naturalW / naturalH,
            crop: null,
          } as any);
        };
        img.src = src;
      });
    }));

    const nextBlocks: JournalPageBlock[] = [...blocksRef.current, ...newBlocks];

    setBlocks(nextBlocks);

    blocksRef.current = nextBlocks;

    await persist(drawingLayerRef.current, sheetsRef.current, nextBlocks);

  };

  const addTextBlock = () => {

    const maxZ = Math.max(1, ...blocks.map((block) => block.zIndex));

    const id = crypto.randomUUID();

    const next = [...blocks, { id, type: 'text' as const, text: 'New note...', x: 110, y: 110, width: 240, height: 120, rotation: -1, zIndex: maxZ + 1 }];

    setBlocks(next);

    setSelectedBlockId(id);

    void persist(drawingLayerRef.current, sheetsRef.current, next);

  };

  const updateBlock = (id: string, patch: Partial<JournalPageBlock>) => {

    const next = blocksRef.current.map((block) => (block.id === id ? { ...block, ...patch } : block));

    setBlocks(next);

    blocksRef.current = next;

    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);

    autosaveTimerRef.current = window.setTimeout(() => void persist(drawingLayerRef.current, sheetsRef.current, next), 450);

  };

  const deleteBlock = (id: string) => {

    const next = blocksRef.current.filter((block) => block.id !== id);

    setBlocks(next);

    blocksRef.current = next;

    setSelectedBlockId((current) => (current === id ? null : current));

    void persist(drawingLayerRef.current, sheetsRef.current, next);

  };

  const pendingDragRef = useRef<{ id: string; pointerId: number; target: HTMLElement; dx: number; dy: number; startX: number; startY: number } | null>(null);

  const startBlockDrag = (event: ReactPointerEvent, block: JournalPageBlock) => {

    setSelectedBlockId(block.id);
    setSelectedSheetIndex(null);

    if ((event.target as HTMLElement).closest('[data-editable="true"],button,input')) return;

    const canvas = blocksCanvasRef.current;
    const rect = canvas?.getBoundingClientRect();

    if (!rect || !canvas) return;

    // Don't setPointerCapture immediately — wait for actual movement so scroll still works
    const dx = event.clientX - rect.left + canvas.scrollLeft - block.x;
    const dy = event.clientY - rect.top + canvas.scrollTop - block.y;
    pendingDragRef.current = {
      id: block.id,
      pointerId: event.pointerId,
      target: event.currentTarget as HTMLElement,
      dx,
      dy,
      startX: event.clientX,
      startY: event.clientY,
    };

  };

  const moveBlockDrag = (event: ReactPointerEvent) => {

    // Check if we have a pending drag that hasn't been activated yet
    const pending = pendingDragRef.current;
    if (pending && !dragging) {
      const movedX = Math.abs(event.clientX - pending.startX);
      const movedY = Math.abs(event.clientY - pending.startY);
      // Only activate drag after 5px of movement — otherwise it's a scroll
      if (movedX < 5 && movedY < 5) return;
      // Activate the drag
      setDragging({ id: pending.id, dx: pending.dx, dy: pending.dy });
      try { pending.target.setPointerCapture(pending.pointerId); } catch { /* ignore */ }
      pendingDragRef.current = null;
    }

    if (!dragging || !blocksCanvasRef.current) return;

    const canvas = blocksCanvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const block = blocksRef.current.find((item) => item.id === dragging.id);

    if (!block) return;

    const rawX = event.clientX - rect.left + canvas.scrollLeft - dragging.dx;
    const rawY = event.clientY - rect.top + canvas.scrollTop - dragging.dy;

    // No upper boundary clamp — allow dragging anywhere, only clamp left >= 0 and top >= 0
    updateBlock(dragging.id, {
      x: Math.max(0, rawX),
      y: Math.max(0, rawY),
    });

    // Auto-scroll when near the bottom of the visible area
    const distFromBottom = rect.bottom - event.clientY;
    if (distFromBottom < AUTO_EXPAND_ZONE) {
      canvas.scrollTop += 12;
    }
    // Auto-scroll when near the top
    const distFromTop = event.clientY - rect.top;
    if (distFromTop < AUTO_EXPAND_ZONE && canvas.scrollTop > 0) {
      canvas.scrollTop -= 12;
    }
  };


  return (

    <>
    <motion.div className="grid h-full grid-cols-[clamp(220px,25%,320px)_1fr] gap-4 overflow-hidden" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>

      <aside className="flex min-w-0 flex-col gap-4 overflow-y-auto overflow-x-hidden">

        <Card className="p-5">

          <h2 className="font-display text-3xl font-bold">Notes</h2>

          <form className="mt-4 flex gap-2" onSubmit={(event) => void handleCreate(event)}>

            <input className="min-w-0 flex-1 rounded-2xl border border-line/70 bg-surface/60 px-4 py-3 text-sm outline-none focus:border-accent" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} />

            <Button type="submit" variant="primary" className="px-3"><Plus className="h-4 w-4" /></Button>

          </form>

          {error && <p className="mt-3 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-500">{error}</p>}

        </Card>

        <div className="flex min-w-0 flex-col gap-2 overflow-y-auto overflow-x-hidden">

          {loading && <Card className="p-4 text-sm text-muted">Loading notes...</Card>}

          {notes.map((note) => (

            <button key={note.id} type="button" onClick={() => setActiveNoteId(note.id)} className={cn('w-full rounded-[1.5rem] border p-4 text-left transition hover:border-accent/50', activeNoteId === note.id ? 'border-accent bg-accent text-white shadow-soft' : 'border-line/70 bg-elevated/50')}>

              <p className="truncate font-semibold">{note.title}</p>

              <p className={cn('mt-2 line-clamp-2 text-xs leading-5', activeNoteId === note.id ? 'text-white/70' : 'text-muted')}>{note.summary || 'No text yet'}</p>

            </button>

          ))}

        </div>

      </aside>


      <section className="flex min-w-0 flex-col overflow-hidden">

        {!activeNote ? (

          <Card className="grid h-full place-items-center p-8 text-center text-muted">Create a note to start writing.</Card>

        ) : (

          <Card className="flex min-w-0 flex-1 flex-col overflow-hidden p-5">

            <div className="mb-4 flex min-w-0 flex-shrink-0 flex-wrap items-center gap-3">

              <input className="min-w-0 flex-1 truncate bg-transparent font-display text-2xl font-bold outline-none sm:text-3xl lg:text-4xl" value={title} onChange={(event) => setTitle(event.target.value)} onBlur={() => void save()} />

              <span className="rounded-full bg-accent/10 px-3 py-2 text-xs font-bold text-accent">{saving ? 'Autosaving...' : 'Autosaves'}</span>

              <Button variant="ghost" className="gap-2" onClick={() => void deleteNote(activeNote.id)}><Trash2 className="h-4 w-4" />Archive</Button>

            </div>

            <div className="mb-4 flex flex-shrink-0 flex-wrap gap-1.5">

              <ToolbarButton active={editor?.isActive('bold')} onClick={() => editor?.chain().focus().toggleBold().run()} icon={Bold} label="Bold" />

              <ToolbarButton active={editor?.isActive('italic')} onClick={() => editor?.chain().focus().toggleItalic().run()} icon={Italic} label="Italic" />

              <ToolbarButton active={editor?.isActive('heading', { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} icon={Heading2} label="Heading" />

              <ToolbarButton active={editor?.isActive('bulletList')} onClick={() => editor?.chain().focus().toggleBulletList().run()} icon={List} label="List" />

              <ToolbarButton active={editor?.isActive('codeBlock')} onClick={() => editor?.chain().focus().toggleCodeBlock().run()} icon={Code} label="Code" />

              <ToolbarButton active={editor?.isActive('highlight')} onClick={() => editor?.chain().focus().toggleHighlight().run()} icon={Highlighter} label="Highlight" />

              <ToolbarButton onClick={() => void insertImages()} icon={ImagePlus} label="Insert Photo" />

              <ToolbarButton onClick={addTextBlock} icon={Type} label="Text Block" />

              <ToolbarButton active={drawingOpen} onClick={() => setDrawingOpen((open) => !open)} icon={Paintbrush} label={drawingOpen ? 'Exit Pen' : 'Pen'} />

              <ToolbarButton onClick={addGrid} icon={Grid3X3} label="Add Grid" />

              {sheets.length > 0 && (

                <>

                  <ToolbarButton onClick={() => updateSheets(sheets.map((s, i) => i === 0 ? addSheetColumn(s) : s))} icon={TableColumnsSplit} label="Add Column" />

                  <ToolbarButton onClick={() => updateSheets(sheets.map((s, i) => i === 0 ? addSheetRow(s) : s))} icon={TableRowsSplit} label="Add Row" />

                </>

              )}

            </div>

            <DrawingSurface active={drawingOpen} drawingLayer={drawingLayer} onDrawingChange={queueAutosave} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">

              <div

                ref={blocksCanvasRef}

                className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-[1.5rem] border border-line/70 bg-surface/35"

                style={{ }}

                onPointerMove={moveBlockDrag}

                onPointerUp={() => { setDragging(null); pendingDragRef.current = null; }}

                onPointerCancel={() => { setDragging(null); pendingDragRef.current = null; }}

                onClick={(event) => {

                  const target = event.target as HTMLElement;

                  const isOnBlock = target.closest('[data-block-id]');

                  const isOnSheet = target.closest('[data-sheet-id]');

                  if (!isOnBlock && !isOnSheet) {

                    setSelectedBlockId(null);

                    setSelectedSheetIndex(null);

                  }

                }}

              >
                {/* Inner content sizer — this grows to fit all blocks, enabling infinite scroll */}
                <div className="relative p-6" style={{ minHeight: canvasHeight }}>

                {/* Unified editor and content area with text wrapping support */}

                <div className="prose prose-neutral max-w-none break-words dark:prose-invert relative" style={{ position: 'relative', zIndex: 1, width: '100%', overflowWrap: 'break-word', wordBreak: 'break-word' }}>

                  <div ref={editorShellRef} className="mb-8">

                    <EditorContent editor={editor} />

                  </div>

                </div>


                {/* Floating spreadsheet grids */}

                {sheets.map((sheet, sheetIndex) => {
                  const isSheetSelected = selectedSheetIndex === sheetIndex;
                  return (
                  <div

                    key={sheetIndex}

                    data-sheet-id={sheetIndex}

                    className={cn('absolute rounded-xl border border-[#b7c2d0] bg-white text-slate-900 shadow-soft', isSheetSelected && 'ring-2 ring-accent ring-offset-2 ring-offset-surface')}

                    style={{

                      position: 'absolute',

                      left: sheet.x,

                      top: sheet.y,

                      width: sheet.width,

                      height: sheet.height,

                      zIndex: isSheetSelected ? 15 : 10,

                      cursor: 'default'

                    }}

                    onPointerDown={(event) => {

                      const target = event.target as HTMLElement;
                      const isHeaderClick = target.closest('[data-sheet-header]');
                      const isResizeHandle = target.closest('[aria-label*="Resize"]');
                      const isInput = target.closest('input');

                      // Let resize handles and inputs work without interference
                      if (isResizeHandle || isInput) return;

                      // Click anywhere on grid to select it
                      if (!isSheetSelected) {
                        setSelectedSheetIndex(sheetIndex);
                        setSelectedBlockId(null);
                        return;
                      }

                      // Already selected — header click starts drag
                      if (!isHeaderClick) return;

                      const startX = event.clientX;

                      const startY = event.clientY;

                      const startLeft = sheet.x;

                      const startTop = sheet.y;


                      const handlePointerMove = (moveEvent: PointerEvent) => {

                        const nextX = Math.max(0, startLeft + moveEvent.clientX - startX);

                        const nextY = Math.max(0, startTop + moveEvent.clientY - startY);


                        const nextSheets = [...sheets];

                        nextSheets[sheetIndex] = { ...sheet, x: nextX, y: nextY };

                        updateSheets(nextSheets);

                      };


                      const handlePointerUp = () => {

                        window.removeEventListener('pointermove', handlePointerMove);

                        window.removeEventListener('pointerup', handlePointerUp);

                      };


                      window.addEventListener('pointermove', handlePointerMove);

                      window.addEventListener('pointerup', handlePointerUp);

                    }}

                  >

                    <div className={cn("flex h-9 items-center justify-between border-b border-[#b7c2d0] bg-[#eef3f8] px-3 text-xs font-bold text-slate-600", isSheetSelected && "cursor-grab active:cursor-grabbing")} data-sheet-header>

                      <span>Grid</span>

                      <div className="flex items-center gap-2">

                        {isSheetSelected && <span className="rounded bg-white px-2 py-1 text-[10px] uppercase tracking-[0.16em]">drag</span>}

                        <button

                          type="button"

                          onClick={(event) => {

                            event.stopPropagation();

                            deleteSheet(sheetIndex);

                          }}

                          className="text-red-500 hover:text-red-700 transition"

                          title="Delete grid"

                        >

                          <Trash2 className="h-3 w-3" />

                        </button>

                      </div>

                    </div>

                    <div style={{ width: '100%', height: sheet.height - 36, overflow: isSheetSelected ? 'auto' : 'hidden' }}>

                      <div className="grid" style={{ gridTemplateColumns: `46px ${sheet.columnWidths.map((width) => `${width}px`).join(' ')}` }}>

                        <div className="sticky left-0 top-0 z-20 border-b border-r border-[#b7c2d0] bg-[#e3eaf2]" />

                        {sheet.columnWidths.map((width, columnIndex) => (

                          <div

                            key={columnIndex}

                            className="relative border-b border-r border-[#b7c2d0] bg-[#e3eaf2] py-1 text-center text-xs font-bold text-slate-600"

                            style={{ width }}

                          >

                            {columnName(columnIndex)}

                            <button

                              type="button"

                              aria-label="Resize column"

                              className="absolute right-[-4px] top-0 z-30 h-full w-2 cursor-col-resize"

                              onPointerDown={(event) => {

                                event.stopPropagation();

                                const startX = event.clientX;

                                const startWidth = width;

                                const handlePointerMove = (moveEvent: PointerEvent) => {

                                  const delta = moveEvent.clientX - startX;

                                  const nextSheets = [...sheets];

                                  const columnWidths = [...sheet.columnWidths];

                                  columnWidths[columnIndex] = Math.max(56, startWidth + delta);

                                  nextSheets[sheetIndex] = { ...sheet, columnWidths };

                                  updateSheets(nextSheets);

                                };

                                const handlePointerUp = () => {

                                  window.removeEventListener('pointermove', handlePointerMove);

                                  window.removeEventListener('pointerup', handlePointerUp);

                                };

                                window.addEventListener('pointermove', handlePointerMove);

                                window.addEventListener('pointerup', handlePointerUp);

                              }}

                            />

                          </div>

                        ))}

                        {sheet.cells.map((row, rowIndex) => (

                          <div key={rowIndex} className="contents">

                            <div

                              className="relative border-b border-r border-[#b7c2d0] bg-[#e3eaf2] text-center text-xs font-bold text-slate-600"

                              style={{ height: sheet.rowHeights[rowIndex] }}

                            >

                              <span className="leading-8">{rowIndex + 1}</span>

                              <button

                                type="button"

                                aria-label="Resize row"

                                className="absolute bottom-0 left-0 z-30 h-3 w-full cursor-row-resize"

                                onPointerDown={(event) => {

                                  event.stopPropagation();

                                  const startY = event.clientY;

                                  const startHeight = sheet.rowHeights[rowIndex];

                                  const handlePointerMove = (moveEvent: PointerEvent) => {

                                    const delta = moveEvent.clientY - startY;

                                    const nextSheets = [...sheets];

                                    const rowHeights = [...sheet.rowHeights];

                                    rowHeights[rowIndex] = Math.max(26, startHeight + delta);

                                    nextSheets[sheetIndex] = { ...sheet, rowHeights };

                                    updateSheets(nextSheets);

                                  };

                                  const handlePointerUp = () => {

                                    window.removeEventListener('pointermove', handlePointerMove);

                                    window.removeEventListener('pointerup', handlePointerUp);

                                  };

                                  window.addEventListener('pointermove', handlePointerMove);

                                  window.addEventListener('pointerup', handlePointerUp);

                                }}

                              />

                            </div>

                            {row.map((value, columnIndex) => (

                              <input

                                key={`${rowIndex}-${columnIndex}`}

                                className={cn('border-b border-r border-[#d4dbe5] bg-white px-2 text-sm outline-none focus:bg-[#fffbe8]')}

                                style={{ width: sheet.columnWidths[columnIndex], height: sheet.rowHeights[rowIndex] }}

                                value={value}

                                onChange={(event) => {

                                  const nextSheets = [...sheets];

                                  const cells = sheet.cells.map((r) => [...r]);

                                  cells[rowIndex][columnIndex] = event.target.value;

                                  nextSheets[sheetIndex] = { ...sheet, cells };

                                  updateSheets(nextSheets);

                                }}

                              />

                            ))}

                          </div>

                        ))}

                      </div>

                    </div>

                    {isSheetSelected && (['nw', 'ne', 'sw', 'se'] as const).map((corner) => (

                      <button

                        key={corner}

                        type="button"

                        aria-label={`Resize ${corner}`}

                        onPointerDown={(event) => {

                          event.preventDefault();

                          event.stopPropagation();

                          const startX = event.clientX;

                          const startY = event.clientY;

                          const startWidth = sheet.width;

                          const startHeight = sheet.height;

                          const startLeft = sheet.x;

                          const startTop = sheet.y;

                          const handlePointerMove = (moveEvent: PointerEvent) => {

                            const dx = moveEvent.clientX - startX;

                            const dy = moveEvent.clientY - startY;

                            const growsLeft = corner.includes('w');

                            const growsTop = corner.includes('n');

                            const nextWidth = Math.max(360, startWidth + (growsLeft ? -dx : dx));

                            const nextHeight = Math.max(220, startHeight + (growsTop ? -dy : dy));

                            const nextSheets = [...sheets];

                            nextSheets[sheetIndex] = {

                              ...sheet,

                              width: nextWidth,

                              height: nextHeight,

                              x: growsLeft ? startLeft + (startWidth - nextWidth) : startLeft,

                              y: growsTop ? startTop + (startHeight - nextHeight) : startTop

                            };

                            updateSheets(nextSheets);

                          };

                          const handlePointerUp = () => {

                            window.removeEventListener('pointermove', handlePointerMove);

                            window.removeEventListener('pointerup', handlePointerUp);

                          };

                          window.addEventListener('pointermove', handlePointerMove);

                          window.addEventListener('pointerup', handlePointerUp);

                        }}

                        className={cn(

                          'absolute h-4 w-4 rounded-full border-2 border-[#2f73d9] bg-white shadow-soft',

                          corner === 'nw' && '-left-2 -top-2 cursor-nwse-resize',

                          corner === 'ne' && '-right-2 -top-2 cursor-nesw-resize',

                          corner === 'sw' && '-bottom-2 -left-2 cursor-nesw-resize',

                          corner === 'se' && '-bottom-2 -right-2 cursor-nwse-resize'

                        )}

                      />

                    ))}

                  </div>
                  );
                })}


                {/* Floating blocks (images and text) */}

                {blocks.map((block) => (

                  <NoteFreeBlock

                    key={block.id}

                    block={block}

                    selected={selectedBlockId === block.id}

                    onPointerDown={(event) => startBlockDrag(event, block)}

                    onSelect={() => { setSelectedBlockId(block.id); setSelectedSheetIndex(null); }}

                    onChange={(patch) => updateBlock(block.id, patch)}

                    onDelete={() => deleteBlock(block.id)}

                    onPreview={(src, alt) => setPreviewImage({ src, alt })}

                  />

                ))}

                </div>{/* end inner content sizer */}

              </div>

            </DrawingSurface>

          </Card>

        )}

      </section>

    </motion.div>

    {/* Image preview lightbox */}
    {previewImage && (
      <ImagePreviewModal src={previewImage.src} alt={previewImage.alt} onClose={() => setPreviewImage(null)} />
    )}
    </>

  );

};


/* ─────────────────────── NoteFreeBlock ─────────────────────── */

const NoteFreeBlock = ({
  block,
  selected,
  onPointerDown,
  onSelect,
  onChange,
  onDelete,
  onPreview,
}: {
  block: JournalPageBlock;
  selected: boolean;
  onPointerDown: (event: ReactPointerEvent) => void;
  onSelect: () => void;
  onChange: (patch: Partial<JournalPageBlock>) => void;
  onDelete: () => void;
  onPreview: (src: string, alt: string) => void;
}) => {

  const blockRef = useRef<HTMLDivElement | null>(null);

  const isImage = block.type === 'image' && block.image;
  const imageSrc = block.image?.dataUrl ?? block.image?.fileUrl;
  // Always use the stored original aspect ratio — never derive from current (potentially cropped) block size
  const crop: CropData | null = (block as any).crop ?? null;
  const storedAR = (block as any).aspectRatio;
  const aspectRatio: number = storedAR || (
    // Fallback: compute from full uncropped size
    ((block.width + (crop?.left ?? 0) + (crop?.right ?? 0)) / (block.height + (crop?.top ?? 0) + (crop?.bottom ?? 0))) || 1
  );

  const [gesture, setGesture] = useState<

    | { type: 'resize'; corner: 'nw' | 'ne' | 'sw' | 'se'; startX: number; startY: number; startWidth: number; startHeight: number; startLeft: number; startTop: number; startCropForResize: CropData; startFullW: number; startFullH: number }

    | { type: 'crop'; edge: 'n' | 's' | 'e' | 'w'; startX: number; startY: number; startCrop: CropData; startWidth: number; startHeight: number; startBlockX: number; startBlockY: number; fullW: number; fullH: number }

    | { type: 'rotate'; centerX: number; centerY: number; startAngle: number; startRotation: number }

    | null

  >(null);


  useEffect(() => {

    if (!gesture) return;

    const onPointerMove = (event: PointerEvent) => {

      if (gesture.type === 'rotate') {

        const angle = Math.atan2(event.clientY - gesture.centerY, event.clientX - gesture.centerX) * (180 / Math.PI);

        onChange({ rotation: gesture.startRotation + angle - gesture.startAngle });

        return;

      }

      if (gesture.type === 'crop') {
        const dx = event.clientX - gesture.startX;
        const dy = event.clientY - gesture.startY;
        const { fullW, fullH } = gesture;
        const minSize = 30;

        // Compute new block dimensions and position by moving one edge
        let newW = gesture.startWidth;
        let newH = gesture.startHeight;
        let newX = gesture.startBlockX;
        let newY = gesture.startBlockY;

        if (gesture.edge === 'n') {
          // Drag top down → shrink from top, move block down
          const shift = clamp(dy, -(fullH - gesture.startHeight - gesture.startCrop.top), gesture.startHeight - minSize);
          newH = gesture.startHeight - shift;
          newY = gesture.startBlockY + shift;
        }
        if (gesture.edge === 's') {
          // Drag bottom up → shrink from bottom
          const shift = clamp(-dy, -(fullH - gesture.startHeight - gesture.startCrop.bottom), gesture.startHeight - minSize);
          newH = gesture.startHeight - shift;
        }
        if (gesture.edge === 'w') {
          // Drag left right → shrink from left, move block right
          const shift = clamp(dx, -(fullW - gesture.startWidth - gesture.startCrop.left), gesture.startWidth - minSize);
          newW = gesture.startWidth - shift;
          newX = gesture.startBlockX + shift;
        }
        if (gesture.edge === 'e') {
          // Drag right left → shrink from right
          const shift = clamp(-dx, -(fullW - gesture.startWidth - gesture.startCrop.right), gesture.startWidth - minSize);
          newW = gesture.startWidth - shift;
        }

        // Recompute crop insets from the new geometry
        // crop.top = how much was removed from top of full image
        const cropTop = newY - (gesture.startBlockY - gesture.startCrop.top);
        const cropLeft = newX - (gesture.startBlockX - gesture.startCrop.left);
        const cropBottom = fullH - cropTop - newH;
        const cropRight = fullW - cropLeft - newW;

        onChange({
          width: newW,
          height: newH,
          x: newX,
          y: newY,
          crop: {
            top: Math.max(0, cropTop),
            right: Math.max(0, cropRight),
            bottom: Math.max(0, cropBottom),
            left: Math.max(0, cropLeft),
          },
        } as any);
        return;
      }

      // Corner resize — aspect-ratio locked for images
      const dx = event.clientX - gesture.startX;

      const dy = event.clientY - gesture.startY;

      const growsLeft = gesture.corner.includes('w');

      const growsTop = gesture.corner.includes('n');

      if (isImage) {
        // Smooth diagonal-distance-based scaling
        // Project the mouse delta onto the corner diagonal for consistent 1:1 feel
        const dirX = growsLeft ? -1 : 1;
        const dirY = growsTop ? -1 : 1;
        const diag = (dx * dirX + dy * dirY) / Math.SQRT2;

        const { startFullW, startFullH, startCropForResize: sc } = gesture;
        const nextFullW = clamp(startFullW + diag, 40, 1600);
        const scaleFactor = nextFullW / startFullW;
        const nextFullH = Math.round(startFullH * scaleFactor);

        // Scale crop insets proportionally
        const hasCropInsets = sc.top > 0 || sc.right > 0 || sc.bottom > 0 || sc.left > 0;
        const nextCropTop = hasCropInsets ? Math.round(sc.top * scaleFactor) : 0;
        const nextCropRight = hasCropInsets ? Math.round(sc.right * scaleFactor) : 0;
        const nextCropBottom = hasCropInsets ? Math.round(sc.bottom * scaleFactor) : 0;
        const nextCropLeft = hasCropInsets ? Math.round(sc.left * scaleFactor) : 0;

        const nextWidth = nextFullW - nextCropLeft - nextCropRight;
        const nextHeight = nextFullH - nextCropTop - nextCropBottom;

        if (nextWidth < 30 || nextHeight < 30) return;

        onChange({
          width: nextWidth,
          height: nextHeight,
          x: growsLeft ? gesture.startLeft + (gesture.startWidth - nextWidth) : gesture.startLeft,
          y: growsTop ? gesture.startTop + (gesture.startHeight - nextHeight) : gesture.startTop,
          ...(hasCropInsets ? { crop: { top: nextCropTop, right: nextCropRight, bottom: nextCropBottom, left: nextCropLeft } } : {}),
        } as any);
      } else {
        const nextWidth = clamp(gesture.startWidth + (growsLeft ? -dx : dx), 90, 760);
        const nextHeight = clamp(gesture.startHeight + (growsTop ? -dy : dy), 70, 560);
        onChange({
          width: nextWidth,
          height: nextHeight,
          x: growsLeft ? gesture.startLeft + (gesture.startWidth - nextWidth) : gesture.startLeft,
          y: growsTop ? gesture.startTop + (gesture.startHeight - nextHeight) : gesture.startTop,
        });
      }

    };

    const onPointerUp = () => setGesture(null);

    window.addEventListener('pointermove', onPointerMove);

    window.addEventListener('pointerup', onPointerUp, { once: true });

    return () => {

      window.removeEventListener('pointermove', onPointerMove);

      window.removeEventListener('pointerup', onPointerUp);

    };

  }, [gesture, onChange, isImage, aspectRatio, block.width, block.height]);


  const startResize = (event: ReactPointerEvent, corner: 'nw' | 'ne' | 'sw' | 'se') => {

    event.preventDefault();

    event.stopPropagation();

    onSelect();

    const c: CropData = crop ?? { top: 0, right: 0, bottom: 0, left: 0 };

    setGesture({
      type: 'resize',
      corner,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: block.width,
      startHeight: block.height,
      startLeft: block.x,
      startTop: block.y,
      startCropForResize: { ...c },
      startFullW: block.width + c.left + c.right,
      startFullH: block.height + c.top + c.bottom,
    });

  };

  const startCrop = (event: ReactPointerEvent, edge: 'n' | 's' | 'e' | 'w') => {
    event.preventDefault();
    event.stopPropagation();
    onSelect();
    const currentCrop: CropData = crop ?? { top: 0, right: 0, bottom: 0, left: 0 };
    // Freeze the full uncropped size at drag start so it stays stable during the gesture
    const fullW = block.width + currentCrop.left + currentCrop.right;
    const fullH = block.height + currentCrop.top + currentCrop.bottom;
    setGesture({
      type: 'crop',
      edge,
      startX: event.clientX,
      startY: event.clientY,
      startCrop: currentCrop,
      startWidth: block.width,
      startHeight: block.height,
      startBlockX: block.x,
      startBlockY: block.y,
      fullW,
      fullH,
    });
  };

  const startRotate = (event: ReactPointerEvent) => {

    event.preventDefault();

    event.stopPropagation();

    onSelect();

    const rect = blockRef.current?.getBoundingClientRect();

    if (!rect) return;

    const centerX = rect.left + rect.width / 2;

    const centerY = rect.top + rect.height / 2;

    const startAngle = Math.atan2(event.clientY - centerY, event.clientX - centerX) * (180 / Math.PI);

    setGesture({ type: 'rotate', centerX, centerY, startAngle, startRotation: block.rotation });

  };

  const handleDoubleClick = () => {
    if (isImage && imageSrc) {
      onPreview(imageSrc, block.image?.originalName ?? 'Image');
    }
  };


  return (

    <div
      ref={blockRef}
      data-block-id={block.id}
      className={cn('group absolute cursor-grab active:cursor-grabbing', selected && 'z-50')}
      style={{
        left: block.x,
        top: block.y,
        width: block.width,
        height: block.height,
        transform: `rotate(${block.rotation}deg)`,
        zIndex: block.zIndex,
        touchAction: 'auto',
      }}
      onPointerDown={onPointerDown}
      onDoubleClick={handleDoubleClick}
    >

      {/* Top label bar */}
      <div className={cn('absolute -top-9 left-0 hidden items-center gap-1.5 rounded-full bg-ink/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-surface group-hover:flex', selected && 'flex')}>

        <Move className="h-3 w-3" /> Drag

        {isImage && <span className="ml-1 text-white/50">•</span>}
        {isImage && <span className="normal-case tracking-normal text-white/60">{Math.round(block.width)}×{Math.round(block.height)}</span>}

        <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onDelete(); }} className="ml-2 text-red-200 hover:text-red-400 transition">Delete</button>

      </div>

      {/* Image block */}
      {isImage && imageSrc ? (() => {
        const hasCrop = crop && (crop.top > 0 || crop.right > 0 || crop.bottom > 0 || crop.left > 0);
        // Full uncropped area (block + all crop insets)
        const fullW = block.width + (crop?.left ?? 0) + (crop?.right ?? 0);
        const fullH = block.height + (crop?.top ?? 0) + (crop?.bottom ?? 0);
        // Compute image render size from aspect ratio so it never stretches.
        // The image must cover the full uncropped area while keeping its ratio.
        let imgW = fullW;
        let imgH = fullW / aspectRatio;
        if (imgH < fullH) {
          imgH = fullH;
          imgW = fullH * aspectRatio;
        }
        return (
          <figure
            className="relative h-full w-full overflow-hidden rounded-[3px]"
            style={{ border: '1px solid rgba(0,0,0,0.06)' }}
          >
            <img
              src={imageSrc}
              alt={block.image?.originalName ?? 'Image'}
              className="block select-none"
              style={hasCrop ? {
                position: 'absolute',
                left: -(crop?.left ?? 0),
                top: -(crop?.top ?? 0),
                width: imgW,
                height: imgH,
                maxWidth: 'none',
              } : {
                width: '100%',
                height: '100%',
              }}
              draggable={false}
            />
          </figure>
        );
      })() : (

        <textarea

          data-editable="true"

          className="h-full min-h-[80px] w-full resize-none rounded-2xl border border-line/70 bg-elevated/75 p-4 text-base leading-7 text-ink shadow-sm outline-none"

          value={block.text ?? ''}

          onFocus={onSelect}

          onClick={onSelect}

          onChange={(event) => onChange({ text: event.target.value, ...getTextFit(event.target.value) })}

          placeholder="Write a movable note..."

        />

      )}

      {/* Selection UI */}
      {selected && (

        <>
          {/* Selection border */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-accent" />

          {/* Corner resize handles (aspect-ratio scale for images) */}
          {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => (

            <button

              key={corner}

              type="button"

              aria-label={`Scale ${corner}`}

              onPointerDown={(event) => startResize(event, corner)}

              className={cn(

                'absolute z-10 h-3.5 w-3.5 rounded-full border-2 border-accent bg-white shadow-md transition-transform hover:scale-125',

                corner === 'nw' && '-left-[7px] -top-[7px] cursor-nwse-resize',

                corner === 'ne' && '-right-[7px] -top-[7px] cursor-nesw-resize',

                corner === 'sw' && '-bottom-[7px] -left-[7px] cursor-nesw-resize',

                corner === 'se' && '-bottom-[7px] -right-[7px] cursor-nwse-resize'

              )}

            />

          ))}

          {/* Edge crop handles (images only) */}
          {isImage && (
            <>
              {/* Top center */}
              <button
                type="button"
                aria-label="Crop top"
                onPointerDown={(event) => startCrop(event, 'n')}
                className="absolute -top-[5px] left-1/2 z-10 h-2.5 w-8 -translate-x-1/2 cursor-ns-resize rounded-full border-2 border-orange-400 bg-white shadow-md transition-transform hover:scale-110"
              />
              {/* Bottom center */}
              <button
                type="button"
                aria-label="Crop bottom"
                onPointerDown={(event) => startCrop(event, 's')}
                className="absolute -bottom-[5px] left-1/2 z-10 h-2.5 w-8 -translate-x-1/2 cursor-ns-resize rounded-full border-2 border-orange-400 bg-white shadow-md transition-transform hover:scale-110"
              />
              {/* Left center */}
              <button
                type="button"
                aria-label="Crop left"
                onPointerDown={(event) => startCrop(event, 'w')}
                className="absolute -left-[5px] top-1/2 z-10 h-8 w-2.5 -translate-y-1/2 cursor-ew-resize rounded-full border-2 border-orange-400 bg-white shadow-md transition-transform hover:scale-110"
              />
              {/* Right center */}
              <button
                type="button"
                aria-label="Crop right"
                onPointerDown={(event) => startCrop(event, 'e')}
                className="absolute -right-[5px] top-1/2 z-10 h-8 w-2.5 -translate-y-1/2 cursor-ew-resize rounded-full border-2 border-orange-400 bg-white shadow-md transition-transform hover:scale-110"
              />
            </>
          )}

          {/* Rotate handle */}
          <button type="button" aria-label="Rotate block" onPointerDown={startRotate} className="absolute left-1/2 top-full mt-5 grid h-7 w-7 -translate-x-1/2 cursor-grab place-items-center rounded-full border-2 border-accent bg-white text-sm font-black text-accent shadow-md active:cursor-grabbing hover:scale-110 transition-transform">↻</button>

          <div className="absolute left-1/2 top-full h-5 w-px -translate-x-1/2 bg-accent/40" />

          {/* Dimensions label for images */}
          {isImage && (
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink/80 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
              {Math.round(block.width)} × {Math.round(block.height)}
              {crop && (crop.top > 0 || crop.right > 0 || crop.bottom > 0 || crop.left > 0) && (
                <span className="ml-1.5 text-orange-300">cropped</span>
              )}
            </div>
          )}

          {/* Reset crop button */}
          {isImage && crop && (crop.top > 0 || crop.right > 0 || crop.bottom > 0 || crop.left > 0) && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                // Restore full uncropped size
                const fullW = block.width + (crop?.left ?? 0) + (crop?.right ?? 0);
                const fullH = block.height + (crop?.top ?? 0) + (crop?.bottom ?? 0);
                onChange({
                  width: fullW,
                  height: fullH,
                  x: block.x - (crop?.left ?? 0),
                  y: block.y - (crop?.top ?? 0),
                  crop: { top: 0, right: 0, bottom: 0, left: 0 },
                } as any);
              }}
              className="absolute -top-9 right-0 flex items-center gap-1 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-md hover:bg-orange-600 transition"
            >
              <Crop className="h-3 w-3" /> Reset crop
            </button>
          )}
        </>

      )}

    </div>

  );

};


/* ─────────────────────── SpreadsheetGrid (standalone) ─────────────────────── */

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


  const startDrag = (event: ReactPointerEvent, type: NonNullable<typeof dragRef.current>['type'], row?: number, col?: number) => {

    event.preventDefault();

    event.stopPropagation();

    dragRef.current = { type, row, col, startX: event.clientX, startY: event.clientY, startSheet: structuredClone(sheet) };

    window.addEventListener('pointermove', handleWindowPointerMove);

    window.addEventListener('pointerup', stopDrag, { once: true });

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


/* ─────────────────────── DrawingSurface ─────────────────────── */

const DrawingSurface = ({ active, drawingLayer, onDrawingChange, children, className }: { active: boolean; drawingLayer: string | null; onDrawingChange: (dataUrl: string | null) => void; children: React.ReactNode; className?: string }) => {

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

    <div className={cn('flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[1.5rem]', className)}>

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

      <div ref={surfaceRef} className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.5rem]">

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


/* ─────────────────────── ToolbarButton ─────────────────────── */

const ToolbarButton = ({ active, onClick, icon: Icon, label }: { active?: boolean; onClick: () => void; icon: typeof Bold; label: string }) => (

  <button type="button" className={cn('inline-flex items-center gap-1.5 rounded-2xl border border-line/70 px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:text-ink sm:px-3 sm:py-2 sm:text-sm', active && 'border-accent bg-accent text-white')} onClick={onClick}>

    <Icon className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{label}</span>

  </button>

);
