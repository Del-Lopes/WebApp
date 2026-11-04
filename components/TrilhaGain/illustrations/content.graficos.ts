import {
  AR, BB, BOX, FIB, H, HL, LN, MA, PT, S, T, VL, Z, bounceIdx, cd, crossPts, cs, st, zz,
} from './dsl';
import type { Illu } from './dsl';

type Entry = [unit: string, lesson: string, illu: Illu];

// Candles, Lendo as Velas, Médias Móveis, Trend Lines, Suportes e Resistências, Fibonacci e Bollinger.
const candle = (start: string, presets: string[], hint?: string): Illu => ({ t: 'candle', start, presets, hint });

// ─── Padrões de candle ────────────────────────────────────────────────────
const down = () => cs(60, [58.5, 57, 55.5, 54, 52.5]);
const engolfo = () => [...down(), cd(52.5, 51.2, 0.6, 0.5), cd(50.8, 54.8, 0.5, 0.4), ...cs(54.8, [56.5, 58, 59.5])];
const harami = () => [...down(), cd(52.5, 46.5, 0.5, 0.6), cd(47.5, 49.5, 0.6, 0.5), ...cs(49.5, [51.5, 53.5, 55.5])];
const estrelaManha = () => [...down(), cd(52.5, 46.5, 0.5, 0.5), cd(45.8, 45.2, 0.9, 0.9), cd(46.5, 52.4, 0.5, 0.4), ...cs(52.4, [54, 56, 57.5])];
const martelo = () => [...down(), cd(52.5, 51.5, 0.4, 0.4), cd(51.4, 52.2, 0.3, 4.6), cd(52.4, 55.2, 0.5, 0.4), ...cs(55.2, [57, 58.5, 60])];

const engolfoScene = (): Illu => S(engolfo(), [
  st('Um engolfo de alta aparece depois de uma queda. Primeiro vemos o candle de baixa pequeno.', HL([5], 'dn')),
  st('Então surge um candle de ALTA cujo corpo cobre inteiro o corpo anterior: ele "engoliu" o candle vermelho.', HL([5, 6], 'up'), BOX(5, 6, 50.6, 54.9, 'Engolfo', 'up')),
  st('Os compradores tomaram o controle de uma vez. Se o próximo candle confirmar, a reversão ganha força.', AR([6, 54.8], [9, 59.8], 'up')),
  st('O engolfo de baixa é o espelho: acontece depois de uma alta, com um candle vermelho engolindo o verde.'),
]);

const haramiScene = (): Illu => S(harami(), [
  st('O harami começa com um candle grande, a favor da tendência (aqui, de baixa).', HL([5], 'dn')),
  st('O candle seguinte é pequeno e nasce DENTRO do corpo do anterior: a força diminuiu, como uma "grávida" (harami, em japonês).', HL([6], 'ac'), BOX(5, 6, 46.5, 52.5, 'Harami', 'ac')),
  st('É um sinal de perda de momentum, não de reversão garantida. Espere confirmação antes de agir.', AR([6, 49.5], [9, 55.5], 'up')),
]);

const estrelaScene = (): Illu => S(estrelaManha(), [
  st('A estrela da manhã tem três velas. Primeiro, um candle de baixa forte na queda.', HL([5], 'dn')),
  st('Depois, um candle pequeno (a "estrela"), com gap para baixo: os vendedores perderam o fôlego.', HL([6], 'ac')),
  st('Por fim, um candle de alta forte que fecha dentro do corpo do primeiro: os compradores assumem. Reversão para cima.', HL([7], 'up'), AR([7, 52.4], [10, 57.5], 'up')),
  st('A estrela da noite é o oposto, no topo de uma alta: alta forte → vela pequena → baixa forte.'),
]);

const confirmaScene = (): Illu => S(martelo(), [
  st('O martelo (pavio inferior longo) apareceu depois da queda. Mas SOZINHO ele é só um aviso.', HL([6], 'ac'), T(0, 49, 'martelo', 'ac')),
  st('A confirmação vem no candle seguinte: ele fecha acima da máxima do martelo.', HL([7], 'up'), AR([7, 52.4], [7, 55.2], 'up')),
  st('Só então a entrada faz sentido, com stop abaixo da mínima do martelo.', PT(8, 55.2, 'entrada', 'up'), H(47, 'stop', 'dn')),
  st('Padrões sem contexto (nível, tendência) e sem confirmação falham muito. Nunca opere uma vela sozinha.'),
]);

// ─── Médias móveis ───────────────────────────────────────────────────────
const maUp = () => zz([[0, 40], [10, 50], [14, 47], [24, 60], [28, 57], [40, 72], [44, 68], [56, 84], [60, 80]], 1.2, 1, 2);
const maCross = () => zz([[0, 72], [14, 52], [18, 54], [34, 78], [38, 76], [52, 54], [58, 56]], 1.3, 1, 4);
const maRange = () => zz([[0, 50], [4, 57], [8, 48], [12, 57], [16, 48], [20, 58], [24, 49], [28, 57], [32, 48], [36, 57], [40, 50], [44, 57], [48, 49], [52, 56]], 0.8, 1, 6);
const maTurn = () => zz([[0, 70], [14, 52], [18, 50], [24, 72], [30, 78]], 1.1, 1, 8);

// ─── Trend lines ─────────────────────────────────────────────────────────
const tlUp = () => zz([[0, 42], [4, 36], [8, 48], [12, 43], [16, 56], [20, 50], [24, 63], [28, 57], [32, 70]], 0.6, 0.6, 3);
const tlDown = () => zz([[0, 66], [4, 74], [8, 62], [12, 67], [16, 55], [20, 60], [24, 48], [28, 53], [32, 40]], 0.6, 0.6, 5);
const lowLine = (): [number, number][] => [[4, 35.2], [28, 56.2]];
const highLineUp = (): [number, number][] => [[8, 49], [32, 71]];

