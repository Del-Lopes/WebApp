import React, { useEffect, useMemo, useState } from 'react';
import { ShoppingBag, ExternalLink, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Product, ProductType } from '../types';
import { BackButton } from './BackButton';
import { Button, PageHeader, EmptyState, Skeleton } from './ui';

interface MarketProps {
  onBack?: () => void;
}

type FilterValue = 'all' | ProductType;

const TYPE_LABELS: Record<ProductType, string> = {
  course: 'Curso',
  ebook: 'Ebook',
  indicator: 'Indicador',
  robot: 'Robô',
  ea: 'EA',
  affiliate: 'Afiliado',
  other: 'Outro',
};

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'course', label: 'Cursos' },
  { value: 'ebook', label: 'Ebooks' },
  { value: 'indicator', label: 'Indicadores' },
  { value: 'robot', label: 'Robôs' },
  { value: 'affiliate', label: 'Afiliados' },
  { value: 'other', label: 'Outros' },
];

export const Market: React.FC<MarketProps> = ({ onBack }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterValue>('all');

  useEffect(() => {
    let cancelled = false;
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('show_in_market', true)
          .eq('is_published', true)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (!cancelled) setProducts((data || []) as Product[]);
      } catch (err) {
        console.error('Error fetching market products:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchProducts();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(
    () => (filter === 'all' ? products : products.filter(p => p.type === filter)),
    [products, filter]
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: products.length };
    for (const p of products) map[p.type] = (map[p.type] || 0) + 1;
    return map;
  }, [products]);

  const openProduct = (product: Product) => {
    if (product.external_link) {
      window.open(product.external_link, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        leading={onBack && <BackButton onClick={onBack} />}
        title={<span className="inline-flex items-center gap-2.5"><ShoppingBag size={24} className="text-accent-fg" aria-hidden /> Market</span>}
        description="Cursos, ebooks, indicadores e robôs selecionados."
        className="mb-0 sm:mb-0"
      />

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => {
          const count = counts[f.value] ?? 0;
          if (f.value !== 'all' && count === 0) return null;
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              aria-pressed={active}
              className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider transition-colors border focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60 ${
                active
                  ? 'bg-accent/10 text-accent-fg border-accent/30'
                  : 'bg-tint/3 text-fg-muted border-tint/10 hover:text-fg'
              }`}
            >
              {f.label}
              <span className={`ml-2 font-mono tabular-nums text-[10px] ${active ? 'text-accent-fg' : 'text-fg-subtle'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[0, 1, 2].map(i => (
            <div key={i} className="glass-card overflow-hidden">
              <Skeleton className="aspect-video w-full rounded-none" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="Nenhum produto disponível no momento." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(product => (
            <div
              key={product.id}
              className="group glass-card glass-card-hover flex flex-col overflow-hidden"
            >
              <div className="relative aspect-video bg-tint/3 border-b border-tint/6">
                {product.image_url ? (
                  <img loading="lazy" decoding="async" src={product.image_url} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-fg-subtle">
                    <ShoppingBag size={36} />
                  </div>
                )}
                <span className="absolute top-2 left-2 px-2 py-1 bg-surface/90 backdrop-blur-sm border border-tint/10 text-fg text-[10px] font-semibold uppercase tracking-wider rounded-md">
                  {TYPE_LABELS[product.type] || product.type}
                </span>
                {product.category && (
                  <span className="absolute top-2 right-2 px-2 py-1 bg-surface/90 backdrop-blur-sm border border-tint/10 text-fg-muted text-[10px] font-medium uppercase tracking-wider rounded-md">
                    {product.category}
                  </span>
                )}
              </div>

              <div className="p-4 flex-1 flex flex-col">
                <h4 className="font-display text-base font-semibold text-fg mb-1 line-clamp-2 group-hover:text-accent-fg transition-colors">
                  {product.title}
                </h4>
                <p className="text-xs text-fg-muted line-clamp-3 mb-4 flex-1">{product.description}</p>

                <div className="flex items-center justify-between gap-3 mt-auto">
                  {product.price_label ? (
                    <div className="flex items-center gap-1.5 text-accent-fg font-semibold text-sm font-display tabular-nums">
                      <Tag size={14} /> {product.price_label}
                    </div>
                  ) : <span />}
                  <Button
                    size="sm"
                    onClick={() => openProduct(product)}
                    disabled={!product.external_link}
                  >
                    Acessar <ExternalLink size={12} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
