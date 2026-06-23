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
  grid_contra_enabled: false,
  grid_contra_lot: 0.01,
  grid_contra_distance: 60.0,
  grid_contra_multiplier: 1.0,
  grid_contra_max_orders: 200,
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
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed ${
      checked ? 'bg-green-500' : 'bg-slate-300'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
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
    <label className="text-sm text-slate-600 flex-1">{label}</label>
    <input
      type="number"
      value={decimal ? value : value}
      step={step}
      min={min}
      disabled={disabled}
      onChange={(e) => {
        const v = decimal ? parseFloat(e.target.value) : parseInt(e.target.value, 10);
        if (!isNaN(v)) onChange(v);
      }}
      className="w-28 text-right border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-mono focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none disabled:opacity-50 disabled:cursor-not-allowed bg-white"
    />
  </div>
);

// ─── Section header ───────────────────────────────────────────────────────────
const SectionHeader: React.FC<{ title: string; enabled: boolean; onToggle: (v: boolean) => void; disabled?: boolean }> = ({
  title, enabled, onToggle, disabled,
}) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-sm font-bold text-slate-900">{title}</span>
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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="px-6 py-5 border-b border-slate-200">
        <div className="flex items-center gap-2 text-xs mb-4">
          <div className={`flex items-center gap-2 ${step === 1 ? 'text-green-600 font-semibold' : 'text-slate-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 1 ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-600'}`}>1</span>
            Conta
          </div>
          <div className="flex-1 h-px bg-slate-200" />
          <div className={`flex items-center gap-2 ${step === 2 ? 'text-green-600 font-semibold' : 'text-slate-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 2 ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-600'}`}>2</span>
            Instalar EA
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Número da conta MT5 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={accountLogin}
                onChange={(e) => setAccountLogin(e.target.value.replace(/\D/g, ''))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                placeholder="12345678"
              />
              <p className="text-xs text-slate-500 mt-1">Disponível no MT5 em Arquivo → Login.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Corretora (opcional)</label>
              <input
                type="text"
                value={broker}
                onChange={(e) => setBroker(e.target.value)}
                maxLength={60}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                placeholder="Ex: XP Investimentos"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}
          </div>
        )}

        {step === 2 && apiKey && (
          <div className="space-y-4">
            {/* Chave */}
            <section className="border border-slate-200 rounded-xl p-4">
              <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center text-xs">1</span>
                Sua chave de API
              </h4>
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 mb-3">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                Esta chave será exibida apenas uma vez. Copie e guarde agora.
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-700 break-all">
                  {apiKey}
                </code>
                <button
                  onClick={() => copy(apiKey, 'key')}
                  className="shrink-0 px-3 py-2 bg-white border border-slate-300 hover:border-green-500 hover:text-green-600 text-slate-600 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  {copiedKey ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar</>}
                </button>
              </div>
            </section>

            {/* Download */}
            <section className="border border-slate-200 rounded-xl p-4">
              <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center text-xs">2</span>
                Baixe o Expert Advisor
              </h4>
              <a
                href={EA_DOWNLOAD_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                <Download size={16} /> Baixar HandBot.ex5
              </a>
              <button
                onClick={() => setHowToOpen((v) => !v)}
                className="mt-3 text-xs font-semibold text-green-700 hover:text-green-800 flex items-center gap-1"
              >
                <ChevronDown size={14} className={`transition-transform ${howToOpen ? 'rotate-180' : ''}`} />
                Como instalar no MT5
              </button>
              {howToOpen && (
                <ol className="mt-3 list-decimal pl-5 text-xs text-slate-600 space-y-1.5 leading-relaxed">
                  <li>Copie o arquivo para <code className="bg-slate-100 px-1 rounded">MQL5/Experts</code> (Arquivo → Abrir Pasta de Dados).</li>
                  <li>No Navegador do MT5 (Ctrl+N), clique direito em "Expert Advisors" → Atualizar.</li>
                  <li>Arraste <code className="bg-slate-100 px-1 rounded">HandBot</code> para o gráfico.</li>
                  <li>Na aba "Entradas", cole a chave em <code className="bg-slate-100 px-1 rounded">ApiKey</code>.</li>
                  <li>Confirme com OK. O EA passará a sincronizar parâmetros automaticamente.</li>
                </ol>
              )}
            </section>

            {/* Autorizar URL */}
            <section className="border border-slate-200 rounded-xl p-4">
              <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center text-xs">3</span>
                Autorize a comunicação
              </h4>
              <p className="text-xs text-slate-600 mb-2 leading-relaxed">
                No MT5: <strong>Ferramentas → Opções → Expert Advisors</strong>. Marque
                "Permitir WebRequest" e adicione o endereço abaixo.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-700 break-all">
                  {SUPABASE_HOST || 'https://<seu-projeto>.supabase.co'}
                </code>
                <button
                  onClick={() => copy(SUPABASE_HOST, 'host')}
                  className="shrink-0 px-3 py-2 bg-white border border-slate-300 hover:border-green-500 hover:text-green-600 text-slate-600 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  {copiedHost ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar</>}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>

      <div className="px-6 py-4 flex justify-between items-center">
        {step === 1 ? (
          <>
            <span />
            <button
              onClick={handleConnect}
              disabled={submitting || !accountLogin}
              className="px-5 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Gerando…' : 'Conectar'}
            </button>
          </>
        ) : (
          <>
            <span />
            <button
              onClick={handleDone}
              className="px-5 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Concluir
            </button>
          </>
        )}
      </div>
    </div>
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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
      <h3 className="text-sm font-bold text-slate-900">Conexão MT5</h3>

      <dl className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
        <dt className="text-slate-500">Conta MT5</dt>
        <dd className="font-mono text-slate-800">{link.account_login}</dd>
        {link.broker_display && (
          <>
            <dt className="text-slate-500">Corretora</dt>
            <dd className="text-slate-800">{link.broker_display}</dd>
          </>
        )}
        <dt className="text-slate-500">Conectado em</dt>
        <dd className="text-slate-800">{formatDateTime(link.created_at)}</dd>
        <dt className="text-slate-500">Chave</dt>
        <dd className="font-mono text-slate-600">
          {link.api_key_prefix}<span className="text-slate-400">••••••••</span>
        </dd>
      </dl>

      <hr className="border-slate-100" />

      {/* Rotar chave */}
      {!newKey && !confirmingRotate && (
        <button
          onClick={() => setConfirmingRotate(true)}
          disabled={busy}
          className="text-sm font-semibold text-slate-700 hover:text-green-700 transition-colors flex items-center gap-1.5"
        >
          <RefreshCw size={14} /> Revogar e gerar nova chave
        </button>
      )}

      {confirmingRotate && !newKey && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
          <div className="flex items-start gap-2 text-xs text-amber-800">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            A chave atual deixará de funcionar. O EA vai parar de sincronizar até ser atualizado com a nova chave.
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRotate}
              disabled={busy}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
            >
              {busy ? 'Gerando…' : 'Confirmar revogação'}
            </button>
            <button onClick={() => setConfirmingRotate(false)} disabled={busy} className="px-3 py-1.5 text-xs font-semibold text-slate-700">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {newKey && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg space-y-2">
          <div className="text-xs font-semibold text-green-800">Nova chave gerada. Copie agora.</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white border border-green-200 rounded px-2 py-1.5 text-xs font-mono text-slate-700 break-all">
              {newKey}
            </code>
            <button
              onClick={copyNewKey}
              className="shrink-0 px-3 py-1.5 bg-white border border-slate-300 hover:border-green-500 hover:text-green-700 text-slate-700 rounded text-xs font-semibold flex items-center gap-1"
            >
              {copied ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
            </button>
          </div>
          <button
            onClick={async () => {
              setNewKey(null);
              const links = await fetchHandbotLinks();
              const updated = links.find((l) => l.id === link.id);
              if (updated) onRotated(updated);
            }}
            className="text-xs font-semibold text-green-700 hover:text-green-800"
          >
            Pronto, fechar
          </button>
        </div>
      )}

      <hr className="border-slate-100" />

      {/* Desconectar */}
      {!confirmingDisconnect ? (
        <button
          onClick={() => setConfirmingDisconnect(true)}
          disabled={busy}
          className="text-sm font-semibold text-red-600 hover:text-red-700 transition-colors flex items-center gap-1.5"
        >
          <Unplug size={14} /> Desconectar do MT5
        </button>
      ) : (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-3">
          <div className="text-xs text-red-800">Isso apaga o vínculo e os parâmetros salvos. Confirmar?</div>
          <div className="flex gap-2">
            <button
              onClick={handleDisconnect}
              disabled={busy}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
            >
              {busy ? 'Desconectando…' : 'Confirmar'}
            </button>
            <button onClick={() => setConfirmingDisconnect(false)} disabled={busy} className="px-3 py-1.5 text-xs font-semibold text-slate-700">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}
    </div>
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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="px-6 py-5 border-b border-slate-200">
        <h3 className="text-base font-bold text-slate-900">Parâmetros do Hand Bot</h3>
        <p className="text-xs text-slate-500 mt-1">
          As alterações são enviadas ao EA na próxima sincronização automática.
        </p>
      </div>

      <div className="px-6 py-5 space-y-6 divide-y divide-slate-100">

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
          <SectionHeader
            title="Grid à Favor"
            enabled={params.grid_ahead_enabled}
            onToggle={(v) => set('grid_ahead_enabled', v)}
          />
          <div className={`space-y-3 pl-2 transition-opacity ${params.grid_ahead_enabled ? '' : 'opacity-40 pointer-events-none'}`}>
            <NumericInput
              label="Distância inicial (pontos)"
              value={params.grid_ahead_distance}
              onChange={(v) => set('grid_ahead_distance', v)}
              step={0.5}
              min={0}
              decimal
            />
            <NumericInput
              label="Multiplicador de lote"
              value={params.grid_ahead_multiplier}
              onChange={(v) => set('grid_ahead_multiplier', v)}
              step={0.01}
              min={1}
              decimal
            />
          </div>
        </div>

        {/* Grid Contra */}
        <div className="pt-4 space-y-3">
          <SectionHeader
            title="Grid Contra"
            enabled={params.grid_contra_enabled}
            onToggle={(v) => set('grid_contra_enabled', v)}
          />
          <div className={`space-y-3 pl-2 transition-opacity ${params.grid_contra_enabled ? '' : 'opacity-40 pointer-events-none'}`}>
            <NumericInput
              label="Lote base"
              value={params.grid_contra_lot}
              onChange={(v) => set('grid_contra_lot', v)}
              step={0.01}
              min={0.01}
              decimal
            />
            <NumericInput
              label="Distância entre ordens (pontos)"
              value={params.grid_contra_distance}
              onChange={(v) => set('grid_contra_distance', v)}
              step={0.5}
              min={0}
              decimal
            />
            <NumericInput
              label="Multiplicador de lote"
              value={params.grid_contra_multiplier}
              onChange={(v) => set('grid_contra_multiplier', v)}
              step={0.01}
              min={1}
              decimal
            />
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
            <span className="text-sm font-bold text-slate-900">Negociação Automática</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Negociação automática Long?</span>
            <Toggle
              checked={params.allow_buy}
              onChange={(v) => set('allow_buy', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Negociação automática Short?</span>
            <Toggle
              checked={params.allow_sell}
              onChange={(v) => set('allow_sell', v)}
            />
          </div>
        </div>

        {/* Atualização de Stop e Entrada Barra-a-Barra */}
        <div className="pt-4 space-y-3">
          <div className="py-1">
            <span className="text-sm font-bold text-slate-900">Atualização Barra-a-Barra</span>
          </div>
          <NumericInput
            label="Folga de stop (pontos)"
            value={params.bar_folga_stop}
            onChange={(v) => set('bar_folga_stop', v)}
            min={0}
          />
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Trailing Stop de Barra</span>
            <Toggle
              checked={params.bar_trailing_enabled}
              onChange={(v) => set('bar_trailing_enabled', v)}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <label className="text-sm text-slate-600 flex-1">Timeframe da Barra</label>
            <select
              value={params.bar_timeframe}
              onChange={(e) => set('bar_timeframe', Number(e.target.value))}
              className="w-28 text-right border border-slate-300 rounded-lg px-2 py-1.5 text-sm font-mono focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white"
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
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Atualizar Entrada</span>
            <Toggle
              checked={params.bar_refresh_entry}
              onChange={(v) => set('bar_refresh_entry', v)}
            />
          </div>
        </div>

        {/* Reset Global */}
        <div className="pt-4 space-y-3">
          <div className="py-1">
            <span className="text-sm font-bold text-slate-900">Reset Global</span>
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
          <p className="text-xs text-slate-500 pl-2">
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
              label="% de flutuante para ativar"
              value={params.dynamic_hedge_percent}
              onChange={(v) => set('dynamic_hedge_percent', v)}
              step={0.1}
              min={0}
              decimal
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3">
        {saveError && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertTriangle size={15} />
            {saveError}
          </div>
        )}
        {saveSuccess && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Check size={15} />
            Parâmetros enviados com sucesso.
          </div>
        )}
        {!saveError && !saveSuccess && <span />}

        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <><Loader2 size={16} className="animate-spin" /> Enviando…</>
          ) : (
            <><Save size={16} /> Enviar Alterações</>
          )}
        </button>
      </div>
    </div>
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
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
          l.id === activeId
            ? 'bg-green-600 text-white border-green-600'
            : 'bg-white text-slate-700 border-slate-300 hover:border-green-500 hover:text-green-700'
        }`}
      >
        <span className="font-mono">{l.account_login}</span>
        {l.broker_display && <span className="opacity-75">· {l.broker_display}</span>}
        {l.id === activeId && <ChevronRight size={12} />}
      </button>
    ))}
    <button
      onClick={onAdd}
      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-dashed border-slate-300 text-slate-500 hover:border-green-500 hover:text-green-700 transition-colors bg-white"
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
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-green-600" size={36} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
          <Bot size={22} className="text-green-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hand Bot</h1>
          <p className="text-sm text-slate-500">Controle remoto de parâmetros do Expert Advisor</p>
        </div>
      </div>

      {links.length === 0 && !addingAccount ? (
        <>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center space-y-2">
            <p className="text-sm text-slate-600 font-medium">Nenhuma conta MT5 vinculada</p>
            <p className="text-xs text-slate-400">
              Conecte o Hand Bot à sua conta MT5 para poder ajustar os parâmetros remotamente.
            </p>
          </div>
          <ConnectSection onConnected={(l) => { loadLinks(); setActiveId(l.id); }} />
        </>
      ) : addingAccount ? (
        <>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAddingAccount(false)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1"
            >
              <X size={14} /> Cancelar
            </button>
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
