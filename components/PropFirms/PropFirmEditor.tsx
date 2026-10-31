import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Modal, Label, Input, Textarea, FieldMessage } from '../ui';
import { useAuth } from '../../contexts/AuthContext';
import { PropFirm, PropFirmInput, PropFirmPlan, savePropFirm, deletePropFirm } from '../../lib/propFirms';

interface Props {
  open: boolean;
  firm: PropFirm | null; // null = nova
  onClose: () => void;
  onSaved: () => void;
}

// Campos numéricos ficam como texto no form; vazio = null no banco.
type Draft = Omit<PropFirmInput, 'markets' | 'platforms' | 'plans' | 'evaluation_steps' | 'profit_target_pct' | 'daily_drawdown_pct' | 'max_drawdown_pct' | 'profit_split_pct' | 'max_accounts' | 'rating' | 'sort_order'> & {
  markets: string;
  platforms: string;
  plans: { size: string; price: string; currency: string }[];
  evaluation_steps: string;
  profit_target_pct: string;
  daily_drawdown_pct: string;
  max_drawdown_pct: string;
  profit_split_pct: string;
  max_accounts: string;
  rating: string;
  sort_order: string;
};

const str = (v: number | null | undefined) => (v == null ? '' : String(v));
const num = (v: string) => {
  const n = Number(v.replace(',', '.'));
  return v.trim() === '' || Number.isNaN(n) ? null : n;
};
const list = (v: string) => v.split(',').map((s) => s.trim()).filter(Boolean);

const toDraft = (f: PropFirm | null): Draft => ({
  name: f?.name ?? '',
  website: f?.website ?? '',
  logo_url: f?.logo_url ?? '',
  description: f?.description ?? '',
  markets: f?.markets.join(', ') ?? '',
  platforms: f?.platforms.join(', ') ?? '',
  plans: f?.plans.length
    ? f.plans.map((p) => ({ size: String(p.size), price: String(p.price), currency: p.currency }))
    : [{ size: '', price: '', currency: 'USD' }],
  evaluation_steps: str(f?.evaluation_steps),
  profit_target_pct: str(f?.profit_target_pct),
  daily_drawdown_pct: str(f?.daily_drawdown_pct),
  max_drawdown_pct: str(f?.max_drawdown_pct),
  profit_split_pct: str(f?.profit_split_pct),
  payout_frequency: f?.payout_frequency ?? '',
  max_accounts: str(f?.max_accounts),
  rating: str(f?.rating),
  is_active: f?.is_active ?? true,
  sort_order: str(f?.sort_order ?? 0),
});

