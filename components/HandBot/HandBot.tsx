import React, { useState, useEffect, useCallback } from 'react';
import {
  Bot, Copy, Check, AlertTriangle, RefreshCw, X,
  ChevronDown, Download, Loader2, Save, Unplug, Plus, ChevronRight,
} from 'lucide-react';
import {
  connectHandbot, rotateHandbotApiKey, disconnectHandbot,
  fetchHandbotLinks, fetchHandbotParams, saveHandbotParams,
  type HandbotLink, type HandbotParams,
} from '../../lib/handbotLink';
import { Button, Card, PageHeader, Label, Input, Select, EmptyState, Skeleton } from '../ui';
import { cn } from '../../lib/cn';

interface HandBotProps {
  onBack: () => void;
}

const SUPABASE_HOST = (() => {
  try {
    const url = (import.meta as unknown as { env?: { VITE_SUPABASE_URL?: string } }).env?.VITE_SUPABASE_URL;
    return url ? new URL(url).origin : '';
  } catch { return ''; }
})();

const EA_DOWNLOAD_URL = 'https://armhlcnmaqgudqivkpgt.supabase.co/storage/v1/object/public/mt5-ea/HandBot.ex5';

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
  } catch { return iso; }
}

const DEFAULT_PARAMS: HandbotParams = {
  trailing_avg_enabled: true,
  trailing_avg_distance: 120,
  trailing_avg_stop: 100,
  trailing_pts_enabled: true,
  trailing_pts_distance: 220,
  trailing_pts_stop: 140,
  break_even_avg_enabled: true,
  break_even_avg_distance: 50,
  break_even_avg_gain: 20,
  break_even_pts_enabled: true,
  break_even_pts_distance: 30,
  break_even_pts_gain: 10,
  add_points_enabled: false,
  add_points_lot: 0.01,
  add_points_distance: 250,
  add_points_avg_distance: 300,
  grid_ahead_enabled: false,
  grid_ahead_distance: 550.0,
  grid_ahead_multiplier: 1.1,
  grid_ahead_enabled_buy: false,
  grid_ahead_distance_buy: 550.0,
  grid_ahead_multiplier_buy: 1.1,
  grid_ahead_lot_buy: 0.01,
  grid_ahead_enabled_sell: false,
  grid_ahead_distance_sell: 550.0,
  grid_ahead_multiplier_sell: 1.1,
  grid_ahead_lot_sell: 0.01,
  grid_contra_enabled: false,
  grid_contra_lot: 0.01,
  grid_contra_distance: 60.0,
  grid_contra_multiplier: 1.0,
  grid_contra_max_orders: 200,
  grid_contra_enabled_buy: false,
  grid_contra_lot_buy: 0.01,
  grid_contra_distance_buy: 60.0,
  grid_contra_multiplier_buy: 1.0,
  grid_contra_enabled_sell: false,
  grid_contra_lot_sell: 0.01,
  grid_contra_distance_sell: 60.0,
  grid_contra_multiplier_sell: 1.0,
  allow_buy: false,
  allow_sell: false,
  bar_folga_stop: 50,
  bar_trailing_enabled: false,
  bar_timeframe: 0,
  bar_refresh_entry: false,
  reset_value_to_add: 100,
  dynamic_hedge_enabled: false,
  dynamic_hedge_percent: 1.0,
  include_manual_trades: false,
};

