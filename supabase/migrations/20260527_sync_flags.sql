-- Parte 1: Otimização de invocações de edge functions
--
-- needs_sync em handbot_params:
--   true  = usuário salvou parâmetros, EA precisa buscar via edge function
--   false = sem mudanças, EA usa apenas PostgREST (0 invocações)
--
-- force_sync em strategy/portfolio_mt5_status:
--   true  = usuário clicou "Atualizar", EA deve enviar telemetria imediatamente
--   false = comportamento normal (apenas on change)

alter table public.handbot_params
  add column if not exists needs_sync boolean not null default false;

-- Garante que rows existentes não disparam sync desnecessário
update public.handbot_params set needs_sync = false where needs_sync is null;

alter table public.strategy_mt5_status
  add column if not exists force_sync boolean not null default false;

alter table public.portfolio_mt5_status
  add column if not exists force_sync boolean not null default false;
