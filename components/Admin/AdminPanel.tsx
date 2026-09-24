import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { LicenseRequest, PartnerRequest, Profile, Prospect, LicenseTitle, Article, Robot } from '../../types';
import { UserCoinsCard } from './UserCoinsCard';
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
  ExternalLink,
  Save
} from 'lucide-react';
import { formatBytes, getStorageStats, StorageStats, uploadToSupabase, listAllFiles, deleteFromSupabase, StorageFile } from '../../lib/storage';
import { BackButton } from '../BackButton';
import { ArticleAutomationSettings } from './ArticleAutomationSettings';
import { MarketAdmin } from './MarketAdmin';
import { LiveRoomAdmin } from './LiveRoomAdmin';
import { PartnerApplications } from './PartnerApplications';
import {
  Badge, Button, Card, EmptyState, Input, Label, PageHeader, Select, Skeleton, Tabs, Textarea,
  Table, THead, TBody, TR, TH, TD,
} from '../ui';
import type { BadgeTone } from '../ui';

// Classes escritas por inteiro (o Tailwind compilado não enxerga classes montadas).
// Função do usuário: admin em destaque, first mate neutro forte, partner verde.
const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-accent/10 text-accent-fg border-accent/25',
  first_mate: 'bg-tint/8 text-fg border-tint/15',
  partner: 'bg-success/10 text-success-fg border-success/20',
  client: 'bg-tint/5 text-fg-muted border-tint/10',
};

const LICENSE_TONE: Record<string, BadgeTone> = {
  approved: 'success',
  rejected: 'danger',
  pending: 'warning',
};

const PROSPECT_TONE: Record<string, BadgeTone> = {
  new: 'accent',
  contacted: 'neutral',
  negotiating: 'warning',
  converted: 'success',
  lost: 'danger',
};

// Botão de ícone de ação em tabela (a cor vem junto, por uso)
const ICON_BTN = 'inline-flex items-center justify-center p-1.5 rounded-lg transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60';
const CHECKBOX = 'h-4 w-4 cursor-pointer rounded-sm accent-accent';
// Campos inline das tabelas: compactos, sublinhado discreto, foco verde
const INLINE_INPUT = 'w-full bg-transparent border-b border-tint/15 hover:border-tint/25 focus:border-accent/60 px-1 py-0.5 text-fg placeholder:text-fg-subtle outline-hidden transition-colors';
const INLINE_SELECT = 'bg-elevated border border-tint/15 rounded-md px-2 py-1 text-xs text-fg outline-hidden focus:border-accent/60 focus:ring-1 focus:ring-accent/30 cursor-pointer';

interface AdminPanelProps {
  onBack?: () => void;
  onShowTour?: () => void;
}

type LegacyItem = { id: string; title: string; type: 'Artigo' | 'Produto'; url: string };

