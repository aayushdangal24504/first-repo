import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useMediaStore } from '@/store/media-store';

export const MediaView = () => {
  const { media, loading, error, load, importImages } = useMediaStore();

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="flex items-center justify-between p-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-accent">Local Media Library</p>
          <h2 className="mt-2 font-display text-4xl font-bold">{media.length} images stored locally</h2>
          <p className="mt-2 text-sm text-muted">Images are copied into Avyukta's local media folder. No uploads, no cloud.</p>
        </div>
        <Button variant="primary" className="gap-2" onClick={() => void importImages()}><ImagePlus className="h-4 w-4" />Import Images</Button>
      </Card>
      {error && <Card className="border-red-400/40 text-red-500">{error}</Card>}
      {loading && <Card className="p-6 text-muted">Loading media...</Card>}
      <div className="grid grid-cols-5 gap-4">
        {media.map((item) => (
          <figure key={item.id} className="glass-panel overflow-hidden rounded-[1.5rem] p-2">
            <img src={item.dataUrl ?? item.fileUrl} alt={item.originalName} className="aspect-square w-full rounded-[1.1rem] object-cover" />
            <figcaption className="truncate px-2 py-3 text-xs font-semibold text-muted">{item.originalName}</figcaption>
          </figure>
        ))}
      </div>
      {!loading && media.length === 0 && <Card className="p-8 text-center text-muted">No media yet. Import photos here or add photos from a journal page.</Card>}
    </motion.div>
  );
};
