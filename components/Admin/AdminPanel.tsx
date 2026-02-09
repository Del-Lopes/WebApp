import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { LicenseRequest, PartnerRequest, Profile, Prospect } from '../../types';
import { CheckCircle, XCircle, Users, Activity, User, Search, Phone, Mail, FileText, MessageCircle, Plus, Edit2, Play, Crown, Anchor } from 'lucide-react';
import { BackButton } from '../BackButton';

interface AdminPanelProps {
  onBack?: () => void;
  onShowTour?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBack, onShowTour }) => {
  const [activeTab, setActiveTab] = useState<'licenses' | 'partners' | 'prospects' | 'users'>('licenses');
  const [licenses, setLicenses] = useState<LicenseRequest[]>([]);
  const [partners, setPartners] = useState<Profile[]>([]); // Changed to Profile[] to list users with partner role
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editingProspect, setEditingProspect] = useState<string | null>(null);
  const [editingUserRole, setEditingUserRole] = useState<string | null>(null);

  const handleUpdateField = async (id: string, field: keyof Prospect, value: string) => {
      // Optimistic Update
      setProspects(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
      
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
        // Now fetching from profiles where role is 'partner', 'first_mate', or 'admin'
        // Logic: Display users who have partner privileges or higher in the partners tab if the intent is to see "who is a partner"
        // Based on user request "users with role 'partner' should be in the list".
        // Also "First Mate role includes everything Partner has + more".
        // Assuming "Partners" tab is for managing those with partner capability. 
        // Or strictly 'partner'? The user said: "só mostre os usuários que realmente são parceiros".
        // If I strictly follow "really are partners", it implies role = 'partner'.
        // But since First Mate > Partner, they are inherently partners too?
        // Let's filter by role IN ('partner', 'first_mate', 'admin') or just 'partner'?
        // The user complained that a user whose role was removed (presumably set to 'client') remained in the list.
        // So the list was likely stale or fetching from 'partner_requests' table.
        // Previously: .from('partner_requests')
        // Fix: Fetch from 'profiles' where role is 'partner' OR 'first_mate' (since they include partner privileges).
        
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .in('role', ['partner', 'first_mate', 'admin']) 
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPartners(data as Profile[] || []);

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


  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      
      // Optimistic update for users tab
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
      
      // If we are in partners tab and role is changed to client, remove from list
      if (activeTab === 'partners') {
          if (newRole === 'client') {
              setPartners(prev => prev.filter(p => p.id !== userId));
          } else {
               // Update role in partners list
               setPartners(prev => prev.map(p => p.id === userId ? { ...p, role: newRole as any } : p));
          }
      }

      setEditingUserRole(null);
    } catch (error: any) {
      console.error('Error updating user role:', error);
      alert('Erro ao atualizar função: ' + error.message);
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
        
        {onShowTour && (
            <button 
                onClick={onShowTour}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium transition-colors"
            >
                <Play size={16} /> Ver Tour
            </button>
        )}
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
                  <th className="px-6 py-4 font-medium">Parceiro</th>
                  <th className="px-6 py-4 font-medium">Email</th>
                  <th className="px-6 py-4 font-medium">Since</th>
                  <th className="px-6 py-4 font-medium">Role</th>
                  <th className="px-6 py-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {partners.filter(user => {
                  if (!searchTerm) return true;
                  const searchLower = searchTerm.toLowerCase();
                  const name = user.full_name?.toLowerCase() || '';
                  const email = user.email?.toLowerCase() || '';
                  return name.includes(searchLower) || email.includes(searchLower);
                }).map((partner) => (
                  <tr key={partner.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">
                        {partner.full_name || 'Usuário'}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{partner.email}</td>
                    <td className="px-6 py-4 text-slate-500">{new Date(partner.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      {editingUserRole === partner.id ? (
                        <select
                          value={partner.role}
                          onChange={(e) => handleUpdateUserRole(partner.id, e.target.value)}
                          className="px-2 py-1 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-green-500 outline-none"
                          autoFocus
                          onBlur={() => setEditingUserRole(null)}
                        >
                          <option value="client">Client</option>
                          <option value="partner">Partner</option>
                          <option value="admin">Admin</option>
                          <option value="first_mate">First Mate</option>
                        </select>
                      ) : (
                        <button
                          onClick={() => setEditingUserRole(partner.id)}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase border flex items-center gap-1 hover:opacity-80 transition-opacity ${
                            partner.role === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                            partner.role === 'first_mate' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                            partner.role === 'partner' ? 'bg-green-100 text-green-700 border-green-200' :
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {partner.role === 'first_mate' && <Anchor size={12} />}
                          {partner.role === 'admin' && <Crown size={12} />}
                          {partner.role}
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button
                          onClick={() => setEditingUserRole(partner.id)}
                          className="text-slate-400 hover:text-blue-600 p-1 rounded transition-colors"
                          title="Alterar Função"
                       >
                         <Edit2 size={16} />
                       </button>
                    </td>
                  </tr>
                ))}
                {partners.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Nenhum parceiro encontrado.</td></tr>
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
                  <th className="px-6 py-4 font-medium text-right">Ações</th>
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
                      {editingUserRole === user.id ? (
                        <select
                          value={user.role}
                          onChange={(e) => handleUpdateUserRole(user.id, e.target.value)}
                          className="px-2 py-1 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-green-500 outline-none"
                          autoFocus
                          onBlur={() => setEditingUserRole(null)}
                        >
                          <option value="client">Client</option>
                          <option value="partner">Partner</option>
                          <option value="admin">Admin</option>
                          <option value="first_mate">First Mate</option>
                        </select>
                      ) : (
                        <button
                          onClick={() => setEditingUserRole(user.id)}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase border flex items-center gap-1 hover:opacity-80 transition-opacity ${
                            user.role === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                            user.role === 'first_mate' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                            user.role === 'partner' ? 'bg-green-100 text-green-700 border-green-200' :
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {user.role === 'first_mate' && <Anchor size={12} />}
                          {user.role === 'admin' && <Crown size={12} />}
                          {user.role}
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button
                          onClick={() => setEditingUserRole(user.id)}
                          className="text-slate-400 hover:text-blue-600 p-1 rounded transition-colors"
                          title="Alterar Função"
                       >
                         <Edit2 size={16} />
                       </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Nenhum usuário encontrado.</td></tr>
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
                                            <Edit2 size={18} />
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
