import React from 'react';
import { cn } from '../../lib/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Borda acende em verde no hover (cards clicáveis). */
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({ interactive, padding = 'md', className, children, ...props }) => (
  <div
    className={cn(
      'glass-card',
      interactive && 'glass-card-hover group cursor-pointer',
      { 'p-0': padding === 'none', 'p-4': padding === 'sm', 'p-5 sm:p-6': padding === 'md', 'p-6 sm:p-8': padding === 'lg' },
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

/** Título de card: display, com ação opcional à direita. */
export const CardHeader: React.FC<{ title: React.ReactNode; eyebrow?: React.ReactNode; action?: React.ReactNode; className?: string }> = ({
  title, eyebrow, action, className,
}) => (
  <div className={cn('mb-4 flex items-start justify-between gap-4', className)}>
    <div className="min-w-0">
      {eyebrow && <p className="eyebrow-muted mb-1">{eyebrow}</p>}
      <h3 className="font-display text-lg font-semibold text-fg truncate">{title}</h3>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