// ─── S/R ─────────────────────────────────────────────────────────────────
const srRange = () => zz([[0, 50], [4, 59.2], [8, 41], [12, 59.2], [16, 41], [20, 58.8], [24, 41.4], [28, 58.8], [32, 41]], 0.4, 0.7, 4);

// ─── Fibonacci ───────────────────────────────────────────────────────────
const fibBars = () => zz([[0, 44], [2, 40], [10, 70], [13, 62], [16, 51.5], [20, 60], [26, 82]], 0.5, 0.6, 9);

// ─── Bollinger ───────────────────────────────────────────────────────────
const bbCalm = () => zz([[0, 60], [10, 64, 1.7], [22, 62, 0.35], [34, 63, 0.25], [40, 66, 0.6], [54, 90, 1.2]], 1.3, 0.9, 11);

export const CHART_ILLUS: Entry[] = [
  // ─────────── Conhecendo os Candles (aulas 6 a 10) ───────────
  ['Conhecendo os Candles', 'Corpo grande x pequeno', candle('corpoGrande', ['corpoGrande', 'corpoPequeno', 'alta', 'baixa'], 'Mexa nos controles: corpo grande = convicção; corpo pequeno = indecisão.')],
  ['Conhecendo os Candles', 'O Doji', candle('doji', ['doji', 'libelula', 'lapide'], 'Aproxime abertura e fechamento e veja o nome mudar para Doji.')],
  ['Conhecendo os Candles', 'Martelo', candle('martelo', ['martelo', 'pinbar', 'estrela'], 'Alongue o pavio de baixo e deixe o corpo pequeno em cima.')],
  ['Conhecendo os Candles', 'Estrela cadente', candle('estrela', ['estrela', 'martelo', 'doji'], 'Alongue o pavio de cima e deixe o corpo pequeno embaixo.')],
  ['Conhecendo os Candles', 'Engolfo', engolfoScene()],

  // ─────────── Lendo as Velas ───────────
  ['Lendo as Velas', 'Corpo e pavio', candle('alta', ['alta', 'baixa', 'corpoGrande', 'corpoPequeno'], 'O corpo vai da abertura ao fechamento; os pavios mostram até onde o preço foi e voltou.')],
  ['Lendo as Velas', 'O Doji', candle('doji', ['doji', 'libelula', 'lapide'])],
  ['Lendo as Velas', 'O Martelo', candle('martelo', ['martelo', 'pinbar', 'estrela'])],
  ['Lendo as Velas', 'Estrela cadente', candle('estrela', ['estrela', 'martelo', 'doji'])],
  ['Lendo as Velas', 'Engolfo', engolfoScene()],
  ['Lendo as Velas', 'Marubozu', candle('marubozu', ['marubozu', 'marubozuB', 'alta'], 'Tire os pavios e deixe o corpo ocupar tudo: é a força pura de um lado.')],
  ['Lendo as Velas', 'Harami', haramiScene()],
  ['Lendo as Velas', 'Estrela da manha e da noite', estrelaScene()],
  ['Lendo as Velas', 'Pinbar', candle('pinbar', ['pinbar', 'martelo', 'estrela'], 'Um pavio gigante e corpo pequeno: o preço foi rejeitado com força.')],
  ['Lendo as Velas', 'Confirmando padroes', confirmaScene()],

  // ─────────── Médias Móveis ───────────
  ['Medias Moveis', 'O que e media movel', S(maUp(), [
    st('A média móvel é a média dos últimos N fechamentos, recalculada a cada candle. Ela "alisa" o preço.'),
    st('Mexa no período: com número pequeno ela cola no preço; com número grande fica lenta e mostra só a direção geral.'),
  ], { ctrl: 'ma', ctrlDef: 9 })],
  ['Medias Moveis', 'SMA x EMA', S(maTurn(), [
    st('A SMA dá o mesmo peso a todos os candles do período. A EMA dá mais peso aos mais recentes.'),
    st('Compare SMA e EMA com o mesmo período, principalmente na virada do preço: a EMA reage antes. Em compensação, dá mais falsos sinais.', VL(14, 'virada')),
  ], { ctrl: 'ma', ctrlDef: 9 })],
  ['Medias Moveis', 'Periodos comuns', S(zz([[0, 40], [12, 52], [16, 49], [28, 64], [32, 61], [44, 78], [48, 75], [60, 90], [64, 87]], 1.2, 1, 2), [
    st('Os períodos mais usados: 9 e 21 (curto prazo), 50 (médio) e 200 (longo, referência global).'),
    st('A média de 9 é a mais rápida: acompanha o preço de perto.', MA(9, true, 'ac')),
    st('A de 21 mostra o ritmo do swing atual.', MA(21, true, 'wn')),
    st('A de 50 é a tendência de médio prazo. A de 200 (necessita de muito histórico) é a linha divisória entre mercado "forte" e "fraco".', MA(50, false, 'dn')),
  ])],
  ['Medias Moveis', 'Inclinacao como tendencia', S(zz([[0, 40], [20, 62], [22, 61], [40, 62], [42, 60], [60, 40]], 1, 0.9, 3), [
    st('A inclinação da média diz mais que o cruzamento: é a direção da tendência.', MA(10, false, 'wn')),
    st('Subindo: tendência de alta. Procure compras.', MA(10, false, 'wn'), AR([2, 40], [18, 60], 'up')),
    st('Reta (horizontal): mercado lateral. Evite estratégias de tendência.', MA(10, false, 'wn'), AR([22, 63], [40, 63], 'ac')),
    st('Descendo: tendência de baixa. Procure vendas.', MA(10, false, 'wn'), AR([42, 61], [58, 42], 'dn')),
  ])],
  ['Medias Moveis', 'Preco vs media', S(zz([[0, 70], [12, 52], [18, 60], [28, 74], [34, 70], [44, 54]], 1.3, 1, 5), [
    st('Preço ACIMA da média indica força compradora; ABAIXO, força vendedora.', MA(14, false, 'wn')),
    st('Neste trecho de alta o preço fica acima da média quase o tempo todo.', MA(14, false, 'wn'), HL([20, 21, 22, 23, 24, 25, 26, 27], 'up')),
    st('Quando o preço fecha de forma firme abaixo da média, a força muda de mãos.', MA(14, false, 'wn'), HL([38, 39, 40, 41, 42, 43, 44], 'dn')),
  ])],
  ['Medias Moveis', 'Cruzamento de medias', S(maCross(), [
    st('Duas médias: a rápida (9) e a lenta (21).', MA(9, false, 'ac'), MA(21, false, 'wn')),
    st('Quando a rápida cruza a lenta para CIMA, é um cruzamento de alta (golden cross).', MA(9, false, 'ac'), MA(21, false, 'wn'), ...crossPts(maCross(), 9, 21, ['Golden cross', 'Death cross']).filter((a) => a.k === 'pt' && a.c === 'up')),
    st('Cruzando para BAIXO, é o death cross. O cruzamento chega depois do movimento: é confirmação, não previsão.', MA(9, false, 'ac'), MA(21, false, 'wn'), ...crossPts(maCross(), 9, 21, ['Golden cross', 'Death cross'])),
  ])],
  ['Medias Moveis', 'Suporte e resistencia dinamicos', S(maUp(), [
    st('Na tendência, a média funciona como um piso que acompanha o preço.', MA(21, true, 'wn')),
    st('Cada vez que o preço recua até a média e volta a subir, ela agiu como suporte dinâmico.', MA(21, true, 'wn'), ...bounceIdx(maUp(), 21).map((i) => HL([i], 'up'))),
    st('Se o preço perde a média com força, o "piso" acabou e a tendência pode estar virando.', MA(21, true, 'wn')),
  ])],
  ['Medias Moveis', 'Fanning', S(zz([[0, 50], [8, 52], [12, 50], [24, 64], [28, 62], [44, 90], [48, 88], [60, 112]], 1.1, 1, 6), [
    st('No começo as médias estão juntas e entrelaçadas: sem tendência definida.', MA(9, true, 'ac'), MA(21, true, 'wn'), MA(50, true, 'dn')),
    st('Em tendência forte elas se abrem como um leque (fanning): curta no alto, depois média e longa.', MA(9, true, 'ac'), MA(21, true, 'wn'), MA(50, true, 'dn'), HL([40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50], 'up')),
    st('Quanto mais aberto o leque, mais forte a tendência. Leque fechando = força acabando.', MA(9, true, 'ac'), MA(21, true, 'wn'), MA(50, true, 'dn')),
  ])],
  ['Medias Moveis', 'Cuidado em range', S(maRange(), [
    st('Em mercado lateral (range) o preço vai e volta sem direção.'),
    st('As médias ficam enroladas e cruzam o tempo todo.', MA(9, false, 'ac'), MA(21, false, 'wn')),
    st('Cada cruzamento é um falso sinal: você entra e logo o preço volta. Médias móveis não servem para range.', MA(9, false, 'ac'), MA(21, false, 'wn'), ...crossPts(maRange(), 9, 21, ['falso', 'falso'])),
  ])],
  ['Medias Moveis', 'Combinando medias', S(maUp(), [
    st('Use as três juntas: cada uma responde uma pergunta.', MA(9, true, 'ac'), MA(21, true, 'wn'), MA(50, false, 'dn')),
    st('Longa (50): qual a direção? Se o preço está acima, só compras.', MA(50, false, 'dn')),
    st('Média (21): qual o ritmo? Recuos até ela são zonas de entrada.', MA(21, true, 'wn'), MA(50, false, 'dn')),
    st('Curta (9): quando entrar? O preço voltando a cruzá-la para cima é o gatilho.', MA(9, true, 'ac'), MA(21, true, 'wn'), MA(50, false, 'dn')),
  ])],

  // ─────────── Trend Lines ───────────
  ['Trend Lines', 'O que e linha de tendencia', S(tlUp(), [
    st('O preço sobe fazendo fundos cada vez mais altos.', HL([4, 12, 20, 28], 'up')),
    st('A linha de tendência liga esses fundos e mostra o "chão" por onde o preço caminha.', LN(lowLine()[0], lowLine()[1], 'Linha de tendência', 'ac', true)),
    st('Enquanto o preço respeitar a linha, a tendência de alta segue válida.', LN(lowLine()[0], lowLine()[1], undefined, 'ac', true), AR([30, 64], [32, 70], 'up')),
  ])],
  ['Trend Lines', 'Ligando fundos na alta', S(tlUp(), [
    st('Passo 1: ache o primeiro fundo importante.', PT(4, 35.2, '1º fundo', 'ac')),
    st('Passo 2: ache o fundo seguinte, mais alto que o primeiro.', PT(4, 35.2, '1º fundo', 'ac'), PT(12, 42.2, '2º fundo', 'ac')),
    st('Passo 3: ligue os dois e estenda a linha para a direita. Ela vira um suporte ascendente.', PT(4, 35.2, undefined, 'ac'), PT(12, 42.2, undefined, 'ac'), LN(lowLine()[0], lowLine()[1], 'Suporte ascendente', 'up', true)),
  ])],
  ['Trend Lines', 'Ligando topos na baixa', S(tlDown(), [
    st('Na queda o preço faz topos cada vez mais baixos.', HL([4, 12, 20], 'dn')),
    st('Ligue os topos: nasce uma resistência descendente que "empurra" o preço para baixo.', LN([4, 74.8], [28, 53.8], 'Resistência descendente', 'dn', true)),
    st('Enquanto o preço não rompe a linha para cima, o caminho mais provável segue sendo de baixa.', LN([4, 74.8], [28, 53.8], undefined, 'dn', true), AR([28, 52], [32, 41], 'dn')),
  ])],
  ['Trend Lines', 'Validacao por toques', S(tlUp(), [
    st('Com 2 pontos você consegue traçar a linha, mas ela ainda é só uma hipótese.', LN(lowLine()[0], lowLine()[1], undefined, 'mu', true), PT(4, 35.2, '1', 'ac'), PT(12, 42.2, '2', 'ac')),
    st('O 3º toque que respeita a linha VALIDA ela: o mercado concordou com o seu traço.', LN(lowLine()[0], lowLine()[1], undefined, 'ac', true), PT(4, 35.2, '1', 'ac'), PT(12, 42.2, '2', 'ac'), PT(20, 49.2, '3 ✓', 'up')),
    st('Quanto mais toques respeitados, mais traders enxergam a mesma linha e mais forte ela fica. Cuidado: ela também fica mais "óbvia" para o rompimento.', LN(lowLine()[0], lowLine()[1], undefined, 'up', true), PT(4, 35.2, '1', 'ac'), PT(12, 42.2, '2', 'ac'), PT(20, 49.2, '3 ✓', 'up'), PT(28, 56.2, '4 ✓', 'up')),
  ])],
  ['Trend Lines', 'Inclinacao saudavel x ingreme', S(zz([[0, 40], [20, 56], [24, 54], [28, 70], [30, 82], [32, 92], [34, 74], [38, 58]], 0.8, 0.8, 7), [
    st('Uma linha de inclinação moderada (saudável) é sustentável: o preço sobe devagar e com pausas.', LN([0, 39], [20, 55], 'Saudável', 'up', true)),
    st('Quando o preço acelera, a linha fica íngreme: um movimento rápido demais costuma ser difícil de sustentar.', LN([0, 39], [20, 55], undefined, 'mu', true), LN([24, 53], [32, 91], 'Íngreme', 'wn', false)),
    st('Linhas muito inclinadas rompem com facilidade e o preço devolve rápido o que subiu. Prefira ângulos moderados.', LN([24, 53], [32, 91], undefined, 'wn', true), AR([32, 92], [38, 58], 'dn')),
  ])],
  ['Trend Lines', 'Rompimento e reteste', S(zz([[0, 42], [4, 36], [8, 48], [12, 43], [16, 56], [20, 50], [24, 63], [27, 50], [30, 55], [36, 41]], 0.5, 0.6, 3), [
    st('A linha de tendência vinha sendo respeitada.', LN(lowLine()[0], lowLine()[1], undefined, 'ac', true)),
    st('O preço fecha ABAIXO da linha: rompimento. A linha de suporte foi perdida.', LN(lowLine()[0], lowLine()[1], undefined, 'ac', true), PT(27, 50, 'rompeu', 'dn')),
    st('Ele volta a tocar a linha por baixo (reteste): o antigo suporte virou resistência.', LN(lowLine()[0], lowLine()[1], undefined, 'ac', true), PT(27, 50, 'rompeu', 'dn'), PT(30, 55, 'reteste', 'wn')),
    st('Confirmado o reteste, o preço segue na nova direção. Muitos traders entram nessa rejeição.', LN(lowLine()[0], lowLine()[1], undefined, 'ac', true), AR([30, 55], [36, 41], 'dn')),
  ])],
  ['Trend Lines', 'Canal de tendencia', S(tlUp(), [
    st('Além da linha de baixo (suporte), trace uma paralela passando pelos topos.', LN(lowLine()[0], lowLine()[1], 'Linha inferior', 'ac', true)),
    st('Isso forma um canal: o preço caminha entre dois "trilhos" paralelos.', LN(lowLine()[0], lowLine()[1], undefined, 'ac', true), LN(highLineUp()[0], highLineUp()[1], 'Linha superior', 'wn', true)),
    st('Dentro do canal: comprar perto da linha de baixo e realizar perto da linha de cima.', LN(lowLine()[0], lowLine()[1], undefined, 'ac', true), LN(highLineUp()[0], highLineUp()[1], undefined, 'wn', true), AR([20, 50], [24, 63], 'up')),
  ])],
  ['Trend Lines', 'Linha de canal', S(tlUp(), [
    st('A linha de canal é a paralela superior. Ela marca onde o preço costuma "cansar" na alta.', LN(lowLine()[0], lowLine()[1], undefined, 'ac', true), LN(highLineUp()[0], highLineUp()[1], 'Linha de canal', 'wn', true)),
    st('Use-a como alvo: quando o preço chega nela, é hora de pensar em realizar lucro.', LN(lowLine()[0], lowLine()[1], undefined, 'ac', true), LN(highLineUp()[0], highLineUp()[1], undefined, 'wn', true), PT(24, 63.8, 'alvo', 'wn')),
    st('Se o preço rompe a linha de canal para CIMA, a tendência está acelerando; se não chega nela, a força está diminuindo.', LN(lowLine()[0], lowLine()[1], undefined, 'ac', true), LN(highLineUp()[0], highLineUp()[1], undefined, 'wn', true)),
  ])],
  ['Trend Lines', 'Falsos rompimentos', (() => {
    const b = tlUp();
    b[20] = cd(b[19].c, 51, 0.4, 4.4);
    return S(b, [
      st('O preço se aproxima da linha de tendência.', LN(lowLine()[0], lowLine()[1], undefined, 'ac', true)),
      st('Ele "fura" a linha com o pavio, mas FECHA de volta acima: foi só uma armadilha para tirar quem apostou no rompimento.', LN(lowLine()[0], lowLine()[1], undefined, 'ac', true), PT(20, 46.5, 'falso rompimento', 'wn')),
      st('A tendência continua. Para evitar a cilada, espere o FECHAMENTO do candle além da linha, e não só o toque.', LN(lowLine()[0], lowLine()[1], undefined, 'ac', true), AR([20, 51], [24, 63], 'up')),
    ]);
  })()],
  ['Trend Lines', 'Trend line em varios tempos', { t: 'tf', dual: ['H4', 'M15'], foot: 'Trace a linha principal no tempo maior (ela pesa mais) e use o tempo menor só para refinar a entrada. A linha do H4 é respeitada por muito mais gente que a do M15.' }],

  // ─────────── Suportes e Resistências ───────────
  ['Suportes e Resistencias', 'O que sao S/R', S(srRange(), [
    st('O preço sobe e para sempre na mesma região: cai e volta a subir.'),
    st('Suporte é o "piso": a região onde os compradores seguram a queda.', H(40.2, 'Suporte', 'up')),
    st('Resistência é o "teto": a região onde os vendedores seguram a alta.', H(40.2, 'Suporte', 'up'), H(59.8, 'Resistência', 'dn')),
  ])],
  ['Suportes e Resistencias', 'Como tracar', S(srRange(), [
    st('Olhe o gráfico para trás e encontre os pontos onde o preço virou mais de uma vez.', HL([4, 8, 12, 16, 20, 24, 28, 32], 'ac')),
    st('Os topos que viraram na mesma altura formam a resistência.', H(59.8, 'Resistência', 'dn')),
    st('E os fundos na mesma altura formam o suporte. Quanto mais tempo e mais virações, mais importante o nível.', H(59.8, 'Resistência', 'dn'), H(40.2, 'Suporte', 'up')),
  ])],
  ['Suportes e Resistencias', 'Zonas, nao linhas exatas', (() => {
    const b = zz([[0, 50], [4, 58.4], [8, 42], [12, 60.4], [16, 41], [20, 57.8], [24, 43], [28, 59.5], [32, 41.5]], 0.5, 1.8, 10);
    return S(b, [
      st('Se você traçar uma linha exata, o preço quase nunca toca nela no mesmo ponto: os pavios passam um pouco, outros ficam aquém.', H(60, undefined, 'dn')),
      st('Por isso pense em ZONAS: uma faixa de preço, e não um número só.', Z(58.2, 61.8, 'Zona de resistência', 'dn'), Z(38.2, 42, 'Zona de suporte', 'up')),
      st('Colocar stop no meio da zona é arriscado; coloque além dela, com folga.', Z(58.2, 61.8, 'Zona de resistência', 'dn'), Z(38.2, 42, 'Zona de suporte', 'up')),
    ]);
  })()],
  ['Suportes e Resistencias', 'Inversao de papeis', S(zz([[0, 50], [4, 59.2], [8, 46], [12, 59.2], [16, 46], [20, 59.2], [24, 68], [28, 61], [32, 71], [36, 66]], 0.5, 0.6, 3), [
    st('Aqui a resistência segurou o preço três vezes.', H(60, 'Resistência', 'dn'), HL([4, 12, 20], 'dn')),
    st('Quando o preço rompe com força para cima, a resistência é vencida.', H(60, 'Resistência', 'dn'), PT(24, 68, 'rompimento', 'up')),
    st('O preço volta ao nível e ele agora funciona como SUPORTE: o antigo teto virou piso. É a inversão de papéis.', H(60, 'Agora suporte', 'up'), PT(28, 61, 'reteste', 'up')),
  ])],
  ['Suportes e Resistencias', 'Numero de toques', S(srRange(), [
    st('Cada vez que o preço toca o nível e respeita, a confiança nele aumenta.', H(40.2, 'Suporte', 'up'), PT(8, 41, '1º', 'up')),
    st('Com 3 ou 4 toques o nível já é conhecido por todo mundo.', H(40.2, undefined, 'up'), PT(8, 41, '1º', 'up'), PT(16, 41, '2º', 'up'), PT(24, 41.4, '3º', 'up')),
    st('Atenção: muitos toques também enfraquecem o nível, porque as ordens que o seguravam vão sendo consumidas. O rompimento fica mais provável.', H(40.2, undefined, 'up'), PT(8, 41, '1º', 'up'), PT(16, 41, '2º', 'up'), PT(24, 41.4, '3º', 'up'), PT(32, 41, '4º', 'wn')),
  ])],
  ['Suportes e Resistencias', 'Niveis psicologicos', S(zz([[0, 52], [4, 59.6], [8, 52], [12, 59.6], [16, 51], [20, 59.8], [24, 69.6], [28, 61], [32, 69.8], [36, 62]], 0.5, 0.6, 5), [
    st('Os números redondos (1.1000, 1.1100, 1.1200...) atraem ordens, pois muita gente pensa neles.', H(60, '1.1000', 'wn'), H(70, '1.1100', 'wn'), H(50, '1.0900', 'wn')),
    st('É por isso que o preço frequentemente trava, reage ou "dança" em torno desses níveis.', H(60, '1.1000', 'wn'), H(70, '1.1100', 'wn'), H(50, '1.0900', 'wn'), HL([4, 12, 20, 28], 'wn')),
    st('Não precisam de justificativa técnica: são zonas de decisão porque os traders decidem ali.', H(60, '1.1000', 'wn'), H(70, '1.1100', 'wn'), H(50, '1.0900', 'wn')),
  ])],
  ['Suportes e Resistencias', 'Rompimento x respeito', { t: 'compare',
    a: { t: 'Aposta no rompimento', tone: 'up', pts: ['Entra quando o preço fecha além do nível.', 'Stop curto, do outro lado do nível.', 'Risco: falso rompimento (o preço volta para dentro).', 'Funciona melhor com volume e depois de muitos toques.'] },
    b: { t: 'Aposta no respeito', tone: 'ac', pts: ['Entra na rejeição do nível, a favor da reversão.', 'Stop logo além do nível.', 'Risco: o nível romper e acelerar contra você.', 'Funciona melhor com candle de rejeição (pavio) e contexto.'] },
    foot: 'Nenhuma é "a certa": defina antes qual cenário você espera e onde ele deixa de valer.' }],
  ['Suportes e Resistencias', 'Pullback ao nivel', S(zz([[0, 50], [4, 59], [8, 50], [12, 59.3], [16, 50], [20, 59.4], [24, 68], [28, 60.8], [34, 76]], 0.5, 0.6, 7), [
    st('O preço rompeu a resistência e disparou.', H(60, undefined, 'dn'), PT(24, 68, 'rompimento', 'up')),
    st('Perseguir o preço no alto é arriscado. A melhor entrada costuma vir no pullback: o retorno ao nível rompido.', H(60, 'Antiga resistência', 'up'), PT(28, 60.8, 'pullback', 'ac')),
    st('Se o nível segura como suporte, você entra com stop curto logo abaixo e alvo para cima.', H(60, undefined, 'up'), PT(28, 60.8, 'entrada', 'up'), H(57.5, 'stop', 'dn'), AR([28, 61], [34, 76], 'up')),
  ])],
  ['Suportes e Resistencias', 'S/R em timeframes maiores', S(zz([[0, 52], [4, 60], [8, 50], [12, 59], [16, 55], [20, 61], [24, 52], [28, 60.5], [32, 53]], 0.9, 1.4, 12), [
    st('Os níveis do gráfico pequeno são fracos e mudam toda hora.', H(53, 'M15 (fraco)', 'mu')),
    st('Os níveis dos tempos maiores (diário, semanal) são formados por muito mais negociações: são os que realmente importam.', Z(58, 62, 'Zona do Diário', 'wn')),
    st('Marque primeiro as zonas do tempo maior; só depois refine a entrada em um tempo menor.', Z(58, 62, 'Zona do Diário', 'wn'), Z(48, 51.5, 'Zona do Diário', 'wn')),
  ])],
  ['Suportes e Resistencias', 'Operando os niveis', { t: 'reveal', mode: 'flow', lead: 'O roteiro prático de uma operação em nível. Toque em cada etapa.', items: [
    { h: 'Marque o nível no tempo maior', b: 'Identifique a zona de suporte ou resistência mais clara, com vários toques no passado.' },
    { h: 'Espere o preço chegar', b: 'Não persiga o preço. Deixe ele vir até a zona e observe a reação.' },
    { h: 'Procure uma confirmação', b: 'Um candle de rejeição (pavio longo, engolfo) mostra que o nível está sendo respeitado.' },
    { h: 'Stop além da zona', b: 'Coloque o stop do outro lado do nível, com folga: se o nível cai, você sai com perda pequena.' },
    { h: 'Alvo no próximo nível', b: 'Mire a próxima zona oposta. Confirme se o retorno compensa o risco antes de entrar.' },
  ] }],

  // ─────────── Fibonacci ───────────
  ['Fibonacci', 'A sequencia e o 0.618', { t: 'calc', k: 'fibseq' }],
  ['Fibonacci', 'Retracao de Fibonacci', S(fibBars(), [
    st('O preço subiu forte e agora começa a corrigir (recuar).', AR([2, 40], [10, 70], 'up')),
    st('A retração de Fibonacci mede até onde esse recuo pode ir, em porcentagens do movimento.', FIB([2, 40], [10, 70])),
    st('Os recuos tendem a parar perto dos níveis 0,382, 0,5 e 0,618. Aqui ele parou em 0,618 e voltou a subir.', FIB([2, 40], [10, 70]), PT(16, 51.5, '0,618', 'wn'), AR([16, 51.5], [26, 82], 'up')),
  ])],
  ['Fibonacci', 'Niveis 0.382, 0.5 e 0.618', S(fibBars(), [
    st('0,382: correção rasa. Tendência forte, os compradores voltam rápido.', FIB([2, 40], [10, 70], { lv: [0, 0.382, 1] }), PT(13, 58.5, '0,382', 'wn')),
    st('0,5: o meio do caminho. Não é um número de Fibonacci, mas é muito observado pelos traders.', FIB([2, 40], [10, 70], { lv: [0, 0.382, 0.5, 1] }), PT(13, 55, '0,5', 'wn')),
    st('0,618: a correção "normal" profunda. Perder esse nível costuma indicar que a tendência está em risco.', FIB([2, 40], [10, 70], { lv: [0, 0.382, 0.5, 0.618, 1] }), PT(16, 51.5, '0,618', 'wn')),
  ])],
  ['Fibonacci', 'Zona de ouro', S(fibBars(), [
    st('A "zona de ouro" fica entre 0,5 e 0,618.', FIB([2, 40], [10, 70], { lv: [0, 0.5, 0.618, 1], gold: true })),
    st('É a região onde o recuo mais frequentemente termina e a tendência retoma. Procure suas entradas ali.', FIB([2, 40], [10, 70], { lv: [0, 0.5, 0.618, 1], gold: true }), PT(16, 51.5, 'reação', 'up'), AR([16, 51.5], [26, 82], 'up')),
  ])],
  ['Fibonacci', 'Como tracar', S(fibBars(), [
    st('Passo 1: identifique um movimento claro (swing). Marque o ponto onde ele COMEÇA (fundo).', PT(2, 39.4, 'início', 'ac')),
    st('Passo 2: marque onde ele TERMINA (topo).', PT(2, 39.4, 'início', 'ac'), PT(10, 71, 'fim', 'ac')),
    st('Passo 3: arraste a ferramenta do fundo ao topo (em alta). Os níveis aparecem sozinhos.', PT(2, 39.4, undefined, 'ac'), PT(10, 71, undefined, 'ac'), FIB([2, 40], [10, 70])),
    st('Em movimento de baixa, faça o contrário: do topo ao fundo.'),
  ])],
  ['Fibonacci', 'Extensoes 1.272 e 1.618', S(fibBars(), [
    st('Retrações medem o recuo. Extensões projetam até onde o próximo movimento pode ir.', FIB([2, 40], [10, 70], { lv: [0, 1] })),
    st('Mede-se o movimento original e projeta-se a partir do início: 1,272 e 1,618 são os alvos mais usados.', FIB([2, 40], [10, 70], { lv: [1, 1.272, 1.618], ext: true })),
    st('Quando o preço retoma a alta, esses níveis viram alvos naturais para realizar lucro.', FIB([2, 40], [10, 70], { lv: [1, 1.272, 1.618], ext: true }), AR([16, 51.5], [26, 82], 'up')),
  ], { ext: 2 })],
  ['Fibonacci', 'Confluencia com S/R', S(fibBars(), [
    st('Confluência é quando duas ferramentas apontam para o mesmo lugar.', FIB([2, 40], [10, 70], { lv: [0, 0.5, 0.618, 1] })),
    st('Aqui existe um suporte antigo bem na altura do 0,618: dois motivos para o preço reagir ali.', FIB([2, 40], [10, 70], { lv: [0, 0.5, 0.618, 1] }), Z(50.5, 52.5, 'Suporte + 0,618', 'wn')),
    st('Quanto mais fatores se encontram numa região, mais forte ela tende a ser. Procure confluências, não níveis soltos.', FIB([2, 40], [10, 70], { lv: [0, 0.5, 0.618, 1] }), Z(50.5, 52.5, 'Suporte + 0,618', 'wn'), AR([16, 51.5], [26, 82], 'up')),
  ])],
  ['Fibonacci', 'Fibonacci em pullbacks', S(fibBars(), [
    st('1) Tendência de alta confirmada e um pullback começando.', AR([2, 40], [10, 70], 'up')),
    st('2) Trace o Fibonacci no último movimento e espere o preço chegar na zona de ouro.', FIB([2, 40], [10, 70], { lv: [0, 0.382, 0.5, 0.618, 0.786, 1], gold: true })),
    st('3) Entre quando surgir sinal de retomada (candle de alta). Stop abaixo de 0,786 ou abaixo do fundo do pullback.', FIB([2, 40], [10, 70], { lv: [0, 0.382, 0.5, 0.618, 0.786, 1], gold: true }), PT(17, 53.5, 'entrada', 'up')),
    st('4) Alvo: a máxima anterior (nível 0) ou as extensões.', FIB([2, 40], [10, 70], { lv: [0, 0.5, 0.618, 1], gold: true }), AR([17, 54], [26, 82], 'up')),
  ])],
  ['Fibonacci', 'Erros comuns', { t: 'reveal', lead: 'Toque em cada erro para ver como evitar.', items: [
    { h: 'Traçar em qualquer pico', b: 'A ferramenta só faz sentido num movimento claro e relevante. Escolher pontos aleatórios gera níveis aleatórios.' },
    { h: 'Mudar os pontos até "encaixar"', b: 'Se você muda a âncora até o preço bater num nível, está se enganando. Defina o swing ANTES.' },
    { h: 'Usar Fibonacci sozinho', b: 'Os níveis são regiões de interesse, não garantias. Combine com tendência, S/R e candle de confirmação.' },
    { h: 'Esquecer o stop', b: 'Entrar no 0,618 sem plano de saída: se o nível perde, o próximo é o fundo. Defina onde a ideia deixa de valer.' },
    { h: 'Tratar nível como linha exata', b: 'Pense em zonas. O preço pode ultrapassar um pouco o nível e ainda assim respeitar a ideia.' },
  ] }],
  ['Fibonacci', 'Combinando com price action', S((() => {
    const b = fibBars();
    b[16] = cd(b[15].c, 52.4, 0.3, 4.8);
    return b;
  })(), [
    st('O Fibonacci aponta ONDE olhar. O candle diz SE o preço respeitou.', FIB([2, 40], [10, 70], { lv: [0, 0.5, 0.618, 1], gold: true })),
    st('Na zona de ouro surge um martelo (pavio inferior longo): rejeição clara do fundo.', FIB([2, 40], [10, 70], { lv: [0, 0.5, 0.618, 1], gold: true }), HL([16], 'up'), T(13, 46, 'martelo', 'up')),
    st('Setup completo: tendência + Fibonacci + candle de confirmação. Entrada no rompimento da máxima do martelo, stop abaixo dele.', FIB([2, 40], [10, 70], { lv: [0, 0.5, 0.618, 1], gold: true }), HL([16], 'up'), PT(17, 56, 'entrada', 'up'), AR([17, 56], [26, 82], 'up')),
  ])],

  // ─────────── Bandas de Bollinger ───────────
  ['Bandas de Bollinger', 'O que sao as Bandas', S(bbCalm(), [
    st('As Bandas de Bollinger são três linhas em volta do preço: uma média no centro e duas bandas, uma acima e outra abaixo.', BB()),
    st('As bandas ficam a 2 desvios padrão da média: elas medem o quanto o preço costuma se afastar dela.', BB()),
    st('Mexa nos desvios padrão para ver as bandas encolherem e crescerem.'),
  ], { ctrl: 'bb', ctrlDef: 2 })],
  ['Bandas de Bollinger', 'A linha central', S(zz([[0, 40], [20, 60], [24, 57], [40, 76], [44, 73], [56, 92]], 1.6, 1, 14), [
    st('A linha central é uma média móvel de 20 períodos.', BB()),
    st('Ela mostra a direção: subindo, o preço está em tendência de alta; descendo, de baixa.', BB(), AR([4, 42], [54, 90], 'up')),
    st('O preço tende a voltar para ela depois de se afastar. Por isso ela vira alvo natural das operações de reversão.', BB()),
  ])],
  ['Bandas de Bollinger', 'Largura e volatilidade', S(bbCalm(), [
    st('Quando o mercado está calmo, os candles são curtos e as bandas ficam próximas.', BB(), HL([26, 27, 28, 29, 30, 31, 32], 'ac')),
    st('Quando o mercado fica agitado, os candles aumentam e as bandas se abrem.', BB(), HL([44, 45, 46, 47, 48, 49, 50, 51], 'wn')),
    st('A largura das bandas é um termômetro de volatilidade. Aperto costuma anteceder movimento forte.', BB()),
  ])],
  ['Bandas de Bollinger', 'O squeeze (aperto)', S(bbCalm(), [
    st('O squeeze é quando as bandas se aproximam muito. Veja a faixa destacada: o preço quase não se mexe.', BB(), BOX(23, 36, 61, 64.6, 'Squeeze', 'ac')),
    st('Calmaria costuma vir antes da tempestade: a volatilidade volta e o preço escolhe uma direção.', BB(), BOX(23, 36, 61, 64.6, undefined, 'ac'), AR([38, 64], [54, 90], 'up')),
    st('O squeeze não diz a direção. Espere o rompimento para saber de que lado o mercado vai.', BB()),
  ])],
  ['Bandas de Bollinger', 'A expansao', S(bbCalm(), [
    st('Depois do aperto vem a expansão: as bandas se abrem em direções opostas.', BB(), HL([40, 41, 42, 43, 44, 45, 46], 'wn')),
    st('Candles grandes fora do centro mostram que o mercado se soltou e há convicção.', BB(), AR([38, 64], [54, 90], 'up')),
    st('Em geral, o movimento já está em andamento. Entrar tarde demais é perseguir o preço.', BB()),
  ])],
  ['Bandas de Bollinger', 'Caminhando na banda', S(zz([[0, 50], [8, 58, 1], [44, 98, 0.5]], 0.8, 0.7, 4), [
    st('Em tendência forte, o preço pode "caminhar" colado na banda superior.', BB()),
    st('Isso NÃO é sinal de venda: é sinal de força. O preço só perde o ritmo quando volta para a média.', BB(), AR([10, 60], [44, 98], 'up')),
    st('Em alta, os recuos até a linha central são oportunidades; perder a central pode ser o início do fim.', BB()),
  ])],
  ['Bandas de Bollinger', 'Toques nas bandas', S(zz([[0, 50], [5, 60], [10, 42], [15, 60], [20, 42], [25, 60], [30, 42], [35, 58], [40, 44], [45, 60]], 0.8, 0.8, 8), [
    st('Em mercado lateral, o preço costuma quicar nas bandas.', BB()),
    st('Mas tocar a banda não é sinal automático de reversão. Em tendência, tocar a banda é só o preço andando forte.', BB()),
    st('Procure um candle de rejeição e o contexto (lateral ou tendência) antes de agir no toque.', BB()),
  ])],
  ['Bandas de Bollinger', 'Reversao a media', S(zz([[0, 50], [5, 60], [10, 42], [15, 60], [20, 42], [25, 60], [30, 42], [35, 58], [40, 44], [45, 60]], 0.8, 0.8, 8), [
    st('A ideia: o preço esticado tende a voltar para a média (a linha central).', BB()),
    st('Em mercado lateral, uma rejeição na banda superior pode levar o preço de volta ao centro.', BB(), AR([5, 61], [10, 46], 'dn')),
    st('Stop curto além da banda; alvo na linha central. Só funciona com mercado sem tendência clara.', BB(), AR([10, 42], [15, 56], 'up')),
  ])],
  ['Bandas de Bollinger', 'Bollinger e tendencia', S(zz([[0, 50], [10, 62], [14, 58], [28, 78], [32, 74], [50, 96]], 1.4, 1, 5), [
    st('Combine as bandas com a direção da tendência (uma média de 50, por exemplo).', BB(), MA(50, false, 'dn')),
    st('Em alta, só compre recuos até a linha central ou banda inferior. Ignore sinais de venda na banda superior.', BB(), MA(50, false, 'dn')),
    st('Contexto primeiro, ferramenta depois: a mesma banda pode ser sinal de reversão ou de continuação.', BB(), MA(50, false, 'dn')),
  ])],
  ['Bandas de Bollinger', 'Configuracoes comuns', S(bbCalm(), [
    st('A configuração padrão é 20 períodos e 2 desvios, por isso quase todo trader enxerga as mesmas bandas.', BB()),
    st('Mais desvios (2,5 ou 3) deixam as bandas largas: menos toques, sinais mais raros e mais fortes.', BB(20, 3)),
    st('Menos desvios (1 ou 1,5) deixam as bandas estreitas: muitos toques e muitos falsos sinais. Teste o controle abaixo.', BB(20, 1)),
  ], { ctrl: 'bb', ctrlDef: 2 })],
];
