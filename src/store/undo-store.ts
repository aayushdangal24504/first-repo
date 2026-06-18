import { create } from 'zustand';

export type UndoAction = {
  id: string;
  type: 'create' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  entityName: string;
  timestamp: number;
  previousState?: any;
  currentState?: any;
  restore: () => Promise<void>;
  canUndo: boolean;
};

interface UndoStore {
  history: UndoAction[];
  currentIndex: number;
  maxHistorySize: number;
  
  // Action management
  addAction: (action: UndoAction) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getLastAction: () => UndoAction | null;
  
  // History management
  clearHistory: () => void;
  getHistory: () => UndoAction[];
}

export const useUndoStore = create<UndoStore>((set, get) => ({
  history: [],
  currentIndex: -1,
  maxHistorySize: 50,

  addAction: (action: UndoAction) => {
    set((state) => {
      // Remove any redo history when a new action is added
      const newHistory = state.history.slice(0, state.currentIndex + 1);
      
      // Add the new action
      newHistory.push(action);
      
      // Limit history size
      if (newHistory.length > state.maxHistorySize) {
        newHistory.shift();
      }

      return {
        history: newHistory,
        currentIndex: newHistory.length - 1
      };
    });
  },

  undo: async () => {
    const state = get();
    if (!state.canUndo()) return;

    try {
      const action = state.history[state.currentIndex];
      if (action && action.canUndo) {
        await action.restore();
        set((s) => ({ currentIndex: s.currentIndex - 1 }));
      }
    } catch (error) {
      console.error('Undo failed:', error);
    }
  },

  redo: async () => {
    const state = get();
    if (!state.canRedo()) return;

    try {
      const action = state.history[state.currentIndex + 1];
      if (action && action.canUndo) {
        await action.restore();
        set((s) => ({ currentIndex: s.currentIndex + 1 }));
      }
    } catch (error) {
      console.error('Redo failed:', error);
    }
  },

  canUndo: () => {
    const state = get();
    return state.currentIndex >= 0;
  },

  canRedo: () => {
    const state = get();
    return state.currentIndex < state.history.length - 1;
  },

  getLastAction: () => {
    const state = get();
    if (state.currentIndex >= 0 && state.currentIndex < state.history.length) {
      return state.history[state.currentIndex];
    }
    return null;
  },

  clearHistory: () => {
    set({
      history: [],
      currentIndex: -1
    });
  },

  getHistory: () => {
    const state = get();
    return state.history;
  }
}));
