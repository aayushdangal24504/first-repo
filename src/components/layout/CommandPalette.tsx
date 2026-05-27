import { motion, AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';
import { primaryNavItems, systemNavItems } from '@/lib/navigation';
import { useUiStore } from '@/store/ui-store';

export const CommandPalette = () => {
  const open = useUiStore((state) => state.commandPaletteOpen);
  const setOpen = useUiStore((state) => state.setCommandPaletteOpen);
  const setActiveView = useUiStore((state) => state.setActiveView);

  const items = [...primaryNavItems, ...systemNavItems];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-start bg-ink/25 px-6 pt-24 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={() => setOpen(false)}
        >
          <motion.div
            className="glass-panel mx-auto w-full max-w-2xl overflow-hidden rounded-[2rem]"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-line/70 px-5 py-4">
              <Search className="h-5 w-5 text-muted" />
              <input className="w-full bg-transparent text-base outline-none placeholder:text-muted" placeholder="Search actions, pages, notes, memories..." autoFocus />
            </div>
            <div className="max-h-[420px] overflow-y-auto p-3">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-muted transition hover:bg-elevated/70 hover:text-ink"
                    onClick={() => {
                      setActiveView(item.id);
                      setOpen(false);
                    }}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                    <span className="ml-auto text-xs uppercase tracking-[0.2em] text-muted">Phase {item.phase}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
