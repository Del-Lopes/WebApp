import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy, Plug, RefreshCw, Trash2 } from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, Skeleton } from '../ui';
import { TP_FEATURES, TP_PLANS, traderProApi, type TpDevice, type TpLicenseView } from './traderProApi';

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
const planLabel = (id: string) => TP_PLANS.find((p) => p.id === id)?.label ?? id;

/** Licença do Trader Pro (extensão): gera o código de ativação, lista e revoga os navegadores ativados. */
export const TraderProCard: React.FC = () => {
  const [lic, setLic] = useState<TpLicenseView | null>(null);
  const [devices, setDevices] = useState<TpDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<{ value: string; until: number } | null>(null);
  const [left, setLeft] = useState(0);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);

  const load = useCallback(async () => {
    const { data, error: err } = await traderProApi.devices();
    if (!alive.current) return;
    if (err) setError(err); else { setError(null); setLic(data?.license ?? null); setDevices(data?.devices ?? []); }
    setLoading(false);
  }, []);

  useEffect(() => { alive.current = true; void load(); return () => { alive.current = false; }; }, [load]);

  // contagem regressiva do código
  useEffect(() => {
    if (!code) return;
    const t = setInterval(() => {
      const s = Math.max(0, Math.round((code.until - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) { setCode(null); void load(); }
    }, 1000);
    return () => clearInterval(t);
  }, [code, load]);

  const generate = async () => {
    setBusy(true); setError(null);
    const { data, error: err } = await traderProApi.pair();
    setBusy(false);
    if (err || !data) { setError(err ?? 'Erro ao gerar o código.'); return; }
    setCode({ value: data.code, until: Date.now() + data.expires_in * 1000 }); setLeft(data.expires_in);
  };

  const copy = async () => {
    if (!code) return;
    try { await navigator.clipboard.writeText(code.value); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* sem permissão de área de transferência */ }
  };

  const revoke = async (id: string) => {
    setBusy(true);
    const { error: err } = await traderProApi.revoke(id);
    setBusy(false);
    if (err) setError(err); else void load();
  };

  const active = devices.filter((d) => !d.revoked_at);
  const usable = !!lic && !lic.problem;

  return (
    <Card className="relative overflow-hidden mb-6 md:mb-8">
      <div className="hairline absolute inset-x-0 top-0" aria-hidden />
      <CardHeader
        eyebrow="Extensão de navegador"
        title="Trader Pro"
        action={lic && <Badge tone={usable ? 'success' : 'warning'} dot>{usable ? `Plano ${planLabel(lic.plan)}` : (lic.problem === 'expired' ? 'Vencida' : lic.problem === 'suspended' ? 'Suspensa' : 'Inativa')}</Badge>}
      />

      {loading && <Skeleton className="h-24 w-full" />}

      {!loading && !lic && (
        <EmptyState
          icon={Plug}
          title="Você ainda não tem licença do Trader Pro"
          description="A licença libera execução, Order Flow, Auto BE/STOP e o diário automático na extensão. Fale com a equipe Trader AFK para ativar a sua."
        />
      )}

      {!loading && lic && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-1.5">
            {TP_FEATURES.map((f) => (
              <Badge key={f.id} tone={lic.features.includes(f.id) ? 'accent' : 'neutral'} className={lic.features.includes(f.id) ? '' : 'opacity-50'}>
                {lic.features.includes(f.id) ? '✓' : '✕'} {f.label}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-fg-muted">
            {lic.expires_at ? <>Válida até <span className="text-fg font-mono tabular-nums">{fmt(lic.expires_at)}</span>.</> : 'Sem data de vencimento.'}{' '}
            Navegadores ativados: <span className="text-fg font-mono tabular-nums">{active.length}/{lic.max_devices}</span>.
          </p>

          {usable && (
            <div className="rounded-xl border border-tint/10 bg-tint/3 p-4">
              <p className="eyebrow-muted mb-2">Ativar um navegador</p>
              {!code ? (
                <>
                  <ol className="list-decimal pl-5 text-sm text-fg-muted space-y-1 mb-4">
                    <li>Instale o Trader Pro no Chrome.</li>
                    <li>Clique em <b className="text-fg">Gerar código</b> aqui.</li>
                    <li>Na extensão, abra <b className="text-fg">Config → Licença</b>, cole o código e clique em Ativar.</li>
                  </ol>
                  <Button onClick={generate} isLoading={busy} disabled={active.length >= lic.max_devices}>Gerar código</Button>
                  {active.length >= lic.max_devices && <p className="mt-2 text-xs text-warning-fg">Limite de navegadores atingido: revogue um abaixo para ativar outro.</p>}
                </>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono tabular-nums text-3xl tracking-[0.25em] text-fg select-all" aria-label="Código de ativação">{code.value}</span>
                  <Button variant="secondary" size="sm" onClick={copy}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Copiado' : 'Copiar'}</Button>
                  <span className="text-xs text-fg-subtle">vale por {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')} e só pode ser usado uma vez</span>
                </div>
              )}
              <p className="mt-3 text-xs text-fg-subtle">Nunca compartilhe o código nem a sua licença: cada ativação fica registrada e vale só para o navegador que a usou.</p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="eyebrow-muted">Navegadores</p>
              <Button variant="ghost" size="sm" onClick={() => void load()} aria-label="Atualizar"><RefreshCw size={14} /></Button>
            </div>
            {devices.length === 0 ? (
              <p className="text-sm text-fg-subtle">Nenhum navegador ativado ainda.</p>
            ) : (
              <ul className="divide-y divide-tint/6">
                {devices.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm text-fg truncate">{d.label || 'Navegador sem nome'} {d.revoked_at && <Badge tone="neutral" className="ml-1">revogado</Badge>}</p>
                      <p className="text-xs text-fg-subtle">Ativado em {fmt(d.created_at)} · visto {fmt(d.last_seen_at)}{d.ext_version ? ` · v${d.ext_version}` : ''}</p>
                    </div>
                    {!d.revoked_at && (
                      <Button variant="danger" size="sm" onClick={() => void revoke(d.id)} disabled={busy} aria-label={`Revogar ${d.label || 'navegador'}`}><Trash2 size={14} />Revogar</Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-danger-fg" role="alert">{error}</p>}
    </Card>
  );
};
