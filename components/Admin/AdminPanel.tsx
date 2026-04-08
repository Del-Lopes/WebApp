import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { LicenseRequest, PartnerRequest, Profile, Prospect, LicenseTitle, Article, Robot } from '../../types';
import { 
  Users, 
  Settings, 
  HelpCircle, 
  Search, 
  Mail, 
  DollarSign, 
  TrendingUp, 
  MoreHorizontal, 
  Filter, 
  Download, 
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Layout,
  FileText,
  User,
  Plus,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Mail as MailIcon,
  Phone,
  Calendar,
  Anchor,
  Crown,
  X,
  Database,
  ShieldAlert,
  HardDrive,
  Activity,
  Play,
  ArrowLeft,
  Send,
  MessageCircle,
  ExternalLink
} from 'lucide-react';
import { formatBytes, getStorageStats, StorageStats, uploadToSupabase, listAllFiles, deleteFromSupabase, StorageFile } from '../../lib/storage';
import { BackButton } from '../BackButton';

interface AdminPanelProps {
  onBack?: () => void;
  onShowTour?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBack, onShowTour }) => {
  const [activeTab, setActiveTab] = useState<'licenses' | 'partners' | 'prospects' | 'users' | 'content'>('licenses');
  const [licenses, setLicenses] = useState<LicenseRequest[]>([]);
  const [partners, setPartners] = useState<Profile[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [partnerRequests, setPartnerRequests] = useState<PartnerRequest[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [robots, setRobots] = useState<Robot[]>([]);
  const [storageFiles, setStorageFiles] = useState<StorageFile[]>([]);
  const [legacyItems, setLegacyItems] = useState<{id: string, title: string, type: 'Artigo' | 'Produto', url: string}[]>([]);
  const [isRefreshingFiles, setIsRefreshingFiles] = useState(false);
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isNewsletterOpen, setIsNewsletterOpen] = useState(false);
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [articleForm, setArticleForm] = useState({ 
    title: '', excerpt: '', content: '', image_url: '', category: '', gallery_urls: [] as string[] 
  });
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRefreshingStats, setIsRefreshingStats] = useState(false);
  const [newsletterSubject, setNewsletterSubject] = useState('');
  const [newsletterContent, setNewsletterContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);

  const handleUpdateField = async (id: string, field: keyof Prospect, value: string) => {
      setProspects(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
      try {
          await supabase.from('prospects').update({ [field]: value }).eq('id', id);
      } catch (err) {
          console.error(err);
      }
  };

  useEffect(() => {
    fetchData();
    fetchStorageStats();
    fetchCurrentUser();
    const init = async () => {
        await fetchStorageStats();
        if (activeTab === 'content') {
            await fetchStorageFiles();
            await findLegacyItems();
        }
    };
    init();
  }, [activeTab]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setCurrentUserProfile(data);
    }
  };

  const fetchStorageStats = async () => {
    const stats = await getStorageStats();
    setStorageStats(stats);
  };

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
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('role', ['partner', 'first_mate', 'admin']) 
          .order('created_at', { ascending: false });

        if (profilesError) throw profilesError;
        setPartners(profiles as Profile[] || []);

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
      } else if (activeTab === 'prospects') {
        const { data, error } = await supabase
          .from('prospects')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setProspects(data as Prospect[] || []);
      } else if (activeTab === 'content') {
        const { data: articlesData, error: articlesError } = await supabase
          .from('articles')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (articlesError) throw articlesError;
        setArticles(articlesData as Article[] || []);

        const { data: robotsData, error: robotsError } = await supabase
          .from('products')
          .select('*')
          .eq('type', 'ea')
          .order('title', { ascending: true });
        
        if (robotsError) throw robotsError;
        
        const mappedRobots: Robot[] = (robotsData || []).map((item: any) => ({
          id: item.id,
          name: item.title,
          description: item.description,
          version: item.metadata?.version || '1.0',
          pair: item.metadata?.pair || 'UNK',
          status: item.metadata?.status || 'Em Análise',
          profitability: item.metadata?.profitability || '0.0%',
          images: item.metadata?.images || [],
          manualImages: item.metadata?.manualImages || [],
          avatar_url: item.metadata?.avatar_url || '',
          external_url: item.metadata?.external_url || '',
          myfxbook_url: item.metadata?.myfxbook_url || ''
        }));
        setRobots(mappedRobots);
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
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      sortableUsers = sortableUsers.filter(user => {
        const name = user.full_name?.toLowerCase() || '';
        const email = user.email?.toLowerCase() || '';
        return name.includes(searchLower) || email.includes(searchLower);
      });
    }

    if (sortConfig !== null) {
      sortableUsers.sort((a, b) => {
        const aValue = (a as any)[sortConfig.key] || '';
        const bValue = (b as any)[sortConfig.key] || '';

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
      fetchData();
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
          const { error: reqError } = await supabase
            .from('partner_requests')
            .update({ status })
            .eq('id', request.id);
          
          if (reqError) throw reqError;

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
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      if (newRole === 'client') {
          const { error: reqError } = await supabase
            .from('partner_requests')
            .update({ status: 'rejected' }) 
            .eq('user_id', userId)
            .eq('status', 'approved');
            
          if (reqError) console.error("Error revoking partner request:", reqError);

      } else if (['partner', 'first_mate', 'admin'].includes(newRole)) {
          const { error: reqError } = await supabase
            .from('partner_requests')
            .update({ status: 'approved' }) 
            .eq('user_id', userId)
            .eq('status', 'pending');

          if (reqError) console.error("Error approving partner request:", reqError);
      }
      
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
      
      if (activeTab === 'partners') {
          if (newRole === 'client') {
              setPartners(prev => prev.filter(p => p.id !== userId));
          } else {
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

  const handleSendNewsletter = async () => {
    if (!newsletterSubject || !newsletterContent) {
      alert("Por favor, preencha o assunto e a mensagem.");
      return;
    }

    setIsSending(true);
    try {
      const { data: broadcast, error: broadcastError } = await supabase
        .from('broadcasts')
        .insert({
          subject: newsletterSubject,
          content: newsletterContent,
          target_count: selectedIds.length
        })
        .select()
        .single();

      if (broadcastError) throw broadcastError;
      
      alert(`Comunicado enviado com sucesso para ${selectedIds.length} usuários.`);
      setIsNewsletterOpen(false);
      setSelectedIds([]);
      setNewsletterSubject('');
      setNewsletterContent('');
    } catch (error: any) {
      alert("Erro ao enviar comunicado: " + error.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleUploadToSupabase = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    // Check if user has permission
    const role = currentUserProfile?.role;
    if (role !== 'admin' && role !== 'first_mate') {
      alert('Apenas Admin e First Mate podem fazer upload de arquivos.');
      return;
    }

    if (storageStats?.isFull) {
        alert('Erro: Limite de armazenamento do Supabase (1GB) atingido. Remova arquivos antigos primeiro.');
        return;
    }

    setIsUploading(true);
    try {
      const newUrls: string[] = [];
      const category = articleForm.category.toLowerCase().includes('análise') || articleForm.category.toLowerCase().includes('analise') 
        ? 'analyses' 
        : 'articles';

      for (let i = 0; i < files.length; i++) {
        const url = await uploadToSupabase(files[i], category);
        newUrls.push(url);
      }
      
      setArticleForm(prev => ({
        ...prev,
        gallery_urls: [...prev.gallery_urls, ...newUrls],
        image_url: prev.image_url || newUrls[0]
      }));
      
      fetchStorageStats();
    } catch (e: any) {
      alert('Erro no upload: ' + e.message);
    } finally {
      setIsUploading(false);
    }
  };

  const fetchStorageFiles = async () => {
    setIsRefreshingFiles(true);
    try {
        const files = await listAllFiles();
        setStorageFiles(files);
    } catch (err) {
        console.error(err);
    } finally {
        setIsRefreshingFiles(false);
    }
  };

  const handleDeleteStorageFile = async (url: string) => {
    if (!window.confirm("Certeza que deseja excluir este arquivo PERMANENTEMENTE do storage?")) return;
    
    try {
        await deleteFromSupabase(url);
        setStorageFiles(prev => prev.filter(f => f.url !== url));
        fetchStorageStats();
    } catch (err) {
        alert('Erro ao excluir arquivo');
    }
  };

  const findLegacyItems = async () => {
    try {
        const { data: articlesData } = await supabase.from('articles').select('id, title, image_url, gallery_urls');
        const { data: productsData } = await supabase.from('products').select('id, title, image_url, metadata');
        
        const legacy: typeof legacyItems = [];
        const legacyPattern = /sslip\.io|tradexperience\.com\.br\/wp-content/;

        articlesData?.forEach(a => {
            if (a.image_url?.match(legacyPattern)) legacy.push({ id: a.id, title: a.title, type: 'Artigo', url: a.image_url });
            a.gallery_urls?.forEach((url: string) => {
                if (url.match(legacyPattern)) legacy.push({ id: a.id, title: `${a.title} (Galeria)`, type: 'Artigo', url });
            });
        });

        productsData?.forEach(p => {
            if (p.image_url?.match(legacyPattern)) legacy.push({ id: p.id, title: p.title, type: 'Produto', url: p.image_url });
            const meta = p.metadata as any;
            if (meta?.avatar_url?.match(legacyPattern)) legacy.push({ id: p.id, title: `${p.title} (Avatar)`, type: 'Produto', url: meta.avatar_url });
            meta?.images?.forEach((url: string) => {
                if (url.match(legacyPattern)) legacy.push({ id: p.id, title: `${p.title} (Imagem)`, type: 'Produto', url });
            });
            meta?.manualImages?.forEach((url: string) => {
                if (url.match(legacyPattern)) legacy.push({ id: p.id, title: `${p.title} (Manual)`, type: 'Produto', url });
            });
        });

        setLegacyItems(legacy);
    } catch (err) {
        console.error('Error finding legacy items:', err);
    }
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        title: articleForm.title,
        excerpt: articleForm.excerpt,
        content: articleForm.content,
        image_url: articleForm.image_url,
        category: articleForm.category,
        gallery_urls: articleForm.gallery_urls
      };

      if (editingArticle) {
        const { error } = await supabase.from('articles').update(data).eq('id', editingArticle.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('articles').insert(data);
        if (error) throw error;
      }

      setIsArticleModalOpen(false);
      fetchData();
    } catch (error: any) {
      alert('Erro ao salvar artigo: ' + error.message);
    }
  };

  const handleDeleteArticle = async (id: string) => {
    if (!window.confirm('Excluir este artigo permanentemente?')) return;
    try {
      const { error } = await supabase.from('articles').delete().eq('id', id);
      if (error) throw error;
      setArticles(prev => prev.filter(a => a.id !== id));
    } catch (error: any) {
      alert('Erro ao excluir: ' + error.message);
    }
  };

  const toggleSelectAll = (ids: string[]) => {
    if (selectedIds.length === ids.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(ids);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
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
            <button
              onClick={() => setActiveTab('content')}
              className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'content' ? 'border-green-600 text-green-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Storage
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
                            {lic.profiles?.full_name || 'Usuário'}
                        </div>
                        <div className="text-xs text-slate-400">
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
                    <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-400">Nenhuma solicitação encontrada.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'partners' ? (
          <div className="space-y-6">
            
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
                                            {req.profiles?.full_name}
                                            <div className="text-xs text-slate-500 font-normal">{req.profiles?.email}</div>
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
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                    <tr>
                    <th className="px-6 py-4 font-medium px-2">
                        <input 
                          type="checkbox" 
                          onChange={() => toggleSelectAll(sortedPartners.map(p => p.id))}
                          checked={selectedIds.length > 0 && selectedIds.length === sortedPartners.length}
                          className="rounded border-slate-300 text-green-600 focus:ring-green-500"
                        />
                    </th>
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
                            <input 
                              type="checkbox" 
                              checked={selectedIds.includes(partner.id)}
                              onChange={() => toggleSelect(partner.id)}
                              className="rounded border-slate-300 text-green-600 focus:ring-green-500"
                            />
                        </td>
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
                </tbody>
                </table>
            </div>
          </div>
        ) : activeTab === 'users' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-medium px-2 text-center">
                    <input 
                      type="checkbox" 
                      onChange={() => toggleSelectAll(sortedUsers.map(u => u.id))}
                      checked={selectedIds.length > 0 && selectedIds.length === sortedUsers.length}
                      className="rounded border-slate-300 text-green-600 focus:ring-green-500"
                    />
                  </th>
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
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(user.id)}
                          onChange={() => toggleSelect(user.id)}
                          className="rounded border-slate-300 text-green-600 focus:ring-green-500"
                        />
                    </td>
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
              </tbody>
            </table>
          </div>
        ) : activeTab === 'prospects' ? (
          <div>
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <h3 className="font-bold text-slate-700">Lista de Prospectos</h3>
               <button 
                  onClick={async () => {
                      try {
                          const { data, error } = await supabase.from('prospects').insert({
                              full_name: 'Novo Prospecto', email: '', phone: '', status: 'new', notes: ''
                          }).select().single();
                          if (error) throw error;
                          await fetchData();
                          setEditingProspect(data.id);
                      } catch (e: any) { alert('Erro ao criar: ' + e.message); }
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
                    <th className="px-6 py-4 font-medium text-right w-[10%]">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {prospects.filter(p => {
                      if (!searchTerm) return true;
                      const term = searchTerm.toLowerCase();
                      return p.full_name.toLowerCase().includes(term) || p.email.toLowerCase().includes(term) || p.phone.includes(term);
                  }).map(prospect => (
                      <tr key={prospect.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4 align-top">
                              {editingProspect === prospect.id ? (
                                  <input autoFocus className="w-full border rounded px-2 py-1 outline-none font-bold" defaultValue={prospect.full_name} onChange={(e) => handleUpdateField(prospect.id, 'full_name', e.target.value)} />
                              ) : ( <div className="font-bold text-slate-900">{prospect.full_name}</div> )}
                              <div className="text-xs text-slate-500 mt-1">ID: {prospect.id.slice(0, 8)}</div>
                          </td>
                          <td className="px-6 py-4 align-top">
                              <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-2 text-slate-600">
                                     <Mail size={14} />
                                     {editingProspect === prospect.id ? (
                                         <input className="w-full border rounded px-2 py-0.5 text-xs" defaultValue={prospect.email} onChange={(e) => handleUpdateField(prospect.id, 'email', e.target.value)} />
                                     ) : ( <a href={`mailto:${prospect.email}`} className="truncate hover:text-green-600">{prospect.email || 'Sem email'}</a> )}
                                  </div>
                                  <div className="flex items-center gap-2 text-slate-600">
                                     <Phone size={14} />
                                     {editingProspect === prospect.id ? (
                                         <input className="w-full border rounded px-2 py-0.5 text-xs" defaultValue={prospect.phone} onChange={(e) => handleUpdateField(prospect.id, 'phone', e.target.value)} />
                                     ) : ( <a href={`https://wa.me/${prospect.phone.replace(/\D/g, '')}`} target="_blank" className="hover:text-green-600">{prospect.phone || 'Sem telefone'}</a> )}
                                  </div>
                              </div>
                          </td>
                          <td className="px-6 py-4 align-top">
                               <select 
                                  value={prospect.status}
                                  onChange={(e) => handleProspectStatus(prospect.id, e.target.value as Prospect['status'])}
                                  className="w-full px-2 py-1.5 rounded text-xs font-bold border outline-none"
                               >
                                   <option value="new">Novo</option>
                                   <option value="contacted">Contatado</option>
                                   <option value="negotiating">Negociando</option>
                                   <option value="converted">Convertido</option>
                                   <option value="lost">Perdido</option>
                               </select>
                          </td>
                          <td className="px-6 py-4 align-top">
                              {editingProspect === prospect.id ? (
                                  <textarea className="w-full border rounded px-2 py-1 text-xs" defaultValue={prospect.notes || ''} onChange={(e) => handleUpdateField(prospect.id, 'notes', e.target.value)} />
                              ) : ( <p className="text-xs whitespace-pre-wrap">{prospect.notes || '-'}</p> )}
                          </td>
                          <td className="px-6 py-4 align-top text-right">
                              <div className="flex justify-end gap-2">
                                  {editingProspect === prospect.id ? (
                                      <button onClick={() => setEditingProspect(null)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg"><CheckCircle size={18} /></button>
                                  ) : (
                                      <button onClick={() => setEditingProspect(prospect.id)} className="p-2 text-slate-400 hover:text-slate-600"><Edit2 size={18} /></button>
                                  )}
                              </div>
                          </td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'content' ? (
          <div className="space-y-12 p-2">
            
            <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Database size={80} className="text-slate-900" />
                </div>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-5">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                            storageStats?.percentage! >= 95 ? 'bg-red-500 shadow-red-200 animate-pulse' : 
                            storageStats?.percentage! >= 80 ? 'bg-orange-500 shadow-orange-200' : 
                            'bg-green-600 shadow-green-200'
                        } text-white transition-all duration-500`}>
                            {storageStats?.percentage! >= 95 ? <ShieldAlert size={28} /> : <HardDrive size={28} />}
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                Armazenamento Supabase
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                    storageStats?.isFull ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                                }`}>
                                    {storageStats?.isFull ? 'Crítico' : 'Operacional'}
                                </span>
                            </h3>
                            <p className="text-sm text-slate-500 font-medium">Capacidade total: 1.0 GB disponível</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1 items-end">
                        <div className="text-2xl font-black text-slate-900 tabular-nums">
                            {storageStats ? formatBytes(storageStats.usedBytes) : '0 Bytes'}
                            <span className="text-slate-300 mx-2">/</span>
                            1.0 GB
                        </div>
                        <div className="flex items-center gap-2">
                            <RefreshCw 
                                size={14} 
                                className={`text-slate-400 cursor-pointer hover:text-green-600 transition-colors ${isRefreshingStats ? 'animate-spin' : ''}`}
                                onClick={() => { setIsRefreshingStats(true); fetchStorageStats().finally(() => setIsRefreshingStats(false)); }}
                            />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sincronizado agora</span>
                        </div>
                    </div>
                </div>

                <div className="mt-8 relative">
                    <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-50 relative">
                        <div 
                            className={`h-full transition-all duration-1000 ease-out relative ${
                                storageStats?.percentage! >= 95 ? 'bg-gradient-to-r from-red-500 to-red-600 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 
                                storageStats?.percentage! >= 80 ? 'bg-gradient-to-r from-orange-400 to-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]' : 
                                'bg-gradient-to-r from-green-400 to-green-600 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                            }`}
                            style={{ width: `${Math.min(storageStats?.percentage || 0, 100)}%` }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                            <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px]" />
                        </div>
                    </div>

                    <div className="flex justify-between mt-2 px-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">0%</span>
                        <div className="flex gap-12">
                            <span className={`text-[9px] font-black uppercase tracking-tighter ${storageStats?.percentage! >= 50 ? 'text-slate-600' : 'text-slate-300'}`}>50%</span>
                            <span className={`text-[9px] font-black uppercase tracking-tighter ${storageStats?.percentage! >= 80 ? 'text-orange-500' : 'text-slate-300'}`}>80% Warning</span>
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-tighter ${storageStats?.percentage! >= 95 ? 'text-red-500 animate-pulse' : 'text-slate-300'}`}>95% Critical</span>
                    </div>
                </div>

                {storageStats?.isFull && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 animate-bounce">
                        <ShieldAlert className="text-red-600" size={20} />
                        <p className="text-xs font-bold text-red-700">Storage esgotado! Não será possível realizar novos uploads até que arquivos sejam removidos.</p>
                    </div>
                )}
            </div>

            {/* Articles List */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <FileText size={24} className="text-slate-400" />
                        Postagens do Blog / Conteúdo
                    </h3>
                    <button 
                        onClick={() => { setEditingArticle(null); setArticleForm({ title: '', excerpt: '', content: '', image_url: '', category: '', gallery_urls: [] }); setIsArticleModalOpen(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 text-sm font-bold transition-all shadow-lg"
                    >
                        <Plus size={16} /> Nova Postagem
                    </button>
                </div>

                <div className="overflow-x-auto bg-white rounded-[32px] border border-slate-100 shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 font-medium">Artigo</th>
                                <th className="px-6 py-4 font-medium">Categoria</th>
                                <th className="px-6 py-4 font-medium">Imagens</th>
                                <th className="px-6 py-4 font-medium">Data</th>
                                <th className="px-6 py-4 font-medium text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {articles.filter(a => {
                                if (!searchTerm) return true;
                                return a.title.toLowerCase().includes(searchTerm.toLowerCase()) || a.category?.toLowerCase().includes(searchTerm.toLowerCase());
                            }).map(article => (
                                <tr key={article.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900">{article.title}</div>
                                        <div className="text-xs text-slate-500 line-clamp-1">{article.excerpt}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase tracking-wider">{article.category || 'Geral'}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex -space-x-2">
                                            {article.image_url && <img src={article.image_url} className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-sm" />}
                                            {article.gallery_urls?.slice(0, 3).map((url, i) => (
                                                <img key={i} src={url} className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-sm" />
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">{new Date(article.created_at || '').toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => { setEditingArticle(article); setArticleForm({ title: article.title, excerpt: article.excerpt, content: article.content || '', image_url: article.image_url || '', category: article.category || '', gallery_urls: article.gallery_urls || [] }); setIsArticleModalOpen(true); }} className="p-2 text-slate-400 hover:text-blue-600 rounded-lg"><Edit2 size={18} /></button>
                                            <button onClick={() => handleDeleteArticle(article.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg"><Trash2 size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Strategy Assets List */}
            <div className="pt-8 border-t border-slate-100">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <Activity size={24} className="text-green-600" />
                        Arquivos de Estratégias
                    </h3>
                    <span className="text-xs font-bold text-slate-400 uppercase bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                        {robots.length} Robôs Configurados
                    </span>
                </div>

                <div className="overflow-x-auto bg-white rounded-[32px] border border-slate-100 shadow-sm">
                    <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                        <tr>
                        <th className="px-6 py-4 font-medium">Estratégia</th>
                        <th className="px-6 py-4 font-medium">Avatar</th>
                        <th className="px-6 py-4 font-medium">Galeria</th>
                        <th className="px-6 py-4 font-medium">Manual</th>
                        <th className="px-6 py-4 font-medium text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {robots.map(robot => (
                        <tr key={robot.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                            <div className="font-bold text-slate-900">{robot.name}</div>
                            <div className="text-xs text-slate-400 font-mono uppercase tracking-tighter">{robot.pair} v{robot.version}</div>
                            </td>
                            <td className="px-6 py-4">
                                {robot.avatar_url ? (
                                    <div className="w-10 h-10 rounded-xl border border-slate-100 overflow-hidden shadow-sm">
                                        <img src={robot.avatar_url} className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="w-10 h-10 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-center text-slate-300">
                                        <User size={16} />
                                    </div>
                                )}
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex -space-x-2">
                                    {robot.images?.slice(0, 3).map((url, i) => (
                                        <img key={i} src={url} className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-sm" />
                                    ))}
                                    {(robot.images?.length || 0) > 3 && (
                                        <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-900 text-white text-[8px] font-black flex items-center justify-center shadow-sm">
                                            +{robot.images!.length - 3}
                                        </div>
                                    )}
                                    {(!robot.images || robot.images.length === 0) && <span className="text-[10px] font-bold text-slate-300">Nenhuma</span>}
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-1.5 font-bold text-slate-500">
                                    <FileText size={14} className="text-slate-400" />
                                    {robot.manualImages?.length || 0} páginas
                                </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                    robot.status === 'Operacional' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                                }`}>
                                    {robot.status}
                                </span>
                            </td>
                        </tr>
                        ))}
                        {robots.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Nenhuma estratégia encontrada.</td>
                            </tr>
                        )}
                    </tbody>
                    </table>
                </div>
            </div>

            {/* Global File Management */}
            <div className="pt-8 border-t border-slate-100 pb-10">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <Database size={24} className="text-blue-600" />
                        Gestão Geral de Arquivos
                    </h3>
                    <div className="flex items-center gap-3">
                        <button 
                            type="button"
                            onClick={fetchStorageFiles}
                            className={`p-2 text-slate-400 hover:text-green-600 transition-all ${isRefreshingFiles ? 'animate-spin' : ''}`}
                        >
                            <RefreshCw size={18} />
                        </button>
                        <span className="text-xs font-bold text-slate-400 uppercase bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                            {storageFiles.length} Arquivos no Bucket
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto bg-white rounded-[32px] border border-slate-100 shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 font-medium">Visualização</th>
                                <th className="px-6 py-4 font-medium">Nome / Caminho</th>
                                <th className="px-6 py-4 font-medium">Tamanho</th>
                                <th className="px-6 py-4 font-medium px-12">Data</th>
                                <th className="px-6 py-4 font-medium text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {storageFiles.map(file => (
                                <tr key={file.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                                            {file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                                <img src={file.url} className="w-full h-full object-cover" />
                                            ) : (
                                                <FileText size={20} className="text-slate-400" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900 line-clamp-1">{file.name}</div>
                                        <div className="text-[10px] text-slate-400 font-mono">{file.path}</div>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-600">
                                        {formatBytes(file.size || 0)}
                                    </td>
                                    <td className="px-6 py-4 text-slate-400 text-xs text-center">
                                        {new Date(file.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <a 
                                                href={file.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="p-2 text-slate-300 hover:text-blue-600 transition-colors"
                                                title="Ver arquivo"
                                            >
                                                <ExternalLink size={18} />
                                            </a>
                                            <button 
                                                onClick={() => handleDeleteStorageFile(file.url)}
                                                className="p-2 text-slate-300 hover:text-red-600 transition-colors"
                                                title="Excluir do Storage"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {storageFiles.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                                        {isRefreshingFiles ? 'Carregando arquivos...' : 'Nenhum arquivo encontrado no storage.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Legacy Content Alert */}
            {legacyItems.length > 0 && (
                <div className="pt-8 border-t border-slate-100">
                    <div className="bg-orange-50/50 border border-orange-100 rounded-[32px] p-8">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <ShieldAlert size={24} className="text-orange-600" />
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Detectados Links Legados</h3>
                                    <p className="text-sm text-slate-500 font-bold">Arquivos hospedados no SeaweedFS ou Servidores Antigos.</p>
                                </div>
                            </div>
                            <span className="px-4 py-1.5 bg-orange-100 text-orange-700 rounded-full text-xs font-black uppercase">
                                {legacyItems.length} Itens Encontrados
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {legacyItems.map((item, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-2xl border border-orange-100 shadow-sm flex items-center justify-between group hover:border-orange-300 transition-all">
                                    <div className="overflow-hidden">
                                        <div className="text-[10px] font-black uppercase text-orange-600 mb-1">{item.type}</div>
                                        <div className="text-sm font-bold text-slate-800 truncate mb-1">{item.title}</div>
                                        <div className="text-[9px] text-slate-400 font-mono truncate">{item.url}</div>
                                    </div>
                                    <a 
                                        href={item.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="p-2 text-slate-300 hover:text-orange-600 transition-colors"
                                    >
                                        <ExternalLink size={18} />
                                    </a>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 flex items-center gap-3 p-4 bg-orange-100/30 rounded-2xl">
                             <TrendingUp size={16} className="text-orange-600" />
                             <p className="text-xs font-bold text-orange-800 italic">
                                Recomendação: Re-faça o upload destes arquivos utilizando o novo sistema para migrá-los ao Supabase. Após migrar, os links antigos deixarão de aparecer aqui.
                             </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
        ) : null}
      </div>

      {selectedIds.length > 0 && (
           <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white px-8 py-5 rounded-[32px] shadow-3xl flex items-center gap-8 animate-in slide-in-from-bottom-12 duration-500 z-50 backdrop-blur-xl border border-white/10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-[20px] flex items-center justify-center font-black shadow-lg shadow-green-500/40 transform -rotate-12">{selectedIds.length}</div>
                    <div><div className="text-[10px] uppercase font-black tracking-[0.25em] text-slate-400 mb-0.5">Audiência</div><div className="text-base font-black tracking-tight whitespace-nowrap">Usuários Selecionados</div></div>
                </div>
                <div className="h-12 w-[1px] bg-white/10 mx-2" />
                <div className="flex gap-4">
                    <button onClick={() => setIsNewsletterOpen(true)} className="px-8 py-3.5 bg-white text-slate-900 rounded-2xl font-black hover:bg-green-500 hover:text-white transition-all shadow-xl flex items-center gap-3"><Mail size={20} /> Enviar Mensagem</button>
                    <button onClick={() => setSelectedIds([])} className="px-6 py-3.5 bg-slate-800 text-slate-400 rounded-2xl font-black hover:bg-slate-700 hover:text-white transition-all">Cancelar</button>
                </div>
           </div>
      )}

      {isNewsletterOpen && (
           <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
              <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-3xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="bg-slate-50/50 px-12 py-10 border-b border-slate-100 flex justify-between items-start">
                      <div><h2 className="text-3xl font-black text-slate-900 tracking-tighter">Novo Comunicado</h2><p className="text-sm text-slate-500 font-bold">Disparo para {selectedIds.length} traders.</p></div>
                      <button onClick={() => setIsNewsletterOpen(false)} className="p-4 hover:bg-slate-200 rounded-2xl transition-all"><X size={28} className="text-slate-400" /></button>
                  </div>
                  <div className="p-12 space-y-8 overflow-y-auto custom-scrollbar">
                      <div className="space-y-2"><label className="text-[12px] font-black uppercase text-slate-400">Assunto</label><input type="text" value={newsletterSubject} onChange={e => setNewsletterSubject(e.target.value)} className="w-full px-8 py-6 bg-slate-50 border rounded-[28px] outline-none font-bold" /></div>
                      <div className="space-y-2"><label className="text-[12px] font-black uppercase text-slate-400">Mensagem</label><textarea value={newsletterContent} onChange={e => setNewsletterContent(e.target.value)} rows={6} className="w-full px-8 py-8 bg-slate-50 border rounded-[32px] outline-none font-bold resize-none" /></div>
                  </div>
                  <div className="px-12 py-10 bg-slate-50/50 border-t flex justify-end gap-5">
                      <button onClick={() => setIsNewsletterOpen(false)} className="px-8 py-4 text-slate-500 font-black">Cancelar</button>
                      <button onClick={handleSendNewsletter} disabled={isSending} className="px-12 py-4 bg-slate-900 text-white rounded-[28px] font-black hover:bg-green-600">Disparar</button>
                  </div>
              </div>
           </div>
      )}

      {isArticleModalOpen && (
           <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in">
              <div className="bg-white w-full max-w-3xl rounded-[48px] shadow-3xl overflow-hidden flex flex-col max-h-[95vh]">
                  <div className="bg-slate-50/50 px-10 py-6 border-b border-slate-100 flex justify-between items-center">
                      <h2 className="text-2xl font-black text-slate-900 tracking-tighter">{editingArticle ? 'Editar Conteúdo' : 'Nova Postagem'}</h2>
                      <button onClick={() => setIsArticleModalOpen(false)} className="p-3 hover:bg-slate-200 rounded-xl transition-all"><X size={24} className="text-slate-400" /></button>
                  </div>
                  
                  <form onSubmit={handleSaveArticle} className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">Título</label>
                          <input type="text" required value={articleForm.title} onChange={e => setArticleForm({...articleForm, title: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border rounded-2xl outline-none font-bold" /></div>
                          <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">Categoria</label>
                          <input type="text" value={articleForm.category} onChange={e => setArticleForm({...articleForm, category: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border rounded-2xl outline-none font-bold" /></div>
                      </div>

                      <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-slate-400">Imagens</label>
                           <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-[32px] p-6 cursor-pointer hover:bg-green-50 hover:border-green-400 transition-all ${isUploading || storageStats?.isFull ? 'bg-slate-50 cursor-not-allowed' : 'bg-green-50/30 border-green-200'}`}>
                               <Plus size={32} className={`${isUploading ? 'text-slate-300 animate-spin' : storageStats?.isFull ? 'text-red-300' : 'text-green-500'}`} />
                               <span className="text-sm font-black text-slate-700">
                                   {isUploading ? 'Enviando...' : storageStats?.isFull ? 'Limite Atingido' : 'Adicionar Fotos'}
                               </span>
                               <input type="file" multiple accept="image/*" onChange={(e) => handleUploadToSupabase(e.target.files)} className="hidden" disabled={isUploading || storageStats?.isFull} />
                            </label>
                           {articleForm.gallery_urls.length > 0 && (
                               <div className="grid grid-cols-5 gap-2 mt-4">
                                  {articleForm.gallery_urls.map((url, i) => (
                                      <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-white shadow-sm">
                                          <img src={url} className="w-full h-full object-cover" />
                                          <button type="button" onClick={() => setArticleForm(prev => ({...prev, gallery_urls: prev.gallery_urls.filter((_, idx) => idx !== i)}))} className="absolute top-0.5 right-0.5 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={10} /></button>
                                          <button type="button" onClick={() => setArticleForm({...articleForm, image_url: url})} className={`absolute bottom-0 left-0 right-0 py-0.5 text-[8px] font-black text-center ${articleForm.image_url === url ? 'bg-green-600 text-white' : 'bg-slate-900/40 text-white opacity-0 group-hover:opacity-100 italic'}`}>CAPA</button>
                                      </div>
                                  ))}
                               </div>
                           )}
                      </div>

                      <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">Resumo</label>
                      <textarea rows={2} value={articleForm.excerpt} onChange={e => setArticleForm({...articleForm, excerpt: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border rounded-2xl outline-none font-bold resize-none" /></div>

                      <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">Conteúdo</label>
                      <textarea rows={6} value={articleForm.content} onChange={e => setArticleForm({...articleForm, content: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border rounded-[32px] outline-none font-semibold resize-none" /></div>
                      
                      <div className="sticky bottom-0 bg-white pt-4">
                          <button type="submit" disabled={isUploading} className="w-full bg-slate-900 text-white font-black py-5 rounded-[28px] hover:bg-green-600 shadow-xl transition-all disabled:opacity-50">
                              {editingArticle ? 'Salvar Alterações' : 'Publicar Agora'}
                          </button>
                      </div>
                  </form>
              </div>
           </div>
      )}
      </>
      )}
    </div>
  );
};

export default AdminPanel;
