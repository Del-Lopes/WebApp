import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X, Loader2, Upload, Image as ImageIcon, ShoppingBag, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { uploadToSupabase } from '../../lib/storage';
import { Product, ProductType } from '../../types';
import {
  Badge, Button, Card, EmptyState, FieldMessage, Input, Label, Select, Skeleton, Textarea,
  Table, THead, TBody, TR, TH, TD,
} from '../ui';

const PRODUCT_TYPES: { value: ProductType; label: string }[] = [
  { value: 'course', label: 'Curso' },
  { value: 'ebook', label: 'Ebook' },
  { value: 'indicator', label: 'Indicador' },
  { value: 'robot', label: 'Robô' },
  { value: 'ea', label: 'EA (estratégia)' },
  { value: 'affiliate', label: 'Link de afiliado' },
  { value: 'other', label: 'Outro' },
];

const TYPE_LABELS = Object.fromEntries(PRODUCT_TYPES.map(t => [t.value, t.label])) as Record<ProductType, string>;

interface FormState {
  type: ProductType;
  title: string;
  description: string;
  image_url: string;
  external_link: string;
  price_label: string;
  category: string;
  sort_order: number;
  is_published: boolean;
  show_in_market: boolean;
}

const emptyForm: FormState = {
  type: 'course',
  title: '',
  description: '',
  image_url: '',
  external_link: '',
  price_label: '',
  category: '',
  sort_order: 0,
  is_published: true,
  show_in_market: true,
};

