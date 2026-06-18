import { Command, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { primaryNavItems, systemNavItems } from '@/lib/navigation';
import { useUiStore } from '@/store/ui-store';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { PhaseBadge } from '@/components/ui/PhaseBadge';

export const Sidebar = () => {
  const activeView = useUiStore((state) => state.activeView);
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const setActiveView = useUiStore((state) => state.setActiveView);
  const setCollapsed = useUiStore((state) => state.setSidebarCollapsed);
  const openCommand = useUiStore((state) => state.setCommandPaletteOpen);

  return (
    <aside className={cn('glass-panel pointer-events-auto flex h-full shrink-0 flex-col rounded-[2rem] p-4 transition-all duration-300', collapsed ? 'w-[92px]' : 'w-[304px]')}>
      <div className="drag-region flex h-14 items-center justify-between pl-2">
        <div className={cn('overflow-hidden transition-opacity', collapsed && 'opacity-0')}>
          <p className="font-display text-2xl font-bold leading-none">Avyukta</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-muted">Local Life OS</p>
        </div>
        <Button variant="ghost" className="h-10 w-10 px-0" onClick={() => setCollapsed(!collapsed)} aria-label="Toggle sidebar">
          {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </Button>
      </div>

      <Button variant="secondary" className={cn('mt-4 gap-3 justify-start', collapsed && 'justify-center px-0')} onClick={() => openCommand(true)}>
        <Command className="h-4 w-4" />
        {!collapsed && <span>Command Palette</span>}
        {!collapsed && <span className="ml-auto rounded-lg bg-surface px-2 py-1 font-mono text-[11px] text-muted">⌘K</span>}
      </Button>

      <nav className="mt-6 min-h-0 flex-1 space-y-7 overflow-y-auto pr-1">
        <NavSection title="Create" collapsed={collapsed} items={primaryNavItems} activeView={activeView} onSelect={setActiveView} />
        <NavSection title="Organize" collapsed={collapsed} items={systemNavItems} activeView={activeView} onSelect={setActiveView} />
      </nav>
    </aside>
  );
};

type NavSectionProps = {
  title: string;
  collapsed: boolean;
  items: typeof primaryNavItems;
  activeView: string;
  onSelect: (view: string) => void;
};

const NavSection = ({ title, collapsed, items, activeView, onSelect }: NavSectionProps) => (
  <div>
    {!collapsed && <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.24em] text-muted">{title}</p>}
    <div className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        const active = activeView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={cn(
              'no-drag flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold transition',
              active ? 'bg-accent text-white shadow-soft' : 'text-muted hover:bg-elevated/65 hover:text-ink',
              collapsed && 'justify-center px-0'
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
            {!collapsed && item.phase > 1 && <span className="ml-auto"><PhaseBadge phase={item.phase} /></span>}
          </button>
        );
      })}
    </div>
  </div>
);
