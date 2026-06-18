import { useEffect, useState } from 'react';
import { useUndoStore } from '../../store/undo-store';
import { Button } from '../../components/ui/Button';
import './UndoToast.css';

export const UndoToast = () => {
  const [showToast, setShowToast] = useState(false);
  const [message, setMessage] = useState('');
  const { history, currentIndex } = useUndoStore();
  const canUndo = useUndoStore((state) => state.canUndo());

  useEffect(() => {
    if (canUndo && currentIndex >= 0 && currentIndex < history.length) {
      const lastAction = history[currentIndex];
      setMessage(`${lastAction.type === 'delete' ? 'Deleted' : 'Modified'} ${lastAction.entityName}`);
      setShowToast(true);

      // Auto-hide after 4 seconds
      const timer = setTimeout(() => setShowToast(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [history, currentIndex, canUndo]);

  const handleUndo = async () => {
    const undo = useUndoStore.getState().undo;
    await undo();
    setShowToast(false);
  };

  if (!showToast) return null;

  return (
    <div className="undo-toast">
      <span className="toast-message">{message}</span>
      <Button
        variant="secondary"
        onClick={handleUndo}
        className="undo-btn h-8 px-3 text-xs"
      >
        Undo
      </Button>
    </div>
  );
};
