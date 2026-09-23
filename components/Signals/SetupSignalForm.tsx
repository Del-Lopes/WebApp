import React, { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { createSetupSignal } from '../../lib/signals';
import { Signal } from '../../types';

interface Props {
  onCreated: (signal: Signal) => void;
}

// Formulário simples (admin) para publicar um sinal do setup manual.
export const SetupSignalForm: React.FC<Props> = ({ onCreated }) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [action, setAction] = useState<Signal['action']>('BUY');
  const [symbol, setSymbol] = useState('XAUUSD');
  const [entry, setEntry] = useState('');
  const [stop, setStop] = useState('');
  const [target, setTarget] = useState('');
  const [timeframe, setTimeframe] = useState('');
  const [rationale, setRationale] = useState('');

  const reset = () => {
    setEntry(''); setStop(''); setTarget(''); setTimeframe(''); setRationale('');
    setAction('BUY'); setSymbol('XAUUSD'); setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const entryNum = Number(entry);
    if (!Number.isFinite(entryNum) || entryNum <= 0) {
      setError('Informe um preço de entrada válido.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createSetupSignal({
        action,
        symbol: symbol.trim().toUpperCase() || 'XAUUSD',
        entry_price: entryNum,
        stop_loss: stop ? Number(stop) : null,
        take_profit: target ? Number(target) : null,
        timeframe: timeframe.trim() || null,
        rationale: rationale.trim() || null,
      });
      if (created) onCreated(created);
      reset();
      setOpen(false);
    } catch {
      setError('Não foi possível publicar o sinal. Verifique suas permissões.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors mb-4"
      >
        <Plus size={18} /> Publicar sinal do setup
      </button>
    );
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-hidden text-sm';

  return (
    <form onSubmit={submit} className="rounded-2xl bg-white p-5 ring-1 ring-slate-100 shadow-xs mb-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-500">Direção</label>
          <div className="flex gap-2 mt-1">
            <button type="button" onClick={() => setAction('BUY')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${action === 'BUY' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
              Compra
            </button>
            <button type="button" onClick={() => setAction('SELL')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${action === 'SELL' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
              Venda
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Símbolo</label>
          <input value={symbol} onChange={(e) => setSymbol(e.target.value)} className={`${inputCls} mt-1`} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-500">Entrada</label>
          <input value={entry} onChange={(e) => setEntry(e.target.value)} inputMode="decimal" placeholder="0.00" className={`${inputCls} mt-1`} />
        </div>
        <div>
          <label className="text-xs font-semibold text-rose-500">Stop</label>
          <input value={stop} onChange={(e) => setStop(e.target.value)} inputMode="decimal" placeholder="0.00" className={`${inputCls} mt-1`} />
        </div>
        <div>
          <label className="text-xs font-semibold text-emerald-600">Alvo</label>
          <input value={target} onChange={(e) => setTarget(e.target.value)} inputMode="decimal" placeholder="0.00" className={`${inputCls} mt-1`} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-500">Timeframe</label>
          <input value={timeframe} onChange={(e) => setTimeframe(e.target.value)} placeholder="ex.: 15min" className={`${inputCls} mt-1`} />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-semibold text-slate-500">Racional (opcional)</label>
          <input value={rationale} onChange={(e) => setRationale(e.target.value)} placeholder="Motivo do sinal" className={`${inputCls} mt-1`} />
        </div>
      </div>

      {error && <p className="text-xs text-rose-600">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 transition-colors disabled:opacity-60">
          {saving ? <Loader2 size={18} className="animate-spin" /> : 'Publicar'}
        </button>
        <button type="button" onClick={() => { reset(); setOpen(false); }}
          className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-medium hover:bg-slate-200 transition-colors">
          Cancelar
        </button>
      </div>
    </form>
  );
};
