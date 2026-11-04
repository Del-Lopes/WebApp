import { AR, BOX, FIB, H, HL, LN, PT, S, T, VL, Z, cd, cs, st, zz } from './dsl';
import type { Bar, Illu } from './dsl';

type Entry = [unit: string, lesson: string, illu: Illu];

// Smart Money, ICT, Wyckoff, Teoria de Dow e Ondas de Elliott.
const grid = (items: { h: string; b: string; p?: string }[], lead?: string): Illu => ({ t: 'reveal', items, lead });
const flow = (items: { h: string; b: string; p?: string }[], lead?: string): Illu => ({ t: 'reveal', items, lead, mode: 'flow' });
const check = (items: { h: string; b: string; p?: string }[], lead?: string): Illu => ({ t: 'reveal', items, lead, mode: 'check' });

// ─── Smart Money ─────────────────────────────────────────────────────────
// Range com topos iguais e uma varrida de liquidez (stop hunt) acima deles, seguida de queda.
const sweepHigh = (): Bar[] => {
  const b = zz([[0, 50], [4, 57.4], [8, 51], [12, 57.5], [16, 51], [20, 57.4], [24, 51.5]], 0.4, 0.5, 3);
  return [...b, cd(b[24].c, 57, 0.4, 0.4), ...cs(57, [54, 50.5, 47, 45])].map((x, i) => (i === 25 ? { ...x, h: 62 } : x));
};
// Mesmo range, mas varrendo os fundos e subindo depois.
const sweepLow = (): Bar[] => {
  const b = zz([[0, 52], [4, 58], [8, 50.6], [12, 58], [16, 50.4], [20, 58], [24, 50.5]], 0.4, 0.5, 5);
  return [...b, cd(b[24].c, 51.2, 0.4, 0.4), ...cs(51.2, [56, 61, 66, 70])].map((x, i) => (i === 25 ? { ...x, l: 46 } : x));
};
// Queda, um último candle de baixa (order block), impulso forte, retorno ao bloco e reação.
const orderBlock = (): Bar[] => [
  ...cs(60, [58, 56.5, 55, 53.5, 52]), cd(52, 50.5, 0.5, 0.4), cd(50.5, 58, 0.4, 0.2), cd(58, 63, 0.4, 0.3),
  ...cs(63, [61, 58.5, 56, 53, 51.2]), ...cs(51.2, [55, 59, 64, 68]),
];
// Três candles com gap de valor justo (FVG) e preenchimento depois.
const fvgBars = (): Bar[] => [
  ...cs(48, [49, 49.5, 50]), cd(50, 52, 0.4, 0.4), cd(52, 60, 0.3, 0.3), cd(60, 62, 0.4, 0.4),
  ...cs(62, [61, 58, 55.5, 53, 55, 58, 62, 65]),
];

// ─── Wyckoff ─────────────────────────────────────────────────────────────
const accum = (): Bar[] => zz([[0, 82], [10, 52], [13, 58], [17, 50], [21, 57], [25, 49.5], [29, 56.5], [33, 45], [36, 54], [40, 57], [46, 66], [52, 76], [58, 88]], 0.5, 0.7, 4);
const distrib = (): Bar[] => zz([[0, 40], [10, 70], [13, 64], [17, 72], [21, 65], [25, 72.5], [29, 65.5], [33, 77], [36, 67], [40, 65], [46, 56], [52, 46], [58, 34]], 0.5, 0.7, 6);
// Volume sintético para o esquema de acumulação: pico na parada da queda, seco no spring, forte na saída.
const accumVol = (n: number): number[] => Array.from({ length: n }, (_, i) =>
  i < 8 ? 55 + (i % 3) * 6 : i < 12 ? 100 - (i - 8) * 15 : i >= 31 && i <= 34 ? 18 : i >= 44 && i <= 56 ? 78 + (i % 4) * 6 : 32 + (i % 5) * 5);

// ─── Dow ─────────────────────────────────────────────────────────────────
const dowUp = (): Bar[] => zz([[0, 40], [4, 48], [7, 44], [12, 56], [15, 51], [20, 64], [23, 59], [28, 72]], 0.5, 0.6, 7);

// ─── Elliott ─────────────────────────────────────────────────────────────
const waves = (): Bar[] => zz([[0, 50], [6, 62], [9, 56], [19, 76], [23, 69], [30, 84], [34, 72], [37, 79], [44, 60]], 0.6, 0.7, 2);
const W: [number, number, string][] = [[6, 62.8, '1'], [9, 55.2, '2'], [19, 76.8, '3'], [23, 68.2, '4'], [30, 84.8, '5'], [34, 71.2, 'A'], [37, 79.8, 'B'], [44, 59.2, 'C']];
const waveLabels = (n: number) => W.slice(0, n).map(([i, y, l]) => PT(i, y, l, 'ac'));

