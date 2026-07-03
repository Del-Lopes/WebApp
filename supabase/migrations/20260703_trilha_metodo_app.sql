-- ============================================================
-- Trilha Gain — "Método APP: Estruturando a Operação"
-- (Amplitude → Projeção → Perspectiva)
-- Gerada a partir do material de aula do método APP.
-- Idempotente: apaga e recria a trilha pelo título.
-- Rodar no Supabase Dashboard → SQL Editor.
-- ============================================================

DO $$
DECLARE
  v_track  uuid;
  v_unit   uuid;
  v_lesson uuid;
BEGIN
  DELETE FROM public.trilha_tracks WHERE title = 'Método APP: Estruturando a Operação';

  -- Trilha (gratuita). Para torná-la paga: is_locked=true + price_label + lock_note.
  INSERT INTO public.trilha_tracks (title, description, icon, color, is_published, is_locked, price_label, lock_note, sort_order)
  VALUES (
    'Método APP: Estruturando a Operação',
    'Aprenda a estruturar operações em harmonia com o cenário usando Amplitude, Projeção e Perspectiva.',
    'milestone', 'green', true,
    false, NULL, NULL,
    2
  )
  RETURNING id INTO v_track;

  -- ============ UNIDADE 1 ============
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index)
  VALUES (v_track, 'Estruturando a Operação', 'Método APP', 0)
  RETURNING id INTO v_unit;

  -- ---- Lição 1.1 — Amplitude (Onda 1) ----
  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Amplitude: a onda 1', 15, 0)
  RETURNING id INTO v_lesson;

  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object(
     'title', 'O primeiro passo: a Amplitude',
     'body', 'Depois de identificar o cenário com arco e efetivar o corte, o primeiro passo é definir a AMPLITUDE: a sua onda 1, a ignição que trocou o momentum. Você não precisa operar esse primeiro movimento — vamos trabalhar com a onda 3. Seu trabalho aqui é apenas medir a amplitude da onda 1, que servirá de perspectiva para a onda 3.'
   ), 0),
  (v_lesson, 'quiz', jsonb_build_object(
     'question', 'Qual é o papel da onda 1 (amplitude) no método APP?',
     'options', jsonb_build_array(
        'É onde devemos entrar no trade',
        'Serve de perspectiva/medida para projetar a onda 3',
        'É o alvo final da operação',
        'Define o stop loss'),
     'correctIndex', 1,
     'explanation', 'A amplitude da onda 1 é a referência para projetar a onda 3 — não é onde entramos.'
   ), 1),
  (v_lesson, 'truefalse', jsonb_build_object(
     'statement', 'Se eu perder o movimento da onda 1, perdi a operação inteira.',
     'answer', false,
     'explanation', 'Não. A onda 1 só serve de medida; quem operamos é a onda 3. Perder a onda 1 não é problema.'
   ), 2);

  -- ---- Lição 1.2 — Retração de Fibonacci ----
  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Retração de Fibonacci', 15, 1)
  RETURNING id INTO v_lesson;

  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object(
     'title', 'A zona de evento',
     'body', 'Após identificar a onda 1 de corte ou ignição, usamos a ferramenta de Retração de Fibonacci. Ela nos dá a noção dos níveis normais de correção do preço — ou seja, o tamanho esperado do pullback. É a zona comprável (ou vendível), a região de evento onde o preço deve corrigir antes de retomar a tendência.'
   ), 0),
  (v_lesson, 'quiz', jsonb_build_object(
     'question', 'Para que serve a Retração de Fibonacci nesse método?',
     'options', jsonb_build_array(
        'Para definir o lote da entrada',
        'Para estimar o tamanho normal do pullback (zona de correção)',
        'Para calcular o lucro final',
        'Para escolher o ativo'),
     'correctIndex', 1,
     'explanation', 'O Fibonacci mostra os níveis normais de correção — a zona comprável/vendível onde o evento tende a acontecer.'
   ), 1),
  (v_lesson, 'truefalse', jsonb_build_object(
     'statement', 'A retração de Fibonacci ajuda a identificar a zona comprável ou vendível (região de evento).',
     'answer', true,
     'explanation', 'Correto: essa zona de correção é onde aguardamos o gatilho da operação.'
   ), 2);

  -- ---- Lição 1.3 — Rompimento da Trend Line (Evento) ----
  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O evento: rompimento da Trend Line', 20, 2)
  RETURNING id INTO v_lesson;

  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object(
     'title', 'O gatilho da entrada',
     'body', 'Depois de marcar a Trend Line, aguardamos o EVENTO: o rompimento dessa linha de tendência. Esse é o momento de entrar no trade. Ao acionar o gatilho, entramos com lote mínimo e começamos a dosar a posição conforme a planilha disciplinadora de gestão de risco.'
   ), 0),
  (v_lesson, 'truefalse', jsonb_build_object(
     'statement', 'A entrada no trade acontece no rompimento da Trend Line.',
     'answer', true,
     'explanation', 'Exato: o rompimento da Trend Line é o evento que aciona o gatilho de entrada.'
   ), 1),
  (v_lesson, 'quiz', jsonb_build_object(
     'question', 'Ao acionar o gatilho de entrada, devemos:',
     'options', jsonb_build_array(
        'Entrar com lote máximo de uma vez',
        'Entrar com lote mínimo e dosar a posição conforme a gestão de risco',
        'Esperar mais um rompimento',
        'Fechar a operação'),
     'correctIndex', 1,
     'explanation', 'Entramos com lote mínimo e dosamos a posição segundo a planilha disciplinadora de gestão de risco.'
   ), 2),
  (v_lesson, 'order', jsonb_build_object(
     'prompt', 'Ordene os passos até a entrada na operação:',
     'items', jsonb_build_array(
        'Identificar a amplitude (onda 1)',
        'Aplicar a Retração de Fibonacci (zona de evento)',
        'Marcar a Trend Line',
        'Entrar no rompimento da Trend Line')
   ), 3);

  -- ---- Lição 1.4 — Projeção e Primeiro Alvo ----
  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Projeção: definindo alvos', 20, 3)
  RETURNING id INTO v_lesson;

  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object(
     'title', 'Os alvos vêm do próprio gráfico',
     'body', 'Com a operação estruturada e os stops posicionados, definimos os alvos usando os dados do gráfico: a amplitude da onda 1 vira a perspectiva da onda 3. O PRIMEIRO alvo é sempre o pivot deixado pelo fim da onda 1 — o primeiro teste que o preço faz antes de romper e seguir a tendência. Ao realizar os lotes do primeiro alvo, mova o stop para o Breakeven (zero a zero).'
   ), 0),
  (v_lesson, 'quiz', jsonb_build_object(
     'question', 'Onde fica o PRIMEIRO alvo da operação?',
     'options', jsonb_build_array(
        'No final da amplitude da onda 1',
        'No pivot deixado pelo fim da onda 1',
        'No rompimento da Trend Line',
        'No nível de stop'),
     'correctIndex', 1,
     'explanation', 'O primeiro alvo é o pivot do fim da onda 1 — o primeiro teste antes do preço romper e seguir.'
   ), 1),
  (v_lesson, 'truefalse', jsonb_build_object(
     'statement', 'Após realizar os lotes do primeiro alvo, o stop deve ir para o Breakeven (zero a zero).',
     'answer', true,
     'explanation', 'Sim: levar o stop ao breakeven garante que o pior cenário agora é o lucro já realizado.'
   ), 2);

  -- ---- Lição 1.5 — Segundo Alvo ----
  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O segundo alvo', 20, 4)
  RETURNING id INTO v_lesson;

  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object(
     'title', 'Fechando a operação com sucesso',
     'body', 'Depois de mover o stop para o breakeven, o psicológico fica confortável: o pior cenário já é lucro. O SEGUNDO alvo fica no final da amplitude da onda 1, usada como perspectiva da onda 3. Se esse alvo for alcançado, a operação foi um sucesso!'
   ), 0),
  (v_lesson, 'quiz', jsonb_build_object(
     'question', 'Onde fica o SEGUNDO alvo da operação?',
     'options', jsonb_build_array(
        'No pivot do fim da onda 1',
        'No final da amplitude da onda 1 (perspectiva da onda 3)',
        'No rompimento da Trend Line',
        'Na zona de Fibonacci'),
     'correctIndex', 1,
     'explanation', 'O segundo alvo projeta a amplitude da onda 1 como perspectiva da onda 3.'
   ), 1),
  (v_lesson, 'truefalse', jsonb_build_object(
     'statement', 'Com o stop no breakeven, o pior cenário da operação passa a ser o lucro já realizado no primeiro alvo.',
     'answer', true,
     'explanation', 'Exato: por isso esse é um momento confortável para o psicológico do trader.'
   ), 2);

END $$;
