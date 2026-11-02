import React, { useId, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn';

interface Props {
  title: string;
  icon?: React.ReactNode;
  /** Contagem ou status ao lado do título (visível mesmo fechada). */
  badge?: React.ReactNode;
  /** Botões à direita (ex.: "Nova Postagem"); clicar neles não abre nem fecha. */
  actions?: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}

// Seção que abre e fecha ao clicar no título. Fechada, o conteúdo nem é montado
// (listas com imagens só carregam quando você abre).
export const CollapsibleSection: React.FC<Props> = ({
  title, icon, badge, actions, defaultOpen = false, className, children,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <section className={className}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={panelId}
          className="group flex min-w-0 items-center gap-2 rounded-lg text-left focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          <ChevronRight
            size={20}
            aria-hidden
            className={cn('shrink-0 text-fg-subtle transition-transform duration-200 group-hover:text-fg', open && 'rotate-90')}
          />
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-fg sm:text-xl">
            {icon}
            <span>{title}</span>
          </h3>
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {badge}
          {actions}
        </div>
      </div>
      {open && (
        <div id={panelId} className="mt-5">
          {children}
        </div>
      )}
    </section>
  );
};
