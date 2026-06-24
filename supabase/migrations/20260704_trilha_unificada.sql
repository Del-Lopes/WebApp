-- ============================================================
-- Trilha Gain — TRILHA ÚNICA UNIFICADA: "Jornada do Trader"
-- Consolida todo o conteúdo numa só trilha com várias unidades,
-- na ordem pedagógica. Remove as trilhas separadas anteriores.
-- Idempotente. Rodar no Supabase Dashboard → SQL Editor
-- DEPOIS das migrations de estrutura (20260630 e 20260701).
-- ============================================================

DO $$
DECLARE
  v_track  uuid;
  v_unit   uuid;
  v_lesson uuid;
BEGIN
  -- Remove trilhas antigas (cascata apaga unidades/lições/passos).
  -- O progresso do usuário é por lesson_id; como as lições são recriadas,
  -- o progresso antigo deixa de referenciar e é limpo pela FK em cascata.
  DELETE FROM public.trilha_tracks WHERE title IN (
    'Fundamentos do Trading',
    'Análise de Candles',
    'Método APP: Estruturando a Operação',
    'Jornada do Trader'
  );

  -- Trilha única
  INSERT INTO public.trilha_tracks (title, description, icon, color, is_published, is_locked, price_label, lock_note, sort_order)
  VALUES (
    'Jornada do Trader',
    'Do zero ao operacional: fundamentos, leitura de candles e estruturação de operações.',
    'milestone', 'green', true,
    false, NULL, NULL,
    0
  )
  RETURNING id INTO v_track;

  -- ============================================================
  -- UNIDADE 1 — Primeiros Passos
  -- ============================================================
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index)
  VALUES (v_track, 'Primeiros Passos', 'Unidade 1', 0)
  RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O que é o mercado', 15, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O que é o mercado financeiro','body','O mercado financeiro é o ambiente onde compradores e vendedores negociam ativos como moedas, ações e índices. O preço se move conforme a oferta e a demanda: mais compradores que vendedores tende a subir o preço; o contrário tende a derrubar.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O que faz o preço de um ativo subir?','options',jsonb_build_array('Mais vendedores que compradores','Mais compradores que vendedores','O horário do pregão','A cor do candle'),'correctIndex',1,'explanation','Quando a demanda (compradores) supera a oferta (vendedores), o preço tende a subir.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','O preço sempre sobe quando há mais vendedores do que compradores.','answer',false,'explanation','É o oposto: mais vendedores que compradores pressiona o preço para baixo.'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Entendendo o Spread', 15, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O que é Spread','body','Spread é a diferença entre o preço de compra (ask) e o de venda (bid). É o custo embutido em cada operação. Quanto menor o spread, mais barato é entrar e sair de uma posição.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Spread é a diferença entre quais preços?','options',jsonb_build_array('Abertura e fechamento','Máxima e mínima','Compra (ask) e venda (bid)','Ontem e hoje'),'correctIndex',2,'explanation','Spread = ask - bid. É o custo de transação embutido.'), 1),
  (v_lesson, 'order', jsonb_build_object('prompt','Ordene do menor custo ao maior custo de operação:','items',jsonb_build_array('Spread baixo','Spread médio','Spread alto')), 2);

  -- ============================================================
  -- UNIDADE 2 — Gerenciamento de Risco
  -- ============================================================
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index)
  VALUES (v_track, 'Gerenciamento de Risco', 'Unidade 2', 1)
  RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Por que usar Stop Loss', 20, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Stop Loss: seu cinto de segurança','body','Stop Loss é uma ordem que encerra automaticamente sua posição ao atingir um prejuízo máximo definido. Ele protege seu capital de perdas grandes quando o mercado vai contra você.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Operar sem stop loss aumenta o risco de uma perda grande em uma única operação.','answer',true,'explanation','Sem stop, uma operação perdedora pode crescer sem limite e comprometer a conta.'), 1),
  (v_lesson, 'quiz', jsonb_build_object('question','Qual a principal função do Stop Loss?','options',jsonb_build_array('Garantir lucro','Limitar a perda máxima','Aumentar a alavancagem','Prever o mercado'),'correctIndex',1,'explanation','O Stop Loss limita quanto você pode perder em uma posição.'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Risco por operação', 20, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','A regra do 1%','body','Uma prática comum de gestão de risco é arriscar no máximo 1% a 2% do capital por operação. Assim, mesmo uma sequência de perdas não destrói a conta e você sobrevive para as próximas oportunidades.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Numa conta de R$ 10.000, arriscar 1% por operação significa arriscar no máximo:','options',jsonb_build_array('R$ 1.000','R$ 100','R$ 10','R$ 500'),'correctIndex',1,'explanation','1% de R$ 10.000 = R$ 100.'), 1);

  -- ============================================================
  -- UNIDADE 3 — Lendo as Velas (Candles)
  -- ============================================================
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index)
  VALUES (v_track, 'Lendo as Velas', 'Unidade 3', 2)
  RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Anatomia de um candle', 15, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','As 4 informações de um candle','body','Cada vela mostra 4 preços de um período: abertura, fechamento, máxima e mínima. O retângulo (corpo) vai da abertura ao fechamento. As linhas finas (pavios/sombras) marcam a máxima e a mínima atingidas.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O corpo do candle representa a distância entre quais preços?','options',jsonb_build_array('Máxima e mínima','Abertura e fechamento','Ontem e hoje','Compra e venda'),'correctIndex',1,'explanation','O corpo vai da abertura ao fechamento. Máxima e mínima são marcadas pelos pavios.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Os pavios (sombras) mostram os preços máximo e mínimo do período.','answer',true,'explanation','Exato: o pavio de cima é a máxima, o de baixo é a mínima.'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Alta ou baixa?', 15, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','A cor conta a história','body','Quando o fechamento fica ACIMA da abertura, o candle é de alta (geralmente verde): os compradores dominaram. Quando o fechamento fica ABAIXO da abertura, é de baixa (geralmente vermelho): os vendedores dominaram.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Um candle verde (de alta) significa que:','options',jsonb_build_array('O fechamento ficou abaixo da abertura','O fechamento ficou acima da abertura','Não houve negócios','O preço não se moveu'),'correctIndex',1,'explanation','Candle de alta = fechou acima de onde abriu. Pressão compradora no período.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Em um candle de baixa, o fechamento fica acima da abertura.','answer',false,'explanation','É o contrário: no candle de baixa o fechamento fica ABAIXO da abertura.'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O candle Doji', 20, 2) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Doji: a indecisão do mercado','body','O Doji é um candle de corpo minúsculo: a abertura e o fechamento ficam quase no mesmo preço. Ele sinaliza equilíbrio entre compradores e vendedores — uma possível pausa ou reversão da tendência.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O que caracteriza um Doji?','options',jsonb_build_array('Corpo muito grande','Abertura e fechamento quase no mesmo preço','Não tem pavios','É sempre verde'),'correctIndex',1,'explanation','No Doji a abertura ≈ fechamento, formando um corpo minúsculo. Indica indecisão.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Um Doji pode indicar uma possível reversão da tendência.','answer',true,'explanation','Sim: o equilíbrio mostrado pelo Doji costuma anteceder pausas ou reversões.'), 2);

  -- ============================================================
  -- UNIDADE 4 — Método APP: Estruturando a Operação
  -- ============================================================
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index)
  VALUES (v_track, 'Método APP', 'Unidade 4', 3)
  RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Amplitude: a onda 1', 15, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O primeiro passo: a Amplitude','body','Depois de identificar o cenário com arco e efetivar o corte, o primeiro passo é definir a AMPLITUDE: a sua onda 1, a ignição que trocou o momentum. Você não precisa operar esse primeiro movimento — vamos trabalhar com a onda 3. Seu trabalho aqui é apenas medir a amplitude da onda 1, que servirá de perspectiva para a onda 3.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Qual é o papel da onda 1 (amplitude) no método APP?','options',jsonb_build_array('É onde devemos entrar no trade','Serve de perspectiva/medida para projetar a onda 3','É o alvo final da operação','Define o stop loss'),'correctIndex',1,'explanation','A amplitude da onda 1 é a referência para projetar a onda 3 — não é onde entramos.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Se eu perder o movimento da onda 1, perdi a operação inteira.','answer',false,'explanation','Não. A onda 1 só serve de medida; quem operamos é a onda 3. Perder a onda 1 não é problema.'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Retração de Fibonacci', 15, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','A zona de evento','body','Após identificar a onda 1 de corte ou ignição, usamos a ferramenta de Retração de Fibonacci. Ela nos dá a noção dos níveis normais de correção do preço — ou seja, o tamanho esperado do pullback. É a zona comprável (ou vendível), a região de evento onde o preço deve corrigir antes de retomar a tendência.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Para que serve a Retração de Fibonacci nesse método?','options',jsonb_build_array('Para definir o lote da entrada','Para estimar o tamanho normal do pullback (zona de correção)','Para calcular o lucro final','Para escolher o ativo'),'correctIndex',1,'explanation','O Fibonacci mostra os níveis normais de correção — a zona comprável/vendível onde o evento tende a acontecer.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','A retração de Fibonacci ajuda a identificar a zona comprável ou vendível (região de evento).','answer',true,'explanation','Correto: essa zona de correção é onde aguardamos o gatilho da operação.'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O evento: rompimento da Trend Line', 20, 2) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O gatilho da entrada','body','Depois de marcar a Trend Line, aguardamos o EVENTO: o rompimento dessa linha de tendência. Esse é o momento de entrar no trade. Ao acionar o gatilho, entramos com lote mínimo e começamos a dosar a posição conforme a planilha disciplinadora de gestão de risco.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','A entrada no trade acontece no rompimento da Trend Line.','answer',true,'explanation','Exato: o rompimento da Trend Line é o evento que aciona o gatilho de entrada.'), 1),
  (v_lesson, 'quiz', jsonb_build_object('question','Ao acionar o gatilho de entrada, devemos:','options',jsonb_build_array('Entrar com lote máximo de uma vez','Entrar com lote mínimo e dosar a posição conforme a gestão de risco','Esperar mais um rompimento','Fechar a operação'),'correctIndex',1,'explanation','Entramos com lote mínimo e dosamos a posição segundo a planilha disciplinadora de gestão de risco.'), 2),
  (v_lesson, 'order', jsonb_build_object('prompt','Ordene os passos até a entrada na operação:','items',jsonb_build_array('Identificar a amplitude (onda 1)','Aplicar a Retração de Fibonacci (zona de evento)','Marcar a Trend Line','Entrar no rompimento da Trend Line')), 3);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Projeção: definindo alvos', 20, 3) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Os alvos vêm do próprio gráfico','body','Com a operação estruturada e os stops posicionados, definimos os alvos usando os dados do gráfico: a amplitude da onda 1 vira a perspectiva da onda 3. O PRIMEIRO alvo é sempre o pivot deixado pelo fim da onda 1 — o primeiro teste que o preço faz antes de romper e seguir a tendência. Ao realizar os lotes do primeiro alvo, mova o stop para o Breakeven (zero a zero).'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Onde fica o PRIMEIRO alvo da operação?','options',jsonb_build_array('No final da amplitude da onda 1','No pivot deixado pelo fim da onda 1','No rompimento da Trend Line','No nível de stop'),'correctIndex',1,'explanation','O primeiro alvo é o pivot do fim da onda 1 — o primeiro teste antes do preço romper e seguir.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Após realizar os lotes do primeiro alvo, o stop deve ir para o Breakeven (zero a zero).','answer',true,'explanation','Sim: levar o stop ao breakeven garante que o pior cenário agora é o lucro já realizado.'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O segundo alvo', 20, 4) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Fechando a operação com sucesso','body','Depois de mover o stop para o breakeven, o psicológico fica confortável: o pior cenário já é lucro. O SEGUNDO alvo fica no final da amplitude da onda 1, usada como perspectiva da onda 3. Se esse alvo for alcançado, a operação foi um sucesso!'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Onde fica o SEGUNDO alvo da operação?','options',jsonb_build_array('No pivot do fim da onda 1','No final da amplitude da onda 1 (perspectiva da onda 3)','No rompimento da Trend Line','Na zona de Fibonacci'),'correctIndex',1,'explanation','O segundo alvo projeta a amplitude da onda 1 como perspectiva da onda 3.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Com o stop no breakeven, o pior cenário da operação passa a ser o lucro já realizado no primeiro alvo.','answer',true,'explanation','Exato: por isso esse é um momento confortável para o psicológico do trader.'), 2);

END $$;
