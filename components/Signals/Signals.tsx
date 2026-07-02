import React, { useEffect, useState } from 'react';
import { Loader2, Radio, Sparkles, UserCog, Info } from 'lucide-react';
import { Signal, SignalSource } from '../../types';
import { fetchSignals } from '../../lib/signals';
import { BackButton } from '../BackButton';
import { useAuth } from '../../contexts/AuthContext';
import { SignalCard } from './SignalCard';
import { SetupSignalForm } from './SetupSignalForm';

interface Props {
  onBack: () => void;
}

const TABS: { key: SignalSource; label: string; Icon: React.ElementType; hint: string }[] = [
  { key: 'auto',  label: 'Sinais Automáticos', Icon: Sparkles, hint: 'Gerados pela nossa estratégia para XAU/USD (EMA + ATR).' },
  { key: 'setup', label: 'Meu Setup',          Icon: UserCog,  hint: 'Sinais publicados manualmente pelo time.' },
];

export const Signals: React.FC<Props> = ({ onBack }) => {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const [tab, setTab] = useState<SignalSource>('auto');
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async (source: SignalSource) => {
    setLoading(true);
    setSignals(await fetchSignals(source));
    setLoading(false);
  };

  useEffect(() => { load(tab); }, [tab]);

  const active = TABS.find((t) => t.key === tab)!;

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <BackButton onClick={onBack} />
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-green-600 text-white flex items-center justify-center">
            <Radio size={18} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Sinais</h1>
            <p className="text-xs text-slate-400">Compra e venda para XAU/USD</p>
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-2 p-1 rounded-2xl bg-slate-100 w-fit">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      <p className="flex items-center gap-2 text-xs text-slate-400">
        <Info size={13} /> {active.hint}
      </p>

      {/* Form de publicação (só admin, só na aba setup) */}
      {isAdmin && tab === 'setup' && (
        <SetupSignalForm onCreated={(s) => setSignals((prev) => [s, ...prev])} />
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-300">
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : signals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center text-slate-400">
          <Radio size={28} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhum sinal por aqui ainda.</p>
          <p className="text-xs text-slate-300 mt-1">
            {tab === 'auto' ? 'Assim que a estratégia disparar, o sinal aparece aqui.' : 'Os sinais do setup aparecerão aqui quando publicados.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {signals.map((s) => <SignalCard key={s.id} signal={s} />)}
        </div>
      )}
    </div>
  );
};
