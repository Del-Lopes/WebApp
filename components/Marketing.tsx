
import React, { useState, useEffect } from 'react';
import { Download, FileText, Image as ImageIcon, Share2, Edit2, Plus, Trash2, Save, X, Eye, ArrowLeft, Calendar, Search, Mail, Phone, Link as LinkIcon, Copy, ExternalLink, Check } from 'lucide-react';
import { MOCK_ASSETS } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { MarketingAsset } from '../types';
import { BackButton } from './BackButton';
import { Button, Card, Input, Label, Select, Textarea, Tabs, Table, THead, TBody, TR, TH, TD, PageHeader, EmptyState, Skeleton } from './ui';

interface MarketingProps {
  onBack?: () => void;
}

export const Marketing: React.FC<MarketingProps> = ({ onBack }) => {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [partnerRequest, setPartnerRequest] = useState<any>(null);
  const [assets, setAssets] = useState<MarketingAsset[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'materials' | 'prospects' | 'links'>('materials');
  const [viewingAsset, setViewingAsset] = useState<MarketingAsset | null>(null);
  const [viewingProspect, setViewingProspect] = useState<any | null>(null);

  // Prospects State
  const [prospects, setProspects] = useState<any[]>([]);
  const [editingProspectId, setEditingProspectId] = useState<string | null>(null);
  const [prospectSearchTerm, setProspectSearchTerm] = useState('');
  
  // Links State
  const [links, setLinks] = useState<any[]>([]);
  const [showAddLink, setShowAddLink] = useState(false);
  const [newLink, setNewLink] = useState({ title: '', url: '' });
  const [copyingId, setCopyingId] = useState<string | null>(null);

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

            // Fetch Useful Links
            const { data: linksData } = await supabase
               .from('partner_links')
               .select('*')
               .eq('user_id', user.id)
               .order('created_at', { ascending: false });
            if (linksData) setLinks(linksData);
        }
    } catch (error) {
        console.error("Error fetching marketing data", error);
    } finally {
        setLoading(false);
    }
  };

  const handleUpdateProspectField = async (id: string, field: string, value: any) => {
    try {
      const { error } = await supabase.from('prospects').update({ [field]: value }).eq('id', id);
      if (error) throw error;
      setProspects(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
      if (viewingProspect && viewingProspect.id === id) {
        setViewingProspect({ ...viewingProspect, [field]: value });
      }
    } catch (err: any) {
      console.error('Error updating prospect:', err);
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
          const { error } = await supabase.from('marketing_assets').delete().eq('id', id);
          if (error) throw error;
          fetchData();
      } catch (e: any) {
          console.error(e);
          alert("Erro ao excluir: " + e.message);
      }
  };

  // Lógica de Acesso Reforçada
  const isPrivileged = role === 'admin' || role === 'first_mate' || role === 'partner';
  const isApprovedPartner = partnerRequest?.status === 'approved';
  const canViewContent = isPrivileged || isApprovedPartner;

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopyingId(id);
    setTimeout(() => setCopyingId(null), 2000);
  };

  const handleAddLink = async () => {
    if (!newLink.title || !newLink.url) return;
    try {
      const { data, error } = await supabase
        .from('partner_links')
        .insert([{ 
            ...newLink, 
            user_id: user?.id 
        }])
        .select()
        .single();
      
      if (error) throw error;
      if (data) setLinks([data, ...links]);
      setNewLink({ title: '', url: '' });
      setShowAddLink(false);
    } catch (e: any) {
      alert('Erro ao adicionar link: ' + e.message);
    }
  };

  const handleDeleteLink = async (id: string) => {
    if (!window.confirm('Excluir este link?')) return;
    try {
      const { error } = await supabase.from('partner_links').delete().eq('id', id);
      if (error) throw error;
      setLinks(links.filter(l => l.id !== id));
    } catch (e: any) {
      alert('Erro ao excluir: ' + e.message);
    }
  };



  // Classes por status do prospecto (escritas por inteiro para o Tailwind compilado).
  // Mesmo mapa do Painel Admin (PROSPECT_TONE): novo = destaque, contatado =
  // neutro, negociando = em andamento, convertido = sucesso, perdido = perda.
  const PROSPECT_STATUS_BADGE: Record<string, string> = {
    new: 'bg-accent/10 text-accent-fg border-accent/20',
    contacted: 'bg-tint/5 text-fg-muted border-tint/10',
    negotiating: 'bg-warning/10 text-warning-fg border-warning/20',
    converted: 'bg-success/10 text-success-fg border-success/20',
    lost: 'bg-danger/10 text-danger-fg border-danger/20',
  };
  const PROSPECT_STATUS_SELECT: Record<string, string> = {
    new: 'bg-accent/10 text-accent-fg border-accent/20 hover:border-accent/40',
    contacted: 'bg-tint/5 text-fg-muted border-tint/10 hover:border-tint/20',
    negotiating: 'bg-warning/10 text-warning-fg border-warning/20 hover:border-warning/40',
    converted: 'bg-success/10 text-success-fg border-success/20 hover:border-success/40',
    lost: 'bg-danger/10 text-danger-fg border-danger/20 hover:border-danger/40',
  };
  const statusBadgeClass = (status: string) => PROSPECT_STATUS_BADGE[status] ?? 'bg-tint/5 text-fg-muted border-tint/10';
  const statusSelectClass = (status: string) => PROSPECT_STATUS_SELECT[status] ?? 'bg-tint/5 text-fg-muted border-tint/10 hover:border-tint/20';

  // Link com aparência de botão (âncoras não usam <Button>).
  const linkPrimaryClass = 'inline-flex items-center justify-center gap-2 rounded-lg h-11 px-5 text-sm font-semibold whitespace-nowrap bg-gradient-to-r from-brand-green-bright to-brand-green text-brand-dark hover:brightness-110 transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60';
  const linkSecondaryClass = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap bg-tint/6 text-fg border border-tint/10 hover:bg-tint/10 hover:border-tint/20 transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60';

  if (loading) return (
    <div className="space-y-6 pb-20" role="status" aria-live="polite">
      <span className="sr-only">Carregando...</span>
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-11 w-72 max-w-full rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Skeleton className="h-60 rounded-2xl" />
        <Skeleton className="h-60 rounded-2xl" />
        <Skeleton className="h-60 rounded-2xl" />
      </div>
    </div>
  );

  if (viewingProspect) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 pb-20">
            <PageHeader
                className="mb-0 sm:mb-0"
                leading={
                    <Button variant="secondary" size="icon" onClick={() => setViewingProspect(null)} aria-label="Voltar">
                        <ArrowLeft size={18} />
                    </Button>
                }
                title={<span className="break-words">{viewingProspect.full_name}</span>}
                description={
                    <span className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest ${statusBadgeClass(viewingProspect.status)}`}>
                            {viewingProspect.status}
                        </span>
                        <span className="text-fg-subtle text-xs">
                            Cadastrado em: <span className="font-mono tabular-nums">{new Date(viewingProspect.created_at).toLocaleDateString('pt-BR')}</span>
                        </span>
                    </span>
                }
                actions={
                    <Button variant="danger" size="sm" onClick={() => handleDeleteProspect(viewingProspect.id)}>
                        <Trash2 size={16} /> Excluir
                    </Button>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Info Cards */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="space-y-6">
                        <h4 className="eyebrow-muted">Informações de Contato</h4>

                        <div className="space-y-3">
                            <div className="p-4 bg-tint/3 rounded-xl border border-tint/6">
                                <label className="eyebrow-muted mb-1.5 block">E-mail</label>
                                <div className="flex items-center gap-3 text-fg min-w-0">
                                    <Mail size={18} className="text-accent-fg shrink-0" />
                                    <span className="font-medium break-all">{viewingProspect.email || 'Não informado'}</span>
                                </div>
                            </div>

                            <div className="p-4 bg-tint/3 rounded-xl border border-tint/6">
                                <label className="eyebrow-muted mb-1.5 block">Telefone / WhatsApp</label>
                                <div className="flex items-center gap-3 text-fg">
                                    <Phone size={18} className="text-accent-fg shrink-0" />
                                    <span className="font-mono tabular-nums">{viewingProspect.phone || 'Não informado'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-tint/6">
                            <Label>Alterar Status</Label>
                            <Select
                                value={viewingProspect.status}
                                onChange={(e) => {
                                    handleUpdateProspectField(viewingProspect.id, 'status', e.target.value);
                                    setViewingProspect({...viewingProspect, status: e.target.value});
                                }}
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
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
                            <h4 className="eyebrow-muted">Anotações e Histórico</h4>
                            <div className="flex items-center gap-2 text-fg-subtle text-xs">
                                <Calendar size={14} /> Atualizado automaticamente
                            </div>
                        </div>

                        <Textarea
                            className="flex-1 p-5 leading-relaxed resize-none min-h-[320px] sm:min-h-[400px]"
                            placeholder="Escreva aqui detalhes sobre o atendimento, preferências do cliente ou próximos passos..."
                            defaultValue={viewingProspect.notes}
                            onBlur={(e) => handleUpdateProspectField(viewingProspect.id, 'notes', e.target.value)}
                        />

                        <div className="mt-5 flex items-start gap-3 p-4 bg-accent/5 border border-accent/15 rounded-xl text-accent-fg text-xs font-medium">
                            <Save size={16} className="shrink-0" /> As anotações são salvas assim que você clica fora da caixa de texto.
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
  }

  if (viewingAsset) {
      return (
        <div className="fixed inset-0 z-50 flex flex-col bg-page text-fg animate-in slide-in-from-right duration-500">
          <div className="relative px-4 py-3 sm:px-6 sm:py-4 border-b border-tint/8 flex items-center gap-3 bg-surface">
            <Button variant="secondary" size="sm" onClick={() => setViewingAsset(null)} className="shrink-0">
              <ArrowLeft size={18} /> <span className="hidden sm:inline">VOLTAR</span>
            </Button>
            <h3 className="flex-1 min-w-0 truncate text-center font-display text-base sm:text-xl font-semibold text-fg">{viewingAsset.title}</h3>
            <div className="flex items-center gap-2 shrink-0">
               <a href={viewingAsset.url} download className={linkPrimaryClass}>
                  <Download size={18} /> <span className="hidden sm:inline">Baixar</span>
               </a>
            </div>
          </div>
          <div className="ds-scrollbar flex-1 overflow-auto p-4 sm:p-8 flex justify-center">
            <div className="max-w-5xl w-full h-fit bg-surface rounded-2xl p-6 sm:p-10 lg:p-16 border border-tint/8 mb-20">
               {viewingAsset.type === 'Text' ? (
                 <div className="max-w-none">
                    {viewingAsset.image_url && <img src={viewingAsset.image_url} alt="" className="w-full h-56 sm:h-[450px] object-cover rounded-2xl mb-8 sm:mb-12 border border-tint/8" />}
                    <div className="whitespace-pre-wrap font-medium leading-relaxed text-fg-muted text-base sm:text-lg">
                        {viewingAsset.content}
                    </div>
                 </div>
               ) : (
                 <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-center">
                    <div className="w-24 h-24 bg-tint/3 border border-tint/8 rounded-full flex items-center justify-center mb-6">
                       <FileText size={44} className="text-fg-subtle" />
                    </div>
                    <p className="eyebrow-muted">Pré-visualização não disponível</p>
                    <a href={viewingAsset.url} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-accent/10 border border-accent/20 text-accent-fg font-medium text-sm uppercase tracking-widest hover:bg-accent/15 transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60">Abrir em nova aba <Share2 size={16} /></a>
                 </div>
               )}
            </div>
          </div>
        </div>
      );
  }

  if (!canViewContent) {
      return (
        <div className="relative flex flex-col items-center justify-center min-h-[60vh] text-center space-y-10 px-4 animate-in fade-in zoom-in duration-700">
            <div className="pointer-events-none absolute inset-0 bg-grid-fade opacity-60" aria-hidden />
            <div className="relative">
                <div className="absolute inset-0 bg-brand-green blur-3xl opacity-15 animate-pulse" aria-hidden />
                <div className="relative w-28 h-28 glass-card rounded-3xl flex items-center justify-center text-accent-fg -rotate-6">
                    <Share2 size={48} className="animate-bounce-slow" />
                </div>
            </div>
            <div className="relative space-y-4">
                <h2 className="font-display text-4xl sm:text-5xl font-semibold text-fg tracking-tight">Seja um <span className="text-gradient-brand">Parceiro</span></h2>
                <p className="max-w-md mx-auto text-fg-muted text-base sm:text-lg leading-relaxed">
                    Desbloqueie ferramentas exclusivas de CRM, materiais de marketing premium e comece a escalar suas conversões hoje mesmo.
                </p>
            </div>
            {partnerRequest && partnerRequest.status === 'pending' ? (
                 <div className="relative bg-warning/10 border border-warning/20 px-8 py-5 rounded-2xl flex flex-col items-center gap-2">
                     <div className="flex items-center gap-3 text-warning-fg">
                        <span className="relative flex h-2.5 w-2.5" aria-hidden>
                          <span className="absolute inline-flex h-full w-full rounded-full bg-warning opacity-60 animate-ping" />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-warning" />
                        </span>
                        <span className="font-semibold uppercase tracking-widest text-sm">Em Análise</span>
                     </div>
                     <p className="text-xs text-fg-muted uppercase tracking-widest">Nossa equipe está avaliando seu perfil</p>
                 </div>
            ) : (
                <Button
                  size="lg"
                  onClick={handleRequestPartner}
                  className="group relative uppercase tracking-widest"
                >
                    Solicitar Parceria
                    <ArrowLeft size={20} className="rotate-180 group-hover:translate-x-1 transition-transform" />
                </Button>
            )}
        </div>
      );
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-20">
      <PageHeader
        className="mb-0 sm:mb-0"
        leading={<BackButton onClick={onBack} />}
        title={<>Painel do <span className="text-gradient-brand">Parceiro</span></>}
        description="Gerencie seus prospectos e materiais de marketing em um só lugar."
      />

      {/* Primary Navigation Pills */}
      <Tabs
        aria-label="Seções do painel do parceiro"
        value={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'materials', label: 'Materiais', icon: ImageIcon },
          { key: 'prospects', label: 'Prospectos', icon: Share2 },
          { key: 'links', label: 'Links Úteis', icon: LinkIcon },
        ]}
      />

      {activeTab === 'materials' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {assets.map((asset) => (
              <Card key={asset.id} className="glass-card-hover group flex flex-col relative overflow-hidden">
                 <div className="flex items-center justify-between mb-6">
                    <div className="p-3 rounded-xl bg-accent/10 border border-accent/20 text-accent-fg">
                      {asset.type === 'PDF' && <FileText size={22} />}
                      {asset.type === 'Slide' && <Share2 size={22} />}
                      {asset.type === 'Image' && <ImageIcon size={22} />}
                      {asset.type === 'Text' && <FileText size={22} />}
                    </div>
                    <span className="font-mono tabular-nums whitespace-nowrap text-[11px] text-fg-muted bg-tint/5 border border-tint/8 px-3 py-1 rounded-full mr-10">
                       {asset.size}
                    </span>
                 </div>

                 <h3 className="font-display text-lg font-semibold text-fg mb-2 truncate group-hover:text-accent-fg transition-colors">{asset.title}</h3>
                 <p className="text-fg-muted text-sm mb-6 line-clamp-2 leading-relaxed">
                   Material oficial para divulgação e suporte ao ecossistema Trader AFK.
                 </p>

                 <div className="mt-auto flex items-center gap-3">
                   <Button
                     variant="secondary"
                     onClick={() => setViewingAsset(asset)}
                     className="flex-1 uppercase tracking-widest text-xs"
                   >
                     <Eye size={16} /> Visualizar
                   </Button>
                   <a
                     href={asset.url}
                     download
                     aria-label="Baixar"
                     className={`${linkSecondaryClass} h-11 w-11 shrink-0 hover:text-accent-fg`}
                   >
                     <Download size={18} />
                   </a>
                 </div>

                 {(role === 'admin' || role === 'first_mate') && (
                    <button
                       onClick={() => handleDeleteAsset(asset.id)}
                       aria-label="Excluir material"
                       className="absolute top-5 right-5 p-2 rounded-lg text-fg-subtle hover:text-danger-fg hover:bg-danger/10 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                    >
                       <Trash2 size={18} />
                    </button>
                 )}
              </Card>
            ))}
          </div>

          {(role === 'admin' || role === 'first_mate') && (
            <div
              className="p-8 sm:p-12 border-2 border-dashed border-tint/10 rounded-2xl flex flex-col items-center justify-center text-center hover:border-accent/50 hover:bg-accent/5 transition-all cursor-pointer group"
              onClick={() => setShowAddModal(true)}
            >
              <div className="w-14 h-14 bg-accent/10 border border-accent/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Plus size={28} className="text-accent-fg" />
              </div>
              <h4 className="font-display text-lg font-semibold text-fg">Novo Material</h4>
              <p className="eyebrow-muted mt-2">Adicionar PDF, Imagem ou Artigo</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'prospects' && (
        /* PROSPECTS VIEW - Match AdminPanel Inline Table Style */
        <Card padding="none" className="overflow-hidden animate-in slide-in-from-bottom duration-500">
          <div className="p-4 sm:p-6 border-b border-tint/6 flex flex-col md:flex-row justify-between md:items-center gap-4">
            <h3 className="font-display text-lg font-semibold text-fg shrink-0">Lista de Prospectos</h3>
            <div className="relative flex-1 w-full md:max-w-xl">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none" size={16} />
              <Input
                type="text"
                placeholder="Buscar por nome, email ou telefone..."
                className="pl-10"
                value={prospectSearchTerm}
                onChange={(e) => setProspectSearchTerm(e.target.value)}
              />
            </div>
            <Button
              onClick={handleAddNewProspect}
              className="uppercase tracking-widest shrink-0"
            >
              <Plus size={18} /> Novo
            </Button>
          </div>

          <Table className="min-w-[960px]" wrapperClassName="rounded-none border-0">
              <THead>
                <tr>
                  <TH className="px-6 w-[25%]">Prospecto</TH>
                  <TH className="px-6 w-[20%]">Contato</TH>
                  <TH className="px-6 w-[15%]">Responsável</TH>
                  <TH className="px-6 w-[12%]">Status</TH>
                  <TH className="px-6 w-[20%]">Anotações</TH>
                  <TH align="right" className="px-6 w-[8%]">Ações</TH>
                </tr>
              </THead>
              <TBody>
                {prospects.filter(p => {
                  const term = prospectSearchTerm.toLowerCase();
                  return (p.full_name?.toLowerCase().includes(term) || p.email?.toLowerCase().includes(term) || p.phone?.includes(term));
                }).map(prospect => (
                  <TR key={prospect.id} className="group">
                    <TD className="px-6 py-5 align-top">
                      {editingProspectId === prospect.id ? (
                        <Input
                          autoFocus
                          className="font-semibold"
                          defaultValue={prospect.full_name}
                          onBlur={(e) => {
                            handleUpdateProspectField(prospect.id, 'full_name', e.target.value);
                          }}
                        />
                      ) : (
                        <button
                            onClick={() => setViewingProspect(prospect)}
                            className="text-left group/name rounded-md focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                        >
                          <div className="font-semibold text-fg text-base group-hover/name:text-accent-fg transition-colors">{prospect.full_name}</div>
                          <div className="text-[11px] text-fg-subtle mt-1 font-mono tabular-nums">ID: {prospect.id.slice(0, 8)}</div>
                        </button>
                      )}
                    </TD>
                    <TD className="px-6 py-5 align-top">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3 text-fg-muted min-w-0">
                          <div className="w-8 h-8 bg-tint/5 border border-tint/8 rounded-lg flex items-center justify-center text-fg-subtle shrink-0">
                            <Mail size={14} />
                          </div>
                          {editingProspectId === prospect.id ? (
                            <Input
                              className="px-3 py-1.5 text-xs"
                              defaultValue={prospect.email}
                              onBlur={(e) => handleUpdateProspectField(prospect.id, 'email', e.target.value)}
                            />
                          ) : (
                            <span className="truncate font-medium text-fg">{prospect.email || '—'}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-fg-muted">
                          <div className="w-8 h-8 bg-tint/5 border border-tint/8 rounded-lg flex items-center justify-center text-fg-subtle shrink-0">
                            <Phone size={14} />
                          </div>
                          {editingProspectId === prospect.id ? (
                            <Input
                              className="px-3 py-1.5 text-xs"
                              defaultValue={prospect.phone}
                              onBlur={(e) => handleUpdateProspectField(prospect.id, 'phone', e.target.value)}
                            />
                          ) : (
                            <span className="font-mono tabular-nums whitespace-nowrap text-fg">{prospect.phone || '—'}</span>
                          )}
                        </div>
                      </div>
                    </TD>
                    <TD className="px-6 py-5 align-top">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-accent/10 border border-accent/20 rounded-full flex items-center justify-center">
                           <div className="w-1.5 h-1.5 bg-accent rounded-full" />
                        </div>
                        <span className="font-medium text-[11px] text-fg-muted uppercase tracking-wider whitespace-nowrap">Eu (Parceiro)</span>
                      </div>
                    </TD>
                    <TD className="px-6 py-5 align-top">
                      <select
                        value={prospect.status}
                        onChange={(e) => handleUpdateProspectField(prospect.id, 'status', e.target.value)}
                        className={`px-3 py-2 rounded-lg text-[10px] font-semibold uppercase tracking-widest border transition-all outline-hidden cursor-pointer appearance-none text-center min-w-[130px] focus-visible:ring-2 focus-visible:ring-accent/60 ${statusSelectClass(prospect.status)}`}
                      >
                        <option value="new">Novo Lead</option>
                        <option value="contacted">Contatado</option>
                        <option value="negotiating">Negociando</option>
                        <option value="converted">Convertido</option>
                        <option value="lost">Perdido</option>
                      </select>
                    </TD>
                    <TD className="px-6 py-5 align-top">
                      {editingProspectId === prospect.id ? (
                        <Textarea
                          className="text-xs min-h-[100px] leading-relaxed"
                          defaultValue={prospect.notes}
                          onBlur={(e) => handleUpdateProspectField(prospect.id, 'notes', e.target.value)}
                        />
                      ) : (
                        <div className="text-fg-muted text-xs line-clamp-4 leading-relaxed italic bg-tint/3 p-3 rounded-xl border border-tint/6">
                          {prospect.notes || 'Clique no lápis para adicionar anotações...'}
                        </div>
                      )}
                    </TD>
                    <TD align="right" className="px-6 py-5 align-top">
                      <div className="flex justify-end gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-all">
                        <Button
                          variant={editingProspectId === prospect.id ? 'outline' : 'ghost'}
                          size="icon"
                          aria-label="Editar"
                          onClick={() => setEditingProspectId(editingProspectId === prospect.id ? null : prospect.id)}
                          className={editingProspectId === prospect.id ? 'border-accent/60 bg-accent/10 text-accent-fg' : undefined}
                        >
                          <Edit2 size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Excluir"
                          onClick={() => handleDeleteProspect(prospect.id)}
                          className="hover:text-danger-fg hover:bg-danger/10"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
          </Table>

          {prospects.length === 0 && (
            <div className="p-4 sm:p-6">
              <EmptyState
                icon={Search}
                title="Vazio por aqui"
                description="Comece a cadastrar seus leads de marketing agora"
                className="border-0"
              />
            </div>
          )}
        </Card>
      )}

      {/* Add Asset Modal */}
      {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto animate-in fade-in">
              <div className="relative bg-surface border border-tint/10 rounded-2xl p-6 sm:p-8 max-w-2xl w-full my-auto overflow-hidden animate-in zoom-in-95 duration-300">
                  <div className="hairline absolute inset-x-0 top-0" aria-hidden />
                  <button onClick={() => setShowAddModal(false)} aria-label="Fechar" className="absolute top-5 right-5 p-2 rounded-lg text-fg-subtle hover:text-fg hover:bg-tint/5 transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60">
                      <X size={20} />
                  </button>
                  <div className="mb-6 pr-10">
                      <p className="eyebrow mb-2">Área Administrativa</p>
                      <h3 className="font-display text-2xl font-semibold text-fg">Novo Material</h3>
                  </div>
                  <form onSubmit={handleAddAsset} className="space-y-5">
                      <div>
                          <Label>Título do Material</Label>
                          <Input
                            type="text"
                            required
                            value={newAsset.title}
                            onChange={e => setNewAsset({...newAsset, title: e.target.value})}
                          />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                            <Label>Tipo de Mídia</Label>
                            <Select
                              value={newAsset.type}
                              onChange={e => setNewAsset({...newAsset, type: e.target.value as any})}
                            >
                                <option value="PDF">PDF</option>
                                <option value="Image">Imagem</option>
                                <option value="Slide">Slide/Marketing</option>
                                <option value="Text">Texto/Artigo</option>
                            </Select>
                        </div>
                        <div>
                            <Label>Tamanho / Info</Label>
                            <Input
                              type="text"
                              placeholder="Ex: 5 MB"
                              className="font-mono tabular-nums"
                              value={newAsset.size}
                              onChange={e => setNewAsset({...newAsset, size: e.target.value})}
                            />
                        </div>
                      </div>

                      {newAsset.type === 'Text' ? (
                          <>
                             <div>
                                <Label>URL da Capa (Opcional)</Label>
                                <Input
                                  type="text"
                                  placeholder="https://..."
                                  value={newAsset.image_url}
                                  onChange={e => setNewAsset({...newAsset, image_url: e.target.value})}
                                />
                             </div>
                             <div>
                                <Label>Conteúdo Completo</Label>
                                <Textarea
                                  required
                                  rows={6}
                                  className="resize-none leading-relaxed"
                                  placeholder="Escreva seu artigo aqui..."
                                  value={newAsset.content}
                                  onChange={e => setNewAsset({...newAsset, content: e.target.value})}
                                />
                             </div>
                          </>
                      ) : (
                          <div>
                              <Label>Link Direto do Arquivo</Label>
                              <Input
                                type="text"
                                required
                                placeholder="https://..."
                                value={newAsset.url}
                                onChange={e => setNewAsset({...newAsset, url: e.target.value})}
                              />
                          </div>
                      )}

                      <Button type="submit" size="lg" className="w-full uppercase tracking-widest mt-2">
                          ADICIONAR MATERIAL
                      </Button>
                  </form>
              </div>
          </div>
      )}

      {activeTab === 'links' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h3 className="font-display text-xl font-semibold text-fg">Seus Links Úteis</h3>
              <p className="text-fg-muted text-sm">Gerencie seu repositório pessoal de links rápidos.</p>
            </div>
            <Button onClick={() => setShowAddLink(true)} className="self-start sm:self-auto">
              <Plus size={18} /> Novo Link
            </Button>
          </div>

          {showAddLink && (
            <Card className="relative overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="hairline absolute inset-x-0 top-0" aria-hidden />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  type="text"
                  placeholder="Título (ex: Grupo VIP WhatsApp)"
                  value={newLink.title}
                  onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                />
                <Input
                  type="text"
                  placeholder="URL Completa (https://...)"
                  value={newLink.url}
                  onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                />
              </div>
              <div className="flex gap-2 mt-4 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setShowAddLink(false)}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleAddLink}>
                  Salvar Link
                </Button>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {links.length === 0 ? (
                <EmptyState
                    icon={LinkIcon}
                    title="Você ainda não salvou nenhum link."
                    className="col-span-full"
                />
            ) : (
                links.map((link) => (
                    <Card key={link.id} padding="sm" className="glass-card-hover group p-5">
                        <div className="flex justify-between items-start mb-3">
                            <div className="p-2 bg-accent/10 border border-accent/20 rounded-lg">
                                <LinkIcon className="text-accent-fg" size={18} />
                            </div>
                            <div className="flex gap-1 items-center">
                                <button
                                    onClick={() => handleCopyLink(link.url, link.id)}
                                    className={`p-2 rounded-lg transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60 ${
                                        copyingId === link.id
                                            ? 'bg-success/10 text-success-fg'
                                            : 'hover:bg-tint/5 text-fg-subtle hover:text-fg group-hover:text-accent-fg'
                                    }`}
                                    title="Copiar Link"
                                >
                                    {copyingId === link.id ? <Check size={18} /> : <Copy size={18} />}
                                </button>
                                <button
                                    onClick={() => handleDeleteLink(link.id)}
                                    className="p-2 hover:bg-danger/10 text-fg-subtle hover:text-danger-fg rounded-lg transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                                    title="Remover"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                        <h4 className="font-semibold text-fg mb-1 truncate">{link.title}</h4>
                        <p className="text-xs text-fg-subtle mb-4 truncate font-mono">{link.url}</p>
                        <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${linkSecondaryClass} w-full h-9 text-xs hover:text-accent-fg`}
                        >
                            Abrir Link <ExternalLink size={14} />
                        </a>
                    </Card>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
