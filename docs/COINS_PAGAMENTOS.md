# Loja de Coins — configuração dos pagamentos

Fluxo: `BuyCoins` → edge `coin-checkout` (cria pedido + cobrança) → cliente paga →
gateway chama o webhook → webhook **reconsulta o gateway** → RPC `credit_coin_order`
(idempotente) soma em `trilha_stats.total_xp`.

URLs dos webhooks (projeto `armhlcnmaqgudqivkpgt`):

- BTCPay: `https://armhlcnmaqgudqivkpgt.supabase.co/functions/v1/btcpay-webhook`
- Asaas:  `https://armhlcnmaqgudqivkpgt.supabase.co/functions/v1/asaas-webhook`

## 1. Ordem de ativação

1. Rodar `supabase/migrations/20261109_coin_store.sql` no SQL Editor.
2. Subir o BTCPay no Coolify (seção 2) e configurar a Asaas (seção 3).
3. Cadastrar os secrets (seção 4).
4. Publicar as functions (seção 5).
5. Testar (seção 6).

## 2. BTCPay Server no Coolify

> Pontos marcados com **(confirmar)** dependem da versão do Coolify/BTCPay que você usa.

1. No Coolify: *New Resource → Services* e procure por **BTCPay Server** **(confirmar se existe template)**.
   Se não houver, use um *Docker Compose* a partir do repositório oficial `btcpayserver/btcpayserver-docker`
   (BTCPay + NBXplorer + bitcoind + Postgres).
2. Domínio com HTTPS pelo proxy do Coolify (ex.: `pay.seudominio.com`). O BTCPay precisa ser
   alcançável publicamente: o cliente abre a página de pagamento nele e o Supabase chama a API dele.
3. **Nó Bitcoin:** use poda (`prune`) para não ocupar centenas de GB. A primeira sincronização demora.
   Sem nó sincronizado, as invoices não geram endereço.
4. Crie a conta admin, uma **Store** e conecte uma **carteira** (importe a xpub — a chave privada
   nunca fica no servidor).
5. **Moedas aceitas:** o BTCPay nativo cobre **BTC** (e Liquid, onde existe **USDT na Liquid**).
   **USDT/USDC em Ethereum/Tron/Polygon exigem plugin de terceiros** **(confirmar plugin disponível
   em *Server Settings → Plugins* e seu nível de manutenção)**. Decida se aceita só BTC + USDT-Liquid
   ou se instala um plugin EVM/Tron.
6. **Taxa de câmbio:** *Store → Settings → Rates* — escolha uma fonte que tenha `BTC_BRL` (e os pares das
   stablecoins). As invoices são criadas em **BRL**; sem cotação BRL a criação falha.
7. **API Key:** *Account → Manage Account → API Keys*, com as permissões
   `btcpay.store.cancreateinvoice` e `btcpay.store.canviewinvoices`, restrita à sua store.
8. **Webhook:** *Store → Settings → Webhooks → Create*:
   - Payload URL: a do BTCPay acima
   - Secret: gere um valor longo aleatório (será `BTCPAY_WEBHOOK_SECRET`)
   - Eventos: `InvoiceSettled`, `InvoiceExpired`, `InvoiceInvalid`
9. Confirmações: a invoice usa `speedPolicy: MediumSpeed` (1 confirmação). Para valores maiores
   ou mais segurança, mude para `LowSpeed` em `coin-checkout`.

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
BTCPAY_URL            https://pay.seudominio.com        (sem barra no fim)
BTCPAY_STORE_ID       <id da store>
BTCPAY_API_KEY        <api key>
BTCPAY_WEBHOOK_SECRET <secret do webhook>
ASAAS_API_KEY         <chave>
ASAAS_WEBHOOK_TOKEN   <token do webhook>
ASAAS_API_URL         (opcional; sandbox: https://api-sandbox.asaas.com/v3)
```

Painel: *Edge Functions → Secrets*, ou `npx supabase@2 secrets set NOME=valor --project-ref armhlcnmaqgudqivkpgt`.

## 5. Publicar as functions

```
npx -y supabase@2 functions deploy coin-checkout   --project-ref armhlcnmaqgudqivkpgt --use-api
npx -y supabase@2 functions deploy btcpay-webhook  --project-ref armhlcnmaqgudqivkpgt --use-api
npx -y supabase@2 functions deploy asaas-webhook   --project-ref armhlcnmaqgudqivkpgt --use-api
```

- `coin-checkout`: **Verify JWT ligado**.
- `btcpay-webhook` e `asaas-webhook`: **Verify JWT desligado** (já definido no `config.toml`;
  confira no painel após o deploy).

## 6. Teste

1. Asaas/BTCPay em sandbox/testnet primeiro (BTCPay: store em testnet ou regtest).
2. Compre o pacote Starter → deve abrir a página do gateway.
3. Pague → em até ~6 s o app mostra "Pagamento confirmado" e o saldo sobe.
4. Reenvie o webhook pelo painel do gateway: o saldo **não** deve subir de novo.
5. Em *Edge Functions → Logs*, confira `credited` / `already_credited`.

## 7. Pendente

- **Depix (Pix):** botão presente porém desativado; `coin-checkout` responde `method_unavailable`
  para `depix`. Falta definir o provedor e a API.
- Edição dos pacotes pelo admin (hoje: tabela `coin_packages`, editável via SQL).
