import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Coins, Bitcoin, CreditCard, QrCode, ExternalLink, Loader2, CheckCircle2, Sparkles, ShieldCheck } from 'lucide-react';
import { BackButton } from '../BackButton';
import { Badge, Button, Card, EmptyState, FieldMessage, PageHeader, Skeleton } from '../ui';
import type { BadgeTone } from '../ui';
import { cn } from '../../lib/cn';
import {
  CoinOrder, CoinPackage, OrderStatus, PayMethod, METHOD_LABEL, brl,
  fetchMyOrders, fetchPackages, startCheckout,
} from '../../lib/coinStore';
import { fetchStats } from '../../lib/trilhaGain';

interface Props { onBack: () => void }

const METHODS: { id: PayMethod; label: string; hint: string; Icon: React.ElementType; soon?: boolean }[] = [
  { id: 'btcpay', label: 'Cripto', hint: 'BTC, USDT ou USDC', Icon: Bitcoin },
  { id: 'asaas', label: 'Cartão', hint: 'Crédito, na Asaas', Icon: CreditCard },
  { id: 'depix', label: 'Pix', hint: 'Em breve', Icon: QrCode, soon: true },
];

const ERRORS: Record<string, string> = {
  method_unavailable: 'Este meio de pagamento ainda não está disponível.',
  too_many_pending: 'Você tem muitas cobranças em aberto. Aguarde um pouco e tente de novo.',
  package_not_found: 'Pacote indisponível. Atualize a página.',
  not_authenticated: 'Sessão expirada. Entre novamente.',
};

const STATUS: Record<OrderStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Aguardando pagamento', tone: 'warning' },
  paid: { label: 'Pago', tone: 'success' },
  expired: { label: 'Expirado', tone: 'neutral' },
  failed: { label: 'Falhou', tone: 'danger' },
};

