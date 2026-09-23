import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, ShoppingBag, ExternalLink, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Product, ProductType } from '../types';
import { BackButton } from './BackButton';

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && <BackButton onClick={onBack} />}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1 flex items-center gap-2">
              <ShoppingBag size={24} className="text-green-600" /> Market
            </h2>
            <p className="text-slate-500 text-sm">Cursos, ebooks, indicadores e robôs selecionados.</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => {
          const count = counts[f.value] ?? 0;
          if (f.value !== 'all' && count === 0) return null;
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
                active
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {f.label}
              <span className={`ml-2 text-[10px] ${active ? 'text-slate-300' : 'text-slate-400'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-green-600" size={32} /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-xl text-slate-500 border border-dashed border-slate-200">
          Nenhum produto disponível no momento.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(product => (
            <div
              key={product.id}
              className="group flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all"
            >
              <div className="relative aspect-video bg-slate-100">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <ShoppingBag size={36} />
                  </div>
                )}
                <span className="absolute top-2 left-2 px-2 py-1 bg-white/95 text-slate-700 text-[10px] font-black uppercase tracking-wider rounded-lg shadow-xs">
                  {TYPE_LABELS[product.type] || product.type}
                </span>
                {product.category && (
                  <span className="absolute top-2 right-2 px-2 py-1 bg-slate-900/85 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg">
                    {product.category}
                  </span>
                )}
              </div>

              <div className="p-4 flex-1 flex flex-col">
                <h4 className="text-base font-bold text-slate-900 mb-1 line-clamp-2 group-hover:text-green-600 transition-colors">
                  {product.title}
                </h4>
                <p className="text-xs text-slate-500 line-clamp-3 mb-4 flex-1">{product.description}</p>

                <div className="flex items-center justify-between gap-3 mt-auto">
                  {product.price_label ? (
                    <div className="flex items-center gap-1.5 text-green-700 font-black text-sm">
                      <Tag size={14} /> {product.price_label}
                    </div>
                  ) : <span />}
                  <button
                    onClick={() => openProduct(product)}
                    disabled={!product.external_link}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5"
                  >
                    Acessar <ExternalLink size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
