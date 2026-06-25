-- ============================================================
-- Trilha Gain — novas unidades da "Jornada do Trader"
-- Indicadores, Timeframes, Corretoras, MetaTrader, Expert Advisors.
-- Idempotente (apaga cada unidade pelo título antes de recriar).
-- Rodar no Supabase Dashboard → SQL Editor.
-- ============================================================

DO $$
DECLARE
  v_track  uuid;
  v_unit   uuid;
  v_lesson uuid;
BEGIN
  SELECT id INTO v_track FROM public.trilha_tracks WHERE title = 'Jornada do Trader';
  IF v_track IS NULL THEN
    RAISE EXCEPTION 'Trilha "Jornada do Trader" não encontrada. Rode 20260704_trilha_unificada.sql primeiro.';
  END IF;

  -- ============ Indicadores ============
  DELETE FROM public.trilha_units WHERE track_id = v_track AND title = 'Indicadores';
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index)
  VALUES (v_track, 'Indicadores', 'Unidade 6', 5) RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O que é um indicador', 10, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O que é um indicador','body','Indicadores são cálculos feitos sobre o preço (e às vezes o volume) que viram linhas ou áreas no gráfico. Eles ajudam a enxergar tendência, força e momentos de compra ou venda — mas são uma ferramenta de apoio, não uma bola de cristal.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Sobre o que os indicadores são calculados?','options',jsonb_build_array('Sobre notícias','Sobre o preço (e às vezes volume)','Sobre o horário','Sobre a corretora'),'correctIndex',1,'explanation','Indicadores derivam do preço e, em alguns casos, do volume negociado.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Um indicador garante o acerto da operação.','answer',false,'explanation','Nenhum indicador acerta sempre — é uma ferramenta de apoio à decisão.'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Médias Móveis', 15, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Médias Móveis','body','A Média Móvel mostra o preço médio de um período, suavizando o ruído. Quando o preço está acima da média, há viés de alta; abaixo, viés de baixa. Cruzamentos entre médias são sinais clássicos de mudança de tendência.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O que indica o preço estar acima da média móvel?','options',jsonb_build_array('Viés de baixa','Viés de alta','Mercado parado','Erro no gráfico'),'correctIndex',1,'explanation','Preço acima da média costuma indicar tendência/viés de alta.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','A média móvel suaviza o ruído do preço, facilitando ver a tendência.','answer',true,'explanation','Exato: ela filtra oscilações curtas e evidencia a direção.'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Osciladores (RSI)', 15, 2) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Osciladores e o RSI','body','Osciladores como o RSI medem a força do movimento numa escala de 0 a 100. Valores muito altos (ex.: acima de 70) sugerem sobrecompra; muito baixos (ex.: abaixo de 30) sugerem sobrevenda — possíveis pontos de exaustão.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','No RSI, um valor acima de 70 costuma indicar:','options',jsonb_build_array('Sobrevenda','Sobrecompra','Tendência neutra','Falha do indicador'),'correctIndex',1,'explanation','RSI acima de 70 sinaliza sobrecompra (possível exaustão da alta).'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','O RSI varia numa escala de 0 a 100.','answer',true,'explanation','Sim: é um oscilador limitado entre 0 e 100.'), 2);

  -- ============ Timeframes ============
  DELETE FROM public.trilha_units WHERE track_id = v_track AND title = 'Timeframes';
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index)
  VALUES (v_track, 'Timeframes', 'Unidade 7', 6) RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O que é timeframe', 10, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O que é timeframe','body','Timeframe (tempo gráfico) é o período que cada candle representa: 1 minuto, 5 minutos, 1 hora, 1 dia... Quanto maior o timeframe, mais "peso" tem cada candle e mais relevante é o movimento que ele mostra.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O que define o timeframe de um gráfico?','options',jsonb_build_array('A cor dos candles','O período que cada candle representa','O nome da corretora','O valor do ativo'),'correctIndex',1,'explanation','O timeframe é o tempo que cada vela resume (M1, M5, H1, D1...).'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Num gráfico de 1 hora, cada candle representa 1 hora de negociação.','answer',true,'explanation','Correto: cada vela do H1 resume uma hora inteira.'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Curto x Longo prazo', 15, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Timeframe curto x longo','body','Timeframes curtos (M1, M5) mostram muito ruído e servem para operações rápidas (scalp/day trade). Timeframes longos (H4, Diário) mostram a tendência principal e servem para swing/position. Operadores costumam combinar os dois.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Qual timeframe mostra melhor a tendência principal?','options',jsonb_build_array('1 minuto','5 minutos','Diário','Nenhum'),'correctIndex',2,'explanation','Timeframes maiores como o Diário evidenciam a tendência de fundo.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Timeframes curtos têm mais ruído que timeframes longos.','answer',true,'explanation','Sim: quanto menor o tempo gráfico, mais oscilações irrelevantes aparecem.'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Análise multi-timeframe', 20, 2) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Análise em múltiplos tempos','body','A análise multi-timeframe usa um gráfico maior para definir a direção (tendência) e um menor para achar o ponto de entrada. Assim você opera a favor da tendência principal com timing mais preciso.'), 0),
  (v_lesson, 'order', jsonb_build_object('prompt','Ordene o fluxo da análise multi-timeframe:','items',jsonb_build_array('Olhar o timeframe maior para ver a tendência','Descer para o timeframe menor','Buscar o ponto de entrada a favor da tendência')), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Na análise multi-timeframe, o gráfico maior define a direção e o menor o timing.','answer',true,'explanation','Exato: tendência no maior, entrada no menor.'), 2);

  -- ============ Corretoras ============
  DELETE FROM public.trilha_units WHERE track_id = v_track AND title = 'Corretoras';
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index)
  VALUES (v_track, 'Corretoras', 'Unidade 8', 7) RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O que é uma corretora', 10, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O papel da corretora','body','A corretora (broker) é a empresa que conecta você ao mercado, executando suas ordens de compra e venda. É por meio dela que você acessa os ativos, deposita e saca recursos e recebe a plataforma de operações.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Qual a função principal de uma corretora?','options',jsonb_build_array('Prever o mercado','Conectar você ao mercado e executar ordens','Garantir lucro','Pagar impostos por você'),'correctIndex',1,'explanation','A corretora intermedia o acesso ao mercado e executa suas ordens.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','É pela corretora que você deposita, opera e saca seus recursos.','answer',true,'explanation','Sim: ela é a ponte entre o trader e o mercado.'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Spread e custos', 15, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Como a corretora cobra','body','As corretoras ganham principalmente pelo spread (diferença entre compra e venda) e, em alguns casos, por comissão por operação. Custos menores fazem diferença grande para quem opera com frequência.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','De onde vem boa parte da receita de uma corretora?','options',jsonb_build_array('Do horário do pregão','Do spread e comissões','Da cor do candle','Do tamanho da tela'),'correctIndex',1,'explanation','Spread e comissões são as principais fontes de receita do broker.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Custos menores por operação importam mais para quem opera com frequência.','answer',true,'explanation','Correto: quanto mais operações, mais o custo unitário pesa no resultado.'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Escolhendo uma corretora', 20, 2) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O que avaliar na corretora','body','Ao escolher uma corretora, avalie: regulação e segurança, custos (spread/comissão), qualidade de execução, plataformas disponíveis (como o MetaTrader) e suporte. Segurança vem antes de qualquer promessa de custo baixo.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O que deve vir em PRIMEIRO lugar ao escolher uma corretora?','options',jsonb_build_array('A cor do site','Regulação e segurança','O bônus de boas-vindas','A logo'),'correctIndex',1,'explanation','Segurança e regulação são prioridade — protegem seu capital.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Um spread baixo justifica usar uma corretora sem regulação.','answer',false,'explanation','Não: segurança vem antes do custo. Corretora não regulada é risco alto.'), 2);

  -- ============ MetaTrader ============
  DELETE FROM public.trilha_units WHERE track_id = v_track AND title = 'MetaTrader';
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index)
  VALUES (v_track, 'MetaTrader', 'Unidade 9', 8) RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O que é o MetaTrader', 10, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','A plataforma MetaTrader','body','O MetaTrader (MT4/MT5) é a plataforma de operações mais usada no mundo para forex e índices. Nela você vê gráficos, envia ordens, aplica indicadores e roda robôs (Expert Advisors). A corretora fornece o acesso a ela.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O MetaTrader serve para:','options',jsonb_build_array('Apenas ver notícias','Operar, ver gráficos e rodar robôs','Pagar contas','Editar fotos'),'correctIndex',1,'explanation','É a plataforma onde você opera, analisa e automatiza.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','No MetaTrader é possível aplicar indicadores e enviar ordens.','answer',true,'explanation','Sim: gráficos, indicadores, ordens e automações em um só lugar.'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'MT4 x MT5', 15, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Diferenças entre MT4 e MT5','body','O MT5 é a versão mais nova: tem mais timeframes, mais tipos de ordem e é mais rápido. O MT4 ainda é muito popular, principalmente para forex. Os robôs de um não rodam no outro sem adaptação.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Qual afirmação sobre MT4 e MT5 é correta?','options',jsonb_build_array('São idênticos','O MT5 é mais novo e tem mais recursos','O MT4 é mais novo','Robôs do MT4 rodam direto no MT5'),'correctIndex',1,'explanation','O MT5 é a evolução, com mais timeframes e recursos.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Um robô feito para MT4 roda no MT5 sem nenhuma adaptação.','answer',false,'explanation','Não: as linguagens diferem; é preciso adaptar/recompilar.'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Ordens no MetaTrader', 20, 2) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Tipos de ordem','body','No MetaTrader você usa ordens a mercado (executa no preço atual) e ordens pendentes (executam quando o preço chega a um nível definido, como Buy Limit ou Sell Stop). Stop Loss e Take Profit podem ser anexados para automatizar saídas.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Uma ordem "a mercado" é executada:','options',jsonb_build_array('Quando o preço chega a um nível futuro','No preço atual, na hora','Só no fim do dia','Nunca'),'correctIndex',1,'explanation','Ordem a mercado executa imediatamente no preço corrente.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Stop Loss e Take Profit podem ser anexados a uma ordem para automatizar a saída.','answer',true,'explanation','Sim: definem saída no prejuízo (SL) e no lucro (TP) automaticamente.'), 2);

  -- ============ Expert Advisors ============
  DELETE FROM public.trilha_units WHERE track_id = v_track AND title = 'Expert Advisors';
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index)
  VALUES (v_track, 'Expert Advisors', 'Unidade 10', 9) RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O que é um Expert Advisor', 10, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O que é um EA (robô)','body','Um Expert Advisor (EA) é um robô que roda no MetaTrader e executa operações automaticamente seguindo regras programadas. Ele pode abrir, gerenciar e fechar posições sem você precisar clicar — 24 horas, sem emoção.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O que um Expert Advisor faz?','options',jsonb_build_array('Dá palpites por telefone','Executa operações automaticamente por regras','Substitui a corretora','Imprime o gráfico'),'correctIndex',1,'explanation','O EA automatiza a execução conforme regras programadas.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Um EA pode operar sem você precisar clicar manualmente.','answer',true,'explanation','Sim: ele segue as regras e opera de forma automática.'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Vantagens e riscos', 15, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Prós e contras dos robôs','body','Vantagens: o EA não tem emoção, opera rápido e segue o plano à risca. Riscos: ele faz exatamente o que foi programado — se a estratégia ou os parâmetros estiverem errados, ele erra rápido também. Monitorar e gerenciar risco continua essencial.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Qual é uma vantagem real de um EA?','options',jsonb_build_array('Adivinhar o futuro','Operar sem emoção e seguir o plano','Eliminar todo o risco','Funcionar sem corretora'),'correctIndex',1,'explanation','A disciplina sem emoção é uma das maiores vantagens da automação.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Um EA elimina completamente o risco de perdas.','answer',false,'explanation','Não: o robô segue regras; risco existe e precisa ser gerenciado.'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Parâmetros e gestão', 20, 2) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Configurando o robô','body','Um EA tem parâmetros: lote, distância de entradas, stop, alvo, filtros de horário, etc. Ajustá-los bem e respeitar a gestão de risco é o que separa um robô consistente de um que estoura a conta. Comece sempre com lote mínimo e acompanhe.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Por onde começar ao ligar um EA novo?','options',jsonb_build_array('Lote máximo de uma vez','Lote mínimo, acompanhando o comportamento','Desligar o stop','Sem monitorar'),'correctIndex',1,'explanation','Lote mínimo + acompanhamento reduz risco enquanto você valida o robô.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Ajustar bem os parâmetros e respeitar a gestão de risco é essencial num EA.','answer',true,'explanation','Exato: parâmetros e risco definem se o robô é consistente ou perigoso.'), 2);

END $$;