export const BuyCoins: React.FC<Props> = ({ onBack }) => {
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [orders, setOrders] = useState<CoinOrder[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [method, setMethod] = useState<PayMethod>('btcpay');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credited, setCredited] = useState<number | null>(null);
  const knownPending = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    const [os, st] = await Promise.all([fetchMyOrders(), fetchStats()]);
    setOrders(os);
    setBalance(st?.total_xp ?? 0);
    return os;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [pk] = await Promise.all([fetchPackages(), refresh()]);
        setPackages(pk);
        setSelected((cur) => cur ?? pk.find((p) => p.highlight)?.id ?? pk[0]?.id ?? null);
      } catch (e) {
        console.error('[BuyCoins] load', e);
        setError('Não foi possível carregar os pacotes.');
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  // Enquanto houver pedido pendente, confere a cada 6s (o webhook credita no servidor).
  const hasPending = orders.some((o) => o.status === 'pending');
  useEffect(() => {
    if (!hasPending) return;
    const t = setInterval(async () => {
      try {
        const os = await refresh();
        for (const o of os) {
          if (o.status === 'paid' && knownPending.current.has(o.id)) {
            knownPending.current.delete(o.id);
            setCredited(o.coins);
          }
        }
      } catch { /* tenta no próximo ciclo */ }
    }, 6000);
    return () => clearInterval(t);
  }, [hasPending, refresh]);

  useEffect(() => {
    orders.filter((o) => o.status === 'pending').forEach((o) => knownPending.current.add(o.id));
  }, [orders]);

  const pkg = packages.find((p) => p.id === selected) ?? null;

  const buy = async () => {
    if (!pkg) return;
    setBusy(true); setError(null); setCredited(null);
    try {
      const { url } = await startCheckout(pkg.id, method);
      window.open(url, '_blank', 'noopener,noreferrer');
      await refresh();
    } catch (e) {
      setError(ERRORS[(e as Error).message] ?? 'Não foi possível criar a cobrança. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  const basePrice = packages[0] ? packages[0].price_brl / packages[0].coins : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        className="mb-0 sm:mb-0"
        leading={<BackButton onClick={onBack} />}
        eyebrow={<span className="inline-flex items-center gap-1.5"><Coins size={12} /> Loja</span>}
        title="Comprar Coins"
        description="Use Coins para análises de IA, painel de tendência e desbloqueios da Trilha. Quanto maior o pacote, mais Coins você leva."
        actions={
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-warning/10 text-warning-fg font-bold font-mono tabular-nums whitespace-nowrap text-sm border border-warning/20">
            <Coins size={16} className="text-warning" />
            {balance === null ? '—' : balance.toLocaleString('pt-BR')}
          </div>
        }
      />

      {credited !== null && (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-success/25 bg-success/10 px-4 py-3 text-sm text-success-fg">
          <CheckCircle2 size={18} /> Pagamento confirmado! <strong className="font-mono">+{credited.toLocaleString('pt-BR')} Coins</strong> na sua conta.
        </div>
      )}

      {/* Pacotes */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-40" />)}</div>
      ) : packages.length === 0 ? (
        <EmptyState title="Nenhum pacote disponível" description="Volte em instantes." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="radiogroup" aria-label="Pacotes de Coins">
          {packages.map((p) => {
            const active = p.id === selected;
            const perCoin = p.price_brl / p.coins;
            const save = basePrice > 0 ? Math.round((1 - perCoin / basePrice) * 100) : 0;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelected(p.id)}
                className={cn(
                  'relative rounded-2xl border p-4 text-left transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60',
                  active ? 'border-accent/60 bg-accent/5' : 'border-tint/10 bg-tint/2 hover:border-tint/20',
                )}
              >
                {p.highlight && (
                  <span className="absolute -top-2.5 right-3"><Badge tone="accent"><Sparkles size={11} /> Mais escolhido</Badge></span>
                )}
                <p className="eyebrow-muted">{p.name}</p>
                <p className="mt-2 flex items-center gap-1.5 font-mono text-2xl font-bold tabular-nums text-fg">
                  <Coins size={20} className="text-warning" />{p.coins.toLocaleString('pt-BR')}
                </p>
                <p className="mt-1 text-sm text-fg-muted">{brl(p.price_brl)}</p>
                <div className="mt-3 h-5">
                  {p.bonus_pct > 0 && <Badge tone="success">+{p.bonus_pct}% bônus</Badge>}
                </div>
                {save > 0 && <p className="mt-1 text-[11px] text-fg-subtle">{save}% mais barato por Coin</p>}
              </button>
            );
          })}
        </div>
      )}

      {/* Meio de pagamento + confirmar */}
      {pkg && (
        <Card className="space-y-4">
          <p className="eyebrow-muted">Como você quer pagar?</p>
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Meio de pagamento">
            {METHODS.map(({ id, label, hint, Icon, soon }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={method === id}
                disabled={soon}
                onClick={() => setMethod(id)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-50',
                  method === id ? 'border-accent/60 bg-accent/5' : 'border-tint/10 hover:border-tint/20',
                )}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-tint/10 bg-tint/5 text-fg-muted"><Icon size={18} /></span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-fg">{label}</span>
                  <span className="block truncate text-xs text-fg-subtle">{hint}</span>
                </span>
              </button>
            ))}
          </div>

          {error && <FieldMessage tone="danger">{error}</FieldMessage>}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-1.5 text-xs text-fg-subtle">
              <ShieldCheck size={14} /> Os Coins entram sozinhos assim que o pagamento é confirmado.
            </p>
            <Button onClick={buy} disabled={busy} className="sm:min-w-56">
              {busy
                ? <><Loader2 size={16} className="animate-spin" /> Gerando cobrança…</>
                : <>Pagar {brl(pkg.price_brl)} · {METHOD_LABEL[method]} <ExternalLink size={14} /></>}
            </Button>
          </div>
        </Card>
      )}

      {/* Histórico */}
      <section aria-labelledby="orders-title" className="space-y-2">
        <h2 id="orders-title" className="eyebrow-muted">Seus pedidos</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-fg-subtle">Nenhuma compra ainda.</p>
        ) : (
          <ul className="space-y-2">
            {orders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-tint/8 bg-tint/2 px-4 py-3">
                <span className="font-mono text-sm font-semibold tabular-nums text-fg">+{o.coins.toLocaleString('pt-BR')} Coins</span>
                <span className="text-sm text-fg-muted">{brl(o.price_brl)} · {METHOD_LABEL[o.method]}</span>
                <span className="text-xs text-fg-subtle">{new Date(o.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                <span className="ml-auto flex items-center gap-2">
                  <Badge tone={STATUS[o.status].tone}>{STATUS[o.status].label}</Badge>
                  {o.status === 'pending' && o.checkout_url && (
                    <a href={o.checkout_url} target="_blank" rel="noopener noreferrer"
                       className="inline-flex items-center gap-1 text-xs font-medium text-accent-fg hover:opacity-80">
                      Abrir pagamento <ExternalLink size={12} />
                    </a>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
