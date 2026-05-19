import React, { useEffect, useState } from 'react';
import {
  ArrowLeft, Plus, Activity, TrendingUp, TrendingDown, Link2, Link2Off,
  Trash2, Wallet, X, Loader2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { usePortfolioMt5StatusMap } from '../../hooks/usePortfolioMt5Status';
import { disconnectPortfolioAccountFromMt5 } from '../../lib/portfolioMt5Link';
import { PortfolioConnectModal } from './PortfolioConnectModal';

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

export const LivePortfolio: React.FC<LivePortfolioProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<PortfolioAccount[]>([]);
  const [links, setLinks] = useState<Record<string, Mt5LinkRow>>({});
  const [loading, setLoading] = useState(true);
  const { statusMap } = usePortfolioMt5StatusMap(user?.id ?? null);

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
      <div className="flex items-center gap-4 mb-2">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft className="text-slate-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Activity className="text-green-600" />
            <h1 className="text-2xl font-bold text-slate-900">Live Portfólio</h1>
          </div>
          <p className="text-slate-500">Suas contas MT5 com telemetria em tempo real.</p>
        </div>
      </div>

      {/* Boas-vindas (primeira vez) */}
      {!loading && accounts.length === 0 && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
            <Activity size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Monte seu portfólio ao vivo</h2>
          <p className="text-sm text-slate-600 max-w-xl mx-auto mb-6 leading-relaxed">
            Adicione suas contas MT5 e acompanhe equity, P&L flutuante, P&L do dia e número de posições
            atualizando automaticamente. Cada conta gera uma chave única que você cola no nosso EA somente-leitura.
          </p>
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-600/20 transition-all"
          >
            <Plus size={18} /> Adicionar minha primeira conta
          </button>
        </div>
      )}

      {/* Header com totais (quando já tem contas) */}
      {!loading && accounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Equity total</p>
            <p className="text-2xl font-bold text-slate-900 font-mono">{currencyFmt(totalEquity)}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">P&L do dia</p>
            <p className={`text-2xl font-bold font-mono ${totalDailyPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {currencyFmt(totalDailyPnl)}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Contas</p>
              <p className="text-2xl font-bold text-slate-900">{accounts.length}</p>
            </div>
            <button
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-lg shadow transition-colors"
            >
              <Plus size={16} /> Nova
            </button>
          </div>
        </div>
      )}

      {/* Formulário de criação */}
      {isAdding && (
        <form
          onSubmit={handleCreate}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm animate-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">Nova conta do portfólio</h3>
            <button type="button" onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-700">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nome <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={newAccount.name}
                onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                placeholder="Ex: Conta principal"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Corretora (opcional)</label>
              <input
                type="text"
                value={newAccount.broker_display}
                onChange={(e) => setNewAccount({ ...newAccount, broker_display: e.target.value })}
                placeholder="Ex: XP Investimentos"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !newAccount.name.trim()}
              className="px-5 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-bold rounded-lg shadow transition-colors disabled:opacity-50"
            >
              {submitting ? 'Criando…' : 'Criar conta'}
            </button>
          </div>
        </form>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-green-600" size={28} />
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
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      isConnected ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <Wallet size={18} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 truncate" title={account.name}>{account.name}</h3>
                      <p className="text-xs text-slate-500 truncate">
                        {account.broker_display || (link ? `Conta #${link.account_login}` : 'Sem corretora')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isConnected ? (
                      <button
                        onClick={() => handleDisconnect(account.id)}
                        className="inline-flex items-center justify-center p-1.5 bg-green-50 text-green-700 hover:bg-red-50 hover:text-red-600 border border-green-200 hover:border-red-200 rounded-lg transition-colors"
                        title="Desconectar do MT5"
                      >
                        <Link2 size={14} />
                      </button>
                    ) : (
                      <button
                        onClick={() => setConnectingAccount(account)}
                        className="inline-flex items-center justify-center p-1.5 bg-slate-50 text-slate-700 hover:bg-slate-900 hover:text-white border border-slate-200 hover:border-slate-900 rounded-lg transition-colors"
                        title="Conectar ao MT5"
                      >
                        <Link2Off size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(account.id)}
                      className="inline-flex items-center justify-center p-1.5 bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-lg transition-colors"
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
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Equity</p>
                      <p className="text-2xl font-bold text-slate-900 font-mono">
                        {currencyFmt(status.equity, status.account_currency || 'USD')}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Saldo</p>
                        <p className="text-sm font-bold text-slate-700 font-mono">
                          {currencyFmt(status.balance, status.account_currency || 'USD')}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Posições</p>
                        <p className="text-sm font-bold text-slate-700 font-mono">{status.open_positions ?? 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">P&L Flutuante</p>
                        <p className={`text-sm font-bold font-mono inline-flex items-center gap-1 ${floating >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {floating >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {currencyFmt(floating, status.account_currency || 'USD')}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">P&L do Dia</p>
                        <p className={`text-sm font-bold font-mono inline-flex items-center gap-1 ${daily >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {daily >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {currencyFmt(daily, status.account_currency || 'USD')}
                        </p>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-auto pt-2 border-t border-slate-100">
                      Atualizado: {new Date(status.reported_at).toLocaleTimeString('pt-BR')}
                    </div>
                  </>
                ) : isConnected ? (
                  <div className="py-6 text-center text-sm text-slate-500">
                    <Loader2 className="inline animate-spin mr-2" size={14} />
                    Aguardando primeiro envio do EA…
                  </div>
                ) : (
                  <div className="py-6 text-center">
                    <p className="text-sm text-slate-500 mb-3">Conta sem vínculo MT5.</p>
                    <button
                      onClick={() => setConnectingAccount(account)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow transition-colors"
                    >
                      <Link2Off size={14} /> Conectar ao MT5
                    </button>
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
