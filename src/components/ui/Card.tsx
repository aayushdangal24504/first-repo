import type { PropsWithChildren } from 'react';
import { cn } from '@/lib/cn';

export const Card = ({ children, className }: PropsWithChildren<{ className?: string }>) => (
  <section className={cn('glass-panel rounded-[2rem] p-5', className)}>{children}</section>
);
