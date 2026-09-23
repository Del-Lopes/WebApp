import React from 'react';
import { cn } from '../../lib/cn';

// Tabela padrão: cabeçalho em eyebrow, linhas finas, hover sutil.
// O wrapper rola na horizontal no celular — a página nunca rola de lado.

// Classes escritas por inteiro: o Tailwind compilado não enxerga `text-${x}`.
const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' } as const;

export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement> & { wrapperClassName?: string }> = ({
  className, wrapperClassName, children, ...props
}) => (
  <div className={cn('ds-scrollbar w-full overflow-x-auto rounded-xl border border-tint/8', wrapperClassName)}>
    <table className={cn('w-full border-collapse text-sm', className)} {...props}>{children}</table>
  </div>
);

export const THead: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ className, ...props }) => (
  <thead className={cn('bg-tint/2', className)} {...props} />
);

export const TBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ className, ...props }) => (
  <tbody className={cn('divide-y divide-tint/6', className)} {...props} />
);

export const TR: React.FC<React.HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean }> = ({ className, interactive, ...props }) => (
  <tr className={cn('transition-colors hover:bg-tint/2', interactive && 'cursor-pointer', className)} {...props} />
);

export const TH: React.FC<React.ThHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'right' | 'center' }> = ({
  className, align = 'left', ...props
}) => (
  <th
    scope="col"
    className={cn('eyebrow-muted whitespace-nowrap border-b border-tint/8 px-4 py-3 font-medium', ALIGN[align], className)}
    {...props}
  />
);

export const TD: React.FC<React.TdHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'right' | 'center'; numeric?: boolean }> = ({
  className, align, numeric, ...props
}) => (
  <td
    className={cn(
      'px-4 py-3 text-fg-muted',
      numeric && 'font-mono tabular-nums text-fg whitespace-nowrap',
      ALIGN[align ?? (numeric ? 'right' : 'left')],
      className,
    )}
    {...props}
  />
);
