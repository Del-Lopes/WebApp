import React, { useState, useEffect } from 'react';
import { Key, ShieldCheck, CheckCircle2, Clock, AlertCircle, Edit2, Calendar, XCircle, Settings, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BackButton } from './BackButton';
import { Button, EmptyState, Input, Modal, PageHeader } from './ui';
import { LicenseRequest, LicenseTitle } from '../types';

interface LicensesProps {
  onBack?: () => void;
}

export const Licenses: React.FC<LicensesProps> = ({ onBack }) => {
  const { user, role } = useAuth();
  const [mt5Account, setMt5Account] = useState('');
  const [selectedTitle, setSelectedTitle] = useState('MT5');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<LicenseRequest[]>([]);
  const [titles, setTitles] = useState<LicenseTitle[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showTitleManager, setShowTitleManager] = useState(false);
  const [newTitleName, setNewTitleName] = useState('');
  const [selectedEA, setSelectedEA] = useState<'AFK TRADER' | 'SNOW BALL' | 'BOLETA PRO' | 'FX SQUAD'>('AFK TRADER');

  const eaConfig = {
    'AFK TRADER': { table: 'license_requests',           color: 'bg-tint/5 text-fg-muted border-tint/10' },
    'SNOW BALL':  { table: 'license_requests_snowball',  color: 'bg-tint/5 text-fg-muted border-tint/10' },
    'BOLETA PRO': { table: 'license_requests_boletapro', color: 'bg-tint/5 text-fg-muted border-tint/10' },
    'FX SQUAD':   { table: 'license_requests_fxsquad',  color: 'bg-tint/5 text-fg-muted border-tint/10' },
  } as const;

  useEffect(() => {
    if (user) {
      fetchRequests();
      fetchTitles();
    }
  }, [user]);

  const fetchTitles = async () => {
      try {
          const { data } = await supabase.from('license_titles').select('*').order('name');
          if (data) {
              setTitles(data);
              // Set default selected title if available
              if (data.length > 0 && !data.find(t => t.name === selectedTitle)) {
                  setSelectedTitle(data[0].name);
              }
          }
      } catch (e) {
          console.error('Error fetching titles:', e);
      }
  };

  const fetchRequests = async () => {
    // "Minhas licenças": filtra pelo próprio id. A RLS deixa staff ler todas,
    // e sem o filtro o admin via (e editava) licenças de outros clientes aqui.
    if (!user) return;
    try {
      const results = await Promise.all(
        (Object.entries(eaConfig) as [keyof typeof eaConfig, typeof eaConfig[keyof typeof eaConfig]][]).map(
          ([ea, { table }]) =>
            supabase
              .from(table)
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .then(({ data }) => (data || []).map(r => ({ ...r, ea })))
        )
      );

      const allRequests = results
        .flat()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setRequests(allRequests as any[]);
    } catch (err) {
      console.error('Error fetching requests:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError(null);

    try {
      const targetTable = eaConfig[selectedEA].table;
      const { error } = await supabase
        .from(targetTable)
        .insert([
          { 
            user_id: user.id,
            mt5_account: mt5Account,
            license_title: selectedEA, // Usar o nome do robô como título padrão
            status: 'pending'
          }
        ]);

      if (error) throw error;

      setSubmitted(true);
      setMt5Account('');
      fetchRequests();
      
      setTimeout(() => {
        setSubmitted(false);
      }, 3000);
    } catch (err: any) {
      console.error('Error creating license request:', err);
      setError(err.message || 'Erro ao solicitar licença.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAccount = async (id: string) => {
    if (!editValue) return;
    setLoading(true);
    
    try {
      const license = requests.find(r => r.id === id);
      const targetTable = (license as any)?.ea ? eaConfig[(license as any).ea as keyof typeof eaConfig].table : 'license_requests';
      
      const isApproved = license?.status === 'approved';
      const updateData: any = { 
        mt5_account: editValue
      };

      // Se não estiver aprovada, garantimos que volte para pendente e limpe a expiração
      // Se estiver aprovada, mantemos o status e a expiração (auto-aceite)
      if (!isApproved) {
        updateData.status = 'pending';
        updateData.expires_at = null;
      }

      const { error } = await supabase
        .from(targetTable)
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      
      setEditingId(null);
      fetchRequests();
    } catch (err: any) {
      console.error('Error updating account:', err);
      setError(err.message || 'Erro ao atualizar conta.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-success/10 text-success-fg border-success/20';
      case 'rejected': return 'bg-danger/10 text-danger-fg border-danger/20';
      default: return 'bg-warning/10 text-warning-fg border-warning/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle2 size={16} />;
      case 'rejected': return <AlertCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const activeLicenses = requests.filter(req => req.status === 'approved');
  const historyRequests = requests.filter(req => req.status !== 'approved');

  return (
    <div className="max-w-4xl mx-auto pt-8 px-4 pb-20">
      <PageHeader
        leading={onBack && <BackButton onClick={onBack} />}
        title="Gestor de Licença"
        description="Tudo relacionado as suas licenças MT4 e MT5."
      />

      <div className="grid md:grid-cols-2 gap-6 md:gap-8">
        <div className="space-y-6 md:space-y-8 min-w-0">
          {/* Request Form */}
          <div className="glass-card p-6 sm:p-8 relative overflow-hidden h-fit animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="hairline absolute inset-x-0 top-0" aria-hidden />
            {submitted && (
              <div className="absolute inset-0 bg-surface/95 z-10 flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-300">
                <div className="w-16 h-16 bg-success/10 border border-success/20 text-success-fg rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 size={40} />
                </div>
                <h3 className="font-display text-2xl font-semibold text-fg mb-2">Licença Solicitada!</h3>
                <p className="text-fg-muted text-sm">Sua solicitação foi enviada para análise.</p>
              </div>
            )}

            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-fg flex items-center gap-2 font-display">
                  <Plus size={20} className="text-accent-fg" />
                  Nova Solicitação
                </h3>
                {(role === 'admin' || role === 'first_mate') && (
                    <button
                        onClick={() => setShowTitleManager(true)}
                        className="p-1.5 text-fg-subtle hover:text-accent-fg hover:bg-accent/10 rounded-lg transition-colors border border-transparent hover:border-accent/20 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                        title="Gerenciar Títulos"
                    >
                        <Settings size={18} />
                    </button>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-fg">Selecione o Expert Advisor</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(Object.keys(eaConfig) as Array<keyof typeof eaConfig>).map((ea) => (
                        <button
                            key={ea}
                            type="button"
                            onClick={() => setSelectedEA(ea)}
                            className={`py-2 px-1 text-[10px] font-bold tracking-wider rounded-lg border transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60 ${
                                selectedEA === ea
                                ? 'bg-accent/10 text-accent-fg border-accent/40'
                                : 'bg-tint/3 text-fg-muted border-tint/10 hover:border-tint/20 hover:text-fg'
                            }`}
                        >
                            {ea}
                        </button>
                    ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-fg">Número da Conta</label>
                <div className="relative group">
                  <Input
                    type="number"
                    required
                    value={mt5Account}
                    onChange={(e) => setMt5Account(e.target.value)}
                    disabled={loading}
                    className="rounded-xl py-4 pl-12 font-mono tabular-nums text-lg"
                    placeholder="Ex: 50123456"
                  />
                  <ShieldCheck size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-subtle group-focus-within:text-accent-fg transition-colors" />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-danger/10 border border-danger/20 text-danger-fg text-sm rounded-lg flex items-center gap-2" role="alert">
                  <AlertCircle size={16} className="shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Enviando...' : 'Solicitar Acesso'}
              </Button>
            </form>
          </div>

          {/* Request Status (formerly History) */}
          <div className="glass-card p-6 sm:p-8 h-fit">
            <h3 className="text-lg font-semibold text-fg mb-6 flex items-center gap-2 font-display">
              <Clock size={20} className="text-fg-subtle" />
              Status da Solicitação
            </h3>

            {historyRequests.length === 0 ? (
              <EmptyState className="py-10" title="Nenhuma outra solicitação encontrada." />
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 ds-scrollbar">
                {historyRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between gap-3 p-4 bg-tint/3 rounded-xl border border-tint/6 hover:bg-tint/5 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider border ${eaConfig[(req as any).ea as keyof typeof eaConfig]?.color || 'bg-tint/5 text-fg-muted border-tint/10'}`}>
                              {req.license_title || (req as any).ea || 'AFK'}
                          </span>
                          <span className="block font-mono tabular-nums whitespace-nowrap font-medium text-fg">Conta: {req.mt5_account}</span>
                      </div>
                      <span className="text-[10px] text-fg-subtle tabular-nums">{new Date(req.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider shrink-0 ${getStatusColor(req.status)}`}>
                      {getStatusIcon(req.status)}
                      <span>{req.status === 'pending' ? 'Pendente' : req.status === 'approved' ? 'Aprovado' : 'Rejeitado'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6 md:space-y-8 min-w-0">
          {/* Active Licenses */}
          <div className="glass-card p-6 sm:p-8 h-fit animate-in fade-in slide-in-from-right-4 duration-500">
            <h3 className="text-lg font-semibold text-fg mb-6 flex items-center gap-2 font-display">
              <ShieldCheck size={20} className="text-accent-fg" />
              Licenças Ativas
            </h3>

            {activeLicenses.length === 0 ? (
              <EmptyState className="py-12" icon={Key} title="Nenhuma licença ativa no momento." />
            ) : (
              <div className="space-y-4 max-h-[750px] overflow-y-auto pr-2 ds-scrollbar">
                {activeLicenses.map((req) => (
                  <div key={req.id} className="p-5 bg-success/5 rounded-xl border border-success/15 flex flex-col gap-4 hover:border-success/30 transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="flex-1 min-w-0">
                          {editingId === req.id ? (
                            <div className="flex gap-2">
                              <Input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="py-2 font-mono tabular-nums"
                                autoFocus
                              />
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="block font-mono tabular-nums whitespace-nowrap font-semibold text-lg text-fg">{req.mt5_account}</span>
                              <div className={`flex items-center gap-1.5 text-[9px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider border ${eaConfig[(req as any).ea as keyof typeof eaConfig]?.color || 'bg-accent/10 text-accent-fg border-accent/20'}`}>
                                  <Key size={10} className="shrink-0" />
                                  <span className="truncate max-w-[120px]">{req.license_title || (req as any).ea || 'AFK TRADER'}</span>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 text-[10px] text-fg-muted font-medium uppercase tracking-wider mt-1.5">
                            <Calendar size={10} className="text-fg-subtle" />
                            Expira em: <span className="text-fg tabular-nums">{req.expires_at ? new Date(req.expires_at).toLocaleDateString() : 'Não definida'}</span>
                          </div>
                        </div>
                      </div>

                      {editingId === req.id ? (
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleUpdateAccount(req.id)}
                            className="p-2 text-success-fg bg-tint/5 border border-tint/10 hover:bg-success/10 hover:border-success/30 rounded-lg transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                            title="Confirmar"
                          >
                            <CheckCircle2 size={18} />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-2 text-fg-muted bg-tint/5 border border-tint/10 hover:bg-tint/10 hover:text-fg rounded-lg transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                            title="Cancelar"
                          >
                            <XCircle size={18} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(req.id);
                            setEditValue(req.mt5_account);
                          }}
                          className="shrink-0 p-2.5 bg-tint/5 border border-tint/10 text-fg-muted hover:text-accent-fg hover:border-accent/40 rounded-lg transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                          title="Editar Conta"
                        >
                          <Edit2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin Title Manager Modal */}
      <Modal
        open={showTitleManager}
        onClose={() => setShowTitleManager(false)}
        title="Gerenciar Títulos"
        size="md"
        closeOnOverlay={false}
      >
                  <div className="space-y-4">
                      <div className="flex gap-2">
                          <Input
                            type="text"
                            value={newTitleName}
                            onChange={(e) => setNewTitleName(e.target.value)}
                            placeholder="Ex: MT4 Gold"
                            className="flex-1"
                          />
                          <Button
                            size="icon"
                            onClick={async () => {
                                if (!newTitleName) return;
                                const { error } = await supabase.from('license_titles').insert({ name: newTitleName });
                                if (error) {
                                    alert("Erro ou título já existente");
                                } else {
                                    setNewTitleName('');
                                    fetchTitles();
                                }
                            }}
                            className="h-auto w-11 shrink-0"
                          >
                              <Plus size={20} />
                          </Button>
                      </div>

                      <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 ds-scrollbar">
                          {titles.map(t => (
                              <div key={t.id} className="flex items-center justify-between gap-3 p-3 bg-tint/3 rounded-lg border border-tint/6 hover:bg-tint/5 transition-colors">
                                  <span className="font-medium text-fg min-w-0 truncate">{t.name}</span>
                                  <button
                                    onClick={async () => {
                                        if (confirm(`Excluir título "${t.name}"?`)) {
                                            const { error } = await supabase.from('license_titles').delete().eq('id', t.id);
                                            if (error) alert("Erro ao excluir. O título pode estar em uso.");
                                            fetchTitles();
                                        }
                                    }}
                                    className="shrink-0 p-1.5 text-fg-subtle hover:text-danger-fg hover:bg-danger/10 rounded-md transition-all"
                                  >
                                      <Trash2 size={16} />
                                  </button>
                              </div>
                          ))}
                          {titles.length === 0 && (
                              <p className="text-center text-fg-subtle text-xs py-10 italic">Nenhum título cadastrado.</p>
                          )}
                      </div>
                  </div>
      </Modal>
    </div>
  );
};
