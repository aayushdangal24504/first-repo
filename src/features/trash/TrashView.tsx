import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useTrashStore } from '../../store/trash-store';
import type { TrashItem } from '../../types/ipc';
import './TrashView.css';

export const TrashView = () => {
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const trash = useTrashStore();

  useEffect(() => {
    loadTrashItems();
  }, []);

  const loadTrashItems = async () => {
    try {
      setLoading(true);
      const items = await window.avyukta.trash.list();
      setTrashItems(items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trash items');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (trashId: string) => {
    try {
      await trash.restore(trashId);
      await loadTrashItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore item');
    }
  };

  const handleDeletePermanently = async (trashId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this item? This cannot be undone.')) {
      return;
    }
    try {
      await window.avyukta.trash.delete(trashId);
      await loadTrashItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
    }
  };

  const handleEmptyTrash = async () => {
    if (!window.confirm('Are you sure you want to empty the entire trash? This cannot be undone.')) {
      return;
    }
    try {
      await window.avyukta.trash.empty();
      await loadTrashItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to empty trash');
    }
  };

  const getEntityTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'journal': 'Journal',
      'journal_entry': 'Journal Entry',
      'note': 'Note',
      'task': 'Task',
      'reminder': 'Reminder',
      'trip': 'Trip',
      'trip_day': 'Trip Day',
      'memory': 'Memory',
      'media': 'Media'
    };
    return labels[type] || type;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="trash-view loading">Loading trash...</div>;
  }

  return (
    <div className="trash-view">
      <div className="trash-header">
        <h1>Trash Bin</h1>
        <p className="subtitle">Deleted items are kept here for 30 days before permanent deletion</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {trashItems.length === 0 ? (
        <Card className="empty-state">
          <p>Your trash is empty</p>
        </Card>
      ) : (
        <>
          <div className="trash-stats">
            <span>{trashItems.length} item{trashItems.length !== 1 ? 's' : ''} in trash</span>
            {trashItems.length > 0 && (
              <Button
                variant="secondary"
                onClick={handleEmptyTrash}
                className="empty-trash-btn"
              >
                Empty Trash
              </Button>
            )}
          </div>

          <div className="trash-items">
            {trashItems.map((item) => (
              <Card key={item.id} className="trash-item">
                <div className="trash-item-content">
                  <div className="trash-item-header">
                    <span className="entity-type">{getEntityTypeLabel(item.entityType)}</span>
                    <span className="entity-title">{item.title || '(Untitled)'}</span>
                  </div>
                  <div className="trash-item-meta">
                    <span className="deleted-date">Deleted: {formatDate(item.deletedAt)}</span>
                  </div>
                </div>
                <div className="trash-item-actions">
                  <Button
                    variant="primary"
                    onClick={() => handleRestore(item.id)}
                    className="h-9"
                  >
                    Restore
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleDeletePermanently(item.id)}
                    className="h-9 text-red-500"
                  >
                    Delete Permanently
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
