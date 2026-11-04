import { AR, H, HL, Illu, LN, MA, IND, PT, S, T, VL, Z, st, zz, cs } from './dsl';

type Entry = [unit: string, lesson: string, illu: Illu];

// Primeiros Passos, Gerenciamento de Risco, Indicadores e Timeframes.
const calc = (k: Extract<Illu, { t: 'calc' }>['k']): Illu => ({ t: 'calc', k });

// Série usada em várias aulas de indicadores: sobe, estica, corrige e volta a subir.
const swing = () => zz([[0, 50], [8, 62], [14, 56], [22, 74], [28, 66], [36, 84], [40, 70], [46, 62], [52, 74], [58, 64]], 1.3, 1, 3);
// Mercado com tendência de alta limpa e depois lateral.
const trendThenRange = () => zz([[0, 40], [22, 70], [26, 66], [30, 71], [34, 65], [38, 70], [42, 64], [46, 69], [50, 65], [54, 68], [58, 66]], 1, 0.9, 5);

export const MARKET_ILLUS: Entry[] = [
  // ─────────── Primeiros Passos ───────────
  ['Primeiros Passos', 'O que é o mercado financeiro', S(
    zz([[0, 50], [5, 60], [9, 54], [14, 66], [18, 57], [23, 62]], 0.9, 1, 2),
    [
      st('O gráfico mostra o preço mudando o tempo todo. Quem faz ele se mexer? Compradores e vendedores.', T(8, 46, '↑ preço', 'mu')),
      st('Quando os compradores dominam, aceitam pagar mais e o preço sobe.', AR([0, 49], [5, 61], 'up'), T(0, 66, 'Compradores empurram', 'up')),
      st('Quando os vendedores dominam, aceitam receber menos e o preço cai.', AR([5, 61], [9, 53], 'dn'), T(5, 49, 'Vendedores empurram', 'dn')),
      st('O preço é o encontro das duas forças. No trading, você tenta acertar para onde ele vai.', HL([5, 9, 14, 18], 'ac')),
    ])],
  ['Primeiros Passos', 'Oferta e demanda', calc('balance')],
  ['Primeiros Passos', 'O que é o spread', calc('spread')],
  ['Primeiros Passos', 'Liquidez', { t: 'compare',
    a: { t: 'Alta liquidez', tone: 'up', pts: ['Muitos compradores e vendedores ao mesmo tempo (ex.: EURUSD, S&P 500).', 'Spread baixo: entrar e sair custa pouco.', 'Sua ordem é executada no preço que você viu.', 'Movimentos mais "limpos" e previsíveis.'] },
    b: { t: 'Baixa liquidez', tone: 'dn', pts: ['Poucos participantes (ex.: pares exóticos, horários mortos).', 'Spread largo: você já entra bem no negativo.', 'A ordem pode ser executada longe do preço esperado.', 'Saltos bruscos de preço, difíceis de operar.'] },
    foot: 'Para quem está começando, liquidez alta é aliada: custo menor e execução previsível.' }],
  ['Primeiros Passos', 'Forex e índices', { t: 'reveal', lead: 'Toque em cada mercado.', items: [
    { h: 'Forex (moedas)', b: 'Você negocia pares como EURUSD e GBPJPY: compra uma moeda e vende a outra. É o mercado mais líquido do mundo e abre 24h nos dias úteis.' },
    { h: 'Índices', b: 'Representam uma cesta de empresas (S&P 500, Nasdaq, Ibovespa). Se a economia vai bem, o índice tende a subir. Negociados via contratos (CFD ou mini-índice).' },
    { h: 'Ouro e commodities', b: 'O ouro (XAUUSD) é um clássico de proteção em crises. Petróleo e outras commodities respondem a oferta, demanda e geopolítica.' },
    { h: 'Cripto', b: 'Bitcoin e outras moedas digitais: mercado 24h/7 e muito volátil. Mais oportunidade e mais risco.' },
  ] }],
  ['Primeiros Passos', 'O que é um lote', calc('lot')],
  ['Primeiros Passos', 'Alavancagem', calc('lev')],
  ['Primeiros Passos', 'Margem', calc('margin')],
  ['Primeiros Passos', 'Pip e ponto', calc('pip')],
  ['Primeiros Passos', 'Horários de mercado', calc('hours')],

  // ─────────── Gerenciamento de Risco ───────────
  ['Gerenciamento de Risco', 'Stop loss', calc('sl')],
  ['Gerenciamento de Risco', 'Take profit', calc('tp')],
  ['Gerenciamento de Risco', 'Risco por operação', calc('risk')],
  ['Gerenciamento de Risco', 'Relação risco e retorno', calc('rr')],
  ['Gerenciamento de Risco', 'Position sizing', calc('size')],
  ['Gerenciamento de Risco', 'Drawdown', calc('dd')],
  ['Gerenciamento de Risco', 'Não mover o stop', { t: 'fork',
    q: 'Você comprou com stop em 1.0820. O preço cai e chega perto do stop. O que faz?',
    opts: [
      { l: 'Afasto o stop "só um pouquinho" para dar tempo ao trade', t: 'bad', o: 'O preço continuou caindo e o prejuízo, que era de 1%, virou 4%. Mover o stop contra você transforma uma perda planejada em uma perda sem limite.' },
      { l: 'Deixo o stop onde está e aceito a perda', t: 'good', o: 'Perda de 1%, exatamente a planejada. O plano foi respeitado, o capital está protegido e a próxima operação começa limpa.' },
      { l: 'Retiro o stop e fico olhando', t: 'bad', o: 'Sem stop, a esperança vira estratégia. Uma única operação ruim pode comer semanas de lucro.' },
    ],
    takeaway: 'O stop só pode andar a seu favor (proteger lucro), nunca para aumentar o risco.' }],
  ['Gerenciamento de Risco', 'Gestão emocional do risco', { t: 'fork',
    q: 'Você levou 3 stops seguidos e está irritado. O que faz agora?',
    opts: [
      { l: 'Entro de novo com lote maior para recuperar rápido', t: 'bad', o: 'É o "revenge trading": decisões no calor da emoção, lote maior e análise pior. Costuma transformar um dia ruim em um desastre.' },
      { l: 'Paro, faço uma pausa e reviso o que aconteceu', t: 'good', o: 'Pausar quebra o ciclo emocional. Revisar as 3 operações mostra se foi azar normal ou erro de execução.' },
      { l: 'Sigo operando do mesmo jeito, sem refletir', t: 'mid', o: 'Sequências de perdas fazem parte, mas sem revisar você não sabe se há um erro. Pelo menos defina um limite de perda diária.' },
    ],
    takeaway: 'Defina antes um limite de perdas por dia. Bateu o limite, o dia acabou.' }],
  ['Gerenciamento de Risco', 'Diversificação', { t: 'fork',
    q: 'Você compra EURUSD, GBPUSD e AUDUSD ao mesmo tempo, 1% em cada. Isso é diversificar?',
    opts: [
      { l: 'Sim, são três ativos diferentes', t: 'bad', o: 'Os três têm o dólar como outro lado e andam muito juntos (alta correlação). Se o dólar sobe, os três perdem juntos: na prática é um risco de 3%, não três de 1%.' },
      { l: 'Não, estão correlacionados: é quase a mesma aposta', t: 'good', o: 'Isso! Diversificar de verdade é combinar ativos que não se movem juntos, ou reduzir o risco de cada um quando são correlacionados.' },
    ],
    takeaway: 'Antes de abrir outra posição, pergunte: ela perde ao mesmo tempo que a primeira?' }],
  ['Gerenciamento de Risco', 'O erro de dobrar a aposta', calc('mart')],

  // ─────────── Indicadores ───────────
  ['Indicadores', 'O que é um indicador', S(swing(), [
    st('Este é o preço puro, como o mercado entrega.'),
    st('Um indicador de tendência (média móvel) suaviza o preço e mostra a direção geral.', MA(10)),
    st('Um indicador de força (RSI) aparece embaixo e mede se o movimento está esticado.', IND('rsi')),
    st('Indicadores são cálculos feitos sobre o preço: ajudam a ler, mas não preveem o futuro.'),
  ])],
  ['Indicadores', 'Médias móveis', S(swing(), [
    st('Use o seletor e o controle de período: a média suaviza o preço. Quanto maior o período, mais lenta ela fica.'),
  ], { ctrl: 'ma', ctrlDef: 10 })],
  ['Indicadores', 'RSI', S(swing(), [
    st('O RSI mede a força do movimento, de 0 a 100, no painel de baixo.', IND('rsi')),
    st('Acima de 70 o preço está "sobrecomprado" (esticado para cima); abaixo de 30, "sobrevendido".', IND('rsi')),
    st('Sobrecomprado não significa "vai cair já": em tendência forte o RSI fica no alto por muito tempo. Use junto com o contexto.', IND('rsi')),
  ])],
  ['Indicadores', 'MACD', S(swing(), [
    st('O MACD compara duas médias para medir o momento do preço.', IND('macd')),
    st('Quando a linha azul cruza a laranja (sinal) para cima, o momento está virando para alta; para baixo, para queda.', IND('macd')),
    st('O histograma (barras) mostra a distância entre as linhas: barras crescendo = momento ganhando força.', IND('macd')),
  ])],
  ['Indicadores', 'Estocástico', S(swing(), [
    st('O Estocástico mostra onde o fechamento está dentro da faixa recente (0 a 100).', IND('stoch')),
    st('Acima de 80, o preço fecha perto das máximas; abaixo de 20, perto das mínimas.', IND('stoch')),
    st('Funciona melhor em mercado lateral. Em tendência forte ele "gruda" no extremo e dá sinais cedo demais.', IND('stoch')),
  ])],
  ['Indicadores', 'ADX', S(trendThenRange(), [
    st('O ADX não diz a direção, só a FORÇA da tendência.', IND('adx')),
    st('Na primeira parte o preço sobe forte: o ADX sobe e passa de 25 (tendência forte).', IND('adx'), AR([2, 42], [21, 69], 'up')),
    st('Quando o mercado fica lateral, o ADX perde força. Abaixo de 20 evite estratégias de tendência.', IND('adx'), VL(24, 'lateral')),
  ])],
  ['Indicadores', 'Bandas (introdução)', S(swing(), [
    st('As Bandas de Bollinger envolvem o preço: uma média no meio e duas bandas a 2 desvios padrão.', { k: 'bb' }),
    st('Mexa nos desvios: bandas mais largas pegam menos toques; mais estreitas, mais.'),
  ], { ctrl: 'bb', ctrlDef: 2 })],
  ['Indicadores', 'Volume', S(
    zz([[0, 50], [8, 56], [10, 55], [11, 66], [12, 70], [18, 72], [22, 66], [26, 74], [30, 78]], 0.8, 0.8, 7),
    [
      st('O volume mostra quanto foi negociado. É a "gasolina" do movimento.'),
      st('Este rompimento veio com volume muito acima da média: muita gente participou, o movimento é mais confiável.', HL([11, 12], 'up')),
      st('Já a alta no final tem volume baixo: pouca convicção, mais fácil de falhar.', HL([26, 27, 28, 29, 30], 'wn')),
    ],
    { vol: [30, 28, 32, 26, 30, 28, 34, 30, 36, 40, 38, 95, 100, 40, 36, 30, 28, 26, 24, 22, 26, 30, 36, 34, 30, 32, 34, 28, 24, 20, 18] })],
  ['Indicadores', 'Tendência x osciladores', { t: 'compare',
    a: { t: 'De tendência', tone: 'up', pts: ['Médias móveis, MACD, ADX.', 'Dizem a DIREÇÃO e se ela é forte.', 'Brilham quando o mercado anda em linha.', 'Em mercado lateral dão vários falsos sinais.'] },
    b: { t: 'Osciladores', tone: 'ac', pts: ['RSI, Estocástico.', 'Medem se o movimento está esticado.', 'Brilham em mercado lateral, de topo a fundo.', 'Em tendência forte avisam "esticado" por muito tempo.'] },
    foot: 'Regra prática: primeiro descubra se o mercado está em tendência ou lateral; só então escolha a ferramenta.' }],
  ['Indicadores', 'O perigo do excesso', { t: 'fork',
    q: 'Seu gráfico tem 8 indicadores: 5 mandam comprar e 3 mandam vender. E agora?',
    opts: [
      { l: 'Adiciono mais um para desempatar', t: 'bad', o: 'Quase todos os indicadores derivam do mesmo preço: mais um só repete a mesma informação e aumenta a confusão (paralisia de análise).' },
      { l: 'Simplifico: 2 ou 3 ferramentas que eu entendo bem', t: 'good', o: 'Um gráfico limpo, com ferramentas que cobrem coisas diferentes (tendência + força + nível), facilita decidir e agir com disciplina.' },
    ],
    takeaway: 'Mais indicadores não dão mais certeza; dão mais ruído.' }],

  // ─────────── Timeframes ───────────
  ['Timeframes', 'O que é timeframe', { t: 'tf' }],
  ['Timeframes', 'M1, M5 e M15', { t: 'tf', tfs: ['M1', 'M5', 'M15'], init: 'M5', desc: {
    M1: 'M1: cada candle é 1 minuto. Muito ruído, muitas operações e custo de spread pesando bastante. Exige atenção total.',
    M5: 'M5: popular no day trade. Ainda ágil, mas com menos ruído que o M1.',
    M15: 'M15: movimentos já mais "legíveis", com menos operações por dia e mais calma.',
  } }],
  ['Timeframes', 'H1 e H4', { t: 'tf', tfs: ['H1', 'H4'], init: 'H1', desc: {
    H1: 'H1: cada candle é 1 hora. Bom meio-termo: dá para operar sem ficar colado na tela.',
    H4: 'H4: 4 horas por candle. Estrutura bem clara, poucas operações e stops maiores.',
  } }],
  ['Timeframes', 'Diário e semanal', { t: 'tf', tfs: ['H4', 'D1'], init: 'D1', count: 40, desc: {
    H4: 'H4 para comparar: ainda mostra bastante movimento interno.',
    D1: 'Diário: cada candle é 1 dia inteiro. A visão de longo prazo; os níveis aqui são os mais respeitados. O semanal funciona igual, só que com 1 semana por candle.',
  } }],
  ['Timeframes', 'Ruído x sinal', { t: 'tf', tfs: ['M1', 'M5', 'H1', 'H4'], init: 'M1', desc: {
    M1: 'M1: quase tudo é ruído. O sobe-e-desce a cada minuto não significa nada sobre a direção real.',
    M5: 'M5: o ruído diminui, mas ainda há muitas oscilações irrelevantes.',
    H1: 'H1: a direção começa a aparecer. A linha tracejada mostra a tendência do período.',
    H4: 'H4: o sinal domina. Veja como o MESMO mercado parece organizado quando você se afasta.',
  } }],
  ['Timeframes', 'Scalp, day, swing e position', { t: 'reveal', lead: 'Cada estilo combina com um tempo gráfico. Toque para ver.', items: [
    { h: 'Scalp · M1 a M5', b: 'Operações de segundos a minutos, dezenas por dia, alvos curtos. Exige foco total, spread baixo e disciplina rígida.' },
    { h: 'Day trade · M5 a H1', b: 'Abre e fecha no mesmo dia, sem carregar posição à noite. Pede tempo na frente da tela durante o pregão.' },
    { h: 'Swing · H4 a Diário', b: 'Posições de dias a semanas, aproveitando os "balanços" da tendência. Stops maiores, menos operações, mais tempo livre.' },
    { h: 'Position · Diário a Mensal', b: 'Semanas a meses, olhando a grande tendência e os fundamentos. Pouquíssimas operações e muita paciência.' },
  ] }],
  ['Timeframes', 'Análise multi-timeframe', { t: 'tf', dual: ['H4', 'M15'] }],
  ['Timeframes', 'Escolher o timeframe certo', { t: 'fork',
    q: 'Você trabalha 8h por dia e só consegue olhar o gráfico à noite. Qual timeframe combina?',
    opts: [
      { l: 'M1: aproveita pequenos movimentos', t: 'bad', o: 'Impossível acompanhar: M1 exige estar na frente da tela o tempo todo. Você perderia entradas e saídas.' },
      { l: 'H4 ou Diário (swing)', t: 'good', o: 'Combina com sua rotina: você analisa à noite, deixa ordens e stops programados e não precisa olhar a cada minuto.' },
      { l: 'M5 no intervalo do almoço', t: 'mid', o: 'Possível, mas arriscado: em 30 minutos você fica exposto sem poder reagir ao resto do dia.' },
    ],
    takeaway: 'O melhor timeframe é o que cabe na SUA rotina e no seu temperamento.' }],
  ['Timeframes', 'Confluência de tempos', { t: 'tf', dual: ['D1', 'H1'], foot: 'Confluência: quando o tempo maior e o menor apontam para o mesmo lado, a operação tem mais chance. Se um sobe e o outro cai, melhor esperar.' }],
  ['Timeframes', 'Paciência conforme o timeframe', { t: 'tf', tfs: ['M5', 'H1', 'D1'], init: 'H1', desc: {
    M5: 'M5: o setup aparece e resolve em minutos. A paciência aqui é para esperar o sinal certo, não para segurar a posição.',
    H1: 'H1: um trade pode levar horas. Aceite que o preço oscile dentro do esperado sem mexer no stop.',
    D1: 'Diário: um trade pode levar dias ou semanas. Quem tenta acelerar o ritmo desse tempo gráfico se frustra e sai cedo demais.',
  } }],
];

// evita aviso de import não usado quando algumas helpers não são necessárias neste arquivo
void [H, LN, PT, Z, cs];
