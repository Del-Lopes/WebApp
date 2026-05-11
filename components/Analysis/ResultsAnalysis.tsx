import React, { useRef, useState } from 'react';
import {
  ArrowLeft,
  Upload,
  Loader2,
  FileText,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { useMt5Reports, type Mt5Report } from '../../hooks/useMt5Reports';
import { ReportView } from './ReportView';

interface Props {
  onBack: () => void;
}

function StatusBadge({ status }: { status: Mt5Report['status'] }) {
  if (status === 'processing') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
        <Clock size={12} /> Processando
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
        <AlertCircle size={12} /> Falhou
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
      <CheckCircle2 size={12} /> Pronto
    </span>
  );
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatMoney(value: number | null, currency: string | null): string {
  if (value === null || value === undefined) return '—';
  const symbol = currency === 'USD' ? '$' : currency === 'BRL' ? 'R$' : currency ? `${currency} ` : '';
  return `${value < 0 ? '-' : ''}${symbol}${Math.abs(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function ResultsAnalysis({ onBack }: Props) {
  const { reports, loading, uploadReport, deleteReport } = useMt5Reports();
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'info' | 'error'; text: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // permite re-selecionar o mesmo arquivo depois

    setIsUploading(true);
    setFeedback({ type: 'info', text: `Processando ${file.name}...` });
    const result = await uploadReport(file);
    setIsUploading(false);

    if (!result.ok) {
      setFeedback({ type: 'error', text: result.error ?? 'Falha ao processar relatório.' });
    } else {
      setFeedback({ type: 'info', text: 'Relatório processado com sucesso.' });
      if (result.report_id) setSelectedId(result.report_id);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleDelete = async (id: string, fileName: string) => {
    if (!window.confirm(`Apagar o relatório "${fileName}"? Esta ação não pode ser desfeita.`)) return;
    const result = await deleteReport(id);
    if (!result.ok) {
      setFeedback({ type: 'error', text: result.error ?? 'Falha ao apagar.' });
    } else {
      if (selectedId === id) setSelectedId(null);
    }
  };

  // Se há um relatório selecionado, mostra a visualização
  if (selectedId) {
    const report = reports.find((r) => r.id === selectedId);
    if (report) {
      return (
        <ReportView
          report={report}
          onBack={() => setSelectedId(null)}
        />
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Análise de Resultados</h2>
            <p className="text-sm text-slate-500">
              Faça upload do relatório do MetaTrader 5 e veja suas métricas em detalhe.
            </p>
          </div>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60"
        >
          {isUploading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <Upload size={18} />
          )}
          {isUploading ? 'Processando…' : 'Carregar relatório'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".html,.htm"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {feedback && (
        <div
          className={`flex items-start gap-2 px-4 py-3 rounded-xl border text-sm ${
            feedback.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-green-50 border-green-200 text-green-700'
          }`}
        >
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Instruções */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
        <p className="font-semibold mb-1">Como exportar o relatório do MT5</p>
        <ol className="list-decimal pl-5 space-y-0.5 text-blue-800">
          <li>No MetaTrader 5, vá em <strong>Caixa de Ferramentas → Histórico</strong>.</li>
          <li>Clique com o botão direito na lista → <strong>Relatório → HTML (padrão)</strong>.</li>
          <li>Salve o arquivo e faça upload aqui.</li>
        </ol>
      </div>

      {/* Lista de relatórios */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-green-600" size={32} />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white rounded-2xl border border-slate-200">
          <FileText className="mx-auto text-slate-300" size={48} />
          <h3 className="mt-4 text-lg font-semibold text-slate-700">Nenhum relatório ainda</h3>
          <p className="mt-1 text-sm text-slate-500">
            Carregue o primeiro relatório para começar a analisar seus resultados.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div
              key={r.id}
              className="bg-white border border-slate-200 rounded-xl p-4 hover:border-green-400 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <button
                  onClick={() => r.status === 'ready' && setSelectedId(r.id)}
                  disabled={r.status !== 'ready'}
                  className="flex-1 min-w-0 text-left disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-slate-900 truncate">
                      {r.account_name ?? r.file_name}
                    </h3>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {r.account_number && <span>Conta {r.account_number}</span>}
                    {r.broker && <span>{r.broker}</span>}
                    {r.report_date && <span>Data: {formatDateTime(r.report_date)}</span>}
                    <span>Upload: {formatDateTime(r.created_at)}</span>
                  </div>
                  {r.status === 'ready' && r.net_profit !== null && (
                    <div className="mt-2 flex items-center gap-4 text-sm">
                      <span className={r.net_profit >= 0 ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>
                        {formatMoney(r.net_profit, r.currency)}
                      </span>
                      {r.total_trades !== null && (
                        <span className="text-slate-600">{r.total_trades} trades</span>
                      )}
                      {r.profit_trades_percent !== null && (
                        <span className="text-slate-600">{r.profit_trades_percent.toFixed(2)}% acertos</span>
                      )}
                    </div>
                  )}
                  {r.status === 'failed' && r.error_message && (
                    <p className="mt-2 text-xs text-red-600">{r.error_message}</p>
                  )}
                </button>
                <div className="flex items-center gap-1">
                  {r.status === 'ready' && (
                    <button
                      onClick={() => setSelectedId(r.id)}
                      className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Ver análise"
                    >
                      <ChevronRight size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(r.id, r.file_name)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Apagar relatório"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
