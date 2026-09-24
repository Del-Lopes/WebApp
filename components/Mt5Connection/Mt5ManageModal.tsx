import React, { useState } from 'react';
import { X, AlertTriangle, Copy, Check, RefreshCw } from 'lucide-react';
import type { StrategyMt5Link, StrategyMt5Status } from '../../types';
import { rotateStrategyApiKey, disconnectStrategyFromMt5 } from '../../lib/mt5Link';
import { Button } from '../ui';

interface Mt5ManageModalProps {
  strategyId: string;
  link: StrategyMt5Link;
  status: StrategyMt5Status | null;
  onClose: () => void;
  onChange: () => void;
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export const Mt5ManageModal: React.FC<Mt5ManageModalProps> = ({
  strategyId,
  link,
  status,
  onClose,
  onChange,
}) => {
  const [confirmingRotate, setConfirmingRotate] = useState(false);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Após rotação, exibe a nova chave (uma vez)
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleRotate = async () => {
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await rotateStrategyApiKey(strategyId);
      setNewKey(res.api_key);
      setConfirmingRotate(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao gerar nova chave.');
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    setErrorMsg(null);
    try {
      await disconnectStrategyFromMt5(strategyId);
      onChange();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao desconectar.');
      setBusy(false);
    }
  };

  const copyKey = async () => {
    if (!newKey) return;
    try {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignorar */
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200">
      <div role="dialog" aria-modal="true" className="relative bg-surface text-fg border border-tint/10 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-xl max-h-[92dvh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        <div className="hairline absolute inset-x-0 top-0" aria-hidden />
        <div className="px-5 sm:px-6 py-4 border-b border-tint/6 flex items-center justify-between gap-4">
          <h2 className="font-display text-lg font-semibold text-fg">Gerenciar conexão MT5</h2>
          <button onClick={onClose} aria-label="Fechar" className="shrink-0 rounded-lg p-1.5 -mr-1.5 text-fg-subtle hover:text-fg hover:bg-tint/5 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto ds-scrollbar px-5 sm:px-6 py-5 space-y-5 text-sm">
          {/* Estado atual */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              {status ? (
                <>
                  <span className="w-2 h-2 shrink-0 rounded-full bg-success" />
                  <span className="text-fg">Conectado · última atualização {formatDateTime(status.received_at)}</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 shrink-0 rounded-full bg-warning" />
                  <span className="text-warning-fg">Aguardando primeiro envio do EA</span>
                </>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
              <dt className="text-fg-muted">Conta MT5</dt>
              <dd className="font-mono tabular-nums whitespace-nowrap text-fg">{link.account_login}</dd>

              {link.broker_display && (
                <>
                  <dt className="text-fg-muted">Corretora</dt>
                  <dd className="text-fg break-words">{link.broker_display}</dd>
                </>
              )}

              {status?.account_server && (
                <>
                  <dt className="text-fg-muted">Servidor</dt>
                  <dd className="text-fg break-words">{status.account_server}</dd>
                </>
              )}

              {status?.ea_version && (
                <>
                  <dt className="text-fg-muted">Versão do EA</dt>
                  <dd className="font-mono tabular-nums text-fg">{status.ea_version}</dd>
                </>
              )}

              <dt className="text-fg-muted">Conectado em</dt>
              <dd className="tabular-nums text-fg">{formatDateTime(link.created_at)}</dd>
            </dl>
          </div>

          <hr className="border-tint/8" />

          {/* Chave */}
          <div>
            <h3 className="font-display text-sm font-semibold text-fg mb-2">Chave de API</h3>
            <div className="font-mono text-xs text-fg-muted mb-3 break-all">
              {link.api_key_prefix}<span className="text-fg-subtle">••••••••••••</span>
            </div>

            {!newKey && !confirmingRotate && (
              <button
                onClick={() => setConfirmingRotate(true)}
                disabled={busy}
                className="text-sm font-semibold text-fg-muted hover:text-accent-fg transition-colors flex items-center gap-1.5 rounded-md focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
              >
                <RefreshCw size={14} /> Revogar e gerar nova chave
              </button>
            )}

            {confirmingRotate && !newKey && (
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg space-y-3">
                <div className="flex items-start gap-2 text-xs text-warning-fg">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>
                    A chave atual deixará de funcionar imediatamente. O EA em execução vai parar de enviar dados até ser atualizado com a nova chave.
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleRotate}
                    disabled={busy}
                    className="px-3 py-1.5 bg-warning/15 border border-warning/30 hover:bg-warning/25 text-warning-fg text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                  >
                    {busy ? 'Gerando…' : 'Confirmar revogação'}
                  </button>
                  <button
                    onClick={() => setConfirmingRotate(false)}
                    disabled={busy}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-fg-muted hover:text-fg hover:bg-tint/5 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {newKey && (
              <div className="p-3 bg-success/10 border border-success/20 rounded-lg space-y-2">
                <div className="text-xs font-semibold text-success-fg">
                  Nova chave gerada. Copie agora — não será exibida novamente.
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 min-w-0 bg-surface border border-success/20 rounded-md px-2 py-1.5 text-xs font-mono text-fg break-all">
                    {newKey}
                  </code>
                  <button
                    onClick={copyKey}
                    className="shrink-0 px-3 py-1.5 bg-tint/5 border border-tint/10 hover:border-accent/50 hover:text-accent-fg text-fg-muted rounded-md text-xs font-semibold transition-colors flex items-center gap-1 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                  >
                    {copied ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
                  </button>
                </div>
                <button
                  onClick={() => {
                    setNewKey(null);
                    onChange();
                  }}
                  className="text-xs font-semibold text-success-fg hover:underline"
                >
                  Pronto, fechar
                </button>
              </div>
            )}
          </div>

          <hr className="border-tint/8" />

          {/* Desconectar */}
          <div>
            <h3 className="font-display text-sm font-semibold text-fg mb-1">Desconectar do MT5</h3>
            <p className="text-xs text-fg-muted mb-3 leading-relaxed">
              Remove o vínculo e apaga o histórico de status. O cadastro da estratégia permanece.
            </p>

            {!confirmingDisconnect ? (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setConfirmingDisconnect(true)}
                disabled={busy}
              >
                Desconectar
              </Button>
            ) : (
              <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg space-y-3">
                <div className="text-xs text-danger-fg">
                  Confirmar? Isso apaga o histórico de status MT5 desta estratégia.
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleDisconnect}
                    disabled={busy}
                    className="px-3 py-1.5 bg-brand-red hover:brightness-110 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                  >
                    {busy ? 'Desconectando…' : 'Confirmar'}
                  </button>
                  <button
                    onClick={() => setConfirmingDisconnect(false)}
                    disabled={busy}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-fg-muted hover:text-fg hover:bg-tint/5 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger-fg" role="alert">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              {errorMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
