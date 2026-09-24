import React, { useState } from 'react';
import { X, Copy, Check, AlertTriangle, Download, ChevronDown } from 'lucide-react';
import { connectTreasuryAccountToMt5 } from '../../lib/treasuryMt5Link';
import { Button, Label, Input, FieldMessage } from '../ui';

interface TreasuryMt5ConnectModalProps {
  accountId: string;
  accountName: string;
  onClose: () => void;
  onConnected: () => void;
}

// URL do EA Treasury hospedado no Storage. Ajustar conforme o bucket final.
const EA_DOWNLOAD_URL = 'https://armhlcnmaqgudqivkpgt.supabase.co/storage/v1/object/public/mt5-ea/TradexperienceMT5.ex5';

const SUPABASE_HOST = (() => {
  try {
    const url = (import.meta as unknown as { env?: { VITE_SUPABASE_URL?: string } }).env?.VITE_SUPABASE_URL;
    return url ? new URL(url).origin : '';
  } catch {
    return '';
  }
})();

export const TreasuryMt5ConnectModal: React.FC<TreasuryMt5ConnectModalProps> = ({
  accountId,
  accountName,
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
      const res = await connectTreasuryAccountToMt5(accountId, Number(login), broker.trim() || undefined);
      setApiKey(res.api_key);
      setStep(2);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao gerar chave.';
      if (message === 'already_connected') {
        setSubmitError('Esta conta já está conectada. Desconecte antes de criar um novo vínculo.');
      } else if (message === 'account_not_found') {
        setSubmitError('Conta não encontrada.');
      } else if (message === 'forbidden') {
        setSubmitError('Apenas admin/first_mate podem conectar contas da Tesouraria.');
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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200">
      <div className="relative bg-surface border border-tint/10 text-fg rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92dvh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        <div className="hairline absolute inset-x-0 top-0" aria-hidden />
        <div className="px-5 sm:px-6 py-4 border-b border-tint/8 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold text-fg">Conectar conta ao MT5</h2>
            <p className="text-xs text-fg-muted mt-0.5 truncate">{accountName}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="shrink-0 rounded-lg p-1.5 text-fg-subtle hover:text-fg hover:bg-tint/5 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-5 sm:px-6 py-3 border-b border-tint/8 flex items-center gap-2 text-xs">
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

        <div className="ds-scrollbar flex-1 overflow-y-auto px-5 sm:px-6 py-5">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="font-display text-base font-semibold text-fg mb-1">Identifique a conta MT5</h3>
                <p className="text-sm text-fg-muted">
                  O saldo desta conta da Tesouraria será atualizado automaticamente com o equity da conta MT5 informada.
                </p>
              </div>

              <div>
                <Label>
                  <>Número da conta MT5 <span className="text-danger-fg">*</span></>
                </Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={accountLogin}
                  onChange={(e) => setAccountLogin(e.target.value.replace(/\D/g, ''))}
                  aria-invalid={accountError ? true : undefined}
                  className="font-mono tabular-nums"
                  placeholder="12345678"
                />
                {accountError && <FieldMessage error>{accountError}</FieldMessage>}
                <FieldMessage>
                  Disponível no MT5 em Arquivo → Login, ou no rodapé do terminal.
                </FieldMessage>
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

              {submitError && (
                <div className="flex items-start gap-2 p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger-fg">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  {submitError}
                </div>
              )}
            </div>
          )}

          {step === 2 && apiKey && (
            <div className="space-y-5">
              <div>
                <h3 className="font-display text-base font-semibold text-fg mb-1">Instale o Expert Advisor no MT5</h3>
                <p className="text-sm text-fg-muted">Siga os três blocos abaixo para concluir.</p>
              </div>

              <section className="bg-tint/2 border border-tint/8 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-fg mb-2 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-accent/15 text-accent-fg border border-accent/25 flex items-center justify-center text-xs font-mono tabular-nums">1</span>
                  Sua chave de API
                </h4>

                <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg text-xs text-warning-fg mb-3">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>Esta chave será exibida apenas uma vez. Copie e guarde agora.</span>
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
                  <Download size={16} className="shrink-0" /> <span className="truncate">Baixar TradexperienceMT5.ex5</span>
                </a>
                <p className="text-xs text-fg-muted mt-2">
                  Versão 1.0.0 · somente leitura · detecta automaticamente o modo Tesouraria pela chave.
                </p>

                <button
                  onClick={() => setHowToOpen((v) => !v)}
                  className="mt-3 text-xs font-semibold text-accent-fg hover:opacity-80 flex items-center gap-1 rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                >
                  <ChevronDown size={14} className={`transition-transform ${howToOpen ? 'rotate-180' : ''}`} />
                  Como instalar no MT5
                </button>

                {howToOpen && (
                  <ol className="mt-3 list-decimal pl-5 text-xs text-fg-muted space-y-1.5 leading-relaxed">
                    <li>Copie o arquivo para <code className="bg-tint/6 text-fg font-mono px-1 rounded-sm">MQL5/Experts</code> do MT5 (Arquivo → Abrir Pasta de Dados → MQL5 → Experts).</li>
                    <li>No Navegador do MT5 (Ctrl+N), clique direito em "Expert Advisors" → Atualizar.</li>
                    <li>Arraste <code className="bg-tint/6 text-fg font-mono px-1 rounded-sm">TradexperienceMT5</code> para o gráfico de qualquer ativo.</li>
                    <li>Na aba "Entradas", marque <code className="bg-tint/6 text-fg font-mono px-1 rounded-sm">EnableTreasury</code> e cole a chave em <code className="bg-tint/6 text-fg font-mono px-1 rounded-sm">TreasuryApiKey</code>.</li>
                    <li>Confirme com OK.</li>
                  </ol>
                )}
              </section>

              <section className="bg-tint/2 border border-tint/8 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-fg mb-2 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-accent/15 text-accent-fg border border-accent/25 flex items-center justify-center text-xs font-mono tabular-nums">3</span>
                  Autorize a comunicação
                </h4>
                <p className="text-xs text-fg-muted mb-2 leading-relaxed">
                  No MT5: <strong className="text-fg">Ferramentas → Opções → Expert Advisors</strong>. Marque
                  "Permitir WebRequest para URLs listadas" e adicione o endereço abaixo.
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

        <div className="px-5 sm:px-6 py-4 border-t border-tint/8 flex justify-between items-center gap-3">
          {step === 1 ? (
            <>
              <Button variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleAdvance}
                disabled={submitting || !accountLogin}
              >
                {submitting ? 'Gerando…' : 'Avançar'}
              </Button>
            </>
          ) : (
            <>
              <div />
              <Button onClick={onConnected}>
                Concluir
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
