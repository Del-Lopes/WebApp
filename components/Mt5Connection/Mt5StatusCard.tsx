import React, { useState } from 'react';
import { Activity, Settings, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { StrategyMt5Link, StrategyMt5Status, UserRole } from '../../types';
import { Mt5ConnectModal } from './Mt5ConnectModal';
import { Mt5ManageModal } from './Mt5ManageModal';

interface Mt5StatusCardProps {
  strategyId: string;
  strategyName: string;
  link: StrategyMt5Link | null;
  status: StrategyMt5Status | null;
  loading: boolean;
  onChange: () => void; // chamado após connect/rotate/disconnect pra refetch
  userRole?: UserRole;
}

const STALE_THRESHOLD_SEC = 30;

function formatCurrency(value: number | null | undefined, currency: string | null | undefined): string {
  if (value == null) return '—';
  const code = currency || 'BRL';
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: code }).format(value);
  } catch {
    return `${code} ${value.toFixed(2)}`;
  }
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 5) return 'agora';
  if (diff < 60) return `há ${Math.floor(diff)}s`;
  if (diff < 3600) return `há ${Math.floor(diff / 60)}min`;
  return `há ${Math.floor(diff / 3600)}h`;
}

function pnlClass(value: number | null | undefined): string {
  if (value == null) return 'text-slate-900';
  if (value > 0) return 'text-green-600';
  if (value < 0) return 'text-red-600';
  return 'text-slate-900';
}

export const Mt5StatusCard: React.FC<Mt5StatusCardProps> = ({
  strategyId,
  strategyName,
  link,
  status,
  loading,
  onChange,
  userRole,
}) => {
  const isAdmin = userRole === 'admin';
  const [connectOpen, setConnectOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  // Tick a cada 5s só pra reavaliar "stale" e o "há Xs"
  const [, setTick] = useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Activity size={16} className="text-green-600" /> Conexão MT5
          </h3>
        </div>
        <div className="h-20 flex items-center justify-center text-slate-400 text-sm">
          <RefreshCw size={16} className="animate-spin mr-2" /> Carregando…
        </div>
      </div>
    );
  }

  // ─── Estado A: não conectada ───────────────────────────────────────────────
  if (!link) {
    return (
      <>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
            <Activity size={16} className="text-green-600" /> Conexão MT5
          </h3>
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-3">
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            Não conectada
          </div>
          {isAdmin ? (
            <>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Vincule esta estratégia à conta MT5 para exibir flutuante, P&amp;L do dia e posições abertas.
              </p>
              <button
                onClick={() => setConnectOpen(true)}
                className="w-full bg-green-600 hover:bg-green-500 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
              >
                Conectar ao MT5
              </button>
            </>
          ) : (
            <p className="text-xs text-slate-500 leading-relaxed">
              Os dados ao vivo desta estratégia serão exibidos assim que a conta for vinculada.
            </p>
          )}
        </div>

        {connectOpen && (
          <Mt5ConnectModal
            strategyId={strategyId}
            strategyName={strategyName}
            onClose={() => setConnectOpen(false)}
            onConnected={() => {
              setConnectOpen(false);
              onChange();
            }}
          />
        )}
      </>
    );
  }

  // ─── Estado B: aguardando primeiro envio (link existe, status não) ─────────
  if (!status) {
    return (
      <>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity size={16} className="text-green-600" /> Conexão MT5
            </h3>
            {isAdmin && (
              <button
                onClick={() => setManageOpen(true)}
                className="text-slate-400 hover:text-slate-700 transition-colors"
                title="Gerenciar"
              >
                <Settings size={16} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-amber-700 text-sm mb-3">
            <RefreshCw size={14} className="animate-spin" />
            Aguardando o primeiro envio do Expert Advisor
          </div>
          <div className="text-xs text-slate-500 leading-relaxed space-y-1">
            <div>Conta <span className="font-mono">{link.account_login}</span></div>
            <div>Chave gerada {formatRelative(link.api_key_created_at)}</div>
          </div>
        </div>

        {manageOpen && (
          <Mt5ManageModal
            strategyId={strategyId}
            link={link}
            status={null}
            onClose={() => setManageOpen(false)}
            onChange={() => {
              setManageOpen(false);
              onChange();
            }}
          />
        )}
      </>
    );
  }

  // ─── Estado C: conectada ───────────────────────────────────────────────────
  const lastUpdateSec = (Date.now() - new Date(status.received_at).getTime()) / 1000;
  const isStale = lastUpdateSec > STALE_THRESHOLD_SEC;

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Activity size={16} className="text-green-600" /> Conexão MT5
          </h3>
          <button
            onClick={() => setManageOpen(true)}
            className="text-slate-400 hover:text-slate-700 transition-colors"
            title="Gerenciar"
          >
            <Settings size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2 text-sm mb-3">
          {isStale ? (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-amber-700">Sem atualização {formatRelative(status.received_at)}</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-slate-700">Conectado · {formatRelative(status.received_at)}</span>
            </>
          )}
        </div>

        <div className="text-xs text-slate-500 mb-3">
          Conta <span className="font-mono text-slate-700">{status.account_login}</span>
          {status.account_company && <span> · {status.account_company}</span>}
        </div>

        <div className="border-t border-slate-100 pt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Flutuante</span>
            <span className={`font-semibold ${pnlClass(status.floating_pnl)}`}>
              {formatCurrency(status.floating_pnl, status.account_currency)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">P&amp;L do dia</span>
            <span className={`font-semibold ${pnlClass(status.daily_pnl)}`}>
              {formatCurrency(status.daily_pnl, status.account_currency)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Posições</span>
            <span className="font-semibold text-slate-900">
              {status.open_positions ?? 0} {status.open_positions === 1 ? 'aberta' : 'abertas'}
            </span>
          </div>
        </div>

        <div className="border-t border-slate-100 mt-3 pt-3 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Equity</span>
            <span className="font-mono text-slate-700">{formatCurrency(status.equity, status.account_currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Saldo</span>
            <span className="font-mono text-slate-700">{formatCurrency(status.balance, status.account_currency)}</span>
          </div>
        </div>
      </div>

      {manageOpen && (
        <Mt5ManageModal
          strategyId={strategyId}
          link={link}
          status={status}
          onClose={() => setManageOpen(false)}
          onChange={() => {
            setManageOpen(false);
            onChange();
          }}
        />
      )}
    </>
  );
};