export const MarketAdmin: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isUploading, setIsUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('show_in_market', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProducts((data || []) as Product[]);
    } catch (err) {
      console.error('Error fetching market products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      type: p.type,
      title: p.title || '',
      description: p.description || '',
      image_url: p.image_url || '',
      external_link: p.external_link || '',
      price_label: p.price_label || '',
      category: p.category || '',
      sort_order: p.sort_order ?? 0,
      is_published: p.is_published ?? true,
      show_in_market: p.show_in_market ?? true,
    });
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadToSupabase(file, 'other');
      setForm(prev => ({ ...prev, image_url: url }));
    } catch (err: any) {
      alert(err.message || 'Falha no upload');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        type: form.type,
        title: form.title,
        description: form.description,
        image_url: form.image_url || 'https://picsum.photos/400/225',
        external_link: form.external_link || null,
        price_label: form.price_label || null,
        category: form.category || null,
        sort_order: Number(form.sort_order) || 0,
        is_published: form.is_published,
        show_in_market: form.show_in_market,
      };
      if (editing) {
        const { error } = await supabase.from('products').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert(payload);
        if (error) throw error;
      }
      setIsModalOpen(false);
      await fetchProducts();
    } catch (err: any) {
      alert('Erro ao salvar: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este produto do Market? (Se for um curso, ele continua na Biblioteca, mas sai da loja.)')) return;
    try {
      // Conservador: nao deletar produtos do tipo 'course' ou 'ea' pra nao quebrar Biblioteca/Estrategias.
      // Apenas tira do Market.
      const prod = products.find(p => p.id === id);
      if (prod && (prod.type === 'course' || prod.type === 'ea')) {
        const { error } = await supabase.from('products').update({ show_in_market: false }).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
      }
      await fetchProducts();
    } catch (err: any) {
      alert('Erro ao excluir: ' + (err.message || err));
    }
  };

  const togglePublished = async (p: Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_published: !p.is_published })
        .eq('id', p.id);
      if (error) throw error;
      await fetchProducts();
    } catch (err: any) {
      alert('Erro: ' + (err.message || err));
    }
  };

  return (
    <div className="space-y-6 p-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-xl font-semibold text-fg tracking-tight flex items-center gap-2">
          <ShoppingBag size={24} className="text-accent-fg shrink-0" />
          Produtos do Market
        </h3>
        <Button size="sm" onClick={openCreate}>
          <Plus size={16} /> Novo Produto
        </Button>
      </div>

      {loading ? (
        <Card padding="none" className="divide-y divide-tint/6" aria-busy="true">
          {[0, 1, 2].map((k) => (
            <div key={k} className="flex items-center gap-3 px-4 py-4">
              <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/5" />
              </div>
            </div>
          ))}
        </Card>
      ) : products.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title='Nenhum produto no Market ainda. Clique em "Novo Produto" para criar.'
        />
      ) : (
        <Table className="text-left">
          <THead>
            <tr>
              <TH>Produto</TH>
              <TH>Tipo</TH>
              <TH>Categoria</TH>
              <TH>Preço</TH>
              <TH>Ordem</TH>
              <TH>Status</TH>
              <TH align="right">Ações</TH>
            </tr>
          </THead>
          <TBody>
            {products.map(p => (
              <TR key={p.id}>
                <TD>
                  <div className="flex items-center gap-3 min-w-[12rem]">
                    <div className="w-12 h-12 rounded-xl bg-tint/5 border border-tint/10 overflow-hidden flex items-center justify-center shrink-0">
                      {p.image_url ? (
                        <img src={p.image_url} className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBag size={20} className="text-fg-subtle" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-fg line-clamp-1">{p.title}</div>
                      {p.external_link && (
                        <a href={p.external_link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-fg-muted font-mono hover:text-accent-fg flex items-center gap-1 rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60">
                          <ExternalLink size={10} /> link
                        </a>
                      )}
                    </div>
                  </div>
                </TD>
                <TD>
                  <Badge className="uppercase tracking-wider text-[10px]">
                    {TYPE_LABELS[p.type] || p.type}
                  </Badge>
                </TD>
                <TD>{p.category || '—'}</TD>
                <TD className="font-semibold text-fg font-mono tabular-nums whitespace-nowrap">{p.price_label || '—'}</TD>
                <TD numeric align="left">{p.sort_order ?? 0}</TD>
                <TD>
                  <button
                    onClick={() => togglePublished(p)}
                    className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60 ${
                      p.is_published
                        ? 'bg-success/10 text-success-fg border-success/20 hover:bg-success/15'
                        : 'bg-tint/5 text-fg-muted border-tint/10 hover:bg-tint/8'
                    }`}
                    title="Alternar publicação"
                  >
                    {p.is_published ? <Eye size={12} /> : <EyeOff size={12} />}
                    {p.is_published ? 'Publicado' : 'Rascunho'}
                  </button>
                </TD>
                <TD align="right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(p)} className="p-2 text-fg-muted hover:text-fg hover:bg-tint/5 rounded-lg transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60" title="Editar" aria-label="Editar">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="p-2 text-fg-muted hover:text-danger-fg hover:bg-danger/10 rounded-lg transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60" title="Remover" aria-label="Remover">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div
            role="dialog"
            aria-modal="true"
            className="relative overflow-hidden bg-surface text-fg border border-tint/10 rounded-2xl w-full max-w-2xl my-8"
          >
            <div className="hairline absolute inset-x-0 top-0" aria-hidden />
            <div className="p-5 sm:p-6 border-b border-tint/6 flex justify-between items-center gap-4">
              <h3 className="font-display text-xl font-semibold text-fg">{editing ? 'Editar Produto' : 'Novo Produto'}</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                aria-label="Fechar"
                className="-mr-1.5 rounded-lg p-1.5 text-fg-subtle hover:text-fg hover:bg-tint/5 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
              >
                <X size={24} />
              </button>
            </div>

            <form id="market-form" onSubmit={handleSave} className="p-5 sm:p-6 space-y-4">
              <div>
                <Label htmlFor="market-type">Tipo</Label>
                <Select
                  id="market-type"
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value as ProductType })}
                >
                  {PRODUCT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Select>
                {(form.type === 'course' || form.type === 'ea') && (
                  <p className="text-[11px] text-warning-fg mt-1.5">
                    Atenção: produtos do tipo <b>{TYPE_LABELS[form.type]}</b> também aparecem na Biblioteca/Estratégias.
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="market-title">Título</Label>
                <Input
                  id="market-title"
                  type="text"
                  required
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="market-description">Descrição</Label>
                <Textarea
                  id="market-description"
                  rows={3}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div>
                <Label>Imagem de Capa</Label>
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  {form.image_url ? (
                    <div className="relative w-32 aspect-video rounded-lg overflow-hidden border border-tint/10 group shrink-0">
                      <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, image_url: '' }))}
                        aria-label="Remover imagem"
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity flex items-center justify-center text-white focus-visible:outline-hidden"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-32 aspect-video rounded-lg bg-tint/3 border-2 border-dashed border-tint/10 flex items-center justify-center text-fg-subtle shrink-0">
                      <ImageIcon size={24} />
                    </div>
                  )}
                  <div className="flex-1 w-full min-w-0">
                    <label className="flex flex-col items-center justify-center w-full h-12 px-4 transition-colors bg-tint/3 border-2 border-tint/10 border-dashed rounded-xl cursor-copy hover:border-accent/60 group focus-within:ring-2 focus-within:ring-accent/60">
                      <div className="flex items-center gap-2">
                        {isUploading ? <Loader2 className="animate-spin text-accent-fg" size={18} /> : <Upload className="text-fg-subtle group-hover:text-accent-fg" size={18} />}
                        <span className="text-xs font-semibold text-fg-muted group-hover:text-accent-fg">
                          {isUploading ? 'Enviando...' : 'Clique para subir imagem'}
                        </span>
                      </div>
                      <input type="file" className="sr-only" accept="image/*" disabled={isUploading} onChange={handleImageUpload} />
                    </label>
                    <input
                      type="text"
                      placeholder="Ou cole a URL"
                      value={form.image_url}
                      onChange={e => setForm({ ...form, image_url: e.target.value })}
                      className="w-full mt-2 text-[11px] text-fg placeholder:text-fg-subtle border-b border-tint/10 bg-transparent py-1 outline-hidden focus:border-accent/60 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="market-external-link">Link externo (compra / afiliado)</Label>
                <Input
                  id="market-external-link"
                  type="url"
                  placeholder="https://..."
                  value={form.external_link}
                  onChange={e => setForm({ ...form, external_link: e.target.value })}
                />
                <FieldMessage>Para onde o botão "Acessar" leva o cliente. Sem gateway por enquanto.</FieldMessage>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="market-price">Preço (texto livre)</Label>
                  <Input
                    id="market-price"
                    type="text"
                    placeholder="Ex: R$ 297 ou 12x R$ 29"
                    value={form.price_label}
                    onChange={e => setForm({ ...form, price_label: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="market-category">Categoria</Label>
                  <Input
                    id="market-category"
                    type="text"
                    placeholder="Ex: Iniciante"
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="market-sort-order">Ordem de exibição</Label>
                  <Input
                    id="market-sort-order"
                    type="number"
                    value={form.sort_order}
                    onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })}
                    className="font-mono tabular-nums"
                  />
                </div>
                <div className="flex flex-col gap-2 justify-end pb-1">
                  <label className="flex items-center gap-2 text-sm font-medium text-fg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_published}
                      onChange={e => setForm({ ...form, is_published: e.target.checked })}
                      className="w-4 h-4 accent-brand-green"
                    />
                    Publicado (visível para clientes)
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium text-fg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.show_in_market}
                      onChange={e => setForm({ ...form, show_in_market: e.target.checked })}
                      className="w-4 h-4 accent-brand-green"
                    />
                    Exibir no Market
                  </label>
                </div>
              </div>
            </form>

            <div className="p-5 sm:p-6 border-t border-tint/6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button
                type="submit"
                form="market-form"
                disabled={saving}
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