// URLs de imagem ainda apontando para os hosts antigos (antes do Storage).
function findLegacyItems(articlesData: any[], productsData: any[]): LegacyItem[] {
    const legacy: LegacyItem[] = [];
    const legacyPattern = /sslip\.io|tradexperience\.com\.br\/wp-content/;

    articlesData.forEach(a => {
        if (a.image_url?.match(legacyPattern)) legacy.push({ id: a.id, title: a.title, type: 'Artigo', url: a.image_url });
        a.gallery_urls?.forEach((url: string) => {
            if (url.match(legacyPattern)) legacy.push({ id: a.id, title: `${a.title} (Galeria)`, type: 'Artigo', url });
        });
    });

    productsData.forEach(p => {
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

    return legacy;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBack, onShowTour }) => {
  const [activeTab, setActiveTab] = useState<'licenses' | 'partners' | 'prospects' | 'users' | 'content' | 'market' | 'automation' | 'live_room'>('licenses');
  const [activeLicenseSubTab, setActiveLicenseSubTab] = useState<'AFK TRADER' | 'SNOW BALL' | 'BOLETA PRO' | 'FX SQUAD'>('AFK TRADER');
  const [licenses, setLicenses] = useState<LicenseRequest[]>([]);
  const [partners, setPartners] = useState<Profile[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [partnerRequests, setPartnerRequests] = useState<PartnerRequest[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [robots, setRobots] = useState<Robot[]>([]);
  const [storageFiles, setStorageFiles] = useState<StorageFile[]>([]);
  const [legacyItems, setLegacyItems] = useState<LegacyItem[]>([]);
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
  const [viewingProspect, setViewingProspect] = useState<Prospect | null>(null);

  const handleUpdateField = async (id: string, field: keyof Prospect, value: string) => {
      setProspects(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
      if (viewingProspect && viewingProspect.id === id) {
          setViewingProspect({ ...viewingProspect, [field]: value });
      }
      try {
          const { error } = await supabase.from('prospects').update({ [field]: value }).eq('id', id);
          if (error) throw error;
      } catch (err: any) {
          console.error(err);
          alert('Erro ao atualizar: ' + err.message);
      }
  };

  const handleDeleteProspect = async (id: string) => {
    if (!window.confirm('Excluir este prospecto?')) return;
    try {
        const { error } = await supabase.from('prospects').delete().eq('id', id);
        if (error) throw error;
        setProspects(prev => prev.filter(p => p.id !== id));
        setViewingProspect(null);
    } catch (err: any) {
        alert('Erro ao excluir: ' + err.message);
    }
  };

  const handleProspectStatus = async (id: string, status: Prospect['status']) => {
    try {
        const { error } = await supabase.from('prospects').update({ status }).eq('id', id);
        if (error) throw error;
        setProspects(prev => prev.map(p => p.id === id ? { ...p, status } : p));
        if (viewingProspect && viewingProspect.id === id) {
            setViewingProspect({ ...viewingProspect, status });
        }
    } catch (err: any) {
        console.error('Error updating status:', err);
        alert('Erro ao atualizar status: ' + err.message);
    }
  };

  // Uma chamada de cada por troca de aba. Os itens legados são calculados no
  // próprio fetchData (aba content), a partir dos artigos/produtos já lidos.
  useEffect(() => {
    fetchData();
    fetchStorageStats();
    if (activeTab === 'content') fetchStorageFiles();
  }, [activeTab, activeLicenseSubTab]);

  const getLicenseTableName = () => {
    if (activeLicenseSubTab === 'SNOW BALL') return 'license_requests_snowball';
    if (activeLicenseSubTab === 'BOLETA PRO') return 'license_requests_boletapro';
    if (activeLicenseSubTab === 'FX SQUAD') return 'license_requests_fxsquad';
    return 'license_requests';
  };

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
        const tableName = getLicenseTableName();
        const { data, error } = await supabase
          .from(tableName)
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
        const { data: prospectsData, error } = await supabase
          .from('prospects')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setProspects(prospectsData as (Prospect & { profiles?: { full_name: string } })[] || []);
      } else if (activeTab === 'content') {
        const { data: articlesData, error: articlesError } = await supabase
          .from('articles')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (articlesError) throw articlesError;
        setArticles(articlesData as Article[] || []);

        // Todos os produtos numa consulta só: os EAs viram a lista de robôs e o
        // conjunto inteiro alimenta a busca de URLs legadas.
        const { data: productsData, error: robotsError } = await supabase
          .from('products')
          .select('*')
          .order('title', { ascending: true });
        
        if (robotsError) throw robotsError;
        setLegacyItems(findLegacyItems(articlesData || [], productsData || []));
        const robotsData = (productsData || []).filter((item: any) => item.type === 'ea');
        
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
    fetchCurrentUser();
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

        const aRaw = (a as any)[sortConfig.key];
        const bRaw = (b as any)[sortConfig.key];

        if (sortConfig.key === 'created_at' || sortConfig.key === 'last_login') {
            const aTime = aRaw ? new Date(aRaw).getTime() : 0;
            const bTime = bRaw ? new Date(bRaw).getTime() : 0;
            return sortConfig.direction === 'asc' ? aTime - bTime : bTime - aTime;
        }

        const aValue = (aRaw ?? '').toString().toLowerCase();
        const bValue = (bRaw ?? '').toString().toLowerCase();

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
        if (sortConfig.key === 'role') {
            const roleOrder = { 'admin': 0, 'first_mate': 1, 'partner': 2, 'client': 3 };
            const aOrder = roleOrder[a.role as keyof typeof roleOrder] ?? 4;
            const bOrder = roleOrder[b.role as keyof typeof roleOrder] ?? 4;

            if (aOrder < bOrder) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aOrder > bOrder) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        }

        const aRaw = (a as any)[sortConfig.key];
        const bRaw = (b as any)[sortConfig.key];

        if (sortConfig.key === 'created_at' || sortConfig.key === 'last_login') {
            const aTime = aRaw ? new Date(aRaw).getTime() : 0;
            const bTime = bRaw ? new Date(bRaw).getTime() : 0;
            return sortConfig.direction === 'asc' ? aTime - bTime : bTime - aTime;
        }

        const aValue = (aRaw ?? '').toString().toLowerCase();
        const bValue = (bRaw ?? '').toString().toLowerCase();

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
      
      const tableName = getLicenseTableName();
      const { error } = await supabase.from(tableName).update(updateData).eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error: any) {
      console.error('Error updating license:', error);
      alert('Erro ao atualizar licença: ' + error.message);
    }
  };

  const handleUpdateLicenseAccount = async (id: string) => {
    if (!editLicenseValue) return;
    try {
      const tableName = getLicenseTableName();
      const { error } = await supabase
        .from(tableName)
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
      const tableName = getLicenseTableName();
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) throw error;
      setLicenses(prev => prev.filter(l => l.id !== id));
    } catch (error: any) {
      alert('Erro ao excluir licença: ' + error.message);
    }
  };

  const handleUpdateLicenseExpiration = async (id: string, date: string) => {
      try {
          const tableName = getLicenseTableName();
          const { error } = await supabase
            .from(tableName)
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
          const tableName = getLicenseTableName();
          const { error } = await supabase
            .from(tableName)
            .update({ notes })
            .eq('id', id);
          
          if (error) throw error;
          setLicenses(prev => prev.map(l => l.id === id ? { ...l, notes } : l));
      } catch (error: any) {
          console.error('Erro ao atualizar observação:', error);
          alert('Erro ao atualizar observação: ' + error.message);
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

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('TEM CERTEZA? Isso excluirá permanentemente o perfil e todas as licenças do usuário. Esta ação não tem volta.')) return;
    
    setLoading(true);
    try {
        const { error: licensesError } = await supabase.from('license_requests').delete().eq('user_id', userId);
        if (licensesError) throw licensesError;
        const { error: requestsError } = await supabase.from('partner_requests').delete().eq('user_id', userId);
        if (requestsError) throw requestsError;
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
        <Card className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <button
              onClick={() => setSelectedUser(null)}
              className="shrink-0 p-2.5 rounded-xl text-fg-muted hover:text-fg hover:bg-tint/5 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
              title="Voltar para a lista"
            >
              <ArrowLeft size={22} />
            </button>
            <div className="min-w-0">
              <h2 className="font-display text-xl sm:text-2xl font-semibold text-fg leading-tight truncate">{user.full_name || 'Usuário'}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                 <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-widest border ${ROLE_BADGE[user.role] ?? ROLE_BADGE.client}`}>
                    {user.role}
                 </span>
                 <span className="text-xs text-fg-subtle font-mono tabular-nums">ID: {user.id.slice(0, 8)}...</span>
              </div>
            </div>
          </div>
          <Button
            variant="danger"
            onClick={() => handleDeleteUser(user.id)}
            className="w-full md:w-auto whitespace-normal text-center"
          >
            <Trash2 size={18} /> Excluir permanentemente este registro
          </Button>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="space-y-4">
            <h3 className="font-display font-semibold text-fg border-b border-tint/6 pb-3 flex items-center gap-2">
              <User size={18} className="text-accent-fg" /> Informações
            </h3>
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <span className="eyebrow-muted">Email</span>
                <span className="text-fg font-medium break-all">{user.email}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="eyebrow-muted">Membro Desde</span>
                <span className="text-fg font-mono tabular-nums whitespace-nowrap">{new Date(user.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="eyebrow-muted">Último Acesso</span>
                <span className="text-fg font-mono tabular-nums whitespace-nowrap">
                   {(user as any).last_login ? new Date((user as any).last_login).toLocaleString() : 'Sem registros'}
                </span>
              </div>
            </div>
          </Card>

          {/* Coins do usuário — ver saldo e atribuir manualmente (admin) */}
          <UserCoinsCard userId={user.id} />

          <Card className="md:col-span-3 space-y-4">
            <h3 className="font-display font-semibold text-fg border-b border-tint/6 pb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-accent-fg" /> Licenças Ativas
              </div>
              <Badge className="uppercase">{userLicenses.length} Ativas</Badge>
            </h3>
            {userLicenses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {userLicenses.map(lic => (
                  <div key={lic.id} className="flex items-center justify-between gap-3 p-4 bg-tint/3 rounded-xl border border-tint/6 hover:border-accent/30 transition-colors group">
                    <div className="min-w-0">
                      <div className="font-mono tabular-nums whitespace-nowrap font-semibold text-fg text-lg">{lic.mt5_account}</div>
                      <div className="eyebrow-muted truncate">{lic.license_title || 'Expert Advisor'}</div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1 shrink-0">
                      <Badge tone={LICENSE_TONE[lic.status] ?? 'warning'} className="uppercase tracking-widest text-[10px]">
                        {lic.status}
                      </Badge>
                      <div className="text-[10px] text-fg-subtle font-mono tabular-nums whitespace-nowrap">Validade: {lic.expires_at ? new Date(lic.expires_at).toLocaleDateString() : 'Vitalicío'}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={Activity} title="Nenhuma licença encontrada" className="border-0 py-12" />
            )}
          </Card>
        </div>

        <Card className="space-y-6">
            <h3 className="font-display font-semibold text-fg border-b border-tint/6 pb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-accent-fg" /> Lista de Prospectos (CRM)
              </div>
              <Badge className="uppercase">Visualização de Admin</Badge>
            </h3>

            <Table>
                <THead>
                    <tr>
                        <TH className="px-6">Nome</TH>
                        <TH className="px-6">Contato</TH>
                        <TH className="px-6">Status</TH>
                        <TH className="px-6">Anotações</TH>
                    </tr>
                </THead>
                <TBody>
                    {prospects.map(p => (
                        <TR key={p.id} className="group">
                            <TD className="px-6">
                                <button
                                  onClick={() => setViewingProspect(p)}
                                  className="text-left group/prospect rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                                >
                                  <div className="font-semibold text-fg group-hover/prospect:text-accent-fg transition-colors">{p.full_name}</div>
                                  <div className="text-[10px] text-fg-subtle">Ver detalhes</div>
                                </button>
                            </TD>
                            <TD className="px-6">
                                <div className="text-fg-muted font-medium">{p.email || '-'}</div>
                                <div className="text-[10px] text-fg-subtle font-mono tabular-nums whitespace-nowrap">{p.phone || '-'}</div>
                            </TD>
                            <TD className="px-6">
                                <Badge tone={PROSPECT_TONE[p.status] ?? 'neutral'} className="uppercase tracking-widest text-[10px]">
                                    {p.status}
                                </Badge>
                            </TD>
                            <TD className="px-6 max-w-xs">
                                <p className="text-xs text-fg-muted line-clamp-2 italic">{p.notes || 'Sem observações'}</p>
                            </TD>
                        </TR>
                    ))}
                    {prospects.filter(p => p.assigned_to === user.id).length === 0 && (
                        <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-fg-subtle font-medium uppercase text-xs tracking-widest">Nenhum prospecto disponível para este usuário</td>
                        </tr>
                    )}
                </TBody>
            </Table>
        </Card>
      </div>
    );
  };

  const renderProspectDetail = (prospect: Prospect) => {
    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-300 pb-20 mt-8">
            <div className="flex flex-wrap items-center justify-between gap-4 sm:px-4">
                <div className="flex min-w-0 items-center gap-4">
                    <button
                        onClick={() => setViewingProspect(null)}
                        className="shrink-0 p-2.5 bg-tint/3 border border-tint/10 rounded-xl text-fg-muted hover:text-fg hover:border-accent/40 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="min-w-0">
                        <h2 className="font-display text-xl sm:text-2xl font-semibold text-fg mb-1 truncate">{prospect.full_name}</h2>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={PROSPECT_TONE[prospect.status] ?? 'neutral'} className="uppercase tracking-widest text-[10px]">
                                {prospect.status}
                            </Badge>
                            <span className="text-fg-subtle text-[10px] font-medium uppercase tracking-tight">
                                Cadastrado em: <span className="font-mono tabular-nums">{new Date(prospect.created_at).toLocaleDateString('pt-BR')}</span>
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteProspect(prospect.id)}
                    >
                        <Trash2 size={16} /> Excluir
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 sm:px-4">
                {/* Info Cards */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="space-y-6">
                        <h4 className="eyebrow-muted">Informações de Contato</h4>

                        <div className="space-y-4">
                            <div className="p-4 bg-tint/3 rounded-xl border border-tint/6">
                                <label className="eyebrow-muted mb-1 block">E-mail</label>
                                <div className="flex items-center gap-3 text-fg">
                                    <Mail size={18} className="text-accent-fg shrink-0" />
                                    <span className="font-medium break-all">{prospect.email || 'Não informado'}</span>
                                </div>
                            </div>

                            <div className="p-4 bg-tint/3 rounded-xl border border-tint/6">
                                <label className="eyebrow-muted mb-1 block">Telefone / WhatsApp</label>
                                <div className="flex items-center gap-3 text-fg">
                                    <Phone size={18} className="text-accent-fg shrink-0" />
                                    <span className="font-mono tabular-nums">{prospect.phone || 'Não informado'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-tint/6">
                            <label className="eyebrow-muted mb-3 block">Modificar Status</label>
                            <Select
                                value={prospect.status}
                                onChange={(e) => handleProspectStatus(prospect.id, e.target.value as any)}
                                className="font-semibold uppercase tracking-widest"
                            >
                                <option value="new">Novo Lead</option>
                                <option value="contacted">Contatado</option>
                                <option value="negotiating">Negociando</option>
                                <option value="converted">Convertido</option>
                                <option value="lost">Perdido</option>
                            </Select>
                        </div>
                    </Card>
                </div>

                {/* Notes/Detailed Area */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="h-full flex flex-col">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
                            <h4 className="eyebrow-muted">Área de Trabalho / Anotações</h4>
                            <div className="flex items-center gap-2 text-fg-subtle text-[10px] font-medium">
                                <Calendar size={14} /> Atualização em Tempo Real
                            </div>
                        </div>

                        <Textarea
                            className="flex-1 p-5 sm:p-6 rounded-xl leading-relaxed resize-none min-h-[400px]"
                            placeholder="Adicione observações administrativas aqui..."
                            defaultValue={prospect.notes}
                            onBlur={(e) => handleUpdateField(prospect.id, 'notes', e.target.value)}
                        />

                        <div className="mt-6 flex items-center gap-3 p-4 bg-accent/10 border border-accent/20 rounded-xl text-accent-fg text-xs font-medium">
                            <Save size={16} className="shrink-0" /> Suas anotações são salvas assim que você clica fora da área de texto.
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="space-y-6">
      {viewingProspect ? (
          renderProspectDetail(viewingProspect)
      ) : selectedUser ? (
        renderUserDetails(selectedUser)
      ) : (
        <>
          <PageHeader
            className="mb-0 sm:mb-0"
            leading={onBack && <BackButton onClick={onBack} />}
            title="Painel Administrativo"
            description="Gerencie usuários, licenças e conteúdo."
            actions={onShowTour && (
              <Button variant="secondary" size="sm" onClick={onShowTour}>
                <Play size={16} fill="currentColor" /> Ver Tour
              </Button>
            )}
          />

          <Tabs
            aria-label="Seções do painel administrativo"
            value={activeTab}
            onChange={setActiveTab}
            items={[
              { key: 'licenses', label: 'Licenças' },
              { key: 'partners', label: 'Parceiros' },
              { key: 'users', label: 'Usuários' },
              { key: 'prospects', label: 'Prospectos' },
              { key: 'content', label: 'Storage' },
              { key: 'market', label: 'Market' },
              { key: 'automation', label: 'Automação IA' },
              { key: 'live_room', label: 'Sala ao Vivo' },
            ]}
          />

          {(activeTab === 'licenses' || activeTab === 'partners' || activeTab === 'users' || activeTab === 'prospects') && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" size={18} aria-hidden />
                <Input
                  type="text"
                  placeholder={activeTab === 'licenses' ? "Buscar por nome, email ou conta MT5..." : "Buscar por nome, email ou telefone..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {activeTab === 'licenses' && (
                <Tabs
                  aria-label="Produto da licença"
                  value={activeLicenseSubTab}
                  onChange={setActiveLicenseSubTab}
                  items={(['AFK TRADER', 'SNOW BALL', 'BOLETA PRO', 'FX SQUAD'] as const).map((tab) => ({ key: tab, label: tab }))}
                />
              )}
            </div>
          )}

      <div className="bg-surface border border-tint/8 rounded-2xl overflow-hidden">
        {errorMsg && (
          <div className="p-4 bg-danger/10 text-danger-fg border-b border-danger/20 text-sm" role="alert">
            Erro: {errorMsg}
          </div>
        )}
        {loading ? (
            <div className="p-6 space-y-3" role="status">
              <span className="sr-only">Carregando dados...</span>
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-3/4" />
            </div>
        ) : activeTab === 'licenses' ? (
          <Table wrapperClassName="rounded-none border-0">
              <THead>
                <tr>
                  <TH className="px-6">Usuário</TH>
                  <TH className="px-6">Título</TH>
                  <TH className="px-6">Conta</TH>
                  <TH
                    className="px-6 cursor-pointer hover:text-fg transition-colors"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center gap-1">
                        Data
                        {sortConfig?.key === 'created_at' ? (
                            sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        ) : (
                            <ArrowUpDown size={14} className="opacity-60" />
                        )}
                    </div>
                  </TH>
                  <TH className="px-6">Validade</TH>
                  <TH className="px-6">Observação</TH>
                  <TH className="px-6">Status</TH>
                  <TH className="px-6" align="right">Ações</TH>
                </tr>
              </THead>
              <TBody>
                {sortedLicenses.map((lic) => (
                  <TR key={lic.id}>
                    <TD className="px-6">
                        <div className="font-medium text-fg">
                            {lic.profiles?.full_name || 'Usuário'}
                        </div>
                        <div className="text-xs text-fg-muted">
                            {lic.profiles?.email}
                        </div>
                    </TD>
                    <TD className="px-6">
                        {editingLicenseId === lic.id ? (
                            <select
                                value={editLicenseTitle}
                                onChange={(e) => setEditLicenseTitle(e.target.value)}
                                className="bg-elevated border border-tint/15 rounded-md px-2 py-1 text-[10px] font-semibold uppercase text-fg focus:border-accent/60 focus:ring-1 focus:ring-accent/30 outline-hidden"
                            >
                                {titles.map(t => (
                                    <option key={t.id} value={t.name}>{t.name}</option>
                                ))}
                                {titles.length === 0 && <option value="MT5">MT5</option>}
                            </select>
                        ) : (
                            <Badge className="uppercase tracking-wider text-[10px]">
                                {lic.license_title || 'MT5'}
                            </Badge>
                        )}
                    </TD>
                    <TD className="px-6 font-mono tabular-nums whitespace-nowrap text-fg">
                        {editingLicenseId === lic.id ? (
                            <input
                                type="text"
                                value={editLicenseValue}
                                onChange={(e) => setEditLicenseValue(e.target.value)}
                                className="w-32 bg-transparent border-b border-tint/15 hover:border-tint/25 focus:border-accent/60 px-1 py-1 text-xs font-mono tabular-nums text-fg outline-hidden"
                                autoFocus
                            />
                        ) : (
                            lic.mt5_account
                        )}
                    </TD>
                    <TD className="px-6 font-mono tabular-nums whitespace-nowrap text-xs">{new Date(lic.created_at).toLocaleDateString()}</TD>
                    <TD className="px-6">
                        <div className="flex items-center gap-2">
                           <Calendar size={14} className="text-fg-subtle shrink-0" />
                           <input
                                type="date"
                                className="bg-transparent border-b border-transparent hover:border-tint/15 focus:border-accent/60 text-xs text-fg font-mono tabular-nums outline-hidden cursor-pointer"
                                defaultValue={lic.expires_at ? lic.expires_at.split('T')[0] : ''}
                                onChange={(e) => handleUpdateLicenseExpiration(lic.id, e.target.value)}
                           />
                        </div>
                    </TD>
                    <TD className="px-6 min-w-40">
                        <input
                            type="text"
                            className="bg-transparent border-b border-transparent hover:border-tint/15 focus:border-accent/60 text-xs text-fg placeholder:text-fg-subtle w-full outline-hidden"
                            placeholder="Adicionar nota..."
                            defaultValue={lic.notes || ''}
                            onBlur={(e) => handleUpdateLicenseNotes(lic.id, e.target.value)}
                        />
                    </TD>
                    <TD className="px-6">
                      <Badge tone={LICENSE_TONE[lic.status] ?? 'warning'} className="capitalize">
                        {lic.status}
                      </Badge>
                    </TD>
                    <TD className="px-6" align="right">
                      <div className="flex justify-end gap-1">
                        {editingLicenseId === lic.id ? (
                          <>
                            <button
                              onClick={() => handleUpdateLicenseAccount(lic.id)}
                              className={`${ICON_BTN} text-success-fg hover:bg-success/10`} title="Salvar">
                              <CheckCircle size={18} />
                            </button>
                            <button
                              onClick={() => setEditingLicenseId(null)}
                              className={`${ICON_BTN} text-fg-subtle hover:text-fg hover:bg-tint/5`} title="Cancelar">
                              <XCircle size={18} />
                            </button>
                          </>
                        ) : (
                            <>
                               {lic.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleLicenseAction(lic.id, 'approved')}
                                    className={`${ICON_BTN} text-success-fg hover:bg-success/10`} title="Aprovar">
                                    <CheckCircle size={18} />
                                  </button>
                                  <button
                                    onClick={() => handleLicenseAction(lic.id, 'rejected')}
                                    className={`${ICON_BTN} text-danger-fg hover:bg-danger/10`} title="Rejeitar">
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
                                 className={`${ICON_BTN} text-fg-subtle hover:text-fg hover:bg-tint/5`} title="Editar Conta">
                                <Edit2 size={18} />
                              </button>
                              <button
                                onClick={() => handleDeleteLicense(lic.id)}
                                className={`${ICON_BTN} text-fg-subtle hover:text-danger-fg hover:bg-danger/10`} title="Excluir Licença">
                                <Trash2 size={18} />
                              </button>
                            </>
                        )}
                      </div>
                    </TD>
                  </TR>
                ))}
                {licenses.length === 0 && (
                    <tr><td colSpan={8} className="px-6 py-8 text-center text-fg-muted">Nenhuma solicitação encontrada.</td></tr>
                )}
              </TBody>
          </Table>
        ) : activeTab === 'partners' ? (
          <div className="space-y-6">
            <div className="p-4 sm:p-6 pb-0 sm:pb-0">
              <PartnerApplications search={searchTerm} />
            </div>

            {partnerRequests.length > 0 && (
                <div className="bg-warning/5 border-b border-warning/20">
                    <div className="px-6 py-4 border-b border-warning/20">
                        <h3 className="text-sm font-semibold text-warning-fg flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                            Solicitações Pendentes
                        </h3>
                    </div>
                    <Table wrapperClassName="rounded-none border-0">
                            <THead className="bg-transparent">
                                <tr>
                                    <TH className="px-6">Usuário</TH>
                                    <TH className="px-6">Solicitado em</TH>
                                    <TH className="px-6" align="right">Ação</TH>
                                </tr>
                            </THead>
                            <TBody className="divide-warning/15">
                                {partnerRequests.map(req => (
                                    <TR key={req.id} className="hover:bg-warning/5">
                                        <TD className="px-6 text-fg font-medium">
                                            {req.profiles?.full_name}
                                            <div className="text-xs text-fg-muted font-normal">{req.profiles?.email}</div>
                                        </TD>
                                        <TD className="px-6 font-mono tabular-nums whitespace-nowrap text-xs">{new Date(req.created_at).toLocaleDateString()}</TD>
                                        <TD className="px-6" align="right">
                                             <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    className="h-8 px-3 text-xs"
                                                    onClick={() => handlePartnerRequestAction(req, 'approved')}
                                                >
                                                    Aprovar
                                                </Button>
                                                <Button
                                                    variant="danger"
                                                    size="sm"
                                                    className="h-8 px-3 text-xs"
                                                    onClick={() => handlePartnerRequestAction(req, 'rejected')}
                                                >
                                                    Recusar
                                                </Button>
                                            </div>
                                        </TD>
                                    </TR>
                                ))}
                            </TBody>
                    </Table>
                </div>
            )}

            <Table wrapperClassName="rounded-none border-0">
                <THead>
                    <tr>
                    <TH className="px-4">
                        <input
                          type="checkbox"
                          onChange={() => toggleSelectAll(sortedPartners.map(p => p.id))}
                          checked={selectedIds.length > 0 && selectedIds.length === sortedPartners.length}
                          className={CHECKBOX}
                          aria-label="Selecionar todos"
                        />
                    </TH>
                    <TH
                        className="px-6 cursor-pointer hover:text-fg transition-colors"
                        onClick={() => handleSort('full_name')}
                    >
                        <div className="flex items-center gap-1">
                            Parceiro
                            {sortConfig?.key === 'full_name' ? (
                                sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                            ) : (
                                <ArrowUpDown size={14} className="opacity-60" />
                            )}
                        </div>
                    </TH>
                    <TH
                        className="px-6 cursor-pointer hover:text-fg transition-colors"
                        onClick={() => handleSort('email')}
                    >
                        <div className="flex items-center gap-1">
                            Email
                            {sortConfig?.key === 'email' ? (
                                sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                            ) : (
                                <ArrowUpDown size={14} className="opacity-60" />
                            )}
                        </div>
                    </TH>
                    <TH
                        className="px-6 cursor-pointer hover:text-fg transition-colors"
                        onClick={() => handleSort('last_login')}
                    >
                        <div className="flex items-center gap-1">
                            Último Login
                            {sortConfig?.key === 'last_login' ? (
                                sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                            ) : (
                                <ArrowUpDown size={14} className="opacity-60" />
                            )}
                        </div>
                    </TH>
                    <TH
                        className="px-6 cursor-pointer hover:text-fg transition-colors"
                        onClick={() => handleSort('created_at')}
                    >
                        <div className="flex items-center gap-1">
                            Desde
                            {sortConfig?.key === 'created_at' ? (
                                sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                            ) : (
                                <ArrowUpDown size={14} className="opacity-60" />
                            )}
                        </div>
                    </TH>
                    <TH
                        className="px-6 cursor-pointer hover:text-fg transition-colors"
                        onClick={() => handleSort('role')}
                    >
                        <div className="flex items-center gap-1">
                            Função
                            {sortConfig?.key === 'role' ? (
                                sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                            ) : (
                                <ArrowUpDown size={14} className="opacity-60" />
                            )}
                        </div>
                    </TH>
                    <TH className="px-6" align="right">Ações</TH>
                    </tr>
                </THead>
                <TBody>
                    {sortedPartners.map((partner) => (
                    <TR key={partner.id}>
                        <TD className="px-4">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(partner.id)}
                              onChange={() => toggleSelect(partner.id)}
                              className={CHECKBOX}
                            />
                        </TD>
                        <TD className="px-6">
                           <button
                             onClick={() => setSelectedUser(partner)}
                             className="text-left transition-colors group rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                           >
                             <div className="font-semibold text-fg group-hover:text-accent-fg group-hover:underline">{partner.full_name || 'Usuário'}</div>
                             <div className="text-[10px] text-fg-subtle font-normal">Clique para ver detalhes</div>
                           </button>
                        </TD>
                        <TD className="px-6 text-fg-muted font-medium">{partner.email}</TD>
                        <TD className="px-6 font-mono tabular-nums whitespace-nowrap text-xs">
                          {(partner as any).last_login ? new Date((partner as any).last_login).toLocaleString() : '---'}
                        </TD>
                        <TD className="px-6 font-mono tabular-nums whitespace-nowrap text-xs">{new Date(partner.created_at).toLocaleDateString()}</TD>
                        <TD className="px-6">
                        {editingUserRole === partner.id ? (
                            <select
                            value={partner.role}
                            onChange={(e) => handleUpdateUserRole(partner.id, e.target.value)}
                            className={INLINE_SELECT}
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
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase border flex items-center gap-1 whitespace-nowrap hover:opacity-80 transition-opacity focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60 ${ROLE_BADGE[partner.role] ?? ROLE_BADGE.client}`}
                            >
                            {partner.role === 'first_mate' && <Anchor size={12} />}
                            {partner.role === 'admin' && <Crown size={12} />}
                            {partner.role}
                            </button>
                        )}
                        </TD>
                        <TD className="px-6" align="right">
                        <button
                            onClick={() => setEditingUserRole(partner.id)}
                            className={`${ICON_BTN} text-fg-subtle hover:text-fg hover:bg-tint/5`}
                            title="Alterar Função"
                        >
                            <Edit2 size={16} />
                        </button>
                        </TD>
                    </TR>
                    ))}
                </TBody>
            </Table>
          </div>
        ) : activeTab === 'users' ? (
          <Table wrapperClassName="rounded-none border-0">
              <THead>
                <tr>
                  <TH className="px-4" align="center">
                    <input
                      type="checkbox"
                      onChange={() => toggleSelectAll(sortedUsers.map(u => u.id))}
                      checked={selectedIds.length > 0 && selectedIds.length === sortedUsers.length}
                      className={CHECKBOX}
                      aria-label="Selecionar todos"
                    />
                  </TH>
                  <TH
                    className="px-6 cursor-pointer hover:text-fg transition-colors"
                    onClick={() => handleSort('full_name')}
                  >
                    <div className="flex items-center gap-1">
                        Nome
                        {sortConfig?.key === 'full_name' ? (
                            sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        ) : (
                            <ArrowUpDown size={14} className="opacity-60" />
                        )}
                    </div>
                  </TH>
                  <TH
                    className="px-6 cursor-pointer hover:text-fg transition-colors"
                    onClick={() => handleSort('email')}
                  >
                    <div className="flex items-center gap-1">
                        Email
                        {sortConfig?.key === 'email' ? (
                            sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        ) : (
                            <ArrowUpDown size={14} className="opacity-60" />
                        )}
                    </div>
                  </TH>
                  <TH
                    className="px-6 cursor-pointer hover:text-fg transition-colors"
                    onClick={() => handleSort('last_login')}
                  >
                    <div className="flex items-center gap-1">
                        Último Login
                        {sortConfig?.key === 'last_login' ? (
                            sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        ) : (
                            <ArrowUpDown size={14} className="opacity-60" />
                        )}
                    </div>
                  </TH>
                  <TH
                    className="px-6 cursor-pointer hover:text-fg transition-colors"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center gap-1">
                        Cadastro
                        {sortConfig?.key === 'created_at' ? (
                            sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        ) : (
                            <ArrowUpDown size={14} className="opacity-60" />
                        )}
                    </div>
                  </TH>
                  <TH
                    className="px-6 cursor-pointer hover:text-fg transition-colors"
                    onClick={() => handleSort('role')}
                  >
                    <div className="flex items-center gap-1">
                        Função
                        {sortConfig?.key === 'role' ? (
                            sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        ) : (
                            <ArrowUpDown size={14} className="opacity-60" />
                        )}
                    </div>
                  </TH>
                  <TH className="px-6" align="right">Ações</TH>
                </tr>
              </THead>
              <TBody>
                {sortedUsers.map((user) => (
                  <TR key={user.id}>
                    <TD className="px-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(user.id)}
                          onChange={() => toggleSelect(user.id)}
                          className={CHECKBOX}
                        />
                    </TD>
                    <TD className="px-6">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="flex items-center gap-3 text-left transition-colors group rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                        >
                          <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 text-accent-fg flex items-center justify-center shrink-0">
                             <User size={16} />
                          </div>
                          <div>
                            <div className="font-semibold text-fg group-hover:text-accent-fg group-hover:underline leading-none">{user.full_name || 'Sem nome'}</div>
                            <span className="text-[10px] text-fg-subtle font-normal">Ver detalhes</span>
                          </div>
                        </button>
                    </TD>
                    <TD className="px-6 text-fg-muted font-medium">{user.email}</TD>
                    <TD className="px-6 font-mono tabular-nums whitespace-nowrap text-xs">
                      {(user as any).last_login ? new Date((user as any).last_login).toLocaleString() : '---'}
                    </TD>
                    <TD className="px-6 font-mono tabular-nums whitespace-nowrap text-xs">{new Date(user.created_at).toLocaleDateString()}</TD>
                    <TD className="px-6">
                      {editingUserRole === user.id ? (
                        <select
                          value={user.role}
                          onChange={(e) => handleUpdateUserRole(user.id, e.target.value)}
                          className={INLINE_SELECT}
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
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase border flex items-center gap-1 whitespace-nowrap hover:opacity-80 transition-opacity focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60 ${ROLE_BADGE[user.role] ?? ROLE_BADGE.client}`}
                        >
                          {user.role === 'first_mate' && <Anchor size={12} />}
                          {user.role === 'admin' && <Crown size={12} />}
                          {user.role}
                        </button>
                      )}
                    </TD>
                    <TD className="px-6" align="right">
                       <button
                          onClick={() => setEditingUserRole(user.id)}
                          className={`${ICON_BTN} text-fg-subtle hover:text-fg hover:bg-tint/5`}
                          title="Alterar Função"
                       >
                         <Edit2 size={16} />
                       </button>
                    </TD>
                  </TR>
                ))}
              </TBody>
          </Table>
        ) : activeTab === 'prospects' ? (
          <div>
            <div className="p-4 border-b border-tint/6 flex flex-wrap justify-between items-center gap-3 bg-tint/2">
               <h3 className="font-display font-semibold text-fg">Lista de Prospectos</h3>
               <Button
                  size="sm"
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
               >
                  <Plus size={16} /> Novo
               </Button>
            </div>
            <Table wrapperClassName="rounded-none border-0">
                <THead>
                  <tr>
                    <TH className="px-6 w-[20%]">Prospecto</TH>
                    <TH className="px-6 w-[20%]">Contato</TH>
                    <TH className="px-6 w-[15%]">Responsável</TH>
                    <TH className="px-6 w-[15%]">Status</TH>
                    <TH className="px-6 w-[20%]">Anotações</TH>
                    <TH className="px-6 w-[10%]" align="right">Ações</TH>
                  </tr>
                </THead>
                <TBody>
                  {prospects.filter(p => {
                      if (!searchTerm) return true;
                      const term = searchTerm.toLowerCase();
                      return p.full_name.toLowerCase().includes(term) || p.email.toLowerCase().includes(term) || p.phone.includes(term);
                  }).map(prospect => (
                      <TR key={prospect.id} className="group">
                          <TD className="px-6 align-top min-w-40">
                              {editingProspect === prospect.id ? (
                                  <input autoFocus className={`${INLINE_INPUT} font-semibold`} defaultValue={prospect.full_name} onChange={(e) => handleUpdateField(prospect.id, 'full_name', e.target.value)} />
                              ) : (
                                <button
                                  onClick={() => setViewingProspect(prospect)}
                                  className="text-left group/admin-prospect rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                                >
                                  <div className="font-semibold text-fg group-hover/admin-prospect:text-accent-fg transition-colors">{prospect.full_name}</div>
                                  <div className="text-[10px] text-fg-subtle mt-1">Ver detalhado</div>
                                </button>
                              )}
                          </TD>
                          <TD className="px-6 align-top min-w-48">
                              <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-2 text-fg-muted">
                                     <Mail size={14} className="shrink-0" />
                                     {editingProspect === prospect.id ? (
                                         <input className={`${INLINE_INPUT} text-xs`} defaultValue={prospect.email} onChange={(e) => handleUpdateField(prospect.id, 'email', e.target.value)} />
                                     ) : ( <a href={`mailto:${prospect.email}`} className="truncate hover:text-accent-fg transition-colors">{prospect.email || 'Sem email'}</a> )}
                                  </div>
                                  <div className="flex items-center gap-2 text-fg-muted">
                                     <Phone size={14} className="shrink-0" />
                                     {editingProspect === prospect.id ? (
                                         <input className={`${INLINE_INPUT} text-xs font-mono tabular-nums`} defaultValue={prospect.phone} onChange={(e) => handleUpdateField(prospect.id, 'phone', e.target.value)} />
                                     ) : ( <a href={`https://wa.me/${prospect.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="font-mono tabular-nums whitespace-nowrap hover:text-accent-fg transition-colors">{prospect.phone || 'Sem telefone'}</a> )}
                                  </div>
                              </div>
                          </TD>
                           <TD className="px-6 align-top">
                               <div className="text-xs font-medium text-fg">
                                   {(prospect as any).profiles?.full_name || 'Admin / Sem Atribuição'}
                               </div>
                           </TD>
                           <TD className="px-6 align-top">
                                <select
                                   value={prospect.status}
                                   onChange={(e) => handleProspectStatus(prospect.id, e.target.value as Prospect['status'])}
                                   className={`${INLINE_SELECT} w-full py-1.5 font-mono tracking-tighter`}
                                >
                                    <option value="new">NOVO</option>
                                    <option value="contacted">CONTATADO</option>
                                    <option value="negotiating">NEGOCIANDO</option>
                                    <option value="converted">CONVERTIDO</option>
                                    <option value="lost">PERDIDO</option>
                                </select>
                          </TD>
                          <TD className="px-6 align-top min-w-48">
                              {editingProspect === prospect.id ? (
                                  <textarea className={`${INLINE_INPUT} text-xs resize-y`} defaultValue={prospect.notes || ''} onChange={(e) => handleUpdateField(prospect.id, 'notes', e.target.value)} />
                              ) : ( <p className="text-xs text-fg-muted whitespace-pre-wrap">{prospect.notes || '-'}</p> )}
                          </TD>
                          <TD className="px-6 align-top" align="right">
                              <div className="flex justify-end gap-2">
                                  {editingProspect === prospect.id ? (
                                      <button onClick={() => setEditingProspect(null)} className={`${ICON_BTN} p-2 text-success-fg hover:bg-success/10`}><CheckCircle size={18} /></button>
                                  ) : (
                                      <button onClick={() => setEditingProspect(prospect.id)} className={`${ICON_BTN} p-2 text-fg-subtle hover:text-fg hover:bg-tint/5`}><Edit2 size={18} /></button>
                                  )}
                              </div>
                          </TD>
                      </TR>
                  ))}
                </TBody>
            </Table>
          </div>
        ) : activeTab === 'content' ? (
          <div className="space-y-10 p-4 sm:p-6">

            <div className="bg-tint/2 rounded-2xl p-5 sm:p-8 border border-tint/8 overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none" aria-hidden>
                    <Database size={80} className="text-fg" />
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-4 sm:gap-5">
                        <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center border ${
                            storageStats?.percentage! >= 95 ? 'bg-danger/10 border-danger/25 text-danger-fg animate-pulse' :
                            storageStats?.percentage! >= 80 ? 'bg-warning/10 border-warning/25 text-warning-fg' :
                            'bg-accent/10 border-accent/25 text-accent-fg'
                        } transition-all duration-500`}>
                            {storageStats?.percentage! >= 95 ? <ShieldAlert size={28} /> : <HardDrive size={28} />}
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-display text-lg sm:text-xl font-semibold text-fg flex flex-wrap items-center gap-2">
                                Armazenamento Supabase
                                <Badge tone={storageStats?.isFull ? 'danger' : 'success'} className="uppercase text-[10px]">
                                    {storageStats?.isFull ? 'Crítico' : 'Operacional'}
                                </Badge>
                            </h3>
                            <p className="text-sm text-fg-muted">Capacidade total: 1.0 GB disponível</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1 md:items-end">
                        <div className="font-mono text-xl sm:text-2xl font-semibold text-fg tabular-nums whitespace-nowrap">
                            {storageStats ? formatBytes(storageStats.usedBytes) : '0 Bytes'}
                            <span className="text-fg-subtle mx-2">/</span>
                            1.0 GB
                        </div>
                        <div className="flex items-center gap-2">
                            <RefreshCw
                                size={14}
                                className={`text-fg-subtle cursor-pointer hover:text-accent-fg transition-colors ${isRefreshingStats ? 'animate-spin' : ''}`}
                                onClick={() => { setIsRefreshingStats(true); fetchStorageStats().finally(() => setIsRefreshingStats(false)); }}
                            />
                            <span className="eyebrow-muted">Sincronizado agora</span>
                        </div>
                    </div>
                </div>

                <div className="mt-8 relative">
                    <div className="h-3 w-full bg-tint/6 rounded-full overflow-hidden relative">
                        <div
                            className={`h-full transition-all duration-1000 ease-out relative ${
                                storageStats?.percentage! >= 95 ? 'bg-danger' :
                                storageStats?.percentage! >= 80 ? 'bg-warning' :
                                'bg-gradient-to-r from-brand-green-bright to-brand-green'
                            }`}
                            style={{ width: `${Math.min(storageStats?.percentage || 0, 100)}%` }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                        </div>
                    </div>

                    <div className="flex justify-between gap-2 mt-2 px-1 font-mono tabular-nums">
                        <span className="text-[9px] font-semibold text-fg-subtle uppercase tracking-tighter">0%</span>
                        <div className="flex gap-4 sm:gap-12">
                            <span className={`text-[9px] font-semibold uppercase tracking-tighter ${storageStats?.percentage! >= 50 ? 'text-fg-muted' : 'text-fg-subtle'}`}>50%</span>
                            <span className={`text-[9px] font-semibold uppercase tracking-tighter ${storageStats?.percentage! >= 80 ? 'text-warning-fg' : 'text-fg-subtle'}`}>80% Warning</span>
                        </div>
                        <span className={`text-[9px] font-semibold uppercase tracking-tighter ${storageStats?.percentage! >= 95 ? 'text-danger-fg animate-pulse' : 'text-fg-subtle'}`}>95% Critical</span>
                    </div>
                </div>

                {storageStats?.isFull && (
                    <div className="mt-6 p-4 bg-danger/10 border border-danger/20 rounded-xl flex items-center gap-3 animate-bounce" role="alert">
                        <ShieldAlert className="text-danger-fg shrink-0" size={20} />
                        <p className="text-xs font-semibold text-danger-fg">Storage esgotado! Não será possível realizar novos uploads até que arquivos sejam removidos.</p>
                    </div>
                )}
            </div>

            {/* Articles List */}
            <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                    <h3 className="font-display text-lg sm:text-xl font-semibold text-fg flex items-center gap-2">
                        <FileText size={22} className="text-fg-subtle" />
                        Postagens do Blog / Conteúdo
                    </h3>
                    <Button
                        size="sm"
                        onClick={() => { setEditingArticle(null); setArticleForm({ title: '', excerpt: '', content: '', image_url: '', category: '', gallery_urls: [] }); setIsArticleModalOpen(true); }}
                    >
                        <Plus size={16} /> Nova Postagem
                    </Button>
                </div>

                <Table>
                        <THead>
                            <tr>
                                <TH className="px-6">Artigo</TH>
                                <TH className="px-6">Categoria</TH>
                                <TH className="px-6">Imagens</TH>
                                <TH className="px-6">Data</TH>
                                <TH className="px-6" align="right">Ações</TH>
                            </tr>
                        </THead>
                        <TBody>
                            {articles.filter(a => {
                                if (!searchTerm) return true;
                                return a.title.toLowerCase().includes(searchTerm.toLowerCase()) || a.category?.toLowerCase().includes(searchTerm.toLowerCase());
                            }).map(article => (
                                <TR key={article.id}>
                                    <TD className="px-6 min-w-56">
                                        <div className="font-semibold text-fg">{article.title}</div>
                                        <div className="text-xs text-fg-muted line-clamp-1">{article.excerpt}</div>
                                    </TD>
                                    <TD className="px-6">
                                        <Badge className="uppercase tracking-wider text-[10px]">{article.category || 'Geral'}</Badge>
                                    </TD>
                                    <TD className="px-6">
                                        <div className="flex -space-x-2">
                                            {article.image_url && <img loading="lazy" decoding="async" src={article.image_url} className="w-8 h-8 rounded-full border-2 border-surface object-cover" />}
                                            {article.gallery_urls?.slice(0, 3).map((url, i) => (
                                                <img loading="lazy" decoding="async" key={i} src={url} className="w-8 h-8 rounded-full border-2 border-surface object-cover" />
                                            ))}
                                        </div>
                                    </TD>
                                    <TD className="px-6 font-mono tabular-nums whitespace-nowrap text-xs">{new Date(article.created_at || '').toLocaleDateString()}</TD>
                                    <TD className="px-6" align="right">
                                        <div className="flex justify-end gap-1">
                                            <button onClick={() => {
                                                setEditingArticle(article);
                                                const initialGallery = article.gallery_urls || [];
                                                const galleryWithCover = (article.image_url && !initialGallery.includes(article.image_url))
                                                    ? [article.image_url, ...initialGallery]
                                                    : initialGallery;
                                                setArticleForm({
                                                    title: article.title,
                                                    excerpt: article.excerpt,
                                                    content: article.content || '',
                                                    image_url: article.image_url || '',
                                                    category: article.category || '',
                                                    gallery_urls: galleryWithCover
                                                });
                                                setIsArticleModalOpen(true);
                                            }} className={`${ICON_BTN} p-2 text-fg-subtle hover:text-fg hover:bg-tint/5`} title="Editar"><Edit2 size={18} /></button>
                                            <button onClick={() => handleDeleteArticle(article.id)} className={`${ICON_BTN} p-2 text-fg-subtle hover:text-danger-fg hover:bg-danger/10`} title="Excluir"><Trash2 size={18} /></button>
                                        </div>
                                    </TD>
                                </TR>
                            ))}
                        </TBody>
                </Table>
            </div>

            {/* Global File Management */}
            <div className="pt-8 border-t border-tint/6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                    <h3 className="font-display text-lg sm:text-xl font-semibold text-fg flex items-center gap-2">
                        <Database size={22} className="text-accent-fg" />
                        Gestão Geral de Arquivos
                    </h3>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={fetchStorageFiles}
                            className={`${ICON_BTN} p-2 text-fg-subtle hover:text-accent-fg hover:bg-tint/5 ${isRefreshingFiles ? 'animate-spin' : ''}`}
                            title="Atualizar"
                        >
                            <RefreshCw size={18} />
                        </button>
                        <Badge className="uppercase">
                            <span className="font-mono tabular-nums">{storageFiles.length}</span> Arquivos no Bucket
                        </Badge>
                    </div>
                </div>

                <Table>
                        <THead>
                            <tr>
                                <TH className="px-6">Visualização</TH>
                                <TH className="px-6">Nome / Caminho</TH>
                                <TH className="px-6">Tamanho</TH>
                                <TH className="px-6 sm:px-12" align="center">Data</TH>
                                <TH className="px-6" align="right">Ação</TH>
                            </tr>
                        </THead>
                        <TBody>
                            {storageFiles.map(file => (
                                <TR key={file.id}>
                                    <TD className="px-6">
                                        <div className="w-12 h-12 rounded-xl bg-tint/3 border border-tint/8 overflow-hidden flex items-center justify-center">
                                            {file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                                <img loading="lazy" decoding="async" src={file.url} className="w-full h-full object-cover" />
                                            ) : (
                                                <FileText size={20} className="text-fg-subtle" />
                                            )}
                                        </div>
                                    </TD>
                                    <TD className="px-6 min-w-56">
                                        <div className="font-semibold text-fg line-clamp-1">{file.name}</div>
                                        <div className="text-[10px] text-fg-subtle font-mono break-all">{file.path}</div>
                                    </TD>
                                    <TD className="px-6 font-mono tabular-nums whitespace-nowrap text-fg">
                                        {formatBytes(file.size || 0)}
                                    </TD>
                                    <TD className="px-6 font-mono tabular-nums whitespace-nowrap text-xs text-fg-subtle" align="center">
                                        {new Date(file.created_at).toLocaleDateString()}
                                    </TD>
                                    <TD className="px-6" align="right">
                                        <div className="flex justify-end gap-1">
                                            <a
                                                href={file.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`${ICON_BTN} p-2 text-fg-subtle hover:text-fg hover:bg-tint/5`}
                                                title="Ver arquivo"
                                            >
                                                <ExternalLink size={18} />
                                            </a>
                                            <button
                                                onClick={() => handleDeleteStorageFile(file.url)}
                                                className={`${ICON_BTN} p-2 text-fg-subtle hover:text-danger-fg hover:bg-danger/10`}
                                                title="Excluir do Storage"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </TD>
                                </TR>
                            ))}
                            {storageFiles.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-fg-muted italic">
                                        {isRefreshingFiles ? 'Carregando arquivos...' : 'Nenhum arquivo encontrado no storage.'}
                                    </td>
                                </tr>
                            )}
                        </TBody>
                </Table>
            </div>

            {/* Strategy Assets List */}
            <div className="pt-8 border-t border-tint/6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                    <h3 className="font-display text-lg sm:text-xl font-semibold text-fg flex items-center gap-2">
                        <Activity size={22} className="text-accent-fg" />
                        Arquivos de Estratégias
                    </h3>
                    <Badge className="uppercase">
                        <span className="font-mono tabular-nums">{robots.length}</span> Robôs Configurados
                    </Badge>
                </div>

                <Table>
                    <THead>
                        <tr>
                        <TH className="px-6">Estratégia</TH>
                        <TH className="px-6">Avatar</TH>
                        <TH className="px-6">Galeria</TH>
                        <TH className="px-6">Manual</TH>
                        <TH className="px-6" align="right">Status</TH>
                        </tr>
                    </THead>
                    <TBody>
                        {robots.map(robot => (
                        <TR key={robot.id}>
                            <TD className="px-6 min-w-40">
                            <div className="font-semibold text-fg">{robot.name}</div>
                            <div className="text-xs text-fg-subtle font-mono uppercase tracking-tighter whitespace-nowrap">{robot.pair} v{robot.version}</div>
                            </TD>
                            <TD className="px-6">
                                {robot.avatar_url ? (
                                    <div className="w-10 h-10 rounded-xl border border-tint/8 overflow-hidden">
                                        <img loading="lazy" decoding="async" src={robot.avatar_url} className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="w-10 h-10 rounded-xl border border-tint/8 bg-tint/3 flex items-center justify-center text-fg-subtle">
                                        <User size={16} />
                                    </div>
                                )}
                            </TD>
                            <TD className="px-6">
                                <div className="flex -space-x-2">
                                    {robot.images?.slice(0, 3).map((url, i) => (
                                        <img loading="lazy" decoding="async" key={i} src={url} className="w-8 h-8 rounded-full border-2 border-surface object-cover" />
                                    ))}
                                    {(robot.images?.length || 0) > 3 && (
                                        <div className="w-8 h-8 rounded-full border-2 border-surface bg-elevated text-fg text-[9px] font-semibold font-mono tabular-nums flex items-center justify-center">
                                            +{robot.images!.length - 3}
                                        </div>
                                    )}
                                    {(!robot.images || robot.images.length === 0) && <span className="text-[10px] font-medium text-fg-subtle">Nenhuma</span>}
                                </div>
                            </TD>
                            <TD className="px-6">
                                <div className="flex items-center gap-1.5 font-medium text-fg-muted whitespace-nowrap">
                                    <FileText size={14} className="text-fg-subtle" />
                                    <span className="font-mono tabular-nums">{robot.manualImages?.length || 0}</span> páginas
                                </div>
                            </TD>
                            <TD className="px-6" align="right">
                                <Badge tone={robot.status === 'Operacional' ? 'success' : 'warning'} className="uppercase tracking-wider text-[10px]">
                                    {robot.status}
                                </Badge>
                            </TD>
                        </TR>
                        ))}
                        {robots.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-fg-muted italic">Nenhuma estratégia encontrada.</td>
                            </tr>
                        )}
                    </TBody>
                </Table>
            </div>

            {/* Legacy Content Alert */}
            {legacyItems.length > 0 && (
                <div className="pt-8 border-t border-tint/6">
                    <div className="bg-warning/5 border border-warning/20 rounded-2xl p-5 sm:p-8">
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                            <div className="flex items-center gap-3">
                                <ShieldAlert size={24} className="text-warning-fg shrink-0" />
                                <div>
                                    <h3 className="font-display text-lg sm:text-xl font-semibold text-fg">Detectados Links Legados</h3>
                                    <p className="text-sm text-fg-muted">Arquivos hospedados no SeaweedFS ou Servidores Antigos.</p>
                                </div>
                            </div>
                            <Badge tone="warning" className="uppercase">
                                <span className="font-mono tabular-nums">{legacyItems.length}</span> Itens Encontrados
                            </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {legacyItems.map((item, idx) => (
                                <div key={idx} className="bg-surface p-4 rounded-xl border border-warning/20 flex items-center justify-between gap-3 group hover:border-warning/40 transition-colors">
                                    <div className="overflow-hidden">
                                        <div className="text-[10px] font-semibold uppercase tracking-wider text-warning-fg mb-1">{item.type}</div>
                                        <div className="text-sm font-semibold text-fg truncate mb-1">{item.title}</div>
                                        <div className="text-[10px] text-fg-subtle font-mono truncate">{item.url}</div>
                                    </div>
                                    <a
                                        href={item.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`${ICON_BTN} p-2 shrink-0 text-fg-subtle hover:text-warning-fg hover:bg-warning/10`}
                                    >
                                        <ExternalLink size={18} />
                                    </a>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 flex items-center gap-3 p-4 bg-warning/10 border border-warning/20 rounded-xl">
                             <TrendingUp size={16} className="text-warning-fg shrink-0" />
                             <p className="text-xs font-medium text-warning-fg italic">
                                Recomendação: Re-faça o upload destes arquivos utilizando o novo sistema para migrá-los ao Supabase. Após migrar, os links antigos deixarão de aparecer aqui.
                             </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
        ) : activeTab === 'market' ? (
          <div className="p-4 sm:p-6">
            <MarketAdmin />
          </div>
        ) : activeTab === 'automation' ? (
          <div className="p-4 sm:p-6">
            <ArticleAutomationSettings />
          </div>
        ) : activeTab === 'live_room' ? (
          <div className="p-4 sm:p-6">
            <LiveRoomAdmin />
          </div>
        ) : null}
      </div>

      {selectedIds.length > 0 && (
           <div className="fixed bottom-4 sm:bottom-10 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] sm:w-auto bg-elevated/95 text-fg px-4 py-4 sm:px-6 rounded-2xl shadow-2xl flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 animate-in slide-in-from-bottom-12 duration-500 z-50 backdrop-blur-xl border border-tint/10">
                <div className="hairline absolute inset-x-0 top-0" aria-hidden />
                <div className="flex items-center gap-4">
                    <div className="w-11 h-11 shrink-0 bg-gradient-to-br from-brand-green-bright to-brand-green text-brand-dark rounded-xl flex items-center justify-center font-semibold font-mono tabular-nums">{selectedIds.length}</div>
                    <div><div className="eyebrow-muted mb-0.5">Audiência</div><div className="text-base font-display font-semibold whitespace-nowrap">Usuários Selecionados</div></div>
                </div>
                <div className="hidden sm:block h-10 w-px bg-tint/10" />
                <div className="flex gap-2 sm:gap-3">
                    <Button onClick={() => setIsNewsletterOpen(true)} className="flex-1 sm:flex-none"><Mail size={18} /> Enviar Mensagem</Button>
                    <Button variant="ghost" onClick={() => setSelectedIds([])}>Cancelar</Button>
                </div>
           </div>
      )}

      {isNewsletterOpen && (
           <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm sm:p-4">
              <div className="relative bg-surface text-fg border border-tint/10 w-full max-w-2xl rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col max-h-[90vh]" role="dialog" aria-modal="true" aria-labelledby="admin-newsletter-title">
                  <div className="hairline absolute inset-x-0 top-0" aria-hidden />
                  <div className="px-5 sm:px-8 py-5 sm:py-6 border-b border-tint/6 flex justify-between items-start gap-4">
                      <div><h2 id="admin-newsletter-title" className="font-display text-xl sm:text-2xl font-semibold text-fg">Novo Comunicado</h2><p className="text-sm text-fg-muted mt-1">Disparo para <span className="font-mono tabular-nums">{selectedIds.length}</span> traders.</p></div>
                      <button onClick={() => setIsNewsletterOpen(false)} className="-mr-1.5 p-2 rounded-lg text-fg-subtle hover:text-fg hover:bg-tint/5 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60" aria-label="Fechar"><X size={22} /></button>
                  </div>
                  <div className="p-5 sm:p-8 space-y-5 overflow-y-auto ds-scrollbar">
                      <div><Label htmlFor="admin-newsletter-subject">Assunto</Label><Input id="admin-newsletter-subject" type="text" value={newsletterSubject} onChange={e => setNewsletterSubject(e.target.value)} /></div>
                      <div><Label htmlFor="admin-newsletter-content">Mensagem</Label><Textarea id="admin-newsletter-content" value={newsletterContent} onChange={e => setNewsletterContent(e.target.value)} rows={6} className="resize-none" /></div>
                  </div>
                  <div className="px-5 sm:px-8 py-4 border-t border-tint/6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                      <Button variant="ghost" onClick={() => setIsNewsletterOpen(false)}>Cancelar</Button>
                      <Button onClick={handleSendNewsletter} disabled={isSending}>Disparar</Button>
                  </div>
              </div>
           </div>
      )}

      {isArticleModalOpen && (
           <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm sm:p-4 animate-in fade-in">
              <div className="relative bg-surface text-fg border border-tint/10 w-full max-w-3xl rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col max-h-[95vh]" role="dialog" aria-modal="true" aria-labelledby="admin-article-title">
                  <div className="hairline absolute inset-x-0 top-0" aria-hidden />
                  <div className="px-5 sm:px-8 py-4 sm:py-5 border-b border-tint/6 flex justify-between items-center gap-4">
                      <h2 id="admin-article-title" className="font-display text-xl sm:text-2xl font-semibold text-fg">{editingArticle ? 'Editar Conteúdo' : 'Nova Postagem'}</h2>
                      <div className="flex items-center gap-1">
                          {editingArticle && (
                              <button
                                  type="button"
                                  onClick={() => handleDeleteArticle((editingArticle as any).id)}
                                  className="p-2 rounded-lg text-danger-fg hover:bg-danger/10 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                                  title="Excluir Artigo"
                              >
                                  <Trash2 size={20} />
                              </button>
                          )}
                          <button onClick={() => setIsArticleModalOpen(false)} className="p-2 rounded-lg text-fg-subtle hover:text-fg hover:bg-tint/5 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60" aria-label="Fechar"><X size={22} /></button>
                      </div>
                  </div>

                  <form onSubmit={handleSaveArticle} className="flex-1 overflow-y-auto ds-scrollbar p-5 sm:p-8 space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div><Label htmlFor="admin-article-title-input">Título</Label>
                          <Input id="admin-article-title-input" type="text" required value={articleForm.title} onChange={e => setArticleForm({...articleForm, title: e.target.value})} /></div>
                          <div><Label htmlFor="admin-article-category">Categoria</Label>
                          <Input id="admin-article-category" type="text" value={articleForm.category} onChange={e => setArticleForm({...articleForm, category: e.target.value})} /></div>
                      </div>

                      <div className="space-y-2">
                           <div className="flex justify-between items-end gap-3">
                               <span className="text-sm font-medium text-fg">Imagens</span>
                               {storageStats && (
                                   <div className="flex items-center gap-2 mb-1">
                                       <div className="w-24 h-1 bg-tint/8 rounded-full overflow-hidden">
                                           <div
                                               className={`h-full ${storageStats.percentage >= 90 ? 'bg-danger' : 'bg-accent'}`}
                                               style={{ width: `${Math.min(storageStats.percentage, 100)}%` }}
                                           />
                                       </div>
                                       <span className="text-[10px] font-mono tabular-nums whitespace-nowrap text-fg-subtle">{formatBytes(storageStats.usedBytes)} / 1GB</span>
                                   </div>
                               )}
                           </div>
                           <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl p-6 cursor-pointer transition-colors ${isUploading || storageStats?.isFull ? 'bg-tint/3 border-tint/10 cursor-not-allowed' : 'bg-accent/5 border-accent/25 hover:bg-accent/10 hover:border-accent/50'}`}>
                               <Plus size={28} className={`${isUploading ? 'text-fg-subtle animate-spin' : storageStats?.isFull ? 'text-danger-fg' : 'text-accent-fg'}`} />
                               <span className="text-sm font-semibold text-fg">
                                   {isUploading ? 'Enviando...' : storageStats?.isFull ? 'Limite Atingido' : 'Adicionar Fotos'}
                               </span>
                               <input type="file" multiple accept="image/*" onChange={(e) => handleUploadToSupabase(e.target.files)} className="hidden" disabled={isUploading || storageStats?.isFull} />
                            </label>
                           {articleForm.gallery_urls.length > 0 && (
                               <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-4">
                                  {articleForm.gallery_urls.map((url, i) => (
                                      <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-tint/10">
                                          <img loading="lazy" decoding="async" src={url} className="w-full h-full object-cover" />
                                          <button type="button" onClick={() => setArticleForm(prev => ({...prev, gallery_urls: prev.gallery_urls.filter((_, idx) => idx !== i)}))} className="absolute top-1 right-1 p-1 bg-brand-red text-white rounded-full opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity" aria-label="Remover imagem"><X size={10} /></button>
                                          <button type="button" onClick={() => setArticleForm({...articleForm, image_url: url})} className={`absolute bottom-0 left-0 right-0 py-0.5 text-[8px] font-semibold tracking-widest text-center ${articleForm.image_url === url ? 'bg-brand-green text-brand-dark' : 'bg-black/50 text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100 italic'}`}>CAPA</button>
                                      </div>
                                  ))}
                               </div>
                           )}
                      </div>

                      <div><Label htmlFor="admin-article-excerpt">Resumo</Label>
                      <Textarea id="admin-article-excerpt" rows={2} value={articleForm.excerpt} onChange={e => setArticleForm({...articleForm, excerpt: e.target.value})} className="min-h-0 resize-none" /></div>

                      <div><Label htmlFor="admin-article-content">Conteúdo</Label>
                      <Textarea id="admin-article-content" rows={6} value={articleForm.content} onChange={e => setArticleForm({...articleForm, content: e.target.value})} className="resize-none" /></div>

                      <div className="sticky bottom-0 bg-surface pt-4 -mx-5 px-5 sm:-mx-8 sm:px-8 pb-1 border-t border-tint/6">
                          <Button type="submit" size="lg" disabled={isUploading} className="w-full">
                              {editingArticle ? 'Salvar Alterações' : 'Publicar Agora'}
                          </Button>
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
