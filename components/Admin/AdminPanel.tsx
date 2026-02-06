
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { LicenseRequest, PartnerRequest, Profile, Prospect } from '../../types';
import { CheckCircle, XCircle, Users, Activity, User, Search, Phone, Mail, FileText, MessageCircle, Plus } from 'lucide-react';
import { BackButton } from '../BackButton';

interface AdminPanelProps {
  onBack?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'licenses' | 'partners' | 'prospects' | 'users'>('licenses');
  const [licenses, setLicenses] = useState<LicenseRequest[]>([]);
  const [partners, setPartners] = useState<PartnerRequest[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editingProspect, setEditingProspect] = useState<string | null>(null);

  const handleUpdateField = async (id: string, field: keyof Prospect, value: string) => {
      // Optimistic Update
      setProspects(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
      
      // Debounced/Direct DB update logic could go here, but for now we update single interactions or on blur
      // However, a better approach for UX is "save on edit" or individual field save
      // Given the requirement is just "edit fields", we'll update DB directly on change (debounced ideally) or just simple update:
      
      try {
          await supabase.from('prospects').update({ [field]: value }).eq('id', id);
      } catch (err) {
          console.error(err);
      }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      if (activeTab === 'licenses') {
        const { data, error } = await supabase
          .from('license_requests')
          .select('*, profiles:user_id (full_name, email)') 
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setLicenses(data as unknown as LicenseRequest[] || []);
      } else if (activeTab === 'partners') {
        const { data, error } = await supabase
          .from('partner_requests')
          .select('*, profiles(full_name, email)')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPartners(data as unknown as PartnerRequest[] || []);
      } else if (activeTab === 'users') {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setUsers(data as Profile[] || []);
      } else {
        // Prospects
        const { data, error } = await supabase
          .from('prospects')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setProspects(data as Prospect[] || []);
      }
    } catch (error: any) {
      console.error('Error fetching admin data:', error);
      setErrorMsg(error.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleLicenseAction = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await supabase.from('license_requests').update({ status }).eq('id', id);
      fetchData(); // Refresh
    } catch (error) {
      console.error('Error updating license:', error);
    }
  };

  const handlePartnerAction = async (request: PartnerRequest, status: 'approved' | 'rejected') => {
      try {
          // Update request status
          const { error: reqError } = await supabase
            .from('partner_requests')
            .update({ status })
            .eq('id', request.id);
          
          if (reqError) throw reqError;

          // If approved, update user role
          if (status === 'approved') {
              const { error: roleError } = await supabase
                .from('profiles')
                .update({ role: 'partner' })
                .eq('id', request.user_id);
              
              if (roleError) throw roleError;
          }

          fetchData();
      } catch (error: any) {
          console.error("Error updating partner:", error);
          alert("Erro: " + error.message);
      }
  };

  const handleProspectStatus = async (id: string, status: Prospect['status']) => {
    try {
      const { error } = await supabase
        .from('prospects')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      
      // Optimistic update
      setProspects(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    } catch (error: any) {
      alert('Erro ao atualizar status: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          {onBack && <BackButton onClick={onBack} />}
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Painel Administrativo</h2>
            <p className="text-slate-500 text-sm">Gerencie usuários, licenças e conteúdo.</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('licenses')}
          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'licenses' ? 'border-green-600 text-green-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Licenças
        </button>
        <button
          onClick={() => setActiveTab('partners')}
          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'partners' ? 'border-green-600 text-green-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Parceiros
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'users' ? 'border-green-600 text-green-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Usuários
        </button>
        <button
          onClick={() => setActiveTab('prospects')}
          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'prospects' ? 'border-green-600 text-green-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Prospectos
        </button>
      </div>

      {(activeTab === 'partners' || activeTab === 'users' || activeTab === 'prospects') && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome, email ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
          />
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {errorMsg && (
          <div className="p-4 bg-red-50 text-red-600 border-b border-red-100 text-sm">
            Erro: {errorMsg}
          </div>
        )}
        {loading ? (
            <div className="p-8 text-center text-slate-500">Carregando dados...</div>
        ) : activeTab === 'licenses' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-medium">Usuário</th>
                  <th className="px-6 py-4 font-medium">Conta MT5</th>
                  <th className="px-6 py-4 font-medium">Data</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {licenses.map((lic) => (
                  <tr key={lic.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">
                            {/* @ts-ignore: join profile data */}
                            {lic.profiles?.full_name || 'Usuário'}
                        </div>
                        <div className="text-xs text-slate-400">
                            {/* @ts-ignore */}
                            {lic.profiles?.email}
                        </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600">{lic.mt5_account}</td>
                    <td className="px-6 py-4 text-slate-500">{new Date(lic.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize border ${
                        lic.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200' :
                        lic.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                        'bg-yellow-100 text-yellow-700 border-yellow-200'
                      }`}>
                        {lic.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {lic.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleLicenseAction(lic.id, 'approved')}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Aprovar">
                            <CheckCircle size={18} />
                          </button>
                          <button 
                            onClick={() => handleLicenseAction(lic.id, 'rejected')}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Rejeitar">
                            <XCircle size={18} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {licenses.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Nenhuma solicitação encontrada.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'partners' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-medium">Usuário</th>
                  <th className="px-6 py-4 font-medium">Data</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {partners.filter(req => {
                  if (!searchTerm) return true;
                  const searchLower = searchTerm.toLowerCase();
                  const name = req.profiles?.full_name?.toLowerCase() || '';
                  const email = req.profiles?.email?.toLowerCase() || '';
                  return name.includes(searchLower) || email.includes(searchLower);
                }).map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">
                            {/* @ts-ignore */}
                            {req.profiles?.full_name || 'Usuário'}
                        </div>
                        <div className="text-xs text-slate-400">
                            {/* @ts-ignore */}
                            {req.profiles?.email}
                        </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{new Date(req.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize border ${
                        req.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200' :
                        req.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                        'bg-yellow-100 text-yellow-700 border-yellow-200'
                      }`}>
                         {req.status === 'pending' ? 'Solicitado' : req.status === 'approved' ? 'Parceiro' : req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {req.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handlePartnerAction(req, 'approved')}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Aprovar e Tornar Parceiro">
                            <CheckCircle size={18} />
                          </button>
                          <button 
                            onClick={() => handlePartnerAction(req, 'rejected')}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Rejeitar">
                            <XCircle size={18} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {partners.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Nenhuma solicitação de parceria.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'users' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-medium">Nome</th>
                  <th className="px-6 py-4 font-medium">Email</th>
                  <th className="px-6 py-4 font-medium">Data de Cadastro</th>
                  <th className="px-6 py-4 font-medium">Função</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.filter(user => {
                  if (!searchTerm) return true;
                  const searchLower = searchTerm.toLowerCase();
                  const name = user.full_name?.toLowerCase() || '';
                  const email = user.email?.toLowerCase() || '';
                  return name.includes(searchLower) || email.includes(searchLower);
                }).map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                            <User size={16} />
                         </div>
                         {user.full_name || 'Sem nome'}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{user.email}</td>
                    <td className="px-6 py-4 text-slate-500">{new Date(user.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase border ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                        user.role === 'partner' ? 'bg-green-100 text-green-700 border-green-200' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Nenhum usuário encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div>
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
             <h3 className="font-bold text-slate-700">Lista de Prospectos</h3>
             <button 
                onClick={async () => {
                    try {
                        const { data, error } = await supabase.from('prospects').insert({
                            full_name: 'Novo Prospecto',
                            email: '',
                            phone: '',
                            status: 'new',
                            notes: ''
                        }).select().single();
                        
                        if (error) throw error;
                        await fetchData();
                        setEditingProspect(data.id);
                    } catch (e: any) {
                        alert('Erro ao criar: ' + e.message);
                    }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 text-sm font-medium transition-colors"
             >
                <Plus size={16} /> Novo
             </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-medium w-[25%]">Prospecto</th>
                  <th className="px-6 py-4 font-medium w-[25%]">Contato</th>
                  <th className="px-6 py-4 font-medium w-[15%]">Status</th>
                  <th className="px-6 py-4 font-medium w-[25%]">Anotações</th>
                  <th className="px-6 py-4 font-medium text-right w-[10%]">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {prospects.filter(p => {
                    if (!searchTerm) return true;
                    const term = searchTerm.toLowerCase();
                    return p.full_name.toLowerCase().includes(term) || 
                           p.email.toLowerCase().includes(term) ||
                           p.phone.includes(term);
                }).map(prospect => (
                    <tr key={prospect.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4 align-top">
                            {editingProspect === prospect.id ? (
                                <input 
                                    autoFocus
                                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 mb-1 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none font-bold text-slate-900"
                                    defaultValue={prospect.full_name}
                                    onChange={(e) => handleUpdateField(prospect.id, 'full_name', e.target.value)}
                                    placeholder="Nome Completo"
                                />
                            ) : (
                                <div className="font-bold text-slate-900">{prospect.full_name}</div>
                            )}
                            <div className="text-xs text-slate-500 mt-1">ID: {prospect.id.slice(0, 8)}</div>
                        </td>
                        <td className="px-6 py-4 align-top">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 text-slate-600">
                                   <Mail size={14} className="shrink-0" />
                                   {editingProspect === prospect.id ? (
                                       <input 
                                            className="w-full bg-white border border-slate-300 rounded px-2 py-0.5 focus:ring-1 focus:ring-green-500 outline-none text-xs"
                                            defaultValue={prospect.email}
                                            onChange={(e) => handleUpdateField(prospect.id, 'email', e.target.value)}
                                            placeholder="Email"
                                       />
                                   ) : (
                                       <a href={`mailto:${prospect.email}`} className="hover:text-green-600 truncate">{prospect.email || 'Sem email'}</a>
                                   )}
                                </div>
                                <div className="flex items-center gap-2 text-slate-600">
                                   <Phone size={14} className="shrink-0" />
                                   {editingProspect === prospect.id ? (
                                       <input 
                                            className="w-full bg-white border border-slate-300 rounded px-2 py-0.5 focus:ring-1 focus:ring-green-500 outline-none text-xs"
                                            defaultValue={prospect.phone}
                                            onChange={(e) => handleUpdateField(prospect.id, 'phone', e.target.value)}
                                            placeholder="Telefone (55...)"
                                       />
                                   ) : (
                                       <a href={`https://wa.me/${prospect.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="hover:text-green-600 truncate">{prospect.phone || 'Sem telefone'}</a>
                                   )}
                                </div>
                            </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                             <select 
                                value={prospect.status}
                                onChange={(e) => handleProspectStatus(prospect.id, e.target.value as Prospect['status'])}
                                className={`w-full px-2 py-1.5 rounded text-xs font-bold uppercase border outline-none cursor-pointer transition-colors ${
                                    prospect.status === 'new' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' :
                                    prospect.status === 'contacted' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100' :
                                    prospect.status === 'negotiating' ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' :
                                    prospect.status === 'converted' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' :
                                    'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                }`}
                             >
                                 <option value="new">Novo</option>
                                 <option value="contacted">Contatado</option>
                                 <option value="negotiating">Em Negociação</option>
                                 <option value="converted">Convertido</option>
                                 <option value="lost">Perdido</option>
                             </select>
                        </td>
                        <td className="px-6 py-4 align-top text-slate-500">
                            {editingProspect === prospect.id ? (
                                <textarea 
                                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 focus:ring-1 focus:ring-green-500 outline-none text-xs min-h-[60px]"
                                    defaultValue={prospect.notes || ''}
                                    onChange={(e) => handleUpdateField(prospect.id, 'notes', e.target.value)}
                                    placeholder="Adicionar anotações..."
                                />
                            ) : (
                                <p className="text-xs leading-relaxed max-w-[200px] whitespace-pre-wrap">{prospect.notes || '-'}</p>
                            )}
                        </td>
                         <td className="px-6 py-4 align-top text-right">
                            <div className="flex justify-end gap-2">
                                {editingProspect === prospect.id ? (
                                    <button 
                                        onClick={() => setEditingProspect(null)}
                                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-green-200 bg-white shadow-sm"
                                        title="Concluir Edição"
                                    >
                                        <CheckCircle size={18} />
                                    </button>
                                ) : (
                                    <>
                                        <button 
                                            onClick={() => setEditingProspect(prospect.id)}
                                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                                            title="Editar Prospecto"
                                        >
                                            <FileText size={18} />
                                        </button>
                                        <a 
                                            href={`https://wa.me/${prospect.phone.replace(/\D/g, '')}`} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className={`p-2 rounded-lg transition-colors ${
                                                prospect.phone 
                                                ? 'text-green-600 hover:bg-green-50 hover:scale-105 transform' 
                                                : 'text-slate-300 cursor-not-allowed'
                                            }`}
                                            title={prospect.phone ? "Abrir WhatsApp" : "Sem telefone"}
                                            onClick={(e) => !prospect.phone && e.preventDefault()}
                                        >
                                            <MessageCircle size={18} />
                                        </a>
                                    </>
                                )}
                            </div>
                        </td>
                    </tr>
                ))}
                 {prospects.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Nenhum prospecto cadastrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          </div>
        )}
      </div>
    </div>
  );
};
