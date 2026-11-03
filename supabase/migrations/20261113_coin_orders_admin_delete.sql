-- Loja de Coins: o admin pode excluir pedidos NÃO pagos (pendentes, expirados, falhos).
-- Pedido pago nunca é excluído: é o registro do crédito e da receita.
-- Rodar no SQL Editor do Supabase.

begin;

drop policy if exists "coin_orders_admin_delete" on public.coin_orders;
create policy "coin_orders_admin_delete" on public.coin_orders
  for delete to authenticated
  using (
    status <> 'paid'
    and credited_at is null
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

commit;
