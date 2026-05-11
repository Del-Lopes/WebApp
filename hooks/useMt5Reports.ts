import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export type ReportStatus = 'processing' | 'ready' | 'failed';

export interface Mt5Report {
  id: string;
  user_id: string;
  status: ReportStatus;
  error_message: string | null;

  account_number: string | null;
  account_name: string | null;
  broker: string | null;
  currency: string | null;
  account_type: string | null;
  report_date: string | null;

  net_profit: number | null;
  gross_profit: number | null;
  gross_loss: number | null;
  profit_factor: number | null;
  expected_payoff: number | null;
  recovery_factor: number | null;
  sharpe_ratio: number | null;
  absolute_drawdown: number | null;
  max_drawdown: number | null;
  max_drawdown_percent: number | null;
  relative_drawdown_percent: number | null;
  total_trades: number | null;
  short_trades: number | null;
  short_trades_won_percent: number | null;
  long_trades: number | null;
  long_trades_won_percent: number | null;
  profit_trades: number | null;
  profit_trades_percent: number | null;
  loss_trades: number | null;
  loss_trades_percent: number | null;
  largest_profit: number | null;
  largest_loss: number | null;
  average_profit: number | null;
  average_loss: number | null;

  storage_path: string;
  file_name: string;
  file_size: number | null;

  created_at: string;
  updated_at: string;
}

export interface Mt5Trade {
  id: string;
  report_id: string;
  user_id: string;
  position_id: string | null;
  symbol: string;
  side: 'buy' | 'sell';
  volume: number;
  open_time: string;
  open_price: number;
  stop_loss: number | null;
  take_profit: number | null;
  close_time: string | null;
  close_price: number | null;
  commission: number | null;
  swap: number | null;
  profit: number;
}

export function useMt5Reports() {
  const { user, session } = useAuth();
  const [reports, setReports] = useState<Mt5Report[]>([]);
  const [loading, setLoading] = useState(false);

  const loadReports = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mt5_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Erro ao carregar relatórios:', error.message);
        setReports([]);
        return;
      }
      setReports((data ?? []) as Mt5Report[]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadReports();
    else setReports([]);
  }, [user, loadReports]);

  const uploadReport = useCallback(
    async (file: File): Promise<{ ok: boolean; report_id?: string; error?: string }> => {
      if (!user || !session) return { ok: false, error: 'Não autenticado.' };
      if (!/\.html?$/i.test(file.name)) {
        return { ok: false, error: 'Envie um arquivo .html exportado do MetaTrader 5.' };
      }
      if (file.size > 20 * 1024 * 1024) {
        return { ok: false, error: 'Arquivo muito grande (limite: 20 MB).' };
      }

      // 1. Cria o registro inicial em mt5_reports (status=processing)
      const tempPath = `${user.id}/${crypto.randomUUID()}-${file.name}`;
      const { data: created, error: createErr } = await supabase
        .from('mt5_reports')
        .insert({
          user_id: user.id,
          status: 'processing',
          storage_path: tempPath,
          file_name: file.name,
          file_size: file.size,
        })
        .select('id')
        .single();
      if (createErr || !created) {
        return { ok: false, error: createErr?.message ?? 'Falha ao criar registro.' };
      }

      // 2. Sobe o arquivo
      const { error: upErr } = await supabase.storage
        .from('mt5-reports')
        .upload(tempPath, file, { contentType: 'text/html', upsert: false });
      if (upErr) {
        await supabase.from('mt5_reports').delete().eq('id', created.id);
        return { ok: false, error: `Falha no upload: ${upErr.message}` };
      }

      // 3. Dispara a edge function de parsing
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
        const response = await fetch(`${supabaseUrl}/functions/v1/parse-mt5-report`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ report_id: created.id }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          // Mantém o registro com status=failed (a edge function deve ter marcado)
          await loadReports();
          return { ok: false, error: data?.error ?? 'Falha ao processar o relatório.' };
        }
      } catch (e: any) {
        await loadReports();
        return { ok: false, error: e?.message ?? 'Erro de rede ao processar.' };
      }

      await loadReports();
      return { ok: true, report_id: created.id };
    },
    [user, session, loadReports],
  );

  const deleteReport = useCallback(
    async (reportId: string): Promise<{ ok: boolean; error?: string }> => {
      if (!user) return { ok: false, error: 'Não autenticado.' };
      const report = reports.find((r) => r.id === reportId);
      if (!report) return { ok: false, error: 'Relatório não encontrado.' };

      // Apaga o arquivo do storage (best-effort)
      await supabase.storage.from('mt5-reports').remove([report.storage_path]);

      // Apaga o registro (trades caem em cascata via FK)
      const { error } = await supabase.from('mt5_reports').delete().eq('id', reportId);
      if (error) return { ok: false, error: error.message };

      setReports((prev) => prev.filter((r) => r.id !== reportId));
      return { ok: true };
    },
    [user, reports],
  );

  const loadTrades = useCallback(
    async (reportId: string): Promise<Mt5Trade[]> => {
      const { data, error } = await supabase
        .from('mt5_trades')
        .select('*')
        .eq('report_id', reportId)
        .order('close_time', { ascending: true });
      if (error) {
        console.error('Erro ao carregar trades:', error.message);
        return [];
      }
      return (data ?? []) as Mt5Trade[];
    },
    [],
  );

  return {
    reports,
    loading,
    uploadReport,
    deleteReport,
    loadTrades,
    reloadReports: loadReports,
  };
}
