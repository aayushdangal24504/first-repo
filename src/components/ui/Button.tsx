import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '@/lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type ButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> & {
  variant?: ButtonVariant;
};

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white shadow-soft hover:brightness-105',
  secondary: 'border border-line/70 bg-elevated/70 text-ink hover:bg-elevated',
  ghost: 'text-muted hover:bg-elevated/60 hover:text-ink'
};

export const Button = ({ className, variant = 'secondary', children, type = 'button', ...props }: ButtonProps) => (
  <button
    type={type}
    className={cn(
      'no-drag inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-50',
      variants[variant],
      className
    )}
    {...props}
  >
    {children}
  </button>
);
