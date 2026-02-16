# Plano de Implementação: Sincronização de Licenças

Este documento detalha o passo a passo técnico para as três opções de integração entre o Supabase e o seu sistema de verificação no CyberPanel.

## Contexto Técnico
- **Escala**: < 100 usuários simultâneos (Baixa carga).
- **Ambiente**: CyberPanel (PHP) + Supabase (PostgreSQL).
- **Objetivo**: Eliminar a edição manual do arquivo `ealicenses.php`.

---

## 🟢 Opção B: PHP Dinâmico (Recomendada para sua escala)
Nesta opção, o seu script PHP atual consulta o Supabase em tempo real toda vez que um Expert Advisor pede uma verificação.

### Passo a Passo:
1. **No Supabase**: Obter a `anon_key` e a URL do projeto nas configurações de API.
2. **No CyberPanel**: Criar um arquivo chamado `ealicenses_api.php`.
3. **Lógica do Script**:
    - Receber o número da conta via GET ou POST (como o EA já faz).
    - Fazer uma requisição `cURL` para a tabela `license_requests` do Supabase filtrando por `mt5_account` e `status = 'approved'`.
    - Se encontrar o registro, retornar "sucesso" para o EA.
4. **No Expert Advisor**: Alterar a URL de verificação de `ealicenses.php` para `ealicenses_api.php`.

**Nível de Dificuldade**: ⭐ (Muito simples)

---

## 🟡 Opção A: Webhook (Push Instantâneo)
O Supabase "avisa" o seu servidor CyberPanel toda vez que você clica em "Aprovar" no painel administrativo.

### Passo a Passo:
1. **No CyberPanel**: Criar um script `webhook_receiver.php` que aceita uma conta e a adiciona a um arquivo de texto local.
2. **Segurança**: Definir uma "Secret Key" no PHP para que apenas o Supabase consiga enviar dados para esse link.
3. **No Supabase (Dashboard)**:
    - Ir em Database -> Webhooks.
    - Criar um novo Webhook para a tabela `license_requests`.
    - Gatilho: `UPDATE`.
    - Condição: Apenas se `status` mudar para `approved`.
    - URL: Link do seu `webhook_receiver.php`.

**Nível de Dificuldade**: ⭐⭐⭐ (Requer configurar o receptor e tratar segurança).

---

## 🔵 Opção C: Cron Job (Sincronização Periódica)
Um script roda de tempos em tempos, baixa todos os aprovados e atualiza o seu arquivo local.

### Passo a Passo:
1. **No CyberPanel**: Criar um script `sync_to_file.php`.
2. **Lógica do Script**:
    - Baixar a lista completa de contas aprovadas via API do Supabase.
    - Gerar o conteúdo do arquivo `ealicenses.php` com o array atualizado.
    - Salvar o arquivo no disco.
3. **No Agendador do CyberPanel**:
    - Criar um Cron Job que execute `php /caminho/do/seu/site/sync_to_file.php` a cada 5 ou 10 minutos.

**Nível de Dificuldade**: ⭐⭐ (Simples, mas exige configurar o Cron no painel).

---

## Próximos Passos
1. Escolha a **Opção B** se deseja rapidez e facilidade.
2. Escolha a **Opção A** se deseja que o funcionamento no Expert Advisor seja "instantâneo" e ultra-seguro contra quedas de API.

**O que deseja que eu gere agora?**
- [ ] Script para a **Opção B** (Dinâmico)
- [ ] Script para a **Opção A** (Webhook)
- [ ] Script para a **Opção C** (Cron)
