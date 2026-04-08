
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { LicenseRequest, PartnerRequest, Profile, Prospect, LicenseTitle } from '../../types';
import { CheckCircle, XCircle, Users, Activity, User, Search, Phone, Mail, FileText, MessageCircle, Plus, Edit2, Play, Crown, Anchor, Trash2, Calendar, ArrowUpDown, ChevronUp, ChevronDown, X, ArrowLeft } from 'lucide-react';
import { BackButton } from '../BackButton';

interface AdminPanelProps {
  onBack?: () => void;
  onShowTour?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBack, onShowTour }) => {
  const [activeTab, setActiveTab] = useState<'licenses' | 'partners' | 'prospects' | 'users'>('licenses');
  const [licenses, setLicenses] = useState<LicenseRequest[]>([]);
  const [partners, setPartners] = useState<Profile[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [partnerRequests, setPartnerRequests] = useState<PartnerRequest[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editingProspect, setEditingProspect] = useState<string | null>(null);
  const [editingUserRole, setEditingUserRole] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [editingLicenseId, setEditingLicenseId] = useState<string | null>(null);
  const [editLicenseValue, setEditLicenseValue] = useState('');
  const [editLicenseTitle, setEditLicenseTitle] = useState('');
  const [titles, setTitles] = useState<LicenseTitle[]>([]);

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
        // Fetch existing partners (profiles with relevant roles)
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('role', ['partner', 'first_mate', 'admin']) 
          .order('created_at', { ascending: false });

        if (profilesError) throw profilesError;
        setPartners(profiles as Profile[] || []);

        // Fetch pending partner requests
        const { data: requests, error: requestsError } = await supabase
            .from('partner_requests')
            .select('*, profiles(full_name, email)')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });
        
        if (requestsError) throw requestsError;
        setPartnerRequests(requests as unknown as PartnerRequest[] || []);

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

  const fetchTitles = async () => {
    const { data } = await supabase.from('license_titles').select('*').order('name');
    if (data) setTitles(data);
  };

  useEffect(() => {
    fetchTitles();
  }, []);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedLicenses = React.useMemo(() => {
    let sortableData = [...licenses];

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      sortableData = sortableData.filter(lic => {
        const name = lic.profiles?.full_name?.toLowerCase() || '';
        const email = lic.profiles?.email?.toLowerCase() || '';
        const mt5 = lic.mt5_account?.toLowerCase() || '';
        return name.includes(searchLower) || email.includes(searchLower) || mt5.includes(searchLower);
      });
    }

    if (sortConfig?.key === 'created_at') {
      sortableData.sort((a, b) => {
        const aVal = new Date(a.created_at).getTime();
        const bVal = new Date(b.created_at).getTime();
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }

    return sortableData;
  }, [licenses, searchTerm, sortConfig]);

  const sortedPartners = React.useMemo(() => {
    let sortableData = [...partners];

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      sortableData = sortableData.filter(user => {
        const name = user.full_name?.toLowerCase() || '';
        const email = user.email?.toLowerCase() || '';
        return name.includes(searchLower) || email.includes(searchLower);
      });
    }

    if (sortConfig !== null) {
      sortableData.sort((a, b) => {
        if (sortConfig.key === 'role') {
            const roleOrder = { 'admin': 0, 'first_mate': 1, 'partner': 2, 'client': 3 };
            const aOrder = roleOrder[a.role as keyof typeof roleOrder] ?? 4;
            const bOrder = roleOrder[b.role as keyof typeof roleOrder] ?? 4;
            return sortConfig.direction === 'asc' ? aOrder - bOrder : bOrder - aOrder;
        }

        const aValue = (a as any)[sortConfig.key] || '';
        const bValue = (b as any)[sortConfig.key] || '';

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
        // Default hierarchy sorting for partners tab if no explicit sort
        sortableData.sort((a, b) => {
            const roleOrder = { 'admin': 0, 'first_mate': 1, 'partner': 2, 'client': 3 };
            const aOrder = roleOrder[a.role as keyof typeof roleOrder] ?? 4;
            const bOrder = roleOrder[b.role as keyof typeof roleOrder] ?? 4;
            return aOrder - bOrder;
        });
    }

    return sortableData;
  }, [partners, searchTerm, sortConfig]);

  const sortedUsers = React.useMemo(() => {
    let sortableUsers = [...users];
    
    // First apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      sortableUsers = sortableUsers.filter(user => {
        const name = user.full_name?.toLowerCase() || '';
        const email = user.email?.toLowerCase() || '';
        return name.includes(searchLower) || email.includes(searchLower);
      });
    }

    // Then apply sorting
    if (sortConfig !== null) {
      sortableUsers.sort((a, b) => {
        const aValue = (a as any)[sortConfig.key] || '';
        const bValue = (b as any)[sortConfig.key] || '';

        // Hierarchy for roles if sorting by role
        if (sortConfig.key === 'role') {
            const roleOrder = { 'admin': 0, 'first_mate': 1, 'partner': 2, 'client': 3 };
            const aOrder = roleOrder[a.role as keyof typeof roleOrder] ?? 4;
            const bOrder = roleOrder[b.role as keyof typeof roleOrder] ?? 4;
            
            if (aOrder < bOrder) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aOrder > bOrder) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableUsers;
  }, [users, searchTerm, sortConfig]);

  const handleLicenseAction = async (id: string, status: 'approved' | 'rejected', expires_at?: string) => {
    try {
      const updateData: any = { status };
      if (expires_at) updateData.expires_at = expires_at;
      
      await supabase.from('license_requests').update(updateData).eq('id', id);
      fetchData(); // Refresh
    } catch (error) {
      console.error('Error updating license:', error);
    }
  };

  const handleUpdateLicenseAccount = async (id: string) => {
    if (!editLicenseValue) return;
    try {
      const { error } = await supabase
        .from('license_requests')
        .update({ 
            mt5_account: editLicenseValue,
            license_title: editLicenseTitle
        })
        .eq('id', id);
      
      if (error) throw error;
      setLicenses(prev => prev.map(l => l.id === id ? { ...l, mt5_account: editLicenseValue, license_title: editLicenseTitle } : l));
      setEditingLicenseId(null);
    } catch (error: any) {
      alert('Erro ao atualizar: ' + error.message);
    }
  };

  const handleDeleteLicense = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta licença permanentemente?')) return;
    try {
      const { error } = await supabase.from('license_requests').delete().eq('id', id);
      if (error) throw error;
      setLicenses(prev => prev.filter(l => l.id !== id));
    } catch (error: any) {
      alert('Erro ao excluir licença: ' + error.message);
    }
  };

  const handleUpdateLicenseExpiration = async (id: string, date: string) => {
      try {
          const { error } = await supabase
            .from('license_requests')
            .update({ expires_at: date })
            .eq('id', id);
          
          if (error) throw error;
          setLicenses(prev => prev.map(l => l.id === id ? { ...l, expires_at: date } : l));
      } catch (error: any) {
          alert('Erro ao atualizar validade: ' + error.message);
      }
  };

  const handleUpdateLicenseNotes = async (id: string, notes: string) => {
      try {
          const { error } = await supabase
            .from('license_requests')
            .update({ notes })
            .eq('id', id);
          
          if (error) throw error;
          setLicenses(prev => prev.map(l => l.id === id ? { ...l, notes } : l));
      } catch (error: any) {
          console.error('Erro ao atualizar observação:', error);
      }
  };

  const handlePartnerRequestAction = async (request: PartnerRequest, status: 'approved' | 'rejected') => {
      try {
          // Update request status
          const { error: reqError } = await supabase
            .from('partner_requests')
            .update({ status })
            .eq('id', request.id);
          
          if (reqError) throw reqError;

          // If approved, update user role to partner
          if (status === 'approved') {
              const { error: roleError } = await supabase
                .from('profiles')
                .update({ role: 'partner' })
                .eq('id', request.user_id);
              
              if (roleError) throw roleError;
          }

          fetchData();
      } catch (error: any) {
          console.error("Error updating partner request:", error);
          alert("Erro: " + error.message);
      }
  };


  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      // 1. Update the profile role
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      // 2. Sync partner_requests status to maintain consistency
      if (newRole === 'client') {
          // If downgrading to client, revoke any approved partner status
          // This ensures they lose access effectively even if the marketing panel checks this table
          const { error: reqError } = await supabase
            .from('partner_requests')
            .update({ status: 'rejected' }) 
            .eq('user_id', userId)
            .eq('status', 'approved');
            
          if (reqError) console.error("Error revoking partner request:", reqError);

      } else if (['partner', 'first_mate', 'admin'].includes(newRole)) {
          // If promoting manually, ensure any PENDING request is approved
          // This prevents a "pending" badge from showing up for an actual partner
          const { error: reqError } = await supabase
            .from('partner_requests')
            .update({ status: 'approved' }) 
            .eq('user_id', userId)
            .eq('status', 'pending');

          if (reqError) console.error("Error approving partner request:", reqError);
      }
      
      // Optimistic update for users tab
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
      
      // Handle partners list update
      if (activeTab === 'partners') {
          if (newRole === 'client') {
              // Remove if demoted to client
              setPartners(prev => prev.filter(p => p.id !== userId));
          } else {
               // Update role and re-sort local list
               setPartners(prev => {
                   const updated = prev.map(p => p.id === userId ? { ...p, role: newRole as any } : p);
                   return updated;
               });
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

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('TEM CERTEZA? Isso excluirá permanentemente o perfil e todas as licenças do usuário. Esta ação não tem volta.')) return;
    
    setLoading(true);
    try {
        await supabase.from('license_requests').delete().eq('user_id', userId);
        await supabase.from('partner_requests').delete().eq('user_id', userId);
        const { error } = await supabase.from('profiles').delete().eq('id', userId);

        if (error) throw error;

        setUsers(prev => prev.filter(u => u.id !== userId));
        setPartners(prev => prev.filter(p => p.id !== userId));
        setSelectedUser(null);
        alert('Usuário excluído com sucesso.');
    } catch (error: any) {
        alert('Erro ao excluir: ' + error.message);
    } finally {
        setLoading(false);
    }
  };

  const renderUserDetails = (user: Profile) => {
    const userLicenses = licenses.filter(l => l.user_id === user.id);
    
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-3xl border border-slate-200 shadow-sm gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedUser(null)}
              className="p-3 hover:bg-slate-100 rounded-2xl transition-all group"
              title="Voltar para a lista"
            >
              <ArrowLeft size={24} className="text-slate-400 group-hover:text-slate-900" />
            </button>
            <div>
              <h2 className="text-2xl font-black text-slate-900 leading-tight">{user.full_name || 'Usuário'}</h2>
              <div className="flex items-center gap-2 mt-1">
                 <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                    user.role === 'first_mate' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                    user.role === 'partner' ? 'bg-green-100 text-green-700 border-green-200' :
                    'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {user.role}
                 </span>
                 <span className="text-xs text-slate-400 font-medium tracking-wide">ID: {user.id.slice(0, 8)}...</span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => handleDeleteUser(user.id)}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all font-bold text-sm border border-red-100 hover:border-red-600 border-dashed"
          >
            <Trash2 size={18} /> Excluir permanentemente este registro
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <User size={18} className="text-green-600" /> Informações
            </h3>
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Email</span>
                <span className="text-slate-700 font-bold break-all">{user.email}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Membro Desde</span>
                <span className="text-slate-700 font-bold">{new Date(user.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Último Acesso</span>
                <span className="text-slate-700 font-bold">
                   {(user as any).last_login ? new Date((user as any).last_login).toLocaleString() : 'Sem registros'}
                </span>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-green-600" /> Licenças Ativas
              </div>
              <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-lg uppercase">{userLicenses.length} Ativas</span>
            </h3>
            {userLicenses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {userLicenses.map(lic => (
                  <div key={lic.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-green-200 transition-colors group">
                    <div>
                      <div className="font-mono font-black text-slate-800 text-lg">{lic.mt5_account}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">{lic.license_title || 'Expert Advisor'}</div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${
                        lic.status === 'approved' ? 'bg-green-100 text-green-700' :
                        lic.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {lic.status}
                      </span>
                      <div className="text-[9px] font-bold text-slate-500">Validade: {lic.expires_at ? new Date(lic.expires_at).toLocaleDateString() : 'Vitalicío'}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <Activity size={32} className="opacity-20" />
                </div>
                <p className="text-sm font-bold uppercase tracking-widest opacity-50">Nenhuma licença encontrada</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {selectedUser ? (
        renderUserDetails(selectedUser)
      ) : (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              {onBack && <BackButton onClick={onBack} />}
              <div>
                <h1 className="text-2xl font-black text-slate-900 ">Painel Administrativo</h1>
                <p className="text-slate-500 text-sm">Gerencie usuários, licenças e conteúdo.</p>
              </div>
            </div>
            
            {onShowTour && (
              <button
                 onClick={onShowTour}
                 className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-all font-bold text-sm border border-slate-200"
              >
                <Play size={16} fill="currentColor" /> Ver Tour
              </button>
            )}
          </div>

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

          {(activeTab === 'licenses' || activeTab === 'partners' || activeTab === 'users' || activeTab === 'prospects') && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder={activeTab === 'licenses' ? "Buscar por nome, email ou conta MT5..." : "Buscar por nome, email ou telefone..."}
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
                  <th className="px-6 py-4 font-medium">Título</th>
                  <th className="px-6 py-4 font-medium">Conta</th>
                  <th 
                    className="px-6 py-4 font-medium cursor-pointer hover:text-slate-700 transition-colors"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center gap-1">
                        Data
                        {sortConfig?.key === 'created_at' ? (
                            sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        ) : (
                            <ArrowUpDown size={14} className="text-slate-300" />
                        )}
                    </div>
                  </th>
                  <th className="px-6 py-4 font-medium">Validade</th>
                  <th className="px-6 py-4 font-medium">Observação</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedLicenses.map((lic) => (
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
                    <td className="px-6 py-4">
                        {editingLicenseId === lic.id ? (
                            <select
                                value={editLicenseTitle}
                                onChange={(e) => setEditLicenseTitle(e.target.value)}
                                className="bg-white border border-slate-300 rounded px-2 py-1 text-[10px] font-bold uppercase focus:ring-1 focus:ring-green-500 outline-none"
                            >
                                {titles.map(t => (
                                    <option key={t.id} value={t.name}>{t.name}</option>
                                ))}
                                {titles.length === 0 && <option value="MT5">MT5</option>}
                            </select>
                        ) : (
                            <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded uppercase tracking-wider">
                                {lic.license_title || 'MT5'}
                            </span>
                        )}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600">
                        {editingLicenseId === lic.id ? (
                            <input 
                                type="text"
                                value={editLicenseValue}
                                onChange={(e) => setEditLicenseValue(e.target.value)}
                                className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono focus:ring-1 focus:ring-green-500 outline-none"
                                autoFocus
                            />
                        ) : (
                            lic.mt5_account
                        )}
                    </td>
                    <td className="px-6 py-4 text-slate-500">{new Date(lic.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <Calendar size={14} className="text-slate-400" />
                           <input 
                                type="date"
                                className="bg-transparent border-none text-xs text-slate-600 focus:ring-0 cursor-pointer"
                                defaultValue={lic.expires_at ? lic.expires_at.split('T')[0] : ''}
                                onChange={(e) => handleUpdateLicenseExpiration(lic.id, e.target.value)}
                           />
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        <input 
                            type="text"
                            className="bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-400 text-xs text-slate-600 focus:ring-0 w-full outline-none"
                            placeholder="Adicionar nota..."
                            defaultValue={lic.notes || ''}
                            onBlur={(e) => handleUpdateLicenseNotes(lic.id, e.target.value)}
                        />
                    </td>
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
                      <div className="flex justify-end gap-2">
                        {editingLicenseId === lic.id ? (
                          <>
                            <button 
                              onClick={() => handleUpdateLicenseAccount(lic.id)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Salvar">
                              <CheckCircle size={18} />
                            </button>
                            <button 
                              onClick={() => setEditingLicenseId(null)}
                              className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors" title="Cancelar">
                              <XCircle size={18} />
                            </button>
                          </>
                        ) : (
                          <>
                            {lic.status === 'pending' && (
                              <>
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
                              </>
                            )}
                            <button 
                              onClick={() => {
                                   setEditingLicenseId(lic.id);
                                   setEditLicenseValue(lic.mt5_account);
                                   setEditLicenseTitle(lic.license_title || 'MT5');
                               }}
                               className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar Conta">
                              <Edit2 size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteLicense(lic.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir Licença">
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
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
          <div className="space-y-6">
            
            {/* 1. Pending Partner Requests Section */}
            {partnerRequests.length > 0 && (
                <div className="bg-yellow-50/50 border-b border-yellow-100">
                    <div className="px-6 py-4 border-b border-yellow-100">
                        <h3 className="text-sm font-bold text-yellow-800 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                            Solicitações Pendentes
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="text-slate-500">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Usuário</th>
                                    <th className="px-6 py-3 font-medium">Solicitado em</th>
                                    <th className="px-6 py-3 font-medium text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-yellow-100">
                                {partnerRequests.map(req => (
                                    <tr key={req.id} className="hover:bg-yellow-50 transition-colors">
                                        <td className="px-6 py-3 text-slate-800 font-medium">
                                            {/* @ts-ignore */}
                                            {req.profiles?.full_name}
                                            <div className="text-xs text-slate-500 font-normal">{/* @ts-ignore */}{req.profiles?.email}</div>
                                        </td>
                                        <td className="px-6 py-3 text-slate-500">{new Date(req.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-3 text-right">
                                             <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => handlePartnerRequestAction(req, 'approved')}
                                                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-500 text-xs font-bold shadow-sm transition-colors"
                                                >
                                                    Aprovar
                                                </button>
                                                <button 
                                                    onClick={() => handlePartnerRequestAction(req, 'rejected')}
                                                    className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-100 text-xs font-bold transition-colors"
                                                >
                                                    Recusar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {partnerRequests.length === 0 && (
                                    <tr><td colSpan={3} className="px-6 py-3 text-center text-slate-400">Nenhuma solicitação pendente.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 2. Active Partners List */}
            <div className="overflow-x-auto">

                <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                    <tr>
                    <th className="px-6 py-4 font-medium">Parceiro</th>
                    <th className="px-6 py-4 font-medium">Email</th>
                    <th className="px-6 py-4 font-medium">Último Login</th>
                    <th 
                        className="px-6 py-4 font-medium cursor-pointer hover:text-slate-700 transition-colors"
                        onClick={() => handleSort('created_at')}
                    >
                        <div className="flex items-center gap-1">
                            Desde
                            {sortConfig?.key === 'created_at' ? (
                                sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                            ) : (
                                <ArrowUpDown size={14} className="text-slate-300" />
                            )}
                        </div>
                    </th>
                    <th 
                        className="px-6 py-4 font-medium cursor-pointer hover:text-slate-700 transition-colors"
                        onClick={() => handleSort('role')}
                    >
                        <div className="flex items-center gap-1">
                            Função
                            {sortConfig?.key === 'role' ? (
                                sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                            ) : (
                                <ArrowUpDown size={14} className="text-slate-300" />
                            )}
                        </div>
                    </th>
                    <th className="px-6 py-4 font-medium text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {sortedPartners.map((partner) => (
                    <tr key={partner.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                           <button 
                             onClick={() => setSelectedUser(partner)}
                             className="text-left hover:text-green-600 transition-colors group"
                           >
                             <div className="font-bold text-slate-900 group-hover:underline">{partner.full_name || 'Usuário'}</div>
                             <div className="text-[10px] text-slate-400 font-normal">Clique para ver detalhes</div>
                           </button>
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-medium">{partner.email}</td>
                        <td className="px-6 py-4 text-slate-500 text-xs">
                          {(partner as any).last_login ? new Date((partner as any).last_login).toLocaleString() : '---'}
                        </td>
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
                        <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Nenhum parceiro encontrado na lista ativa.</td></tr>
                    )}
                </tbody>
                </table>
            </div>
          </div>
        ) : activeTab === 'users' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-medium">Nome</th>
                  <th className="px-6 py-4 font-medium">Email</th>
                  <th className="px-6 py-4 font-medium">Último Login</th>
                  <th 
                    className="px-6 py-4 font-medium cursor-pointer hover:text-slate-700 transition-colors"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center gap-1">
                        Cadastro
                        {sortConfig?.key === 'created_at' ? (
                            sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        ) : (
                            <ArrowUpDown size={14} className="text-slate-300" />
                        )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 font-medium cursor-pointer hover:text-slate-700 transition-colors"
                    onClick={() => handleSort('role')}
                  >
                    <div className="flex items-center gap-1">
                        Função
                        {sortConfig?.key === 'role' ? (
                            sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        ) : (
                            <ArrowUpDown size={14} className="text-slate-300" />
                        )}
                    </div>
                  </th>
                  <th className="px-6 py-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                        <button 
                          onClick={() => setSelectedUser(user)}
                          className="flex items-center gap-3 text-left hover:text-green-600 transition-colors group"
                        >
                          <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                             <User size={16} />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 group-hover:underline leading-none">{user.full_name || 'Sem nome'}</div>
                            <span className="text-[10px] text-slate-400 font-normal">Ver detalhes</span>
                          </div>
                        </button>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{user.email}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {(user as any).last_login ? new Date((user as any).last_login).toLocaleString() : '---'}
                    </td>
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
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Nenhum usuário encontrado.</td></tr>
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
      </>
      )}
    </div>
  );
};

export default AdminPanel;
