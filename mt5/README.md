# Tradexperience Monitor (MT5 Expert Advisor)

EA **somente leitura** que envia telemetria da conta MT5 para a plataforma Tradexperience. Não abre, modifica ou fecha ordens.

## Arquivos

- `TradexperienceMonitor.mq5` — fonte do EA
- `TradexperienceMonitor.ex5` — binário compilado para distribuição (gerado pelo MetaEditor)

## Como compilar

1. Abrir MetaEditor (F4 dentro do MT5)
2. File → Open → selecionar `TradexperienceMonitor.mq5`
3. F7 (Compile)
4. O `.ex5` será gerado na mesma pasta

## Distribuição

O `.ex5` é hospedado no Supabase Storage e baixado pelo usuário direto da plataforma, no modal de "Conectar estratégia ao MT5".

Convenção de nome: `tradexperience-monitor-v<MAJOR>.<MINOR>.<PATCH>.ex5`

## O que o EA envia

A cada `IntervalSec` (default 5s), se algo mudou, ou a cada `HeartbeatSec` (default 30s) mesmo sem mudança:

```json
{
  "ea_version": "1.0.0",
  "account_login": 12345678,
  "account_currency": "USD",
  "account_company": "Corretora X",
  "account_server": "CorretoraX-Real",
  "balance": 10000.00,
  "equity": 10150.30,
  "floating_pnl": 150.30,
  "daily_pnl": 75.20,
  "open_positions": 2,
  "last_trade_at": "2026-05-11T13:42:10Z",
  "terminal_hash": "a3f9c1b2d4e5...",
  "timestamp": "2026-05-11T14:23:45Z"
}
```

Header: `Authorization: Bearer <ApiKey>`

## Comportamento de erro

- **HTTP 4060 (URL fora da whitelist)** → para e mostra instrução no `Comment()` do gráfico.
- **HTTP 401/403** → chave revogada/inválida. EA pausa até ser reanexado.
- **5xx, timeout, rede** → backoff exponencial (5 → 10 → 20 → 40 → 60s).

## Inputs do usuário

| Input | Default | Notas |
|---|---|---|
| `ApiUrl` | URL do endpoint Supabase | Já vem preenchida no `.ex5` distribuído |
| `ApiKey` | _vazio_ | **Único campo obrigatório**. Chave gerada na plataforma |
| `IntervalSec` | 5 | Frequência de coleta/envio |
| `HeartbeatSec` | 30 | Envio mínimo mesmo sem mudança |
| `VerboseLog` | false | Habilitar pra debug |
