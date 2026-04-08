# 🗺️ Roadmap Tradexperience 2026

Este documento traça a evolução estratégica do **Tradexperience**, focando em segurança, experiência do usuário e automação de licenças.

---

## 🛡️ Fase 1: Proteção de IP (Diferenciação de Licenças)
**Objetivo**: Garantir que as licenças sejam vinculadas a robôs específicos (Expert Advisors) sem alterar a ponte de integração (DLL).

### 🛠️ Tarefas
- [ ] **Supabase (Backend)**:
    - [ ] Garantir que o campo `license_title` na tabela `license_requests` seja retornado na consulta de validação do EA.
    - [ ] Adicionar um campo `robot_id` (opcional) na tabela `license_titles` para mapeamento técnico (ex: `AFK GOLD` -> `robot_gold_v1`).
- [ ] **MQL (Expert Advisor)**:
    - [ ] Adicionar constante global `EA_LICENSE_TITLE` (ex: "AFK GOLD").
    - [ ] No `OnInit()`, comparar o título recebido do Supabase com a constante local.
    - [ ] Lógica de Bloqueio: Interromper execução com alerta visual no gráfico se a licença não for para aquele robô.
- [ ] **App (Admin)**:
    - [ ] Adicionar aviso preventivo na tela de edição de títulos.

---

## 🔔 Fase 2: Sistema de Retenção (Alertas de Expiração)
**Objetivo**: Automatizar notificações de renovação para evitar interrupções no trading do cliente.

### 🛠️ Tarefas
- [ ] **Supabase (Infraestrutura)**:
    - [ ] Criar tabela de notificações no app.
    - [ ] Configurar cron diário via Edge Function.
- [ ] **Estratégia de Intervados**:
    - [ ] Meses: 3, 2, 1.
    - [ ] Dias Críticos: 15, 10, 5, 3, 2, 1.
- [ ] **Canais de Disparo**:
    - [ ] E-mail automático (via Resend/Supabase Auth).
    - [ ] Notificação interna no Dashboard (Badge e Modal).

---

## 📢 Fase 3: Hub de Comunicação (Newsletter & Broadcast)
**Objetivo**: Permitir o disparo de comunicados, atualizações de robôs e novidades diretamente para os usuários selecionados.

### 🛠️ Tarefas
- [ ] **Supabase (Backend)**:
    - [ ] Criar tabela `broadcasts` (histórico de mensagens).
    - [ ] Configurar integração com provedor de e-mail (Resend/SendGrid).
- [ ] **App (Admin Panel)**:
    - [ ] Interface de Checkboxes nas abas de Usuários e Parceiros para seleção múltipla.
    - [ ] Modal de Composição: Campo "Assunto" e "Mensagem" (Suporte a Markdown).
    - [ ] Filtros Dinâmicos: Botão de "Selecionar Todos" e segmentação por função (Admin, Parceiro, Cliente).
- [ ] **Motor de Automação**:
    - [ ] Implementar fila de disparos (Queue) para evitar sobrecarga do servidor.

---

## 📉 Fase 4: Auditoria e UX Avançada
- [ ] **Logs de Tentativas**: Registrar no Supabase quando um robô for bloqueado para identificar possíveis compartilhamentos de licença indevidos.
- [ ] **Painel de Usuário**: Exibir progresso visual de dias restantes para expiração no app.

---

*Última atualização: 08/04/2026*
