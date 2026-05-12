import React, { useState } from 'react';
import { X, Copy, Check, AlertTriangle, Download, ChevronDown } from 'lucide-react';
import { connectStrategyToMt5 } from '../../lib/mt5Link';

interface Mt5ConnectModalProps {
  strategyId: string;
  strategyName: string;
  onClose: () => void;
  onConnected: () => void;
}

// URL do EA hospedado no Storage. Ajustar conforme o bucket final.
const EA_DOWNLOAD_URL = 'https://armhlcnmaqgudqivkpgt.supabase.co/storage/v1/object/public/mt5-ea/TradexperienceMonitor.ex5';

// Host autorizado no MT5. Inferido a partir da URL pública do projeto Supabase.
const SUPABASE_HOST = (() => {
  try {
    const url = (import.meta as unknown as { env?: { VITE_SUPABASE_URL?: string } }).env?.VITE_SUPABASE_URL;
    return url ? new URL(url).origin : '';
  } catch {
    return '';
  }
})();

export const Mt5ConnectModal: React.FC<Mt5ConnectModalProps> = ({
  strategyId,
  strategyName,
  onClose,
  onConnected,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [accountLogin, setAccountLogin] = useState('');
  const [broker, setBroker] = useState('');
  const [accountError, setAccountError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);

  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedHost, setCopiedHost] = useState(false);
  const [howToOpen, setHowToOpen] = useState(false);

  const handleAdvance = async () => {
    setAccountError(null);
    const login = accountLogin.trim();
    if (!/^\d{4,}$/.test(login)) {
      setAccountError('Informe um número de conta válido.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await connectStrategyToMt5(strategyId, Number(login), broker.trim() || undefined);
      setApiKey(res.api_key);
      setStep(2);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao gerar chave.';
      if (message === 'already_connected') {
        setSubmitError('Esta estratégia já está conectada. Desconecte antes de criar um novo vínculo.');
      } else if (message === 'strategy_not_found') {
        setSubmitError('Estratégia não encontrada.');
      } else {
        setSubmitError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const copy = async (text: string, which: 'key' | 'host') => {
    try {
      await navigator.clipboard.writeText(text);
      if (which === 'key') {
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
      } else {
        setCopiedHost(true);
        setTimeout(() => setCopiedHost(false), 2000);
      }
    } catch {
      /* clipboard sem permissão — ignorar */
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Conectar estratégia ao MT5</h2>
            <p className="text-xs text-slate-500 mt-0.5">{strategyName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Indicador de passos */}
        <div className="px-6 py-3 border-b border-slate-200 flex items-center gap-2 text-xs">
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

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-1">Identifique a conta MT5</h3>
                <p className="text-sm text-slate-500">
                  Os dados desta estratégia virão exclusivamente da conta informada abaixo.
                </p>
              </div>

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
                {accountError && <p className="text-xs text-red-600 mt-1">{accountError}</p>}
                <p className="text-xs text-slate-500 mt-1">
                  Disponível no MT5 em Arquivo → Login, ou no rodapé do terminal.
                </p>
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
                <p className="text-xs text-slate-500 mt-1">Exibido no painel.</p>
              </div>

              {submitError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  {submitError}
                </div>
              )}
            </div>
          )}

          {step === 2 && apiKey && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-1">Instale o Expert Advisor no MT5</h3>
                <p className="text-sm text-slate-500">Siga os três blocos abaixo para concluir.</p>
              </div>

              {/* Bloco 1: chave */}
              <section className="border border-slate-200 rounded-xl p-4">
                <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center text-xs">1</span>
                  Sua chave de API
                </h4>

                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 mb-3">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>Esta chave será exibida apenas uma vez. Copie e guarde agora.</span>
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

                <p className="text-xs text-slate-500 mt-2">
                  Se perder, é possível revogar e gerar outra na aba Gerenciar.
                </p>
              </section>

              {/* Bloco 2: download */}
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
                  <Download size={16} /> Baixar TradexperienceMonitor.ex5
                </a>
                <p className="text-xs text-slate-500 mt-2">
                  Versão 1.0.0 · somente leitura · não realiza operações.
                </p>

                <button
                  onClick={() => setHowToOpen((v) => !v)}
                  className="mt-3 text-xs font-semibold text-green-700 hover:text-green-800 flex items-center gap-1"
                >
                  <ChevronDown size={14} className={`transition-transform ${howToOpen ? 'rotate-180' : ''}`} />
                  Como instalar no MT5
                </button>

                {howToOpen && (
                  <ol className="mt-3 list-decimal pl-5 text-xs text-slate-600 space-y-1.5 leading-relaxed">
                    <li>Copie o arquivo para <code className="bg-slate-100 px-1 rounded">MQL5/Experts</code> do MT5 (Arquivo → Abrir Pasta de Dados → MQL5 → Experts).</li>
                    <li>No Navegador do MT5 (Ctrl+N), clique direito em "Expert Advisors" → Atualizar.</li>
                    <li>Arraste <code className="bg-slate-100 px-1 rounded">TradexperienceMonitor</code> para o gráfico de qualquer ativo.</li>
                    <li>Na aba "Entradas", cole a chave de API no campo <code className="bg-slate-100 px-1 rounded">ApiKey</code>.</li>
                    <li>Confirme com OK.</li>
                  </ol>
                )}
              </section>

              {/* Bloco 3: autorizar URL */}
              <section className="border border-slate-200 rounded-xl p-4">
                <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center text-xs">3</span>
                  Autorize a comunicação
                </h4>
                <p className="text-xs text-slate-600 mb-2 leading-relaxed">
                  No MT5: <strong>Ferramentas → Opções → Expert Advisors</strong>. Marque
                  "Permitir WebRequest para URLs listadas" e adicione o endereço abaixo.
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

        {/* Rodapé */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center gap-3">
          {step === 1 ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAdvance}
                disabled={submitting || !accountLogin}
                className="px-5 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Gerando…' : 'Avançar'}
              </button>
            </>
          ) : (
            <>
              <div />
              <button
                onClick={onConnected}
                className="px-5 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Concluir
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
