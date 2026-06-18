import { useEffect } from 'react';
import { useUndoStore } from '@/store/undo-store';

export const useUndoShortcuts = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+Z (Mac) or Ctrl+Z (Windows/Linux)
      const isUndoShortcut = (e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey;
      // Check for Cmd+Shift+Z (Mac) or Ctrl+Shift+Z (Windows/Linux) for redo
      const isRedoShortcut = (e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey;

      if (isUndoShortcut) {
        e.preventDefault();
        useUndoStore.getState().undo();
      } else if (isRedoShortcut) {
        e.preventDefault();
        useUndoStore.getState().redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
};
