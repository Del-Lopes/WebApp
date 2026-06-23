-- ============================================================
-- Trilha Gain — SEED de exemplo: "Fundamentos do Trading"
-- Roda DEPOIS de 20260630_trilha_gain.sql.
-- Idempotente: limpa a trilha de exemplo antes de recriar (pelo título).
-- ============================================================

DO $$
DECLARE
  v_track  uuid;
  v_unit1  uuid;
  v_unit2  uuid;
  v_lesson uuid;
BEGIN
  -- Limpa execução anterior deste seed (cascata remove units/lessons/steps)
  DELETE FROM public.trilha_tracks WHERE title = 'Fundamentos do Trading';

  -- Trilha
  INSERT INTO public.trilha_tracks (title, description, icon, color, is_published, sort_order)
  VALUES (
    'Fundamentos do Trading',
    'Aprenda do zero os conceitos essenciais para operar com consistência.',
    'milestone', 'green', true, 0
  )
  RETURNING id INTO v_track;

  -- ---------------- Unidade 1 ----------------
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index)
  VALUES (v_track, 'Primeiros Passos', 'Unidade 1', 0)
  RETURNING id INTO v_unit1;

  -- Lição 1.1 — O que é o mercado
  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit1, 'O que é o mercado', 15, 0)
  RETURNING id INTO v_lesson;

  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object(
     'title', 'O que é o mercado financeiro',
     'body', 'O mercado financeiro é o ambiente onde compradores e vendedores negociam ativos como moedas, ações e índices. O preço se move conforme a oferta e a demanda: mais compradores que vendedores tende a subir o preço; o contrário tende a derrubar.'
   ), 0),
  (v_lesson, 'quiz', jsonb_build_object(
     'question', 'O que faz o preço de um ativo subir?',
     'options', jsonb_build_array('Mais vendedores que compradores', 'Mais compradores que vendedores', 'O horário do pregão', 'A cor do candle'),
     'correctIndex', 1,
     'explanation', 'Quando a demanda (compradores) supera a oferta (vendedores), o preço tende a subir.'
   ), 1),
  (v_lesson, 'truefalse', jsonb_build_object(
     'statement', 'O preço sempre sobe quando há mais vendedores do que compradores.',
     'answer', false,
     'explanation', 'É o oposto: mais vendedores que compradores pressiona o preço para baixo.'
   ), 2);

  -- Lição 1.2 — Spread
  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit1, 'Entendendo o Spread', 15, 1)
  RETURNING id INTO v_lesson;

  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object(
     'title', 'O que é Spread',
     'body', 'Spread é a diferença entre o preço de compra (ask) e o de venda (bid). É o custo embutido em cada operação. Quanto menor o spread, mais barato é entrar e sair de uma posição.'
   ), 0),
  (v_lesson, 'quiz', jsonb_build_object(
     'question', 'Spread é a diferença entre quais preços?',
     'options', jsonb_build_array('Abertura e fechamento', 'Máxima e mínima', 'Compra (ask) e venda (bid)', 'Ontem e hoje'),
     'correctIndex', 2,
     'explanation', 'Spread = ask - bid. É o custo de transação embutido.'
   ), 1),
  (v_lesson, 'order', jsonb_build_object(
     'prompt', 'Ordene do menor custo ao maior custo de operação:',
     'items', jsonb_build_array('Spread baixo', 'Spread médio', 'Spread alto')
   ), 2);

  -- ---------------- Unidade 2 ----------------
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index)
  VALUES (v_track, 'Gerenciamento de Risco', 'Unidade 2', 1)
  RETURNING id INTO v_unit2;

  -- Lição 2.1 — Stop Loss
  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit2, 'Por que usar Stop Loss', 20, 0)
  RETURNING id INTO v_lesson;

  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object(
     'title', 'Stop Loss: seu cinto de segurança',
     'body', 'Stop Loss é uma ordem que encerra automaticamente sua posição ao atingir um prejuízo máximo definido. Ele protege seu capital de perdas grandes quando o mercado vai contra você.'
   ), 0),
  (v_lesson, 'truefalse', jsonb_build_object(
     'statement', 'Operar sem stop loss aumenta o risco de uma perda grande em uma única operação.',
     'answer', true,
     'explanation', 'Sem stop, uma operação perdedora pode crescer sem limite e comprometer a conta.'
   ), 1),
  (v_lesson, 'quiz', jsonb_build_object(
     'question', 'Qual a principal função do Stop Loss?',
     'options', jsonb_build_array('Garantir lucro', 'Limitar a perda máxima', 'Aumentar a alavancagem', 'Prever o mercado'),
     'correctIndex', 1,
     'explanation', 'O Stop Loss limita quanto você pode perder em uma posição.'
   ), 2);

  -- Lição 2.2 — Risco por operação
  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit2, 'Risco por operação', 20, 1)
  RETURNING id INTO v_lesson;

  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object(
     'title', 'A regra do 1%',
     'body', 'Uma prática comum de gestão de risco é arriscar no máximo 1% a 2% do capital por operação. Assim, mesmo uma sequência de perdas não destrói a conta e você sobrevive para as próximas oportunidades.'
   ), 0),
  (v_lesson, 'quiz', jsonb_build_object(
     'question', 'Numa conta de R$ 10.000, arriscar 1% por operação significa arriscar no máximo:',
     'options', jsonb_build_array('R$ 1.000', 'R$ 100', 'R$ 10', 'R$ 500'),
     'correctIndex', 1,
     'explanation', '1% de R$ 10.000 = R$ 100.'
   ), 1),
  (v_lesson, 'chart', jsonb_build_object(
     'image_url', 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Candlestick_chart_scheme_03-en.svg/640px-Candlestick_chart_scheme_03-en.svg.png',
     'question', 'Observando o gráfico, o que um candle de corpo verde (alta) indica?',
     'options', jsonb_build_array('O preço fechou abaixo da abertura', 'O preço fechou acima da abertura', 'Não houve negociação', 'O mercado estava fechado'),
     'correctIndex', 1,
     'explanation', 'Num candle de alta, o fechamento fica acima da abertura — pressão compradora no período.'
   ), 2);

END $$;
