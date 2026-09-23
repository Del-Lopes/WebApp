import React, { useState } from 'react';
import { X, AlertTriangle, Copy, Check, RefreshCw } from 'lucide-react';
import type { StrategyMt5Link, StrategyMt5Status } from '../../types';
import { rotateStrategyApiKey, disconnectStrategyFromMt5 } from '../../lib/mt5Link';

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
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Gerenciar conexão MT5</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-sm">
          {/* Estado atual */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              {status ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-slate-700">Conectado · última atualização {formatDateTime(status.received_at)}</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-amber-700">Aguardando primeiro envio do EA</span>
                </>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
              <dt className="text-slate-500">Conta MT5</dt>
              <dd className="font-mono text-slate-800">{link.account_login}</dd>

              {link.broker_display && (
                <>
                  <dt className="text-slate-500">Corretora</dt>
                  <dd className="text-slate-800">{link.broker_display}</dd>
                </>
              )}

              {status?.account_server && (
                <>
                  <dt className="text-slate-500">Servidor</dt>
                  <dd className="text-slate-800">{status.account_server}</dd>
                </>
              )}

              {status?.ea_version && (
                <>
                  <dt className="text-slate-500">Versão do EA</dt>
                  <dd className="text-slate-800">{status.ea_version}</dd>
                </>
              )}

              <dt className="text-slate-500">Conectado em</dt>
              <dd className="text-slate-800">{formatDateTime(link.created_at)}</dd>
            </dl>
          </div>

          <hr className="border-slate-200" />

          {/* Chave */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">Chave de API</h3>
            <div className="font-mono text-xs text-slate-600 mb-3">
              {link.api_key_prefix}<span className="text-slate-400">••••••••••••</span>
            </div>

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
                  <span>
                    A chave atual deixará de funcionar imediatamente. O EA em execução vai parar de enviar dados até ser atualizado com a nova chave.
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleRotate}
                    disabled={busy}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {busy ? 'Gerando…' : 'Confirmar revogação'}
                  </button>
                  <button
                    onClick={() => setConfirmingRotate(false)}
                    disabled={busy}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {newKey && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg space-y-2">
                <div className="text-xs font-semibold text-green-800">
                  Nova chave gerada. Copie agora — não será exibida novamente.
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white border border-green-200 rounded-sm px-2 py-1.5 text-xs font-mono text-slate-700 break-all">
                    {newKey}
                  </code>
                  <button
                    onClick={copyKey}
                    className="shrink-0 px-3 py-1.5 bg-white border border-slate-300 hover:border-green-500 hover:text-green-700 text-slate-700 rounded-sm text-xs font-semibold flex items-center gap-1"
                  >
                    {copied ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
                  </button>
                </div>
                <button
                  onClick={() => {
                    setNewKey(null);
                    onChange();
                  }}
                  className="text-xs font-semibold text-green-700 hover:text-green-800"
                >
                  Pronto, fechar
                </button>
              </div>
            )}
          </div>

          <hr className="border-slate-200" />

          {/* Desconectar */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Desconectar do MT5</h3>
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              Remove o vínculo e apaga o histórico de status. O cadastro da estratégia permanece.
            </p>

            {!confirmingDisconnect ? (
              <button
                onClick={() => setConfirmingDisconnect(true)}
                disabled={busy}
                className="text-sm font-semibold text-red-600 hover:text-red-700 transition-colors"
              >
                Desconectar
              </button>
            ) : (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-3">
                <div className="text-xs text-red-800">
                  Confirmar? Isso apaga o histórico de status MT5 desta estratégia.
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleDisconnect}
                    disabled={busy}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {busy ? 'Desconectando…' : 'Confirmar'}
                  </button>
                  <button
                    onClick={() => setConfirmingDisconnect(false)}
                    disabled={busy}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              {errorMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
