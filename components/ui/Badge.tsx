import React from 'react';
import { cn } from '../../lib/cn';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'danger' | 'warning' | 'info';

// Cores semânticas: success = lucro/compra/ativo, danger = perda/venda/erro,
// warning = aviso/pendente, info só quando for semântico. Decoração usa neutral ou accent.
const tones: Record<BadgeTone, string> = {
  neutral: 'bg-tint/5 text-fg-muted border-tint/10',
  accent: 'bg-accent/10 text-accent-fg border-accent/20',
  success: 'bg-success/10 text-success-fg border-success/20',
  danger: 'bg-danger/10 text-danger-fg border-danger/20',
  warning: 'bg-warning/10 text-warning-fg border-warning/20',
  info: 'bg-info/10 text-info-fg border-info/20',
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  /** Ponto colorido à esquerda (status). */
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({ tone = 'neutral', dot, className, children, ...props }) => (
  <span
    className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap', tones[tone], className)}
    {...props}
  >
    {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
    {children}
  </span>
);