export const PRICE_ILLUS: Entry[] = [
  // ─────────── Smart Money Concepts ───────────
  ['Smart Money Concepts', 'O que e smart money', S(sweepLow(), [
    st('O mercado anda em faixa. Muitos traders de varejo colocam stops logo abaixo dos fundos.', H(50, 'Stops do varejo', 'wn')),
    st('Grandes players precisam de muita liquidez para entrar sem mexer no preço. Esses stops são a liquidez deles.', H(50, 'Stops do varejo', 'wn'), PT(25, 46.4, 'varredura', 'dn')),
    st('Depois de "pegar" a liquidez, o preço reverte forte. Quem foi stopado ficou do lado errado.', H(50, undefined, 'wn'), AR([25, 51], [29, 70], 'up')),
    st('Smart money é isso: ler onde o dinheiro grande precisa agir, em vez de agir como a multidão.'),
  ])],
  ['Smart Money Concepts', 'Liquidez', S(sweepHigh(), [
    st('Liquidez são ordens paradas no gráfico: stops e ordens pendentes.'),
    st('Topos iguais acumulam stops de vendedores e ordens de compra no rompimento, logo acima.', H(58, 'Liquidez acima dos topos', 'wn'), HL([4, 12, 20], 'wn')),
    st('Preço é atraído para onde há liquidez: os grandes precisam dela para executar.', H(58, undefined, 'wn'), AR([24, 51.5], [25, 61], 'wn')),
  ])],
  ['Smart Money Concepts', 'Stop hunt', S(sweepHigh(), [
    st('Topos iguais, com muitos stops acima.', H(58, undefined, 'wn')),
    st('O preço fura os topos rapidamente. Quem apostou no rompimento comprou e os vendidos foram stopados.', H(58, undefined, 'wn'), PT(25, 62, 'caça aos stops', 'dn')),
    st('Em seguida o preço volta para dentro da faixa e cai: foi uma armadilha para pegar liquidez.', H(58, undefined, 'wn'), PT(25, 62, 'caça aos stops', 'dn'), AR([25, 57], [29, 45], 'dn')),
    st('Dica: um pavio longo além de um nível óbvio, com fechamento de volta, é um sinal clássico de stop hunt.'),
  ])],
  ['Smart Money Concepts', 'Order block', S(orderBlock(), [
    st('Veja a queda e o último candle de baixa antes do movimento explosivo.', HL([5], 'ac')),
    st('Esse candle é o order block (bloco de ordens): ali instituições acumularam compras antes de empurrar o preço.', BOX(5, 5, 50.1, 52.5, 'Order block', 'ac')),
    st('O impulso forte que sai do bloco confirma a presença de dinheiro grande.', BOX(5, 5, 50.1, 52.5, 'Order block', 'ac'), AR([6, 50.5], [7, 63], 'up')),
    st('Quando o preço volta ao bloco, as ordens pendentes remanescentes costumam fazê-lo reagir.', BOX(5, 12, 50.1, 52.5, 'Order block', 'ac'), PT(12, 51.2, 'reação', 'up')),
  ])],
  ['Smart Money Concepts', 'Break of structure', S(zz([[0, 50], [5, 58], [9, 53], [14, 62], [18, 56], [24, 70]], 0.5, 0.6, 3), [
    st('Estrutura de alta: topos e fundos cada vez mais altos.', PT(5, 58.8, 'topo', 'mu')),
    st('Um topo anterior é rompido, com fechamento além dele. Isso é o Break of Structure (BOS).', LN([5, 58.8], [12, 58.8], 'topo anterior', 'ac'), PT(12, 58.8, 'BOS', 'up')),
    st('BOS = a tendência segue. Continue procurando compras nos recuos, até a estrutura mudar.', LN([5, 58.8], [12, 58.8], undefined, 'ac'), PT(12, 58.8, 'BOS', 'up'), AR([18, 56], [24, 70], 'up')),
  ])],
  ['Smart Money Concepts', 'Change of character', S(zz([[0, 48], [5, 58], [9, 52], [14, 64], [18, 57], [22, 63.5], [26, 52], [30, 46]], 0.5, 0.6, 5), [
    st('Uma tendência de alta saudável: topos e fundos ascendentes.', PT(18, 56.2, 'último fundo', 'up')),
    st('O preço agora fecha ABAIXO do último fundo da alta. É o primeiro sinal de que quem comprava perdeu o controle.', LN([18, 56.2], [24, 56.2], undefined, 'dn'), PT(24, 56.2, 'CHoCH', 'dn')),
    st('Change of Character (CHoCH) é o alerta da possível virada. Ainda não é entrada: espere um retorno e uma confirmação.', LN([18, 56.2], [24, 56.2], undefined, 'dn'), PT(24, 56.2, 'CHoCH', 'dn'), AR([24, 56], [30, 46], 'dn')),
  ])],
  ['Smart Money Concepts', 'Mitigacao', S(orderBlock(), [
    st('Mitigação é quando o preço volta a uma zona antiga para "limpar" ordens que ficaram abertas.', BOX(5, 5, 50.1, 52.5, 'Order block', 'ac')),
    st('Instituições aproveitam esse retorno para fechar posições antigas ou entrar de novo ao melhor preço.', BOX(5, 12, 50.1, 52.5, 'Zona a mitigar', 'ac'), AR([9, 58], [12, 51.4], 'dn')),
    st('Depois da mitigação o preço reage e segue na direção original.', BOX(5, 12, 50.1, 52.5, undefined, 'ac'), PT(12, 51.2, 'mitigou', 'up'), AR([12, 51.2], [16, 68], 'up')),
  ])],
  ['Smart Money Concepts', 'Imbalance', S(fvgBars(), [
    st('Três candles seguidos: o do meio é enorme e o preço dispara.', HL([3, 4, 5], 'ac')),
    st('Entre a máxima do 1º candle e a mínima do 3º ficou um espaço onde quase não houve negociação: o imbalance (desequilíbrio).', BOX(3, 5, 52.4, 59.6, 'Imbalance', 'ac')),
    st('O mercado tende a voltar para "preencher" esse vazio. Aqui ele desce até a zona antes de seguir.', BOX(3, 5, 52.4, 59.6, 'Imbalance', 'ac'), PT(9, 53, 'preencheu', 'up'), AR([9, 53], [14, 65], 'up')),
  ])],
  ['Smart Money Concepts', 'Premium e discount', S(zz([[0, 50], [6, 70], [12, 40], [18, 68], [24, 42], [30, 66]], 0.5, 0.6, 3), [
    st('Pegue o range do movimento e divida no meio (50%).', H(55, 'Equilíbrio 50%', 'mu')),
    st('Metade de cima = PREMIUM (caro). Instituições preferem vender ali.', H(55, 'Equilíbrio 50%', 'mu'), Z(55, 70.8, 'Premium (caro)', 'dn')),
    st('Metade de baixo = DISCOUNT (barato). Instituições preferem comprar ali.', H(55, 'Equilíbrio 50%', 'mu'), Z(55, 70.8, 'Premium (caro)', 'dn'), Z(39.2, 55, 'Discount (barato)', 'up')),
    st('Comprar em premium ou vender em discount é ir contra o dinheiro grande. Compre barato, venda caro.'),
  ])],
  ['Smart Money Concepts', 'A favor do smart money', flow([
    { h: 'Veja onde está a liquidez', b: 'Marque topos/fundos iguais e níveis óbvios: é para lá que o preço costuma ser atraído.' },
    { h: 'Espere a varredura', b: 'O preço pega a liquidez (pavio além do nível) e volta. Aí a armadilha é revelada.' },
    { h: 'Mudança de estrutura', b: 'Procure o CHoCH/BOS a favor da nova direção mostrando que o dinheiro grande assumiu.' },
    { h: 'Entre na zona', b: 'Order block ou imbalance na zona de desconto (compras) ou premium (vendas), com stop além da zona.' },
    { h: 'Alvo na próxima liquidez', b: 'O preço segue até a próxima região de stops. Realize lá.' },
  ], 'O passo a passo de uma operação alinhada com o smart money.')],

  // ─────────── ICT ───────────
  ['ICT', 'Quem e o ICT', grid([
    { h: 'Quem é', b: 'Inner Circle Trader é o apelido de Michael Huddleston, que ensina como o preço é "entregue" pelo dinheiro institucional.' },
    { h: 'A ideia central', b: 'O preço é movido de uma liquidez para outra. O trader aprende a ler esses movimentos em vez de reagir ao ruído.' },
    { h: 'Ferramentas', b: 'Fair Value Gap, killzones, order blocks, OTE, market structure shift e Power of Three: tudo o que veremos nesta unidade.' },
    { h: 'Aviso', b: 'É um método detalhado e subjetivo. Estude com calma, teste em conta demo e nunca arrisque mais do que pode perder.' },
  ], 'Toque em cada cartão.')],
  ['ICT', 'Fair value gap', S(fvgBars(), [
    st('O Fair Value Gap (FVG) aparece quando um candle é tão forte que deixa um espaço entre o candle anterior e o seguinte.', HL([3, 4, 5], 'ac')),
    st('É o espaço entre a máxima do 1º candle e a mínima do 3º: um "vazio" de preço onde o mercado andou rápido demais.', BOX(3, 5, 52.4, 59.6, 'FVG', 'ac')),
    st('O preço costuma voltar para equilibrar o FVG. Essa região vira área de entrada a favor do movimento.', BOX(3, 5, 52.4, 59.6, 'FVG', 'ac'), PT(9, 53, 'entrada', 'up'), AR([9, 53], [14, 65], 'up')),
  ])],
  ['ICT', 'Killzones', { t: 'calc', k: 'kz' }],
  ['ICT', 'Liquidez compra e venda', S(zz([[0, 50], [4, 59], [8, 49], [12, 59], [16, 49], [20, 59], [24, 49]], 0.4, 0.6, 4), [
    st('Buy side liquidity (BSL) fica ACIMA dos topos: stops de quem está vendido e ordens de compra de rompimento.', H(59.8, 'Buy side', 'wn')),
    st('Sell side liquidity (SSL) fica ABAIXO dos fundos: stops de quem está comprado e ordens de venda de rompimento.', H(59.8, 'Buy side', 'wn'), H(48.2, 'Sell side', 'wn')),
    st('O preço visita um lado para pegar a liquidez e depois costuma ir ao outro. Pergunte sempre: qual lado já foi capturado?', H(59.8, undefined, 'wn'), H(48.2, undefined, 'wn')),
  ])],
  ['ICT', 'Optimal trade entry', S(zz([[0, 44], [2, 40], [10, 70], [13, 62], [16, 48.8], [20, 60], [26, 82]], 0.5, 0.6, 9), [
    st('Depois de um movimento forte, o preço recua. O OTE (Optimal Trade Entry) é a zona ideal para entrar nesse recuo.', FIB([2, 40], [10, 70], { lv: [0, 1] })),
    st('Mede-se o Fibonacci do movimento: a zona OTE fica entre 0,62 e 0,79, o setor "ótimo" da correção.', FIB([2, 40], [10, 70], { lv: [0, 0.62, 0.705, 0.79, 1] }), Z(46.3, 51.4, 'OTE', 'wn')),
    st('Entrar aqui rende um stop curto (logo abaixo de 0,79) e um alvo longo (a máxima anterior ou além).', FIB([2, 40], [10, 70], { lv: [0, 0.62, 0.705, 0.79, 1] }), Z(46.3, 51.4, 'OTE', 'wn'), PT(17, 50, 'entrada', 'up'), AR([17, 50], [26, 82], 'up')),
  ])],
  ['ICT', 'Market structure shift', S(zz([[0, 70], [4, 64], [8, 68], [12, 56], [16, 61], [20, 50], [26, 64], [30, 72]], 0.5, 0.6, 5), [
    st('Em tendência de baixa os topos e fundos descem: cada topo é mais baixo que o anterior.', PT(16, 61.8, 'último topo', 'mu')),
    st('O preço faz uma varredura de liquidez no fundo e reage com força para cima.', PT(20, 49.4, 'varredura', 'wn')),
    st('Quando fecha ACIMA do último topo, a estrutura mudou: o Market Structure Shift (MSS).', LN([16, 61.8], [25, 61.8], undefined, 'up'), PT(25, 61.8, 'MSS', 'up')),
    st('O MSS indica que a direção virou. A entrada vem no retorno a uma zona (FVG ou order block) a favor da nova tendência.', LN([16, 61.8], [25, 61.8], undefined, 'up'), PT(25, 61.8, 'MSS', 'up'), AR([25, 62], [30, 72], 'up')),
  ])],
  ['ICT', 'Judas swing', S(zz([[0, 55], [4, 54], [6, 62], [10, 64], [12, 56], [18, 46], [24, 40]], 0.5, 0.6, 3), [
    st('No início da sessão, o preço marca uma abertura de referência.', H(55, 'Abertura', 'mu')),
    st('O Judas swing é um movimento falso logo após a abertura: o preço vai para um lado e atrai todo mundo.', H(55, 'Abertura', 'mu'), AR([4, 54], [10, 64], 'wn'), PT(10, 64.8, 'falso movimento', 'wn')),
    st('Depois ele inverte e faz o movimento real para o lado oposto, pegando quem entrou no falso.', H(55, undefined, 'mu'), PT(10, 64.8, undefined, 'wn'), AR([10, 64], [24, 40], 'dn')),
    st('Evite entrar no primeiro impulso da abertura. Espere o falso movimento se revelar.'),
  ])],
  ['ICT', 'Silver bullet', flow([
    { h: 'Espere a janela', b: 'São janelas de 1 hora: uma na abertura de Londres, uma de manhã em Nova York e outra à tarde (horários no relógio de Nova York: 3-4h, 10-11h e 14-15h).', p: 'Janelas de 1 hora' },
    { h: 'Identifique a liquidez', b: 'Veja qual lado já foi varrido (topos ou fundos) e para onde o preço pode ir depois.' },
    { h: 'Ache o FVG', b: 'Procure um Fair Value Gap a favor da direção esperada dentro da janela.' },
    { h: 'Entre no FVG', b: 'Entre no preenchimento do FVG, com stop além do gap e alvo na próxima liquidez.' },
  ], 'A silver bullet é uma estratégia simples e de janela curta. Siga as etapas.')],
  ['ICT', 'Power of three', S(zz([[0, 50], [4, 52], [8, 49], [12, 51], [14, 45], [16, 44.5], [22, 60], [30, 72]], 0.5, 0.6, 3), [
    st('O Power of Three (AMD) divide o movimento em 3 fases: Acumulação, Manipulação e Distribuição.'),
    st('1) Acumulação: o preço fica em faixa enquanto os grandes montam posição.', BOX(0, 12, 47.4, 53.5, 'Acumulação', 'ac')),
    st('2) Manipulação: um movimento falso para um lado pega stops e engana o varejo.', BOX(0, 12, 47.4, 53.5, 'Acumulação', 'ac'), BOX(13, 16, 42.6, 48, 'Manipulação', 'dn')),
    st('3) Distribuição: o movimento real aparece, na direção oposta à manipulação.', BOX(0, 12, 47.4, 53.5, 'Acumulação', 'ac'), BOX(13, 16, 42.6, 48, 'Manipulação', 'dn'), AR([16, 45], [30, 72], 'up'), T(18, 52, 'Distribuição', 'up')),
  ])],
  ['ICT', 'Disciplina no ICT', { t: 'fork',
    q: 'Você viu um FVG perfeito, mas fora da killzone e contra a tendência maior. O que faz?',
    opts: [
      { l: 'Entro. O FVG está lindo', t: 'bad', o: 'Setup bonito sem contexto é armadilha. Fora da janela, o volume é baixo, e contra a estrutura maior a chance de falhar aumenta.' },
      { l: 'Espero a janela e o alinhamento com a tendência', t: 'good', o: 'Disciplina é isso: operar só quando o horário, a estrutura e a zona concordam. Perder uma entrada não custa nada; perder o capital custa.' },
    ],
    takeaway: 'No ICT, paciência e contexto valem mais que a velocidade.' }],

  // ─────────── Wyckoff ───────────
  ['Wyckoff', 'O metodo Wyckoff', S(accum(), [
    st('Richard Wyckoff estudou como grandes operadores montam posições. O ciclo tem 4 etapas: queda, acumulação, alta e distribuição.'),
    st('Depois de uma queda forte, o preço para e lateraliza: é a acumulação. Os grandes compram sem chamar atenção.', BOX(10, 40, 48, 58.5, 'Acumulação', 'ac')),
    st('Quando a oferta acaba, o preço sai da faixa para cima: a fase de alta (markup).', BOX(10, 40, 48, 58.5, 'Acumulação', 'ac'), AR([40, 57], [58, 88], 'up')),
  ])],
  ['Wyckoff', 'Acumulacao', S(accum(), [
    st('A acumulação acontece depois de uma queda. O preço para de cair e fica em uma faixa lateral.', BOX(10, 40, 48, 58.5, 'Faixa', 'ac')),
    st('Dentro da faixa, os grandes absorvem a oferta aos poucos: o fundo é testado várias vezes sem romper de verdade.', BOX(10, 40, 48, 58.5, 'Faixa', 'ac'), HL([17, 25, 33], 'up')),
    st('Quando a oferta seca, o preço rompe a faixa para cima, o início da fase de alta.', BOX(10, 40, 48, 58.5, undefined, 'ac'), AR([40, 57], [58, 88], 'up')),
  ])],
  ['Wyckoff', 'Distribuicao', S(distrib(), [
    st('A distribuição é o espelho: ocorre no topo, depois de uma alta forte.', BOX(10, 40, 63, 73.5, 'Faixa', 'dn')),
    st('Os grandes vendem aos poucos para um público ainda otimista. O topo é testado várias vezes sem se sustentar.', BOX(10, 40, 63, 73.5, 'Faixa', 'dn'), HL([17, 25, 33], 'dn')),
    st('Quando a demanda acaba, o preço sai da faixa para baixo: começa a queda.', BOX(10, 40, 63, 73.5, undefined, 'dn'), AR([40, 65], [58, 34], 'dn')),
  ])],
  ['Wyckoff', 'As tres leis', check([
    { h: 'Oferta e demanda', b: 'Preço sobe quando a demanda supera a oferta e cai no caso contrário. Mas o que importa é o equilíbrio de forças.' },
    { h: 'Causa e efeito', b: 'O tamanho do movimento (efeito) é proporcional ao tempo de lateralização (causa). Uma faixa longa pode gerar um movimento longo.' },
    { h: 'Esforço e resultado', b: 'O volume (esforço) deve ser coerente com o movimento do preço (resultado). Quando divergem, o movimento está fraco.' },
  ], 'As 3 leis são a base do método. Toque para estudar e marcar cada uma.')],
  ['Wyckoff', 'Esforco e resultado', S(zz([[0, 50], [4, 52], [9, 52.5, 0.5], [16, 68]], 0.5, 0.6, 3), [
    st('Esforço é o volume; resultado é o quanto o preço andou.'),
    st('Aqui há muito esforço (volume enorme) e pouco resultado: o preço quase não sai do lugar. Alguém está absorvendo tudo.', HL([5, 6, 7, 8, 9], 'wn'), T(2, 55, 'esforço sem resultado', 'wn')),
    st('Depois, com volume menor, o preço dispara. A oferta foi absorvida e o caminho ficou livre.', HL([5, 6, 7, 8, 9], 'wn'), AR([10, 53], [16, 68], 'up')),
  ], { vol: [30, 32, 28, 30, 34, 92, 98, 100, 96, 90, 44, 40, 38, 40, 36, 34, 32] })],
  ['Wyckoff', 'As fases A a E', S(accum(), [
    st('O esquema se divide em 5 fases, de A a E.'),
    st('A: a queda para (parada da tendência anterior) com volume alto.', VL(10, 'A')),
    st('B: construção da causa. O preço oscila dentro da faixa, testando os extremos.', VL(10, 'A'), VL(14, 'B')),
    st('C: o teste decisivo (o spring) varre os stops abaixo do fundo e volta.', VL(10, 'A'), VL(14, 'B'), VL(33, 'C'), PT(33, 45.6, 'spring', 'up')),
    st('D e E: o preço mostra força (D) e sai da faixa para a fase de alta (E).', VL(10, 'A'), VL(14, 'B'), VL(33, 'C'), VL(38, 'D'), VL(46, 'E'), AR([40, 57], [58, 88], 'up')),
  ])],
  ['Wyckoff', 'Spring', S(zz([[0, 60], [6, 50], [10, 56], [14, 50.5], [18, 56], [22, 50.2], [24, 45.5], [26, 55], [34, 70]], 0.5, 0.6, 3), [
    st('O fundo da faixa virou um suporte, testado várias vezes.', H(49.5, 'Suporte', 'up')),
    st('O spring é uma quebra falsa: o preço fura o suporte e assusta os compradores, que vendem.', H(49.5, undefined, 'up'), PT(24, 45.4, 'spring', 'dn')),
    st('Mas não há vendedores suficientes. O preço volta rápido para dentro da faixa: a armadilha de baixa foi desfeita.', H(49.5, undefined, 'up'), PT(24, 45.4, undefined, 'dn'), AR([24, 46], [34, 70], 'up')),
  ])],
  ['Wyckoff', 'Upthrust', S(zz([[0, 40], [6, 50], [10, 44], [14, 49.5], [18, 44], [22, 49.8], [24, 54.5], [26, 45], [34, 30]], 0.5, 0.6, 3), [
    st('O topo da faixa virou uma resistência testada várias vezes.', H(50.5, 'Resistência', 'dn')),
    st('O upthrust é o rompimento falso para cima: o preço fura a resistência e atrai compradores.', H(50.5, undefined, 'dn'), PT(24, 55.2, 'upthrust', 'wn')),
    st('Sem demanda para sustentar, o preço volta para dentro da faixa e cai. Quem comprou o rompimento ficou preso.', H(50.5, undefined, 'dn'), PT(24, 55.2, undefined, 'wn'), AR([24, 54], [34, 30], 'dn')),
  ])],
  ['Wyckoff', 'Composite man', flow([
    { h: 'Acumula em silêncio', b: 'Compra durante a queda e a lateralização, quando ninguém quer comprar e os preços estão baixos.' },
    { h: 'Empurra o preço', b: 'Com a posição montada, ajuda o preço a subir, atraindo o público com notícias positivas.' },
    { h: 'Distribui no topo', b: 'Vende aos poucos para o público eufórico que chega tarde.' },
    { h: 'Deixa o preço cair', b: 'Sem os grandes comprando, o preço desaba e o ciclo recomeça.' },
  ], 'O "composite man" é uma metáfora: imagine um único grande operador por trás de todo o movimento.')],
  ['Wyckoff', 'Volume no Wyckoff', S(accum(), [
    st('O volume confirma o que o preço mostra. Veja o gráfico de acumulação com o volume embaixo.'),
    st('Na parada da queda, o volume é altíssimo: capitulação do varejo e compra dos grandes.', HL([8, 9, 10, 11], 'wn')),
    st('No spring o volume seca: ninguém quer vender mais. É sinal de que a oferta acabou.', HL([33], 'ac')),
    st('Na saída da faixa o volume volta forte: a demanda assumiu e a fase de alta é real.', HL([44, 45, 46, 47, 48, 49, 50, 51, 52], 'up')),
  ], { vol: accumVol(59) })],

  // ─────────── Teoria de Dow ───────────
  ['Teoria de Dow', 'Charles Dow', grid([
    { h: 'Quem foi', b: 'Charles Dow (1851-1902) foi jornalista, fundador do Wall Street Journal e criador do índice Dow Jones. Suas ideias deram origem à análise técnica.' },
    { h: 'O preço desconta tudo', b: 'Tudo o que se sabe (notícias, lucros, expectativas) já está refletido no preço.' },
    { h: 'O mercado tem 3 tendências', b: 'Primária, secundária e terciária: vamos ver nas próximas aulas.' },
    { h: 'A tendência persiste', b: 'Ela vale até que sinais claros de reversão apareçam.' },
  ], 'Toque para conhecer os pilares.')],
  ['Teoria de Dow', 'Mercado em tendencias', S(dowUp(), [
    st('Uma tendência de alta tem topos e fundos cada vez mais altos.'),
    st('Cada topo supera o anterior: são os topos mais altos (HH).', PT(4, 48.8, 'HH', 'up'), PT(12, 56.8, 'HH', 'up'), PT(20, 64.8, 'HH', 'up'), PT(28, 72.8, 'HH', 'up')),
    st('Cada fundo também é mais alto que o anterior: são os fundos mais altos (HL). Enquanto essa estrutura se mantém, a tendência é de alta.', PT(4, 48.8, 'HH', 'up'), PT(12, 56.8, 'HH', 'up'), PT(20, 64.8, 'HH', 'up'), PT(28, 72.8, 'HH', 'up'), PT(7, 43.2, 'HL', 'ac'), PT(15, 50.2, 'HL', 'ac'), PT(23, 58.2, 'HL', 'ac')),
  ])],
  ['Teoria de Dow', 'As tres tendencias', S(dowUp(), [
    st('Dow dividiu o movimento do mercado em 3 tendências.'),
    st('Primária: a grande tendência, que dura de meses a anos.', AR([0, 40], [28, 72], 'up'), T(1, 62, 'Primária', 'up')),
    st('Secundária: correções contrárias dentro da primária, que duram semanas.', AR([0, 40], [28, 72], 'up'), HL([5, 6, 7, 13, 14, 15, 21, 22, 23], 'wn'), T(1, 62, 'Primária', 'up')),
    st('Terciária: as pequenas oscilações do dia a dia, o ruído. Não define a direção.', AR([0, 40], [28, 72], 'up'), HL([5, 6, 7, 13, 14, 15, 21, 22, 23], 'wn')),
  ])],
  ['Teoria de Dow', 'As tres fases', S(zz([[0, 60], [8, 41], [12, 45], [16, 41.5], [20, 45.5], [24, 42], [28, 52], [36, 64], [44, 71], [47, 75], [50, 70], [53, 75], [56, 71], [59, 74]], 0.7, 0.8, 4), [
    st('Toda grande tendência de alta passa por 3 fases.'),
    st('1) Acumulação: os mais informados compram em silêncio, enquanto o público ainda está pessimista.', BOX(8, 24, 39.5, 47, 'Acumulação', 'ac')),
    st('2) Participação: o grande movimento. A tendência fica clara e mais gente entra.', BOX(8, 24, 39.5, 47, 'Acumulação', 'ac'), AR([24, 42], [44, 71], 'up'), T(26, 62, 'Participação', 'up')),
    st('3) Distribuição: o público euforizado compra e os mais informados começam a vender.', BOX(8, 24, 39.5, 47, 'Acumulação', 'ac'), BOX(44, 59, 69, 77, 'Distribuição', 'dn')),
  ])],
  ['Teoria de Dow', 'Confirmacao por indices', { t: 'compare',
    a: { t: 'Índices confirmam', tone: 'up', pts: ['Dow Jones e S&P 500 fazem novas máximas juntos.', 'Os dois mercados concordam: a tendência é saudável.', 'A alta tende a continuar.'] },
    b: { t: 'Índices divergem', tone: 'dn', pts: ['Um índice faz nova máxima, o outro não.', 'Falta confirmação: parte do mercado não acredita na alta.', 'É um alerta de fraqueza e de possível reversão.'] },
    foot: 'Na época de Dow eram o industrial e o de ferrovias. Hoje vale comparar índices correlatos e ativos relacionados.' }],
  ['Teoria de Dow', 'Volume confirma', S(zz([[0, 50], [5, 60], [8, 56], [13, 68], [16, 63], [21, 76]], 0.4, 0.5, 3), [
    st('Numa tendência saudável o volume segue a direção: cresce a favor dela.'),
    st('Nas altas, o volume é grande: muita gente apostando na subida.', HL([1, 2, 3, 4, 5, 9, 10, 11, 12, 13], 'up')),
    st('Nas correções o volume é baixo: poucos vendendo. A força continua com os compradores.', HL([6, 7, 8, 14, 15, 16], 'wn')),
    st('Se o preço sobe com volume cada vez menor, desconfie: a alta perde convicção.'),
  ], { vol: [60, 75, 80, 85, 80, 90, 30, 26, 24, 80, 92, 95, 98, 100, 28, 26, 24, 88, 94, 100, 96, 100] })],
  ['Teoria de Dow', 'A tendencia persiste', { t: 'fork',
    q: 'Numa tendência de alta, o preço cai por 3 dias seguidos. É uma reversão?',
    opts: [
      { l: 'Sim, a alta acabou. Vendo tudo', t: 'bad', o: 'Calma. Correções fazem parte. Sem uma quebra clara da estrutura (um fundo mais baixo), a tendência primária segue valendo.' },
      { l: 'Não necessariamente. Vejo se o fundo anterior se mantém', t: 'good', o: 'Isso é Dow: a tendência persiste até sinais claros de reversão. Enquanto o último fundo se sustenta, a alta segue válida.' },
    ],
    takeaway: 'Não trate toda queda como reversão, nem toda alta como tendência nova.' }],
  ['Teoria de Dow', 'Topos e fundos', S(dowUp(), [
    st('A geometria da tendência: topos e fundos.', PT(4, 48.8, 'topo', 'mu'), PT(7, 43.2, 'fundo', 'mu')),
    st('Alta = cada topo e cada fundo mais alto que o anterior.', PT(4, 48.8, 'HH', 'up'), PT(12, 56.8, 'HH', 'up'), PT(20, 64.8, 'HH', 'up'), PT(7, 43.2, 'HL', 'ac'), PT(15, 50.2, 'HL', 'ac')),
    st('Baixa = cada topo e cada fundo mais baixo que o anterior. Se o padrão se mantém, a tendência segue.', PT(4, 48.8, 'HH', 'up'), PT(12, 56.8, 'HH', 'up'), PT(20, 64.8, 'HH', 'up'), PT(7, 43.2, 'HL', 'ac'), PT(15, 50.2, 'HL', 'ac')),
  ])],
  ['Teoria de Dow', 'Sinais de reversao', S(zz([[0, 40], [4, 50], [7, 45], [12, 60], [15, 53], [18, 57], [22, 47], [26, 40]], 0.5, 0.6, 3), [
    st('A estrutura de alta vinha intacta: HH e HL.', PT(12, 60.8, 'HH', 'up'), PT(15, 52.2, 'HL', 'ac')),
    st('O primeiro sinal: o preço tenta subir de novo e faz um topo MAIS BAIXO que o anterior.', PT(12, 60.8, 'HH', 'up'), PT(15, 52.2, 'HL', 'ac'), PT(18, 57.8, 'topo mais baixo', 'wn')),
    st('O sinal decisivo: o preço rompe o último fundo. A estrutura foi quebrada e a alta deixa de ser válida.', PT(12, 60.8, 'HH', 'up'), PT(15, 52.2, 'HL', 'ac'), PT(18, 57.8, 'topo mais baixo', 'wn'), PT(20, 53, 'quebrou', 'dn'), AR([20, 53], [26, 40], 'dn')),
  ])],
  ['Teoria de Dow', 'Legado da teoria', grid([
    { h: 'Estrutura de preço', b: 'Topos e fundos viraram o alicerce para leitura de tendência em qualquer ativo e qualquer tempo gráfico.' },
    { h: 'Price action', b: 'A ideia de que o preço conta toda a história influencia quem opera só com candles e níveis.' },
    { h: 'Wyckoff e Elliott', b: 'As teorias de Wyckoff e Elliott nasceram em cima das ideias de Dow sobre fases e ondas.' },
    { h: 'Smart money', b: 'Acumulação e distribuição são conceitos de Dow que reaparecem nos métodos modernos.' },
  ], 'A raiz da análise técnica está na Teoria de Dow.')],

  // ─────────── Ondas de Elliott ───────────
  ['Ondas de Elliott', 'A teoria das ondas', S(waves(), [
    st('Ralph Elliott percebeu que o mercado se move em ondas que se repetem, refletindo a psicologia das massas.'),
    st('Um ciclo completo tem 8 ondas: 5 de impulso (a favor da tendência)...', ...waveLabels(5)),
    st('... e 3 corretivas (A, B e C), contra a tendência. Depois o ciclo recomeça.', ...waveLabels(8)),
  ])],
  ['Ondas de Elliott', 'As 5 ondas de impulso', S(waves(), [
    st('Ondas 1, 3 e 5 empurram a favor da tendência.', ...waveLabels(1), AR([0, 50], [6, 62], 'up')),
    st('Ondas 2 e 4 são recuos que dão fôlego ao movimento.', ...waveLabels(4)),
    st('A onda 5 fecha o impulso, geralmente com menos força.', ...waveLabels(5), AR([23, 69], [30, 84], 'up')),
  ])],
  ['Ondas de Elliott', 'As 3 ondas corretivas', S(waves(), [
    st('Depois das 5 ondas de alta o mercado corrige com 3 ondas: A, B e C.', ...waveLabels(5)),
    st('A: a primeira queda. Muita gente ainda acha que é só uma pausa.', ...waveLabels(6), AR([30, 84], [34, 72], 'dn')),
    st('B: um repique para cima, que enche de esperança quem comprou. Mas é uma armadilha.', ...waveLabels(7), AR([34, 72], [37, 79], 'up')),
    st('C: a queda final, forte e rápida, que leva o preço até onde a correção termina.', ...waveLabels(8), AR([37, 79], [44, 60], 'dn')),
  ])],
  ['Ondas de Elliott', 'Psicologia das massas', flow([
    { h: 'Onda 1: ceticismo', b: 'Poucos acreditam na virada. O movimento sobe quase sem notícias positivas.' },
    { h: 'Onda 2: medo', b: '"Eu sabia que era só um repique." O preço corrige, mas não perde o fundo.' },
    { h: 'Onda 3: convicção', b: 'A notícia melhora e todos percebem a tendência. Muita gente entra e o movimento ganha força.' },
    { h: 'Onda 4: realização', b: 'Quem comprou antes realiza lucro. O mercado fica indeciso e lateral.' },
    { h: 'Onda 5: euforia', b: 'Otimismo exagerado: o público entra tarde, enquanto os mais informados começam a sair.' },
    { h: 'Ondas A-B-C: negação e pânico', b: 'A queda assusta, o repique ilude (B) e o pânico domina na onda C.' },
  ], 'O mercado reflete as emoções do grupo. Toque em cada onda.')],
  ['Ondas de Elliott', 'A onda 3', S(waves(), [
    st('A onda 3 é a mais forte e geralmente a mais longa do impulso.', ...waveLabels(3)),
    st('Nela entra o volume, o público e as notícias. Os rompimentos acontecem aqui.', ...waveLabels(3), HL([10, 11, 12, 13, 14, 15, 16, 17, 18, 19], 'up'), AR([9, 56], [19, 76], 'up')),
    st('Por isso muitos traders miram a onda 3. E ela NUNCA pode ser a mais curta das três ondas de impulso.', ...waveLabels(3), AR([9, 56], [19, 76], 'up')),
  ])],
  ['Ondas de Elliott', 'As 3 regras', check([
    { h: 'A onda 2 nunca vai além do início da onda 1', b: 'Se o preço cair abaixo do ponto onde a onda 1 começou, a contagem está errada.' },
    { h: 'A onda 3 nunca é a mais curta', b: 'Entre as ondas 1, 3 e 5, a 3 pode ser a maior ou do meio, mas nunca a menor.' },
    { h: 'A onda 4 não invade a onda 1', b: 'O fundo da onda 4 não pode entrar na região de preço da onda 1 (exceto em diagonais).' },
  ], 'Se uma regra é violada, a contagem está errada. Marque cada regra ao estudar.')],
  ['Ondas de Elliott', 'Tipos de correcao', grid([
    { h: 'Zigzag (5-3-5)', b: 'Correção acentuada e rápida, em 3 ondas (A, B, C) com perna A de 5 ondas. Queda profunda e forte.' },
    { h: 'Flat (3-3-5)', b: 'Correção lateral. A onda B retorna perto do início de A e a onda C termina perto do fim de A. Sinal de força da tendência.' },
    { h: 'Triângulo (3-3-3-3-3)', b: 'Correção em cunha: as oscilações vão diminuindo até um rompimento na direção da tendência.' },
    { h: 'Dica', b: 'Se a onda 2 foi forte (zigzag), espere uma onda 4 lateral (flat ou triângulo). Os dois tipos tendem a se alternar.' },
  ], 'Toque nos tipos.')],
  ['Ondas de Elliott', 'Graus de onda', flow([
    { h: 'Ondas dentro de ondas', b: 'Cada onda de impulso se divide em 5 ondas menores e cada onda corretiva em 3 menores, como uma estrutura fractal.' },
    { h: 'Graus', b: 'Super ciclo, ciclo, primário, intermediário, menor, minuto... Cada grau é um "zoom" do mesmo padrão.' },
    { h: 'No gráfico', b: 'Uma onda 3 do H4 pode ser composta de cinco ondas no M15. Isso ajuda a entrar com precisão.' },
    { h: 'Cuidado', b: 'Quanto mais graus, mais difícil manter a contagem correta. Comece pelo tempo gráfico maior.' },
  ])],
  ['Ondas de Elliott', 'Elliott e Fibonacci', S(waves(), [
    st('Elliott e Fibonacci se completam: as ondas tendem a ter proporções de Fibonacci.', ...waveLabels(3)),
    st('A onda 2 costuma retrair entre 50% e 61,8% da onda 1.', ...waveLabels(2), FIB([0, 50], [6, 62], { lv: [0, 0.382, 0.5, 0.618, 1] })),
    st('A onda 3 costuma chegar a 1,618 vez o tamanho da onda 1, projetado a partir do fim da onda 2.', ...waveLabels(3), FIB([9, 56], [10, 68], { lv: [1, 1.618], ext: true })),
  ])],
  ['Ondas de Elliott', 'Disciplina em Elliott', { t: 'fork',
    q: 'Sua contagem mostra que o preço está na onda 3, mas ele cai abaixo do início da onda 1. O que faz?',
    opts: [
      { l: 'Mantenho a contagem e "ajusto" depois', t: 'bad', o: 'Forçar a contagem é o erro mais comum. Se o preço invalidou a regra, a contagem estava errada. Insistir é transformar análise em teimosia.' },
      { l: 'Aceito que a contagem foi invalidada e saio', t: 'good', o: 'Isso é humildade: a contagem é uma hipótese. Se o preço contradiz as regras, mude de ideia e proteja o capital.' },
    ],
    takeaway: 'Defina antes o ponto em que sua contagem deixa de valer, e respeite esse ponto.' }],
];

void [LN];
