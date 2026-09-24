import React, { useEffect, useState } from 'react';
import { Coins, Plus, Minus, Loader2, Check } from 'lucide-react';
import { fetchUserCoins, grantUserCoins } from '../../lib/adminCoins';
import { Button, Card, Input, Skeleton } from '../ui';

interface Props {
  userId: string;
}

const PRESETS = [100, 500, 1000, 5000];

// Card do painel admin: mostra o saldo de Coins do usuário e permite
// creditar/debitar manualmente (para testes). Escrita via RPC admin_grant_coins.
export const UserCoinsCard: React.FC<Props> = ({ userId }) => {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchUserCoins(userId).then((b) => { if (alive) { setBalance(b ?? 0); setLoading(false); } });
    return () => { alive = false; };
  }, [userId]);

  const applyDelta = async (delta: number) => {
    if (!delta || Number.isNaN(delta)) { setError('Informe um valor válido.'); return; }
    setSaving(true);
    setError(null);
    try {
      const newBalance = await grantUserCoins(userId, delta, 'admin_panel');
      setBalance(newBalance);
      setAmount('');
      setJustSaved(true);
      window.setTimeout(() => setJustSaved(false), 1500);
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      setError(code.includes('forbidden') ? 'Sem permissão (apenas admin).' : 'Falha ao atualizar Coins.');
    } finally {
      setSaving(false);
    }
  };

  const typed = Number(amount);

  return (
    <Card className="space-y-4">
      <h3 className="font-display font-semibold text-fg border-b border-tint/6 pb-3 flex items-center gap-2">
        <Coins size={18} className="text-warning-fg" /> Coins
      </h3>

      <div className="flex flex-col gap-1">
        <span className="eyebrow-muted">Saldo atual</span>
        {loading ? (
          <Skeleton className="h-9 w-32" />
        ) : (
          <span className="text-3xl font-display font-semibold text-fg font-mono tabular-nums whitespace-nowrap flex items-center gap-2">
            {(balance ?? 0).toLocaleString('pt-BR')}
            {justSaved && <Check size={20} className="text-success-fg" />}
          </span>
        )}
      </div>

      {/* Presets rápidos */}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => applyDelta(p)}
            disabled={saving}
            className="px-2.5 py-1 rounded-lg bg-accent/10 text-accent-fg border border-accent/20 text-xs font-semibold font-mono tabular-nums whitespace-nowrap hover:bg-accent/15 transition-colors disabled:opacity-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            +{p.toLocaleString('pt-BR')}
          </button>
        ))}
      </div>

      {/* Valor customizado (credita ou debita) */}
      <div className="flex items-center gap-2">
        <Input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="numeric"
          placeholder="Valor"
          className="flex-1 min-w-0 font-mono tabular-nums"
        />
        <Button
          size="icon"
          onClick={() => applyDelta(Math.abs(typed))}
          disabled={saving || !typed}
          title="Creditar"
          className="shrink-0"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        </Button>
        <Button
          variant="danger"
          size="icon"
          onClick={() => applyDelta(-Math.abs(typed))}
          disabled={saving || !typed}
          title="Debitar"
          className="shrink-0"
        >
          <Minus size={16} />
        </Button>
      </div>

      {error && <p className="text-xs text-danger-fg">{error}</p>}
      <p className="text-[11px] text-fg-subtle">Crédito/débito manual para testes. Registrado em auditoria.</p>
    </Card>
  );
};
