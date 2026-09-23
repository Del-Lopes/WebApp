-- ============================================================
-- Calendário Econômico — agendamento da coleta.
--
-- A cada 5 minutos: mantém atual/projeção/anterior em dia e faz o "atual"
-- aparecer poucos minutos depois da divulgação, mesmo sem ninguém com a sessão
-- aberta. Enquanto houver usuário na tela, o app também dispara o sync (a trava
-- de 60s da function segura a frequência real).
--
-- Usa pg_cron + pg_net. A function está com verify_jwt = false.
--
-- ⚠️ A URL abaixo é do projeto MATRIZ. Ao aplicar em um whitelabel, troque o
--    ref em v_base_url pelo do projeto de destino, senão o cron vai alimentar
--    o banco errado.
--
-- Idempotente: remove o agendamento anterior antes de recriar.
-- Rodar via SQL Editor (precisa de permissão de postgres).
-- ============================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
declare
  -- TROQUE AQUI ao replicar em outro projeto:
  v_base_url text := 'https://armhlcnmaqgudqivkpgt.supabase.co/functions/v1';
begin
  perform cron.unschedule(jobname)
    from cron.job
   where jobname = 'econ-calendar-sync';

  perform cron.schedule(
    'econ-calendar-sync',
    '*/5 * * * *',
    format(
      $cmd$
      select net.http_post(
        url := %L,
        body := '{}'::jsonb,
        headers := '{"Content-Type": "application/json"}'::jsonb,
        timeout_milliseconds := 120000
      );
      $cmd$,
      v_base_url || '/econ-calendar-sync'
    )
  );
end $$;

-- ─── Conferência ────────────────────────────────────────────────────────────
--
--   select jobid, jobname, schedule, active from cron.job
--    where jobname = 'econ-calendar-sync';
--
-- Resultado real da coleta (o cron só confirma que o POST foi disparado):
--
--   select * from public.econ_calendar_sync;
