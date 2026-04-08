
import React, { useState, useEffect } from 'react';
import { Download, FileText, Image as ImageIcon, Share2, Edit2, Plus, Trash2, Save, X, Eye, ArrowLeft, Calendar, Search } from 'lucide-react';
import { MOCK_ASSETS } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { MarketingAsset } from '../types';


import { BackButton } from './BackButton';

interface MarketingProps {
  onBack?: () => void;
}

export const Marketing: React.FC<MarketingProps> = ({ onBack }) => {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [partnerRequest, setPartnerRequest] = useState<any>(null); // State for the request
  const [assets, setAssets] = useState<MarketingAsset[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // View Modal State (Full Page Mode)
  const [viewingAsset, setViewingAsset] = useState<MarketingAsset | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'materials' | 'prospects'>('materials');

  // Prospects State
  const [prospects, setProspects] = useState<any[]>([]);
  const [isProspectModalOpen, setIsProspectModalOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<any>(null);
  const [prospectSearchTerm, setProspectSearchTerm] = useState('');
  const [prospectForm, setProspectForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    status: 'new',
    notes: ''
  });

  // New Asset Form State
  const [newAsset, setNewAsset] = useState<{
      title: string; 
      type: 'PDF' | 'Slide' | 'Image' | 'Text'; 
      url: string; 
      size: string;
      content: string;
      image_url: string;
  }>({
      title: '', type: 'PDF', url: '', size: '15 MB', content: '', image_url: ''
  });

  useEffect(() => {
    fetchData();
  }, [user, role]);

  const fetchData = async () => {
    setLoading(true);
    try {
       // 1. Fetch Assets
       const { data: assetsData } = await supabase.from('marketing_assets').select('*').order('created_at', {ascending: false});
       if (assetsData) setAssets(assetsData as MarketingAsset[]);
       else setAssets(MOCK_ASSETS as unknown as MarketingAsset[]); // Fallback to mock if DB empty/fails

       // 2. Fetch Partner Request if Client
       if (role === 'client' && user) {
           const { data: reqData } = await supabase
               .from('partner_requests')
               .select('*')
               .eq('user_id', user.id)
               .order('created_at', { ascending: false }) // Get the absolute latest request
               .limit(1)
               .maybeSingle(); 
           setPartnerRequest(reqData);
       }

       // 3. Fetch Prospects
       if (user) {
           const { data: prospectsData } = await supabase
               .from('prospects')
               .select('*')
               .eq('partner_id', user.id)
               .order('created_at', { ascending: false });
           if (prospectsData) setProspects(prospectsData);
       }
    } catch (error) {
        console.error("Error fetching marketing data", error);
    } finally {
        setLoading(false);
    }
  };

  const handleRequestPartner = async () => {
    if (!user) return;
    
    // Safety check: Don't allow if already pending (though UI hides button)
    if (partnerRequest && partnerRequest.status === 'pending') {
        alert("Você já tem uma solicitação em análise.");
        return;
    }

    try {
        const { error } = await supabase.from('partner_requests').insert({
            user_id: user.id,
            status: 'pending'
        });
        if (error) throw error;
        await fetchData(); // Refresh state immediately
    } catch (e: any) {
        alert("Erro ao solicitar: " + e.message);
    }
  };

  const handleAddAsset = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          const { error } = await supabase.from('marketing_assets').insert([{
              title: newAsset.title,
              type: newAsset.type,
              url: newAsset.url, // Ensure pure URL
              size: newAsset.type === 'Text' ? 'Online' : newAsset.size,
              content: newAsset.content,
              image_url: newAsset.image_url
          }]);
          if (error) throw error;
          setShowAddModal(false);
          setNewAsset({ title: '', type: 'PDF', url: '', size: '10 MB', content: '', image_url: '' });
          fetchData();
      } catch (e: any) {
          alert("Erro ao adicionar material: " + e.message);
      }
  };

  const handleDeleteAsset = async (id: string) => {
      if(!window.confirm("Excluir este material?")) return;
      try {
          await supabase.from('marketing_assets').delete().eq('id', id);
          fetchData();
      } catch (e) {
          console.error(e);
      }
  };

  const handleSaveProspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
        const data = {
            ...prospectForm,
            partner_id: user.id
        };

        if (editingProspect) {
            const { error } = await supabase
                .from('prospects')
                .update(data)
                .eq('id', editingProspect.id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('prospects')
                .insert([data]);
            if (error) throw error;
        }

        setIsProspectModalOpen(false);
        setEditingProspect(null);
        setProspectForm({ full_name: '', email: '', phone: '', status: 'new', notes: '' });
        fetchData();
    } catch (error: any) {
        alert("Erro ao salvar prospecto: " + error.message);
    }
  };

  const handleDeleteProspect = async (id: string) => {
    if (!window.confirm("Certeza que deseja excluir este prospecto?")) return;
    try {
        const { error } = await supabase.from('prospects').delete().eq('id', id);
        if (error) throw error;
        fetchData();
    } catch (error: any) {
        alert("Erro ao excluir: " + error.message);
    }
  };

  const handleAssetClick = (asset: MarketingAsset) => {
      if (asset.type === 'Text') {
          setViewingAsset(asset);
      } else {
          window.open(asset.url, '_blank');
      }
  };

  // Render Logic
  // First Mate includes Partner privileges
  const canViewContent = role === 'admin' || role === 'first_mate' || role === 'partner' || (partnerRequest?.status === 'approved');

  if (loading) return <div className="p-10 text-center text-slate-500">Carregando...</div>;

  // Full Page Article View
  if (viewingAsset) {
      return (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
             <div className="flex items-center gap-4 mb-6">
                 <button 
                     onClick={() => setViewingAsset(null)}
                     className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-green-600 transition-colors"
                 >
                     <ArrowLeft size={24} />
                 </button>
                 <span className="font-semibold text-slate-500">Voltar para Materiais</span>
             </div>

             <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden max-w-4xl mx-auto">
                 {viewingAsset.image_url && (
                     <div className="w-full h-80 bg-slate-100">
                         <img src={viewingAsset.image_url} alt={viewingAsset.title} className="w-full h-full object-cover" />
                     </div>
                 )}
                 
                 <div className="p-8 md:p-12">
                     <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wide mb-4">
                         Artigo Oficial
                     </span>
                     <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 leading-tight">{viewingAsset.title}</h1>
                     
                     <div className="prose prose-lg prose-slate max-w-none">
                         <div className="whitespace-pre-wrap leading-relaxed text-slate-600">
                             {viewingAsset.content}
                         </div>
                     </div>
                 </div>
             </div>
          </div>
      );
  }

  if (!canViewContent) {
      // Client View: CTA or Status
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-2">
                <Share2 size={40} />
            </div>
            <h2 className="text-3xl font-bold text-slate-900">Seja um Parceiro Trader AFK</h2>
            <p className="max-w-md text-slate-600">
                Torne-se um parceiro oficial e tenha acesso a materiais de marketing exclusivos, suporte dedicado e comissões especiais.
            </p>

            {partnerRequest && partnerRequest.status === 'pending' ? (
                 <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-6 py-4 rounded-xl flex items-center gap-3">
                     <span className="font-bold">Status:</span>
                     Em Análise
                     <span className="animate-pulse">...</span>
                 </div>
            ) : (
                <button 
                  onClick={handleRequestPartner}
                  className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-xl font-bold text-lg shadow-lg hover:shadow-green-500/30 transition-all transform hover:-translate-y-1"
                >
                    Solicitar Parceria
                </button>
            )}
        </div>
      );
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 p-8 opacity-10 text-green-500">
          <Share2 size={120} />
        </div>
        <div className="relative z-10 max-w-xl">
           <div className="flex items-center gap-4 mb-2">
              {onBack && (
                  <button onClick={onBack} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-green-400 transition-colors">
                      <ArrowLeft size={24} />
                  </button>
              )}
              <h2 className="text-2xl font-bold text-white mb-0">
                {(role === 'partner' || role === 'first_mate' || (role === 'client' && partnerRequest?.status === 'approved')) ? 'Painel do Parceiro' : 'Central de Marketing'}
              </h2>
           </div>
          <p className="text-slate-300 mb-6">Baixe materiais oficiais para promover a plataforma e expandir sua rede de afiliados.</p>
          <div className="flex flex-wrap gap-4">
            <button className="bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-green-900/30 border border-green-500/50">
              Copiar Link de Afiliado
            </button>
            <div className="flex bg-slate-800 rounded-lg p-1">
                <button 
                  onClick={() => setActiveTab('materials')}
                  className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'materials' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
                >
                    Materiais
                </button>
                <button 
                  onClick={() => setActiveTab('prospects')}
                  className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'prospects' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
                >
                    Meus Prospectos
                </button>
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'materials' ? (
        <>
          <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Materiais Disponíveis</h3>
              {(role === 'admin' || role === 'first_mate') && (
                  <button 
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 text-sm font-medium text-green-600 hover:bg-green-50 px-3 py-2 rounded-lg transition-colors"
                  >
                      <Plus size={18} /> Adicionar Material
                  </button>
              )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {assets.map((asset) => (
              <div 
                 key={asset.id} 
                 onClick={() => handleAssetClick(asset)}
                 className={`flex items-center justify-between p-5 bg-white border border-slate-200 rounded-xl hover:border-green-500/30 hover:shadow-md transition-all group shadow-sm ${asset.type === 'Text' ? 'cursor-pointer' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
                    asset.type === 'PDF' ? 'bg-red-50 text-red-500' : 
                    asset.type === 'Slide' ? 'bg-orange-50 text-orange-500' :
                    asset.type === 'Text' ? 'bg-blue-50 text-blue-500 group-hover:bg-blue-100' :
                    'bg-purple-50 text-purple-500'
                  }`}>
                    {asset.type === 'PDF' ? <FileText size={24} /> : 
                     asset.type === 'Image' ? <ImageIcon size={24} /> : 
                     asset.type === 'Text' ? <FileText size={24} /> : <Share2 size={24} />}
                  </div>
                  <div>
                    <h4 className="text-slate-900 font-medium group-hover:text-green-600 transition-colors">{asset.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <span className="font-semibold">{asset.type === 'Text' ? 'Artigo/Texto' : asset.type}</span>
                      <span>•</span>
                      <span>{asset.size}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => {
                          e.stopPropagation();
                          handleAssetClick(asset);
                      }}
                      className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all" 
                      title={asset.type === 'Text' ? 'Ler Artigo' : 'Download / Visualizar'}
                    >
                      {asset.type === 'Text' ? <Eye size={20} /> : <Download size={20} />}
                    </button>
                    {(role === 'admin' || role === 'first_mate') && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAsset(asset.id);
                            }}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                            <Trash2 size={20} />
                        </button>
                    )}
                </div>
              </div>
            ))}
            {assets.length === 0 && <p className="text-slate-400 text-center py-6">Nenhum material disponível ainda.</p>}
          </div>
        </>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-500">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                      <h3 className="text-xl font-black text-slate-900">Meus Prospectos</h3>
                      <p className="text-sm text-slate-500">Gerencie seus potenciais clientes e acompanhe o funil de vendas.</p>
                  </div>
                  <button 
                    onClick={() => {
                        setEditingProspect(null);
                        setProspectForm({ full_name: '', email: '', phone: '', status: 'new', notes: '' });
                        setIsProspectModalOpen(true);
                    }}
                    className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black hover:bg-green-600 transition-all shadow-xl shadow-slate-200"
                  >
                      <Plus size={20} /> Novo Prospecto
                  </button>
             </div>

             <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                 <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                     <Search size={20} className="text-slate-400" />
                     <input 
                        type="text" 
                        placeholder="Buscar prospectos..."
                        className="flex-1 outline-none text-sm font-medium"
                        value={prospectSearchTerm}
                        onChange={e => setProspectSearchTerm(e.target.value)}
                     />
                 </div>

                 <div className="overflow-x-auto">
                     <table className="w-full text-left text-sm">
                         <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase text-[10px] font-black tracking-widest">
                             <tr>
                                 <th className="px-6 py-4">Nome</th>
                                 <th className="px-6 py-4">Contato</th>
                                 <th className="px-6 py-4">Status</th>
                                 <th className="px-6 py-4">Data</th>
                                 <th className="px-6 py-4 text-right px-10">Ações</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                             {prospects.filter(p => p.full_name?.toLowerCase().includes(prospectSearchTerm.toLowerCase())).map(p => (
                                 <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                                     <td className="px-6 py-4">
                                         <div className="font-bold text-slate-900">{p.full_name}</div>
                                         <div className="text-[10px] text-slate-400 font-medium line-clamp-1">{p.notes || 'Sem observações'}</div>
                                     </td>
                                     <td className="px-6 py-4">
                                         <div className="text-slate-600 font-medium">{p.email}</div>
                                         <div className="text-[11px] text-slate-400">{p.phone}</div>
                                     </td>
                                     <td className="px-6 py-4">
                                         <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                            p.status === 'converted' ? 'bg-green-100 text-green-700' :
                                            p.status === 'lost' ? 'bg-red-100 text-red-700' :
                                            p.status === 'negotiating' ? 'bg-blue-100 text-blue-700' :
                                            p.status === 'contacted' ? 'bg-orange-100 text-orange-700' :
                                            'bg-slate-100 text-slate-600'
                                         }`}>
                                             {p.status}
                                         </span>
                                     </td>
                                     <td className="px-6 py-4 text-slate-400 text-xs">
                                         {new Date(p.created_at).toLocaleDateString()}
                                     </td>
                                     <td className="px-6 py-4 text-right">
                                         <div className="flex justify-end gap-2 px-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                             <button 
                                                onClick={() => {
                                                    setEditingProspect(p);
                                                    setProspectForm({
                                                        full_name: p.full_name,
                                                        email: p.email,
                                                        phone: p.phone,
                                                        status: p.status,
                                                        notes: p.notes || ''
                                                    });
                                                    setIsProspectModalOpen(true);
                                                }}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl shadow-sm transition-all"
                                             >
                                                 <Edit2 size={18} />
                                             </button>
                                             <button 
                                                onClick={() => handleDeleteProspect(p.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-xl shadow-sm transition-all"
                                             >
                                                 <Trash2 size={18} />
                                             </button>
                                         </div>
                                     </td>
                                 </tr>
                             ))}
                             {prospects.length === 0 && (
                                 <tr>
                                     <td colSpan={5} className="px-6 py-20 text-center text-slate-400 italic">Nenhum prospecto cadastrado.</td>
                                 </tr>
                             )}
                         </tbody>
                     </table>
                 </div>
             </div>
        </div>
      )}

      {/* Prospect Modal */}
      {isProspectModalOpen && (
           <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white w-full max-w-lg rounded-[48px] shadow-3xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <div>
                          <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{editingProspect ? 'Editar Prospecto' : 'Novo Prospecto'}</h3>
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Preencha os dados do lead</p>
                      </div>
                      <button onClick={() => setIsProspectModalOpen(false)} className="p-3 hover:bg-white rounded-2xl transition-all shadow-sm"><X size={24} className="text-slate-400" /></button>
                  </div>
                  
                  <form onSubmit={handleSaveProspect} className="p-10 space-y-6 overflow-y-auto">
                      <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nome Completo</label>
                          <input 
                            type="text" 
                            required 
                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold focus:border-green-500 transition-all"
                            value={prospectForm.full_name}
                            onChange={e => setProspectForm({...prospectForm, full_name: e.target.value})}
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Email</label>
                              <input 
                                type="email" 
                                required 
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold focus:border-green-500 transition-all"
                                value={prospectForm.email}
                                onChange={e => setProspectForm({...prospectForm, email: e.target.value})}
                              />
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">WhatsApp / Telefone</label>
                              <input 
                                type="text" 
                                required 
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold focus:border-green-500 transition-all"
                                value={prospectForm.phone}
                                onChange={e => setProspectForm({...prospectForm, phone: e.target.value})}
                              />
                          </div>
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Status Inicial</label>
                          <select 
                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-black appearance-none"
                            value={prospectForm.status}
                            onChange={e => setProspectForm({...prospectForm, status: e.target.value as any})}
                          >
                              <option value="new">Novo Lead</option>
                              <option value="contacted">Contatado</option>
                              <option value="negotiating">Em Negociação</option>
                              <option value="converted">Convertido / Venda</option>
                              <option value="lost">Perdido</option>
                          </select>
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Observações</label>
                          <textarea 
                            rows={4}
                            className="w-full px-6 py-6 bg-slate-50 border border-slate-200 rounded-3xl outline-none font-bold resize-none focus:border-green-500 transition-all"
                            value={prospectForm.notes}
                            onChange={e => setProspectForm({...prospectForm, notes: e.target.value})}
                          />
                      </div>
                      <button type="submit" className="w-full bg-slate-900 text-white font-black py-6 rounded-[28px] hover:bg-green-600 transition-all shadow-xl shadow-slate-200 uppercase tracking-widest">
                          {editingProspect ? 'Salvar Alterações' : 'Cadastrar Prospecto'}
                      </button>
                  </form>
              </div>
           </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
              <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl my-8">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold">Novo Material</h3>
                      <button onClick={() => setShowAddModal(false)}><X size={24} className="text-slate-400" /></button>
                  </div>
                  <form onSubmit={handleAddAsset} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium mb-1">Título</label>
                          <input 
                            type="text" 
                            required 
                            className="w-full border rounded-lg px-3 py-2"
                            value={newAsset.title}
                            onChange={e => setNewAsset({...newAsset, title: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium mb-1">Tipo</label>
                          <select 
                            className="w-full border rounded-lg px-3 py-2"
                            value={newAsset.type}
                            onChange={e => setNewAsset({...newAsset, type: e.target.value as any})}
                          >
                              <option value="PDF">PDF</option>
                              <option value="Image">Imagem</option>
                              <option value="Slide">Slide/Marketing</option>
                              <option value="Text">Texto/Artigo</option>
                          </select>
                      </div>

                      {newAsset.type === 'Text' ? (
                          <>
                             <div>
                                <label className="block text-sm font-medium mb-1">URL da Imagem de Capa (Opcional)</label>
                                <input 
                                  type="text" 
                                  placeholder="https://..."
                                  className="w-full border rounded-lg px-3 py-2"
                                  value={newAsset.image_url}
                                  onChange={e => setNewAsset({...newAsset, image_url: e.target.value})}
                                />
                             </div>
                             <div>
                                <label className="block text-sm font-medium mb-1">Conteúdo do Texto</label>
                                <textarea 
                                  required 
                                  rows={6}
                                  className="w-full border rounded-lg px-3 py-2"
                                  placeholder="Escreva o conteúdo aqui..."
                                  value={newAsset.content}
                                  onChange={e => setNewAsset({...newAsset, content: e.target.value})}
                                />
                             </div>
                          </>
                      ) : (
                          <>
                            <div>
                                <label className="block text-sm font-medium mb-1">URL do Arquivo</label>
                                <input 
                                  type="text" 
                                  required 
                                  placeholder="https://..."
                                  className="w-full border rounded-lg px-3 py-2"
                                  value={newAsset.url}
                                  onChange={e => setNewAsset({...newAsset, url: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Tamanho (Texto)</label>
                                <input 
                                  type="text" 
                                  placeholder="Ex: 5 MB"
                                  className="w-full border rounded-lg px-3 py-2"
                                  value={newAsset.size}
                                  onChange={e => setNewAsset({...newAsset, size: e.target.value})}
                                />
                            </div>
                          </>
                      )}

                      <button type="submit" className="w-full bg-green-600 text-white py-2.5 rounded-lg font-bold hover:bg-green-500">
                          Adicionar
                      </button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};