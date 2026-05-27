import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';
export type Accent = 'sage' | 'clay' | 'ocean' | 'rose' | 'amber';

export type NavigationTarget = { type: string; id: string; parentId?: string } | null;

export type UiState = {
  activeView: string;
  navigationTarget: NavigationTarget;
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  themeMode: ThemeMode;
  accent: Accent;
  setActiveView: (view: string) => void;
  goTo: (view: string, target?: Exclude<NavigationTarget, null>) => void;
  clearNavigationTarget: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setAccent: (accent: Accent) => void;
};

export const useUiStore = create<UiState>((set) => ({
  activeView: 'dashboard',
  navigationTarget: null,
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  themeMode: 'system',
  accent: 'sage',
  setActiveView: (activeView) => set({ activeView, navigationTarget: null }),
  goTo: (activeView, navigationTarget) => set({ activeView, navigationTarget: navigationTarget ?? null }),
  clearNavigationTarget: () => set({ navigationTarget: null }),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
  setThemeMode: (themeMode) => set({ themeMode }),
  setAccent: (accent) => set({ accent })
}));