export const PropFirmEditor: React.FC<Props> = ({ open, firm, onClose, onSaved }) => {
  const { user } = useAuth();
  const [d, setD] = useState<Draft>(toDraft(null));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setD(toDraft(firm)); setError(null); }
  }, [open, firm]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((prev) => ({ ...prev, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !d.name.trim()) return;
    for (const url of [d.website, d.logo_url]) {
      if (url && !/^https:\/\//i.test(url.trim())) { setError('Links precisam começar com https://'); return; }
    }
    const plans: PropFirmPlan[] = d.plans
      .map((p) => ({ size: num(p.size), price: num(p.price), currency: p.currency.trim().toUpperCase() || 'USD' }))
      .filter((p): p is PropFirmPlan => p.size != null && p.price != null);

    const input: PropFirmInput = {
      name: d.name.trim(),
      website: d.website?.trim() || null,
      logo_url: d.logo_url?.trim() || null,
      description: d.description?.trim() || null,
      markets: list(d.markets),
      platforms: list(d.platforms),
      plans,
      evaluation_steps: num(d.evaluation_steps),
      profit_target_pct: num(d.profit_target_pct),
      daily_drawdown_pct: num(d.daily_drawdown_pct),
      max_drawdown_pct: num(d.max_drawdown_pct),
      profit_split_pct: num(d.profit_split_pct),
      payout_frequency: d.payout_frequency?.trim() || null,
      max_accounts: num(d.max_accounts),
      rating: num(d.rating),
      is_active: d.is_active,
      sort_order: num(d.sort_order) ?? 0,
    };

    setSaving(true);
    setError(null);
    try {
      await savePropFirm(input, user.id, firm?.id);
      onSaved();
    } catch (err) {
      console.error('[PropFirmEditor]', err);
      setError('Não foi possível salvar. Confira os campos e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!firm || !window.confirm(`Excluir a mesa ${firm.name}?`)) return;
    try {
      await deletePropFirm(firm.id);
      onSaved();
    } catch (err) {
      console.error('[PropFirmEditor] excluir', err);
      setError('Não foi possível excluir.');
    }
  };

  const field = (k: keyof Draft, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <Label htmlFor={`pf-${k}`}>{label}</Label>
      <Input id={`pf-${k}`} value={d[k] as string} onChange={(e) => set(k, e.target.value as never)} {...props} />
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={firm ? `Editar ${firm.name}` : 'Nova mesa'}
      size="xl"
      closeOnOverlay={false}
      footer={
        <>
          {firm && <Button variant="danger" onClick={remove} className="mr-auto"><Trash2 size={15} /> Excluir</Button>}
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="prop-firm-form" isLoading={saving} disabled={!d.name.trim()}>Salvar</Button>
        </>
      }
    >
      <form id="prop-firm-form" onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {field('name', 'Nome', { required: true })}
          {field('website', 'Site oficial', { placeholder: 'https://' })}
          {field('logo_url', 'URL do logo', { placeholder: 'https://' })}
          {field('rating', 'Nota (0 a 5)', { inputMode: 'decimal' })}
        </div>
        <div>
          <Label htmlFor="pf-description">Descrição</Label>
          <Textarea id="pf-description" value={d.description ?? ''} onChange={(e) => set('description', e.target.value)} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {field('markets', 'Mercados', { placeholder: 'Forex, Índices, Cripto' })}
          {field('platforms', 'Plataformas', { placeholder: 'MT5, cTrader' })}
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {field('evaluation_steps', 'Fases (0 = direta)', { inputMode: 'numeric' })}
          {field('profit_target_pct', 'Meta %', { inputMode: 'decimal' })}
          {field('daily_drawdown_pct', 'DD diário %', { inputMode: 'decimal' })}
          {field('max_drawdown_pct', 'DD máximo %', { inputMode: 'decimal' })}
          {field('profit_split_pct', 'Split %', { inputMode: 'decimal' })}
          {field('payout_frequency', 'Payout', { placeholder: 'Quinzenal' })}
          {field('max_accounts', 'Contas máx.', { inputMode: 'numeric' })}
          {field('sort_order', 'Ordem', { inputMode: 'numeric' })}
        </div>

        <fieldset className="space-y-2">
          <legend className="mb-1.5 text-sm font-medium text-fg">Planos (tamanho da conta e preço)</legend>
          {d.plans.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input aria-label="Tamanho da conta" placeholder="100000" inputMode="numeric" value={p.size}
                onChange={(e) => set('plans', d.plans.map((x, j) => (j === i ? { ...x, size: e.target.value } : x)))} />
              <Input aria-label="Preço" placeholder="549" inputMode="decimal" value={p.price}
                onChange={(e) => set('plans', d.plans.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} />
              <Input aria-label="Moeda" className="w-24" maxLength={3} value={p.currency}
                onChange={(e) => set('plans', d.plans.map((x, j) => (j === i ? { ...x, currency: e.target.value } : x)))} />
              <Button size="icon" variant="ghost" aria-label="Remover plano"
                onClick={() => set('plans', d.plans.filter((_, j) => j !== i))}>
                <Trash2 size={15} />
              </Button>
            </div>
          ))}
          <Button size="sm" variant="secondary" onClick={() => set('plans', [...d.plans, { size: '', price: '', currency: 'USD' }])}>
            <Plus size={14} /> Adicionar plano
          </Button>
        </fieldset>

        <label className="flex items-center gap-2 text-sm text-fg">
          <input type="checkbox" checked={d.is_active} onChange={(e) => set('is_active', e.target.checked)} className="h-4 w-4 accent-brand-green" />
          Visível para os membros
        </label>

        {error && <FieldMessage error>{error}</FieldMessage>}
      </form>
    </Modal>
  );
};
