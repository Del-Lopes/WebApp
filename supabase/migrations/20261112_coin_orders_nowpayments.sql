-- Loja de Coins: troca o meio de pagamento cripto de BTCPay para NOWPayments.
-- Para bancos que já rodaram 20261109_coin_store.sql com o método antigo.
-- Rodar no SQL Editor do Supabase.

begin;

-- Pedidos de teste do método antigo nunca foram pagos (BTCPay não chegou a entrar no ar).
delete from public.coin_orders where method = 'btcpay' and status <> 'paid';

alter table public.coin_orders drop constraint if exists coin_orders_method_check;
alter table public.coin_orders
  add constraint coin_orders_method_check check (method in ('nowpayments', 'asaas', 'depix'));

commit;
