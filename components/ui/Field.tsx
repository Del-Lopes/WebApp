import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';

// Estilo único dos campos: fundo translúcido, borda fina, foco verde.
// aria-invalid pinta a borda de vermelho.
const fieldClass = cn(
  'w-full rounded-lg bg-tint/3 border border-tint/10 px-3.5 py-2.5 text-sm text-fg',
  'placeholder:text-fg-subtle transition-colors',
  'focus:outline-hidden focus:border-accent/60 focus:ring-3 focus:ring-accent/20',
  'aria-invalid:border-danger/60 aria-invalid:focus:ring-danger/20',
  'disabled:opacity-50 disabled:cursor-not-allowed',
);

export const Label: React.FC<React.LabelHTMLAttributes<HTMLLabelElement> & { hint?: React.ReactNode }> = ({
  className, children, hint, ...props
}) => (
  <label className={cn('mb-1.5 flex items-baseline justify-between gap-2 text-sm font-medium text-fg', className)} {...props}>
    <span>{children}</span>
    {hint && <span className="text-xs font-normal text-fg-subtle">{hint}</span>}
  </label>
);

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(fieldClass, className)} {...props} />
));
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(fieldClass, 'min-h-24 resize-y', className)} {...props} />
));
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select ref={ref} className={cn(fieldClass, 'appearance-none pr-10 cursor-pointer', className)} {...props}>
      {children}
    </select>
    <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden />
  </div>
));
Select.displayName = 'Select';

/** Mensagem abaixo do campo: ajuda (neutra) ou erro. */
export const FieldMessage: React.FC<{ error?: boolean; children: React.ReactNode }> = ({ error, children }) => (
  <p className={cn('mt-1.5 text-xs', error ? 'text-danger-fg' : 'text-fg-subtle')} role={error ? 'alert' : undefined}>
    {children}
  </p>
);
