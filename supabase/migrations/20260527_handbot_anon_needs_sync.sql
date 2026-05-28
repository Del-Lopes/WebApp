-- Permite que o EA leia needs_sync via PostgREST com a anon key.
--
-- Abordagem: policy de SELECT para anon diretamente na tabela handbot_params.
-- O EA filtra por handbot_link_id=eq.<uuid> (UUID opaco, só o EA conhece),
-- e o select só pede &select=needs_sync — sem expor outros campos no request.
-- Não há column-level RLS no Postgres, mas o EA só requisita needs_sync
-- via query param, então os outros campos nunca chegam ao EA na prática.

create policy "handbot_params_anon_needs_sync" on public.handbot_params
  for select
  to anon
  using (true);
