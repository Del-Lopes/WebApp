-- ============================================================
-- Trilha Gain — unidade prática "Instalando um Expert Advisor"
-- Posiciona a unidade logo após "Expert Advisors" e antes da
-- unidade paga "Método APP". Idempotente.
-- Rodar DEPOIS de 20260709 (novas unidades) e 20260711 (Método APP).
-- ============================================================

DO $$
DECLARE
  v_track  uuid;
  v_unit   uuid;
  v_lesson uuid;
  v_after  integer;
BEGIN
  SELECT id INTO v_track FROM public.trilha_tracks WHERE title = 'Jornada do Trader';
  IF v_track IS NULL THEN
    RAISE EXCEPTION 'Trilha "Jornada do Trader" não encontrada.';
  END IF;

  DELETE FROM public.trilha_units WHERE track_id = v_track AND title = 'Instalando um Expert Advisor';
  -- order_index temporário; reordenado abaixo para ficar após "Expert Advisors" e antes da paga
  INSERT INTO public.trilha_units (track_id, title, subtitle, order_index)
  VALUES (v_track, 'Instalando um Expert Advisor', 'Unidade prática', 100) RETURNING id INTO v_unit;

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Abrir a Pasta de Dados', 10, 0) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Comece pela Pasta de Dados','body','O MetaTrader guarda os robôs numa pasta específica — e ela NÃO é a pasta onde o programa foi instalado. Para achá-la, abra o MetaTrader 5 e vá em: Arquivo → Abrir Pasta de Dados. Uma janela do Windows vai abrir mostrando as pastas internas do MT5.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Como abrir a pasta correta para instalar o robô?','options',jsonb_build_array('Procurar na pasta de instalação do programa','Arquivo → Abrir Pasta de Dados','Pelo navegador de internet','Não precisa de pasta'),'correctIndex',1,'explanation','O caminho certo é Arquivo → Abrir Pasta de Dados, dentro do MetaTrader.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','A pasta dos robôs é sempre a mesma da instalação do MetaTrader.','answer',false,'explanation','Não: use Arquivo → Abrir Pasta de Dados; ela costuma ficar em outro local (AppData).'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Colocar o arquivo em Experts', 15, 1) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','A pasta MQL5 → Experts','body','Dentro da Pasta de Dados, abra a pasta MQL5 e depois a pasta Experts. É aqui que ficam os Expert Advisors. Copie o arquivo do robô (extensão .ex5, ou .mq5 se for o código-fonte) para dentro desta pasta Experts.'), 0),
  (v_lesson, 'order', jsonb_build_object('prompt','Ordene o caminho até a pasta do robô:','items',jsonb_build_array('Abrir Pasta de Dados','Entrar na pasta MQL5','Entrar na pasta Experts','Colar o arquivo do EA')), 1),
  (v_lesson, 'quiz', jsonb_build_object('question','Qual a extensão do robô já compilado, pronto para uso?','options',jsonb_build_array('.txt','.ex5','.jpg','.pdf'),'correctIndex',1,'explanation','O .ex5 é o robô compilado. O .mq5 é o código-fonte (precisa compilar).'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Atualizar a Navegação', 10, 2) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Fazer o MT5 reconhecer o robô','body','Depois de colar o arquivo, volte ao MetaTrader. No painel Navegador (à esquerda), clique com o botão direito sobre "Expert Advisors" e escolha Atualizar. O seu robô deve aparecer na lista. Se não abriu o Navegador, use o menu Exibir → Navegador (ou Ctrl+N).'), 0),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Após copiar o arquivo, é preciso Atualizar o Navegador para o robô aparecer.','answer',true,'explanation','Sim: botão direito em Expert Advisors → Atualizar faz o MT5 reconhecer o novo robô.'), 1),
  (v_lesson, 'quiz', jsonb_build_object('question','Onde o robô aparece dentro do MetaTrader?','options',jsonb_build_array('Na aba Notícias','No painel Navegador, em Expert Advisors','No histórico de conta','No chat'),'correctIndex',1,'explanation','Ele aparece no Navegador, dentro de Expert Advisors.'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Arrastar para o gráfico', 15, 3) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Aplicar o robô no ativo','body','Abra o gráfico do ativo que você quer operar (ex.: um par de forex ou índice). Depois, arraste o robô do Navegador para cima desse gráfico — ou dê duplo clique nele. Uma janela de configurações vai abrir.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Como aplicar o robô no ativo desejado?','options',jsonb_build_array('Arrastar o EA do Navegador para o gráfico','Reiniciar o computador','Mandar e-mail para a corretora','Imprimir o gráfico'),'correctIndex',0,'explanation','Arraste (ou dê duplo clique) o EA sobre o gráfico do ativo.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','O robô deve ser aplicado no gráfico do ativo que você quer operar.','answer',true,'explanation','Sim: cada robô roda no gráfico do ativo escolhido.'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Permitir negociação automática', 20, 4) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','Liberar o AutoTrading','body','Na janela que abre ao aplicar o robô, na aba "Comum", marque a opção "Permitir negociação algorítmica" (e, se o robô pedir, "Permitir importação de DLL"). Confirme em OK. Depois, no topo do MetaTrader, o botão "Negociação Algorítmica" (AutoTrading) precisa estar LIGADO (verde).'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','O que precisa estar LIGADO para o robô operar?','options',jsonb_build_array('O modo escuro','O botão Negociação Algorítmica (AutoTrading)','O som do MetaTrader','A impressora'),'correctIndex',1,'explanation','Sem o AutoTrading ligado, o robô não envia ordens.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Se o AutoTrading estiver desligado, o robô não vai operar.','answer',true,'explanation','Correto: o botão de Negociação Algorítmica precisa estar ativo (verde).'), 2);

  INSERT INTO public.trilha_lessons (unit_id, title, xp_reward, order_index)
  VALUES (v_unit, 'Confirmar que está rodando', 20, 5) RETURNING id INTO v_lesson;
  INSERT INTO public.trilha_steps (lesson_id, type, payload, order_index) VALUES
  (v_lesson, 'concept', jsonb_build_object('title','O sinal de que deu certo','body','Com tudo certo, no canto superior direito do gráfico aparece o nome do robô e uma "carinha feliz" (☺) azul. Carinha triste ou um X vermelho indica que algo está bloqueado — geralmente o AutoTrading desligado ou permissões faltando. Confira a aba "Especialistas" para ver mensagens do robô.'), 0),
  (v_lesson, 'quiz', jsonb_build_object('question','Qual sinal mostra que o robô está ativo no gráfico?','options',jsonb_build_array('Um X vermelho','Uma carinha feliz azul no canto do gráfico','O gráfico fica preto','Nenhum'),'correctIndex',1,'explanation','A carinha feliz (☺) no canto superior direito indica que o robô está rodando.'), 1),
  (v_lesson, 'truefalse', jsonb_build_object('statement','Uma carinha triste no canto do gráfico indica que algo está bloqueando o robô.','answer',true,'explanation','Sim: normalmente é o AutoTrading desligado ou permissões faltando.'), 2);

  -- Reposiciona: logo após "Expert Advisors".
  SELECT order_index INTO v_after FROM public.trilha_units
  WHERE track_id = v_track AND title = 'Expert Advisors';

  IF v_after IS NOT NULL THEN
    -- Abre espaço: empurra +1 quem vier depois de "Expert Advisors" (exceto esta unidade).
    UPDATE public.trilha_units SET order_index = order_index + 1
    WHERE track_id = v_track AND order_index > v_after AND title <> 'Instalando um Expert Advisor';
    -- Coloca a nova unidade na posição seguinte.
    UPDATE public.trilha_units SET order_index = v_after + 1
    WHERE track_id = v_track AND title = 'Instalando um Expert Advisor';
  END IF;
END $$;
