import {
  Archive,
  Bell,
  BookOpenText,
  CalendarDays,
  Compass,
  GalleryHorizontalEnd,
  Heart,
  Home,
  NotebookTabs,
  Plane,
  Search,
  Settings,
  Sparkles,
  Tags,
  TimerReset
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
  { id: 'memories', label: 'Memory Vault', icon: Heart, phase: 4 },
  { id: 'media', label: 'Media', icon: GalleryHorizontalEnd, phase: 5 }
];

export const systemNavItems: NavItem[] = [
  { id: 'reminders', label: 'Reminders', icon: Bell, phase: 2 },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays, phase: 2 },
  { id: 'search', label: 'Global Search', icon: Search, phase: 3 },
  { id: 'tags', label: 'Tags', icon: Tags, phase: 3 },
  { id: 'archive', label: 'Archive', icon: Archive, phase: 6 },
  { id: 'backups', label: 'Backups', icon: TimerReset, phase: 6 },
  { id: 'settings', label: 'Settings', icon: Settings, phase: 1 },
  { id: 'roadmap', label: 'Roadmap', icon: Compass, phase: 1 }
];
