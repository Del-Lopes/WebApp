import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X, Loader2, Upload, Image as ImageIcon, ShoppingBag, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { uploadToSupabase } from '../../lib/storage';
import { Product, ProductType } from '../../types';

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
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <ShoppingBag size={24} className="text-green-600" />
          Produtos do Market
        </h3>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 text-sm font-bold transition-all shadow-lg"
        >
          <Plus size={16} /> Novo Produto
        </button>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-green-600" size={28} /></div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-slate-400 italic">
            Nenhum produto no Market ainda. Clique em "Novo Produto" para criar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-medium">Produto</th>
                  <th className="px-6 py-4 font-medium">Tipo</th>
                  <th className="px-6 py-4 font-medium">Categoria</th>
                  <th className="px-6 py-4 font-medium">Preço</th>
                  <th className="px-6 py-4 font-medium">Ordem</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                          {p.image_url ? (
                            <img src={p.image_url} className="w-full h-full object-cover" />
                          ) : (
                            <ShoppingBag size={20} className="text-slate-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 line-clamp-1">{p.title}</div>
                          {p.external_link && (
                            <a href={p.external_link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-slate-400 font-mono hover:text-green-600 flex items-center gap-1">
                              <ExternalLink size={10} /> link
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase tracking-wider">
                        {TYPE_LABELS[p.type] || p.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{p.category || '—'}</td>
                    <td className="px-6 py-4 font-bold text-slate-700">{p.price_label || '—'}</td>
                    <td className="px-6 py-4 text-slate-500 tabular-nums">{p.sort_order ?? 0}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => togglePublished(p)}
                        className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                          p.is_published ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'
                        }`}
                        title="Alternar publicação"
                      >
                        {p.is_published ? <Eye size={12} /> : <EyeOff size={12} />}
                        {p.is_published ? 'Publicado' : 'Rascunho'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(p)} className="p-2 text-slate-400 hover:text-blue-600 rounded-lg" title="Editar">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg" title="Remover">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl my-8">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <h3 className="text-xl font-bold text-slate-800">{editing ? 'Editar Produto' : 'Novo Produto'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-slate-400" /></button>
            </div>

            <form id="market-form" onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Tipo</label>
                <select
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value as ProductType })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-white"
                >
                  {PRODUCT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                {(form.type === 'course' || form.type === 'ea') && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Atenção: produtos do tipo <b>{TYPE_LABELS[form.type]}</b> também aparecem na Biblioteca/Estratégias.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Título</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Descrição</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Imagem de Capa</label>
                <div className="flex gap-4 items-start">
                  {form.image_url ? (
                    <div className="relative w-32 aspect-video rounded-lg overflow-hidden border border-slate-200 group">
                      <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, image_url: '' }))}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-32 aspect-video rounded-lg bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400">
                      <ImageIcon size={24} />
                    </div>
                  )}
                  <div className="flex-1">
                    <label className="flex flex-col items-center justify-center w-full h-12 px-4 transition bg-white border-2 border-slate-200 border-dashed rounded-xl cursor-copy hover:border-green-500 group">
                      <div className="flex items-center space-x-2">
                        {isUploading ? <Loader2 className="animate-spin text-green-600" size={18} /> : <Upload className="text-slate-400 group-hover:text-green-600" size={18} />}
                        <span className="text-xs font-bold text-slate-500 group-hover:text-green-600">
                          {isUploading ? 'Enviando...' : 'Clique para subir imagem'}
                        </span>
                      </div>
                      <input type="file" className="hidden" accept="image/*" disabled={isUploading} onChange={handleImageUpload} />
                    </label>
                    <input
                      type="text"
                      placeholder="Ou cole a URL"
                      value={form.image_url}
                      onChange={e => setForm({ ...form, image_url: e.target.value })}
                      className="w-full mt-2 text-[11px] border-b border-slate-200 bg-transparent py-1 outline-none focus:border-green-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Link externo (compra / afiliado)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={form.external_link}
                  onChange={e => setForm({ ...form, external_link: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">Para onde o botão "Acessar" leva o cliente. Sem gateway por enquanto.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Preço (texto livre)</label>
                  <input
                    type="text"
                    placeholder="Ex: R$ 297 ou 12x R$ 29"
                    value={form.price_label}
                    onChange={e => setForm({ ...form, price_label: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Categoria</label>
                  <input
                    type="text"
                    placeholder="Ex: Iniciante"
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Ordem de exibição</label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                  />
                </div>
                <div className="flex flex-col gap-2 justify-end pb-1">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_published}
                      onChange={e => setForm({ ...form, is_published: e.target.checked })}
                      className="w-4 h-4 accent-green-600"
                    />
                    Publicado (visível para clientes)
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.show_in_market}
                      onChange={e => setForm({ ...form, show_in_market: e.target.checked })}
                      className="w-4 h-4 accent-green-600"
                    />
                    Exibir no Market
                  </label>
                </div>
              </div>
            </form>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-2xl">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg">Cancelar</button>
              <button
                type="submit"
                form="market-form"
                disabled={saving}
                className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500 shadow-lg disabled:opacity-60"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
