import React, { useEffect, useState } from 'react';
import { Coins, Plus, Minus, Loader2, Check } from 'lucide-react';
import { fetchUserCoins, grantUserCoins } from '../../lib/adminCoins';

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
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
      <h3 className="font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
        <Coins size={18} className="text-amber-500" /> Coins
      </h3>

      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Saldo atual</span>
        {loading ? (
          <Loader2 size={20} className="animate-spin text-slate-300" />
        ) : (
          <span className="text-3xl font-black text-slate-900 tabular-nums flex items-center gap-2">
            {(balance ?? 0).toLocaleString('pt-BR')}
            {justSaved && <Check size={20} className="text-green-600" />}
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
            className="px-2.5 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-bold hover:bg-green-100 transition-colors disabled:opacity-50"
          >
            +{p.toLocaleString('pt-BR')}
          </button>
        ))}
      </div>

      {/* Valor customizado (credita ou debita) */}
      <div className="flex items-center gap-2">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="numeric"
          placeholder="Valor"
          className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-slate-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none text-sm"
        />
        <button
          onClick={() => applyDelta(Math.abs(typed))}
          disabled={saving || !typed}
          title="Creditar"
          className="p-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        </button>
        <button
          onClick={() => applyDelta(-Math.abs(typed))}
          disabled={saving || !typed}
          title="Debitar"
          className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors disabled:opacity-50"
        >
          <Minus size={16} />
        </button>
      </div>

      {error && <p className="text-xs text-rose-600">{error}</p>}
      <p className="text-[11px] text-slate-400">Crédito/débito manual para testes. Registrado em auditoria.</p>
    </div>
  );
};
