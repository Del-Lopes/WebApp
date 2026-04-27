# Roadmap - Trader AFK WebApp

## Em Especulação

### Chatbot de IA
**Status:** Especulação | **Prioridade:** Futura

Adicionar um assistente de IA conversacional integrado à plataforma, acessível em todas as telas via widget flutuante.

#### Motivação
- Reduzir carga de suporte respondendo dúvidas comuns (licenças, robôs, jornada)
- Melhorar experiência de onboarding dos novos clientes
- Aproveitar a infraestrutura de IA (Gemini) já existente no projeto

#### Arquitetura Planejada

```
Frontend (React)
  └── ChatWidget.tsx        — botão flutuante, canto inferior direito
       └── ChatWindow.tsx   — histórico de mensagens + campo de input

Backend
  └── Supabase Edge Function: /chat-assistant
       ├── Recebe: mensagem + contexto do usuário (role, licenças ativas)
       ├── Chama: Gemini 2.0 Flash (já configurado no projeto)
       └── Retorna: resposta contextualizada sobre a plataforma

Banco de Dados
  └── Nova tabela: chat_messages
       └── Campos: user_id, role (user/assistant), content, created_at
```

#### Fases

**Fase 1 — MVP (estimativa: 1-2 semanas)**
- [ ] Criar tabela `chat_messages` no Supabase
- [ ] Criar Edge Function `chat-assistant` com Gemini e system prompt base
- [ ] Componente `ChatWidget` flutuante sem histórico persistido (apenas sessão)

**Fase 2 — Contexto e Memória (estimativa: 1 semana)**
- [ ] System prompt dinâmico com dados do usuário (licenças, robô, plano)
- [ ] Persistir histórico de conversa no banco por usuário
- [ ] Bot capacitado a responder: ativação de licença, dúvidas sobre robôs, jornada

**Fase 3 — UX e Inteligência (estimativa: 1 semana)**
- [ ] Sugestões de perguntas rápidas pré-definidas
- [ ] Integração com artigos — bot cita artigos relevantes da plataforma
- [ ] Streaming de resposta (indicador de digitação)
- [ ] Histórico navegável por sessão

#### Decisões Pendentes
- **LLM:** Gemini (já integrado, setup zero) vs. Claude API (melhor qualidade conversacional, nova integração necessária). Recomendação: Gemini para MVP, Claude depois se necessário.
- **Escopo do bot:** Suporte geral à plataforma? Apenas onboarding? Dúvidas de trading?
- **Visibilidade por role:** Disponível para todos os usuários ou apenas clientes com licença ativa?

---

## Backlog

*(Adicionar próximas ideias aqui)*

---

## Concluído

*(Funcionalidades entregues serão movidas para cá)*
