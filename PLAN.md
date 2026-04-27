# PLAN.md — Remediação de Segurança Tradexperience WebApp

**Base:** [SECURITY_AUDIT.md](SECURITY_AUDIT.md) · 4 CRÍTICOS, 4 ALTOS, 5 MÉDIOS, 1 BAIXO
**Princípios de execução:**
- NÃO alterar CSS, tokens de design, componentes visuais ou comportamento de UI.
- NÃO tocar em arquitetura, rotas ou fluxos do core. Só correção de segurança cirúrgica.
- `RULES.md` §10 é usado como referência de segurança; §11 orienta formato de Waves (Spec-Driven).
- Toda mudança em SQL é aditiva via arquivo novo (`supabase_security_fixes.sql`); nada é removido do `supabase_schema_complete.sql` que quebre reprovisionamento — apenas policies antigas são dropadas/recriadas.

---

## Wave 1 — RLS Fix (fecha C-01, C-02, C-03)

**Severidade:** CRÍTICA · **Esforço:** Médio · **Dependências:** nenhuma (executar primeiro)
**Achados fechados:** C-01 (privilege escalation), C-02 (PII exposta), C-03 (licenças MT5 expostas)

### Objetivo
Fechar o PostgREST público. Nenhuma tabela sensível deve ser legível por `anon`; `client` só vê o próprio dado; `admin` vê tudo. `role` em `profiles` torna-se imutável para não-admins.

### Arquivos a criar / modificar
- CRIAR: [supabase_security_fixes.sql](supabase_security_fixes.sql) — script idempotente para rodar no SQL Editor do dashboard Supabase.
- NÃO editar: [supabase_schema_complete.sql](supabase_schema_complete.sql), [supabase_schema.sql](supabase_schema.sql), [SQL_SETUP.sql](SQL_SETUP.sql), [SQL_UPDATE_FIXES.sql](SQL_UPDATE_FIXES.sql) — manter como referência histórica; o novo `.sql` sobrescreve as policies em runtime.
- REVISAR (somente leitura): [components/Admin/AdminPanel.tsx](components/Admin/AdminPanel.tsx) linha ~171 (join `profiles:user_id (full_name, email)`) — confirmar que o `select` continua passando pela nova policy `admin`.

### Passos de implementação (conteúdo do `supabase_security_fixes.sql`)

**Bloco 0 — Helper function (SECURITY DEFINER) para checar admin sem recursão RLS**
- Criar `public.is_admin(uid uuid) returns boolean` com `security definer`, que lê `profiles.role` bypassando RLS.
- Grant `execute` somente a `authenticated` (não `anon`).
- Justificativa: policies que fazem subquery em `profiles` recursivamente entram em loop; a função quebra o ciclo.

