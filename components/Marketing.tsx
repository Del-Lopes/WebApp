
import React, { useState, useEffect } from 'react';
import { Download, FileText, Image as ImageIcon, Share2, Edit2, Plus, Trash2, Save, X, Eye, ArrowLeft, Calendar, Search, Mail, Phone } from 'lucide-react';
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
  const [partnerRequest, setPartnerRequest] = useState<any>(null);
  const [assets, setAssets] = useState<MarketingAsset[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'materials' | 'prospects'>('materials');
  const [viewingAsset, setViewingAsset] = useState<MarketingAsset | null>(null);

  // Prospects State
  const [prospects, setProspects] = useState<any[]>([]);
  const [editingProspectId, setEditingProspectId] = useState<string | null>(null);
  const [prospectSearchTerm, setProspectSearchTerm] = useState('');

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
       const { data: assetsData } = await supabase.from('marketing_assets').select('*').order('created_at', {ascending: false});
       if (assetsData) setAssets(assetsData as MarketingAsset[]);
       else setAssets(MOCK_ASSETS as unknown as MarketingAsset[]); 

       if (role === 'client' && user) {
           const { data: reqData } = await supabase
               .from('partner_requests')
               .select('*')
               .eq('user_id', user.id)
               .order('created_at', { ascending: false })
               .limit(1)
               .maybeSingle(); 
           setPartnerRequest(reqData);
       }

        if (user) {
            let query = supabase.from('prospects').select('*');
            
            // Se for parceiro, vê apenas os seus
            if (role === 'partner') {
                query = query.eq('partner_id', user.id);
            }
            // Se for admin, vê TODOS (incluindo os antigos sem partner_id)
            
            const { data: prospectsData } = await query.order('created_at', { ascending: false });
            if (prospectsData) setProspects(prospectsData);
        }
    } catch (error) {
        console.error("Error fetching marketing data", error);
    } finally {
        setLoading(false);
    }
  };

  const handleUpdateProspectField = async (id: string, field: string, value: any) => {
    try {
      const { error } = await supabase
        .from('prospects')
        .update({ [field]: value })
        .eq('id', id);

      if (error) throw error;
      setProspects(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    } catch (e: any) {
      alert('Erro ao atualizar: ' + e.message);
    }
  };

  const handleDeleteProspect = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este prospecto?')) return;
    try {
      const { error } = await supabase.from('prospects').delete().eq('id', id);
      if (error) throw error;
      setProspects(prev => prev.filter(p => p.id !== id));
    } catch (e: any) {
      alert('Erro ao excluir: ' + e.message);
    }
  };

  const handleAddNewProspect = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('prospects').insert({
        full_name: 'Novo Prospecto',
        email: '',
        phone: '',
        status: 'new',
        notes: '',
        partner_id: user.id
      }).select().single();

      if (error) throw error;
      setProspects([data, ...prospects]);
      setEditingProspectId(data.id);
    } catch (e: any) {
      alert('Erro ao criar: ' + e.message);
    }
  };

  const handleRequestPartner = async () => {
    if (!user) return;
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
        await fetchData();
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
              url: newAsset.url,
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

  // Lógica de Acesso Reforçada
  const isPrivileged = role === 'admin' || role === 'first_mate' || role === 'partner';
  const isApprovedPartner = partnerRequest?.status === 'approved';
  const canViewContent = isPrivileged || isApprovedPartner;

  if (loading) return <div className="p-10 text-center text-slate-500 font-bold uppercase tracking-widest animate-pulse">Carregando...</div>;

  if (viewingAsset) {
      return (
        <div className="fixed inset-0 z-50 flex flex-col bg-white animate-in slide-in-from-right duration-500">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
            <button onClick={() => setViewingAsset(null)} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-black px-5 py-2.5 rounded-2xl border border-slate-200 transition-all hover:bg-slate-50">
              <ArrowLeft size={20} /> VOLTAR
            </button>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">{viewingAsset.title}</h3>
            <div className="flex items-center gap-2">
               <a href={viewingAsset.url} download className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-green-600 transition-all flex items-center gap-2 shadow-xl shadow-slate-200 uppercase tracking-widest">
                  <Download size={18} /> Baixar
               </a>
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-slate-50/50 p-8 flex justify-center">
            <div className="max-w-5xl w-full bg-white rounded-[48px] p-16 shadow-2xl shadow-slate-200 border border-slate-100 mb-20">
               {viewingAsset.type === 'Text' ? (
                 <div className="prose prose-slate lg:prose-xl max-w-none">
                    {viewingAsset.image_url && <img src={viewingAsset.image_url} alt="" className="w-full h-[450px] object-cover rounded-[40px] mb-12 shadow-2xl" />}
                    <div className="whitespace-pre-wrap font-medium leading-relaxed text-slate-600 text-lg">
                        {viewingAsset.content}
                    </div>
                 </div>
               ) : (
                 <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                       <FileText size={64} className="text-slate-200" />
                    </div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Pré-visualização não disponível</p>
                    <a href={viewingAsset.url} target="_blank" className="mt-8 px-8 py-4 bg-green-50 text-green-700 font-black rounded-2xl hover:bg-green-100 transition-all flex items-center gap-2 uppercase tracking-widest text-xs">Abrir em nova aba <Share2 size={16} /></a>
                 </div>
               )}
            </div>
          </div>
        </div>
      );
  }

  if (!canViewContent) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-10 animate-in fade-in zoom-in duration-700">
            <div className="relative">
                <div className="absolute inset-0 bg-green-500 blur-3xl opacity-20 animate-pulse" />
                <div className="relative w-32 h-32 bg-white rounded-[40px] flex items-center justify-center text-green-600 shadow-2xl shadow-green-200/50 -rotate-6">
                    <Share2 size={56} className="animate-bounce-slow" />
                </div>
            </div>
            <div className="space-y-4">
                <h2 className="text-5xl font-black text-slate-900 tracking-tighter">Seja um Parceiro</h2>
                <p className="max-w-md mx-auto text-slate-500 font-medium text-lg leading-relaxed">
                    Desbloqueie ferramentas exclusivas de CRM, materiais de marketing premium e comece a escalar suas conversões hoje mesmo.
                </p>
            </div>
            {partnerRequest && partnerRequest.status === 'pending' ? (
                 <div className="bg-slate-900 text-white px-10 py-6 rounded-[32px] flex flex-col items-center gap-2 shadow-2xl shadow-slate-200">
                     <div className="flex items-center gap-3">
                        <span className="w-3 h-3 bg-yellow-400 rounded-full animate-ping" />
                        <span className="font-black uppercase tracking-widest text-sm">Em Análise</span>
                     </div>
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Nossa equipe está avaliando seu perfil</p>
                 </div>
            ) : (
                <button 
                  onClick={handleRequestPartner}
                  className="group bg-[#16a34a] hover:bg-green-700 text-white px-12 py-6 rounded-[32px] font-black text-xl shadow-2xl shadow-green-200 hover:shadow-green-400 transition-all transform hover:-translate-y-2 uppercase tracking-widest flex items-center gap-4"
                >
                    Solicitar Parceria 
                    <ArrowLeft size={24} className="rotate-180 group-hover:translate-x-2 transition-transform" />
                </button>
            )}
        </div>
      );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center gap-4">
        <BackButton onClick={onBack} />
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Painel do Parceiro</h2>
          <p className="text-slate-500 text-sm">Gerencie seus prospectos e materiais de marketing em um só lugar.</p>
        </div>
      </div>

      {/* Navigation Tabs - Refined Style */}
      <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('materials')}
          className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
            activeTab === 'materials'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText size={14} /> Materiais
        </button>
        <button
          onClick={() => setActiveTab('prospects')}
          className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
            activeTab === 'prospects'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Search size={14} /> Prospectos
        </button>
      </div>

      {activeTab === 'materials' ? (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {assets.map((asset) => (
              <div key={asset.id} className="group bg-white rounded-[40px] border border-slate-100 p-8 hover:shadow-2xl hover:shadow-slate-200 transition-all duration-500 flex flex-col relative overflow-hidden">
                 <div className="flex items-center justify-between mb-8">
                    <div className={`p-4 rounded-3xl shadow-sm ${
                      asset.type === 'PDF' ? 'bg-red-50 text-red-600' :
                      asset.type === 'Slide' ? 'bg-orange-50 text-orange-600' :
                      asset.type === 'Image' ? 'bg-blue-50 text-blue-600' :
                      'bg-green-50 text-green-600'
                    }`}>
                      {asset.type === 'PDF' && <FileText size={24} />}
                      {asset.type === 'Slide' && <Share2 size={24} />}
                      {asset.type === 'Image' && <ImageIcon size={24} />}
                      {asset.type === 'Text' && <FileText size={24} />}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-4 py-2 rounded-full">
                       {asset.size}
                    </span>
                 </div>
                 
                 <h3 className="text-xl font-black text-slate-900 mb-3 truncate group-hover:text-green-600 transition-colors">{asset.title}</h3>
                 <p className="text-slate-500 text-sm font-medium mb-8 line-clamp-2 leading-relaxed">
                   Material oficial para divulgação e suporte ao ecossistema Tradexperience.
                 </p>

                 <div className="mt-auto flex items-center gap-4">
                   <button 
                     onClick={() => setViewingAsset(asset)}
                     className="flex-1 bg-slate-50 text-slate-900 font-black py-4 rounded-2xl text-xs hover:bg-slate-100 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                   >
                     <Eye size={16} /> Visualizar
                   </button>
                   <a 
                     href={asset.url} 
                     download 
                     className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-green-600 transition-all shadow-lg shadow-slate-200"
                   >
                     <Download size={20} />
                   </a>
                 </div>
                 
                 {(role === 'admin' || role === 'first_mate') && (
                    <button 
                       onClick={() => handleDeleteAsset(asset.id)}
                       className="absolute top-6 right-6 p-2 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                       <Trash2 size={18} />
                    </button>
                 )}
              </div>
            ))}
          </div>

          {(role === 'admin' || role === 'first_mate') && (
            <div 
              className="p-12 border-4 border-dashed border-slate-100 rounded-[48px] flex flex-col items-center justify-center text-center hover:border-green-500 hover:bg-green-50/20 transition-all cursor-pointer group" 
              onClick={() => setShowAddModal(true)}
            >
              <div className="w-20 h-20 bg-white rounded-full shadow-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Plus size={40} className="text-green-600" />
              </div>
              <h4 className="text-xl font-black text-slate-900">Novo Material</h4>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">Adicionar PDF, Imagem ou Artigo</p>
            </div>
          )}
        </div>
      ) : (
        /* PROSPECTS VIEW - Match AdminPanel Inline Table Style */
        <div className="bg-white rounded-[40px] shadow-2xl shadow-slate-100 border border-slate-100 overflow-hidden animate-in slide-in-from-bottom duration-500">
          <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-6 bg-[#f8fafc]/30">
            <h3 className="text-lg font-black text-slate-900 shrink-0">Lista de Prospectos</h3>
            <div className="relative flex-1 w-full max-w-xl">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="text"
                placeholder="Buscar por nome, email ou telefone..."
                className="w-full pl-14 pr-6 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:border-green-500 font-medium text-sm transition-all shadow-sm"
                value={prospectSearchTerm}
                onChange={(e) => setProspectSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={handleAddNewProspect}
              className="flex items-center gap-2 px-6 py-3.5 bg-[#16a34a] text-white rounded-2xl hover:bg-green-700 text-sm font-black transition-all shadow-lg shadow-green-100 uppercase tracking-widest"
            >
              <Plus size={18} /> Novo
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f8fafc] text-slate-400 border-b border-slate-100 uppercase text-[10px] font-black tracking-[0.2em]">
                <tr>
                  <th className="px-8 py-5 w-[25%] font-black">Prospecto</th>
                  <th className="px-8 py-5 w-[20%] font-black">Contato</th>
                  <th className="px-8 py-5 w-[15%] font-black">Responsável</th>
                  <th className="px-8 py-5 w-[12%] font-black">Status</th>
                  <th className="px-8 py-5 w-[20%] font-black">Anotações</th>
                  <th className="px-8 py-5 text-right w-[8%] font-black pr-12">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {prospects.filter(p => {
                  const term = prospectSearchTerm.toLowerCase();
                  return (p.full_name?.toLowerCase().includes(term) || p.email?.toLowerCase().includes(term) || p.phone?.includes(term));
                }).map(prospect => (
                  <tr key={prospect.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6 align-top">
                      {editingProspectId === prospect.id ? (
                        <input 
                          autoFocus 
                          className="w-full border-2 border-green-200 rounded-xl px-4 py-2 outline-none font-bold bg-white shadow-inner" 
                          defaultValue={prospect.full_name} 
                          onBlur={(e) => {
                            handleUpdateProspectField(prospect.id, 'full_name', e.target.value);
                          }}
                        />
                      ) : (
                        <div>
                          <div className="font-black text-slate-900 text-base">{prospect.full_name}</div>
                          <div className="text-[10px] text-slate-400 mt-1 uppercase font-black tracking-widest">ID: {prospect.id.slice(0, 8)}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-6 align-top">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3 text-slate-600">
                          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                            <Mail size={14} />
                          </div>
                          {editingProspectId === prospect.id ? (
                            <input 
                              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-green-500" 
                              defaultValue={prospect.email} 
                              onBlur={(e) => handleUpdateProspectField(prospect.id, 'email', e.target.value)} 
                            />
                          ) : (
                            <span className="truncate font-bold text-slate-700">{prospect.email || '—'}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-slate-600">
                          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                            <Phone size={14} />
                          </div>
                          {editingProspectId === prospect.id ? (
                            <input 
                              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-green-500" 
                              defaultValue={prospect.phone} 
                              onBlur={(e) => handleUpdateProspectField(prospect.id, 'phone', e.target.value)} 
                            />
                          ) : (
                            <span className="font-bold text-slate-700">{prospect.phone || '—'}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 align-top">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-green-50 rounded-full flex items-center justify-center text-green-600">
                           <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                        </div>
                        <span className="font-black text-[10px] text-slate-700 uppercase tracking-tighter">Eu (Parceiro)</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 align-top">
                      <select 
                        value={prospect.status}
                        onChange={(e) => handleUpdateProspectField(prospect.id, 'status', e.target.value)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all outline-none cursor-pointer appearance-none text-center min-w-[130px] ${
                          prospect.status === 'new' ? 'bg-blue-50 text-blue-700 border-blue-100 hover:border-blue-300' :
                          prospect.status === 'contacted' ? 'bg-orange-50 text-orange-700 border-orange-100 hover:border-orange-300' :
                          prospect.status === 'negotiating' ? 'bg-purple-50 text-purple-700 border-purple-100 hover:border-purple-300' :
                          prospect.status === 'converted' ? 'bg-green-50 text-green-700 border-green-100 hover:border-green-300' :
                          'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <option value="new">Novo Lead</option>
                        <option value="contacted">Contatado</option>
                        <option value="negotiating">Negociando</option>
                        <option value="converted">Convertido</option>
                        <option value="lost">Perdido</option>
                      </select>
                    </td>
                    <td className="px-8 py-6 align-top">
                      {editingProspectId === prospect.id ? (
                        <textarea 
                          className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-xs outline-none focus:border-green-500 bg-white min-h-[100px] font-medium leading-relaxed" 
                          defaultValue={prospect.notes} 
                          onBlur={(e) => handleUpdateProspectField(prospect.id, 'notes', e.target.value)}
                        />
                      ) : (
                        <div className="text-slate-500 text-xs line-clamp-4 leading-relaxed font-medium italic bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
                          {prospect.notes || 'Clique no lápis para adicionar anotações...'}
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right align-top pr-12">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                        <button 
                          onClick={() => setEditingProspectId(editingProspectId === prospect.id ? null : prospect.id)}
                          className={`p-3 rounded-2xl transition-all shadow-sm ${
                            editingProspectId === prospect.id ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-white text-slate-400 hover:text-blue-600 hover:shadow-lg'
                          }`}
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteProspect(prospect.id)}
                          className="p-3 bg-white text-slate-400 hover:text-red-600 rounded-2xl transition-all hover:shadow-lg shadow-sm"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {prospects.length === 0 && (
            <div className="p-20 text-center flex flex-col items-center justify-center">
               <div className="w-24 h-24 bg-slate-50 rounded-[40px] flex items-center justify-center text-slate-200 mb-6">
                 <Search size={48} />
               </div>
               <h4 className="text-2xl font-black text-slate-900 tracking-tight">Vazio por aqui</h4>
               <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">Comece a cadastrar seus leads de marketing agora</p>
            </div>
          )}
        </div>
      )}

      {/* Add Asset Modal */}
      {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto animate-in fade-in">
              <div className="bg-white rounded-[48px] p-12 max-w-2xl w-full shadow-3xl relative animate-in zoom-in-95 duration-300">
                  <button onClick={() => setShowAddModal(false)} className="absolute top-10 right-10 p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all">
                      <X size={28} />
                  </button>
                  <div className="mb-10">
                      <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Novo Material</h3>
                      <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2">Área Administrativa</p>
                  </div>
                  <form onSubmit={handleAddAsset} className="space-y-8">
                      <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2">Título do Material</label>
                          <input 
                            type="text" 
                            required 
                            className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-[28px] outline-none font-bold focus:border-green-500 focus:bg-white transition-all text-lg"
                            value={newAsset.title}
                            onChange={e => setNewAsset({...newAsset, title: e.target.value})}
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2">Tipo de Mídia</label>
                            <select 
                              className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-[28px] outline-none font-black appearance-none focus:border-green-500 focus:bg-white transition-all text-sm uppercase tracking-widest"
                              value={newAsset.type}
                              onChange={e => setNewAsset({...newAsset, type: e.target.value as any})}
                            >
                                <option value="PDF">PDF</option>
                                <option value="Image">Imagem</option>
                                <option value="Slide">Slide/Marketing</option>
                                <option value="Text">Texto/Artigo</option>
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2">Tamanho / Info</label>
                            <input 
                              type="text" 
                              placeholder="Ex: 5 MB"
                               className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-[28px] outline-none font-bold focus:border-green-500 focus:bg-white transition-all text-lg"
                              value={newAsset.size}
                              onChange={e => setNewAsset({...newAsset, size: e.target.value})}
                            />
                        </div>
                      </div>

                      {newAsset.type === 'Text' ? (
                          <>
                             <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2">URL da Capa (Opcional)</label>
                                <input 
                                  type="text" 
                                  placeholder="https://..."
                                  className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-[28px] outline-none font-bold focus:border-green-500 focus:bg-white transition-all"
                                  value={newAsset.image_url}
                                  onChange={e => setNewAsset({...newAsset, image_url: e.target.value})}
                                />
                             </div>
                             <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2">Conteúdo Completo</label>
                                <textarea 
                                  required 
                                  rows={6}
                                  className="w-full px-8 py-8 bg-slate-50 border-2 border-slate-100 rounded-[40px] outline-none font-bold resize-none focus:border-green-500 focus:bg-white transition-all leading-relaxed"
                                  placeholder="Escreva seu artigo aqui..."
                                  value={newAsset.content}
                                  onChange={e => setNewAsset({...newAsset, content: e.target.value})}
                                />
                             </div>
                          </>
                      ) : (
                          <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2">Link Direto do Arquivo</label>
                              <input 
                                type="text" 
                                required 
                                placeholder="https://..."
                                className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-[28px] outline-none font-bold focus:border-green-500 focus:bg-white transition-all"
                                value={newAsset.url}
                                onChange={e => setNewAsset({...newAsset, url: e.target.value})}
                              />
                          </div>
                      )}

                      <button type="submit" className="w-full bg-slate-900 text-white font-black py-8 rounded-[36px] hover:bg-green-600 transition-all shadow-2xl shadow-slate-200 uppercase tracking-[0.3em] text-sm mt-4">
                          ADICIONAR MATERIAL
                      </button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};