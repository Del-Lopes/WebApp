import { AR, FIB, H, HL, LN, PT, S, T, Z, st, zz } from './dsl';
import type { Illu } from './dsl';

type Entry = [unit: string, lesson: string, illu: Illu];

// Corretoras, MetaTrader, Expert Advisors, Instalando um EA e Método APP.
const grid = (items: { h: string; b: string; p?: string }[], lead?: string): Illu => ({ t: 'reveal', items, lead });
const flow = (items: { h: string; b: string; p?: string }[], lead?: string): Illu => ({ t: 'reveal', items, lead, mode: 'flow' });
const check = (items: { h: string; b: string; p?: string }[], lead?: string): Illu => ({ t: 'reveal', items, lead, mode: 'check' });
const calc = (k: Extract<Illu, { t: 'calc' }>['k']): Illu => ({ t: 'calc', k });

// Ordens pendentes: preço atual no meio, com as quatro ordens ao redor.
const pendingBars = () => zz([[0, 50], [6, 54], [10, 51], [14, 53], [18, 50.5]], 0.6, 0.6, 5);
// Operação de compra: entrada, andamento a favor e saída.
const tradeBars = () => zz([[0, 50], [4, 52], [8, 51], [14, 58], [18, 56], [24, 64]], 0.6, 0.6, 7);

// Método APP: onda 1 (amplitude), pullback na zona de Fibonacci, rompimento da trend line e alvos.
const app = () => zz([[0, 44], [2, 38.5], [10, 70], [12, 64], [13, 66], [15, 58], [16, 60], [18, 52], [20, 56], [22, 64], [26, 72], [30, 84]], 0.4, 0.6, 9);
const appTL = (): [number, number][] => [[10, 70.5], [16, 60.5]];

