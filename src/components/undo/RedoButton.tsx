import { Button } from '@/components/ui/Button';
import { useUndoStore } from '@/store/undo-store';
import './RedoButton.css';

interface RedoButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
}

export const RedoButton = ({
  variant = 'secondary',
  size = 'md',
  className = '',
  showLabel = true
}: RedoButtonProps) => {
  const canRedo = useUndoStore((state) => state.canRedo());
  const redo = useUndoStore((state) => state.redo);

  return (
    <Button
      variant={variant}
      onClick={() => redo()}
      disabled={!canRedo}
      title="Redo (Cmd+Shift+Z)"
      className={`redo-button redo-button--${size} ${className}`}
    >
      <span className="redo-icon">↷</span>
      {showLabel && <span>Redo</span>}
    </Button>
  );
};
