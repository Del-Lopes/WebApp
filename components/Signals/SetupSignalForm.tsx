import React, { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { createSetupSignal } from '../../lib/signals';
import { Signal } from '../../types';
import { Button, Label, Input } from '../ui';

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
      <Button
        variant="secondary"
        onClick={() => setOpen(true)}
        className="w-full mb-4"
      >
        <Plus size={18} /> Publicar sinal do setup
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="glass-card p-4 sm:p-5 mb-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-fg-muted">Direção</Label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setAction('BUY')} aria-pressed={action === 'BUY'}
              className={`flex-1 py-2.5 rounded-lg border text-sm font-semibold transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60 ${action === 'BUY' ? 'bg-success/10 text-success-fg border-success/30' : 'bg-tint/3 text-fg-muted border-tint/10 hover:text-fg'}`}>
              Compra
            </button>
            <button type="button" onClick={() => setAction('SELL')} aria-pressed={action === 'SELL'}
              className={`flex-1 py-2.5 rounded-lg border text-sm font-semibold transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60 ${action === 'SELL' ? 'bg-danger/10 text-danger-fg border-danger/30' : 'bg-tint/3 text-fg-muted border-tint/10 hover:text-fg'}`}>
              Venda
            </button>
          </div>
        </div>
        <div>
          <Label className="text-xs text-fg-muted">Símbolo</Label>
          <Input value={symbol} onChange={(e) => setSymbol(e.target.value)} className="font-mono" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div>
          <Label className="text-xs text-fg-muted">Entrada</Label>
          <Input value={entry} onChange={(e) => setEntry(e.target.value)} inputMode="decimal" placeholder="0.00" className="font-mono tabular-nums px-2.5 sm:px-3.5" />
        </div>
        <div>
          <Label className="text-xs text-danger-fg">Stop</Label>
          <Input value={stop} onChange={(e) => setStop(e.target.value)} inputMode="decimal" placeholder="0.00" className="font-mono tabular-nums px-2.5 sm:px-3.5" />
        </div>
        <div>
          <Label className="text-xs text-success-fg">Alvo</Label>
          <Input value={target} onChange={(e) => setTarget(e.target.value)} inputMode="decimal" placeholder="0.00" className="font-mono tabular-nums px-2.5 sm:px-3.5" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs text-fg-muted">Timeframe</Label>
          <Input value={timeframe} onChange={(e) => setTimeframe(e.target.value)} placeholder="ex.: 15min" />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs text-fg-muted">Racional (opcional)</Label>
          <Input value={rationale} onChange={(e) => setRationale(e.target.value)} placeholder="Motivo do sinal" />
        </div>
      </div>

      {error && <p className="text-xs text-danger-fg" role="alert">{error}</p>}

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={saving} className="flex-1">
          {saving ? <Loader2 size={18} className="animate-spin" /> : 'Publicar'}
        </Button>
        <Button variant="ghost" onClick={() => { reset(); setOpen(false); }}>
          Cancelar
        </Button>
      </div>
    </form>
  );
};
