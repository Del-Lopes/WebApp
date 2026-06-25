-- ============================================================
-- Trilha Gain — 10 unidades de análise técnica / conceitos:
-- Médias Móveis, Trend Lines, Suportes e Resistências, Bollinger,
-- Smart Money Concepts, ICT, Wyckoff, Teoria de Dow, Ondas de
-- Elliott e Fibonacci.
-- Cada unidade é inserida no fim das GRATUITAS. Ao final, garante
-- que a unidade paga "Método APP" continue sendo a última.
-- Idempotente (apaga cada unidade pelo título antes de recriar).
-- Rodar DEPOIS de 20260710 (coluna is_locked) e 20260711.
-- ============================================================

DO $$
DECLARE
  v_track  uuid;
  v_unit   uuid;
  v_lesson uuid;
  v_pos    integer;
BEGIN
  SELECT id INTO v_track FROM public.trilha_tracks WHERE title = 'Jornada do Trader';
  IF v_track IS NULL THEN
    RAISE EXCEPTION 'Trilha "Jornada do Trader" não encontrada.';
  END IF;

  -- ============ Médias Móveis ============
  DELETE FROM public.trilha_units WHERE track_id = v_track AND title = 'Médias Móveis';
  SELECT COALESCE(MAX(order_index), -1) + 1 INTO v_pos FROM public.trilha_units WHERE track_id = v_track AND NOT is_locked;
  -- insere no fim das gratuitas; reposiciona p/ antes da paga abaixo
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index)
  VALUES (v_track, 'Médias Móveis', 'Análise técnica', v_pos) RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O que é uma média móvel', 10, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Média Móvel: o preço médio','body','A Média Móvel (MM) calcula o preço médio dos últimos N períodos e desenha uma linha que acompanha o gráfico. Ela suaviza o ruído e ajuda a enxergar a direção dominante: linha subindo = tendência de alta; descendo = de baixa.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O que a média móvel ajuda a enxergar?','options',jsonb_build_array('A cor da tela','A direção dominante do preço','O horário do pregão','O nome do ativo'),'correctIndex',1,'explanation','Ela suaviza o ruído e revela a tendência.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Uma média móvel subindo sugere tendência de alta.','answer',true,'explanation','Sim: a inclinação da média indica a direção.'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Simples x Exponencial', 15, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','SMA x EMA','body','A Média Simples (SMA) dá o mesmo peso a todos os períodos. A Exponencial (EMA) dá mais peso aos preços recentes, reagindo mais rápido às mudanças. EMA é mais sensível; SMA é mais estável.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Qual média reage mais rápido aos preços recentes?','options',jsonb_build_array('SMA (simples)','EMA (exponencial)','As duas iguais','Nenhuma'),'correctIndex',1,'explanation','A EMA dá mais peso ao recente, reagindo mais rápido.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','A SMA dá o mesmo peso a todos os períodos do cálculo.','answer',true,'explanation','Correto: na simples, todos os períodos pesam igual.'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Cruzamento de médias', 20, 2) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O sinal do cruzamento','body','Usar duas médias (uma rápida e uma lenta) gera sinais: quando a rápida cruza a lenta para cima, é sinal de alta (cruzamento de ouro); para baixo, sinal de baixa (cruzamento da morte). É uma técnica clássica de tendência.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','A média rápida cruzando a lenta PARA CIMA sinaliza:','options',jsonb_build_array('Baixa','Alta','Mercado parado','Erro'),'correctIndex',1,'explanation','Rápida acima da lenta = viés de alta (golden cross).'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','O cruzamento da rápida abaixo da lenta sugere viés de baixa.','answer',true,'explanation','Sim: é o chamado "cruzamento da morte".'), 2);

  -- ============ Trend Lines ============
  DELETE FROM public.trilha_units WHERE track_id = v_track AND title = 'Trend Lines';
  SELECT COALESCE(MAX(order_index), -1) + 1 INTO v_pos FROM public.trilha_units WHERE track_id = v_track AND NOT is_locked;
  -- insere no fim das gratuitas; reposiciona p/ antes da paga abaixo
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index)
  VALUES (v_track, 'Trend Lines', 'Análise técnica', v_pos) RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O que é uma trend line', 10, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Linha de tendência','body','A Trend Line (linha de tendência) é uma reta que liga topos ou fundos consecutivos, mostrando a direção do movimento. Em alta, ligamos os fundos (suporte ascendente); em baixa, ligamos os topos (resistência descendente).'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Numa tendência de alta, a trend line liga:','options',jsonb_build_array('Os topos','Os fundos ascendentes','O meio do candle','Nada'),'correctIndex',1,'explanation','Em alta, ligamos os fundos que vão subindo.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Numa tendência de baixa, a trend line é traçada ligando os topos.','answer',true,'explanation','Sim: topos descendentes formam a resistência da queda.'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Validando a linha', 15, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Quanto mais toques, mais forte','body','Uma trend line fica mais confiável quanto mais vezes o preço a respeita (toca e volta). Dois pontos definem a reta; o terceiro toque confirma. Linhas muito inclinadas tendem a ser frágeis.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O que torna uma trend line mais confiável?','options',jsonb_build_array('Ser bem inclinada','Mais toques que o preço respeita','Ter cor vermelha','Ser curta'),'correctIndex',1,'explanation','Mais toques respeitados = linha mais relevante.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Bastam dois pontos para traçar uma trend line, e o terceiro toque a confirma.','answer',true,'explanation','Correto: 2 definem, o 3º valida.'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Rompimento da linha', 20, 2) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Quando a linha quebra','body','O rompimento da trend line sinaliza possível mudança ou pausa da tendência. Muitos traders esperam o preço fechar do outro lado da linha (não só furar) para confirmar o rompimento e evitar falsos sinais.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O que ajuda a confirmar um rompimento real da trend line?','options',jsonb_build_array('O preço só encostar na linha','O candle FECHAR do outro lado da linha','A cor do gráfico','O volume zero'),'correctIndex',1,'explanation','Fechamento do outro lado reduz falsos rompimentos.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','O rompimento de uma trend line pode indicar mudança de tendência.','answer',true,'explanation','Sim: é um dos sinais clássicos de virada/pausa.'), 2);

  -- ============ Suportes e Resistências ============
  DELETE FROM public.trilha_units WHERE track_id = v_track AND title = 'Suportes e Resistências';
  SELECT COALESCE(MAX(order_index), -1) + 1 INTO v_pos FROM public.trilha_units WHERE track_id = v_track AND NOT is_locked;
  -- insere no fim das gratuitas; reposiciona p/ antes da paga abaixo
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index)
  VALUES (v_track, 'Suportes e Resistências', 'Análise técnica', v_pos) RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O que são', 10, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Pisos e tetos do preço','body','Suporte é uma região onde o preço costuma parar de cair (piso, com compradores). Resistência é onde costuma parar de subir (teto, com vendedores). São zonas de decisão onde o mercado reage.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Suporte é a região onde o preço costuma:','options',jsonb_build_array('Parar de subir','Parar de cair','Sumir','Dobrar'),'correctIndex',1,'explanation','Suporte = piso, onde a queda tende a parar.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Resistência é uma região onde o preço costuma parar de subir.','answer',true,'explanation','Sim: é o teto, onde aparecem vendedores.'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Inversão de papéis', 15, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Suporte vira resistência','body','Quando o preço rompe um suporte, essa região costuma virar resistência (e vice-versa). É o conceito de "troca de polaridade": o nível continua importante, só muda de papel.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Ao romper um suporte, essa região tende a virar:','options',jsonb_build_array('Suporte mais forte','Resistência','Nada','Tendência'),'correctIndex',1,'explanation','Suporte rompido frequentemente vira resistência.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Um nível importante pode trocar de papel entre suporte e resistência.','answer',true,'explanation','Sim: é a troca de polaridade.'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Operando os níveis', 20, 2) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Como usar na prática','body','Traders compram perto de suportes e vendem perto de resistências, ou operam o rompimento desses níveis. O stop costuma ficar do outro lado do nível, limitando o risco se a zona não segurar.'), 0),
  (v_lesson, 'order', jsonb_build_object('prompt','Ordene uma operação de compra no suporte:','items',jsonb_build_array('Identificar o suporte','Aguardar o preço reagir no nível','Comprar com stop abaixo do suporte')), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Colocar o stop do outro lado do nível ajuda a limitar o risco.','answer',true,'explanation','Sim: se o nível não segurar, a perda fica controlada.'), 2);

  -- ============ Bandas de Bollinger ============
  DELETE FROM public.trilha_units WHERE track_id = v_track AND title = 'Bandas de Bollinger';
  SELECT COALESCE(MAX(order_index), -1) + 1 INTO v_pos FROM public.trilha_units WHERE track_id = v_track AND NOT is_locked;
  -- insere no fim das gratuitas; reposiciona p/ antes da paga abaixo
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index)
  VALUES (v_track, 'Bandas de Bollinger', 'Análise técnica', v_pos) RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O que são as bandas', 10, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Média + volatilidade','body','As Bandas de Bollinger são três linhas: uma média móvel central e duas bandas (superior e inferior) que se afastam conforme a volatilidade. Quanto mais voláteis os preços, mais largas ficam as bandas.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O que faz as bandas de Bollinger se alargarem?','options',jsonb_build_array('Menos volatilidade','Mais volatilidade','Horário de almoço','A cor do candle'),'correctIndex',1,'explanation','Mais volatilidade = bandas mais largas.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','A linha central das bandas de Bollinger é uma média móvel.','answer',true,'explanation','Sim: o centro é uma média; as bandas medem o desvio.'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Squeeze (aperto)', 15, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O aperto das bandas','body','Quando as bandas se estreitam muito (squeeze), a volatilidade está baixa — costuma anteceder um movimento forte. Traders ficam atentos ao squeeze como aviso de que uma explosão de preço pode vir.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Um "squeeze" (bandas bem estreitas) costuma indicar:','options',jsonb_build_array('Que nada vai acontecer','Possível movimento forte à frente','Fim do mercado','Erro do indicador'),'correctIndex',1,'explanation','Baixa volatilidade no squeeze precede expansões.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Bandas muito estreitas indicam baixa volatilidade no momento.','answer',true,'explanation','Sim: estreito = pouca volatilidade.'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Toques nas bandas', 20, 2) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Preço nas extremidades','body','O preço tende a oscilar entre as bandas. Tocar a banda superior NÃO é sinal automático de venda — em tendências fortes o preço "caminha" na banda. Use as bandas junto com tendência e outros sinais, não isoladas.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Tocar a banda superior significa sempre vender?','options',jsonb_build_array('Sim, sempre','Não — em tendência o preço pode caminhar na banda','Só às sextas','Nunca toca'),'correctIndex',1,'explanation','Em tendência forte o preço acompanha a banda; não é venda automática.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','As bandas de Bollinger funcionam melhor combinadas com outros sinais.','answer',true,'explanation','Sim: isoladas geram muitos falsos sinais.'), 2);

  -- ============ Smart Money Concepts ============
  DELETE FROM public.trilha_units WHERE track_id = v_track AND title = 'Smart Money Concepts';
  SELECT COALESCE(MAX(order_index), -1) + 1 INTO v_pos FROM public.trilha_units WHERE track_id = v_track AND NOT is_locked;
  -- insere no fim das gratuitas; reposiciona p/ antes da paga abaixo
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index)
  VALUES (v_track, 'Smart Money Concepts', 'Conceitos avançados', v_pos) RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O que é Smart Money', 10, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O dinheiro institucional','body','Smart Money Concepts (SMC) é a ideia de seguir o "dinheiro inteligente" — grandes players (bancos, fundos) que movem o mercado. A análise busca rastros desses grandes volumes para operar a favor deles, não contra.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Quem é o "smart money"?','options',jsonb_build_array('Pequenos traders','Grandes players institucionais','A corretora','O governo'),'correctIndex',1,'explanation','São os grandes players que movem o mercado.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','A ideia do SMC é operar a favor dos grandes players, não contra.','answer',true,'explanation','Sim: seguir o rastro do dinheiro institucional.'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Liquidez', 15, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Caça à liquidez','body','Liquidez são as regiões onde há muitas ordens acumuladas (acima de topos e abaixo de fundos, onde ficam os stops). O smart money costuma buscar essa liquidez antes de mover o preço na direção real — o famoso "stop hunt".'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Onde costuma se acumular liquidez (stops)?','options',jsonb_build_array('No meio do gráfico','Acima de topos e abaixo de fundos','Fora do gráfico','Em lugar nenhum'),'correctIndex',1,'explanation','Stops se concentram além de topos/fundos óbvios.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Stop hunt é quando o preço busca a liquidez antes de seguir a direção real.','answer',true,'explanation','Sim: varre os stops e depois anda de verdade.'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Order Blocks', 20, 2) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Blocos de ordem','body','Order Block é a última vela contrária antes de um movimento forte — marca onde os grandes players posicionaram ordens. Traders SMC esperam o preço retornar a esse bloco para entrar a favor do movimento institucional.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Um Order Block marca:','options',jsonb_build_array('Um erro do gráfico','Onde grandes players posicionaram ordens','O fim do dia','A cor do candle'),'correctIndex',1,'explanation','É a zona de origem do movimento institucional.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','No SMC, o preço retornar a um order block pode ser um ponto de entrada.','answer',true,'explanation','Sim: o retorno ao bloco é gatilho comum.'), 2);

  -- ============ ICT ============
  DELETE FROM public.trilha_units WHERE track_id = v_track AND title = 'ICT';
  SELECT COALESCE(MAX(order_index), -1) + 1 INTO v_pos FROM public.trilha_units WHERE track_id = v_track AND NOT is_locked;
  -- insere no fim das gratuitas; reposiciona p/ antes da paga abaixo
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index)
  VALUES (v_track, 'ICT', 'Conceitos avançados', v_pos) RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O que é ICT', 10, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Inner Circle Trader','body','ICT (Inner Circle Trader) é uma metodologia criada por Michael Huddleston, focada em como as instituições operam: liquidez, manipulação e desequilíbrios de preço. É parente próximo do Smart Money Concepts, com ferramentas próprias.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O ICT foca em entender principalmente:','options',jsonb_build_array('Notícias de esporte','Como as instituições operam','O clima','A cor do gráfico'),'correctIndex',1,'explanation','ICT estuda o comportamento institucional do preço.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','ICT tem relação próxima com os conceitos de Smart Money.','answer',true,'explanation','Sim: compartilham a lógica de liquidez e instituições.'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Fair Value Gap', 15, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O desequilíbrio (FVG)','body','Fair Value Gap (FVG) é um "buraco" deixado por um movimento muito rápido, onde o preço não negociou de forma equilibrada. O preço costuma voltar para preencher esse gap antes de seguir — é uma zona de interesse no ICT.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Um Fair Value Gap (FVG) é:','options',jsonb_build_array('Um erro de internet','Um desequilíbrio deixado por um movimento rápido','O fim da tendência','Uma corretora'),'correctIndex',1,'explanation','É um vazio de negociação que o preço tende a preencher.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','O preço costuma voltar para preencher um FVG antes de continuar.','answer',true,'explanation','Sim: é a tendência de reequilíbrio.'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Killzones', 20, 2) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Horários de maior movimento','body','As Killzones do ICT são janelas de horário (ligadas às sessões de Londres e Nova York) em que o mercado costuma ter os movimentos mais relevantes. Operar nesses horários aumenta a chance de pegar movimentos institucionais.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','As Killzones do ICT estão ligadas a:','options',jsonb_build_array('Fases da lua','Janelas das sessões de Londres e NY','Feriados','Cor dos candles'),'correctIndex',1,'explanation','São horários nobres das grandes sessões.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Operar nas killzones busca aproveitar os horários de maior movimento.','answer',true,'explanation','Sim: concentram a atividade institucional.'), 2);

  -- ============ Wyckoff ============
  DELETE FROM public.trilha_units WHERE track_id = v_track AND title = 'Wyckoff';
  SELECT COALESCE(MAX(order_index), -1) + 1 INTO v_pos FROM public.trilha_units WHERE track_id = v_track AND NOT is_locked;
  -- insere no fim das gratuitas; reposiciona p/ antes da paga abaixo
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index)
  VALUES (v_track, 'Wyckoff', 'Conceitos avançados', v_pos) RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O método Wyckoff', 10, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Acumulação e distribuição','body','O método de Richard Wyckoff estuda como os grandes operadores acumulam (compram aos poucos, de baixo) e distribuem (vendem aos poucos, no topo) posições. A ideia é identificar essas fases para operar junto com o "dinheiro forte".'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','No Wyckoff, "acumulação" significa:','options',jsonb_build_array('Grandes vendendo no topo','Grandes comprando aos poucos, embaixo','O fim do mercado','Um indicador'),'correctIndex',1,'explanation','Acumulação = compra discreta dos grandes na base.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Distribuição é quando os grandes operadores vendem aos poucos no topo.','answer',true,'explanation','Sim: o oposto da acumulação.'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'As 3 leis', 15, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Oferta/demanda, causa/efeito, esforço/resultado','body','Wyckoff tem 3 leis: (1) Oferta e Demanda movem o preço; (2) Causa e Efeito — a fase de acumulação (causa) gera o movimento (efeito); (3) Esforço x Resultado — volume (esforço) deve condizer com o movimento (resultado).'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','A lei do "Esforço x Resultado" compara:','options',jsonb_build_array('Cor x tamanho','Volume x movimento do preço','Hora x dia','Lote x corretora'),'correctIndex',1,'explanation','Volume é o esforço; o movimento é o resultado esperado.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Para Wyckoff, oferta e demanda são a força que move o preço.','answer',true,'explanation','Sim: é a primeira lei.'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Spring e Upthrust', 20, 2) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Os testes de Wyckoff','body','O Spring é uma falsa quebra de suporte (varre stops e volta a subir) no fim de uma acumulação. O Upthrust é o oposto: falsa quebra de resistência antes de cair. São sinais de que os grandes terminaram de posicionar.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Um "Spring" no Wyckoff é:','options',jsonb_build_array('Quebra real de suporte','Falsa quebra de suporte que volta a subir','Um indicador','Um robô'),'correctIndex',1,'explanation','Spring = falsa quebra para baixo, depois sobe.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','O Upthrust é uma falsa quebra de resistência antes de o preço cair.','answer',true,'explanation','Sim: é o espelho do Spring.'), 2);

  -- ============ Teoria de Dow ============
  DELETE FROM public.trilha_units WHERE track_id = v_track AND title = 'Teoria de Dow';
  SELECT COALESCE(MAX(order_index), -1) + 1 INTO v_pos FROM public.trilha_units WHERE track_id = v_track AND NOT is_locked;
  -- insere no fim das gratuitas; reposiciona p/ antes da paga abaixo
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index)
  VALUES (v_track, 'Teoria de Dow', 'Conceitos avançados', v_pos) RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Os princípios de Dow', 10, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','A base da análise técnica','body','A Teoria de Dow, de Charles Dow, é a base da análise técnica moderna. Um dos princípios centrais: o mercado se move em tendências (alta, baixa e lateral), e essas tendências persistem até que haja sinais claros de reversão.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Segundo Dow, o mercado se move em:','options',jsonb_build_array('Linha reta','Tendências','Círculos','Acaso total'),'correctIndex',1,'explanation','Tendências são o núcleo da Teoria de Dow.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Pela Teoria de Dow, uma tendência persiste até dar sinais claros de reversão.','answer',true,'explanation','Sim: a tendência vigente é presumida até prova em contrário.'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'As fases da tendência', 15, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Acumulação, alta e distribuição','body','Dow descreve 3 fases numa tendência primária: acumulação (os bem informados compram), participação pública (a maioria entra e o movimento ganha força) e distribuição (os bem informados realizam lucro enquanto o público ainda compra).'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Na fase de "distribuição", os bem informados estão:','options',jsonb_build_array('Comprando','Realizando lucro/vendendo','Dormindo','Fora do mercado'),'correctIndex',1,'explanation','Distribuição = realização de lucro dos informados.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Na participação pública, a maioria entra e o movimento ganha força.','answer',true,'explanation','Sim: é a fase de maior volume e força.'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Confirmação e volume', 20, 2) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Tendências confirmam-se','body','Para Dow, o volume deve confirmar a tendência (sobe com volume crescente numa alta saudável) e índices/ativos relacionados devem se confirmar mutuamente. Movimentos sem volume ou sem confirmação são suspeitos.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Numa alta saudável, o volume deve:','options',jsonb_build_array('Diminuir sempre','Acompanhar/confirmar o movimento','Ficar zerado','Ser ignorado'),'correctIndex',1,'explanation','Volume confirmando dá confiabilidade à tendência.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Para Dow, movimentos sem confirmação de volume são suspeitos.','answer',true,'explanation','Sim: a confirmação é um pilar da teoria.'), 2);

  -- ============ Ondas de Elliott ============
  DELETE FROM public.trilha_units WHERE track_id = v_track AND title = 'Ondas de Elliott';
  SELECT COALESCE(MAX(order_index), -1) + 1 INTO v_pos FROM public.trilha_units WHERE track_id = v_track AND NOT is_locked;
  -- insere no fim das gratuitas; reposiciona p/ antes da paga abaixo
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index)
  VALUES (v_track, 'Ondas de Elliott', 'Conceitos avançados', v_pos) RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O que é a Teoria de Elliott', 10, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O mercado em ondas','body','A Teoria das Ondas de Elliott diz que o mercado se move em padrões repetitivos de ondas, guiados pela psicologia das massas. O padrão básico tem 5 ondas a favor da tendência (impulso) seguidas de 3 ondas de correção.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O padrão básico de Elliott tem:','options',jsonb_build_array('2 ondas','5 ondas de impulso + 3 de correção','10 ondas iguais','Nenhuma onda'),'correctIndex',1,'explanation','É a estrutura clássica 5-3.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','As ondas de Elliott refletem a psicologia das massas no mercado.','answer',true,'explanation','Sim: é a base comportamental da teoria.'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Impulso e correção', 15, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','As 5 + 3','body','As 5 ondas de impulso (1-2-3-4-5) avançam na direção da tendência; as 3 de correção (A-B-C) andam contra. A onda 3 costuma ser a mais forte e longa, e as ondas 2 e 4 são as correções dentro do impulso.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Qual onda de impulso costuma ser a mais forte?','options',jsonb_build_array('Onda 1','Onda 3','Onda 5','Onda A'),'correctIndex',1,'explanation','A onda 3 geralmente é a mais longa e forte.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','As ondas A-B-C correm contra a tendência principal (correção).','answer',true,'explanation','Sim: são o movimento corretivo após o impulso.'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Regras das ondas', 20, 2) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Regras que não se quebram','body','Elliott tem regras rígidas: a onda 2 nunca corrige 100% da onda 1; a onda 3 nunca é a mais curta entre 1, 3 e 5; e a onda 4 não invade o território da onda 1. Se uma regra quebra, a contagem está errada.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Qual destas é uma regra de Elliott?','options',jsonb_build_array('A onda 3 é sempre a mais curta','A onda 2 nunca corrige 100% da onda 1','A onda 4 deve invadir a onda 1','Não há regras'),'correctIndex',1,'explanation','A onda 2 não pode retroceder toda a onda 1.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Se uma regra de Elliott é violada, a contagem de ondas está errada.','answer',true,'explanation','Sim: as regras são absolutas para validar a contagem.'), 2);

  -- ============ Fibonacci ============
  DELETE FROM public.trilha_units WHERE track_id = v_track AND title = 'Fibonacci';
  SELECT COALESCE(MAX(order_index), -1) + 1 INTO v_pos FROM public.trilha_units WHERE track_id = v_track AND NOT is_locked;
  -- insere no fim das gratuitas; reposiciona p/ antes da paga abaixo
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index)
  VALUES (v_track, 'Fibonacci', 'Análise técnica', v_pos) RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'A sequência e a proporção', 10, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','De onde vem o Fibonacci','body','A sequência de Fibonacci (1, 1, 2, 3, 5, 8, 13...) gera proporções que aparecem na natureza e nos mercados. A mais famosa é a "proporção áurea" (0,618). No trading, usamos níveis derivados dela para medir correções e projeções.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Qual é o nível mais famoso de Fibonacci (proporção áurea)?','options',jsonb_build_array('0,236','0,500','0,618','1,000'),'correctIndex',2,'explanation','0,618 é a proporção áurea, nível-chave de correção.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Os níveis de Fibonacci derivam de uma sequência matemática.','answer',true,'explanation','Sim: vêm das proporções da sequência de Fibonacci.'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Retração de Fibonacci', 15, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Medindo o pullback','body','A Retração de Fibonacci mede o quanto o preço corrige dentro de uma tendência. Traçamos do início ao fim de um movimento, e os níveis 0,382 / 0,500 / 0,618 marcam zonas onde a correção costuma terminar antes de a tendência retomar.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','A retração de Fibonacci é usada para:','options',jsonb_build_array('Prever notícias','Medir o tamanho da correção (pullback)','Escolher a corretora','Mudar a cor do gráfico'),'correctIndex',1,'explanation','Ela estima até onde o preço pode corrigir.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Os níveis 0,382, 0,5 e 0,618 são zonas comuns de fim de correção.','answer',true,'explanation','Sim: são as retrações mais observadas.'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Extensões e alvos', 20, 2) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Projetando o movimento','body','Além de medir correções, o Fibonacci projeta alvos com as extensões (1,272, 1,618...). Depois que a correção termina, essas extensões estimam até onde o próximo impulso pode ir — útil para definir alvos de realização.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','As extensões de Fibonacci (1,618 etc.) servem para:','options',jsonb_build_array('Medir o pullback','Projetar alvos do próximo movimento','Escolher o ativo','Nada'),'correctIndex',1,'explanation','Extensões projetam para onde o preço pode ir.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','A extensão de 1,618 é usada como possível alvo de um movimento.','answer',true,'explanation','Sim: é um alvo clássico de projeção.'), 2);

  -- Garante que a unidade paga "Método APP" permaneça por último.
  UPDATE public.trilha_units
  SET order_index = (
    SELECT COALESCE(MAX(order_index), 0) + 1
    FROM public.trilha_units
    WHERE track_id = v_track AND title <> 'Método APP'
  )
  WHERE track_id = v_track AND title = 'Método APP';
END $$;
