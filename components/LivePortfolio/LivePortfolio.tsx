import React, { useEffect, useState } from 'react';
import {
  Plus, Activity, TrendingUp, TrendingDown, Link2, Link2Off,
  Trash2, Wallet, X, Loader2, RefreshCw,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { usePortfolioMt5StatusMap } from '../../hooks/usePortfolioMt5Status';
import { disconnectPortfolioAccountFromMt5 } from '../../lib/portfolioMt5Link';
import { PortfolioConnectModal } from './PortfolioConnectModal';
import { requestPortfolioForceSync } from '../../lib/mt5Sync';
import { Button, Input, Label, PageHeader, Skeleton, Stat } from '../ui';
import { BackButton } from '../BackButton';
import { useNow } from '../../hooks/useNow';

const FORCE_SYNC_COOLDOWN_MS = 5 * 60 * 1000;

interface PortfolioAccount {
  id: string;
  user_id: string;
  name: string;
  broker_display: string | null;
  notes: string | null;
  created_at: string;
}

interface Mt5LinkRow {
  account_id: string;
  account_login: number;
  api_key_prefix: string;
  api_key_revoked_at: string | null;
}

interface LivePortfolioProps {
  onBack: () => void;
}

const currencyFmt = (n: number | null | undefined, currency = 'USD') =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(n ?? 0);

// Botão com a contagem do cooldown. O tick vive aqui (e só enquanto há
// cooldown) para não re-renderizar a página inteira a cada 5s.
const ForceSyncButton: React.FC<{ cooldownUntil: number; syncing: boolean; onClick: () => void }> = ({
  cooldownUntil, syncing, onClick,
}) => {
  useNow(5000, Date.now() < cooldownUntil);
  const onCooldown = Date.now() < cooldownUntil;
  const cooldownSec = onCooldown ? Math.ceil((cooldownUntil - Date.now()) / 1000) : 0;
  return (
    <button
      onClick={onClick}
      disabled={syncing || onCooldown}
      className="flex items-center gap-1 rounded-md text-[10px] text-fg-muted hover:text-fg disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
    >
      <RefreshCw size={10} className={syncing ? 'animate-spin' : ''} />
      {onCooldown
        ? `${cooldownSec > 60 ? `${Math.ceil(cooldownSec / 60)}min` : `${cooldownSec}s`}`
        : 'Atualizar'}
    </button>
  );
};

export const LivePortfolio: React.FC<LivePortfolioProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<PortfolioAccount[]>([]);
  const [links, setLinks] = useState<Record<string, Mt5LinkRow>>({});
  const [loading, setLoading] = useState(true);
  const { statusMap } = usePortfolioMt5StatusMap(user?.id ?? null);
  const [syncingMap, setSyncingMap] = useState<Record<string, boolean>>({});
  const [syncCooldownMap, setSyncCooldownMap] = useState<Record<string, number>>({});

  const [isAdding, setIsAdding] = useState(false);
  const [newAccount, setNewAccount] = useState({ name: '', broker_display: '' });
  const [submitting, setSubmitting] = useState(false);

  const [connectingAccount, setConnectingAccount] = useState<PortfolioAccount | null>(null);

  useEffect(() => {
    if (user) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const refresh = async () => {
    setLoading(true);
    try {
      const [{ data: accts }, { data: linkRows }] = await Promise.all([
        supabase
          .from('portfolio_accounts')
          .select('*')
          .order('created_at', { ascending: true }),
        supabase
          .from('portfolio_mt5_link')
          .select('account_id, account_login, api_key_prefix, api_key_revoked_at'),
      ]);
      setAccounts(accts || []);
      const map: Record<string, Mt5LinkRow> = {};
      (linkRows || []).forEach((row) => { map[row.account_id] = row as Mt5LinkRow; });
      setLinks(map);
      // Restaura cooldowns do localStorage
      const cooldowns: Record<string, number> = {};
      (linkRows || []).forEach((row) => {
        const stored = localStorage.getItem(`force_sync_portfolio_${row.account_id}`);
        if (stored) cooldowns[row.account_id] = parseInt(stored, 10);
      });
      setSyncCooldownMap(cooldowns);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newAccount.name.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('portfolio_accounts').insert({
        user_id: user.id,
        name: newAccount.name.trim(),
        broker_display: newAccount.broker_display.trim() || null,
      });
      if (error) throw error;
      setNewAccount({ name: '', broker_display: '' });
      setIsAdding(false);
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar conta';
      alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm('Excluir esta conta do portfólio? O vínculo MT5 também será removido.')) return;
    try {
      const { error } = await supabase.from('portfolio_accounts').delete().eq('id', accountId);
      if (error) throw error;
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir';
      alert(message);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    if (!confirm('Desconectar esta conta do MT5? A telemetria parará de atualizar.')) return;
    try {
      await disconnectPortfolioAccountFromMt5(accountId);
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao desconectar';
      alert(message);
    }
  };

  const handleForceSync = async (accountId: string) => {
    const cooldownUntil = syncCooldownMap[accountId] ?? 0;
    if (Date.now() < cooldownUntil || syncingMap[accountId]) return;
    setSyncingMap((m) => ({ ...m, [accountId]: true }));
    try {
      await requestPortfolioForceSync(accountId);
      const until = Date.now() + FORCE_SYNC_COOLDOWN_MS;
      setSyncCooldownMap((m) => ({ ...m, [accountId]: until }));
      localStorage.setItem(`force_sync_portfolio_${accountId}`, String(until));
    } finally {
      setSyncingMap((m) => ({ ...m, [accountId]: false }));
    }
  };

  const totalEquity = accounts.reduce((sum, acc) => {
    const s = statusMap[acc.id];
    return sum + (s?.equity ?? 0);
  }, 0);

  const totalDailyPnl = accounts.reduce((sum, acc) => {
    const s = statusMap[acc.id];
    return sum + (s?.daily_pnl ?? 0);
  }, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        className="mb-2 sm:mb-2"
        leading={
          <BackButton onClick={onBack} />
        }
        title={
          <span className="inline-flex items-center gap-2">
            <Activity className="text-accent-fg shrink-0" />
            Live Portfólio
          </span>
        }
        description="Suas contas MT5 com telemetria em tempo real."
      />

      {/* Boas-vindas (primeira vez) */}
      {!loading && accounts.length === 0 && (
        <div className="glass-card relative overflow-hidden p-6 sm:p-8 text-center">
          <div className="hairline absolute inset-x-0 top-0" aria-hidden />
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 border border-accent/20 text-accent-fg mb-4">
            <Activity size={32} />
          </div>
          <h2 className="font-display text-xl font-semibold text-fg mb-2">Monte seu portfólio ao vivo</h2>
          <p className="text-sm text-fg-muted max-w-xl mx-auto mb-6 leading-relaxed">
            Adicione suas contas MT5 e acompanhe equity, P&L flutuante, P&L do dia e número de posições
            atualizando automaticamente. Cada conta gera uma chave única que você cola no nosso EA somente-leitura.
          </p>
          <Button
            onClick={() => setIsAdding(true)}
            className="whitespace-normal"
          >
            <Plus size={18} /> Adicionar minha primeira conta
          </Button>
        </div>
      )}

      {/* Header com totais (quando já tem contas) */}
      {!loading && accounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Stat label="Equity total" value={currencyFmt(totalEquity)} />
          <Stat
            label="P&L do dia"
            value={<span className={totalDailyPnl >= 0 ? 'text-success-fg' : 'text-danger-fg'}>{currencyFmt(totalDailyPnl)}</span>}
          />
          <div className="glass-card p-5 flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow-muted">Contas</p>
              <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-fg">{accounts.length}</p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsAdding(true)}
            >
              <Plus size={16} /> Nova
            </Button>
          </div>
        </div>
      )}

      {/* Formulário de criação */}
      {isAdding && (
        <form
          onSubmit={handleCreate}
          className="glass-card p-5 sm:p-6 animate-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-base font-semibold text-fg">Nova conta do portfólio</h3>
            <button type="button" onClick={() => setIsAdding(false)} aria-label="Fechar" className="rounded-lg p-1.5 -mr-1.5 text-fg-subtle hover:text-fg hover:bg-tint/5 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label><>Nome <span className="text-danger-fg">*</span></></Label>
              <Input
                type="text"
                required
                value={newAccount.name}
                onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                placeholder="Ex: Conta principal"
              />
            </div>
            <div>
              <Label>Corretora (opcional)</Label>
              <Input
                type="text"
                value={newAccount.broker_display}
                onChange={(e) => setNewAccount({ ...newAccount, broker_display: e.target.value })}
                placeholder="Ex: XP Investimentos"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAdding(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !newAccount.name.trim()}
            >
              {submitting ? 'Criando…' : 'Criar conta'}
            </Button>
          </div>
        </form>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass-card p-5 space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
              <Skeleton className="h-8 w-2/3" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lista de contas */}
      {!loading && accounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {accounts.map((account) => {
            const link = links[account.id];
            const status = statusMap[account.id];
            const isConnected = !!link && !link.api_key_revoked_at;
            const hasLive = !!status;
            const daily = status?.daily_pnl ?? 0;
            const floating = status?.floating_pnl ?? 0;

            return (
              <div
                key={account.id}
                className="glass-card glass-card-hover p-5 flex flex-col min-w-0"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 ${
                      isConnected ? 'bg-success/10 border-success/20 text-success-fg' : 'bg-tint/5 border-tint/10 text-fg-subtle'
                    }`}>
                      <Wallet size={18} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display font-semibold text-fg truncate" title={account.name}>{account.name}</h3>
                      <p className="text-xs text-fg-muted truncate">
                        {account.broker_display || (link ? `Conta #${link.account_login}` : 'Sem corretora')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isConnected ? (
                      <button
                        onClick={() => handleDisconnect(account.id)}
                        className="inline-flex items-center justify-center p-1.5 bg-success/10 text-success-fg hover:bg-danger/10 hover:text-danger-fg border border-success/20 hover:border-danger/30 rounded-lg transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                        title="Desconectar do MT5"
                      >
                        <Link2 size={14} />
                      </button>
                    ) : (
                      <button
                        onClick={() => setConnectingAccount(account)}
                        className="inline-flex items-center justify-center p-1.5 bg-tint/5 text-fg-muted hover:bg-accent/10 hover:text-accent-fg border border-tint/10 hover:border-accent/30 rounded-lg transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                        title="Conectar ao MT5"
                      >
                        <Link2Off size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(account.id)}
                      className="inline-flex items-center justify-center p-1.5 bg-tint/5 text-fg-muted hover:bg-danger/10 hover:text-danger-fg border border-tint/10 hover:border-danger/30 rounded-lg transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                      title="Excluir conta"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Métricas */}
                {hasLive ? (
                  <>
                    <div className="mb-3">
                      <p className="eyebrow-muted">Equity</p>
                      <p className="mt-1 font-display text-2xl font-semibold tabular-nums whitespace-nowrap text-fg">
                        {currencyFmt(status.equity, status.account_currency || 'USD')}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="min-w-0">
                        <p className="eyebrow-muted">Saldo</p>
                        <p className="mt-0.5 text-sm font-semibold text-fg font-mono tabular-nums whitespace-nowrap">
                          {currencyFmt(status.balance, status.account_currency || 'USD')}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="eyebrow-muted">Posições</p>
                        <p className="mt-0.5 text-sm font-semibold text-fg font-mono tabular-nums">{status.open_positions ?? 0}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="eyebrow-muted">P&L Flutuante</p>
                        <p className={`mt-0.5 text-sm font-semibold font-mono tabular-nums whitespace-nowrap inline-flex items-center gap-1 ${floating >= 0 ? 'text-success-fg' : 'text-danger-fg'}`}>
                          {floating >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {currencyFmt(floating, status.account_currency || 'USD')}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="eyebrow-muted">P&L do Dia</p>
                        <p className={`mt-0.5 text-sm font-semibold font-mono tabular-nums whitespace-nowrap inline-flex items-center gap-1 ${daily >= 0 ? 'text-success-fg' : 'text-danger-fg'}`}>
                          {daily >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {currencyFmt(daily, status.account_currency || 'USD')}
                        </p>
                      </div>
                    </div>
                    <div className="mt-auto pt-2 border-t border-tint/6 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-fg-subtle font-mono tabular-nums">
                        Atualizado: {new Date(status.reported_at).toLocaleTimeString('pt-BR')}
                      </span>
                      <ForceSyncButton
                        cooldownUntil={syncCooldownMap[account.id] ?? 0}
                        syncing={syncingMap[account.id] ?? false}
                        onClick={() => handleForceSync(account.id)}
                      />
                    </div>
                  </>
                ) : isConnected ? (
                  <div className="py-6 text-center text-sm text-warning-fg">
                    <Loader2 className="inline animate-spin mr-2" size={14} />
                    Aguardando primeiro envio do EA…
                  </div>
                ) : (
                  <div className="py-6 text-center">
                    <p className="text-sm text-fg-muted mb-3">Conta sem vínculo MT5.</p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setConnectingAccount(account)}
                      className="text-xs"
                    >
                      <Link2Off size={14} /> Conectar ao MT5
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {connectingAccount && (
        <PortfolioConnectModal
          accountId={connectingAccount.id}
          accountName={connectingAccount.name}
          onClose={() => setConnectingAccount(null)}
          onConnected={() => {
            setConnectingAccount(null);
            refresh();
          }}
        />
      )}
    </div>
  );
};
