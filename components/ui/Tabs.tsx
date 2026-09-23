import React, { useRef } from 'react';
import { cn } from '../../lib/cn';

export interface TabItem<K extends string> {
  key: K;
  label: React.ReactNode;
  icon?: React.ElementType;
}

interface TabsProps<K extends string> {
  items: TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  className?: string;
  'aria-label'?: string;
}

// Abas segmentadas. Setas ←/→, Home e End navegam entre abas (padrão ARIA).
// Rola na horizontal no celular em vez de quebrar a linha.
export function Tabs<K extends string>({ items, value, onChange, className, ...rest }: TabsProps<K>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const last = items.length - 1;
    const next = e.key === 'ArrowRight' ? (i === last ? 0 : i + 1)
      : e.key === 'ArrowLeft' ? (i === 0 ? last : i - 1)
      : e.key === 'Home' ? 0 : e.key === 'End' ? last : -1;
    if (next < 0) return;
    e.preventDefault();
    onChange(items[next].key);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={rest['aria-label']}
      className={cn('ds-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-xl border border-tint/6 bg-tint/3 p-1 w-fit', className)}
    >
      {items.map(({ key, label, icon: Icon }, i) => {
        const active = key === value;
        return (
          <button
            key={key}
            ref={(el) => { refs.current[i] = el; }}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(key)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
              'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60',
              active ? 'bg-surface text-fg border border-tint/10 shadow-xs' : 'text-fg-muted hover:text-fg border border-transparent',
            )}
          >
            {Icon && <Icon size={16} className={active ? 'text-accent-fg' : undefined} aria-hidden />}
            {label}
          </button>
        );
      })}
    </div>
  );
}
