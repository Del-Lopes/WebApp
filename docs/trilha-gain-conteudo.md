# Trilha Gain — Guia de criação de conteúdo

Conteúdo é populado **via SQL** (não há painel admin). Você gera o conteúdo
com IA usando o prompt abaixo, recebe um arquivo `.sql` pronto, e roda no
**Supabase Dashboard → SQL Editor**.

---

## 1. Estrutura do conteúdo

```
Trilha (track)            → tema geral. Pode ser gratuita ou paga.
 └─ Unidade (unit)        → "capítulo" / ilha
     └─ Lição (lesson)    → um nó na trilha (rende XP ao concluir)
         └─ Passo (step)  → exercício individual (5 formatos)
```

### Os 5 formatos de passo (step)

| type        | Para quê serve                          | Campos do payload |
|-------------|------------------------------------------|-------------------|
| `concept`   | Ensinar uma ideia (card de leitura)      | `title`, `body`, `image_url?` |
| `quiz`      | Múltipla escolha                         | `question`, `options[]`, `correctIndex`, `explanation?` |
| `truefalse` | Verdadeiro ou falso                      | `statement`, `answer` (bool), `explanation?` |
| `order`     | Ordenar itens na sequência correta       | `prompt`, `items[]` (na ORDEM CORRETA — o app embaralha) |
| `chart`     | Pergunta sobre uma imagem de gráfico     | `image_url`, `question`, `options[]`, `correctIndex`, `explanation?` |

**Regras de ouro do conteúdo:**
- Comece cada lição com 1 `concept` (ensina) e depois 2–3 exercícios (fixa).
- `correctIndex` começa em **0** (primeira opção = 0, segunda = 1...).
- Em `order`, escreva os `items` **já na ordem certa** — o app embaralha sozinho.
- Sem "vidas": errar só mostra a explicação e deixa tentar de novo. Então capriche nas `explanation`.

---

## 2. O PROMPT IDEAL (copie e cole)

> Cole o prompt abaixo numa IA (aqui mesmo no Claude, ChatGPT, etc.) junto
> com o material-fonte (texto de aula, transcrição de vídeo, e-book, artigo...).

```
Você é um designer instrucional. Vou te passar um material de estudo sobre trading.
Transforme-o em uma TRILHA gamificada estilo Duolingo, gerando um arquivo SQL pronto
para a tabela do meu app (formato especificado no fim).

REGRAS:
- Divida o conteúdo em UNIDADES (capítulos) e cada unidade em LIÇÕES (3 a 6 lições por unidade).
- Cada LIÇÃO deve ter de 3 a 5 PASSOS (steps), nesta lógica: comece com 1 passo "concept"
  (ensina a ideia) e depois 2 a 4 exercícios variados.
- Use os 5 tipos de passo de forma equilibrada: concept, quiz, truefalse, order, chart.
  (Use "chart" só quando eu fornecer uma URL de imagem de gráfico; senão, não use.)
- Linguagem simples, direta, em português do Brasil, tom motivador.
- Toda pergunta de quiz/truefalse/chart DEVE ter uma "explanation" curta e didática.
- Em "order", liste os itens NA ORDEM CORRETA (o app embaralha automaticamente).
- correctIndex é base 0 (primeira opção = 0).
- xp_reward: 10 para lições simples, 15–20 para as mais densas.
- order_index: sempre sequencial começando em 0, dentro de cada nível.

DADOS DA TRILHA:
- Título da trilha: <PREENCHA>
- Descrição curta: <PREENCHA>
- Trilha paga? <sim/não. Se sim, me diga o price_label, ex: "R$ 297">

FORMATO DE SAÍDA (SQL):
Gere exatamente no formato deste template, usando jsonb_build_object/jsonb_build_array,
dentro de um bloco DO $$ ... END $$; com variáveis uuid e RETURNING ... INTO,
e começando por DELETE FROM public.trilha_tracks WHERE title = '<titulo>'; para ser idempotente.

[COLE AQUI O TEMPLATE DA SEÇÃO 3 DESTE ARQUIVO]

MATERIAL DE ESTUDO:
[COLE AQUI O CONTEÚDO BRUTO]
```

---

## 3. TEMPLATE SQL (o modelo de saída)

Este é o formato exato que a IA deve produzir. É o mesmo do seed de exemplo
(`supabase/migrations/20260630_trilha_gain_seed.sql`).

