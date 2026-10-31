import React, { useCallback, useEffect, useState } from 'react';
import { Building2, Scale, Layers, Plus, ExternalLink, Pencil, Star, Check, AlertTriangle } from 'lucide-react';
import { BackButton } from '../BackButton';
import { Button, Card, PageHeader, Skeleton, EmptyState, Badge, Tabs, Table, THead, TBody, TR, TH, TD } from '../ui';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/cn';
import { PropFirm, fetchPropFirms, formatMoney, formatSize, isSafeUrl } from '../../lib/propFirms';
import { PropFirmEditor } from './PropFirmEditor';
import { Gestao } from './Gestao';

interface Props {
  onBack: () => void;
}

type Tab = 'firms' | 'compare' | 'gestao';

const MAX_COMPARE = 4;

export const PropFirms: React.FC<Props> = ({ onBack }) => {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const [tab, setTab] = useState<Tab>('firms');
  const [firms, setFirms] = useState<PropFirm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<PropFirm | 'new' | null>(null);

  const load = useCallback(async () => {
    setError(false);
    try {
      setFirms(await fetchPropFirms());
    } catch (e) {
      console.error('[PropFirms]', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleCompare = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= MAX_COMPARE ? prev : [...prev, id]));

  const compared = firms.filter((f) => selected.includes(f.id));

  return (
    <div className="space-y-6">
      <PageHeader
        className="mb-0 sm:mb-0"
        leading={<BackButton onClick={onBack} />}
        eyebrow={<span className="inline-flex items-center gap-1.5"><Building2 size={12} /> Prop firms</span>}
        title="Mesas Proprietárias"
        description="Conheça as principais mesas, compare regras e custos e planeje a escala das suas contas."
        actions={isAdmin && tab !== 'gestao' && <Button variant="secondary" onClick={() => setEditing('new')}><Plus size={16} /> Nova mesa</Button>}
      />

      <Tabs<Tab>
        aria-label="Seções de mesas proprietárias"
        value={tab}
        onChange={setTab}
        items={[
          { key: 'firms', label: 'Mesas', icon: Building2 },
          { key: 'compare', label: `Comparar${selected.length ? ` (${selected.length})` : ''}`, icon: Scale },
          { key: 'gestao', label: 'Gestão', icon: Layers },
        ]}
      />

      {tab === 'gestao' ? (
        <Gestao firms={firms} />
      ) : error ? (
        <EmptyState
          icon={Building2}
          title="Não foi possível carregar as mesas"
          action={<Button variant="secondary" onClick={load}>Tentar novamente</Button>}
        />
      ) : loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-56 w-full rounded-2xl" />)}
        </div>
      ) : firms.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Nenhuma mesa cadastrada ainda"
          description={isAdmin ? 'Cadastre as mesas para que os membros possam comparar.' : 'Em breve a equipe publicará as principais mesas aqui.'}
          action={isAdmin && <Button onClick={() => setEditing('new')}><Plus size={16} /> Cadastrar mesa</Button>}
        />
      ) : tab === 'firms' ? (
        <>
          <p className="text-sm text-fg-muted">
            Marque até {MAX_COMPARE} mesas para ver lado a lado na aba <strong className="text-fg">Comparar</strong>.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {firms.map((f) => (
              <FirmCard
                key={f.id}
                firm={f}
                selected={selected.includes(f.id)}
                selectDisabled={!selected.includes(f.id) && selected.length >= MAX_COMPARE}
                onToggle={() => toggleCompare(f.id)}
                onEdit={isAdmin ? () => setEditing(f) : undefined}
              />
            ))}
          </div>
        </>
      ) : compared.length < 2 ? (
        <EmptyState
          icon={Scale}
          title="Selecione ao menos 2 mesas"
          description={`Na aba Mesas, marque até ${MAX_COMPARE} mesas para comparar regras, custos e payouts.`}
          action={<Button variant="secondary" onClick={() => setTab('firms')}>Escolher mesas</Button>}
        />
      ) : (
        <CompareTable firms={compared} />
      )}

      <div className="flex items-start gap-2 rounded-xl border border-warning/20 bg-warning/10 p-3">
        <AlertTriangle size={15} className="mt-0.5 shrink-0 text-warning-fg" aria-hidden />
        <p className="text-xs leading-relaxed text-warning-fg">
          Regras, preços e condições das mesas mudam com frequência — confirme sempre no site oficial antes de comprar.
          Simulações são ilustrativas e não garantem resultado. Operar alavancado envolve alto risco de perda.
        </p>
      </div>

      {isAdmin && (
        <PropFirmEditor
          open={editing !== null}
          firm={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
};

const pct = (v: number | null) => (v == null ? '—' : `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(v)}%`);
const steps = (v: number | null) => (v == null ? '—' : v === 0 ? 'Conta direta' : `${v} ${v === 1 ? 'fase' : 'fases'}`);

const cheapest = (f: PropFirm) =>
  f.plans.length ? f.plans.reduce((min, p) => (p.price < min.price ? p : min), f.plans[0]) : null;

const FirmCard: React.FC<{
  firm: PropFirm;
  selected: boolean;
  selectDisabled: boolean;
  onToggle: () => void;
  onEdit?: () => void;
}> = ({ firm, selected, selectDisabled, onToggle, onEdit }) => (
  <Card className={cn('flex flex-col gap-4', selected && 'border-accent/40')}>
    <div className="flex items-start gap-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-tint/10 bg-tint/3">
        {isSafeUrl(firm.logo_url)
          ? <img src={firm.logo_url} alt="" className="h-full w-full object-contain p-1" loading="lazy" />
          : <Building2 size={20} className="text-fg-subtle" aria-hidden />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-display text-lg font-semibold text-fg">{firm.name}</h3>
          {!firm.is_active && <Badge tone="warning">Oculta</Badge>}
        </div>
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-fg-subtle">
          {firm.rating != null && (
            <span className="inline-flex items-center gap-1 text-fg-muted">
              <Star size={12} className="fill-current text-warning-fg" aria-hidden /> {firm.rating.toFixed(1)}
            </span>
          )}
          <span>{steps(firm.evaluation_steps)}</span>
          {firm.platforms.length > 0 && <><span aria-hidden>·</span><span>{firm.platforms.join(', ')}</span></>}
        </p>
      </div>
      {onEdit && (
        <Button size="icon" variant="ghost" onClick={onEdit} aria-label={`Editar ${firm.name}`} title="Editar">
          <Pencil size={15} />
        </Button>
      )}
    </div>

    {firm.description && <p className="line-clamp-2 text-sm text-fg-muted">{firm.description}</p>}

    <dl className="grid grid-cols-3 gap-3 text-center">
      {[
        ['Meta', pct(firm.profit_target_pct)],
        ['DD diário', pct(firm.daily_drawdown_pct)],
        ['DD máx.', pct(firm.max_drawdown_pct)],
        ['Split', pct(firm.profit_split_pct)],
        ['Payout', firm.payout_frequency ?? '—'],
        ['Contas máx.', firm.max_accounts ?? '—'],
      ].map(([k, v]) => (
        <div key={k as string} className="rounded-lg bg-tint/3 px-2 py-2">
          <dt className="eyebrow-muted text-[10px]">{k}</dt>
          <dd className="mt-0.5 truncate text-sm font-medium tabular-nums text-fg">{v}</dd>
        </div>
      ))}
    </dl>

    {firm.plans.length > 0 && (
      <div className="flex flex-wrap gap-1.5">
        {firm.plans.map((p, i) => (
          <span key={i} className="rounded-md border border-tint/10 px-2 py-1 text-xs tabular-nums text-fg-muted">
            {formatSize(p.size)} · <span className="text-fg">{formatMoney(p.price, p.currency)}</span>
          </span>
        ))}
      </div>
    )}

    <div className="mt-auto flex flex-wrap gap-2 pt-1">
      <Button size="sm" variant={selected ? 'primary' : 'secondary'} onClick={onToggle} disabled={selectDisabled} aria-pressed={selected}>
        {selected ? <><Check size={14} /> Comparando</> : <><Scale size={14} /> Comparar</>}
      </Button>
      {isSafeUrl(firm.website) && (
        <a
          href={firm.website}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-sm text-fg-muted transition-colors hover:bg-tint/5 hover:text-fg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          Site oficial <ExternalLink size={13} className="opacity-70" />
        </a>
      )}
    </div>
  </Card>
);

const CompareTable: React.FC<{ firms: PropFirm[] }> = ({ firms }) => {
  // Melhor valor de cada linha numérica ganha destaque (menor custo/maior split...).
  const best = (values: (number | null)[], mode: 'min' | 'max') => {
    const nums = values.filter((v): v is number => v != null);
    if (nums.length < 2) return null;
    return mode === 'min' ? Math.min(...nums) : Math.max(...nums);
  };

  const rows: { label: string; values: (number | null)[]; render: (v: number | null, f: PropFirm) => React.ReactNode; mode?: 'min' | 'max' }[] = [
    { label: 'Avaliação', values: firms.map((f) => f.evaluation_steps), render: (v) => steps(v) },
    { label: 'Menor plano', values: firms.map((f) => cheapest(f)?.price ?? null), mode: 'min', render: (_v, f) => {
      const c = cheapest(f);
      return c ? `${formatSize(c.size)} · ${formatMoney(c.price, c.currency)}` : '—';
    } },
    { label: 'Meta de lucro', values: firms.map((f) => f.profit_target_pct), mode: 'min', render: (v) => pct(v) },
    { label: 'Drawdown diário', values: firms.map((f) => f.daily_drawdown_pct), mode: 'max', render: (v) => pct(v) },
    { label: 'Drawdown máximo', values: firms.map((f) => f.max_drawdown_pct), mode: 'max', render: (v) => pct(v) },
    { label: 'Divisão de lucro', values: firms.map((f) => f.profit_split_pct), mode: 'max', render: (v) => pct(v) },
    { label: 'Contas simultâneas', values: firms.map((f) => f.max_accounts), mode: 'max', render: (v) => v ?? '—' },
    { label: 'Nota', values: firms.map((f) => f.rating), mode: 'max', render: (v) => (v == null ? '—' : v.toFixed(1)) },
  ];

  return (
    <div className="space-y-2">
      <Table>
        <THead>
          <TR>
            <TH className="w-44">Critério</TH>
            {firms.map((f) => <TH key={f.id}>{f.name}</TH>)}
          </TR>
        </THead>
        <TBody>
          {rows.map((r) => {
            const top = r.mode ? best(r.values, r.mode) : null;
            return (
              <TR key={r.label}>
                <TD className="text-fg-muted">{r.label}</TD>
                {firms.map((f, i) => (
                  <TD key={f.id} className={cn('tabular-nums', top != null && r.values[i] === top && 'font-semibold text-accent-fg')}>
                    {r.render(r.values[i], f)}
                  </TD>
                ))}
              </TR>
            );
          })}
          <TR>
            <TD className="text-fg-muted">Payout</TD>
            {firms.map((f) => <TD key={f.id}>{f.payout_frequency ?? '—'}</TD>)}
          </TR>
          <TR>
            <TD className="text-fg-muted">Plataformas</TD>
            {firms.map((f) => <TD key={f.id}>{f.platforms.join(', ') || '—'}</TD>)}
          </TR>
          <TR>
            <TD className="text-fg-muted">Mercados</TD>
            {firms.map((f) => <TD key={f.id}>{f.markets.join(', ') || '—'}</TD>)}
          </TR>
        </TBody>
      </Table>
      <p className="text-xs text-fg-subtle">Em verde, o valor mais favorável de cada critério entre as mesas selecionadas.</p>
    </div>
  );
};
