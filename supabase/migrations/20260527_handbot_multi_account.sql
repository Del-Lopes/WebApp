-- Parte 2: Múltiplas contas HandBot por usuário
--
-- Antes: UNIQUE (user_id) em handbot_params bloqueava segunda conta.
-- Depois: UNIQUE (handbot_link_id) — uma linha de params por link (conta MT5).

-- Remove constraint antiga
alter table public.handbot_params
  drop constraint if exists handbot_params_user_id_key;

-- Garante unicidade por link (já existia a FK, agora vira a PK lógica)
alter table public.handbot_params
  add constraint handbot_params_link_id_key unique (handbot_link_id);