// ─── Toggle component ────────────────────────────────────────────────────────
const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }> = ({
  checked, onChange, disabled,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-50 disabled:cursor-not-allowed ${
      checked ? 'bg-accent' : 'bg-tint/15'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

// ─── NumericInput ─────────────────────────────────────────────────────────────
const NumericInput: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  disabled?: boolean;
  decimal?: boolean;
}> = ({ label, value, onChange, step = 1, min = 0, disabled, decimal }) => (
  <div className="flex items-center justify-between gap-4">
    <label className="text-sm text-fg-muted flex-1 min-w-0">{label}</label>
    <Input
      type="number"
      value={decimal ? value : value}
      step={step}
      min={min}
      disabled={disabled}
      onChange={(e) => {
        const v = decimal ? parseFloat(e.target.value) : parseInt(e.target.value, 10);
        if (!isNaN(v)) onChange(v);
      }}
      className="w-28 shrink-0 text-right px-3 py-1.5 font-mono tabular-nums"
    />
  </div>
);

// ─── Section header ───────────────────────────────────────────────────────────
const SectionHeader: React.FC<{ title: string; enabled: boolean; onToggle: (v: boolean) => void; disabled?: boolean }> = ({
  title, enabled, onToggle, disabled,
}) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-sm font-semibold text-fg">{title}</span>
    <Toggle checked={enabled} onChange={onToggle} disabled={disabled} />
  </div>
);

// ─── ConnectSection ───────────────────────────────────────────────────────────
const ConnectSection: React.FC<{
  onConnected: (link: HandbotLink) => void;
}> = ({ onConnected }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [accountLogin, setAccountLogin] = useState('');
  const [broker, setBroker] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedHost, setCopiedHost] = useState(false);
  const [howToOpen, setHowToOpen] = useState(false);

  const handleConnect = async () => {
    setError(null);
    const login = accountLogin.trim();
    if (!/^\d{4,}$/.test(login)) {
      setError('Informe um número de conta válido (mínimo 4 dígitos).');
      return;
    }
    setSubmitting(true);
    try {
      const res = await connectHandbot(Number(login), broker.trim() || undefined);
      setApiKey(res.api_key);
      setStep(2);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao gerar chave.';
      if (msg === 'already_connected') {
        setError('Já existe uma conexão ativa. Desconecte primeiro.');
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const copy = async (text: string, which: 'key' | 'host') => {
    try {
      await navigator.clipboard.writeText(text);
      if (which === 'key') { setCopiedKey(true); setTimeout(() => setCopiedKey(false), 2000); }
      else { setCopiedHost(true); setTimeout(() => setCopiedHost(false), 2000); }
    } catch { /* ignorar */ }
  };

  const handleDone = async () => {
    const links = await fetchHandbotLinks();
    // Pega o link mais recente (último conectado)
    const latest = links[links.length - 1];
    if (latest) onConnected(latest);
  };

  return (
    <Card padding="none">
      <div className="px-5 sm:px-6 py-5 border-b border-tint/8">
        <div className="flex items-center gap-2 text-xs mb-4">
          <div className={`flex items-center gap-2 ${step === 1 ? 'text-accent-fg font-semibold' : 'text-fg-muted'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono tabular-nums ${step === 1 ? 'bg-accent text-fg-inverse' : 'bg-tint/8 text-fg-muted'}`}>1</span>
            Conta
          </div>
          <div className="flex-1 h-px bg-tint/10" />
          <div className={`flex items-center gap-2 ${step === 2 ? 'text-accent-fg font-semibold' : 'text-fg-muted'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono tabular-nums ${step === 2 ? 'bg-accent text-fg-inverse' : 'bg-tint/8 text-fg-muted'}`}>2</span>
            Instalar EA
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>
                <>Número da conta MT5 <span className="text-danger-fg">*</span></>
              </Label>
              <Input
                type="text"
                inputMode="numeric"
                value={accountLogin}
                onChange={(e) => setAccountLogin(e.target.value.replace(/\D/g, ''))}
                className="font-mono tabular-nums"
                placeholder="12345678"
              />
              <p className="text-xs text-fg-muted mt-1.5">Disponível no MT5 em Arquivo → Login.</p>
            </div>

            <div>
              <Label>Corretora (opcional)</Label>
              <Input
                type="text"
                value={broker}
                onChange={(e) => setBroker(e.target.value)}
                maxLength={60}
                placeholder="Ex: XP Investimentos"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger-fg">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}
          </div>
        )}

        {step === 2 && apiKey && (
          <div className="space-y-4">
            {/* Chave */}
            <section className="bg-tint/2 border border-tint/8 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-fg mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-accent/15 text-accent-fg border border-accent/25 flex items-center justify-center text-xs font-mono tabular-nums">1</span>
                Sua chave de API
              </h4>
              <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg text-xs text-warning-fg mb-3">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                Esta chave será exibida apenas uma vez. Copie e guarde agora.
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 min-w-0 bg-tint/3 border border-tint/10 rounded-lg px-3 py-2 text-xs font-mono text-fg break-all">
                  {apiKey}
                </code>
                <Button variant="outline" size="sm" onClick={() => copy(apiKey, 'key')} className="shrink-0 text-xs">
                  {copiedKey ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar</>}
                </Button>
              </div>
            </section>

            {/* Download */}
            <section className="bg-tint/2 border border-tint/8 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-fg mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-accent/15 text-accent-fg border border-accent/25 flex items-center justify-center text-xs font-mono tabular-nums">2</span>
                Baixe o Expert Advisor
              </h4>
              <a
                href={EA_DOWNLOAD_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex max-w-full items-center gap-2 bg-tint/6 text-fg border border-tint/10 hover:bg-tint/10 hover:border-tint/20 text-sm font-semibold px-4 py-2 rounded-lg transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
              >
                <Download size={16} className="shrink-0" /> Baixar HandBot.ex5
              </a>
              <button
                onClick={() => setHowToOpen((v) => !v)}
                className="mt-3 text-xs font-semibold text-accent-fg hover:opacity-80 flex items-center gap-1 rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
              >
                <ChevronDown size={14} className={`transition-transform ${howToOpen ? 'rotate-180' : ''}`} />
                Como instalar no MT5
              </button>
              {howToOpen && (
                <ol className="mt-3 list-decimal pl-5 text-xs text-fg-muted space-y-1.5 leading-relaxed">
                  <li>Copie o arquivo para <code className="bg-tint/6 text-fg font-mono px-1 rounded-sm">MQL5/Experts</code> (Arquivo → Abrir Pasta de Dados).</li>
                  <li>No Navegador do MT5 (Ctrl+N), clique direito em "Expert Advisors" → Atualizar.</li>
                  <li>Arraste <code className="bg-tint/6 text-fg font-mono px-1 rounded-sm">HandBot</code> para o gráfico.</li>
                  <li>Na aba "Entradas", cole a chave em <code className="bg-tint/6 text-fg font-mono px-1 rounded-sm">ApiKey</code>.</li>
                  <li>Confirme com OK. O EA passará a sincronizar parâmetros automaticamente.</li>
                </ol>
              )}
            </section>

            {/* Autorizar URL */}
            <section className="bg-tint/2 border border-tint/8 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-fg mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-accent/15 text-accent-fg border border-accent/25 flex items-center justify-center text-xs font-mono tabular-nums">3</span>
                Autorize a comunicação
              </h4>
              <p className="text-xs text-fg-muted mb-2 leading-relaxed">
                No MT5: <strong className="text-fg">Ferramentas → Opções → Expert Advisors</strong>. Marque
                "Permitir WebRequest" e adicione o endereço abaixo.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 min-w-0 bg-tint/3 border border-tint/10 rounded-lg px-3 py-2 text-xs font-mono text-fg break-all">
                  {SUPABASE_HOST || 'https://<seu-projeto>.supabase.co'}
                </code>
                <Button variant="outline" size="sm" onClick={() => copy(SUPABASE_HOST, 'host')} className="shrink-0 text-xs">
                  {copiedHost ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar</>}
                </Button>
              </div>
            </section>
          </div>
        )}
      </div>

      <div className="px-5 sm:px-6 py-4 flex justify-between items-center">
        {step === 1 ? (
          <>
            <span />
            <Button
              onClick={handleConnect}
              disabled={submitting || !accountLogin}
            >
              {submitting ? 'Gerando…' : 'Conectar'}
            </Button>
          </>
        ) : (
          <>
            <span />
            <Button onClick={handleDone}>
              Concluir
            </Button>
          </>
        )}
      </div>
    </Card>
  );
};

// ─── ManageSection ────────────────────────────────────────────────────────────
const ManageSection: React.FC<{
  link: HandbotLink;
  onDisconnected: () => void;
  onRotated: (link: HandbotLink) => void;
}> = ({ link, onDisconnected, onRotated }) => {
  const [confirmingRotate, setConfirmingRotate] = useState(false);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleRotate = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await rotateHandbotApiKey(link.id);
      setNewKey(res.api_key);
      setConfirmingRotate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao gerar nova chave.');
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    setError(null);
    try {
      await disconnectHandbot(link.id);
      onDisconnected();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao desconectar.');
      setBusy(false);
    }
  };

  const copyNewKey = async () => {
    if (!newKey) return;
    try {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignorar */ }
  };

  return (
    <Card className="space-y-4">
      <h3 className="font-display text-base font-semibold text-fg">Conexão MT5</h3>

      <dl className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs min-w-0">
        <dt className="text-fg-muted">Conta MT5</dt>
        <dd className="font-mono tabular-nums text-fg whitespace-nowrap">{link.account_login}</dd>
        {link.broker_display && (
          <>
            <dt className="text-fg-muted">Corretora</dt>
            <dd className="text-fg break-words">{link.broker_display}</dd>
          </>
        )}
        <dt className="text-fg-muted">Conectado em</dt>
        <dd className="text-fg font-mono tabular-nums">{formatDateTime(link.created_at)}</dd>
        <dt className="text-fg-muted">Chave</dt>
        <dd className="font-mono text-fg-muted break-all">
          {link.api_key_prefix}<span className="text-fg-subtle">••••••••</span>
        </dd>
      </dl>

      <hr className="border-tint/6" />

      {/* Rotar chave */}
      {!newKey && !confirmingRotate && (
        <button
          onClick={() => setConfirmingRotate(true)}
          disabled={busy}
          className="text-sm font-semibold text-fg-muted hover:text-accent-fg transition-colors flex items-center gap-1.5 rounded-sm disabled:opacity-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          <RefreshCw size={14} /> Revogar e gerar nova chave
        </button>
      )}

      {confirmingRotate && !newKey && (
        <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg space-y-3">
          <div className="flex items-start gap-2 text-xs text-warning-fg">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            A chave atual deixará de funcionar. O EA vai parar de sincronizar até ser atualizado com a nova chave.
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRotate}
              disabled={busy}
              className="h-9 px-3.5 bg-warning/15 text-warning-fg border border-warning/30 hover:bg-warning/25 hover:border-warning/50 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              {busy ? 'Gerando…' : 'Confirmar revogação'}
            </button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmingRotate(false)} disabled={busy} className="text-xs font-semibold">
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {newKey && (
        <div className="p-3 bg-success/10 border border-success/20 rounded-lg space-y-2">
          <div className="text-xs font-semibold text-success-fg">Nova chave gerada. Copie agora.</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 min-w-0 bg-tint/3 border border-success/20 rounded-md px-2 py-1.5 text-xs font-mono text-fg break-all">
              {newKey}
            </code>
            <Button variant="outline" size="sm" onClick={copyNewKey} className="shrink-0 text-xs">
              {copied ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
            </Button>
          </div>
          <button
            onClick={async () => {
              setNewKey(null);
              const links = await fetchHandbotLinks();
              const updated = links.find((l) => l.id === link.id);
              if (updated) onRotated(updated);
            }}
            className="text-xs font-semibold text-success-fg hover:opacity-80 rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            Pronto, fechar
          </button>
        </div>
      )}

      <hr className="border-tint/6" />

      {/* Desconectar */}
      {!confirmingDisconnect ? (
        <button
          onClick={() => setConfirmingDisconnect(true)}
          disabled={busy}
          className="text-sm font-semibold text-danger-fg hover:opacity-80 transition-colors flex items-center gap-1.5 rounded-sm disabled:opacity-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          <Unplug size={14} /> Desconectar do MT5
        </button>
      ) : (
        <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg space-y-3">
          <div className="text-xs text-danger-fg">Isso apaga o vínculo e os parâmetros salvos. Confirmar?</div>
          <div className="flex gap-2">
            <Button variant="danger" size="sm" onClick={handleDisconnect} disabled={busy} className="text-xs font-semibold">
              {busy ? 'Desconectando…' : 'Confirmar'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmingDisconnect(false)} disabled={busy} className="text-xs font-semibold">
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger-fg">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}
    </Card>
  );
};

// ─── ParamsForm ───────────────────────────────────────────────────────────────
const ParamsForm: React.FC<{
  linkId: string;
  initial: HandbotParams;
  onSaved: (params: HandbotParams) => void;
}> = ({ linkId, initial, onSaved }) => {
  const [params, setParams] = useState<HandbotParams>(initial);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [dirty, setDirty] = useState(false);

  const set = <K extends keyof HandbotParams>(key: K, value: HandbotParams[K]) => {
    setParams((p) => ({ ...p, [key]: value }));
    setDirty(true);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await saveHandbotParams(linkId, params);
      setSaveSuccess(true);
      setDirty(false);
      onSaved(params);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card padding="none">
      <div className="px-5 sm:px-6 py-5 border-b border-tint/8">
        <h3 className="font-display text-lg font-semibold text-fg">Parâmetros do Hand Bot</h3>
        <p className="text-xs text-fg-muted mt-1">
          As alterações são enviadas ao EA na próxima sincronização automática.
        </p>
      </div>

      <div className="px-5 sm:px-6 py-5 space-y-6 divide-y divide-tint/6">

        {/* Trailing Avg */}
        <div className="space-y-3">
          <SectionHeader
            title="Trailing Avg"
            enabled={params.trailing_avg_enabled}
            onToggle={(v) => set('trailing_avg_enabled', v)}
          />
          <div className={`space-y-3 pl-2 transition-opacity ${params.trailing_avg_enabled ? '' : 'opacity-40 pointer-events-none'}`}>
            <NumericInput
              label="Distância de ganho do preço médio para iniciar"
              value={params.trailing_avg_distance}
              onChange={(v) => set('trailing_avg_distance', v)}
            />
            <NumericInput
              label="Distância do stop para o preço atual"
              value={params.trailing_avg_stop}
              onChange={(v) => set('trailing_avg_stop', v)}
            />
          </div>
        </div>

        {/* Trailing Stop pts */}
        <div className="pt-4 space-y-3">
          <SectionHeader
            title="Trailing Stop pts"
            enabled={params.trailing_pts_enabled}
            onToggle={(v) => set('trailing_pts_enabled', v)}
          />
          <div className={`space-y-3 pl-2 transition-opacity ${params.trailing_pts_enabled ? '' : 'opacity-40 pointer-events-none'}`}>
            <NumericInput
              label="Distância de ganho do preço da ordem para iniciar"
              value={params.trailing_pts_distance}
              onChange={(v) => set('trailing_pts_distance', v)}
            />
            <NumericInput
              label="Distância do stop para o preço atual"
              value={params.trailing_pts_stop}
              onChange={(v) => set('trailing_pts_stop', v)}
            />
          </div>
        </div>

        {/* Break Even avg price */}
        <div className="pt-4 space-y-3">
          <SectionHeader
            title="Break Even avg price"
            enabled={params.break_even_avg_enabled}
            onToggle={(v) => set('break_even_avg_enabled', v)}
          />
          <div className={`space-y-3 pl-2 transition-opacity ${params.break_even_avg_enabled ? '' : 'opacity-40 pointer-events-none'}`}>
            <NumericInput
              label="Distância para ligar o Break Even"
              value={params.break_even_avg_distance}
              onChange={(v) => set('break_even_avg_distance', v)}
            />
            <NumericInput
              label="Margem de Ganho do Preço Médio (pontos)"
              value={params.break_even_avg_gain}
              onChange={(v) => set('break_even_avg_gain', v)}
            />
          </div>
        </div>

        {/* Break Even pts */}
        <div className="pt-4 space-y-3">
          <SectionHeader
            title="Break Even pts"
            enabled={params.break_even_pts_enabled}
            onToggle={(v) => set('break_even_pts_enabled', v)}
          />
          <div className={`space-y-3 pl-2 transition-opacity ${params.break_even_pts_enabled ? '' : 'opacity-40 pointer-events-none'}`}>
            <NumericInput
              label="Distância pra ligar o Break Even"
              value={params.break_even_pts_distance}
              onChange={(v) => set('break_even_pts_distance', v)}
            />
            <NumericInput
              label="Margem de gain (pontos)"
              value={params.break_even_pts_gain}
              onChange={(v) => set('break_even_pts_gain', v)}
            />
          </div>
        </div>

        {/* Add - Points */}
        <div className="pt-4 space-y-3">
          <SectionHeader
            title="Add - Points"
            enabled={params.add_points_enabled}
            onToggle={(v) => set('add_points_enabled', v)}
          />
          <div className={`space-y-3 pl-2 transition-opacity ${params.add_points_enabled ? '' : 'opacity-40 pointer-events-none'}`}>
            <NumericInput
              label="Lote Alavancagem"
              value={params.add_points_lot}
              onChange={(v) => set('add_points_lot', v)}
              step={0.01}
              min={0.01}
              decimal
            />
            <NumericInput
              label="Distância para iniciar"
              value={params.add_points_distance}
              onChange={(v) => set('add_points_distance', v)}
            />
            <NumericInput
              label="Distância para manter do preço médio"
              value={params.add_points_avg_distance}
              onChange={(v) => set('add_points_avg_distance', v)}
            />
          </div>
        </div>

        {/* Grid à Favor */}
        <div className="pt-4 space-y-3">
          <div className="py-1">
            <span className="text-sm font-semibold text-fg">Grid à Favor</span>
          </div>
          {/* Grid à Favor — Compra */}
          <div className="pl-2 space-y-3">
            <SectionHeader
              title="Compra"
              enabled={params.grid_ahead_enabled_buy}
              onToggle={(v) => set('grid_ahead_enabled_buy', v)}
            />
            <div className={`space-y-3 pl-2 transition-opacity ${params.grid_ahead_enabled_buy ? '' : 'opacity-40 pointer-events-none'}`}>
              <NumericInput
                label="Lote base"
                value={params.grid_ahead_lot_buy}
                onChange={(v) => set('grid_ahead_lot_buy', v)}
                step={0.01}
                min={0.01}
                decimal
              />
              <NumericInput
                label="Distância inicial (pontos)"
                value={params.grid_ahead_distance_buy}
                onChange={(v) => set('grid_ahead_distance_buy', v)}
                step={0.5}
                min={0}
                decimal
              />
              <NumericInput
                label="Multiplicador de lote"
                value={params.grid_ahead_multiplier_buy}
                onChange={(v) => set('grid_ahead_multiplier_buy', v)}
                step={0.01}
                min={1}
                decimal
              />
            </div>
          </div>
          {/* Grid à Favor — Venda */}
          <div className="pl-2 space-y-3">
            <SectionHeader
              title="Venda"
              enabled={params.grid_ahead_enabled_sell}
              onToggle={(v) => set('grid_ahead_enabled_sell', v)}
            />
            <div className={`space-y-3 pl-2 transition-opacity ${params.grid_ahead_enabled_sell ? '' : 'opacity-40 pointer-events-none'}`}>
              <NumericInput
                label="Lote base"
                value={params.grid_ahead_lot_sell}
                onChange={(v) => set('grid_ahead_lot_sell', v)}
                step={0.01}
                min={0.01}
                decimal
              />
              <NumericInput
                label="Distância inicial (pontos)"
                value={params.grid_ahead_distance_sell}
                onChange={(v) => set('grid_ahead_distance_sell', v)}
                step={0.5}
                min={0}
                decimal
              />
              <NumericInput
                label="Multiplicador de lote"
                value={params.grid_ahead_multiplier_sell}
                onChange={(v) => set('grid_ahead_multiplier_sell', v)}
                step={0.01}
                min={1}
                decimal
              />
            </div>
          </div>
        </div>

        {/* Grid Contra */}
        <div className="pt-4 space-y-3">
          <div className="py-1">
            <span className="text-sm font-semibold text-fg">Grid Contra</span>
          </div>
          {/* Grid Contra — Compra */}
          <div className="pl-2 space-y-3">
            <SectionHeader
              title="Compra"
              enabled={params.grid_contra_enabled_buy}
              onToggle={(v) => set('grid_contra_enabled_buy', v)}
            />
            <div className={`space-y-3 pl-2 transition-opacity ${params.grid_contra_enabled_buy ? '' : 'opacity-40 pointer-events-none'}`}>
              <NumericInput
                label="Lote base"
                value={params.grid_contra_lot_buy}
                onChange={(v) => set('grid_contra_lot_buy', v)}
                step={0.01}
                min={0.01}
                decimal
              />
              <NumericInput
                label="Distância entre ordens (pontos)"
                value={params.grid_contra_distance_buy}
                onChange={(v) => set('grid_contra_distance_buy', v)}
                step={0.5}
                min={0}
                decimal
              />
              <NumericInput
                label="Multiplicador de lote"
                value={params.grid_contra_multiplier_buy}
                onChange={(v) => set('grid_contra_multiplier_buy', v)}
                step={0.01}
                min={1}
                decimal
              />
            </div>
          </div>
          {/* Grid Contra — Venda */}
          <div className="pl-2 space-y-3">
            <SectionHeader
              title="Venda"
              enabled={params.grid_contra_enabled_sell}
              onToggle={(v) => set('grid_contra_enabled_sell', v)}
            />
            <div className={`space-y-3 pl-2 transition-opacity ${params.grid_contra_enabled_sell ? '' : 'opacity-40 pointer-events-none'}`}>
              <NumericInput
                label="Lote base"
                value={params.grid_contra_lot_sell}
                onChange={(v) => set('grid_contra_lot_sell', v)}
                step={0.01}
                min={0.01}
                decimal
              />
              <NumericInput
                label="Distância entre ordens (pontos)"
                value={params.grid_contra_distance_sell}
                onChange={(v) => set('grid_contra_distance_sell', v)}
                step={0.5}
                min={0}
                decimal
              />
              <NumericInput
                label="Multiplicador de lote"
                value={params.grid_contra_multiplier_sell}
                onChange={(v) => set('grid_contra_multiplier_sell', v)}
                step={0.01}
                min={1}
                decimal
              />
            </div>
          </div>
          {/* Máximo de ordens — compartilhado */}
          <div className="pl-2">
            <NumericInput
              label="Máximo de ordens"
              value={params.grid_contra_max_orders}
              onChange={(v) => set('grid_contra_max_orders', v)}
              min={1}
            />
          </div>
        </div>

        {/* Negociação Automática */}
        <div className="pt-4 space-y-3">
          <div className="py-1">
            <span className="text-sm font-semibold text-fg">Negociação Automática</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-fg-muted">Negociação automática Long?</span>
            <Toggle
              checked={params.allow_buy}
              onChange={(v) => set('allow_buy', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-fg-muted">Negociação automática Short?</span>
            <Toggle
              checked={params.allow_sell}
              onChange={(v) => set('allow_sell', v)}
            />
          </div>
        </div>

        {/* Atualização de Stop e Entrada Barra-a-Barra */}
        <div className="pt-4 space-y-3">
          <div className="py-1">
            <span className="text-sm font-semibold text-fg">Atualização Barra-a-Barra</span>
          </div>
          <NumericInput
            label="Folga de stop (pontos)"
            value={params.bar_folga_stop}
            onChange={(v) => set('bar_folga_stop', v)}
            min={0}
          />
          <div className="flex items-center justify-between">
            <span className="text-sm text-fg-muted">Trailing Stop de Barra</span>
            <Toggle
              checked={params.bar_trailing_enabled}
              onChange={(v) => set('bar_trailing_enabled', v)}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <label className="text-sm text-fg-muted flex-1 min-w-0">Timeframe da Barra</label>
            <div className="w-28 shrink-0">
            <Select
              value={params.bar_timeframe}
              onChange={(e) => set('bar_timeframe', Number(e.target.value))}
              className="text-right pl-2 pr-8 py-1.5 font-mono tabular-nums"
            >
              <option value={0}>Atual</option>
              <option value={1}>M1</option>
              <option value={5}>M5</option>
              <option value={15}>M15</option>
              <option value={30}>M30</option>
              <option value={16385}>H1</option>
              <option value={16386}>H2</option>
              <option value={16387}>H3</option>
              <option value={16388}>H4</option>
              <option value={16390}>H6</option>
              <option value={16392}>H8</option>
              <option value={16396}>H12</option>
              <option value={16408}>D1</option>
              <option value={32769}>W1</option>
              <option value={49153}>MN1</option>
            </Select>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-fg-muted">Atualizar Entrada</span>
            <Toggle
              checked={params.bar_refresh_entry}
              onChange={(v) => set('bar_refresh_entry', v)}
            />
          </div>
        </div>

        {/* Reset Global */}
        <div className="pt-4 space-y-3">
          <div className="py-1">
            <span className="text-sm font-semibold text-fg">Reset Global</span>
          </div>
          <NumericInput
            label="% de saldo para liquidar tudo (Cut Gain Dinâmico)"
            value={params.reset_value_to_add}
            onChange={(v) => set('reset_value_to_add', v)}
            step={0.01}
            min={0}
            decimal
          />
        </div>

        {/* Operações Manuais */}
        <div className="pt-4 space-y-3">
          <SectionHeader
            title="Tratar Operações Manuais"
            enabled={params.include_manual_trades}
            onToggle={(v) => set('include_manual_trades', v)}
          />
          <p className="text-xs text-fg-muted pl-2">
            Quando ligado, o trailing stop e break even também são aplicados em posições abertas manualmente (sem magic number do EA).
          </p>
        </div>

        {/* Hedge Dinâmico */}
        <div className="pt-4 space-y-3">
          <SectionHeader
            title="Hedge Dinâmico"
            enabled={params.dynamic_hedge_enabled}
            onToggle={(v) => set('dynamic_hedge_enabled', v)}
          />
          <div className={`space-y-3 pl-2 transition-opacity ${params.dynamic_hedge_enabled ? '' : 'opacity-40 pointer-events-none'}`}>
            <NumericInput
              label="% do saldo para travar o hedge"
              value={params.dynamic_hedge_percent}
              onChange={(v) => set('dynamic_hedge_percent', v)}
              step={0.1}
              min={0}
              decimal
            />
            <p className="text-xs text-fg-muted">
              Percentual do saldo inicial da sessão. Quando o prejuízo flutuante atingir esse valor, o robô trava
              <strong> toda a exposição de uma vez</strong>: cancela as ordens pendentes, remove stops e takes, e
              <strong> para completamente</strong> — não abre entradas, não faz grid, não fecha por meta do dia nem
              por fim de sessão. Para liberar, feche manualmente todas as posições e ordens.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 sm:px-6 py-4 border-t border-tint/8 flex flex-wrap items-center justify-between gap-3">
        {saveError && (
          <div className="flex items-center gap-2 text-sm text-danger-fg min-w-0">
            <AlertTriangle size={15} className="shrink-0" />
            {saveError}
          </div>
        )}
        {saveSuccess && (
          <div className="flex items-center gap-2 text-sm text-success-fg min-w-0">
            <Check size={15} className="shrink-0" />
            Parâmetros enviados com sucesso.
          </div>
        )}
        {!saveError && !saveSuccess && <span />}

        <Button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="ml-auto"
        >
          {saving ? (
            <><Loader2 size={16} className="animate-spin" /> Enviando…</>
          ) : (
            <><Save size={16} /> Enviar Alterações</>
          )}
        </Button>
      </div>
    </Card>
  );
};

// ─── AccountSelector ─────────────────────────────────────────────────────────
const AccountSelector: React.FC<{
  links: HandbotLink[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
}> = ({ links, activeId, onSelect, onAdd }) => (
  <div className="flex items-center gap-2 flex-wrap">
    {links.map((l) => (
      <button
        key={l.id}
        onClick={() => onSelect(l.id)}
        className={cn(
          'flex max-w-full items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60',
          l.id === activeId
            ? 'bg-accent/10 text-accent-fg border-accent/40'
            : 'bg-tint/3 text-fg-muted border-tint/10 hover:border-accent/40 hover:text-fg',
        )}
      >
        <span className="font-mono tabular-nums whitespace-nowrap">{l.account_login}</span>
        {l.broker_display && <span className="opacity-75 truncate">· {l.broker_display}</span>}
        {l.id === activeId && <ChevronRight size={12} className="shrink-0" />}
      </button>
    ))}
    <button
      onClick={onAdd}
      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-dashed border-tint/15 text-fg-muted hover:border-accent/40 hover:text-accent-fg transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
    >
      <Plus size={12} /> Adicionar conta
    </button>
  </div>
);

// ─── HandBot (main) ───────────────────────────────────────────────────────────
export const HandBot: React.FC<HandBotProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState<HandbotLink[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [paramsMap, setParamsMap] = useState<Record<string, HandbotParams>>({});
  const [addingAccount, setAddingAccount] = useState(false);

  const activeLink = links.find((l) => l.id === activeId) ?? null;
  const activeParams = activeId ? (paramsMap[activeId] ?? null) : null;

  const loadLinks = useCallback(async () => {
    setLoading(true);
    try {
      const ls = await fetchHandbotLinks();
      setLinks(ls);
      if (ls.length > 0) {
        const firstId = ls[0].id;
        setActiveId((prev) => prev && ls.find((l) => l.id === prev) ? prev : firstId);
        // Carrega params de todas as contas em paralelo
        const entries = await Promise.all(
          ls.map(async (l) => [l.id, await fetchHandbotParams(l.id)] as const)
        );
        setParamsMap(Object.fromEntries(entries.filter(([, p]) => p !== null)) as Record<string, HandbotParams>);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadLinks(); }, [loadLinks]);

  if (loading) {
    return (
      <div className="space-y-6 min-h-[400px]" aria-busy="true">
        <span className="sr-only">Carregando…</span>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
        </div>
        <Skeleton className="h-8 w-64 max-w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        className="mb-0 sm:mb-0"
        leading={
          <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
            <Bot size={22} className="text-accent-fg" />
          </div>
        }
        title="Hand Bot"
        description="Controle remoto de parâmetros do Expert Advisor"
      />

      {links.length === 0 && !addingAccount ? (
        <>
          <EmptyState
            icon={Bot}
            title="Nenhuma conta MT5 vinculada"
            description="Conecte o Hand Bot à sua conta MT5 para poder ajustar os parâmetros remotamente."
            className="py-8"
          />
          <ConnectSection onConnected={(l) => { loadLinks(); setActiveId(l.id); }} />
        </>
      ) : addingAccount ? (
        <>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAddingAccount(false)}
              className="text-xs font-semibold -ml-3.5"
            >
              <X size={14} /> Cancelar
            </Button>
          </div>
          <ConnectSection
            onConnected={(l) => {
              setAddingAccount(false);
              loadLinks();
              setActiveId(l.id);
            }}
          />
        </>
      ) : (
        <>
          {/* Seletor de contas */}
          {links.length > 0 && (
            <AccountSelector
              links={links}
              activeId={activeId!}
              onSelect={setActiveId}
              onAdd={() => setAddingAccount(true)}
            />
          )}

          {activeLink && (
            <>
              <ManageSection
                link={activeLink}
                onDisconnected={() => {
                  setParamsMap((m) => { const n = { ...m }; delete n[activeLink.id]; return n; });
                  loadLinks().then(() => {
                    setLinks((ls) => {
                      if (ls.length > 0) setActiveId(ls[0].id);
                      else setActiveId(null);
                      return ls;
                    });
                  });
                }}
                onRotated={(l) => setLinks((ls) => ls.map((x) => x.id === l.id ? l : x))}
              />
              <ParamsForm
                key={activeLink.id}
                linkId={activeLink.id}
                initial={activeParams ?? DEFAULT_PARAMS}
                onSaved={(p) => setParamsMap((m) => ({ ...m, [activeLink.id]: p }))}
              />
            </>
          )}
        </>
      )}
    </div>
  );
};
