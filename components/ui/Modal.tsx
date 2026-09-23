import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  /** Ações no rodapé (ex.: Cancelar / Salvar). */
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Fecha ao clicar fora. Desligue em formulários longos para não perder dados. */
  closeOnOverlay?: boolean;
}

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Diálogo acessível: Esc fecha, foco preso no painel enquanto aberto e
// devolvido ao elemento de origem ao fechar, rolagem do fundo travada.
// No celular vira folha ancorada embaixo.
export const Modal: React.FC<ModalProps> = ({
  open, onClose, title, description, children, footer, size = 'md', closeOnOverlay = true,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [theme, setTheme] = useState<string | undefined>();
  const titleId = useId();
  const descId = useId();

  // O portal sai da árvore do tema: herda o [data-theme] de onde foi aberto.
  useLayoutEffect(() => {
    if (open) setTheme(anchorRef.current?.closest('[data-theme]')?.getAttribute('data-theme') ?? undefined);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    (panel?.querySelector<HTMLElement>(FOCUSABLE) ?? panel)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
      if (e.key !== 'Tab' || !panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (items.length === 0) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return <span ref={anchorRef} hidden />;

  return <>
    <span ref={anchorRef} hidden />
    {createPortal(
    <div data-theme={theme} className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={closeOnOverlay ? onClose : undefined}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          'relative w-full overflow-hidden rounded-t-2xl sm:rounded-2xl border border-tint/10 bg-surface text-fg shadow-2xl',
          'max-h-[92dvh] flex flex-col focus:outline-hidden',
          { 'sm:max-w-sm': size === 'sm', 'sm:max-w-lg': size === 'md', 'sm:max-w-2xl': size === 'lg', 'sm:max-w-4xl': size === 'xl' },
        )}
      >
        <div className="hairline absolute inset-x-0 top-0" aria-hidden />
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
            <div className="min-w-0">
              {title && <h2 id={titleId} className="font-display text-lg font-semibold text-fg">{title}</h2>}
              {description && <p id={descId} className="mt-1 text-sm text-fg-muted">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="-mr-1.5 -mt-1 rounded-lg p-1.5 text-fg-subtle transition-colors hover:bg-tint/5 hover:text-fg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="ds-scrollbar overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-tint/6 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
    )}
  </>;
};
