import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, FileText, Smartphone, Monitor, TrendingUp, Plus, Trash2, Edit2, Check, X, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';

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
      case 'monitor': return <Monitor size={24} className="text-blue-600" />;
      case 'smartphone': return <Smartphone size={24} className="text-green-600" />;
      case 'file-text': return <FileText size={24} className="text-red-500" />;
      case 'trending-up': return <TrendingUp size={24} className="text-purple-600" />;
      case 'shield': return <Shield size={24} className="text-slate-600" />;
      default: return <Download size={24} className="text-slate-600" />;
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors group"
          >
            <ArrowLeft className="text-slate-400 group-hover:text-slate-600 transition-colors" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Download className="text-blue-600" />
              Downloads e Ferramentas
            </h1>
            <p className="text-slate-500">Recursos essenciais para sua operação.</p>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            {isAdding ? <X size={18} /> : <Plus size={18} />}
            <span>{isAdding ? 'Cancelar' : 'Novo Item'}</span>
          </button>
        )}
      </div>

      {/* Add Form */}
      {isAdding && (
        <form onSubmit={handleAddItem} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Adicionar Novo Recurso</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              placeholder="Título"
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={newItem.title || ''}
              onChange={e => setNewItem({...newItem, title: e.target.value})}
              required
            />
            <input
              type="text"
              placeholder="URL de Download"
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={newItem.download_url || ''}
              onChange={e => setNewItem({...newItem, download_url: e.target.value})}
              required
            />
            <input
              type="text"
              placeholder="Versão (ex: 1.0.0)"
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={newItem.version || ''}
              onChange={e => setNewItem({...newItem, version: e.target.value})}
            />
            <input
              type="text"
              placeholder="Tamanho (ex: 50MB)"
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={newItem.size || ''}
              onChange={e => setNewItem({...newItem, size: e.target.value})}
            />
            <select
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={newItem.platform}
              onChange={e => setNewItem({...newItem, platform: e.target.value as any})}
            >
              <option value="Windows">Windows</option>
              <option value="Mac">Mac</option>
              <option value="Mobile">Mobile</option>
              <option value="PDF">PDF</option>
            </select>
             <select
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={newItem.icon_type}
              onChange={e => setNewItem({...newItem, icon_type: e.target.value})}
            >
              <option value="monitor">Monitor (Desktop)</option>
              <option value="smartphone">Smartphone (Mobile)</option>
              <option value="file-text">Documento (PDF)</option>
              <option value="trending-up">Gráfico (Indicador)</option>
              <option value="shield">Escudo (Segurança)</option>
            </select>
            <textarea
              placeholder="Descrição"
              className="col-span-1 md:col-span-2 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24"
              value={newItem.description || ''}
              onChange={e => setNewItem({...newItem, description: e.target.value})}
              required
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Salvar Recurso
            </button>
          </div>
        </form>
      )}

      {/* Tools Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Carregando recursos...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div key={item.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative">
              {isAdmin && (
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {editingId === item.id ? (
                     <>
                      <button 
                        onClick={() => saveEditing(item.id)}
                        className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                      >
                        <Check size={16} />
                      </button>
                      <button 
                        onClick={() => setEditingId(null)}
                        className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
                      >
                        <X size={16} />
                      </button>
                     </>
                  ) : (
                    <>
                      <button 
                        onClick={() => startEditing(item)}
                        className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
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
                     <div className="p-3 bg-slate-50 rounded-xl">
                       {getIcon(editValues.icon_type || item.icon_type)}
                     </div>
                     <select
                        className="text-[10px] border rounded p-1 w-28"
                        value={editValues.icon_type}
                        onChange={e => setEditValues({...editValues, icon_type: e.target.value})}
                      >
                        <option value="monitor">💻 Monitor</option>
                        <option value="smartphone">📱 Smartphone</option>
                        <option value="file-text">📄 Documento</option>
                        <option value="trending-up">📈 Gráfico</option>
                        <option value="shield">🛡️ Escudo</option>
                        <option value="download">📥 Padrão</option>
                      </select>
                   </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-blue-50 transition-colors">
                    {getIcon(item.icon_type)}
                  </div>
                )}

                {editingId === item.id ? (
                   <select
                      className="text-xs border rounded p-1"
                      value={editValues.platform}
                      onChange={e => setEditValues({...editValues, platform: e.target.value as any})}
                    >
                      <option value="Windows">WIN</option>
                      <option value="Mac">MAC</option>
                      <option value="Mobile">MOB</option>
                      <option value="PDF">PDF</option>
                    </select>
                ) : (
                  <span className="px-2 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded-lg uppercase tracking-wide">
                    {item.platform}
                  </span>
                )}
              </div>
              
              {editingId === item.id ? (
                <input 
                  className="w-full text-lg font-bold text-slate-900 mb-2 border-b border-blue-200 focus:outline-none"
                  value={editValues.title}
                  onChange={e => setEditValues({...editValues, title: e.target.value})}
                />
              ) : (
                <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {item.title}
                </h3>
              )}

              {editingId === item.id ? (
                <textarea 
                  className="w-full text-sm text-slate-500 mb-6 border rounded p-2 min-h-[60px]"
                  value={editValues.description}
                  onChange={e => setEditValues({...editValues, description: e.target.value})}
                />
              ) : (
                <p className="text-slate-500 text-sm mb-6 min-h-[40px] line-clamp-2">
                  {item.description}
                </p>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                 <div className="text-xs text-slate-400 flex gap-2">
                   {editingId === item.id ? (
                     <div className="flex gap-1">
                        <input 
                          className="w-16 border rounded px-1" 
                          value={editValues.version || ''} 
                          placeholder="v1.0"
                          onChange={e => setEditValues({...editValues, version: e.target.value})}
                        />
                        <input 
                          className="w-16 border rounded px-1" 
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
                      className="text-xs border rounded px-1 w-24"
                      value={editValues.download_url}
                      placeholder="URL..."
                      onChange={e => setEditValues({...editValues, download_url: e.target.value})}
                    />
                 ) : (
                   <a 
                     href={item.download_url}
                     className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline"
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