export const PLATFORM_ILLUS: Entry[] = [
  // ─────────── Corretoras ───────────
  ['Corretoras', 'O que e uma corretora', flow([
    { h: 'Você', b: 'O trader: quer comprar ou vender um ativo, mas não consegue falar sozinho com o mercado.' },
    { h: 'Corretora', b: 'Intermediária regulada: recebe sua ordem, guarda seu dinheiro e entrega a plataforma de operação.' },
    { h: 'Mercado', b: 'Onde compradores e vendedores se encontram: bancos, fundos, outras corretoras e traders.' },
  ], 'A corretora é a ponte entre você e o mercado. Toque em cada elo.')],
  ['Corretoras', 'Como a corretora te conecta ao mercado', flow([
    { h: 'Você clica em Comprar', b: 'No MetaTrader (ou outra plataforma) você define ativo, lote, stop e alvo, e envia a ordem.' },
    { h: 'A ordem vai ao servidor', b: 'A corretora recebe a ordem em milissegundos e confere margem, preço e horário.' },
    { h: 'Roteamento', b: 'A corretora envia a ordem a provedores de liquidez (bancos e redes) ou a executa internamente.' },
    { h: 'Execução e confirmação', b: 'O mercado casa sua ordem com uma contraparte e a posição aparece aberta na sua plataforma.' },
  ], 'Do clique até a posição aberta.')],
  ['Corretoras', 'Spread e comissoes', calc('commission')],
  ['Corretoras', 'Tipos de conta', grid([
    { h: 'Cent', b: 'Conta com valores em centavos: 1 lote vale 1.000 unidades. Ideal para aprender com dinheiro real e risco baixíssimo.' },
    { h: 'Standard', b: 'Conta tradicional, sem comissão: o custo está embutido num spread um pouco maior. Simples de entender.' },
    { h: 'ECN / Raw', b: 'Spread muito baixo + comissão por lote. Preferida por scalpers e quem opera volume, pois o custo total costuma ser menor.' },
    { h: 'Demo', b: 'Dinheiro virtual com mercado real. Perfeita para testar plataforma e estratégia antes de arriscar capital.' },
  ], 'Cada conta serve a um perfil. Toque para comparar.')],
  ['Corretoras', 'Regulacao e seguranca', check([
    { h: 'Regulada por órgão sério', b: 'Procure FCA (Reino Unido), ASIC (Austrália), CySEC (Chipre), CVM/Banco Central (Brasil) ou similar. Confira o registro no site do regulador.' },
    { h: 'Segregação de fundos', b: 'Seu dinheiro fica em conta separada da empresa, e não é usado para pagar contas da corretora.' },
    { h: 'Empresa com história', b: 'Tempo de mercado, reputação e histórico de saques sem problema valem mais que promessas.' },
    { h: 'Sem promessas absurdas', b: 'Se prometem lucro garantido, bônus gigantes ou "robô que não perde", fuja.' },
  ], 'Antes de depositar, confira cada item.')],
  ['Corretoras', 'Deposito e saque', flow([
    { h: 'Abra e verifique a conta', b: 'Documento e comprovante de residência são exigidos (KYC). É normal, e protege você.' },
    { h: 'Deposite', b: 'PIX, cartão, transferência ou cripto. Confira taxas e se o depósito entra em minutos.' },
    { h: 'Opere', b: 'O saldo vira capital para margem. Comece pequeno e com gestão de risco.' },
    { h: 'Saque', b: 'Peça o saque pelo mesmo método do depósito. Teste um saque pequeno cedo para conhecer o processo.' },
  ])],
  ['Corretoras', 'Execucao de ordens', { t: 'compare',
    a: { t: 'Execução a mercado', tone: 'up', pts: ['A ordem é executada no melhor preço disponível NA HORA.', 'Garante a execução, mas o preço pode mudar (slippage).', 'É o tipo mais comum em contas modernas.'] },
    b: { t: 'Execução instantânea', tone: 'ac', pts: ['Você vê um preço e pede para executar naquele valor.', 'Se o preço mudou, a corretora pode recotar ou rejeitar a ordem.', 'Mais previsível em preço, mas pode haver rejeições em mercados rápidos.'] },
    foot: 'Em notícias fortes, qualquer tipo de execução pode ter slippage.' }],
  ['Corretoras', 'Slippage', calc('slip')],
  ['Corretoras', 'Alavancagem oferecida', calc('lev')],
  ['Corretoras', 'Como escolher uma corretora', check([
    { h: 'Regulação', b: 'Órgão reconhecido e registro verificável.' },
    { h: 'Custos totais', b: 'Compare spread + comissão + swap, não só o spread.' },
    { h: 'Plataforma', b: 'Oferece MetaTrader 4/5 ou a plataforma que você usa, estável e sem travamentos.' },
    { h: 'Depósito e saque', b: 'Métodos locais (PIX), rapidez e sem taxas escondidas.' },
    { h: 'Atendimento', b: 'Suporte em português, que responda rápido quando você precisar.' },
    { h: 'Conta demo', b: 'Permite testar tudo antes de depositar.' },
  ], 'Use este checklist antes de abrir a conta. Marque o que a corretora cumpre.')],

  // ─────────── MetaTrader ───────────
  ['MetaTrader', 'O que e o MetaTrader', grid([
    { h: 'Gráficos', b: 'Candles, linhas, barras e mais de 30 indicadores prontos. Dá para abrir vários gráficos e tempos ao mesmo tempo.' },
    { h: 'Negociação', b: 'Envio de ordens a mercado ou pendentes, com stop e alvo, direto do gráfico.' },
    { h: 'Robôs (EAs)', b: 'Roda Expert Advisors que operam sozinhos, segundo regras programadas.' },
    { h: 'Testes', b: 'O testador de estratégia permite validar uma ideia no histórico antes de arriscar dinheiro.' },
  ], 'A plataforma mais usada do mundo. Toque no que ela faz.')],
  ['MetaTrader', 'Diferencas entre MT4 e MT5', { t: 'compare',
    a: { t: 'MetaTrader 4', tone: 'ac', pts: ['Lançado em 2005; leve e muito difundido.', 'Foco em forex, com ordens "hedge".', 'Linguagem MQL4; 9 tempos gráficos.', 'Enorme acervo de robôs e indicadores.'] },
    b: { t: 'MetaTrader 5', tone: 'up', pts: ['Mais moderno, rápido e multiativos (forex, ações, índices, cripto).', '21 tempos gráficos e mais ferramentas.', 'Linguagem MQL5; testador de estratégia superior.', 'É o padrão para quem começa hoje.'] },
    foot: 'Os robôs de um não rodam no outro: confira qual a sua corretora oferece.' }],
  ['MetaTrader', 'A interface do MetaTrader', { t: 'map', title: 'Tela do MetaTrader 5 (simulada)', regions: [
    { id: 'menu', l: 'Menu e barra de ferramentas', b: 'Arquivo, Visualizar, Inserir... e atalhos para novo gráfico, tempos gráficos, zoom e AutoTrading.', r: [0, 0, 100, 12] },
    { id: 'obs', l: 'Observação de mercado', b: 'Lista de ativos com preço bid/ask em tempo real. Clique duas vezes num ativo para abrir o gráfico.', r: [0, 14, 22, 40] },
    { id: 'nav', l: 'Navegador', b: 'Contas, indicadores, Expert Advisors e scripts. É daqui que você arrasta um robô para o gráfico.', r: [0, 56, 22, 28] },
    { id: 'graf', l: 'Gráfico', b: 'O coração da plataforma: candles, indicadores e linhas. Botão direito para opções.', r: [24, 14, 76, 56] },
    { id: 'term', l: 'Caixa de ferramentas', b: 'Mostra operações abertas, saldo, histórico, alertas e o diário de ocorrências (aba Experts).', r: [24, 72, 76, 26] },
  ] }],
  ['MetaTrader', 'Aplicar indicadores', flow([
    { h: 'Abra o menu Inserir', b: 'No topo da plataforma, clique em Inserir.', p: 'Inserir' },
    { h: 'Escolha a categoria', b: 'Tendência, Osciladores, Volumes ou Bill Williams. Cada uma agrupa indicadores parecidos.', p: 'Inserir › Indicadores › Tendência' },
    { h: 'Selecione o indicador', b: 'Por exemplo, Moving Average (média móvel).', p: 'Inserir › Indicadores › Tendência › Moving Average' },
    { h: 'Ajuste e confirme', b: 'Na janela, defina período, método (SMA/EMA), cor e espessura e clique em OK. O indicador aparece no gráfico.', p: 'Período: 21 · Método: Exponential · OK' },
  ], 'Do menu até o gráfico, em 4 passos.')],
  ['MetaTrader', 'Tipos de ordem', { t: 'compare',
    a: { t: 'Ordem a mercado', tone: 'up', pts: ['Executa AGORA, ao preço atual.', 'Você entra imediatamente.', 'Use quando o cenário já está pronto.'] },
    b: { t: 'Ordem pendente', tone: 'ac', pts: ['Fica esperando o preço chegar a um nível que você escolheu.', 'Só executa se o preço for até lá.', 'Use para entrar em pullbacks e rompimentos sem ficar olhando a tela.'] } }],
  ['MetaTrader', 'Buy e Sell, Limit e Stop', S(pendingBars(), [
    st('Com o preço atual no meio, há quatro ordens pendentes possíveis.', H(50.5, 'Preço atual', 'ac')),
    st('Buy Limit: compra ABAIXO do preço. Você espera um recuo para comprar mais barato.', H(50.5, 'Preço atual', 'ac'), H(46, 'Buy Limit', 'up'), AR([18, 50.5], [18, 46.5], 'up')),
    st('Sell Limit: venda ACIMA do preço. Você espera uma alta para vender mais caro.', H(50.5, 'Preço atual', 'ac'), H(46, 'Buy Limit', 'up'), H(55, 'Sell Limit', 'dn')),
    st('Buy Stop: compra ACIMA do preço (rompimento). Sell Stop: venda ABAIXO (rompimento de baixa).', H(50.5, 'Preço atual', 'ac'), H(46, 'Buy Limit', 'up'), H(55, 'Sell Limit', 'dn'), H(58, 'Buy Stop', 'up'), H(43, 'Sell Stop', 'dn')),
    st('Regra: LIMIT busca reversão (melhor preço); STOP busca rompimento (confirmação).'),
  ])],
  ['MetaTrader', 'Anexar Stop Loss e Take Profit', S(tradeBars(), [
    st('Você comprou em 52. Agora defina a saída.', PT(4, 52, 'entrada', 'ac'), H(52, 'Entrada', 'ac')),
    st('O Stop Loss fica abaixo da entrada: se o preço cair até ele, a ordem fecha com a perda planejada.', H(52, 'Entrada', 'ac'), H(47, 'Stop Loss', 'dn')),
    st('O Take Profit fica acima: se o preço chegar nele, a ordem fecha com o lucro planejado.', H(52, 'Entrada', 'ac'), H(47, 'Stop Loss', 'dn'), H(64, 'Take Profit', 'up')),
    st('Dica: defina os dois NA HORA de abrir a ordem. A plataforma fecha sozinha, mesmo se você estiver offline.', H(52, 'Entrada', 'ac'), H(47, 'Stop Loss', 'dn'), H(64, 'Take Profit', 'up'), AR([14, 58], [24, 64], 'up')),
  ])],
  ['MetaTrader', 'Modificar ordens', S(tradeBars(), [
    st('A operação foi bem: o preço subiu bastante em relação à entrada.', H(52, 'Entrada', 'ac'), H(47, 'Stop original', 'dn')),
    st('Botão direito na ordem aberta › Modificar. Você pode mudar stop e alvo a qualquer momento.', H(52, 'Entrada', 'ac'), H(47, 'Stop original', 'dn'), PT(14, 58, 'modificar', 'ac')),
    st('Mover o stop para a entrada é o "breakeven": se o preço voltar, você sai no zero a zero. Sem risco.', H(52, 'Stop no breakeven', 'wn'), PT(14, 58, undefined, 'ac')),
    st('Regra de ouro: mova o stop só a favor da operação. Afastar o stop aumenta o risco.', H(52, 'Stop no breakeven', 'wn'), AR([14, 58], [24, 64], 'up')),
  ])],
  ['MetaTrader', 'Timeframes na plataforma', { t: 'tf', tfs: ['M1', 'M5', 'M15', 'H1', 'H4', 'D1'], init: 'M15', desc: {
    M1: 'No MetaTrader, a barra de tempos fica no topo (M1, M5, M15, M30, H1, H4, D1...). M1 = cada candle com 1 minuto.',
    M5: 'M5 = cada candle com 5 minutos. Clique no botão M5 da barra para trocar de tempo gráfico.',
    M15: 'M15 = 15 minutos por candle. Na barra, clique em M15. Dá para abrir o mesmo ativo em vários gráficos, cada um com um tempo.',
    H1: 'H1 = 1 hora por candle. Bom para ver o contexto sem tanto ruído.',
    H4: 'H4 = 4 horas por candle. Estrutura clara.',
    D1: 'D1 = um candle por dia. É o tempo para ver a grande direção.',
  } }],
  ['MetaTrader', 'Testador de estrategia', flow([
    { h: 'Abra o testador', b: 'Atalho Ctrl+R, ou menu Visualizar › Testador de Estratégia.', p: 'Visualizar › Testador de Estratégia (Ctrl+R)' },
    { h: 'Escolha o Expert e o ativo', b: 'Selecione o robô a testar, o ativo (símbolo) e o tempo gráfico.', p: 'Expert: MeuRobo.ex5 · Símbolo: EURUSD · Período: H1' },
    { h: 'Defina período e modelo', b: 'Escolha as datas do teste e o modelo de ticks. "Todos os ticks reais" é o mais fiel.', p: 'Datas: 2023.01.01 - 2024.12.31 · Modelo: Todos os ticks' },
    { h: 'Inicie e leia o resultado', b: 'Veja lucro, drawdown e a curva de capital. O teste é uma simulação do passado, não uma garantia.', p: 'Iniciar › aba Resultados / Gráfico' },
  ], 'Testar antes de operar economiza dinheiro.')],

  // ─────────── Expert Advisors ───────────
  ['Expert Advisors', 'O que e um Expert Advisor', flow([
    { h: 'Regras programadas', b: 'Um EA é um programa (feito em MQL) com regras claras de entrada, saída e gestão de risco.' },
    { h: 'Monitora o mercado', b: 'Lê o preço e os indicadores a cada tick, 24 horas por dia, sem cansar.' },
    { h: 'Executa sozinho', b: 'Quando as regras se cumprem, envia a ordem na hora, sem emoção nem hesitação.' },
    { h: 'Você supervisiona', b: 'O robô executa, mas quem define parâmetros e acompanha os resultados é você.' },
  ], 'Um EA é um "trader automático".')],
  ['Expert Advisors', 'Vantagens do EA', grid([
    { h: 'Sem emoção', b: 'Medo, ganância e raiva não entram. O robô segue o plano mesmo depois de 5 perdas seguidas.' },
    { h: 'Sem parar', b: 'Opera de madrugada e em horários que você não conseguiria acompanhar.' },
    { h: 'Rapidez', b: 'Executa em milissegundos, em oportunidades que o olho humano perderia.' },
    { h: 'Teste prévio', b: 'Dá para testar a estratégia no histórico antes de ligar com dinheiro real.' },
  ])],
  ['Expert Advisors', 'Riscos do EA', grid([
    { h: 'Faz só o que foi programado', b: 'Se a lógica está errada, ele erra com perfeição e velocidade. Não existe "intuição" para corrigir.' },
    { h: 'Mudança de mercado', b: 'Uma estratégia que funcionava pode parar de funcionar quando o mercado muda de comportamento.' },
    { h: 'Falhas técnicas', b: 'Queda de internet, de energia ou do servidor pode deixar a posição sem monitoramento.' },
    { h: 'Promessas falsas', b: 'Robôs que "nunca perdem" não existem. Desconfie de qualquer garantia de lucro.' },
  ])],
  ['Expert Advisors', 'Parametros do EA', grid([
    { h: 'Lote / risco', b: 'Define o tamanho de cada operação. Pode ser um lote fixo ou um percentual de risco do capital.' },
    { h: 'Stop loss e take profit', b: 'Distância (em pips ou pontos) até a perda máxima e até o alvo.' },
    { h: 'Horário de operação', b: 'Define em quais horas o robô pode abrir ordens (por exemplo, evitar a madrugada).' },
    { h: 'Magic number', b: 'Número de identificação das ordens do robô, para não confundir com outras operações da conta.' },
    { h: 'Indicadores', b: 'Períodos de média, RSI etc. que o robô usa. Mudar esses valores muda o comportamento.' },
  ], 'Toque nos parâmetros mais comuns.')],
  ['Expert Advisors', 'Comece com lote minimo', calc('risk')],
  ['Expert Advisors', 'Backtest', grid([
    { h: 'O que é', b: 'Rodar o robô sobre dados históricos para ver como ele teria se saído. É um ensaio, não uma garantia.' },
    { h: 'Lucro líquido', b: 'Quanto o robô ganhou ou perdeu no período, depois de custos.' },
    { h: 'Drawdown máximo', b: 'A maior queda do capital durante o teste. É o número que mostra quanto você precisa aguentar.' },
    { h: 'Fator de lucro', b: 'Soma dos ganhos dividida pela soma das perdas. Acima de 1,5 já é bom; abaixo de 1 perde dinheiro.' },
    { h: 'Número de operações', b: 'Poucas operações = resultado pouco confiável (pode ser sorte).' },
  ], 'Aprenda a ler o relatório do teste.')],
  ['Expert Advisors', 'Otimizacao', calc('overfit')],
  ['Expert Advisors', 'VPS para EA', { t: 'compare',
    a: { t: 'Computador em casa', tone: 'dn', pts: ['Se a energia ou a internet cair, o robô para.', 'Precisa deixar o PC ligado 24h.', 'Atualizações do sistema podem reiniciar tudo sem aviso.', 'Latência maior em relação ao servidor da corretora.'] },
    b: { t: 'VPS (servidor virtual)', tone: 'up', pts: ['Ligado 24h, com energia e internet redundantes.', 'Você acessa de qualquer lugar por área de trabalho remota.', 'Pode ficar perto do servidor da corretora: menos latência.', 'Custa algumas dezenas de reais por mês.'] },
    foot: 'Se o robô ficar parado com posição aberta, o risco é seu. Considere um VPS para EAs.' }],
  ['Expert Advisors', 'Monitorar o robo', check([
    { h: 'Verifique todo dia', b: 'Veja se o robô está ligado (carinha feliz) e se as ordens estão aparecendo normalmente.' },
    { h: 'Confira a aba Experts', b: 'Lá aparecem os erros: ordens rejeitadas, falta de margem, spread alto etc.' },
    { h: 'Compare com o teste', b: 'Drawdown e resultado ao vivo muito piores que o backtest são um alerta.' },
    { h: 'Defina um limite de parada', b: 'Quanto de perda você aceita antes de desligar o robô e revisar tudo? Decida isso ANTES.' },
  ], 'Um robô sozinho não é um robô abandonado.')],
  ['Expert Advisors', 'Gestao de risco com EA', calc('size')],

  // ─────────── Instalando um Expert Advisor ───────────
  ['Instalando um Expert Advisor', 'Abrir a Pasta de Dados', flow([
    { h: 'Abra o MetaTrader 5', b: 'Entre na sua conta (demo ou real) antes de começar.' },
    { h: 'Menu Arquivo', b: 'No canto superior esquerdo, clique em Arquivo.', p: 'Arquivo' },
    { h: 'Abrir Pasta de Dados', b: 'Clique em "Abrir Pasta de Dados". Uma janela do Windows abre na pasta onde o MT5 guarda seus arquivos.', p: 'Arquivo › Abrir Pasta de Dados' },
  ], 'O primeiro passo é achar a pasta certa.')],
  ['Instalando um Expert Advisor', 'A pasta MQL5 e Experts', flow([
    { h: 'Entre na pasta MQL5', b: 'Dentro da Pasta de Dados, abra a pasta chamada MQL5. É onde ficam robôs, indicadores e scripts.', p: 'Pasta de Dados › MQL5' },
    { h: 'Abra a pasta Experts', b: 'Aí dentro estão as subpastas Experts, Indicators, Scripts. Os robôs ficam em Experts.', p: 'MQL5 › Experts' },
  ], 'Os robôs moram em MQL5 › Experts.')],
  ['Instalando um Expert Advisor', 'Copiar o arquivo ex5', flow([
    { h: 'Localize o arquivo', b: 'O robô é um arquivo com extensão .ex5 (MT5). No MT4 seria .ex4.', p: 'MeuRobo.ex5' },
    { h: 'Copie (Ctrl+C)', b: 'Selecione o arquivo e copie.', p: 'Ctrl + C' },
    { h: 'Cole em Experts (Ctrl+V)', b: 'Cole dentro da pasta MQL5 › Experts. Agora o arquivo está no lugar certo.', p: 'MQL5 › Experts › Ctrl + V' },
  ])],
  ['Instalando um Expert Advisor', 'Atualizar o Navegador', flow([
    { h: 'Volte ao MetaTrader', b: 'O MT5 não percebe sozinho que o arquivo foi colado.' },
    { h: 'Painel Navegador', b: 'À esquerda, abra o Navegador e a pasta "Expert Advisors". Se não estiver visível: Ctrl+N.', p: 'Navegador › Expert Advisors' },
    { h: 'Botão direito › Atualizar', b: 'Clique com o botão direito em "Expert Advisors" e escolha Atualizar. O robô aparece na lista.', p: 'Botão direito › Atualizar' },
  ], 'Faça o MT5 reconhecer o arquivo.')],
  ['Instalando um Expert Advisor', 'Arrastar o EA para o grafico', flow([
    { h: 'Abra o gráfico do ativo', b: 'Abra o gráfico do ativo que o robô vai operar, no tempo gráfico recomendado.' },
    { h: 'Arraste o robô', b: 'Do Navegador, arraste o robô até o gráfico. Ou dê duplo clique no nome dele.', p: 'Navegador › Expert Advisors › MeuRobo › arrastar para o gráfico' },
    { h: 'Janela de configuração', b: 'Uma janela com as opções do robô se abre. É o próximo passo.' },
  ])],
  ['Instalando um Expert Advisor', 'A janela de configuracoes', { t: 'map', title: 'Janela do Expert Advisor (simulada)', regions: [
    { id: 'tabs', l: 'Abas: Comum | Entradas', b: 'Comum tem as permissões de negociação. Entradas tem os parâmetros do robô (lote, stop, horários etc.).', r: [0, 0, 100, 14] },
    { id: 'alg', l: '☑ Permitir negociação algorítmica', b: 'Marque esta opção na aba Comum. Sem ela o robô não consegue enviar ordens.', r: [4, 18, 92, 16] },
    { id: 'in', l: 'Parâmetros (Entradas)', b: 'Cada linha é um parâmetro: nome e valor. Mexa só no que entende e anote os valores originais.', r: [4, 38, 92, 40] },
    { id: 'ok', l: 'OK / Cancelar', b: 'OK aplica o robô ao gráfico; Cancelar desfaz.', r: [60, 82, 36, 14] },
  ] }],
  ['Instalando um Expert Advisor', 'Permitir negociacao algoritmica', flow([
    { h: 'Aba Comum', b: 'Na janela do robô, abra a aba Comum.', p: 'Janela do robô › Comum' },
    { h: 'Marque a permissão', b: 'Marque "Permitir negociação algorítmica". Sem isso o robô fica olhando, mas não opera.', p: '☑ Permitir negociação algorítmica' },
    { h: 'Confirme com OK', b: 'Clique em OK. O nome do robô aparece no canto do gráfico.', p: 'OK' },
  ])],
  ['Instalando um Expert Advisor', 'Ligar o AutoTrading', flow([
    { h: 'Ache o botão AutoTrading', b: 'Fica na barra de ferramentas do topo: um botão com um "play" e a legenda "Algo Trading" / "Negociação Algorítmica".', p: 'Barra superior › Algo Trading' },
    { h: 'Deixe-o verde', b: 'Clique para ligar. Ele fica verde quando está ativo, vermelho quando desligado.', p: 'Vermelho = desligado · Verde = ligado' },
    { h: 'É o botão mestre', b: 'Ele liga ou desliga TODOS os robôs de uma vez. Se o AutoTrading está desligado, nenhum EA opera.' },
  ])],
  ['Instalando um Expert Advisor', 'Confirmar a carinha feliz', { t: 'compare',
    a: { t: 'Carinha feliz 🙂', tone: 'up', pts: ['Aparece no canto superior direito do gráfico.', 'O robô está ativo, o AutoTrading ligado e as permissões OK.', 'Ele está monitorando o mercado e pode abrir ordens.'] },
    b: { t: 'Carinha triste ☹', tone: 'dn', pts: ['O robô está parado.', 'Causas: AutoTrading desligado, "Permitir negociação algorítmica" desmarcado ou erro no robô.', 'Corrija e a carinha volta a ficar feliz.'] } }],
  ['Instalando um Expert Advisor', 'Diagnosticar problemas comuns', check([
    { h: 'AutoTrading está verde?', b: 'Se o botão estiver vermelho, clique para ligar. É a causa mais comum.' },
    { h: '"Permitir negociação algorítmica" marcado?', b: 'Abra as propriedades do robô (F7 no gráfico) e confira a aba Comum.' },
    { h: 'Mercado aberto e ativo certo?', b: 'Fins de semana e feriados não têm preço. Confira também se o ativo é o que o robô espera.' },
    { h: 'Há margem livre e conexão?', b: 'Sem margem ou sem internet, o MT5 não envia ordens. Veja o status no canto inferior.' },
    { h: 'Aba Experts mostra erro?', b: 'Na Caixa de ferramentas, a aba Experts descreve o motivo (ex.: "trade is disabled"). Leia a mensagem.' },
  ], 'Quando o robô não opera, percorra este checklist.')],

  // ─────────── Método APP ───────────
  ['Metodo APP', 'Amplitude: a onda 1', S(app(), [
    st('Depois de identificado o cenário, o primeiro passo é a AMPLITUDE: a sua onda 1, a ignição que trocou o momentum.', HL([2, 3, 4, 5, 6, 7, 8, 9, 10], 'ac')),
    st('Meça do fundo até o topo dessa onda. Aqui são cerca de 31 pontos: essa é a amplitude.', AR([2, 38.5], [10, 70], 'up'), T(3, 66, 'Onda 1 · amplitude', 'ac')),
    st('Você não precisa operar essa onda. Ela serve só de medida para projetar a onda 3.', AR([2, 38.5], [10, 70], 'up'), T(3, 66, 'Onda 1 · amplitude', 'ac')),
  ])],
  ['Metodo APP', 'Retracao de Fibonacci', S(app(), [
    st('Com a onda 1 definida, aplicamos a Retração de Fibonacci para estimar o tamanho do pullback.', FIB([2, 38.5], [10, 70], { lv: [0, 0.5, 0.618, 1] })),
    st('A zona entre 0,5 e 0,618 é a zona de evento: a região onde esperamos a correção terminar.', FIB([2, 38.5], [10, 70], { lv: [0, 0.5, 0.618, 1], gold: true })),
    st('O preço corrige até essa zona e para: ali aguardamos o gatilho.', FIB([2, 38.5], [10, 70], { lv: [0, 0.5, 0.618, 1], gold: true }), PT(18, 51.5, 'fim do pullback', 'wn')),
  ])],
  ['Metodo APP', 'O evento: rompimento da Trend Line', S(app(), [
    st('Durante o pullback, marcamos uma Trend Line ligando os topos que descem.', LN(appTL()[0], appTL()[1], 'Trend Line', 'ac', true)),
    st('O EVENTO é o rompimento dessa linha para cima. Esse é o gatilho da entrada.', LN(appTL()[0], appTL()[1], undefined, 'ac', true), PT(20, 55.5, 'rompimento · entrada', 'up')),
    st('Ao acionar o gatilho, entramos com lote mínimo e dosamos a posição conforme a gestão de risco. O stop fica abaixo do fundo do pullback.', LN(appTL()[0], appTL()[1], undefined, 'ac', true), PT(20, 55.5, 'entrada', 'up'), H(50.5, 'Stop', 'dn')),
  ])],
  ['Metodo APP', 'Projecao: definindo alvos', S(app(), [
    st('Os alvos vêm do próprio gráfico. O PRIMEIRO alvo é o pivot deixado pelo fim da onda 1.', LN(appTL()[0], appTL()[1], undefined, 'mu', true), H(70.3, '1º alvo (pivot da onda 1)', 'up')),
    st('O segundo alvo vem da projeção: a amplitude da onda 1 aplicada a partir do fundo do pullback.', H(70.3, '1º alvo', 'up'), H(83, '2º alvo (projeção)', 'up'), AR([18, 52], [18, 83], 'up')),
    st('Realizados os lotes do 1º alvo, o stop vai para o breakeven (zero a zero): o pior cenário passa a ser o lucro já garantido.', H(70.3, '1º alvo', 'up'), H(83, '2º alvo', 'up'), H(55.5, 'Stop no breakeven', 'wn')),
  ])],
  ['Metodo APP', 'O segundo alvo', S(app(), [
    st('Com o 1º alvo realizado e o stop no breakeven, a operação não pode mais dar prejuízo.', H(70.3, '1º alvo atingido', 'up'), H(55.5, 'Stop no breakeven', 'wn')),
    st('O 2º alvo é a projeção da onda 1: some a amplitude ao fundo do pullback.', H(70.3, undefined, 'up'), H(55.5, undefined, 'wn'), Z(82, 84, '2º alvo', 'up'), AR([18, 52], [30, 84], 'up')),
    st('O resto da posição fica correndo até esse alvo, com a segurança de quem já realizou parte do lucro.', H(70.3, undefined, 'up'), H(55.5, undefined, 'wn'), Z(82, 84, '2º alvo', 'up')),
  ])],
];

void [check, flow, grid];
