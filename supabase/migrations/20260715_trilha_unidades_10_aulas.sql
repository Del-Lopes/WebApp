-- ============================================================
-- Trilha Gain — expansão das unidades para 10 aulas cada.
-- Conteúdo gerado e revisado; recria cada unidade preservando
-- posição/imagem/tema. NÃO mexe em "Conhecendo os Candles" nem
-- na unidade paga "Método APP".
-- Idempotente. Rodar no Supabase Dashboard → SQL Editor.
-- ============================================================

DO $$
DECLARE
  v_track  uuid;
  v_unit   uuid;
  v_lesson uuid;
  v_order  integer;
  v_img    text;
  v_theme  text;
  v_sub    text := 'Unidade';
BEGIN
  SELECT id INTO v_track FROM public.trilha_tracks WHERE title = 'Jornada do Trader';
  IF v_track IS NULL THEN RAISE EXCEPTION 'Trilha não encontrada.'; END IF;

  -- ============ Primeiros Passos (10 aulas) ============
  v_sub := 'Unidade';
  SELECT subtitle, order_index, image_url, icon_theme INTO v_sub, v_order, v_img, v_theme
  FROM public.trilha_units WHERE track_id = v_track AND title = 'Primeiros Passos';
  DELETE FROM public.trilha_units WHERE track_id = v_track AND title = 'Primeiros Passos';
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index, image_url, icon_theme)
  VALUES (v_track, 'Primeiros Passos', COALESCE(v_sub, 'Unidade'), COALESCE(v_order, 999), v_img, COALESCE(v_theme, 'default'))
  RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O que é o mercado financeiro', 10, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Onde tudo acontece','body','O mercado financeiro é o ambiente onde compradores e vendedores negociam ativos como moedas, ações e índices. O preço se forma pelo encontro entre quem quer comprar e quem quer vender, mudando a cada segundo. No trading, você lucra acertando a direção desse preço: comprando barato e vendendo caro, ou vendendo caro e recomprando barato.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O que faz o preço de um ativo se mover no mercado?','options',jsonb_build_array('A decisão isolada de um banco central','O encontro entre quem quer comprar e quem quer vender','Uma tabela fixa definida pela corretora','O humor dos jornalistas'),'correctIndex',1,'explanation','O preço é o resultado direto do equilíbrio entre forças de compra e venda. Quando há mais compradores dispostos a pagar mais, o preço sobe; quando há mais vendedores, ele cai.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Oferta e demanda', 15, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','A força por trás do preço','body','Oferta é a quantidade que os vendedores querem vender; demanda é a quantidade que os compradores querem comprar. Quando a demanda supera a oferta, o preço sobe; quando a oferta supera a demanda, o preço cai. Por exemplo, se muitos traders querem comprar o euro e poucos querem vender, o EURUSD tende a subir até encontrar novos vendedores.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Quando a demanda por um ativo supera a oferta, o preço tende a cair.','answer',false,'explanation','É o contrário: mais demanda que oferta empurra o preço para cima, pois os compradores competem entre si e aceitam pagar mais.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O que é o spread', 20, 2) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O custo invisível de cada trade','body','O spread é a diferença entre o preço de compra (ask) e o preço de venda (bid). É o que a corretora cobra de forma embutida em cada operação. Por exemplo, se o EURUSD está com bid em 1.0850 e ask em 1.0851, o spread é de 1 pip, e você já entra ligeiramente no negativo ao abrir a posição.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O spread representa:','options',jsonb_build_array('O lucro garantido da operação','A diferença entre o preço de compra e o de venda','O valor do stop loss','A alavancagem da conta'),'correctIndex',1,'explanation','O spread é a distância entre bid e ask. Ele é um custo de transação: assim que você abre uma posição, precisa que o preço ande a seu favor pelo menos o tamanho do spread para empatar.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Liquidez', 10, 3) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Facilidade de entrar e sair','body','Liquidez é a facilidade de comprar ou vender um ativo sem mover muito o preço. Ativos líquidos, como os principais pares de forex e os grandes índices, têm muitos participantes e spreads baixos. Ativos pouco líquidos podem ter spreads largos e movimentos bruscos, dificultando a execução no preço esperado.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Ativos com alta liquidez costumam ter spreads mais baixos e execução mais fácil.','answer',true,'explanation','Quanto mais participantes negociando, menor a diferença entre bid e ask e mais fácil executar ordens grandes sem mover o preço. Por isso pares principais como EURUSD são tão populares.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Forex e índices', 15, 4) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Os ativos que você vai operar','body','No forex você negocia pares de moedas, como EURUSD ou GBPJPY, apostando na força de uma moeda contra a outra. Índices, como o US100 ou o S e P 500, representam um conjunto de ações e refletem o desempenho de um mercado inteiro. Cada um tem comportamento, horário e volatilidade próprios, e entender essas diferenças ajuda a escolher onde operar.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O que um índice como o US100 representa?','options',jsonb_build_array('Uma única ação de tecnologia','Um par de moedas','Um conjunto de ações que reflete um mercado','A taxa de juros de um país'),'correctIndex',2,'explanation','Índices agrupam várias ações em um único ativo. O US100, por exemplo, acompanha grandes empresas de tecnologia, servindo como termômetro daquele setor.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O que é um lote', 20, 5) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O tamanho da sua posição','body','Lote é a unidade que define o tamanho da sua operação. No forex, um lote padrão equivale a 100.000 unidades da moeda base; há também o mini lote (0,1) e o micro lote (0,01). Quanto maior o lote, maior o valor de cada pip e, portanto, maior o ganho ou a perda por movimento de preço.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Quanto maior o lote, maior é o valor financeiro de cada pip movimentado.','answer',true,'explanation','O lote multiplica o impacto de cada pip. Operar 1 lote movimenta muito mais dinheiro por pip do que 0,01 lote, aumentando tanto o lucro quanto o risco.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Alavancagem', 10, 6) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Controlar muito com pouco','body','Alavancagem permite controlar uma posição grande usando pouco capital próprio. Com alavancagem de 1:100, por exemplo, 1.000 dólares controlam 100.000 dólares em mercado. Ela amplifica os ganhos, mas também as perdas na mesma proporção, por isso deve ser usada com muita responsabilidade.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O principal risco da alavancagem alta é:','options',jsonb_build_array('Reduzir o spread','Amplificar as perdas na mesma proporção dos ganhos','Eliminar a necessidade de stop loss','Garantir lucro maior'),'correctIndex',1,'explanation','Alavancagem é uma faca de dois gumes: ela multiplica ganhos e perdas igualmente. Usar muita alavancagem sem gestão de risco pode liquidar a conta rapidamente.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Margem', 15, 7) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','A garantia da operação','body','Margem é o valor que a corretora reserva da sua conta como garantia para manter uma posição alavancada aberta. Ela não é um custo, mas um depósito temporário que volta a ficar livre quando você fecha o trade. Se as perdas consomem a margem disponível, a corretora pode emitir uma chamada de margem ou liquidar suas posições automaticamente.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','A margem é uma taxa cobrada definitivamente pela corretora a cada operação.','answer',false,'explanation','A margem não é uma taxa, é uma garantia bloqueada temporariamente. Ela é liberada quando a posição é fechada, diferente do spread, que é um custo real.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Pip e ponto', 20, 8) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','A unidade do movimento','body','Pip é a menor variação padrão de preço em um par de forex, geralmente a quarta casa decimal (0,0001). Em índices, costuma-se falar em pontos. Saber quanto vale cada pip ou ponto na sua posição é essencial para calcular lucro, prejuízo e o tamanho do stop antes mesmo de entrar.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Em um par como o EURUSD, um pip geralmente corresponde a:','options',jsonb_build_array('A primeira casa decimal','A quarta casa decimal (0,0001)','O valor total do lote','O tamanho do spread sempre'),'correctIndex',1,'explanation','Na maioria dos pares, o pip é a quarta casa decimal. Em pares com iene (JPY), porém, costuma ser a segunda casa decimal. Conhecer o pip permite medir o movimento em unidades padronizadas.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Horários de mercado', 10, 9) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Cada hora tem seu ritmo','body','O forex funciona 24 horas em dias úteis, dividido nas sessões de Sydney, Tóquio, Londres e Nova York. A volatilidade e a liquidez mudam conforme a sessão: a sobreposição entre Londres e Nova York costuma ser o período mais movimentado. Índices seguem o horário da bolsa de origem, e operar fora dos horários de pico pode trazer spreads maiores e menos clareza.'), 0),
  (v_lesson, 'order', jsonb_build_object('prompt','Coloque as sessões do forex na ordem em que abrem ao longo do dia','items',jsonb_build_array('Sydney','Tóquio','Londres','Nova York')), 1);

  -- ============ Gerenciamento de Risco (10 aulas) ============
  v_sub := 'Unidade';
  SELECT subtitle, order_index, image_url, icon_theme INTO v_sub, v_order, v_img, v_theme
  FROM public.trilha_units WHERE track_id = v_track AND title = 'Gerenciamento de Risco';
  DELETE FROM public.trilha_units WHERE track_id = v_track AND title = 'Gerenciamento de Risco';
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index, image_url, icon_theme)
  VALUES (v_track, 'Gerenciamento de Risco', COALESCE(v_sub, 'Unidade'), COALESCE(v_order, 999), v_img, COALESCE(v_theme, 'default'))
  RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Stop loss', 10, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Sua rede de segurança','body','O stop loss é uma ordem que fecha automaticamente sua posição quando o preço atinge um nível de perda predefinido. Ele existe para limitar o prejuízo de cada operação e proteger seu capital de movimentos contrários. Operar sem stop é como dirigir sem freio: uma única operação mal sucedida pode causar um estrago enorme na conta.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','O stop loss serve para limitar a perda máxima de uma operação.','answer',true,'explanation','O stop loss define de antemão quanto você está disposto a perder. Ele tira a emoção da decisão e protege a conta de perdas descontroladas.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Take profit', 15, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Garantindo o lucro','body','O take profit é uma ordem que fecha a posição automaticamente quando o preço atinge seu alvo de lucro. Ele ajuda a realizar ganhos sem depender de estar na frente da tela e evita a ganância de segurar uma posição boa até ela virar. Definir o take profit junto com o stop, antes de entrar, mantém o plano claro.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Qual a função do take profit?','options',jsonb_build_array('Aumentar a alavancagem','Fechar a posição automaticamente no alvo de lucro','Reduzir o spread da corretora','Impedir qualquer perda'),'correctIndex',1,'explanation','O take profit realiza o lucro de forma automática ao atingir o nível planejado, ajudando a vencer a ganância e a manter a disciplina do plano.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Risco por operação', 20, 2) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','A regra do 1 a 2 por cento','body','Uma regra clássica de gestão manda arriscar no máximo 1 a 2 por cento do capital em cada operação. Assim, mesmo uma sequência de perdas não destrói a conta. Por exemplo, com 10.000 dólares, arriscar 1 por cento significa perder no máximo 100 dólares por trade, mantendo você no jogo por muito tempo.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Com uma conta de 5.000 dólares e risco de 2 por cento por operação, quanto você arrisca por trade?','options',jsonb_build_array('500 dólares','100 dólares','1.000 dólares','50 dólares'),'correctIndex',1,'explanation','2 por cento de 5.000 é 100 dólares. Limitar o risco por operação garante que nenhuma perda isolada comprometa a sobrevivência da conta.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Relação risco e retorno', 10, 3) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Arriscar pouco para ganhar mais','body','A relação risco/retorno compara quanto você arrisca com quanto pretende ganhar em uma operação. Uma relação de 1:2 significa arriscar 1 para ganhar 2. Com uma boa relação, você pode ter mais operações perdedoras que vencedoras e ainda assim terminar no lucro, o que torna esse conceito tão poderoso.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Com uma relação risco/retorno de 1:2, é possível ser lucrativo mesmo acertando menos da metade das operações.','answer',true,'explanation','Se cada acerto rende o dobro de cada erro, você pode acertar só 40 por cento das vezes e ainda ter saldo positivo. Por isso a relação risco/retorno é mais importante que a taxa de acerto.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Position sizing', 15, 4) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O tamanho certo da posição','body','Position sizing é calcular o tamanho do lote com base no risco que você aceita e na distância do seu stop. Stop mais longe exige lote menor; stop mais curto permite lote maior, mantendo o mesmo risco em dinheiro. Esse cálculo, feito antes de entrar, é o que conecta a teoria do 1 a 2 por cento à prática real.'), 0),
  (v_lesson, 'order', jsonb_build_object('prompt','Ordene os passos para dimensionar uma posição corretamente','items',jsonb_build_array('Definir o percentual de risco da conta','Definir o nível do stop loss em pips','Calcular o valor por pip aceitável','Ajustar o tamanho do lote ao risco')), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Drawdown', 20, 5) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','A queda no caminho','body','Drawdown é a queda do seu capital a partir do pico até o fundo antes de uma nova recuperação. Ele mede o quanto sua conta sofreu em uma sequência ruim. Entender e limitar o drawdown máximo ajuda a manter a calma e a evitar decisões desesperadas, pois até as melhores estratégias passam por períodos negativos.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Drawdown é:','options',jsonb_build_array('O lucro acumulado de um mês','A queda do capital do pico até o fundo','O total de operações vencedoras','O valor do spread médio'),'correctIndex',1,'explanation','Drawdown mede a maior retração do capital. Controlar o drawdown é essencial porque quanto maior a queda, maior o esforço para recuperar o que foi perdido.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Não mover o stop', 10, 6) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Disciplina sob pressão','body','Mover o stop loss para longe na esperança de que o preço volte é um dos erros mais comuns e perigosos. Ao fazer isso, você transforma uma perda planejada e pequena em uma perda grande e descontrolada. O stop deve ser respeitado: se foi atingido, o cenário que você imaginou não se confirmou.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Afastar o stop loss quando o preço se aproxima dele é uma boa forma de evitar perdas.','answer',false,'explanation','Mover o stop para longe só aumenta a perda potencial e quebra o plano. O correto é respeitar o stop original, aceitando a perda pequena e planejada.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Gestão emocional do risco', 15, 7) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Sua mente é parte do risco','body','Medo e ganância levam a decisões ruins: entrar sem sinal, sair cedo demais ou arriscar alto para recuperar perdas. A gestão emocional consiste em seguir o plano independentemente do resultado da operação anterior. Ferramentas como stop fixo, risco padronizado e pausas após perdas ajudam a manter a mente sob controle.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Qual atitude reflete boa gestão emocional do risco?','options',jsonb_build_array('Dobrar o lote para recuperar uma perda rápido','Seguir o plano e o risco padrão mesmo após uma perda','Remover o stop quando a operação vai mal','Operar sem plano para aproveitar oportunidades'),'correctIndex',1,'explanation','Manter o mesmo risco e o mesmo plano após perdas evita o ciclo destrutivo da revanche. A consistência emocional protege a conta tanto quanto a técnica.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Diversificação', 20, 8) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Não colocar tudo em um lugar só','body','Diversificar significa não concentrar todo o risco em um único ativo ou direção. Operar vários ativos correlacionados ao mesmo tempo, porém, pode na verdade multiplicar o risco em vez de reduzi-lo. A diversificação inteligente busca exposições que não se movem todas juntas, suavizando o resultado da conta.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Abrir várias posições em ativos altamente correlacionados conta como diversificação segura.','answer',false,'explanation','Se os ativos se movem juntos, você está na prática multiplicando a mesma aposta. Diversificação real envolve exposições que reagem de formas diferentes ao mercado.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O erro de dobrar a aposta', 10, 9) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','A armadilha do martingale','body','Dobrar o tamanho da posição após uma perda para tentar recuperar tudo de uma vez é a estratégia conhecida como martingale. Ela pode funcionar algumas vezes, mas uma sequência ruim destrói a conta inteira, pois o risco cresce exponencialmente. Trading consistente se constrói com risco controlado e constante, não com apostas cada vez maiores.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Por que dobrar a posição após cada perda é perigoso?','options',jsonb_build_array('Porque reduz o spread','Porque o risco cresce exponencialmente e uma sequência ruim quebra a conta','Porque garante recuperação certa','Porque diminui a alavancagem'),'correctIndex',1,'explanation','No martingale, basta uma sequência de perdas mais longa que o esperado para liquidar a conta. O risco aumenta rápido demais para ser sustentável.'), 1);

  -- ============ Indicadores (10 aulas) ============
  v_sub := 'Unidade';
  SELECT subtitle, order_index, image_url, icon_theme INTO v_sub, v_order, v_img, v_theme
  FROM public.trilha_units WHERE track_id = v_track AND title = 'Indicadores';
  DELETE FROM public.trilha_units WHERE track_id = v_track AND title = 'Indicadores';
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index, image_url, icon_theme)
  VALUES (v_track, 'Indicadores', COALESCE(v_sub, 'Unidade'), COALESCE(v_order, 999), v_img, COALESCE(v_theme, 'default'))
  RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O que é um indicador', 10, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Ferramentas de leitura do gráfico','body','Um indicador é um cálculo matemático aplicado sobre preço ou volume, geralmente exibido no gráfico, que ajuda a interpretar o mercado. Ele não prediz o futuro, apenas organiza informações do passado de forma visual. Indicadores são apoio para a decisão, nunca uma bola de cristal, e funcionam melhor combinados à leitura de preço.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Um indicador garante a direção futura do preço com certeza.','answer',false,'explanation','Indicadores são baseados em dados passados e apenas ajudam a interpretar o cenário. Eles aumentam a probabilidade de boas decisões, mas nunca oferecem certeza.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Médias móveis', 15, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Suavizando o preço','body','A média móvel calcula o preço médio de um ativo ao longo de um número de períodos, suavizando o ruído e mostrando a tendência. Uma média de 20 períodos reage rápido; uma de 200 mostra a tendência de longo prazo. O cruzamento entre uma média rápida e uma lenta é um sinal clássico de mudança de direção.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O que uma média móvel de 200 períodos costuma mostrar?','options',jsonb_build_array('O ruído de curtíssimo prazo','A tendência de longo prazo','O valor exato do próximo candle','O spread do ativo'),'correctIndex',1,'explanation','Médias longas, como a de 200, filtram o ruído e revelam a direção dominante de longo prazo. Médias curtas reagem mais rápido, mas geram mais sinais falsos.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'RSI', 20, 2) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Força e exaustão','body','O RSI (Índice de Força Relativa) é um oscilador que varia de 0 a 100 e mede a velocidade e a magnitude dos movimentos. Acima de 70 indica condição sobrecomprada e abaixo de 30 sobrevendida. Em tendências fortes, porém, o RSI pode permanecer em extremos por muito tempo, então ele funciona melhor com confirmação.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','No RSI, um valor acima de 70 normalmente sugere:','options',jsonb_build_array('Condição sobrevendida','Condição sobrecomprada','Ausência de tendência','Spread elevado'),'correctIndex',1,'explanation','RSI acima de 70 indica sobrecompra, ou seja, o ativo subiu rápido e pode estar esticado. Mas em tendências fortes ele pode ficar lá por bastante tempo, exigindo cautela.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'MACD', 10, 3) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Momento e cruzamentos','body','O MACD mede a relação entre duas médias móveis e mostra a força do momento através de uma linha, uma linha de sinal e um histograma. Quando a linha MACD cruza a de sinal para cima, sugere força compradora; para baixo, força vendedora. O histograma ajuda a visualizar se o momento está acelerando ou perdendo força.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','No MACD, o cruzamento da linha principal acima da linha de sinal sugere momento comprador.','answer',true,'explanation','Esse cruzamento para cima indica que o momento de alta está ganhando força. O histograma reforça a leitura mostrando se o impulso aumenta ou diminui.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Estocástico', 15, 4) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Posição dentro do range','body','O oscilador estocástico mede onde o preço de fechamento está em relação à faixa de máximas e mínimas de um período. Varia de 0 a 100, com leituras acima de 80 indicando sobrecompra e abaixo de 20 sobrevenda. É especialmente útil em mercados laterais, onde o preço oscila dentro de uma faixa.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Em qual cenário o estocástico tende a ser mais útil?','options',jsonb_build_array('Tendências muito fortes e prolongadas','Mercados laterais que oscilam em uma faixa','Aberturas com gap','Períodos de baixa liquidez'),'correctIndex',1,'explanation','O estocástico brilha em mercados laterais, identificando topos e fundos da faixa. Em tendências fortes ele tende a dar sinais prematuros de reversão.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'ADX', 20, 5) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Medindo a força da tendência','body','O ADX mede a força de uma tendência, sem indicar sua direção. Valores acima de 25 costumam sinalizar tendência firme, enquanto valores baixos indicam mercado lateral e sem direção clara. Ele é ótimo para decidir se vale a pena usar estratégias de tendência ou de range naquele momento.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','O ADX indica a direção da tendência, dizendo se o mercado vai subir ou cair.','answer',false,'explanation','O ADX mede apenas a força da tendência, não a direção. Um ADX alto significa tendência forte, seja de alta ou de baixa; para a direção você usa outras ferramentas.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Bandas (introdução)', 10, 6) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Volatilidade em torno do preço','body','As Bandas de Bollinger são formadas por uma média móvel central e duas bandas que se afastam conforme a volatilidade aumenta. Quando as bandas se estreitam, costuma haver baixa volatilidade e possível movimento forte a caminho; quando se alargam, a volatilidade está alta. O preço tocando a banda externa não é, por si só, um sinal de reversão.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O que o estreitamento das Bandas de Bollinger costuma indicar?','options',jsonb_build_array('Tendência já confirmada','Baixa volatilidade e possível movimento forte a caminho','Sobrecompra imediata','Aumento do spread'),'correctIndex',1,'explanation','Bandas estreitas refletem baixa volatilidade e frequentemente antecedem um movimento mais forte, conhecido como compressão. O estouro pode vir para qualquer lado.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Volume', 15, 7) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','A força por trás do movimento','body','O volume mostra quanta negociação houve em um período e ajuda a confirmar a força de um movimento. Uma alta acompanhada de volume crescente tem mais credibilidade do que uma alta com volume fraco. No forex, usa-se geralmente o volume de ticks, já que não existe um volume central como no mercado de ações.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Um movimento de preço acompanhado de volume forte tende a ser mais confiável.','answer',true,'explanation','Volume forte indica participação real de muitos traders, dando mais credibilidade ao movimento. Movimentos com volume fraco costumam ser menos sustentáveis.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Tendência x osciladores', 20, 8) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Cada ferramenta no seu lugar','body','Indicadores de tendência, como médias móveis e ADX, funcionam melhor em mercados que andam em uma direção. Osciladores, como RSI e estocástico, brilham em mercados laterais, medindo exaustão. Usar a ferramenta certa para o contexto certo evita sinais falsos, como buscar reversão com oscilador no meio de uma tendência forte.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Em um mercado lateral, qual tipo de indicador costuma ser mais útil?','options',jsonb_build_array('Indicadores de tendência como médias móveis','Osciladores como RSI e estocástico','Apenas o volume','Nenhum indicador funciona em lateral'),'correctIndex',1,'explanation','Em mercados laterais, osciladores ajudam a identificar topos e fundos da faixa. Já indicadores de tendência se saem melhor quando o preço anda de forma direcional.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O perigo do excesso', 10, 9) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Menos pode ser mais','body','Encher o gráfico de indicadores cria paralisia por análise e sinais contraditórios que confundem em vez de ajudar. Muitos indicadores derivam do mesmo dado de preço, então se repetem sem trazer informação nova. Um conjunto pequeno e bem entendido, combinado à leitura de preço, costuma render decisões mais claras e consistentes.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Usar muitos indicadores ao mesmo tempo sempre melhora a qualidade das decisões.','answer',false,'explanation','Excesso de indicadores gera sinais contraditórios e confusão. Como muitos derivam do mesmo preço, eles se repetem; poucos e bem compreendidos costumam ser mais eficazes.'), 1);

  -- ============ Timeframes (10 aulas) ============
  v_sub := 'Unidade';
  SELECT subtitle, order_index, image_url, icon_theme INTO v_sub, v_order, v_img, v_theme
  FROM public.trilha_units WHERE track_id = v_track AND title = 'Timeframes';
  DELETE FROM public.trilha_units WHERE track_id = v_track AND title = 'Timeframes';
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index, image_url, icon_theme)
  VALUES (v_track, 'Timeframes', COALESCE(v_sub, 'Unidade'), COALESCE(v_order, 999), v_img, COALESCE(v_theme, 'default'))
  RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O que é timeframe', 10, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','A janela de tempo do gráfico','body','Timeframe é o intervalo de tempo que cada candle ou barra representa no gráfico. Em um gráfico de M5, cada candle resume 5 minutos de negociação; em um diário, cada candle é um dia inteiro. A escolha do timeframe muda completamente a leitura do mercado e o estilo de operação.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Em um gráfico de timeframe M15, cada candle representa:','options',jsonb_build_array('15 segundos','15 minutos','15 horas','15 dias'),'correctIndex',1,'explanation','No M15, cada candle resume 15 minutos de negociação. O timeframe define a granularidade da informação que você vê no gráfico.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'M1, M5 e M15', 15, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O curto prazo','body','Os timeframes de minutos, como M1, M5 e M15, mostram o mercado em detalhe e são usados por quem opera rápido. Eles oferecem muitas oportunidades, mas também muito ruído e sinais falsos. Exigem decisão rápida, foco intenso e custos de operação sob controle, já que se opera com frequência.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Timeframes muito curtos como M1 tendem a gerar mais ruído e sinais falsos.','answer',true,'explanation','Quanto menor o timeframe, mais o preço oscila por micro-movimentos sem significado. Isso aumenta o ruído e exige mais disciplina e velocidade do trader.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'H1 e H4', 20, 2) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O meio-termo','body','Os gráficos de 1 hora (H1) e 4 horas (H4) equilibram detalhe e clareza, filtrando parte do ruído dos timeframes menores. Eles são muito usados por day traders e swing traders para identificar tendências intradiárias e estruturas mais confiáveis. Cada candle carrega mais informação, então os sinais tendem a ser mais sólidos.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Em comparação ao M1, os gráficos H1 e H4 oferecem:','options',jsonb_build_array('Mais ruído e sinais menos confiáveis','Menos ruído e sinais geralmente mais sólidos','Exatamente a mesma leitura','Nenhuma utilidade para day traders'),'correctIndex',1,'explanation','Timeframes maiores filtram o ruído e produzem sinais mais consistentes. Por isso H1 e H4 são populares para enxergar a estrutura do mercado com mais clareza.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Diário e semanal', 10, 3) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','A visão do longo prazo','body','Os gráficos diário e semanal mostram a tendência principal e os níveis mais importantes de suporte e resistência. Movimentos nesses timeframes têm grande peso e são acompanhados por grandes players. Mesmo quem opera no curto prazo se beneficia de consultar o diário para entender a direção geral do mercado.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Os gráficos diário e semanal são úteis para identificar a tendência principal do mercado.','answer',true,'explanation','Timeframes maiores revelam a direção dominante e os níveis mais relevantes. Eles dão o contexto que orienta decisões feitas em timeframes menores.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Ruído x sinal', 15, 4) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Separar o relevante','body','Ruído são os movimentos pequenos e aleatórios do preço que não significam nada; sinal é o movimento com informação real sobre a direção. Timeframes menores têm mais ruído em relação ao sinal, enquanto os maiores filtram boa parte dele. Aprender a distinguir os dois evita entradas precipitadas em reações a oscilações sem importância.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O que caracteriza o ruído em um gráfico?','options',jsonb_build_array('Movimentos pequenos e aleatórios sem informação real','A tendência principal de longo prazo','Os níveis de suporte semanais','O volume institucional'),'correctIndex',0,'explanation','Ruído são oscilações aleatórias sem significado direcional. Distinguir ruído de sinal evita reagir a cada pequeno movimento e melhora a qualidade das entradas.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Scalp, day, swing e position', 20, 5) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Estilos de operar','body','O estilo de trading se liga ao timeframe: o scalper busca lucros mínimos em segundos a minutos; o day trader abre e fecha no mesmo dia; o swing trader segura por dias; e o position trader por semanas ou meses. Cada estilo exige um tempo de tela, uma paciência e um perfil emocional diferentes.'), 0),
  (v_lesson, 'order', jsonb_build_object('prompt','Ordene os estilos de trading do mais rápido ao mais lento em tempo de posição','items',jsonb_build_array('Scalping','Day trade','Swing trade','Position trade')), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Análise multi-timeframe', 10, 6) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Olhar o mercado em camadas','body','A análise multi-timeframe usa vários timeframes juntos: um maior para definir a tendência e o contexto, e um menor para encontrar o ponto de entrada. Por exemplo, você confirma a tendência de alta no H4 e busca a entrada no M15. Isso alinha sua operação com a força dominante do mercado.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Na análise multi-timeframe, o timeframe maior costuma definir a tendência e o menor o ponto de entrada.','answer',true,'explanation','O timeframe maior dá o contexto e a direção, enquanto o menor refina o momento da entrada. Combinar os dois alinha a operação com a força dominante.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Escolher o timeframe certo', 15, 7) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Adequar ao seu perfil','body','Não existe timeframe perfeito: existe o que combina com sua rotina, sua paciência e seu capital. Quem tem pouco tempo de tela tende a se dar melhor em timeframes maiores; quem gosta de ação rápida pode preferir os menores. O importante é escolher um estilo e dominar bem, em vez de pular de um para outro a cada perda.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Qual é o melhor critério para escolher um timeframe?','options',jsonb_build_array('O que dá mais sinais por dia','O que combina com sua rotina, paciência e perfil','Sempre o menor possível','O que os outros traders usam'),'correctIndex',1,'explanation','O timeframe ideal depende do seu perfil e da sua disponibilidade. O que importa é dominar um estilo com consistência, não trocar a cada resultado ruim.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Confluência de tempos', 20, 8) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Quando os tempos concordam','body','Confluência de timeframes acontece quando vários gráficos apontam para a mesma direção ou para o mesmo nível importante. Um sinal de compra no M15 ganha muito mais força se o H1 e o H4 também estiverem em alta. Quanto mais timeframes concordam, maior a probabilidade e a qualidade da operação.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Um sinal ganha mais força quando vários timeframes apontam na mesma direção.','answer',true,'explanation','A concordância entre timeframes, chamada de confluência, aumenta a probabilidade do trade. Quando os tempos discordam, o sinal é mais frágil e exige cautela.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Paciência conforme o timeframe', 10, 9) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Cada tempo, um ritmo','body','Timeframes maiores exigem mais paciência: um trade pode levar dias para se desenvolver, e checar o gráfico a cada minuto só gera ansiedade. Já timeframes menores cobram presença constante e decisões rápidas. Ajustar sua paciência e suas expectativas ao timeframe escolhido é essencial para operar com tranquilidade e consistência.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Operar em timeframes maiores geralmente exige:','options',jsonb_build_array('Decisões a cada segundo','Mais paciência, pois os trades levam mais tempo','Ignorar a tendência principal','Checar o gráfico constantemente'),'correctIndex',1,'explanation','Em timeframes maiores os movimentos demoram mais a se formar, exigindo paciência. Acompanhar de minuto em minuto só gera ansiedade e decisões precipitadas.'), 1);

  -- ============ Lendo as Velas (10 aulas) ============
  v_sub := 'Unidade';
  SELECT subtitle, order_index, image_url, icon_theme INTO v_sub, v_order, v_img, v_theme
  FROM public.trilha_units WHERE track_id = v_track AND title = 'Lendo as Velas';
  DELETE FROM public.trilha_units WHERE track_id = v_track AND title = 'Lendo as Velas';
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index, image_url, icon_theme)
  VALUES (v_track, 'Lendo as Velas', COALESCE(v_sub, 'Unidade'), COALESCE(v_order, 999), v_img, COALESCE(v_theme, 'default'))
  RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Corpo e pavio', 10, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Anatomia da vela','body','Cada candle mostra abertura, fechamento, maxima e minima de um periodo. O corpo e a distancia entre abertura e fechamento, e os pavios (sombras) sao os extremos atingidos. Um corpo grande indica forca da pressao compradora ou vendedora, enquanto pavios longos revelam rejeicao de preco. Por exemplo, um pavio inferior longo mostra que vendedores empurraram o preco para baixo, mas compradores reagiram e devolveram o movimento.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O que o corpo de um candle representa?','options',jsonb_build_array('A diferenca entre maxima e minima do periodo','A diferenca entre abertura e fechamento do periodo','Apenas o preco de fechamento','O volume negociado no periodo'),'correctIndex',1,'explanation','O corpo mede a distancia entre abertura e fechamento. Os pavios e que marcam a maxima e a minima atingidas.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O Doji', 15, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Indecisao no mercado','body','O doji aparece quando a abertura e o fechamento ficam praticamente no mesmo nivel, formando um corpo minimo ou inexistente. Ele sinaliza equilibrio entre compradores e vendedores, ou seja, indecisao. Um doji apos uma tendencia forte costuma alertar para possivel exaustao e reversao, mas sozinho ele nao confirma nada e precisa do candle seguinte.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Um doji possui um corpo muito grande e pavios curtos.','answer',false,'explanation','Falso. O doji tem corpo minimo ou inexistente, pois abertura e fechamento ficam quase no mesmo preco, indicando indecisao.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O Martelo', 20, 2) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Rejeicao de fundo','body','O martelo tem corpo pequeno na parte superior e um pavio inferior longo, pelo menos duas vezes o tamanho do corpo. Ele surge apos uma queda e mostra que os vendedores tentaram derrubar o preco, mas os compradores reagiram com forca ate o fechamento. E um sinal de possivel reversao de alta, especialmente quando aparece em um suporte importante.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Onde o martelo costuma ter maior relevancia como sinal de reversao?','options',jsonb_build_array('No meio de um movimento lateral sem direcao','Apos uma queda, proximo a um suporte','No topo de uma forte alta','Em qualquer ponto, independente do contexto'),'correctIndex',1,'explanation','O martelo ganha forca apos uma queda e perto de um suporte, pois indica que os compradores defenderam a regiao.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Estrela cadente', 10, 3) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Rejeicao de topo','body','A estrela cadente e o oposto do martelo: corpo pequeno na parte inferior e pavio superior longo. Ela aparece apos uma alta e revela que os compradores empurraram o preco para cima, mas foram rejeitados pelos vendedores ate o fechamento. E um alerta de possivel reversao de baixa, principalmente quando se forma em uma resistencia.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','A estrela cadente tem um pavio superior longo e sinaliza possivel reversao de baixa em topos.','answer',true,'explanation','Verdadeiro. O pavio superior longo mostra rejeicao dos compradores, alertando para reversao de baixa apos uma alta.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Engolfo', 15, 4) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Inversao de forca','body','O padrao de engolfo e formado por dois candles: o segundo tem corpo que cobre completamente o corpo do anterior. No engolfo de alta, um candle de baixa e seguido por um candle de alta maior; no engolfo de baixa ocorre o contrario. Ele indica uma virada clara de dominancia entre compradores e vendedores e tende a ser mais confiavel que padroes de um unico candle.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O que caracteriza um engolfo de alta?','options',jsonb_build_array('Dois candles de baixa consecutivos','Um candle de alta seguido por um candle de baixa maior','Um candle de baixa seguido por um candle de alta que cobre todo o corpo anterior','Um doji seguido de outro doji'),'correctIndex',2,'explanation','No engolfo de alta, o candle de alta envolve totalmente o corpo do candle de baixa anterior, indicando virada compradora.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Marubozu', 20, 5) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Forca pura','body','O marubozu e um candle de corpo cheio, praticamente sem pavios. Isso significa que o preco abriu em um extremo e fechou no outro, sem rejeicao relevante. Um marubozu de alta mostra dominancia total dos compradores no periodo, enquanto o de baixa revela vendedores no controle. Ele costuma indicar continuidade do movimento na direcao do corpo.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','O marubozu tem pavios longos dos dois lados, indicando indecisao.','answer',false,'explanation','Falso. O marubozu quase nao tem pavios; e um corpo cheio que mostra forca e dominancia de um dos lados.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Harami', 10, 6) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Perda de momento','body','O harami e composto por um candle grande seguido de um candle pequeno contido dentro do corpo do anterior. A palavra significa gravida em japones, fazendo alusao ao candle pequeno dentro do grande. Esse padrao sinaliza perda de forca da tendencia atual e possivel reversao, embora seja mais fraco que o engolfo e precise de confirmacao.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O que o padrao harami sugere?','options',jsonb_build_array('Aceleracao forte da tendencia atual','Perda de momento e possivel reversao','Aumento garantido do volume','Continuidade certa do movimento'),'correctIndex',1,'explanation','O candle pequeno dentro do anterior mostra que a tendencia perdeu forca, sinalizando possivel reversao que precisa de confirmacao.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Estrela da manha e da noite', 15, 7) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Reversao em tres velas','body','A estrela da manha e um padrao de reversao de alta com tres candles: um de baixa forte, um candle pequeno de indecisao e um candle de alta que avanca sobre o primeiro. A estrela da noite e o inverso e sinaliza reversao de baixa em topos. Por usarem tres velas, esses padroes tendem a ser mais confiaveis que sinais isolados.'), 0),
  (v_lesson, 'order', jsonb_build_object('prompt','Ordene a formacao de uma estrela da manha (reversao de alta):','items',jsonb_build_array('Candle de baixa forte continuando a queda','Candle pequeno de indecisao no fundo','Candle de alta que avanca sobre o primeiro')), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Pinbar', 20, 8) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','A vela de rejeicao','body','O pinbar tem corpo pequeno e um pavio longo que se destaca para um dos lados, mostrando forte rejeicao de preco naquela regiao. Quando o pavio aponta para baixo, indica rejeicao de fundo e vies de alta; quando aponta para cima, indica rejeicao de topo e vies de baixa. O pinbar e muito usado em confluencia com suportes, resistencias e niveis de Fibonacci.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Um pinbar com pavio longo para cima indica rejeicao de topo e vies de baixa.','answer',true,'explanation','Verdadeiro. O pavio superior longo mostra que o preco foi rejeitado no alto, sinalizando pressao vendedora.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Confirmando padroes', 10, 9) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Nao opere sozinho','body','Um padrao de candle isolado raramente e suficiente para uma boa decisao. A confirmacao vem de fatores como o contexto da tendencia, a presenca de suporte ou resistencia, o volume e o comportamento do candle seguinte. Por exemplo, um martelo em um suporte importante, seguido de um candle de alta, oferece um sinal muito mais robusto do que o martelo sozinho.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Qual e a melhor forma de aumentar a confiabilidade de um padrao de candle?','options',jsonb_build_array('Operar imediatamente, sem esperar mais nada','Buscar confluencia com contexto, suporte e resistencia e confirmacao do candle seguinte','Ignorar a tendencia geral do ativo','Usar apenas o tempo grafico de 1 minuto'),'correctIndex',1,'explanation','Padroes ganham forca com confluencia: tendencia, niveis de S/R, volume e a confirmacao do candle seguinte reduzem sinais falsos.'), 1);

  -- ============ Médias Móveis (10 aulas) ============
  v_sub := 'Unidade';
  SELECT subtitle, order_index, image_url, icon_theme INTO v_sub, v_order, v_img, v_theme
  FROM public.trilha_units WHERE track_id = v_track AND title = 'Médias Móveis';
  DELETE FROM public.trilha_units WHERE track_id = v_track AND title = 'Médias Móveis';
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index, image_url, icon_theme)
  VALUES (v_track, 'Médias Móveis', COALESCE(v_sub, 'Unidade'), COALESCE(v_order, 999), v_img, COALESCE(v_theme, 'default'))
  RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O que e media movel', 10, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Suavizando o preco','body','A media movel calcula o preco medio de um ativo ao longo de um numero definido de periodos, atualizando-se a cada novo candle. Ela suaviza o ruido das oscilacoes e ajuda a visualizar a direcao predominante do mercado. Por ser baseada em precos passados, e um indicador atrasado, ou seja, reage depois que o movimento ja comecou.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','A media movel e um indicador antecipado que preve o preco antes de ele acontecer.','answer',false,'explanation','Falso. A media movel e um indicador atrasado, calculado sobre precos passados, portanto reage depois do movimento.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'SMA x EMA', 15, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Duas formas de calcular','body','A media simples (SMA) da o mesmo peso a todos os periodos do calculo, resultando em uma linha mais suave e lenta. A media exponencial (EMA) da mais peso aos precos recentes, reagindo mais rapido as mudancas de preco. Traders de curto prazo costumam preferir a EMA pela agilidade, enquanto a SMA e util para visualizar tendencias mais amplas e estaveis.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Qual a principal diferenca entre a EMA e a SMA?','options',jsonb_build_array('A EMA usa apenas o preco de fechamento e a SMA usa a maxima','A EMA da mais peso aos precos recentes, reagindo mais rapido','A SMA so funciona em grafico diario','Nao existe diferenca pratica entre elas'),'correctIndex',1,'explanation','A EMA pondera mais os precos recentes, sendo mais rapida; a SMA trata todos os periodos igualmente e e mais suave.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Periodos comuns', 20, 2) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','9, 21, 50 e 200','body','Os periodos definem quantos candles entram no calculo da media. As medias de 9 e 21 periodos sao usadas para leitura de curto prazo, a de 50 para tendencia intermediaria e a de 200 para tendencia de longo prazo. Muitos traders observam a media de 200 como divisor entre mercado de alta e de baixa: preco acima dela costuma indicar vies comprador.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','A media de 200 periodos e amplamente usada como referencia de tendencia de longo prazo.','answer',true,'explanation','Verdadeiro. A media de 200 e uma referencia classica de longo prazo; preco acima dela costuma indicar vies de alta.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Inclinacao como tendencia', 10, 3) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','A direcao da linha','body','A inclinacao da media movel revela a direcao da tendencia de forma simples. Uma media apontando para cima indica tendencia de alta, apontando para baixo indica tendencia de baixa e quase horizontal sugere mercado lateral. Observar a inclinacao evita operar contra a corrente, pois mostra de forma visual para onde o preco esta caminhando.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O que uma media movel praticamente horizontal costuma indicar?','options',jsonb_build_array('Tendencia de alta forte','Tendencia de baixa forte','Mercado lateral ou sem direcao definida','Rompimento iminente garantido'),'correctIndex',2,'explanation','Uma media horizontal indica ausencia de tendencia clara, ou seja, mercado lateral, onde sinais de media falham mais.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Preco vs media', 15, 4) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Acima ou abaixo','body','A posicao do preco em relacao a media e uma leitura rapida de forca. Quando o preco esta consistentemente acima da media, os compradores dominam; quando esta abaixo, os vendedores controlam. Um afastamento muito grande do preco em relacao a media costuma sinalizar exagero e a possibilidade de um retorno em direcao a media.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Preco consistentemente abaixo de uma media movel costuma indicar dominancia vendedora.','answer',true,'explanation','Verdadeiro. Preco abaixo da media mostra que os vendedores estao no controle naquele horizonte de tempo.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Cruzamento de medias', 20, 5) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Golden e death cross','body','O cruzamento ocorre quando uma media mais rapida atravessa uma mais lenta. O golden cross acontece quando a media curta cruza a longa para cima, sinalizando possivel inicio de tendencia de alta. O death cross e o oposto, com a media curta cruzando a longa para baixo, sugerindo tendencia de baixa. O exemplo classico usa as medias de 50 e 200 periodos.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O que e um golden cross?','options',jsonb_build_array('Quando a media longa cruza a curta para baixo','Quando a media curta cruza a media longa para cima','Quando o preco toca a media de 9 periodos','Quando duas medias ficam paralelas'),'correctIndex',1,'explanation','No golden cross a media curta cruza a longa para cima (ex: 50 cruzando a 200), sinalizando possivel tendencia de alta.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Suporte e resistencia dinamicos', 10, 6) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','A media que segura o preco','body','Em tendencias fortes, a media movel funciona como suporte ou resistencia que se move junto com o preco. Em alta, o preco recua, toca a media e volta a subir, usando-a como suporte dinamico. Em baixa, a media age como resistencia dinamica, rejeitando o preco a cada repique. Medias como a de 21 e a de 50 sao muito observadas para esse comportamento.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Em uma tendencia de alta, a media movel pode atuar como suporte dinamico onde o preco recua e volta a subir.','answer',true,'explanation','Verdadeiro. Em tendencias, a media acompanha o preco e funciona como suporte (alta) ou resistencia (baixa) dinamicos.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Fanning', 15, 7) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Medias se abrindo','body','Fanning, ou abertura em leque, ocorre quando varias medias de periodos diferentes se afastam umas das outras e ficam alinhadas na mesma direcao. Esse alinhamento indica uma tendencia forte e saudavel. Quando as medias comecam a se aproximar e se entrelacar, e sinal de que a tendencia esta perdendo forca ou entrando em lateralizacao.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O que o fanning (medias abrindo em leque e alinhadas) costuma indicar?','options',jsonb_build_array('Mercado lateral sem direcao','Tendencia forte e saudavel na direcao do alinhamento','Reversao imediata garantida','Erro no calculo das medias'),'correctIndex',1,'explanation','Medias alinhadas e abrindo em leque mostram forca e saude da tendencia na direcao em que estao ordenadas.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Cuidado em range', 20, 8) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O perigo do lateral','body','Medias moveis funcionam bem em tendencias, mas falham em mercados laterais. Em range, o preco cruza a media para cima e para baixo repetidamente, gerando muitos sinais falsos e cruzamentos sem continuidade. Por isso, antes de confiar em sinais de media, e essencial identificar se o mercado esta em tendencia ou apenas oscilando de lado.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Medias moveis geram sinais muito confiaveis em mercados laterais.','answer',false,'explanation','Falso. Em mercados laterais as medias produzem muitos sinais falsos; elas funcionam melhor em tendencias.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Combinando medias', 10, 9) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Curta, media e longa juntas','body','Usar medias de periodos diferentes em conjunto oferece uma leitura mais completa. A media longa define a tendencia principal, a intermediaria mostra o pulso do movimento e a curta sinaliza entradas e saidas mais rapidas. Uma estrategia comum e operar apenas a favor da media longa, usando o toque na media curta como gatilho de entrada.'), 0),
  (v_lesson, 'order', jsonb_build_object('prompt','Ordene as medias da que define a tendencia principal para a mais sensivel a entradas:','items',jsonb_build_array('Media longa (ex: 200) define a tendencia principal','Media intermediaria (ex: 50) mostra o pulso do movimento','Media curta (ex: 9) sinaliza entradas e saidas rapidas')), 1);

  -- ============ Trend Lines (10 aulas) ============
  v_sub := 'Unidade';
  SELECT subtitle, order_index, image_url, icon_theme INTO v_sub, v_order, v_img, v_theme
  FROM public.trilha_units WHERE track_id = v_track AND title = 'Trend Lines';
  DELETE FROM public.trilha_units WHERE track_id = v_track AND title = 'Trend Lines';
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index, image_url, icon_theme)
  VALUES (v_track, 'Trend Lines', COALESCE(v_sub, 'Unidade'), COALESCE(v_order, 999), v_img, COALESCE(v_theme, 'default'))
  RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O que e linha de tendencia', 10, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Conectando o movimento','body','A linha de tendencia e uma reta tracada no grafico que conecta pontos de preco e revela a direcao predominante do mercado. Ela ajuda a visualizar a tendencia e a identificar regioes onde o preco tende a reagir. Uma boa linha de tendencia respeita varios toques e serve de referencia para entradas, saidas e gestao de risco.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Uma linha de tendencia serve para visualizar a direcao do mercado e identificar regioes de reacao do preco.','answer',true,'explanation','Verdadeiro. A linha conecta pontos relevantes e mostra a direcao da tendencia, alem de regioes onde o preco costuma reagir.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Ligando fundos na alta', 15, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','A linha de suporte ascendente','body','Em uma tendencia de alta, a linha de tendencia e tracada conectando os fundos ascendentes, ou seja, os pontos mais baixos cada vez mais altos. Essa linha funciona como suporte que sobe junto com o preco. Enquanto o preco respeitar essa linha e formar fundos cada vez mais altos, a tendencia de alta permanece valida.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Em uma tendencia de alta, a linha de tendencia conecta quais pontos?','options',jsonb_build_array('Os topos descendentes','Os fundos ascendentes (fundos cada vez mais altos)','As aberturas dos candles','Os pontos medios de cada vela'),'correctIndex',1,'explanation','Na alta, ligamos os fundos ascendentes, formando uma linha de suporte que sobe junto com o preco.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Ligando topos na baixa', 20, 2) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','A linha de resistencia descendente','body','Em uma tendencia de baixa, a linha de tendencia conecta os topos descendentes, ou seja, os topos cada vez mais baixos. Essa linha atua como resistencia que desce junto com o preco. Enquanto o preco respeitar essa linha e formar topos mais baixos, a tendencia de baixa segue em vigor e operacoes de venda sao favorecidas.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Em uma tendencia de baixa, a linha de tendencia conecta os topos descendentes e atua como resistencia.','answer',true,'explanation','Verdadeiro. Na baixa ligamos os topos cada vez mais baixos, formando uma resistencia que desce com o preco.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Validacao por toques', 10, 3) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Quanto mais toques, melhor','body','Uma linha de tendencia ganha mais relevancia conforme o numero de vezes que o preco a toca e respeita. Sao necessarios pelo menos dois pontos para tracar a linha, mas o terceiro toque a confirma de verdade. Cada toque respeitado reforca a importancia daquela linha e aumenta a confianca de que o preco voltara a reagir nela.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Quantos toques sao normalmente necessarios para confirmar uma linha de tendencia?','options',jsonb_build_array('Um unico toque ja confirma','Dois pontos tracam e o terceiro toque confirma','E preciso ter exatamente dez toques','Toques nao tem relacao com a validade da linha'),'correctIndex',1,'explanation','Dois pontos permitem tracar a linha, mas o terceiro toque respeitado e que confirma sua validade.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Inclinacao saudavel x ingreme', 15, 4) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O angulo da inclinacao','body','A inclinacao da linha de tendencia revela a sustentabilidade do movimento. Uma inclinacao moderada, em torno de 45 graus, costuma indicar uma tendencia saudavel e sustentavel. Linhas muito ingremes mostram movimentos acelerados que raramente se mantem e tendem a ser rompidos rapidamente, frequentemente seguidos de correcao ou nova linha mais suave.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Uma linha de tendencia muito ingreme costuma indicar um movimento sustentavel e duradouro.','answer',false,'explanation','Falso. Linhas muito ingremes indicam movimentos acelerados e insustentaveis, que tendem a ser rompidos rapidamente.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Rompimento e reteste', 20, 5) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Quebra e confirmacao','body','Quando o preco rompe a linha de tendencia, pode sinalizar o fim ou a pausa daquela tendencia. Porem, muitos rompimentos sao falsos, por isso o reteste e importante: o preco volta para testar a linha rompida pelo lado oposto antes de seguir na nova direcao. Um rompimento com reteste bem-sucedido oferece uma entrada mais segura do que operar a quebra imediata.'), 0),
  (v_lesson, 'order', jsonb_build_object('prompt','Ordene as etapas de um rompimento com reteste de uma linha de tendencia:','items',jsonb_build_array('O preco respeita a linha de tendencia por varios toques','O preco rompe a linha de tendencia','O preco retorna e testa a linha rompida pelo lado oposto','O preco segue na nova direcao apos o reteste')), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Canal de tendencia', 10, 6) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Duas linhas paralelas','body','O canal de tendencia e formado por duas linhas paralelas: a linha de tendencia principal e uma linha paralela do lado oposto. O preco oscila dentro desse corredor, tocando o suporte e a resistencia do canal de forma ritmada. Canais ajudam a identificar regioes de compra na base e de venda no topo, dentro da tendencia vigente.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Um canal de tendencia e formado por duas linhas paralelas entre as quais o preco oscila.','answer',true,'explanation','Verdadeiro. O canal usa a linha de tendencia e uma paralela, criando um corredor onde o preco se move.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Linha de canal', 15, 7) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O outro lado do corredor','body','A linha de canal e a paralela tracada a partir da linha de tendencia principal, marcando o lado oposto do movimento. Em uma alta, a linha de canal fica acima e funciona como resistencia, indicando onde o preco pode encontrar venda. Ela ajuda a projetar alvos e a identificar exaustao quando o preco falha em alcancar a linha de canal.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Em uma tendencia de alta, onde fica a linha de canal e qual seu papel?','options',jsonb_build_array('Abaixo do preco, atuando como suporte','Acima do preco, atuando como resistencia e referencia de alvo','No meio do canal, sem funcao definida','Sempre na horizontal, ignorando a tendencia'),'correctIndex',1,'explanation','Na alta, a linha de canal fica acima e funciona como resistencia, servindo de referencia para alvos e exaustao.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Falsos rompimentos', 20, 8) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Armadilhas do mercado','body','Um falso rompimento ocorre quando o preco ultrapassa a linha de tendencia, atrai traders para a nova direcao e logo retorna para dentro, pegando muitos de surpresa. Esses movimentos costumam capturar stops e gerar liquidez. Para evitar cair em armadilhas, e prudente esperar o fechamento do candle alem da linha e buscar confirmacao por volume ou price action.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Esperar o fechamento do candle alem da linha ajuda a reduzir o risco de cair em falsos rompimentos.','answer',true,'explanation','Verdadeiro. Aguardar o fechamento e buscar confirmacao filtra muitos falsos rompimentos que apenas furam a linha e voltam.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Trend line em varios tempos', 10, 9) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Alinhando os graficos','body','Linhas de tendencia podem ser tracadas em diferentes tempos graficos, e a leitura ganha forca quando elas se alinham. Uma linha de tendencia de alta no grafico diario define o cenario maior, enquanto linhas no grafico de uma hora ajudam a afinar as entradas. Operar a favor da tendencia do tempo maior e usar o tempo menor para o gatilho aumenta a probabilidade de sucesso.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Qual e uma boa pratica ao usar linhas de tendencia em multiplos tempos graficos?','options',jsonb_build_array('Operar contra a tendencia do tempo maior','Ignorar o tempo maior e olhar so o de 1 minuto','Operar a favor da tendencia do tempo maior e usar o menor para o gatilho','Tracar linhas apenas em um unico tempo grafico'),'correctIndex',2,'explanation','O tempo maior define o contexto e o menor afina a entrada; operar a favor do tempo maior aumenta a probabilidade.'), 1);

  -- ============ Suportes e Resistências (10 aulas) ============
  v_sub := 'Unidade';
  SELECT subtitle, order_index, image_url, icon_theme INTO v_sub, v_order, v_img, v_theme
  FROM public.trilha_units WHERE track_id = v_track AND title = 'Suportes e Resistências';
  DELETE FROM public.trilha_units WHERE track_id = v_track AND title = 'Suportes e Resistências';
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index, image_url, icon_theme)
  VALUES (v_track, 'Suportes e Resistências', COALESCE(v_sub, 'Unidade'), COALESCE(v_order, 999), v_img, COALESCE(v_theme, 'default'))
  RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O que sao S/R', 10, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Pisos e tetos do preco','body','Suporte e uma regiao onde o preco tende a parar de cair e encontrar compradores, funcionando como um piso. Resistencia e o oposto, uma regiao onde o preco tende a parar de subir e encontrar vendedores, funcionando como um teto. Esses niveis surgem da memoria do mercado, pois muitos participantes lembram e reagem a precos onde houve reacoes importantes no passado.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O que e um suporte?','options',jsonb_build_array('Uma regiao onde o preco tende a parar de subir','Uma regiao onde o preco tende a parar de cair e encontrar compradores','O ponto exato de abertura do dia','Uma media movel de 200 periodos'),'correctIndex',1,'explanation','O suporte e o piso onde a queda tende a parar porque surgem compradores; a resistencia e o teto, o oposto.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Como tracar', 15, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Olhando o historico','body','Para tracar suportes e resistencias, observe regioes onde o preco reverteu ou parou varias vezes no passado. Voce conecta esses topos e fundos historicos, identificando precos que o mercado considera importantes. Quanto mais vezes uma regiao provocou reacao, mais relevante ela e. Comece pelos tempos graficos maiores para encontrar os niveis mais significativos.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Para tracar S/R, observamos regioes onde o preco reverteu ou parou varias vezes no passado.','answer',true,'explanation','Verdadeiro. Niveis vem da memoria do mercado: regioes de reacoes passadas tendem a provocar reacoes futuras.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Zonas, nao linhas exatas', 20, 2) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Pense em regioes','body','Suportes e resistencias funcionam melhor como zonas do que como linhas de preco exatas. O mercado raramente respeita o centavo exato de um nivel; ele costuma reagir dentro de uma faixa de precos. Tratar S/R como uma zona evita frustracao quando o preco fura levemente o nivel e ainda assim respeita a regiao, o que e completamente normal.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Suportes e resistencias devem ser tratados como linhas de preco exatas ao centavo.','answer',false,'explanation','Falso. S/R funcionam como zonas; o preco costuma reagir dentro de uma faixa, e nao em um valor exato.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Inversao de papeis', 10, 3) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Polaridade','body','A polaridade descreve o fenomeno em que um suporte rompido vira resistencia e uma resistencia rompida vira suporte. Quando o preco quebra um suporte e depois retorna, aquela mesma regiao tende a rejeitar o preco como resistencia. Essa inversao de papeis e uma das ideias mais poderosas da analise tecnica e cria pontos de entrada de alta probabilidade.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Segundo o conceito de polaridade, o que acontece com uma resistencia quando ela e rompida?','options',jsonb_build_array('Ela desaparece e perde qualquer importancia','Ela tende a virar um suporte','Ela continua sendo apenas resistencia para sempre','Ela vira uma media movel'),'correctIndex',1,'explanation','Pela polaridade, uma resistencia rompida tende a se tornar suporte, e um suporte rompido tende a virar resistencia.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Numero de toques', 15, 4) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Forca pela repeticao','body','Quanto mais vezes o preco testa e respeita um nivel de suporte ou resistencia, mais forte e relevante ele se torna. Cada toque respeitado confirma que muitos participantes reconhecem aquele preco como importante. Por outro lado, niveis muito testados tambem podem enfraquecer com o tempo, pois cada teste consome ordens, aumentando a chance de rompimento futuro.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Quanto mais vezes um nivel e respeitado, mais reconhecido e relevante ele tende a ser.','answer',true,'explanation','Verdadeiro. Toques respeitados confirmam a relevancia do nivel, ainda que testes excessivos possam enfraquece-lo com o tempo.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Niveis psicologicos', 20, 5) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Numeros redondos','body','Numeros redondos como 1.2000 no EURUSD ou 15000 pontos em um indice atuam como suportes e resistencias psicologicos. Muitos traders colocam ordens e stops nesses valores por simplicidade, o que concentra liquidez e gera reacoes. Por isso, vale observar com atencao como o preco se comporta ao se aproximar de niveis redondos, pois eles costumam provocar reacoes mesmo sem historico tecnico forte.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Por que numeros redondos costumam funcionar como suporte ou resistencia?','options',jsonb_build_array('Porque a corretora obriga reacoes nesses precos','Porque muitos traders concentram ordens e stops nesses valores, gerando liquidez','Porque sao sempre o ponto exato de abertura','Porque eliminam o ruido do grafico'),'correctIndex',1,'explanation','Numeros redondos concentram ordens e stops por simplicidade psicologica, criando liquidez e reacoes de preco.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Rompimento x respeito', 10, 6) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Duas formas de operar','body','Diante de um nivel, o preco pode respeita-lo, revertendo a direcao, ou rompe-lo, seguindo adiante. No respeito, o trader opera a reversao no nivel; no rompimento, opera a continuacao apos a quebra. A leitura do contexto, do momento e do volume ajuda a decidir qual cenario e mais provavel, evitando entradas precipitadas em ambos os casos.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Ao operar o respeito de um nivel, o trader aposta na reversao do preco naquela regiao.','answer',true,'explanation','Verdadeiro. No respeito, espera-se reversao no nivel; no rompimento, espera-se continuacao apos a quebra.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Pullback ao nivel', 15, 7) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Esperando o retorno','body','Apos um rompimento, o preco frequentemente retorna ao nivel rompido em um movimento chamado pullback, antes de seguir na nova direcao. Esse retorno testa a polaridade do nivel e oferece uma entrada com risco menor, pois o stop pode ficar logo atras da regiao. Operar o pullback e geralmente mais seguro do que perseguir o rompimento no impulso.'), 0),
  (v_lesson, 'order', jsonb_build_object('prompt','Ordene as etapas de uma entrada por pullback a um nivel rompido:','items',jsonb_build_array('O preco rompe o nivel de suporte ou resistencia','O preco retorna (pullback) para testar o nivel rompido','O nivel rejeita o preco confirmando a polaridade','O preco segue na direcao do rompimento')), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'S/R em timeframes maiores', 20, 8) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Os niveis que importam','body','Suportes e resistencias tracados em tempos graficos maiores, como diario e semanal, sao mais fortes e respeitados do que os de tempos curtos. Eles refletem decisoes de mais participantes e capturam zonas de grande importancia. Por isso, mesmo operando no curto prazo, e fundamental marcar os niveis dos graficos maiores para nao ser surpreendido por reacoes importantes.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Por que niveis de S/R em tempos graficos maiores sao mais relevantes?','options',jsonb_build_array('Porque sao mais faceis de desenhar','Porque refletem decisoes de mais participantes e zonas de maior importancia','Porque mudam a cada minuto','Porque ignoram a memoria do mercado'),'correctIndex',1,'explanation','Niveis de tempos maiores envolvem mais participantes e capturam zonas relevantes, sendo mais fortes e respeitados.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Operando os niveis', 10, 9) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Juntando tudo','body','Para operar suportes e resistencias com qualidade, combine o nivel com outras confirmacoes: um padrao de candle de reversao, confluencia com Fibonacci ou medias, e um bom contexto de tendencia. Defina o stop logo alem da zona e mire um alvo em proxima resistencia ou suporte. A disciplina de esperar a confirmacao no nivel evita entradas impulsivas e melhora a relacao risco-retorno.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Combinar um nivel de S/R com padroes de candle e confluencias melhora a qualidade das entradas.','answer',true,'explanation','Verdadeiro. A confluencia entre nivel, price action e outros fatores aumenta a probabilidade e melhora o risco-retorno.'), 1);

  -- ============ Fibonacci (10 aulas) ============
  v_sub := 'Unidade';
  SELECT subtitle, order_index, image_url, icon_theme INTO v_sub, v_order, v_img, v_theme
  FROM public.trilha_units WHERE track_id = v_track AND title = 'Fibonacci';
  DELETE FROM public.trilha_units WHERE track_id = v_track AND title = 'Fibonacci';
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index, image_url, icon_theme)
  VALUES (v_track, 'Fibonacci', COALESCE(v_sub, 'Unidade'), COALESCE(v_order, 999), v_img, COALESCE(v_theme, 'default'))
  RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'A sequencia e o 0.618', 10, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','A proporcao aurea','body','A sequencia de Fibonacci e formada somando os dois numeros anteriores: 1, 1, 2, 3, 5, 8, 13 e assim por diante. A divisao de um numero pelo seguinte tende a 0.618, a famosa proporcao aurea presente na natureza e nos mercados. No trading, essa proporcao gera os niveis de retracao usados para identificar onde o preco pode reagir.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Qual proporcao a sequencia de Fibonacci tende a gerar e e conhecida como proporcao aurea?','options',jsonb_build_array('0.500','0.618','0.236','1.000'),'correctIndex',1,'explanation','A razao entre numeros consecutivos da sequencia tende a 0.618, a proporcao aurea, base dos niveis mais observados.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Retracao de Fibonacci', 15, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Medindo correcoes','body','A retracao de Fibonacci mede o quanto o preco corrige antes de retomar a tendencia. Apos um movimento forte, o preco costuma recuar uma parte do trajeto antes de continuar, e os niveis de Fibonacci indicam ate onde essa correcao pode ir. Esses pontos servem como possiveis regioes de entrada a favor da tendencia principal.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','A retracao de Fibonacci ajuda a identificar ate onde o preco pode corrigir antes de retomar a tendencia.','answer',true,'explanation','Verdadeiro. Os niveis de retracao indicam regioes provaveis de correcao, uteis para entradas a favor da tendencia.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Niveis 0.382, 0.5 e 0.618', 20, 2) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Os patamares principais','body','Os niveis mais observados na retracao sao 0.382, 0.500 e 0.618. O 0.382 representa uma correcao rasa, tipica de tendencias fortes; o 0.500 e um ponto intermediario muito acompanhado; e o 0.618 e a retracao profunda mais importante. Embora 0.500 nao venha da sequencia de Fibonacci, e amplamente usado por tradicao e por marcar a metade do movimento.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Qual nivel de retracao representa uma correcao mais profunda e e considerado o mais importante?','options',jsonb_build_array('0.236','0.382','0.618','0.500'),'correctIndex',2,'explanation','O 0.618 e a retracao profunda mais relevante, derivada da proporcao aurea, e muito observada como regiao de reacao.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Zona de ouro', 10, 3) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Entre 0.5 e 0.618','body','A zona de ouro e a regiao entre os niveis 0.500 e 0.618 da retracao, considerada a area mais provavel para o preco reagir e retomar a tendencia. Muitos traders concentram suas entradas nessa faixa por oferecer um bom equilibrio entre profundidade da correcao e potencial de continuacao. Quando ela coincide com um suporte ou resistencia, a probabilidade aumenta ainda mais.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','A zona de ouro fica entre os niveis 0.500 e 0.618 e e uma regiao buscada para entradas a favor da tendencia.','answer',true,'explanation','Verdadeiro. A faixa entre 0.5 e 0.618 e considerada a area de maior probabilidade de reacao do preco.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Como tracar', 15, 4) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Do inicio ao fim do movimento','body','Para tracar a retracao corretamente, voce marca do inicio ao fim do movimento que deseja medir. Em uma alta, voce arrasta do fundo para o topo; em uma baixa, do topo para o fundo. A ferramenta entao desenha os niveis automaticamente entre esses dois pontos. Tracar na direcao errada inverte os niveis e gera leituras equivocadas, por isso a direcao importa.'), 0),
  (v_lesson, 'order', jsonb_build_object('prompt','Ordene os passos para tracar a retracao de Fibonacci em uma tendencia de alta:','items',jsonb_build_array('Identifique o movimento de alta que deseja medir','Marque o ponto inicial no fundo do movimento','Arraste ate o topo do movimento','Leia os niveis de retracao desenhados entre os dois pontos')), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Extensoes 1.272 e 1.618', 20, 5) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Projetando alvos','body','Enquanto as retracoes medem correcoes dentro do movimento, as extensoes projetam ate onde o preco pode ir alem do topo ou fundo anterior. Os niveis 1.272 e 1.618 sao os mais usados como alvos de lucro. Por exemplo, apos uma correcao e retomada da alta, a extensao de 1.618 marca um ponto natural para realizar lucros ou reduzir posicao.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Para que servem as extensoes de Fibonacci como 1.272 e 1.618?','options',jsonb_build_array('Para medir correcoes dentro do movimento','Para projetar alvos de lucro alem do topo ou fundo anterior','Para calcular o volume negociado','Para definir o periodo de uma media movel'),'correctIndex',1,'explanation','As extensoes projetam alvos alem do movimento original; 1.272 e 1.618 sao referencias classicas para realizar lucros.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Confluencia com S/R', 10, 6) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Niveis que se reforcam','body','O Fibonacci fica muito mais poderoso quando um de seus niveis coincide com um suporte ou resistencia ja existente. Quando o nivel de 0.618 cai exatamente sobre um suporte historico, por exemplo, temos uma confluencia que aumenta bastante a probabilidade de reacao. Buscar essas sobreposicoes e uma das melhores formas de filtrar entradas de qualidade.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Um nivel de Fibonacci coincidindo com um suporte ou resistencia cria uma confluencia que aumenta a probabilidade de reacao.','answer',true,'explanation','Verdadeiro. A confluencia entre Fibonacci e niveis de S/R reforca a regiao e melhora a qualidade da entrada.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Fibonacci em pullbacks', 15, 7) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Entrando na correcao','body','O uso classico do Fibonacci e identificar entradas durante o pullback de uma tendencia. Em uma alta, voce espera o preco corrigir ate a zona de Fibonacci e procura sinais de retomada para comprar a favor da tendencia. Isso permite entrar com um preco melhor e um stop mais curto do que comprar no topo do impulso, melhorando a relacao risco-retorno.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Como o Fibonacci e classicamente usado em um pullback de tendencia de alta?','options',jsonb_build_array('Para vender no topo do impulso','Para esperar a correcao chegar a zona de Fibonacci e comprar a favor da tendencia','Para operar contra a tendencia principal','Para ignorar a tendencia e operar lateralidade'),'correctIndex',1,'explanation','No pullback, espera-se a correcao atingir a zona de Fibonacci e buscar retomada para entrar a favor da tendencia.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Erros comuns', 20, 8) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O que evitar','body','Erros frequentes com Fibonacci incluem tracar na direcao errada, usar pontos de inicio e fim mal escolhidos e confiar no indicador isoladamente, sem contexto. Outro engano e forcar a ferramenta ate ela encaixar em algum nivel, o que so gera vies de confirmacao. O Fibonacci e um guia de probabilidades, nao uma garantia, e deve ser sempre combinado com a leitura do preco.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Confiar no Fibonacci isoladamente, sem contexto de price action, e uma boa pratica garantida de sucesso.','answer',false,'explanation','Falso. O Fibonacci e um guia de probabilidades; usado sozinho, sem contexto, leva a erros e vies de confirmacao.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Combinando com price action', 10, 9) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O fechamento da trilha','body','O Fibonacci atinge seu maximo potencial quando combinado com price action. Esperar o preco chegar a um nivel de Fibonacci e so entrar apos um sinal claro, como um pinbar, um engolfo ou a defesa de um suporte, transforma uma regiao provavel em uma entrada de alta qualidade. Essa uniao de niveis, padroes de candle e contexto de tendencia resume tudo o que voce aprendeu na trilha.'), 0),
  (v_lesson, 'order', jsonb_build_object('prompt','Ordene uma entrada de qualidade combinando Fibonacci com price action em uma alta:','items',jsonb_build_array('O preco corrige ate a zona de ouro do Fibonacci','Surge um padrao de reversao de alta como pinbar ou engolfo','O sinal coincide com um suporte ou nivel relevante','Voce entra comprado a favor da tendencia com stop curto')), 1);

  -- ============ Bandas de Bollinger (10 aulas) ============
  v_sub := 'Unidade';
  SELECT subtitle, order_index, image_url, icon_theme INTO v_sub, v_order, v_img, v_theme
  FROM public.trilha_units WHERE track_id = v_track AND title = 'Bandas de Bollinger';
  DELETE FROM public.trilha_units WHERE track_id = v_track AND title = 'Bandas de Bollinger';
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index, image_url, icon_theme)
  VALUES (v_track, 'Bandas de Bollinger', COALESCE(v_sub, 'Unidade'), COALESCE(v_order, 999), v_img, COALESCE(v_theme, 'default'))
  RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O que sao as Bandas', 10, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Media mais dois desvios','body','As Bandas de Bollinger sao formadas por tres linhas: uma media movel central e duas bandas externas posicionadas a dois desvios-padrao acima e abaixo dela. O desvio-padrao mede o quanto o preco se afasta da media, entao as bandas se alargam quando o mercado fica volatil e se estreitam quando ele acalma. Por exemplo, no EUR/USD em dia de noticia forte, as bandas se abrem rapidamente para acomodar os candles maiores.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Quantos desvios-padrao separam a banda externa da media central na configuracao classica?','options',jsonb_build_array('1 desvio','2 desvios','3 desvios','Meio desvio'),'correctIndex',1,'explanation','Na configuracao padrao, cada banda fica a 2 desvios-padrao da media, cobrindo a maior parte das variacoes normais do preco.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'A linha central', 15, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O coracao do indicador','body','A linha do meio das Bandas de Bollinger e simplesmente uma media movel simples, normalmente de 20 periodos. Ela funciona como referencia de tendencia e de valor justo: quando o preco esta acima dela o vies de curto prazo e comprador, e quando esta abaixo o vies e vendedor. Muitos traders usam essa linha central tambem como alvo natural quando o preco se afasta demais das bordas.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','A linha central das Bandas de Bollinger e uma media movel.','answer',true,'explanation','Sim, a linha do meio e uma media movel simples (geralmente de 20 periodos), que serve de base para o calculo das bandas externas.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Largura e volatilidade', 20, 2) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Bandas medem o nervosismo','body','A distancia entre as bandas superior e inferior representa diretamente a volatilidade do mercado. Bandas largas indicam muita movimentacao e incerteza, enquanto bandas estreitas indicam um mercado calmo e em equilibrio. No DAX, por exemplo, as bandas costumam se abrir bastante na abertura europeia e se estreitar no fim da tarde.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Quanto mais largas as bandas, maior a volatilidade do mercado naquele momento.','answer',true,'explanation','A largura das bandas e proporcional ao desvio-padrao, ou seja, bandas largas refletem precos mais dispersos e maior volatilidade.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O squeeze (aperto)', 10, 3) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Calmaria antes do movimento','body','O squeeze acontece quando as bandas se estreitam ao maximo, sinalizando baixa volatilidade e um mercado comprimido. Esse aperto costuma anteceder movimentos fortes, pois o mercado tende a alternar fases de calma e fases de explosao. O squeeze nao diz a direcao, apenas avisa que uma expansao provavel esta por vir.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O que o squeeze nas Bandas de Bollinger costuma indicar?','options',jsonb_build_array('Que a tendencia ja acabou','Baixa volatilidade que pode anteceder um movimento forte','Que o preco vai necessariamente subir','Que o indicador esta com erro'),'correctIndex',1,'explanation','O squeeze mostra compressao da volatilidade. Ele alerta para uma possivel expansao, mas nao indica a direcao do movimento.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'A expansao', 15, 4) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O mercado se solta','body','Apos um squeeze, vem a expansao: as bandas se abrem rapidamente conforme a volatilidade explode e o preco dispara em uma direcao. Esse e o momento em que muitos rompimentos ganham forca. Por exemplo, depois de horas de lateralizacao no ouro, um candle grande rompendo a banda inicia uma expansao clara.'), 0),
  (v_lesson, 'order', jsonb_build_object('prompt','Coloque na ordem correta o ciclo tipico de volatilidade nas Bandas de Bollinger:','items',jsonb_build_array('Squeeze (bandas estreitas)','Rompimento com candle forte','Expansao das bandas','Novo periodo de calmaria')), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Caminhando na banda', 20, 5) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Walking the band','body','Em tendencias fortes, o preco pode encostar e deslizar ao longo da banda superior ou inferior por varios candles seguidos, o que chamamos de caminhar na banda. Esse comportamento NAO e sinal de reversao, e sim de forca da tendencia. Confundir esse deslize com exagero e tentar operar contra costuma gerar prejuizo.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Quando o preco caminha colado na banda superior, isso confirma que a alta esta perdendo forca.','answer',false,'explanation','Pelo contrario: caminhar na banda e sinal de tendencia forte. Operar contra esse movimento costuma ser um erro caro.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Toques nas bandas', 10, 6) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Toque nao e sinal automatico','body','Um erro comum e achar que tocar a banda superior significa vender e tocar a inferior significa comprar. Na verdade, o preco passa boa parte do tempo proximo das bandas, e o toque sozinho nao gera sinal. E preciso combinar o toque com contexto, como tendencia, suporte/resistencia ou padroes de candle.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Por que tocar a banda inferior nao e sinal automatico de compra?','options',jsonb_build_array('Porque a banda inferior nunca e tocada','Porque o toque precisa de contexto, em tendencia de baixa o preco fica colado nela','Porque o indicador inverte os sinais','Porque so vale para acoes'),'correctIndex',1,'explanation','Em tendencias fortes o preco caminha sobre a banda. O toque so vira sinal quando combinado com analise de contexto.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Reversao a media', 15, 7) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Volta ao centro','body','Em mercados lateralizados ou sem tendencia clara, o preco tende a oscilar entre as bandas e voltar para a media central, comportamento chamado de reversao a media. Nessas condicoes, afastamentos extremos costumam ser corrigidos em direcao a linha do meio. Essa logica funciona bem em ranges, mas e perigosa em tendencias fortes.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','A estrategia de reversao a media funciona melhor em mercados lateralizados do que em tendencias fortes.','answer',true,'explanation','Em ranges o preco oscila e volta a media. Em tendencias fortes, apostar na reversao contraria o movimento dominante.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Bollinger e tendencia', 20, 8) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Combinando contexto','body','As Bandas de Bollinger rendem muito mais quando lidas junto com a tendencia. Numa alta, os toques na banda inferior podem ser oportunidades de compra a favor do movimento; numa baixa, os toques na banda superior podem ser pontos de venda. A inclinacao da media central ajuda a definir esse vies de tendencia.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Em uma tendencia de alta, qual leitura das bandas faz mais sentido?','options',jsonb_build_array('Vender todo toque na banda superior','Comprar recuos ate a banda inferior ou a media, a favor da alta','Ignorar a tendencia','Operar so contra o movimento'),'correctIndex',1,'explanation','Operar a favor da tendencia usando recuos a banda inferior ou a media aproveita o movimento dominante com melhor risco.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Configuracoes comuns', 10, 9) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O padrao 20 e 2','body','A configuracao mais usada e media de 20 periodos com 2 desvios-padrao, justamente a sugerida por John Bollinger, o criador do indicador. Valores menores deixam as bandas mais sensiveis e ruidosas, enquanto valores maiores as deixam mais lentas e suaves. Antes de mudar os parametros, vale entender bem o comportamento do padrao classico.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Qual e a configuracao classica das Bandas de Bollinger?','options',jsonb_build_array('Media de 9 e 1 desvio','Media de 50 e 3 desvios','Media de 20 e 2 desvios','Media de 200 e 2 desvios'),'correctIndex',2,'explanation','O padrao definido por John Bollinger e media de 20 periodos com 2 desvios-padrao, equilibrando sensibilidade e estabilidade.'), 1);

  -- ============ Smart Money Concepts (10 aulas) ============
  v_sub := 'Unidade';
  SELECT subtitle, order_index, image_url, icon_theme INTO v_sub, v_order, v_img, v_theme
  FROM public.trilha_units WHERE track_id = v_track AND title = 'Smart Money Concepts';
  DELETE FROM public.trilha_units WHERE track_id = v_track AND title = 'Smart Money Concepts';
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index, image_url, icon_theme)
  VALUES (v_track, 'Smart Money Concepts', COALESCE(v_sub, 'Unidade'), COALESCE(v_order, 999), v_img, COALESCE(v_theme, 'default'))
  RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O que e smart money', 10, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O dinheiro institucional','body','Smart money se refere aos grandes participantes do mercado, como bancos, fundos e instituicoes, que movimentam volumes enormes e influenciam o preco. Diferente do varejo, eles nao conseguem entrar de uma vez sem mover o mercado, entao precisam acumular posicoes aos poucos e buscar liquidez. A ideia central do SMC e ler as pegadas desses grandes players para operar ao lado deles.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Quem representa o smart money no mercado?','options',jsonb_build_array('Pequenos traders de varejo','Bancos, fundos e instituicoes','Apenas robos gratuitos','Influenciadores de redes sociais'),'correctIndex',1,'explanation','Smart money sao os grandes players institucionais que movem volumes capazes de influenciar o preco do ativo.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Liquidez', 15, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Onde ficam as ordens','body','Liquidez no SMC sao concentracoes de ordens, normalmente stops e ordens pendentes, que ficam acima de topos e abaixo de fundos. O smart money precisa dessa liquidez para preencher suas grandes ordens, entao o preco e frequentemente levado ate essas regioes. Por isso topos e fundos obvios funcionam como imas para o preco.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Acima de topos e abaixo de fundos costumam existir concentracoes de liquidez, como ordens de stop.','answer',true,'explanation','Esses pontos obvios acumulam stops e ordens pendentes, virando alvos de liquidez para os grandes players.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Stop hunt', 20, 2) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Cacada de stops','body','Stop hunt e quando o preco rompe rapidamente um topo ou fundo, aciona os stops do varejo e em seguida reverte com forca. Esse movimento permite ao smart money capturar liquidez e entrar na direcao oposta a do varejo que acabou de ser estopado. Reconhecer o stop hunt evita entrar na armadilha e ajuda a entrar junto com os grandes.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Qual e o objetivo de um stop hunt?','options',jsonb_build_array('Confirmar uma tendencia duradoura','Acionar stops do varejo para capturar liquidez antes de reverter','Fechar o mercado mais cedo','Eliminar a volatilidade'),'correctIndex',1,'explanation','O stop hunt varre os stops do varejo, dando liquidez ao smart money, que entao move o preco na direcao oposta.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Order block', 10, 3) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Pegada institucional','body','Um order block e a ultima vela de acumulacao antes de um movimento forte e impulsivo, marcando a regiao onde os institucionais posicionaram grandes ordens. Quando o preco retorna a esse bloco, ele costuma reagir, pois ali ainda ha interesse institucional. Por isso order blocks sao usados como zonas de entrada com bom risco-retorno.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Um order block representa a regiao da ultima acumulacao antes de um movimento impulsivo.','answer',true,'explanation','O order block e a vela de origem do movimento institucional, e o preco tende a reagir ao retornar a essa zona.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Break of structure', 15, 4) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','BOS, continuidade','body','Break of structure, ou BOS, ocorre quando o preco rompe um topo anterior numa alta ou um fundo anterior numa baixa, confirmando a continuidade da tendencia. O BOS mostra que a estrutura de mercado segue intacta na mesma direcao. Ele e a base para identificar para onde o smart money esta empurrando o preco.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O que um break of structure (BOS) confirma?','options',jsonb_build_array('A reversao imediata da tendencia','A continuidade da tendencia atual','Que o mercado fechou','Que nao ha liquidez'),'correctIndex',1,'explanation','O BOS rompe o topo ou fundo anterior na direcao da tendencia, confirmando que ela continua.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Change of character', 20, 5) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','CHoCH, alerta de virada','body','Change of character, ou CHoCH, e o primeiro sinal de que a estrutura pode estar mudando: numa alta, o preco rompe um fundo relevante pela primeira vez; numa baixa, rompe um topo. Diferente do BOS que confirma continuidade, o CHoCH alerta para uma possivel reversao. Ele costuma ser o gatilho inicial para reavaliar o vies do mercado.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Qual a diferenca entre BOS e CHoCH?','options',jsonb_build_array('Sao a mesma coisa','BOS confirma continuidade e CHoCH sinaliza possivel reversao','CHoCH so vale em acoes','BOS sinaliza reversao e CHoCH continuidade'),'correctIndex',1,'explanation','O BOS confirma a tendencia vigente, enquanto o CHoCH e o primeiro sinal de que ela pode estar mudando de carater.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Mitigacao', 10, 6) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Reequilibrando posicoes','body','Mitigacao e quando o preco retorna a uma zona de order block para que os institucionais ajustem ou completem suas posicoes anteriores. Esse retorno reequilibra ordens que ficaram pendentes e, depois disso, o movimento original costuma continuar. Operar na mitigacao significa entrar quando o preco volta para testar essa zona institucional.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Mitigacao e o retorno do preco a uma zona institucional para reequilibrar posicoes antes de continuar o movimento.','answer',true,'explanation','Na mitigacao o preco volta ao order block, os institucionais ajustam posicoes e o movimento tende a prosseguir.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Imbalance', 15, 7) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Desequilibrio de precos','body','Imbalance e uma regiao onde o preco se moveu tao rapido que deixou um vazio, com pouca negociacao entre compradores e vendedores. Esse desequilibrio costuma ser parcial ou totalmente preenchido depois, pois o mercado tende a buscar equilibrio. Identificar imbalances ajuda a antecipar regioes para onde o preco pode voltar.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O que caracteriza um imbalance?','options',jsonb_build_array('Uma regiao de negociacao muito equilibrada','Um vazio deixado por um movimento rapido, com pouca negociacao','O fechamento do mercado','Uma media movel'),'correctIndex',1,'explanation','O imbalance e o desequilibrio criado por um movimento veloz, e o mercado tende a voltar para preencher esse vazio.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Premium e discount', 20, 8) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Caro ou barato','body','Dividindo um movimento ao meio com o ponto de equilibrio, a metade superior e a zona de premium (caro) e a inferior e a zona de discount (barato). O smart money tende a comprar em discount e vender em premium, buscando o melhor preco. Por isso procurar compras na regiao barata e vendas na regiao cara melhora muito o risco-retorno.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Onde o smart money prefere comprar?','options',jsonb_build_array('Na zona de premium (caro)','Na zona de discount (barato)','Exatamente no ponto de equilibrio sempre','Nunca compra'),'correctIndex',1,'explanation','Comprar em discount (regiao barata) e vender em premium (regiao cara) oferece o melhor preco e risco-retorno.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'A favor do smart money', 10, 9) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Operar com os grandes','body','A ideia central do SMC e parar de lutar contra os institucionais e comecar a operar ao lado deles. Isso significa identificar a direcao do smart money pela estrutura, esperar a captura de liquidez e entrar em zonas como order blocks na regiao de desconto certa. A disciplina de esperar a confluencia desses sinais e o que separa o operador consistente do impulsivo.'), 0),
  (v_lesson, 'order', jsonb_build_object('prompt','Ordene um fluxo tipico de operacao alinhada ao smart money:','items',jsonb_build_array('Identificar a direcao pela estrutura (BOS/CHoCH)','Esperar a captura de liquidez','Aguardar o retorno ao order block em zona de desconto','Entrar a favor do movimento institucional')), 1);

  -- ============ ICT (10 aulas) ============
  v_sub := 'Unidade';
  SELECT subtitle, order_index, image_url, icon_theme INTO v_sub, v_order, v_img, v_theme
  FROM public.trilha_units WHERE track_id = v_track AND title = 'ICT';
  DELETE FROM public.trilha_units WHERE track_id = v_track AND title = 'ICT';
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index, image_url, icon_theme)
  VALUES (v_track, 'ICT', COALESCE(v_sub, 'Unidade'), COALESCE(v_order, 999), v_img, COALESCE(v_theme, 'default'))
  RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Quem e o ICT', 10, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O Inner Circle Trader','body','ICT e o apelido de Michael Huddleston, conhecido como Inner Circle Trader, criador de uma metodologia focada em como os grandes players e a logica algoritmica movimentam o mercado. Seus conceitos giram em torno de liquidez, tempo e estrutura, e influenciaram fortemente o universo do smart money. Estudar ICT e mergulhar em uma forma muito detalhada de ler as intencoes do mercado.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O que significa a sigla ICT no contexto de trading?','options',jsonb_build_array('Indice de Capital Total','Inner Circle Trader','International Currency Trade','Index Chart Tool'),'correctIndex',1,'explanation','ICT significa Inner Circle Trader, apelido de Michael Huddleston, criador da metodologia.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Fair value gap', 15, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','FVG, o vazio de preco','body','O fair value gap, ou FVG, e um padrao de tres velas em que a movimentacao deixa um vazio entre a sombra da primeira e a sombra da terceira vela. Esse vazio representa um desequilibrio que o mercado tende a voltar para preencher, oferecendo zonas de entrada. O FVG e um dos conceitos mais usados na metodologia ICT.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Um fair value gap (FVG) e formado por um padrao de tres velas que deixa um vazio de preco.','answer',true,'explanation','O FVG surge quando o movimento de tres velas deixa um espaco entre as sombras, indicando desequilibrio que pode ser preenchido.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Killzones', 20, 2) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Janelas de Londres e NY','body','Killzones sao janelas de horario com maior probabilidade de movimentos relevantes, principalmente nas aberturas de Londres e de Nova York. Nesses periodos o volume aumenta e os movimentos institucionais ficam mais claros. Concentrar as operacoes nessas janelas evita o ruido dos horarios de baixa liquidez.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O que sao as killzones no ICT?','options',jsonb_build_array('Horarios para nunca operar','Janelas de maior atividade, como aberturas de Londres e Nova York','Zonas de stop loss','Indicadores de volume'),'correctIndex',1,'explanation','Killzones sao as janelas de horario com maior atividade institucional, como as aberturas de Londres e de Nova York.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Liquidez compra e venda', 10, 3) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Buy side e sell side','body','No ICT, a liquidez de compra (buy side) fica acima dos topos, onde estao os stops de vendedores, e a liquidez de venda (sell side) fica abaixo dos fundos, onde estao os stops de compradores. O mercado costuma buscar essas regioes antes de fazer o movimento real. Saber onde esta a liquidez ajuda a prever para onde o preco pode ser puxado.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Onde fica a liquidez de compra (buy side)?','options',jsonb_build_array('Abaixo dos fundos','Acima dos topos','No centro do range','Nao existe liquidez de compra'),'correctIndex',1,'explanation','A liquidez de compra fica acima dos topos, onde se concentram os stops dos vendedores.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Optimal trade entry', 15, 4) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','OTE, a entrada ideal','body','O optimal trade entry, ou OTE, e uma zona de entrada baseada em retracoes de Fibonacci, geralmente entre 62 e 79 por cento do movimento. Entrar nessa faixa busca o melhor preco dentro de um pullback, com stop curto e alvo amplo. O OTE combina retracao profunda com confluencia de outros conceitos como FVG e order block.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Em que faixa de retracao costuma estar o optimal trade entry (OTE)?','options',jsonb_build_array('10 a 20 por cento','38 a 50 por cento','62 a 79 por cento','90 a 100 por cento'),'correctIndex',2,'explanation','O OTE busca entradas em retracoes profundas, tipicamente entre 62 e 79 por cento, otimizando o risco-retorno.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Market structure shift', 20, 5) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','MSS, mudanca de estrutura','body','O market structure shift, ou MSS, e o rompimento de um ponto de estrutura na direcao contraria a tendencia recente, sinalizando uma possivel virada. Ele costuma acontecer logo apos uma varredura de liquidez, confirmando que o fluxo mudou de mao. O MSS e um dos principais gatilhos de reversao na leitura ICT.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Um market structure shift costuma ocorrer logo apos uma varredura de liquidez e sinaliza possivel mudanca de direcao.','answer',true,'explanation','O MSS rompe a estrutura na direcao oposta apos pegar liquidez, indicando que o fluxo do mercado virou.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Judas swing', 10, 6) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O falso movimento','body','O judas swing e um movimento falso no inicio da sessao que engana os traders, levando o preco numa direcao para depois reverter na direcao real do dia. O nome vem da ideia de traicao: o mercado finge ir para um lado para capturar liquidez. Reconhecer o judas swing evita entrar no falso rompimento e permite operar a reversao.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O que e o judas swing?','options',jsonb_build_array('Um indicador de tendencia','Um movimento falso no inicio da sessao que reverte depois','Uma media movel rapida','O fechamento do mercado'),'correctIndex',1,'explanation','O judas swing e o movimento enganoso inicial que captura liquidez antes de o preco seguir a direcao real.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Silver bullet', 15, 7) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','A janela de uma hora','body','O silver bullet e uma estrategia ICT focada em janelas especificas de uma hora dentro das killzones, em que se busca um FVG para entrar com alvo na liquidez proxima. A ideia e ter um setup simples e repetivel em um horario de alta probabilidade. E uma introducao pratica de como combinar tempo e FVG.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','O silver bullet e uma estrategia que atua em janelas especificas de tempo buscando entradas em fair value gaps.','answer',true,'explanation','O silver bullet combina uma janela de uma hora dentro da killzone com a busca por FVG para entradas de alta probabilidade.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Power of three', 20, 8) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Acumular, manipular, distribuir','body','O power of three descreve tres fases de um movimento institucional: acumulacao, em que as posicoes sao montadas; manipulacao, em que o preco engana e captura liquidez; e distribuicao, em que o movimento real se desenrola. Esse modelo ajuda a entender por que o preco muitas vezes vai para um lado antes de ir de verdade para o outro. Ler essas tres fases organiza a expectativa do dia.'), 0),
  (v_lesson, 'order', jsonb_build_object('prompt','Coloque as fases do power of three na ordem correta:','items',jsonb_build_array('Acumulacao','Manipulacao','Distribuicao')), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Disciplina no ICT', 10, 9) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Paciencia e contexto','body','A metodologia ICT e rica em conceitos, mas exige muita disciplina para nao operar tudo o tempo todo. O ganho consistente vem de esperar a confluencia entre tempo, liquidez e estrutura, e de respeitar o gerenciamento de risco. Sem paciencia, o excesso de ferramentas vira motivo para entradas ruins e overtrading.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Qual atitude e essencial para aplicar bem o ICT?','options',jsonb_build_array('Operar em todos os candles','Esperar confluencia de tempo, liquidez e estrutura com disciplina','Ignorar o gerenciamento de risco','Usar apenas um conceito sem contexto'),'correctIndex',1,'explanation','A disciplina de esperar a confluencia entre tempo, liquidez e estrutura e o que torna a metodologia ICT consistente.'), 1);

  -- ============ Wyckoff (10 aulas) ============
  v_sub := 'Unidade';
  SELECT subtitle, order_index, image_url, icon_theme INTO v_sub, v_order, v_img, v_theme
  FROM public.trilha_units WHERE track_id = v_track AND title = 'Wyckoff';
  DELETE FROM public.trilha_units WHERE track_id = v_track AND title = 'Wyckoff';
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index, image_url, icon_theme)
  VALUES (v_track, 'Wyckoff', COALESCE(v_sub, 'Unidade'), COALESCE(v_order, 999), v_img, COALESCE(v_theme, 'default'))
  RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O metodo Wyckoff', 10, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Lendo o grande operador','body','Richard Wyckoff criou um metodo classico que busca entender as intencoes dos grandes operadores atraves do preco e do volume. A ideia central e que o mercado se move em ciclos de acumulacao, alta, distribuicao e baixa, conduzidos por maos fortes. Estudar Wyckoff e aprender a interpretar quem esta no controle em cada fase.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Qual e a ideia central do metodo Wyckoff?','options',jsonb_build_array('Seguir noticias economicas','Interpretar preco e volume para entender as maos fortes','Usar apenas medias moveis','Operar sempre contra a tendencia'),'correctIndex',1,'explanation','Wyckoff analisa a relacao entre preco e volume para revelar as intencoes dos grandes operadores ao longo dos ciclos.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Acumulacao', 15, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Montando posicao na calma','body','A acumulacao e a fase em que as maos fortes compram aos poucos dentro de um range lateral, sem deixar o preco subir muito para nao encarecer suas compras. Esse processo costuma acontecer apos uma queda, quando o ativo parece sem graca e o varejo perde interesse. Ao fim da acumulacao, o preco esta pronto para iniciar uma alta.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Na acumulacao, as maos fortes compram dentro de um range lateral, geralmente apos uma queda.','answer',true,'explanation','A acumulacao acontece em range lateral apos queda, quando os grandes montam posicao antes da alta.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Distribuicao', 20, 2) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Vendendo no topo','body','A distribuicao e o oposto da acumulacao: apos uma alta, as maos fortes vendem suas posicoes aos poucos para o varejo otimista, dentro de um range no topo. O preco fica lateral enquanto a venda discreta acontece, ate que o suporte do range cede e comeca a queda. Reconhecer a distribuicao evita comprar justamente quando os grandes estao saindo.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O que ocorre na fase de distribuicao?','options',jsonb_build_array('Maos fortes compram apos queda','Maos fortes vendem aos poucos apos uma alta, em range no topo','O mercado fecha','O volume desaparece totalmente'),'correctIndex',1,'explanation','Na distribuicao os grandes vendem para o varejo dentro de um range no topo, antes de o preco iniciar a queda.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'As tres leis', 10, 3) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Pilares do metodo','body','Wyckoff se apoia em tres leis: oferta e demanda, que define a direcao do preco; causa e efeito, em que o tempo de acumulacao gera o tamanho do movimento seguinte; e esforco e resultado, que compara volume com o avanco do preco. Juntas, essas leis dao a base para interpretar qualquer grafico pelo metodo. Elas funcionam como lentes para entender o que o mercado esta fazendo.'), 0),
  (v_lesson, 'order', jsonb_build_object('prompt','Ordene as tres leis de Wyckoff conforme apresentadas:','items',jsonb_build_array('Oferta e demanda','Causa e efeito','Esforco e resultado')), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Esforco e resultado', 15, 4) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Volume contra preco','body','A lei do esforco e resultado compara o volume negociado (esforco) com o movimento do preco (resultado). Quando ha muito volume mas o preco quase nao avanca, e um sinal de divergencia, indicando que ha absorcao e possivel reversao. Por exemplo, volume altissimo num topo sem novos maximos sugere que a demanda esta sendo absorvida.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Muito volume com pouco avanco no preco e uma divergencia que pode indicar reversao.','answer',true,'explanation','Pela lei do esforco e resultado, esforco grande (volume) com resultado pequeno (preco) sinaliza absorcao e possivel virada.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'As fases A a E', 20, 5) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','A estrutura do range','body','Wyckoff divide um range em fases que vao de A a E: a fase A para a tendencia anterior, B constroi a causa, C testa com o evento decisivo, D mostra a dominancia do novo lado e E inicia o movimento para fora do range. Essa sequencia ajuda a localizar em que ponto da acumulacao ou distribuicao o preco esta. Saber a fase orienta quando esperar e quando agir.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O que normalmente ocorre na fase E de um range Wyckoff?','options',jsonb_build_array('A parada da tendencia anterior','A construcao da causa','O inicio do movimento para fora do range','O teste decisivo do range'),'correctIndex',2,'explanation','A fase E e quando o preco efetivamente sai do range, iniciando a tendencia que foi preparada nas fases anteriores.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Spring', 10, 6) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','A armadilha de baixa','body','O spring e um falso rompimento abaixo do suporte de um range de acumulacao, que estopa vendedores e captura liquidez antes de o preco reverter para cima. Ele e um dos sinais mais fortes de que a acumulacao terminou e a alta vai comecar. Reconhecer o spring permite entrar perto do fundo com risco controlado.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O que e um spring no metodo Wyckoff?','options',jsonb_build_array('Um rompimento verdadeiro de resistencia','Um falso rompimento abaixo do suporte que reverte para cima','Uma media movel','Um indicador de volume'),'correctIndex',1,'explanation','O spring e a quebra falsa do suporte que varre vendedores antes de o preco reverter, sinalizando fim da acumulacao.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Upthrust', 15, 7) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','A armadilha de alta','body','O upthrust e o oposto do spring: um falso rompimento acima da resistencia em um range de distribuicao, que engana compradores antes de o preco reverter para baixo. Ele captura a liquidez de quem comprou no rompimento e sinaliza que a distribuicao esta no fim. Esse padrao costuma anteceder quedas relevantes.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','O upthrust e um falso rompimento acima da resistencia que costuma anteceder uma queda.','answer',true,'explanation','O upthrust engana compradores no rompimento da resistencia e reverte para baixo, sinalizando o fim da distribuicao.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Composite man', 20, 8) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O operador imaginario','body','O composite man e uma figura imaginaria criada por Wyckoff que representa todas as maos fortes agindo como um unico grande operador. Pensar no mercado como conduzido por esse personagem ajuda a interpretar movimentos como acumulacao, manipulacao e distribuicao de forma logica. E uma maneira didatica de enxergar a intencao por tras do preco.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O que representa o composite man de Wyckoff?','options',jsonb_build_array('Um indicador tecnico','Uma figura imaginaria que representa as maos fortes agindo em conjunto','Um tipo de ordem','Uma corretora'),'correctIndex',1,'explanation','O composite man personifica todas as maos fortes como um unico operador, facilitando a leitura das intencoes do mercado.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Volume no Wyckoff', 10, 9) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','A peca-chave','body','No metodo Wyckoff, o volume e fundamental para confirmar ou desmentir o que o preco mostra. Volume crescente acompanhando o movimento confirma forca, enquanto volume que seca em rompimentos levanta suspeita de armadilha. Por isso ler volume junto com a estrutura do range e essencial para identificar springs, upthrusts e o fim de cada fase.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','No metodo Wyckoff, o volume e usado apenas como detalhe secundario sem importancia.','answer',false,'explanation','O volume e peca-chave no Wyckoff: ele confirma a forca do movimento ou denuncia armadilhas e o fim de cada fase.'), 1);

  -- ============ Teoria de Dow (10 aulas) ============
  v_sub := 'Unidade';
  SELECT subtitle, order_index, image_url, icon_theme INTO v_sub, v_order, v_img, v_theme
  FROM public.trilha_units WHERE track_id = v_track AND title = 'Teoria de Dow';
  DELETE FROM public.trilha_units WHERE track_id = v_track AND title = 'Teoria de Dow';
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index, image_url, icon_theme)
  VALUES (v_track, 'Teoria de Dow', COALESCE(v_sub, 'Unidade'), COALESCE(v_order, 999), v_img, COALESCE(v_theme, 'default'))
  RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Charles Dow', 10, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','A base da analise tecnica','body','Charles Dow foi o fundador do Wall Street Journal e criador dos primeiros indices de mercado, lancando as ideias que originaram a analise tecnica moderna. Suas observacoes sobre como o mercado se comporta foram organizadas depois em um conjunto de principios conhecido como Teoria de Dow. Muito do que usamos hoje, como tendencias e confirmacoes, nasceu desse trabalho.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Por que Charles Dow e importante para a analise tecnica?','options',jsonb_build_array('Inventou as criptomoedas','Lancou principios que deram origem a analise tecnica moderna','Criou as Bandas de Bollinger','Foi um trader de cripto'),'correctIndex',1,'explanation','Dow criou indices e observacoes que formaram a base teorica da analise tecnica usada ate hoje.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Mercado em tendencias', 15, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O preco tem direcao','body','Um dos pilares da Teoria de Dow e que o mercado se move em tendencias, e nao de forma aleatoria. Identificar a direcao dominante e o primeiro passo para operar a favor do fluxo principal. Ignorar a tendencia e remar contra a corrente, o que costuma resultar em operacoes dificeis.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Para a Teoria de Dow, o mercado se move em tendencias e nao de forma totalmente aleatoria.','answer',true,'explanation','A existencia de tendencias e um dos principios centrais de Dow, base para operar a favor do fluxo dominante.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'As tres tendencias', 20, 2) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Primaria, secundaria, terciaria','body','Dow classifica as tendencias em tres tipos por duracao: a primaria, que dura meses ou anos e define o rumo principal; a secundaria, que sao correcoes dentro da primaria e duram semanas; e a terciaria, que sao oscilacoes curtas de dias ou horas. Entender em qual grau voce esta operando evita confundir uma simples correcao com uma reversao de fundo.'), 0),
  (v_lesson, 'order', jsonb_build_object('prompt','Ordene as tres tendencias de Dow da mais longa para a mais curta:','items',jsonb_build_array('Primaria (meses a anos)','Secundaria (semanas)','Terciaria (dias a horas)')), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'As tres fases', 10, 3) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Acumulacao, participacao, distribuicao','body','Toda tendencia primaria passa por tres fases: a acumulacao, quando os investidores informados entram cedo; a participacao publica, quando a maioria percebe e o movimento ganha forca; e a distribuicao, quando os primeiros realizam lucro e vendem para os ultimos entusiasmados. Reconhecer a fase ajuda a evitar comprar justamente no topo da euforia.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Em qual fase de Dow os investidores informados costumam entrar primeiro?','options',jsonb_build_array('Distribuicao','Participacao publica','Acumulacao','Nenhuma delas'),'correctIndex',2,'explanation','Na acumulacao os investidores mais informados entram cedo, antes de o grande publico perceber a tendencia.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Confirmacao por indices', 15, 4) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Um confirma o outro','body','Dow defendia que uma tendencia so era confiavel quando confirmada por mais de um indice, originalmente o industrial e o de transportes. A logica e que se a producao cresce, o transporte de mercadorias tambem deveria crescer, validando o movimento. Quando os indices divergem, o sinal de tendencia perde forca.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Para Dow, uma tendencia ganha confiabilidade quando confirmada por mais de um indice.','answer',true,'explanation','O principio da confirmacao diz que indices relacionados devem se mover juntos para validar a tendencia.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Volume confirma', 20, 5) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Forca por tras do preco','body','Na Teoria de Dow, o volume deve acompanhar a tendencia para confirma-la: numa alta saudavel, o volume cresce nas subidas e diminui nas correcoes. Quando o preco sobe mas o volume mingua, isso levanta duvidas sobre a sustentacao do movimento. O volume funciona como termometro da convicao dos participantes.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Em uma tendencia de alta saudavel, como o volume deve se comportar?','options',jsonb_build_array('Cair nas altas e subir nas correcoes','Crescer nas altas e diminuir nas correcoes','Permanecer sempre igual','Ser irrelevante'),'correctIndex',1,'explanation','O volume deve aumentar a favor da tendencia e diminuir nas correcoes, confirmando a forca do movimento.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'A tendencia persiste', 10, 6) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Vale ate provar o contrario','body','Dow ensina que uma tendencia em vigor tende a continuar ate que surjam sinais claros de reversao. Isso evita que o trader fique adivinhando topos e fundos a cada pequena oscilacao. A postura correta e respeitar a tendencia e so mudar de lado quando a estrutura realmente se quebra.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Segundo Dow, uma tendencia continua valida ate que surjam sinais claros de reversao.','answer',true,'explanation','Esse principio evita antecipar reversoes: a tendencia se mantem ate que provas concretas indiquem o contrario.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Topos e fundos', 15, 7) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','A geometria da tendencia','body','Uma tendencia de alta e definida por topos e fundos cada vez mais altos, enquanto uma de baixa apresenta topos e fundos cada vez mais baixos. Essa sequencia e a forma objetiva de identificar a direcao do mercado sem precisar de indicadores. Quando esse padrao se quebra, e o primeiro alerta de mudanca de tendencia.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O que caracteriza uma tendencia de alta segundo Dow?','options',jsonb_build_array('Topos e fundos descendentes','Topos e fundos ascendentes','Precos totalmente laterais','Ausencia de volume'),'correctIndex',1,'explanation','Tendencia de alta e definida por topos e fundos progressivamente mais altos, mostrando dominio dos compradores.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Sinais de reversao', 20, 8) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Quando a estrutura quebra','body','A reversao de uma tendencia comeca quando a sequencia de topos e fundos se rompe: numa alta, quando o preco deixa de fazer novos maximos e perde um fundo importante. Esse e o sinal objetivo para reavaliar a posicao, idealmente confirmado por volume e pelos indices. Esperar a confirmacao evita sair cedo demais de uma boa tendencia.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Qual e o primeiro sinal objetivo de reversao de uma tendencia de alta?','options',jsonb_build_array('Novo topo mais alto','Quebra da sequencia de topos e fundos ascendentes','Aumento do volume nas altas','Confirmacao dos indices subindo'),'correctIndex',1,'explanation','Quando o preco para de fazer maximos e perde um fundo relevante, a estrutura de alta se quebra, sinalizando reversao.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Legado da teoria', 10, 9) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','A raiz de tudo','body','A Teoria de Dow e considerada a base de praticamente toda a analise tecnica moderna, influenciando conceitos como tendencias, suportes, resistencias e estrutura de mercado. Mesmo metodologias modernas como smart money e price action bebem dessa fonte. Dominar Dow e entender a fundacao sobre a qual o resto foi construido.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','A Teoria de Dow influenciou boa parte da analise tecnica moderna, incluindo conceitos de tendencia e estrutura.','answer',true,'explanation','Dow e a raiz de muitos conceitos atuais, servindo de fundacao para metodologias modernas de analise.'), 1);

  -- ============ Ondas de Elliott (10 aulas) ============
  v_sub := 'Unidade';
  SELECT subtitle, order_index, image_url, icon_theme INTO v_sub, v_order, v_img, v_theme
  FROM public.trilha_units WHERE track_id = v_track AND title = 'Ondas de Elliott';
  DELETE FROM public.trilha_units WHERE track_id = v_track AND title = 'Ondas de Elliott';
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index, image_url, icon_theme)
  VALUES (v_track, 'Ondas de Elliott', COALESCE(v_sub, 'Unidade'), COALESCE(v_order, 999), v_img, COALESCE(v_theme, 'default'))
  RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'A teoria das ondas', 10, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Padroes que se repetem','body','Ralph Elliott observou que o mercado se move em padroes repetitivos de ondas, refletindo o comportamento psicologico coletivo dos investidores. Esses padroes formam ciclos de avanco e correcao que se repetem em diferentes escalas de tempo. A Teoria das Ondas de Elliott busca mapear essa estrutura para antecipar os proximos movimentos.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O que a Teoria das Ondas de Elliott tenta mapear?','options',jsonb_build_array('Apenas o volume','Padroes repetitivos de ondas ligados a psicologia coletiva','O fechamento dos mercados','As taxas de juros'),'correctIndex',1,'explanation','Elliott mapeia padroes de ondas que se repetem, refletindo a psicologia das massas em diferentes escalas.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'As 5 ondas de impulso', 15, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O movimento a favor','body','O movimento principal a favor da tendencia se desenrola em cinco ondas, numeradas de 1 a 5. As ondas 1, 3 e 5 sao de avanco na direcao da tendencia, enquanto as ondas 2 e 4 sao correcoes parciais. Esse conjunto de cinco ondas forma a fase impulsiva do ciclo de Elliott.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Quantas ondas formam o movimento de impulso a favor da tendencia?','options',jsonb_build_array('Tres ondas','Cinco ondas','Sete ondas','Duas ondas'),'correctIndex',1,'explanation','O impulso e formado por cinco ondas, sendo 1, 3 e 5 de avanco e 2 e 4 corretivas.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'As 3 ondas corretivas', 20, 2) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','A correcao ABC','body','Apos as cinco ondas de impulso, vem a correcao, formada por tres ondas rotuladas como A, B e C. Essa fase move o preco contra a tendencia principal, devolvendo parte do avanco anterior. O ciclo completo de Elliott e, portanto, cinco ondas de impulso seguidas de tres ondas corretivas.'), 0),
  (v_lesson, 'order', jsonb_build_object('prompt','Ordene a sequencia das ondas corretivas de Elliott:','items',jsonb_build_array('Onda A','Onda B','Onda C')), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Psicologia das massas', 10, 3) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Medo e ganancia em ondas','body','Cada onda de Elliott reflete um estado emocional coletivo: o otimismo crescente impulsiona as ondas de alta e o medo gera as correcoes. A onda 3, por exemplo, costuma coincidir com o momento em que a multidao finalmente acredita na tendencia. Entender essa psicologia ajuda a dar sentido ao porque dos padroes se repetirem.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','As ondas de Elliott refletem estados emocionais coletivos como otimismo e medo.','answer',true,'explanation','A teoria se baseia na psicologia das massas: a alternancia entre ganancia e medo molda o formato das ondas.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'A onda 3', 15, 4) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','A mais forte','body','A onda 3 e geralmente a mais longa e poderosa do impulso, pois e quando a maioria dos participantes reconhece a tendencia e entra de vez. Ela costuma vir acompanhada de forte volume e movimentos rapidos. Por nunca poder ser a menor das ondas de impulso, a onda 3 e o alvo favorito de muitos operadores.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Qual caracteristica marca a onda 3 no impulso de Elliott?','options',jsonb_build_array('Costuma ser a mais curta','Costuma ser a mais longa e forte do impulso','E sempre uma correcao','Nunca tem volume'),'correctIndex',1,'explanation','A onda 3 e tipicamente a mais longa e poderosa, com forte volume, e nunca pode ser a menor das ondas de impulso.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'As 3 regras', 20, 5) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Regras invioláveis','body','Elliott tem tres regras que nunca podem ser quebradas: a onda 2 nunca retrai mais de 100 por cento da onda 1, a onda 3 nunca e a menor entre as ondas 1, 3 e 5, e a onda 4 nunca invade o territorio de preco da onda 1. Se qualquer uma dessas regras for violada, a contagem esta errada. Elas servem como filtro de validacao das suas contagens.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Pela regra de Elliott, a onda 3 nunca pode ser a menor entre as ondas 1, 3 e 5.','answer',true,'explanation','Essa e uma das tres regras invioláveis: a onda 3 jamais e a menor das ondas de impulso, senao a contagem esta incorreta.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Tipos de correcao', 10, 6) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Zigzag, flat e triangulo','body','As correcoes de Elliott assumem formatos diferentes, como o zigzag, que e mais profundo e direto, o flat, mais lateral e equilibrado, e o triangulo, que comprime o preco antes de continuar a tendencia. Reconhecer o tipo de correcao ajuda a estimar a profundidade e a duracao do movimento contra a tendencia. Cada formato carrega pistas sobre o que vem depois.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Qual destes e um tipo classico de correcao em Elliott?','options',jsonb_build_array('Squeeze','Zigzag','Order block','Killzone'),'correctIndex',1,'explanation','Zigzag, flat e triangulo sao os formatos classicos de correcao na Teoria das Ondas de Elliott.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Graus de onda', 15, 7) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Ondas dentro de ondas','body','Os padroes de Elliott sao fractais: cada onda e composta por ondas menores e faz parte de uma onda maior, em diferentes graus de tempo. Uma onda 3 no grafico diario, por exemplo, contem seu proprio conjunto de cinco ondas no grafico de menor tempo. Compreender os graus evita confundir a escala em que se esta analisando.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Os padroes de Elliott sao fractais: cada onda contem ondas menores e faz parte de uma maior.','answer',true,'explanation','A natureza fractal e essencial em Elliott, onde ondas se subdividem em graus menores e compoem graus maiores.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Elliott e Fibonacci', 20, 8) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Proporcoes nas ondas','body','Elliott e Fibonacci andam juntos, pois as relacoes entre as ondas costumam respeitar proporcoes como 0,618 e 1,618. Por exemplo, a onda 2 frequentemente retrai 61,8 por cento da onda 1, e a onda 3 costuma se estender 1,618 vezes a onda 1. Usar Fibonacci ajuda a projetar alvos e a validar as contagens de onda.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Como Fibonacci e usado junto com Elliott?','options',jsonb_build_array('Para ignorar as ondas','Para medir retracoes e extensoes entre as ondas','Para definir o horario do mercado','Para calcular dividendos'),'correctIndex',1,'explanation','As proporcoes de Fibonacci, como 0,618 e 1,618, ajudam a medir retracoes e extensoes das ondas e validar contagens.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Disciplina em Elliott', 10, 9) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Contagem com humildade','body','A Teoria de Elliott e poderosa, mas tambem subjetiva, e contar ondas exige humildade para ajustar a interpretacao conforme o mercado se desenrola. Operar Elliott com gerenciamento de risco e essencial, pois nenhuma contagem e garantida. O bom analista mantem cenarios alternativos e respeita os invalidadores dados pelas tres regras.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Por ser subjetiva, a contagem de ondas de Elliott deve vir acompanhada de gerenciamento de risco e cenarios alternativos.','answer',true,'explanation','Nenhuma contagem e garantida, entao manter cenarios alternativos e gerenciar risco e fundamental para operar Elliott.'), 1);

  -- ============ Corretoras (10 aulas) ============
  v_sub := 'Unidade';
  SELECT subtitle, order_index, image_url, icon_theme INTO v_sub, v_order, v_img, v_theme
  FROM public.trilha_units WHERE track_id = v_track AND title = 'Corretoras';
  DELETE FROM public.trilha_units WHERE track_id = v_track AND title = 'Corretoras';
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index, image_url, icon_theme)
  VALUES (v_track, 'Corretoras', COALESCE(v_sub, 'Unidade'), COALESCE(v_order, 999), v_img, COALESCE(v_theme, 'default'))
  RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O que é uma corretora', 10, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','A ponte para o mercado','body','Uma corretora (broker) é a empresa que conecta o seu dinheiro ao mercado financeiro, permitindo que você compre e venda ativos como pares de moedas, ações e índices. Sem ela, você não teria acesso aos preços nem conseguiria enviar ordens. Por exemplo, ao clicar em comprar EURUSD na plataforma, é a corretora quem recebe essa ordem e a executa no mercado.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Você consegue operar diretamente no mercado sem precisar de uma corretora.','answer',false,'explanation','A corretora é o intermediário obrigatório que conecta o trader ao mercado e executa as ordens. Sem ela não há acesso aos preços nem envio de ordens.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Como a corretora te conecta ao mercado', 15, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Do clique ao mercado','body','Quando você envia uma ordem, a corretora a roteia para o mercado ou para uma contraparte, devolvendo o preço de execução em milissegundos. Existem modelos como Market Maker (a corretora pode ser a contraparte) e STP/ECN (a ordem vai direto para provedores de liquidez). Entender esse fluxo ajuda a saber por que às vezes o preço executado é levemente diferente do que você viu na tela.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','No modelo ECN/STP, para onde a ordem do trader é encaminhada?','options',jsonb_build_array('Apenas para o caixa interno da corretora','Diretamente para provedores de liquidez no mercado','Para outro trader escolhido manualmente','Para o banco central do país'),'correctIndex',1,'explanation','No modelo ECN/STP a ordem é repassada diretamente a provedores de liquidez, sem a corretora atuar como contraparte.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Spread e comissões', 20, 2) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O custo de cada operação','body','O spread é a diferença entre o preço de compra (ask) e o preço de venda (bid) e representa um custo embutido em cada operação. Algumas corretoras cobram spread maior e zero comissão, outras oferecem spread baixo mas cobram uma comissão fixa por lote. Por exemplo, no EURUSD um spread de 1 pip já significa que você começa a operação levemente no negativo até o preço andar a seu favor.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','O spread é a diferença entre o preço de compra e o preço de venda de um ativo.','answer',true,'explanation','Exatamente. O spread é a diferença entre o ask (compra) e o bid (venda) e é um custo embutido em toda operação.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Tipos de conta', 10, 3) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Cent, Standard e ECN','body','Contas Cent operam valores em centavos, ideais para iniciantes testarem estratégias com risco minúsculo. Contas Standard usam lotes cheios e são o padrão da maioria dos traders, enquanto contas ECN oferecem spreads baixíssimos com cobrança de comissão, voltadas a quem busca execução rápida. A escolha depende do seu capital e do seu nível de experiência.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Qual tipo de conta é mais indicado para um iniciante testar estratégias com risco muito pequeno?','options',jsonb_build_array('Conta Standard','Conta ECN','Conta Cent','Conta institucional'),'correctIndex',2,'explanation','A conta Cent opera valores em centavos, permitindo testar estratégias reais com risco financeiro mínimo.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Regulação e segurança', 15, 4) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Onde seu dinheiro está protegido','body','Uma corretora regulada é fiscalizada por órgãos como CVM (Brasil), FCA (Reino Unido) ou CySEC (Chipre), o que obriga padrões de segurança e separação do dinheiro dos clientes. Verificar o número de licença no site do regulador é um passo essencial antes de depositar. Operar com corretora não regulada aumenta muito o risco de calote e de dificuldade para sacar.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Uma corretora regulada é obrigada a seguir padrões de segurança e a separar o dinheiro dos clientes do caixa da empresa.','answer',true,'explanation','A regulação impõe regras de segregação de contas e segurança, protegendo o dinheiro do cliente em caso de problemas com a corretora.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Depósito e saque', 20, 5) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Movimentando seu dinheiro','body','O depósito é o envio de dinheiro para a sua conta de trading, geralmente por Pix, cartão ou transferência, e costuma ser rápido. O saque é o caminho inverso e é onde muitas corretoras ruins criam dificuldades, por isso teste sacar um valor pequeno cedo. Sempre confira prazos, taxas e se o método de saque é o mesmo do depósito, regra comum por questões antilavagem.'), 0),
  (v_lesson, 'order', jsonb_build_object('prompt','Coloque na ordem correta os passos para retirar lucros pela primeira vez com segurança.','items',jsonb_build_array('Verificar prazos e taxas de saque da corretora','Solicitar um saque de valor pequeno para testar','Confirmar que o dinheiro chegou na conta bancária','Passar a sacar valores maiores com confiança')), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Execução de ordens', 10, 6) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Como sua ordem vira negócio','body','A execução de ordens é o processo de transformar seu clique em uma posição real no mercado, ao melhor preço disponível no momento. Em mercados rápidos, a velocidade e a qualidade dessa execução fazem diferença no resultado. Uma boa corretora oferece execução estável mesmo em momentos de alta volatilidade, como na divulgação de notícias econômicas.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Por que a qualidade da execução de ordens é mais importante em momentos de notícias econômicas?','options',jsonb_build_array('Porque o mercado fecha durante as notícias','Porque a volatilidade aumenta e os preços mudam muito rápido','Porque o spread sempre fica zero','Porque a corretora desliga a plataforma'),'correctIndex',1,'explanation','Em notícias a volatilidade dispara e os preços mudam rapidamente, exigindo execução rápida e estável para evitar prejuízos inesperados.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Slippage', 15, 7) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Quando o preço escorrega','body','Slippage é a diferença entre o preço que você esperava e o preço realmente executado, comum em momentos de baixa liquidez ou alta volatilidade. Pode ser positivo (a seu favor) ou negativo (contra você). Por exemplo, ao enviar uma ordem a mercado durante um anúncio importante, o preço pode escorregar alguns pips antes da execução acontecer.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','O slippage só pode acontecer contra o trader, nunca a seu favor.','answer',false,'explanation','O slippage pode ser negativo (contra) ou positivo (a favor). Em ambos os casos é a diferença entre o preço esperado e o executado.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Alavancagem oferecida', 20, 8) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Multiplicando a exposição','body','Alavancagem é a capacidade de controlar uma posição grande usando pouco capital, por exemplo 1:100 permite mover 100 mil dólares com apenas mil de margem. Ela multiplica tanto os lucros quanto os prejuízos, por isso é uma faca de dois gumes. Corretoras oferecem alavancagens diferentes, e usar alavancagem alta sem gestão de risco é uma das maiores causas de quebra de conta.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Com alavancagem 1:100, quanto de margem você precisa para controlar uma posição de 100 mil dólares?','options',jsonb_build_array('100 mil dólares','10 mil dólares','1 mil dólares','100 dólares'),'correctIndex',2,'explanation','Com 1:100 você precisa de 1 por cento do valor, ou seja, 1 mil dólares para controlar 100 mil. A alavancagem amplia lucros e perdas.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Como escolher uma corretora', 10, 9) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Checklist de decisão','body','Para escolher bem, verifique nesta ordem: regulação válida, custos (spread e comissão), facilidade de saque, qualidade de execução e suporte ao cliente. Leia avaliações reais de outros usuários e teste a plataforma em conta demo antes de depositar dinheiro de verdade. Uma corretora barata mas sem regulação raramente vale o risco.'), 0),
  (v_lesson, 'order', jsonb_build_object('prompt','Ordene as etapas de um bom processo para escolher uma corretora confiável.','items',jsonb_build_array('Confirmar a regulação no site do órgão fiscalizador','Comparar custos de spread e comissões','Testar a plataforma em conta demo','Fazer um depósito e um saque pequenos de teste')), 1);

  -- ============ MetaTrader (10 aulas) ============
  v_sub := 'Unidade';
  SELECT subtitle, order_index, image_url, icon_theme INTO v_sub, v_order, v_img, v_theme
  FROM public.trilha_units WHERE track_id = v_track AND title = 'MetaTrader';
  DELETE FROM public.trilha_units WHERE track_id = v_track AND title = 'MetaTrader';
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index, image_url, icon_theme)
  VALUES (v_track, 'MetaTrader', COALESCE(v_sub, 'Unidade'), COALESCE(v_order, 999), v_img, COALESCE(v_theme, 'default'))
  RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O que é o MetaTrader', 10, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','A plataforma mais usada','body','O MetaTrader é a plataforma de trading mais popular do mundo, usada para analisar gráficos, enviar ordens e rodar robôs. Existem duas versões principais: MT4 e MT5, ambas desenvolvidas pela MetaQuotes. É nela que você acompanha os preços em tempo real, aplica indicadores e executa suas estratégias de forma manual ou automatizada.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','O MetaTrader serve apenas para visualizar gráficos, não permite enviar ordens.','answer',false,'explanation','O MetaTrader permite analisar gráficos, enviar e gerenciar ordens, aplicar indicadores e rodar robôs (Expert Advisors).'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Diferenças entre MT4 e MT5', 15, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','MT4 x MT5','body','O MT4 foi feito focado em Forex e é mais simples, enquanto o MT5 é mais moderno, multimercado e permite operar ações, futuros e índices além de moedas. O MT5 tem mais timeframes, mais tipos de ordem e um testador de estratégia mais rápido. Apesar disso, robôs feitos para MT4 (linguagem MQL4) não funcionam no MT5 (MQL5), pois as linguagens são diferentes.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Qual afirmação sobre MT4 e MT5 está correta?','options',jsonb_build_array('Um robô feito para MT4 funciona normalmente no MT5','O MT5 é multimercado e suporta ações, futuros e índices','O MT4 tem mais timeframes que o MT5','MT4 e MT5 usam exatamente a mesma linguagem de programação'),'correctIndex',1,'explanation','O MT5 é multimercado e mais moderno. Robôs de MT4 (MQL4) não rodam no MT5 (MQL5) porque as linguagens são diferentes.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'A interface do MetaTrader', 20, 2) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Conhecendo a tela','body','A interface tem três áreas principais: o Gráfico no centro (onde os preços aparecem), o Navegador à esquerda (com indicadores e robôs) e o Terminal embaixo (com suas ordens, saldo e histórico). Dominar essas três áreas é o primeiro passo para operar com confiança. No Terminal, por exemplo, você acompanha o lucro flutuante das posições abertas em tempo real.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Em qual área do MetaTrader você acompanha suas ordens abertas, saldo e histórico?','options',jsonb_build_array('No Gráfico','No Navegador','No Terminal','Na barra de ferramentas superior'),'correctIndex',2,'explanation','O Terminal (parte inferior) mostra ordens abertas, saldo, margem e histórico de operações.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Aplicar indicadores', 10, 3) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Adicionando análise ao gráfico','body','Indicadores como Médias Móveis, RSI e MACD ajudam a interpretar o movimento dos preços. Para aplicá-los, abra o Navegador, expanda a pasta Indicadores e arraste o desejado para cima do gráfico, ou use o menu Inserir e depois Indicadores. Ao soltar, uma janela de configurações permite ajustar período e cores antes de confirmar.'), 0),
  (v_lesson, 'order', jsonb_build_object('prompt','Ordene os passos para aplicar uma Média Móvel no gráfico pelo Navegador.','items',jsonb_build_array('Abrir a janela do Navegador','Expandir a pasta Indicadores','Arrastar a Média Móvel para cima do gráfico','Ajustar o período e confirmar na janela de configurações')), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Tipos de ordem', 15, 4) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Mercado e pendente','body','Existem dois grandes tipos de ordem: a mercado, executada imediatamente no preço atual, e a pendente, que só dispara quando o preço atinge um nível definido por você. Use ordem a mercado quando quer entrar agora e pendente quando quer esperar o preço chegar a um ponto específico. Por exemplo, uma ordem pendente pode entrar comprado apenas se o preço romper uma resistência.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Uma ordem a mercado é executada imediatamente no preço atual disponível.','answer',true,'explanation','A ordem a mercado entra de imediato no melhor preço atual. Já a pendente só dispara quando o preço atinge o nível definido.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Buy e Sell, Limit e Stop', 20, 5) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','As quatro ordens pendentes','body','Buy Limit compra abaixo do preço atual (esperando o preço cair antes de subir) e Sell Limit vende acima do preço atual. Buy Stop compra acima do preço atual (apostando na continuação da alta após o rompimento) e Sell Stop vende abaixo. A regra prática: Limit espera o preço voltar a seu favor, Stop espera o preço romper na direção da ordem.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Você quer comprar somente se o preço subir e romper uma resistência acima do nível atual. Qual ordem usar?','options',jsonb_build_array('Buy Limit','Buy Stop','Sell Limit','Sell Stop'),'correctIndex',1,'explanation','Buy Stop é colocada acima do preço atual e dispara a compra quando o preço sobe e rompe aquele nível.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Anexar Stop Loss e Take Profit', 10, 6) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Definindo perda e ganho','body','O Stop Loss (SL) é o preço onde sua posição fecha automaticamente no prejuízo, limitando a perda, e o Take Profit (TP) fecha automaticamente no lucro alvo. Definir ambos ao abrir a ordem é uma regra de ouro da gestão de risco. Por exemplo, ao comprar EURUSD a 1.1000, você pode colocar SL em 1.0980 e TP em 1.1040.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','O Stop Loss fecha automaticamente a posição quando ela atinge um nível de prejuízo definido, limitando a perda.','answer',true,'explanation','O Stop Loss protege o capital fechando a operação num nível de perda predefinido. O Take Profit faz o mesmo no lucro alvo.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Modificar ordens', 15, 7) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Ajustando posições abertas','body','Você pode alterar o Stop Loss e o Take Profit de uma posição já aberta sem precisar fechá-la. Para isso, clique com o botão direito na ordem dentro do Terminal e escolha Modificar ou Excluir Ordem, depois ajuste os valores. Isso é útil, por exemplo, para mover o Stop Loss para o ponto de entrada e proteger o lucro já conquistado.'), 0),
  (v_lesson, 'order', jsonb_build_object('prompt','Ordene os passos para mover o Stop Loss de uma posição já aberta.','items',jsonb_build_array('Localizar a posição na aba Negociação do Terminal','Clicar com o botão direito sobre ela','Escolher a opção Modificar ou Excluir Ordem','Digitar o novo Stop Loss e confirmar')), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Timeframes na plataforma', 20, 8) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O tempo de cada vela','body','O timeframe define quanto tempo cada vela (candle) representa, podendo ser M1 (1 minuto), M15, H1 (1 hora), D1 (diário) e outros. Timeframes menores mostram mais detalhes e ruído, enquanto os maiores mostram a tendência geral. Muitos traders combinam dois: um maior para ver a direção e um menor para escolher o momento exato de entrada.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','No MetaTrader, o que significa o timeframe H1?','options',jsonb_build_array('Cada vela representa 1 minuto','Cada vela representa 1 hora','Cada vela representa 1 dia','Cada vela representa 1 semana'),'correctIndex',1,'explanation','H1 significa que cada candle representa 1 hora de movimento de preço. M de minutos, H de horas, D de dias.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Testador de estratégia', 10, 9) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Testando antes de operar','body','O Testador de Estratégia do MetaTrader permite simular como um robô teria se comportado em dados históricos, sem arriscar dinheiro real. Você escolhe o ativo, o período e a qualidade dos dados e a plataforma mostra o resultado em forma de relatório e gráfico de capital. É uma ferramenta essencial para validar uma estratégia antes de colocá-la em conta real.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','O Testador de Estratégia permite simular um robô em dados históricos sem usar dinheiro real.','answer',true,'explanation','O Testador roda a estratégia sobre dados passados e gera um relatório, permitindo avaliar o desempenho antes de operar de verdade.'), 1);

  -- ============ Expert Advisors (10 aulas) ============
  v_sub := 'Unidade';
  SELECT subtitle, order_index, image_url, icon_theme INTO v_sub, v_order, v_img, v_theme
  FROM public.trilha_units WHERE track_id = v_track AND title = 'Expert Advisors';
  DELETE FROM public.trilha_units WHERE track_id = v_track AND title = 'Expert Advisors';
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index, image_url, icon_theme)
  VALUES (v_track, 'Expert Advisors', COALESCE(v_sub, 'Unidade'), COALESCE(v_order, 999), v_img, COALESCE(v_theme, 'default'))
  RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'O que é um Expert Advisor', 10, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O robô que opera por você','body','Um Expert Advisor (EA) é um robô programado para analisar o mercado e enviar ordens automaticamente seguindo regras definidas, sem precisar de cliques manuais. Ele roda dentro do MetaTrader anexado a um gráfico. Por exemplo, um EA pode ser programado para comprar sempre que duas médias móveis se cruzarem, executando a estratégia de forma totalmente automática.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Um Expert Advisor é um robô que envia ordens automaticamente seguindo regras programadas.','answer',true,'explanation','O EA é um robô que executa uma estratégia automaticamente dentro do MetaTrader, sem necessidade de operação manual.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Vantagens do EA', 15, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Sem emoção e sem parar','body','A maior vantagem de um EA é eliminar a emoção: ele não sente medo nem ganância e segue o plano com disciplina absoluta. Além disso, opera 24 horas (no mercado Forex) sem cansaço, podendo aproveitar oportunidades enquanto você dorme. A velocidade de execução também é uma vantagem, já que ele reage em milissegundos a uma condição do mercado.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Qual é uma vantagem clara de usar um Expert Advisor em vez de operar manualmente?','options',jsonb_build_array('Garante lucro em toda operação','Elimina a emoção e segue o plano com disciplina','Dispensa qualquer gestão de risco','Funciona mesmo com a plataforma fechada'),'correctIndex',1,'explanation','O EA segue regras sem medo nem ganância, operando com disciplina e velocidade. Mas não garante lucro nem dispensa gestão de risco.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Riscos do EA', 20, 2) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Ele faz só o que foi programado','body','O grande risco de um EA é que ele faz exatamente o que foi programado, nem mais nem menos, mesmo que isso seja um erro. Se a estratégia for ruim ou houver uma falha no código, ele pode perder dinheiro rapidamente e de forma consistente. Por isso o robô nunca substitui o entendimento da estratégia: você precisa saber o que ele faz e supervisioná-lo.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Um EA consegue identificar sozinho quando sua estratégia está errada e parar de operar para se proteger.','answer',false,'explanation','O EA apenas executa o que foi programado. Se a estratégia ou o código tiverem falhas, ele continuará operando e poderá perder dinheiro.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Parâmetros do EA', 10, 3) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Configurando o robô','body','Parâmetros são as configurações que controlam o comportamento do EA, como tamanho do lote, distância de entrada, Stop Loss e Take Profit. Ajustá-los corretamente é o que adapta o robô ao seu capital e ao seu perfil de risco. Por exemplo, aumentar o lote multiplica os ganhos e as perdas, então esse parâmetro deve ser tratado com muito cuidado.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Qual parâmetro do EA controla diretamente o tamanho da exposição financeira em cada operação?','options',jsonb_build_array('O timeframe do gráfico','O tamanho do lote','A cor das velas','O nome do robô'),'correctIndex',1,'explanation','O tamanho do lote define o quanto cada operação movimenta, impactando diretamente lucros e perdas potenciais.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Comece com lote mínimo', 15, 4) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Testar com risco pequeno','body','Ao colocar um EA novo em conta real, comece sempre com o lote mínimo possível para testar o comportamento dele com risco minúsculo. Assim você observa se ele opera como esperado, se a corretora executa bem as ordens e se não há erros, sem arriscar muito capital. Só aumente o lote depois de comprovar consistência por um período razoável.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Ao iniciar um EA novo em conta real, o ideal é começar com lote mínimo para reduzir o risco enquanto observa o comportamento.','answer',true,'explanation','Começar com lote mínimo permite validar o robô em condições reais com risco baixo antes de aumentar a exposição.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Backtest', 20, 5) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Testando no passado','body','Backtest é o teste do EA sobre dados históricos para ver como ele teria se comportado no passado, usando o Testador de Estratégia do MetaTrader. Um bom backtest usa dados de qualidade e um período longo, incluindo mercados de alta, baixa e lateral. Lembre-se: um resultado bom no passado não garante o futuro, mas um resultado ruim já é um forte sinal de alerta.'), 0),
  (v_lesson, 'order', jsonb_build_object('prompt','Ordene os passos para fazer um backtest básico de um EA no MetaTrader.','items',jsonb_build_array('Abrir o Testador de Estratégia','Selecionar o EA, o ativo e o timeframe','Definir o período histórico e a qualidade dos dados','Iniciar o teste e analisar o relatório de resultados')), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Otimização', 10, 6) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Cuidado com o overfitting','body','Otimização é o processo de testar várias combinações de parâmetros para encontrar as que deram melhor resultado no histórico. O perigo é o overfitting, quando os parâmetros ficam perfeitos demais para o passado mas falham no futuro, como uma chave que só abre uma fechadura específica. Para evitar isso, prefira parâmetros robustos que funcionam bem em várias condições, não apenas os números mágicos que maximizam o lucro histórico.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O que é overfitting em uma otimização de EA?','options',jsonb_build_array('Quando o robô opera rápido demais','Quando os parâmetros se ajustam perfeitamente ao passado mas falham no futuro','Quando o lote é muito grande','Quando o backtest usa pouca memória do computador'),'correctIndex',1,'explanation','Overfitting é ajustar os parâmetros perfeitamente ao histórico, gerando resultados ilusórios que não se repetem no mercado real.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'VPS para EA', 15, 7) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Mantendo o robô sempre ligado','body','Um VPS (Servidor Virtual Privado) é um computador na nuvem que fica ligado 24 horas, permitindo que o EA opere sem depender do seu PC estar ligado ou da sua internet. Sem VPS, se seu computador desligar ou cair a conexão, o robô para de funcionar. É especialmente importante para estratégias que precisam reagir a qualquer momento do dia.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Um VPS permite que o Expert Advisor continue operando mesmo com o seu computador pessoal desligado.','answer',true,'explanation','O VPS é um servidor na nuvem sempre ligado, garantindo que o EA opere de forma contínua independente do seu PC e internet.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Monitorar o robô', 20, 8) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Supervisão constante','body','Mesmo automatizado, o EA precisa de acompanhamento: verifique se ele está conectado, se a carinha está sorrindo no gráfico e acompanhe a aba Diário (Journal) em busca de erros. Mudanças bruscas de mercado ou problemas na corretora podem exigir sua intervenção. Monitorar não significa desconfiar do robô, mas garantir que tudo opera dentro do esperado.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Onde no MetaTrader você verifica mensagens e possíveis erros de funcionamento do EA?','options',jsonb_build_array('Na aba Diário (Journal)','No Navegador','Na janela de cores do gráfico','No menu Ajuda'),'correctIndex',0,'explanation','A aba Diário (Journal) registra mensagens, conexões e erros, sendo o lugar certo para monitorar o funcionamento do EA.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Gestão de risco com EA', 10, 9) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Protegendo o capital','body','Gestão de risco é tão importante com robô quanto na operação manual: defina quanto está disposto a perder por operação e no total, normalmente arriscando uma pequena porcentagem do capital por trade. Configure o lote de acordo com o tamanho da sua conta e use Stop Loss sempre. Um EA lucrativo com gestão de risco ruim ainda pode quebrar a conta numa sequência de perdas.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Mesmo usando um EA, é dispensável definir limites de risco porque o robô nunca erra.','answer',false,'explanation','Gestão de risco é essencial com EA. Sem limites e Stop Loss, uma sequência de perdas pode quebrar a conta mesmo com um robô bom.'), 1);

  -- ============ Instalando um Expert Advisor (10 aulas) ============
  v_sub := 'Unidade';
  SELECT subtitle, order_index, image_url, icon_theme INTO v_sub, v_order, v_img, v_theme
  FROM public.trilha_units WHERE track_id = v_track AND title = 'Instalando um Expert Advisor';
  DELETE FROM public.trilha_units WHERE track_id = v_track AND title = 'Instalando um Expert Advisor';
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index, image_url, icon_theme)
  VALUES (v_track, 'Instalando um Expert Advisor', COALESCE(v_sub, 'Unidade'), COALESCE(v_order, 999), v_img, COALESCE(v_theme, 'default'))
  RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Abrir a Pasta de Dados', 10, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O ponto de partida','body','Todo arquivo do MetaTrader fica dentro da chamada Pasta de Dados, e é ali que você instala os robôs. Para abri-la, vá no menu Arquivo e clique em Abrir Pasta de Dados, que abrirá uma janela do Windows com as pastas internas da plataforma. Esse é sempre o primeiro passo para instalar qualquer EA manualmente.'), 0),
  (v_lesson, 'order', jsonb_build_object('prompt','Ordene os passos para abrir a Pasta de Dados do MetaTrader.','items',jsonb_build_array('Abrir o MetaTrader','Clicar no menu Arquivo','Selecionar Abrir Pasta de Dados','Aguardar a janela do Windows abrir com as pastas internas')), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'A pasta MQL5 e Experts', 15, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Onde os robôs moram','body','Dentro da Pasta de Dados existe a pasta MQL5 e, dentro dela, a pasta Experts, que é o local exato onde os Expert Advisors devem ficar. No MT4 a pasta equivalente é MQL4 e Experts. Indicadores e scripts ficam em pastas separadas, então respeitar essa estrutura é essencial para o robô aparecer corretamente.'), 0),
  (v_lesson, 'order', jsonb_build_object('prompt','Ordene o caminho de pastas até chegar onde o EA deve ser colocado no MT5.','items',jsonb_build_array('Pasta de Dados','Pasta MQL5','Pasta Experts')), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Copiar o arquivo ex5', 20, 2) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Colocando o robô no lugar','body','O arquivo do robô compilado tem a extensão ex5 (no MT5) ou ex4 (no MT4). Copie esse arquivo e cole-o dentro da pasta Experts que você abriu. Se você recebeu o código-fonte mq5, ele também pode ser colocado ali, mas é o arquivo ex5 que o MetaTrader executa diretamente.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','O arquivo de um Expert Advisor compilado para MT5 tem a extensão ex5.','answer',true,'explanation','No MT5 o robô compilado tem extensão ex5 (no MT4 é ex4) e deve ser colado dentro da pasta Experts.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Atualizar o Navegador', 10, 3) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Fazendo o robô aparecer','body','Depois de copiar o arquivo, volte ao MetaTrader e atualize o Navegador para que o robô apareça na lista. Para isso, clique com o botão direito dentro do Navegador e escolha Atualizar, ou apenas reinicie a plataforma. O EA deverá então surgir dentro da pasta Expert Advisors do Navegador.'), 0),
  (v_lesson, 'order', jsonb_build_object('prompt','Ordene os passos para fazer o EA recém-copiado aparecer no Navegador.','items',jsonb_build_array('Voltar para a janela do MetaTrader','Clicar com o botão direito dentro do Navegador','Escolher a opção Atualizar','Localizar o EA na pasta Expert Advisors')), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Arrastar o EA para o gráfico', 15, 4) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Ativando no gráfico','body','Para colocar o robô para rodar, abra o gráfico do ativo desejado no timeframe correto e arraste o EA do Navegador para cima desse gráfico. Cada gráfico roda um único EA por vez. Certifique-se de soltar o robô no gráfico certo, pois ele vai operar exatamente aquele ativo e período.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Você pode rodar vários Expert Advisors diferentes ao mesmo tempo em um único gráfico.','answer',false,'explanation','Cada gráfico comporta apenas um EA por vez. Para rodar vários robôs, abra um gráfico para cada um.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'A janela de configurações', 20, 5) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Ajustando antes de iniciar','body','Ao arrastar o EA para o gráfico, abre-se uma janela de configurações com as abas Comum e Parâmetros de Entrada. Na aba Comum você habilita opções de negociação, e na aba Parâmetros de Entrada você ajusta lote, Stop Loss e demais valores do robô. Revise tudo com calma antes de clicar em OK, pois esses ajustes definem como ele vai operar.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Em qual aba da janela de configurações você ajusta o tamanho do lote e o Stop Loss do EA?','options',jsonb_build_array('Aba Comum','Aba Parâmetros de Entrada','Aba Cores','Aba Visualização'),'correctIndex',1,'explanation','A aba Parâmetros de Entrada contém os valores configuráveis do robô, como lote e Stop Loss. A aba Comum trata de permissões gerais.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Permitir negociação algorítmica', 10, 6) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Liberando as ordens','body','Na aba Comum da janela de configurações, é importante marcar a opção que permite a negociação algorítmica, autorizando o robô a enviar ordens. Sem essa permissão, o EA pode ser anexado ao gráfico mas não conseguirá operar. Em versões do MT5, essa opção aparece como Permitir negociação algorítmica ou Allow Algo Trading.'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Se a negociação algorítmica não estiver permitida, o EA pode ficar no gráfico mas não consegue enviar ordens.','answer',true,'explanation','Sem a permissão de negociação algorítmica o robô não envia ordens, mesmo estando anexado ao gráfico.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Ligar o AutoTrading', 15, 7) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O botão mestre','body','Além da permissão individual do EA, existe o botão geral AutoTrading na barra de ferramentas superior do MetaTrader, que funciona como um interruptor mestre para todos os robôs. Ele precisa estar ligado (verde) para qualquer EA operar. Se estiver desligado (vermelho), nenhum robô enviará ordens, mesmo que tudo o mais esteja configurado certo.'), 0),
  (v_lesson, 'order', jsonb_build_object('prompt','Ordene os passos finais para deixar o EA apto a operar de verdade.','items',jsonb_build_array('Marcar Permitir negociação algorítmica na aba Comum','Confirmar as configurações clicando em OK','Clicar no botão AutoTrading na barra superior para deixá-lo verde','Verificar se o robô passou a poder enviar ordens')), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Confirmar a carinha feliz', 20, 8) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O sinal de que está rodando','body','No canto superior direito do gráfico, ao lado do nome do EA, aparece um rostinho. A carinha feliz (sorrindo) indica que o robô está ativo e pronto para operar, enquanto a carinha triste indica que a negociação algorítmica está desligada. Sempre confira esse ícone após anexar o EA, pois é o atalho visual mais rápido para saber se está tudo certo.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O que indica a carinha feliz no canto superior direito do gráfico com um EA anexado?','options',jsonb_build_array('Que o robô teve lucro','Que o robô está ativo e pronto para operar','Que a internet está rápida','Que o gráfico está no timeframe certo'),'correctIndex',1,'explanation','A carinha feliz mostra que o EA está ativo e habilitado a operar. A carinha triste indica que a negociação algorítmica está desligada.'), 1);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Diagnosticar problemas comuns', 10, 9) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Quando o robô não opera','body','Se o EA não está operando, siga uma checagem em ordem: confira se a carinha está feliz, se o botão AutoTrading está verde, se a opção de negociação algorítmica foi marcada e se a conta está conectada à corretora. Por fim, leia a aba Diário (Journal) e a aba Especialistas (Experts) em busca de mensagens de erro. Na maioria dos casos, o problema é uma dessas permissões desligada.'), 0),
  (v_lesson, 'order', jsonb_build_object('prompt','Ordene a sequência lógica para diagnosticar por que um EA não está enviando ordens.','items',jsonb_build_array('Verificar se a carinha no gráfico está feliz','Conferir se o botão AutoTrading está verde','Checar se a negociação algorítmica foi permitida nas configurações','Ler a aba Diário em busca de mensagens de erro')), 1);

END $$;