```sql
-- Trilha: <TÍTULO>
-- Idempotente: apaga e recria a trilha pelo título.

DO $$
DECLARE
  v_track  uuid;
  v_unit   uuid;
  v_lesson uuid;
BEGIN
  DELETE FROM public.trilha_tracks WHERE title = '<TÍTULO DA TRILHA>';

  -- Trilha (gratuita: is_locked=false | paga: is_locked=true + price_label)
  INSERT INTO public.trilha_tracks (title, description, icon, color, is_published, is_locked, price_label, lock_note, sort_order)
  VALUES (
    '<TÍTULO DA TRILHA>',
    '<DESCRIÇÃO>',
    'milestone', 'green', true,
    false,            -- is_locked: troque para true se for paga
    NULL,             -- price_label: ex 'R$ 297' (paga) ou NULL (gratuita)
    NULL,             -- lock_note: mensagem do cadeado (paga) ou NULL
    0                 -- sort_order: ordem da trilha na lista
  )
  RETURNING id INTO v_track;

  -- ============ UNIDADE 1 ============
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index)
  VALUES (v_track, '<TÍTULO DA UNIDADE>', 'Unidade 1', 0)
  RETURNING id INTO v_unit;

  -- ---- Lição 1.1 ----
  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, '<TÍTULO DA LIÇÃO>', 15, 0)
  RETURNING id INTO v_lesson;

  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object(
     'title', '<TÍTULO>',
     'body',  '<TEXTO EXPLICATIVO>'
   ), 0),
  (v_lesson, 'quiz', jsonb_build_object(
     'question', '<PERGUNTA>',
     'options', jsonb_build_array('<OP A>', '<OP B>', '<OP C>', '<OP D>'),
     'correctIndex', 1,
     'explanation', '<POR QUE ESSA É A CORRETA>'
   ), 1),
  (v_lesson, 'truefalse', jsonb_build_object(
     'statement', '<AFIRMAÇÃO>',
     'answer', false,
     'explanation', '<EXPLICAÇÃO>'
   ), 2);

  -- ---- Lição 1.2 ----
  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, '<TÍTULO DA LIÇÃO>', 15, 1)
  RETURNING id INTO v_lesson;

  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object(
     'title', '<TÍTULO>', 'body', '<TEXTO>'
   ), 0),
  (v_lesson, 'order', jsonb_build_object(
     'prompt', '<INSTRUÇÃO: ordene...>',
     'items', jsonb_build_array('<1º>', '<2º>', '<3º>')   -- ORDEM CORRETA
   ), 1);

  -- ============ UNIDADE 2 ============
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index)
  VALUES (v_track, '<TÍTULO DA UNIDADE 2>', 'Unidade 2', 1)
  RETURNING id INTO v_unit;

  -- ...repita lições e passos...

END $$;
```

### Exemplo de passo `chart` (quando houver imagem)

```sql
  (v_lesson, 'chart', jsonb_build_object(
     'image_url', 'https://.../grafico.png',
     'question', '<PERGUNTA SOBRE O GRÁFICO>',
     'options', jsonb_build_array('<OP A>', '<OP B>', '<OP C>'),
     'correctIndex', 0,
     'explanation', '<EXPLICAÇÃO>'
   ), 2);
```

---

## 4. Como aplicar

1. Cole o **prompt da seção 2** + o **template da seção 3** + seu material numa IA.
2. Receba o `.sql`. Salve em `supabase/migrations/AAAAMMDD_trilha_<nome>.sql`
   (opcional, só para versionar) ou rode direto.
3. **Supabase Dashboard → SQL Editor** → cole → Run.
4. Abra o app em **Trilha Gain** e confira.

### Dicas
- O DELETE no topo torna o script **idempotente**: roda quantas vezes quiser
  que sempre recria a trilha do zero (sem duplicar).
- Para **despublicar** uma trilha sem apagar: `UPDATE public.trilha_tracks SET is_published=false WHERE title='...';`
- Para **tornar paga** uma trilha existente:
  `UPDATE public.trilha_tracks SET is_locked=true, price_label='R$ 297', lock_note='Disponível no plano Premium' WHERE title='...';`
- O **desbloqueio das lições é sequencial**: a lição N abre quando a N-1 for concluída.
  A ordem é definida por `order_index` (unidades → lições).
```
