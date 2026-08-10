-- ============================================================
-- Sessão Crypto — agendamento das coletas.
--
-- Sem isto, crypto-snapshot e crypto-unlocks só rodam quando alguém abre a
-- sessão no app. Em feriado ou fim de semana o tráfego cai e o dia fica sem
-- retrato — e um buraco no histórico não se recupera depois, porque o
-- CoinGecko não devolve o trending de ontem.
--
-- Usa pg_cron (agendador) + pg_net (requisição HTTP a partir do banco).
-- As duas functions estão com verify_jwt = false, então a chamada não precisa
-- de header de autenticação.
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

-- ─── Agendamentos ───────────────────────────────────────────────────────────

do $$
declare
  -- TROQUE AQUI ao replicar em outro projeto:
  v_base_url text := 'https://armhlcnmaqgudqivkpgt.supabase.co/functions/v1';
begin
  -- Remove versões anteriores do job (unschedule falha se o nome não existir,
  -- por isso o select condicionado em vez de chamada direta).
  perform cron.unschedule(jobname)
    from cron.job
   where jobname in ('crypto-snapshot-daily', 'crypto-unlocks-daily');

  -- Retrato diário do trending e das categorias.
  -- 00:10 UTC: logo depois da virada do dia em UTC, que é a data usada em
  -- snapshot_date. Capturar sempre no mesmo horário mantém as leituras
  -- comparáveis entre si.
  perform cron.schedule(
    'crypto-snapshot-daily',
    '10 0 * * *',
    format(
      $cmd$
      select net.http_post(
        url := %L,
        body := '{}'::jsonb,
        headers := '{"Content-Type": "application/json"}'::jsonb,
        timeout_milliseconds := 60000
      );
      $cmd$,
      v_base_url || '/crypto-snapshot'
    )
  );

  -- Varredura do calendário de desbloqueios.
  -- 03:30 UTC: separado do snapshot para os dois não competirem por rede.
  -- Com a fila em dia a execução é barata — só relê o que passou de 72h.
  perform cron.schedule(
    'crypto-unlocks-daily',
    '30 3 * * *',
    format(
      $cmd$
      select net.http_post(
        url := %L,
        body := '{}'::jsonb,
        headers := '{"Content-Type": "application/json"}'::jsonb,
        timeout_milliseconds := 120000
      );
      $cmd$,
      v_base_url || '/crypto-unlocks'
    )
  );
end $$;

-- ─── Conferência ────────────────────────────────────────────────────────────
-- Depois de aplicar, os dois jobs devem aparecer aqui com active = true:
--
--   select jobid, jobname, schedule, active from cron.job
--    where jobname like 'crypto-%';
--
-- Histórico de execução (a partir do dia seguinte):
--
--   select j.jobname, r.status, r.return_message, r.start_time
--     from cron.job_run_details r
--     join cron.job j on j.jobid = r.jobid
--    where j.jobname like 'crypto-%'
--    order by r.start_time desc
--    limit 20;
--
-- Atenção: status 'succeeded' aqui significa que o net.http_post foi
-- disparado, não que a edge function terminou bem. Para o resultado real,
-- confira as tabelas (crypto_trending_snapshot, crypto_unlock) ou os logs da
-- function no painel.
