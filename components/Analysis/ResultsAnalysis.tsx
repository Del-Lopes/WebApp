import React, { useRef, useState } from 'react';
import {
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
import { BackButton } from '../BackButton';
import { Badge, Button, EmptyState, PageHeader, Skeleton } from '../ui';

interface Props {
  onBack: () => void;
}

function StatusBadge({ status }: { status: Mt5Report['status'] }) {
  if (status === 'processing') {
    return (
      <Badge tone="warning">
        <Clock size={12} /> Processando
      </Badge>
    );
  }
  if (status === 'failed') {
    return (
      <Badge tone="danger">
        <AlertCircle size={12} /> Falhou
      </Badge>
    );
  }
  return (
    <Badge tone="success">
      <CheckCircle2 size={12} /> Pronto
    </Badge>
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
      <PageHeader
        className="mb-0 sm:mb-0"
        leading={<BackButton onClick={onBack} />}
        title="Análise de Resultados"
        description="Faça upload do relatório do MetaTrader 5 e veja suas métricas em detalhe."
        actions={
          <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            {isUploading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Upload size={18} />
            )}
            {isUploading ? 'Processando…' : 'Carregar relatório'}
          </Button>
        }
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".html,.htm"
        onChange={handleFileSelect}
        className="hidden"
      />

      {feedback && (
        <div
          className={`flex items-start gap-2 px-4 py-3 rounded-xl border text-sm ${
            feedback.type === 'error'
              ? 'bg-danger/10 border-danger/20 text-danger-fg'
              : 'bg-success/10 border-success/20 text-success-fg'
          }`}
        >
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Instruções */}
      <div className="bg-tint/3 border border-tint/8 rounded-xl p-4 text-sm text-fg">
        <p className="font-semibold mb-1">Como exportar o relatório do MT5</p>
        <ol className="list-decimal pl-5 space-y-0.5 text-fg-muted">
          <li>No MetaTrader 5, vá em <strong className="text-fg">Caixa de Ferramentas → Histórico</strong>.</li>
          <li>Clique com o botão direito na lista → <strong className="text-fg">Relatório → HTML (padrão)</strong>.</li>
          <li>Salve o arquivo e faça upload aqui.</li>
        </ol>
      </div>

      {/* Lista de relatórios */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum relatório ainda"
          description="Carregue o primeiro relatório para começar a analisar seus resultados."
        />
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div
              key={r.id}
              className="glass-card glass-card-hover rounded-xl p-4"
            >
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <button
                  onClick={() => r.status === 'ready' && setSelectedId(r.id)}
                  disabled={r.status !== 'ready'}
                  className="flex-1 min-w-0 text-left rounded-lg disabled:cursor-not-allowed focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                >
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-display font-semibold text-fg truncate">
                      {r.account_name ?? r.file_name}
                    </h3>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="text-xs text-fg-subtle flex flex-wrap items-center gap-x-3 gap-y-1">
                    {r.account_number && <span className="font-mono tabular-nums">Conta {r.account_number}</span>}
                    {r.broker && <span>{r.broker}</span>}
                    {r.report_date && <span>Data: {formatDateTime(r.report_date)}</span>}
                    <span>Upload: {formatDateTime(r.created_at)}</span>
                  </div>
                  {r.status === 'ready' && r.net_profit !== null && (
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <span className={`font-mono tabular-nums whitespace-nowrap font-semibold ${r.net_profit >= 0 ? 'text-success-fg' : 'text-danger-fg'}`}>
                        {formatMoney(r.net_profit, r.currency)}
                      </span>
                      {r.total_trades !== null && (
                        <span className="font-mono tabular-nums whitespace-nowrap text-fg-muted">{r.total_trades} trades</span>
                      )}
                      {r.profit_trades_percent !== null && (
                        <span className="font-mono tabular-nums whitespace-nowrap text-fg-muted">{r.profit_trades_percent.toFixed(2)}% acertos</span>
                      )}
                    </div>
                  )}
                  {r.status === 'failed' && r.error_message && (
                    <p className="mt-2 text-xs text-danger-fg">{r.error_message}</p>
                  )}
                </button>
                <div className="flex items-center gap-1">
                  {r.status === 'ready' && (
                    <button
                      onClick={() => setSelectedId(r.id)}
                      className="p-2 text-fg-muted hover:text-accent-fg hover:bg-accent/10 rounded-lg transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                      title="Ver análise"
                    >
                      <ChevronRight size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(r.id, r.file_name)}
                    className="p-2 text-fg-muted hover:text-danger-fg hover:bg-danger/10 rounded-lg transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
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
