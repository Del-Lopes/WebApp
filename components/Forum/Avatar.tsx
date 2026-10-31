import React from 'react';
import { cn } from '../../lib/cn';

// Inicial do nome do autor em círculo.
export const Avatar: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
  <div
    className={cn(
      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/20 bg-accent/10 text-sm font-semibold text-accent-fg',
      className,
    )}
    aria-hidden
  >
    {name.trim().charAt(0).toUpperCase() || '?'}
  </div>
);
