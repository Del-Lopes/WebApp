-- ============================================================
-- Calendário Econômico — interpretação por ativo (XAUUSD, NAS100, US30,
-- Mini Índice, Mini Dólar e BTC).
--
-- Fica em coluna própria, separada de `interpretation`: as interpretações já
-- geradas continuam valendo e a edge econ-calendar-sync só completa a parte
-- dos ativos, em lotes, priorizando os próximos eventos.
--
-- Leitura: a policy existente (authenticated) já cobre as colunas novas.
-- Escrita: apenas service_role. Idempotente.
-- ============================================================

alter table public.econ_event_profile
  add column if not exists asset_interpretation   jsonb,
  add column if not exists assets_interpreted_at  timestamptz,
  add column if not exists assets_error           text;
