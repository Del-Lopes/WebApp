import React from 'react';
import { cn } from '../../lib/cn';

/** Rótulo em caixa alta. `pill` = versão em cápsula com ponto pulsante (status). */
export const Eyebrow: React.FC<{ children: React.ReactNode; className?: string; pill?: boolean }> = ({ children, className, pill }) => {
  if (!pill) return <p className={cn('eyebrow', className)}>{children}</p>;
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-2 rounded-full border border-tint/10 bg-tint/3 px-3 py-1.5',
        'text-[10px] md:text-[11px] font-medium uppercase tracking-[0.2em] text-fg-muted',
        className,
      )}
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-green opacity-60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-green" />
      </span>
      <span className="truncate">{children}</span>
    </span>
  );
};

interface PageHeaderProps {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Botões à direita (quebram para baixo no celular). */
  actions?: React.ReactNode;
  /** Elemento antes do título, ex.: <BackButton />. */
  leading?: React.ReactNode;
  className?: string;
}

/** Cabeçalho de tela. Para destacar parte do título: <span className="text-gradient-brand">. */
export const PageHeader: React.FC<PageHeaderProps> = ({ eyebrow, title, description, actions, leading, className }) => (
  <header className={cn('mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between', className)}>
    <div className="flex min-w-0 items-start gap-3">
      {leading && <div className="shrink-0 pt-0.5">{leading}</div>}
      <div className="min-w-0 space-y-1.5">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="font-display text-2xl font-semibold leading-tight text-fg sm:text-3xl">{title}</h1>
        {description && <p className="max-w-2xl text-sm leading-relaxed text-fg-muted sm:text-base">{description}</p>}
      </div>
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>}
  </header>
);

interface StatProps {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Variação: positivo em verde, negativo em vermelho. */
  delta?: { value: React.ReactNode; tone: 'up' | 'down' | 'flat' };
  hint?: React.ReactNode;
  icon?: React.ElementType;
  className?: string;
}

/** Número em destaque: rótulo em eyebrow cinza, valor em display tabular. */
export const Stat: React.FC<StatProps> = ({ label, value, delta, hint, icon: Icon, className }) => (
  <div className={cn('@container glass-card p-5', className)}>
    <div className="flex items-center justify-between gap-2">
      <p className="eyebrow-muted truncate">{label}</p>
      {Icon && <Icon size={16} className="shrink-0 text-fg-subtle" aria-hidden />}
    </div>
    {/* O tamanho acompanha a largura do card (container query): valor nunca corta nem quebra. */}
    <p className="mt-2 whitespace-nowrap font-display text-xl font-semibold tabular-nums text-fg @[15rem]:text-2xl @[20rem]:text-3xl">{value}</p>
    {(delta || hint) && (
      <p className="mt-1 flex items-center gap-2 text-xs">
        {delta && (
          <span className={cn('font-medium tabular-nums', {
            'text-success-fg': delta.tone === 'up', 'text-danger-fg': delta.tone === 'down', 'text-fg-muted': delta.tone === 'flat',
          })}>
            {delta.value}
          </span>
        )}
        {hint && <span className="text-fg-subtle">{hint}</span>}
      </p>
    )}
  </div>
);

interface EmptyStateProps {
  icon?: React.ElementType;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action, className }) => (
  <div className={cn('flex flex-col items-center rounded-2xl border border-dashed border-tint/10 px-6 py-14 text-center', className)}>
    {Icon && (
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-tint/10 bg-tint/3 text-fg-subtle">
        <Icon size={22} aria-hidden />
      </div>
    )}
    <p className="font-display text-base font-semibold text-fg">{title}</p>
    {description && <p className="mt-1 max-w-sm text-sm text-fg-muted">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

/** Bloco de carregamento. Dimensione com w-/h- no className. */
export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('animate-pulse rounded-md bg-tint/6', className)} aria-hidden />
);
