import {
  Archive,
  Bell,
  BookOpenText,
  CalendarDays,
  Heart,
  Home,
  NotebookTabs,
  Plane,
  Sparkles,
} from 'lucide-react';
import type { ComponentType } from 'react';

export type NavItem = {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  phase: number;
};

export const primaryNavItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, phase: 1 },
  { id: 'tasks', label: 'Tasks', icon: NotebookTabs, phase: 2 },
  { id: 'notes', label: 'Notes', icon: BookOpenText, phase: 3 },
  { id: 'journal', label: 'Journal', icon: Sparkles, phase: 4 },
  { id: 'travel', label: 'Travel', icon: Plane, phase: 4 },
  { id: 'memories', label: 'Memory Vault', icon: Heart, phase: 4 }
];

export const systemNavItems: NavItem[] = [
  { id: 'reminders', label: 'Reminders', icon: Bell, phase: 2 },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays, phase: 2 },
  { id: 'trash', label: 'Trash', icon: Archive, phase: 2 }
];