**Bloco 1 — `profiles`**
- `alter table public.profiles enable row level security;` (garantir).
- `DROP POLICY "Public profiles are viewable by everyone." ON public.profiles;` (fecha C-02, ref [supabase_schema_complete.sql:19-20](supabase_schema_complete.sql#L19-L20)).
- `DROP POLICY "Users can update own profile." ON public.profiles;` (fecha C-01, ref [supabase_schema_complete.sql:25-26](supabase_schema_complete.sql#L25-L26)).
- `DROP POLICY IF EXISTS "Users can insert own profile." ON public.profiles;`
- CREATE `profiles_select_self_or_admin` FOR SELECT TO authenticated USING `(auth.uid() = id OR public.is_admin(auth.uid()))`.
- CREATE `profiles_update_self_safe` FOR UPDATE TO authenticated USING `(auth.uid() = id)` WITH CHECK `(auth.uid() = id)`. A mutação de `role`/`id`/`created_at` é barrada pelo trigger abaixo — não pela policy (WITH CHECK não compara OLD/NEW; por isso trigger).
- CREATE `profiles_update_admin` FOR UPDATE TO authenticated USING `public.is_admin(auth.uid())` WITH CHECK `public.is_admin(auth.uid())`.
- CREATE `profiles_insert_self` FOR INSERT TO authenticated WITH CHECK `(auth.uid() = id AND role = 'client')` — signup só cria `client`; promoção vem por admin.
- NENHUMA policy para role `anon` → sem leitura anônima.

**Bloco 2 — Trigger `profiles_prevent_role_tamper` (BEFORE UPDATE)**
- Se `NEW.role IS DISTINCT FROM OLD.role` ou `NEW.id <> OLD.id` ou `NEW.created_at <> OLD.created_at`, e `public.is_admin(auth.uid()) = false` → `RAISE EXCEPTION 'forbidden column mutation'`.
- Justificativa: fecha C-01 mesmo se alguém reintroduzir uma policy permissiva por acidente. Defesa em profundidade.

**Bloco 3 — `license_requests`, `license_requests_snowball`, `license_requests_boletapro`**
- Para cada uma:
  - `alter table … enable row level security;` (o audit indica que as duplicatas `_snowball`/`_boletapro` podem não ter RLS habilitada — C-03 nota isso).
  - DROP qualquer policy existente (`drop policy if exists … ;` enumerando por nome do schema atual).
  - CREATE `<tab>_select_owner` FOR SELECT TO authenticated USING `(auth.uid() = user_id)`.
  - CREATE `<tab>_select_admin` FOR SELECT TO authenticated USING `public.is_admin(auth.uid())`.
  - CREATE `<tab>_insert_owner` FOR INSERT TO authenticated WITH CHECK `(auth.uid() = user_id)`.
  - CREATE `<tab>_update_admin` FOR UPDATE TO authenticated USING `public.is_admin(auth.uid())`.
  - CREATE `<tab>_delete_admin` FOR DELETE TO authenticated USING `public.is_admin(auth.uid())`.
  - NADA para `anon`.

**Bloco 4 — Tabelas operacionais (apêndice B.1 do audit)**
Política por tabela (todas: `enable rls`, revogar `anon`, permitir admin FULL):

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `prospects` | admin only | admin only | admin only | admin only |
| `partner_links` | authenticated (link é marketing público autenticado) | admin | admin | admin |
| `downloads` | authenticated (catálogo) | admin | admin | admin |
| `treasury_accounts` | admin only | admin only | admin only | admin only |
| `license_titles` | authenticated | admin | admin | admin |
| `partner_requests` | owner OR admin | authenticated (cria o próprio) | admin | admin |
| `notifications` | `user_id = auth.uid()` OR admin | admin/system | owner marca lido / admin | admin |
| `broadcasts` | authenticated | admin | admin | admin |
| `marketing_assets` | authenticated | admin | admin | admin |
| `articles` | authenticated | admin | admin | admin |
| `modules`, `lessons`, `products` | authenticated | admin | admin | admin |
| `newsletter` (se criada no futuro) | admin only | `anon` permitido APENAS INSERT com `check (email is not null)` | admin | admin |

**Bloco 5 — View `public_profiles`**
- `CREATE OR REPLACE VIEW public.public_profiles AS SELECT id, full_name FROM public.profiles;`
- `GRANT SELECT ON public.public_profiles TO authenticated;`
- Justificativa: partners/autores referenciam `full_name` sem precisar de `email`/`role`/`last_login`. Se [components/Admin/AdminPanel.tsx](components/Admin/AdminPanel.tsx) (linha ~171) fizer join com `profiles` e o usuário ator for admin, a policy `profiles_select_self_or_admin` já cobre — a view é para telas não-admin se necessárias.

**Bloco 6 — Revogação explícita do role `anon`**
- `REVOKE ALL ON public.profiles, public.license_requests, public.license_requests_snowball, public.license_requests_boletapro, public.prospects, public.treasury_accounts, public.partner_requests, public.notifications FROM anon;`
- Permanece grant a `anon` APENAS em: `articles` (landing), `products` (catálogo público), se esse for o design. Validar com o dono.

### Testes de regressão (matriz)

| Cenário | Espera | Comando de validação |
|---|---|---|
| Anon GET `/rest/v1/profiles` | 200 com `[]` ou 401 | curl com só `apikey`, sem Bearer |
| Anon GET `/rest/v1/license_requests` | `[]` | idem |
| Client GET `/rest/v1/profiles?id=eq.<self>` | 1 row | Bearer do client |
| Client GET `/rest/v1/profiles?select=*` | só a própria row | Bearer do client |
| Client PATCH `profiles?id=eq.<self>` `{"role":"admin"}` | 403/trigger exception | Bearer do client |
| Client PATCH `profiles?id=eq.<self>` `{"full_name":"x"}` | 200 | Bearer do client |
| Client GET `license_requests` | só as próprias | Bearer do client |
| Admin GET `license_requests` | todas | Bearer do admin |
| Admin PATCH em qualquer profile | 200 | Bearer do admin |
| AdminPanel continua listando usuários | sim | smoke UI |

---

## Wave 2 — Hardening dos PHPs MT5 (fecha A-01, A-02, A-03, M-03)

**Severidade:** CRÍTICA · **Esforço:** Médio · **Dependências:** Wave 1 concluída (as PHPs vão passar a usar `service_role` — sem RLS fechada, service_role não muda nada)
**Achados fechados:** A-01 (no-auth/no-rate-limit/any-method), A-02 (timing), A-03 (hardcoded 221976), M-03 (X-Powered-By)

### Objetivo
EAs continuam validando contas MT5, mas com HMAC obrigatório, método único, tempo constante, sem backdoor e sem leak de versão. Chaves sensíveis saem do código.

### Arquivos a modificar / criar
- EDITAR in-place (mesmos 3 arquivos, sem mudar nome ou rota):
  - [php_api/validate_afk.php](php_api/validate_afk.php)
  - [php_api/validate_boleta.php](php_api/validate_boleta.php)
  - [php_api/validate_snowball.php](php_api/validate_snowball.php)
- CRIAR no servidor PHP (fora do repo, provisionado via painel de hosting): `/etc/tradex/secrets.env` com `TRADEX_HMAC_SECRET=…` e `SUPABASE_SERVICE_ROLE=…`. Carregar via `getenv()` ou `parse_ini_file`.
- CRIAR no Supabase: tabela `legacy_accounts(account_no bigint primary key, expires_at date, note text)` com RLS admin-only e migração da única linha atual (`221976, 2034-08-31`).
- CONFIGURAR Cloudflare WAF (fora do repo): rate limit 30 req/min/IP em `api.tradexperience.com.br/validate_*.php` e `ealicensesbeta.php`.

### Passos de implementação (por PHP)

1. **Topo do arquivo** (primeiras linhas, antes de qualquer output):
   - `header_remove('X-Powered-By');` (fecha M-03).
   - `if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }` (fecha A-01 method-wildcard).
   - `$start = microtime(true);` — marcador para o delay constante.

2. **Leitura de segredos**:
   - `$hmac_secret = getenv('TRADEX_HMAC_SECRET');`
   - `$service_key = getenv('SUPABASE_SERVICE_ROLE');`
   - Se qualquer um vazio → 500 + abort (não expor motivo).

3. **Validação HMAC (fecha A-01, A-02)**:
   - Ler headers: `X-Timestamp`, `X-Signature`.
   - Rejeitar se `abs(time() - $timestamp) > 60`.
   - Computar `$expected = hash_hmac('sha256', $timestamp . '|' . $account_no, $hmac_secret);`
   - `hash_equals($expected, $signature)` obrigatório (compare em tempo constante).
   - Falha → 401 (após delay constante).

4. **Remover array `$valid_accounts`** ([php_api/validate_afk.php:31-33](php_api/validate_afk.php#L31-L33)) — fecha A-03. Toda verificação consulta Supabase via service_role.

5. **Chamada Supabase com service_role** (substitui a anon key hardcoded em [php_api/validate_afk.php:9](php_api/validate_afk.php#L9), [php_api/validate_boleta.php:9](php_api/validate_boleta.php#L9), [php_api/validate_snowball.php:9](php_api/validate_snowball.php#L9) — fecha C-04 para esses arquivos):
   - `Authorization: Bearer $service_key`
   - Query: `license_requests?select=expires_at,status&mt5_account=eq.$account_no&status=eq.approved`
   - E também: `legacy_accounts?select=expires_at&account_no=eq.$account_no` — se achar em qualquer uma e `expires_at > today`, retorna success.

6. **Tempo de resposta constante** (fecha A-02):
   - Antes de `echo` final: `$elapsed = (microtime(true) - $start) * 1000; if ($elapsed < 400) usleep((400 - $elapsed) * 1000);`

7. **Cloudflare WAF (não-código, registrar no PLAN)**:
   - Regra: rate limit por IP 30 req/min nos 3 paths; block 10 min em violação.
   - Regra: só `POST` pode chegar (redundante com código, mas defense-in-depth).

### Testes de regressão

| Cenário | Espera |
|---|---|
| GET `/ealicensesbeta.php` | 405 |
| POST sem `X-Signature` | 401, tempo >= 400ms |
| POST com HMAC inválida | 401, tempo >= 400ms |
| POST com HMAC válida + conta existente | "success", tempo >= 400ms |
| POST com conta `221976` sem HMAC | 401 (backdoor morto) |
| POST com conta `221976` com HMAC e via `legacy_accounts` | "success" |
| `curl -I` no endpoint | sem `X-Powered-By` |
| 35 reqs em 60s do mesmo IP | reqs 31+ bloqueadas (WAF) |
| Timing diff entre conta válida/inválida | < 30ms |

---

## Wave 3 — Rotação de secrets e purga do git (fecha C-04)

**Severidade:** ALTA · **Esforço:** Alto (coordenação de release) · **Dependências:** Waves 1 e 2 concluídas e validadas
**Achados fechados:** C-04 (JWT versionada)

### Objetivo
Invalidar a anon key atual (`eyJ…8xs`, exp 2036), regenerar, trocar em todos os lugares e expurgar do histórico git. EAs em produção são afetadas apenas se algum EA chamar Supabase direto — confirmar antes.

### Arquivos a modificar / verificar
- [.env](.env) linha 2 — substituir anon key pela nova.
- [.gitignore](.gitignore) — conferir se `.env` já está; adicionar se não.
- [php_api/validate_afk.php](php_api/validate_afk.php), [php_api/validate_boleta.php](php_api/validate_boleta.php), [php_api/validate_snowball.php](php_api/validate_snowball.php) — Wave 2 já removeu o hardcode; aqui só confirmar.
- [lib/supabase.ts](lib/supabase.ts) — confirma que lê de `import.meta.env.VITE_SUPABASE_ANON_KEY`.

### Playbook

1. **Pré-checagem:** `grep -r "eyJ" .` para mapear todos os pontos onde a key aparece (bundle dist, docs, README, etc.).
2. **Confirmar que EAs NÃO chamam Supabase direto** — elas chamam os PHPs. Se alguma chamar direto, pausar e re-planejar (precisa release EA coordenada).
3. **Dashboard Supabase → Settings → API → Roll anon key + Roll service_role key.** Anotar as novas.
4. **Variáveis de ambiente**:
   - Vercel: atualizar `VITE_SUPABASE_ANON_KEY` (produção e preview).
   - Servidor PHP: atualizar `/etc/tradex/secrets.env` (`SUPABASE_SERVICE_ROLE`).
5. **Deploy coordenado (janela de manutenção)**:
   - (t=0) novo bundle Vercel com anon key nova.
   - (t=0) PHPs com service_role nova já reiniciados.
   - (t=0) anon key antiga invalidada no Supabase.
6. **Purga git** (força reescrita de histórico; avisar todos os colaboradores):
   - `git filter-repo --replace-text secrets.txt` onde `secrets.txt` lista a JWT antiga → substituição por `***REMOVED***`.
   - `git push --force-with-lease` em todas as branches e tags.
   - Cada colaborador re-clona.
7. **Garantir `.env`** em [.gitignore](.gitignore) — se já estiver, nada a fazer. Se não, adicionar e commitar.
8. **Criar `.env.example`** sem segredos (só nomes de variáveis) para onboarding futuro.

### Testes de regressão

| Cenário | Espera |
|---|---|
| Requisição com a key antiga | 401 invalid JWT |
| Requisição com a key nova | 200 |
| EAs reais em produção (3 produtos × smoke) | licença valida normalmente |
| `git log -p -S "eyJ…<antigos 10 chars>"` | zero matches |
| Build Vercel | verde |

### Rollback
- Se app quebrar: manter anon key nova (não dá para des-rotacionar). Reverter deploy do frontend para o bundle anterior (mas esse bundle usa key morta — inviável). A solução real: **corrigir o incidente rápido**. Por isso o deploy deve ser em horário de baixo tráfego e com o PHP-fallback validado em staging antes.

---

## Wave 4 — Headers + password policy + 2FA + CAPTCHA (fecha A-04, M-01, M-02, M-04, L-01)

**Severidade:** MÉDIA · **Esforço:** Baixo · **Dependências:** Wave 1 (CSP precisa listar domínios Supabase atualizados)
**Achados fechados:** A-04 (brute force), M-01 (headers), M-02 (senha fraca), M-04 (sem 2FA admin), L-01 (CORS `*`)

### Objetivo
Fechar superfície de ataque no hosting e no Auth do Supabase. Nenhuma alteração de CSS/UI.

### Arquivos a criar / modificar
- CRIAR: [vercel.json](vercel.json) na raiz do WebApp (não existe hoje — o audit cita "ausência de `vercel.json`").
- DASHBOARD Supabase (sem código): Auth → Rate Limits, Captcha, Password Policy, MFA.
- [components/Auth/Login.tsx](components/Auth/Login.tsx): adicionar indicador de força de senha no signup SEM alterar CSS/layout.

### Passos

**Passo 1 — `vercel.json`**
Conteúdo (apenas headers; nada de rewrites que mude comportamento):
- `Content-Security-Policy`: `default-src 'self'; connect-src 'self' https://armhlcnmaqgudqivkpgt.supabase.co wss://armhlcnmaqgudqivkpgt.supabase.co https://api.tradexperience.com.br; img-src 'self' data: https://armhlcnmaqgudqivkpgt.supabase.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`.
  - `'unsafe-inline'` em style é preservado porque o Vite inlina styles; remover quebraria UI (violação do princípio "não alterar CSS").
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
- Sobrescrever `Access-Control-Allow-Origin` para `https://app.tradexperience.com.br` (fecha L-01) — apenas se o app não depender de CORS aberto; em caso de dúvida, manter `*` (L-01 é BAIXO).

**Passo 2 — Supabase Dashboard (Auth)**
- Rate Limits: login 5/min/IP + 10/hora/email.
- CAPTCHA: ativar hCaptcha built-in, threshold `signup` e `signin`.
- Password Policy: min 10 chars, exigir letras e números.
- MFA: ativar TOTP. Forçar enrollment para usuários com `role=admin` via UI (primeira sessão).

**Passo 3 — `components/Auth/Login.tsx` (indicador de força)**
- Adicionar um `<span>` textual abaixo do input de senha no modo signup, mostrando "Fraca | Média | Forte" com base em comprimento + classes de caractere. **Sem** adicionar classes CSS novas ou mudar layout — usar apenas texto dentro do markup existente. Se o dono não aprovar esse microtexto, marcar como "config-only no dashboard" e pular.
- NÃO mudar [contexts/AuthContext.tsx](contexts/AuthContext.tsx) — a policy é server-side.

### Testes de regressão

| Cenário | Espera |
|---|---|
| `curl -I https://app.tradexperience.com.br` | todos os 5 headers presentes |
| Login com senha errada 10×/min | 429 após o 5º |
| Signup com senha `123456` | 400 "weak password" |
| iframe `app.tradexperience.com.br` em outro site | bloqueado (XFO) |
| Admin login novo | prompt de TOTP enrollment |

### Rollback
- `vercel.json` quebra algum recurso (p.ex. CSP bloqueia script legítimo) → reverter commit do `vercel.json`, redeploy.
- Password policy bloqueia login legítimo → Supabase Dashboard permite afrouxar em 2 cliques.

---

## Wave 5 — Upload hardening (fecha M-05)

**Severidade:** BAIXA-MÉDIA · **Esforço:** Baixo · **Dependências:** Wave 1 (para que policies RLS de `storage.objects` sejam consistentes)
**Achados fechados:** M-05 (upload sem MIME check)

### Objetivo
Rejeitar uploads que não batam com a whitelist de tipos (PDF, PNG, JPG, WebP) no servidor — não confiar em `file.type` do cliente.

### Arquivos a modificar / criar
- MODIFICAR: [lib/storage.ts](lib/storage.ts) (linhas 52-78).
- CRIAR opcionalmente: Supabase Edge Function `validate-upload` se o dono quiser check server-side profundo.

### Duas opções (escolher uma)

**Opção A (mais simples, recomendada):**
1. No cliente, em [lib/storage.ts](lib/storage.ts), antes do `supabase.storage.from(…).upload(…)`:
   - Ler `file.slice(0, 8).arrayBuffer()` → validar magic bytes:
     - PDF: `25 50 44 46`
     - PNG: `89 50 4E 47 0D 0A 1A 0A`
     - JPG: `FF D8 FF`
     - WebP: offset 8–12 = `57 45 42 50`
   - Se não bater, abortar antes do upload.
2. Policy em `storage.objects`:
   - `insert using ( bucket_id in ('public','private') and (lower(right(name, 4)) in ('.pdf','.png','.jpg','.webp') or lower(right(name, 5)) = '.jpeg') )`.
   - Cap de tamanho via configuração do bucket no dashboard (ex.: 10 MB).

**Opção B (defesa forte):**
- Edge Function `validate-upload` que recebe o arquivo por proxy, checa magic bytes, e só então faz `upload` com service_role. Trade-off: latência.

### Testes de regressão

| Cenário | Espera |
|---|---|
| Upload `.pdf` legítimo | sucesso |
| Upload renomeando `.exe` para `.pdf` | rejeitado (magic bytes) |
| Upload `.zip` | rejeitado (whitelist) |
| Upload 50 MB | rejeitado (cap) |

---

## Ordem de execução e dependências

```
Wave 1 (RLS)
    │
    ├──> Wave 2 (PHP hardening)        [usa service_role; sem RLS fechada, service_role não ajuda]
    │        │
    │        └──> Wave 3 (rotate secrets + git purge)   [service_role precisa já estar no server]
    │
    └──> Wave 4 (headers + auth policies)   [pode rodar em paralelo com Wave 2/3]
             │
             └──> Wave 5 (upload hardening)  [baixa prioridade; executar por último]
```

Sequência mínima segura: **1 → 2 → 3**, com **4** em paralelo a **2/3** e **5** ao final.

---

## Rollback plan (por Wave)

| Wave | Reversão |
|---|---|
| 1 (RLS) | Manter `supabase_security_fixes.sql` com bloco `-- ROLLBACK` comentado no final: DROP das novas policies + CREATE das antigas `USING (true)`. NÃO usar a menos que regressão crítica — reabre C-02/C-03. Preferir corrigir policy individual. |
| 2 (PHP) | Git revert dos 3 arquivos + restaurar shared secret no env (nada no servidor se quebra, porque secret e service_role ficam no `/etc/tradex/secrets.env` independente). Se EAs quebrarem, reverter para commit anterior dos PHPs imediatamente. |
| 3 (rotate) | **Irrecuperável após rotação.** Mitigação: manter snapshot do deploy anterior + anon key antiga só na memória de deploy durante a janela; se falha, SRE aponta DNS de `app.tradexperience.com.br` para Vercel preview antigo até fix. EAs não dependem de Supabase direto, só dos PHPs. |
| 4 (headers) | Remover `vercel.json` e redeploy. Supabase Auth: desligar CAPTCHA/MFA no dashboard. |
| 5 (upload) | Git revert do patch em [lib/storage.ts](lib/storage.ts) e da policy de `storage.objects`. |

---

## Validação final — checklist de 10 comandos

Rodar APÓS todas as waves. Todos devem passar; qualquer falha reabre o achado.

1. **C-02 morto (anon não lê profiles):**
   `curl -s -o /dev/null -w "%{http_code}\n" "https://armhlcnmaqgudqivkpgt.supabase.co/rest/v1/profiles?select=*" -H "apikey: $NEW_ANON"` → esperado `200` com corpo `[]` (ou `401`).

2. **C-03 morto (anon não lê licenças):**
   `curl -s "https://…/rest/v1/license_requests?select=*" -H "apikey: $NEW_ANON" | jq length` → `0`.

3. **C-03 morto (SQL direct psql):**
   `psql "$SUPABASE_DB_URL" -c "set role anon; select count(*) from public.license_requests;"` → `ERROR: permission denied` ou `0`.

4. **C-01 morto (client não escala role):**
   `curl -X PATCH "https://…/rest/v1/profiles?id=eq.$CLIENT_UUID" -H "apikey: $NEW_ANON" -H "Authorization: Bearer $CLIENT_JWT" -H "Content-Type: application/json" -d '{"role":"admin"}'` → `403` ou corpo de erro trigger `forbidden column mutation`.

5. **C-01 morto (admin ainda escala outros):**
   `curl -X PATCH "https://…/rest/v1/profiles?id=eq.$OTHER_UUID" -H "Authorization: Bearer $ADMIN_JWT" -d '{"role":"partner"}'` → `200`.

6. **A-01/A-02/A-03 mortos (PHP sem HMAC):**
   `curl -s -o /dev/null -w "%{http_code} %{time_total}\n" -X POST "https://api.tradexperience.com.br/ealicensesbeta.php" -d "account_no=221976"` → `401` com tempo ≥ 0.40s.

7. **A-01 — método não POST:**
   `for m in GET PUT DELETE PATCH; do curl -s -o /dev/null -w "$m=%{http_code}\n" -X $m "https://api.tradexperience.com.br/ealicensesbeta.php"; done` → todos `405`.

8. **C-04 — anon key antiga morta:**
   `curl -s -o /dev/null -w "%{http_code}\n" "https://…/rest/v1/profiles?select=id&limit=1" -H "apikey: $OLD_ANON"` → `401`.

9. **M-01 — headers presentes:**
   `curl -sI https://app.tradexperience.com.br | grep -E "content-security-policy|x-frame-options|x-content-type-options|referrer-policy|permissions-policy"` → 5 linhas.

10. **M-03 — sem X-Powered-By:**
    `curl -sI -X POST https://api.tradexperience.com.br/ealicensesbeta.php | grep -i x-powered-by` → vazio.

**Critério de aceite:** 10/10 passam. Se 9/10, abrir incidente para o faltante antes de marcar o esforço como concluído.

---

**Fim do PLAN.md.** Próximo passo: aprovar Wave 1 e autorizar execução do `supabase_security_fixes.sql` no SQL Editor do dashboard Supabase.
