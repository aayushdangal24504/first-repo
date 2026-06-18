import { Button } from '@/components/ui/Button';
import { useUndoStore } from '@/store/undo-store';
import './UndoButton.css';

interface UndoButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
}

export const UndoButton = ({
  variant = 'secondary',
  size = 'md',
  className = '',
  showLabel = true
}: UndoButtonProps) => {
  const canUndo = useUndoStore((state) => state.canUndo());
  const getLastAction = useUndoStore((state) => state.getLastAction);
  const undo = useUndoStore((state) => state.undo);

  const lastAction = getLastAction();
  const tooltipText = lastAction
    ? `Undo: ${lastAction.type} ${lastAction.entityName}`
    : 'No actions to undo';

  return (
    <Button
      variant={variant}
      onClick={() => undo()}
      disabled={!canUndo}
      title={tooltipText}
      className={`undo-button undo-button--${size} ${className}`}
    >
      <span className="undo-icon">↶</span>
      {showLabel && <span>Undo</span>}
    </Button>
  );
};
