import React, { useState } from 'react';
import { Activity, Settings, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { StrategyMt5Link, StrategyMt5Status, UserRole } from '../../types';
import { Mt5ConnectModal } from './Mt5ConnectModal';
import { Mt5ManageModal } from './Mt5ManageModal';
import { requestStrategyForceSync } from '../../lib/mt5Sync';
import { Button, Skeleton } from '../ui';

const FORCE_SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutos

interface Mt5StatusCardProps {
  strategyId: string;
  strategyName: string;
  link: StrategyMt5Link | null;
  status: StrategyMt5Status | null;
  loading: boolean;
  onChange: () => void; // chamado após connect/rotate/disconnect pra refetch
  userRole?: UserRole;
}

const STALE_THRESHOLD_SEC = 360;

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
  if (value == null) return 'text-fg';
  if (value > 0) return 'text-success-fg';
  if (value < 0) return 'text-danger-fg';
  return 'text-fg';
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
  const [syncing, setSyncing] = useState(false);
  const [syncCooldownUntil, setSyncCooldownUntil] = useState<number>(() => {
    const stored = localStorage.getItem(`force_sync_strategy_${strategyId}`);
    return stored ? parseInt(stored, 10) : 0;
  });

  // Tick a cada 5s só pra reavaliar "stale" e o "há Xs"
  const [, setTick] = useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  async function handleForceSync() {
    if (Date.now() < syncCooldownUntil || syncing) return;
    setSyncing(true);
    try {
      await requestStrategyForceSync(strategyId);
      const until = Date.now() + FORCE_SYNC_COOLDOWN_MS;
      setSyncCooldownUntil(until);
      localStorage.setItem(`force_sync_strategy_${strategyId}`, String(until));
    } finally {
      setSyncing(false);
    }
  }

  const syncOnCooldown = Date.now() < syncCooldownUntil;
  const syncCooldownSec = syncOnCooldown ? Math.ceil((syncCooldownUntil - Date.now()) / 1000) : 0;

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-sm font-semibold text-fg flex items-center gap-2">
            <Activity size={16} className="text-accent-fg" /> Conexão MT5
          </h3>
        </div>
        <div className="h-20 flex flex-col justify-center gap-2.5" aria-busy="true">
          <span className="sr-only">Carregando…</span>
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  // ─── Estado A: não conectada ───────────────────────────────────────────────
  if (!link) {
    return (
      <>
        <div className="glass-card p-5">
          <h3 className="font-display text-sm font-semibold text-fg flex items-center gap-2 mb-3">
            <Activity size={16} className="text-accent-fg" /> Conexão MT5
          </h3>
          <div className="flex items-center gap-2 text-fg-muted text-sm mb-3">
            <span className="w-2 h-2 rounded-full bg-tint/25" />
            Não conectada
          </div>
          {isAdmin ? (
            <>
              <p className="text-xs text-fg-muted mb-4 leading-relaxed">
                Vincule esta estratégia à conta MT5 para exibir flutuante, P&amp;L do dia e posições abertas.
              </p>
              <Button
                size="sm"
                onClick={() => setConnectOpen(true)}
                className="w-full"
              >
                Conectar ao MT5
              </Button>
            </>
          ) : (
            <p className="text-xs text-fg-muted leading-relaxed">
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
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-sm font-semibold text-fg flex items-center gap-2">
              <Activity size={16} className="text-accent-fg" /> Conexão MT5
            </h3>
            {isAdmin && (
              <button
                onClick={() => setManageOpen(true)}
                className="rounded-md p-1 -m-1 text-fg-subtle hover:text-fg transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                title="Gerenciar"
              >
                <Settings size={16} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-warning-fg text-sm mb-3">
            <RefreshCw size={14} className="animate-spin" />
            Aguardando o primeiro envio do Expert Advisor
          </div>
          <div className="text-xs text-fg-muted leading-relaxed space-y-1">
            <div>Conta <span className="font-mono tabular-nums text-fg">{link.account_login}</span></div>
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
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-sm font-semibold text-fg flex items-center gap-2">
            <Activity size={16} className="text-accent-fg" /> Conexão MT5
          </h3>
          {isAdmin && (
            <button
              onClick={() => setManageOpen(true)}
              className="rounded-md p-1 -m-1 text-fg-subtle hover:text-fg transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
              title="Gerenciar"
            >
              <Settings size={16} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm mb-3">
          {isStale ? (
            <>
              <span className="w-2 h-2 rounded-full bg-warning" />
              <span className="text-warning-fg">Atualização {formatRelative(status.received_at)}</span>
            </>
          ) : (
            <>
              <span className="relative flex w-2 h-2">
                <span className="absolute inline-flex w-full h-full rounded-full bg-success opacity-60 animate-ping" />
                <span className="relative inline-flex w-2 h-2 rounded-full bg-success" />
              </span>
              <span className="text-fg">Conectado · {formatRelative(status.received_at)}</span>
            </>
          )}
        </div>

        <div className="text-xs text-fg-muted mb-3">
          Conta <span className="font-mono tabular-nums whitespace-nowrap text-fg">{status.account_login}</span>
          {status.account_company && <span> · {status.account_company}</span>}
        </div>

        <div className="border-t border-tint/6 pt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-fg-muted">Flutuante</span>
            <span className={`font-mono font-semibold tabular-nums whitespace-nowrap ${pnlClass(status.floating_pnl)}`}>
              {formatCurrency(status.floating_pnl, status.account_currency)}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-fg-muted">P&amp;L do dia</span>
            <span className={`font-mono font-semibold tabular-nums whitespace-nowrap ${pnlClass(status.daily_pnl)}`}>
              {formatCurrency(status.daily_pnl, status.account_currency)}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-fg-muted">Posições</span>
            <span className="font-mono font-semibold tabular-nums whitespace-nowrap text-fg">
              {status.open_positions ?? 0} {status.open_positions === 1 ? 'aberta' : 'abertas'}
            </span>
          </div>
        </div>

        <div className="border-t border-tint/6 mt-3 pt-3 space-y-1 text-xs">
          <div className="flex justify-between gap-3">
            <span className="text-fg-muted">Equity</span>
            <span className="font-mono tabular-nums whitespace-nowrap text-fg">{formatCurrency(status.equity, status.account_currency)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-fg-muted">Saldo</span>
            <span className="font-mono tabular-nums whitespace-nowrap text-fg">{formatCurrency(status.balance, status.account_currency)}</span>
          </div>
        </div>

        <div className="border-t border-tint/6 mt-3 pt-3">
          <button
            onClick={handleForceSync}
            disabled={syncing || syncOnCooldown}
            className="w-full flex items-center justify-center gap-2 rounded-md text-xs text-fg-muted hover:text-fg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors py-1"
          >
            <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
            {syncing
              ? 'Solicitando…'
              : syncOnCooldown
              ? `Atualizar (aguarde ${syncCooldownSec > 60 ? `${Math.ceil(syncCooldownSec / 60)}min` : `${syncCooldownSec}s`})`
              : 'Atualizar agora'}
          </button>
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
