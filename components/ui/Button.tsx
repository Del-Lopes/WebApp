import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

// Ação principal em gradiente verde com texto escuro (igual nos dois temas);
// as demais variantes usam os tokens e se adaptam ao tema.
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-all duration-300 cursor-pointer',
        'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-page',
        'disabled:opacity-50 disabled:pointer-events-none',
        {
          'bg-gradient-to-r from-brand-green-bright to-brand-green text-brand-dark font-semibold shadow-[0_10px_40px_-12px_rgba(34,197,94,0.55)] hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0':
            variant === 'primary',
          'bg-tint/6 text-fg border border-tint/10 hover:bg-tint/10 hover:border-tint/20': variant === 'secondary',
          'border border-tint/15 text-fg hover:border-accent/60 hover:bg-accent/5': variant === 'outline',
          'text-fg-muted hover:text-fg hover:bg-tint/5': variant === 'ghost',
          'bg-danger/10 text-danger-fg border border-danger/25 hover:bg-danger/15 hover:border-danger/40': variant === 'danger',

          'h-9 px-3.5 text-sm': size === 'sm',
          'h-11 px-5 text-sm': size === 'md',
          'h-12 px-7 text-base': size === 'lg',
          'h-9 w-9 p-0': size === 'icon',
        },
        className,
      )}
      {...props}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  ),
);

Button.displayName = 'Button';
