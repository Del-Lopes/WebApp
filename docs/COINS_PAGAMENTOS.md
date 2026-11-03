# Loja de Coins — configuração dos pagamentos

Fluxo: `BuyCoins` → edge `coin-checkout` (cria pedido + cobrança) → cliente paga →
gateway chama o webhook → webhook **reconsulta o gateway** → RPC `credit_coin_order`
(idempotente) soma em `trilha_stats.total_xp`.

URLs dos webhooks (projeto `armhlcnmaqgudqivkpgt`):

- NOWPayments: `https://armhlcnmaqgudqivkpgt.supabase.co/functions/v1/nowpayments-webhook`
- Asaas:       `https://armhlcnmaqgudqivkpgt.supabase.co/functions/v1/asaas-webhook`

## 1. Ordem de ativação

1. Migrations no SQL Editor: `20261109_coin_store.sql` e, se ela já tinha sido rodada
   antes da troca de gateway, `20261112_coin_orders_nowpayments.sql`.
2. Configurar a NOWPayments (seção 2) e a Asaas (seção 3).
3. Cadastrar os secrets (seção 4).
4. Publicar as functions (seção 5).
5. Testar (seção 6).

## 2. NOWPayments (cripto)

> Pontos marcados com **(confirmar)** dependem da conta/versão atual da NOWPayments.

1. Crie a conta em nowpayments.io e conclua a verificação pedida **(confirmar se aceitam lojista do Brasil)**.
2. **Carteira de recebimento:** em *Settings → Payments → Payout wallet*, cadastre o endereço da sua
   carteira para as moedas que quer aceitar (ex.: USDT, USDC, BTC). Confirme se o modo é
   **não custodial** (o valor vai direto para a sua carteira) ou custodial **(confirmar)**.
3. **Moedas aceitas:** ative as moedas/redes desejadas. O cliente escolhe a moeda na página da invoice.
4. **Moeda de preço:** as invoices são criadas em **BRL**, com **preço fixo** (`is_fixed_rate`) e a taxa
   da NOWPayments paga por você (`is_fee_paid_by_user: false`) **(confirmar que BRL está disponível na sua conta)**.
5. **API Key:** *Settings → Payments → API keys* → gere uma chave (será `NOWPAYMENTS_API_KEY`).
6. **IPN secret:** *Settings → Payments → Instant payment notifications* → gere o segredo
   (será `NOWPAYMENTS_IPN_SECRET`). A URL do IPN é enviada pelo próprio `coin-checkout` em cada invoice,
   não precisa cadastrar.
7. **Sandbox:** `https://account-sandbox.nowpayments.io` com a API em `https://api-sandbox.nowpayments.io/v1`
   (defina `NOWPAYMENTS_API_URL` para testar; chaves e IPN secret do sandbox são separados).

## 3. Asaas (cartão)

1. Chave de API: *Integrações → Chave de API* (sandbox: `https://api-sandbox.asaas.com/v3`).
2. Webhook: *Integrações → Webhooks → Novo*:
   - URL: a da Asaas acima, versão **v3**
   - **Token de autenticação:** um valor longo aleatório (será `ASAAS_WEBHOOK_TOKEN`)
   - Eventos: `PAYMENT_CONFIRMED` e `PAYMENT_RECEIVED`
3. O checkout usa **link de pagamento avulso** só de cartão — assim a Asaas coleta os dados do
   comprador na página dela, sem pedir CPF no nosso app.
4. A conta precisa estar aprovada para cobrança por cartão.

## 4. Secrets no Supabase

```
NOWPAYMENTS_API_KEY     <api key>
NOWPAYMENTS_IPN_SECRET  <segredo do IPN>
NOWPAYMENTS_API_URL     (opcional; sandbox: https://api-sandbox.nowpayments.io/v1)
ASAAS_API_KEY           <chave>
ASAAS_WEBHOOK_TOKEN     <token do webhook>
ASAAS_API_URL           (opcional; sandbox: https://api-sandbox.asaas.com/v3)
```

Painel: *Edge Functions → Secrets*, ou `npx supabase@2 secrets set NOME=valor --project-ref armhlcnmaqgudqivkpgt`.

## 5. Publicar as functions

```
npx -y supabase@2 functions deploy coin-checkout       --project-ref armhlcnmaqgudqivkpgt --use-api
npx -y supabase@2 functions deploy nowpayments-webhook --project-ref armhlcnmaqgudqivkpgt --use-api
npx -y supabase@2 functions deploy asaas-webhook       --project-ref armhlcnmaqgudqivkpgt --use-api
```

- `coin-checkout`: **Verify JWT ligado**.
- `nowpayments-webhook` e `asaas-webhook`: **Verify JWT desligado** (já definido no `config.toml`;
  confira no painel após o deploy).

## 6. Teste

1. NOWPayments e Asaas em sandbox primeiro.
2. Compre o pacote Starter → deve abrir a página do gateway.
3. Pague → em até ~6 s o app mostra "Pagamento confirmado" e o saldo sobe
   (cripto pode levar alguns minutos até o status `finished`).
4. Reenvie o IPN/webhook pelo painel do gateway: o saldo **não** deve subir de novo.
5. Em *Edge Functions → Logs*, confira `credited` / `already_credited`.

## 7. Pendente

- **Pix:** botão presente porém desativado; `coin-checkout` responde `method_unavailable`
  para `depix`. A Asaas também aceita Pix — avaliar usar ela no lugar de um provedor à parte.
- Edição dos pacotes pelo admin (hoje: tabela `coin_packages`, editável via SQL).
