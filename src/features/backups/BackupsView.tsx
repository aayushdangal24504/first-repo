import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { BackupResult } from '@/types/ipc';

export const BackupsView = () => {
  const [result, setResult] = useState<BackupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const exportBackup = async () => {
    setSaving(true);
    setError(null);
    try {
      setResult(await window.avyukta.backups.exportJson());
    } catch (backupError) {
      setError(backupError instanceof Error ? backupError.message : 'Failed to export backup');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div className="grid grid-cols-[1fr_0.8fr] gap-6" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="p-8">
        <div className="grid h-16 w-16 place-items-center rounded-[2rem] bg-accent/15 text-accent"><ShieldCheck className="h-8 w-8" /></div>
        <h2 className="mt-6 font-display text-5xl font-bold">Local data safety.</h2>
        <p className="mt-4 max-w-2xl text-base leading-8 text-muted">Export a readable JSON backup of your local SQLite data. Media files stay in the local media folder; ZIP restore/export is still a later hardening pass.</p>
        <Button variant="primary" className="mt-7 gap-2" onClick={() => void exportBackup()} disabled={saving}><Download className="h-4 w-4" />{saving ? 'Exporting...' : 'Export JSON Backup'}</Button>
      </Card>
      <Card className="p-6">
        <h3 className="font-display text-2xl font-bold">Latest Export</h3>
        {result ? (
          <div className="mt-4 space-y-3 text-sm text-muted">
            <p className="rounded-2xl bg-surface/45 p-4 font-mono text-xs">{result.path}</p>
            <p>{result.tables.length} tables exported.</p>
          </div>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-line bg-surface/40 p-4 text-sm leading-6 text-muted">No backup exported this session.</p>
        )}
        {error && <p className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-500">{error}</p>}
      </Card>
    </motion.div>
  );
};
