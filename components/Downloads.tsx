import React, { useState, useEffect } from 'react';
import { Download, FileText, Smartphone, Monitor, TrendingUp, Plus, Trash2, Edit2, Check, X, Shield, Bot, Book, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button, Input, PageHeader, Select, Skeleton, Textarea } from './ui';
import { BackButton } from './BackButton';

interface DownloadsProps {
  onBack: () => void;
}

interface DownloadItem {
  id: string;
  title: string;
  description: string;
  category: 'Platform' | 'Indicator' | 'Utility' | 'Document';
  platform: 'Windows' | 'Mac' | 'Mobile' | 'PDF';
  version?: string;
  size?: string;
  download_url: string;
  icon_type: string;
}

export const Downloads: React.FC<DownloadsProps> = ({ onBack }) => {
  const [items, setItems] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [newItem, setNewItem] = useState<Partial<DownloadItem>>({
    category: 'Platform',
    platform: 'Windows',
    icon_type: 'monitor'
  });
  const [editValues, setEditValues] = useState<Partial<DownloadItem>>({});

  useEffect(() => {
    checkUserRole();
    fetchDownloads();
  }, []);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (data && data.role === 'admin') {
        setIsAdmin(true);
      }
    }
  };

  const fetchDownloads = async () => {
    try {
      const { data, error } = await supabase
        .from('downloads')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching downloads:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'monitor': return <Monitor size={24} className="text-accent-fg" />;
      case 'smartphone': return <Smartphone size={24} className="text-accent-fg" />;
      case 'file-text': return <FileText size={24} className="text-accent-fg" />;
      case 'trending-up': return <TrendingUp size={24} className="text-accent-fg" />;
      case 'shield': return <ShieldCheck size={24} className="text-accent-fg" />;
      case 'bot': return <Bot size={24} className="text-accent-fg" />;
      case 'book': return <Book size={24} className="text-accent-fg" />;
      default: return <Download size={24} className="text-fg-muted" />;
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.title || !newItem.download_url) return;

    try {
      const { error } = await supabase.from('downloads').insert([newItem]);
      if (error) throw error;

      setNewItem({
        category: 'Platform',
        platform: 'Windows',
        icon_type: 'monitor',
        title: '',
        description: '',
        download_url: '',
        version: '',
        size: ''
      });
      setIsAdding(false);
      fetchDownloads();
    } catch (error) {
      console.error('Error adding item:', error);
      alert('Erro ao adicionar item');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este item?')) return;
    try {
      const { error } = await supabase.from('downloads').delete().eq('id', id);
      if (error) throw error;
      fetchDownloads();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Erro ao excluir item');
    }
  };

  const startEditing = (item: DownloadItem) => {
    setEditingId(item.id);
    setEditValues(item);
  };

  const saveEditing = async (id: string) => {
    try {
      const { error } = await supabase
        .from('downloads')
        .update(editValues)
        .eq('id', id);

      if (error) throw error;
      setEditingId(null);
      setEditValues({});
      fetchDownloads();
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Erro ao atualizar item');
    }
  };

  // Campos compactos da edição inline no card (o <Input> tem padding de formulário).
  const inlineField = 'bg-tint/3 border border-tint/10 rounded-md text-fg placeholder:text-fg-subtle focus:outline-hidden focus:border-accent/60 focus:ring-2 focus:ring-accent/20';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Header */}
      <PageHeader
        className="mb-0 sm:mb-0"
        leading={
          <BackButton onClick={onBack} />
        }
        eyebrow={<span className="inline-flex items-center gap-1.5"><Download size={12} /> Downloads</span>}
        title="Downloads e Ferramentas"
        description="Recursos essenciais para sua operação."
        actions={isAdmin && (
          <Button
            variant={isAdding ? 'secondary' : 'primary'}
            onClick={() => setIsAdding(!isAdding)}
          >
            {isAdding ? <X size={18} /> : <Plus size={18} />}
            <span>{isAdding ? 'Cancelar' : 'Novo Item'}</span>
          </Button>
        )}
      />

      {/* Add Form */}
      {isAdding && (
        <form onSubmit={handleAddItem} className="glass-card relative overflow-hidden p-5 sm:p-6 rounded-2xl mb-6">
          <div className="absolute top-0 inset-x-0 hairline" aria-hidden></div>
          <h3 className="font-display text-lg font-semibold text-fg mb-4">Adicionar Novo Recurso</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              type="text"
              placeholder="Título"
              value={newItem.title || ''}
              onChange={e => setNewItem({...newItem, title: e.target.value})}
              required
            />
            <Input
              type="text"
              placeholder="URL de Download"
              value={newItem.download_url || ''}
              onChange={e => setNewItem({...newItem, download_url: e.target.value})}
              required
            />
            <Input
              type="text"
              placeholder="Versão (ex: 1.0.0)"
              value={newItem.version || ''}
              onChange={e => setNewItem({...newItem, version: e.target.value})}
            />
            <Input
              type="text"
              placeholder="Tamanho (ex: 50MB)"
              value={newItem.size || ''}
              onChange={e => setNewItem({...newItem, size: e.target.value})}
            />
            <Select
              value={newItem.platform}
              onChange={e => setNewItem({...newItem, platform: e.target.value as any})}
            >
              <option value="Windows">Windows</option>
              <option value="Mac">Mac</option>
              <option value="Mobile">Mobile</option>
              <option value="PDF">PDF</option>
            </Select>
            <Select
              value={newItem.icon_type}
              onChange={e => setNewItem({...newItem, icon_type: e.target.value})}
            >
              <option value="monitor">Monitor (Desktop)</option>
              <option value="smartphone">Smartphone (Mobile)</option>
              <option value="file-text">Documento (PDF)</option>
              <option value="book">Ebook / Livro</option>
              <option value="trending-up">Gráfico (Indicador)</option>
              <option value="bot">Automação (Robô)</option>
              <option value="shield">Segurança (Verificado)</option>
            </Select>
            <Textarea
              placeholder="Descrição"
              className="col-span-1 md:col-span-2 h-24"
              value={newItem.description || ''}
              onChange={e => setNewItem({...newItem, description: e.target.value})}
              required
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" className="px-6">
              Salvar Recurso
            </Button>
          </div>
        </form>
      )}

      {/* Tools Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="status">
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass-card p-6 rounded-2xl space-y-4">
              <div className="flex justify-between">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <Skeleton className="h-6 w-16 rounded-lg" />
              </div>
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ))}
          <span className="sr-only">Carregando recursos...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div key={item.id} className="glass-card glass-card-hover p-6 rounded-2xl group relative">
              {isAdmin && (
                <div className="absolute top-4 right-4 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  {editingId === item.id ? (
                     <>
                      <button
                        onClick={() => saveEditing(item.id)}
                        className="p-1.5 bg-success/10 text-success-fg border border-success/20 rounded-lg hover:bg-success/20"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 bg-tint/5 text-fg-muted border border-tint/10 rounded-lg hover:bg-tint/10 hover:text-fg"
                      >
                        <X size={16} />
                      </button>
                     </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEditing(item)}
                        className="p-1.5 bg-tint/5 text-fg-muted border border-tint/10 rounded-lg hover:bg-tint/10 hover:text-fg"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 bg-danger/10 text-danger-fg border border-danger/20 rounded-lg hover:bg-danger/20"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              )}

              <div className="flex justify-between items-start mb-4">
                {editingId === item.id ? (
                   <div className="flex flex-col gap-2">
                     <div className="p-3 bg-tint/3 border border-tint/8 rounded-xl w-fit">
                       {getIcon(editValues.icon_type || item.icon_type)}
                     </div>
                     <select
                        className={`text-[10px] p-1 w-28 ${inlineField}`}
                        value={editValues.icon_type}
                        onChange={e => setEditValues({...editValues, icon_type: e.target.value})}
                      >
                        <option value="monitor">💻 Monitor</option>
                        <option value="smartphone">📱 Celular</option>
                        <option value="file-text">📄 Documento</option>
                        <option value="book">📚 Ebook</option>
                        <option value="trending-up">📈 Gráfico</option>
                        <option value="bot">🤖 Robô</option>
                        <option value="shield">✅ Seguro</option>
                        <option value="download">📥 Padrão</option>
                      </select>
                   </div>
                ) : (
                  <div className="p-3 bg-tint/3 border border-tint/8 rounded-xl group-hover:bg-accent/10 group-hover:border-accent/20 transition-colors">
                    {getIcon(item.icon_type)}
                  </div>
                )}

                {editingId === item.id ? (
                   <select
                      className={`text-xs p-1 ${inlineField}`}
                      value={editValues.platform}
                      onChange={e => setEditValues({...editValues, platform: e.target.value as any})}
                    >
                      <option value="Windows">WIN</option>
                      <option value="Mac">MAC</option>
                      <option value="Mobile">MOB</option>
                      <option value="PDF">PDF</option>
                    </select>
                ) : (
                  <span className="px-2 py-1 bg-tint/5 border border-tint/10 text-fg-muted text-[11px] font-medium rounded-lg uppercase tracking-[0.15em]">
                    {item.platform}
                  </span>
                )}
              </div>

              {editingId === item.id ? (
                <input
                  className="w-full bg-transparent font-display text-lg font-semibold text-fg mb-2 border-b border-tint/15 focus:border-accent/60 focus:outline-hidden"
                  value={editValues.title}
                  onChange={e => setEditValues({...editValues, title: e.target.value})}
                />
              ) : (
                <h3 className="font-display text-lg font-semibold text-fg mb-2 group-hover:text-accent-fg transition-colors">
                  {item.title}
                </h3>
              )}

              {editingId === item.id ? (
                <textarea
                  className={`w-full text-sm mb-6 p-2 min-h-[60px] ${inlineField}`}
                  value={editValues.description}
                  onChange={e => setEditValues({...editValues, description: e.target.value})}
                />
              ) : (
                <p className="text-fg-muted text-sm mb-6 min-h-[40px] line-clamp-2">
                  {item.description}
                </p>
              )}

              <div className="flex items-center justify-between gap-2 pt-4 border-t border-tint/6">
                 <div className="text-xs text-fg-subtle font-mono tabular-nums flex gap-2">
                   {editingId === item.id ? (
                     <div className="flex gap-1">
                        <input
                          className={`w-16 px-1 ${inlineField}`}
                          value={editValues.version || ''}
                          placeholder="v1.0"
                          onChange={e => setEditValues({...editValues, version: e.target.value})}
                        />
                        <input
                          className={`w-16 px-1 ${inlineField}`}
                          value={editValues.size || ''}
                          placeholder="Size"
                          onChange={e => setEditValues({...editValues, size: e.target.value})}
                        />
                     </div>
                   ) : (
                     <>
                      {item.version && <span>v{item.version}</span>}
                      {item.size && <span>{item.size}</span>}
                     </>
                   )}
                 </div>

                 {editingId === item.id ? (
                    <input
                      className={`text-xs px-1 w-24 ${inlineField}`}
                      value={editValues.download_url}
                      placeholder="URL..."
                      onChange={e => setEditValues({...editValues, download_url: e.target.value})}
                    />
                 ) : (
                   <a
                     href={item.download_url}
                     className="flex items-center gap-2 text-sm font-semibold text-accent-fg hover:underline underline-offset-4 rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                     target="_blank"
                     rel="noopener noreferrer"
                   >
                     Baixar
                     <Download size={16} />
                   </a>
                 )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
