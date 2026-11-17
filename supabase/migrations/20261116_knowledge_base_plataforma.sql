-- ============================================================
-- Base de conhecimento do assistente: visão geral da plataforma e novidades recentes.
--
-- Complementa as 5 entradas já existentes (ativar licença, WebRequest, licença inválida, valor das licenças,
-- instalar o robô) — essas NÃO são tocadas. As entradas abaixo são removidas pelo título e reinseridas, então
-- o script pode ser rodado de novo sempre que o texto for revisado. Rodar no SQL Editor.
--
-- Limites da tabela: título até 200 caracteres, conteúdo até 5000, categoria dentro da lista fixa.
-- O assistente guarda a base em cache por 5 minutos: as respostas mudam até 5 min depois de rodar.
-- ============================================================

begin;

delete from public.chat_knowledge_base
where title in (
  'Mapa do menu lateral da plataforma',
  'O que são Coins e como funcionam',
  'Como comprar Coins',
  'Trilha Gain: como funciona',
  'Trilha Gain: desbloquear unidades com Coins',
  'Diário de Operações: registrar um trade',
  'Diário de Operações: vários prints por trade',
  'Diário de Operações: alternar entre R$ e $',
  'Diário de Operações: compartilhar o trade em card',
  'Diário de Operações: compartilhar um trade no Fórum',
  'Início: o card do Diário',
  'Calendário Econômico: como usar',
  'Calendário Econômico: Macro por ativo',
  'Calendário Econômico: compartilhar cards',
  'Sinais: como funciona a análise de mercado',
  'Crypto: o que tem na sessão',
  'Sala ao Vivo',
  'Fórum: como participar',
  'Fórum: ver imagens dentro da plataforma',
  'Fórum: moderação e edição de títulos',
  'Foto de perfil nas Configurações',
  'Como excluir a própria conta',
  'O que acontece com as mensagens do Fórum após excluir a conta',
  'Mesas Proprietárias (Prop Firms)',
  'Hand Bot, Downloads, Análise de Resultados e Live Portfólio',
  'Estratégias, Biblioteca, Artigos e Market',
  'Torne-se Parceiro / Painel do Parceiro',
  'Cards de compartilhamento: feed ou story'
);

insert into public.chat_knowledge_base (title, content, category) values

-- ── Visão geral ────────────────────────────────────────────────────────────
('Mapa do menu lateral da plataforma',
$kb$O menu lateral (grupo "Principal") segue esta ordem:
1. Início — painel com resumo da conta, do Diário e atalhos.
2. Comece Aqui — a Jornada, o passo a passo para quem está chegando.
3. Trilha Gain — trilha de aulas interativas.
4. Calendário Econômico — agenda de notícias e leitura por ativo.
5. Diário — registro das operações com prints e resultados.
6. Sala ao Vivo — transmissões; um ponto vermelho aparece quando estamos ao vivo.
7. Sinais — análise de mercado sob demanda, paga em Coins.
8. Crypto — relatórios e calendário de desbloqueio de tokens.
Depois vêm: Fórum, Mesas Proprietárias, Comprar Coins, Artigos e Análises, Hand Bot, Downloads, Análise de Resultados, Live Portfólio, Estratégias, Biblioteca, Market e Licenças. Parceiros veem "Painel do Parceiro"; clientes veem "Torne-se Parceiro". Equipe (imediato e admin) tem ainda o grupo Administração.
Em celular, o menu abre pelo botão no topo da tela.$kb$,
'Outros'),

-- ── Coins ──────────────────────────────────────────────────────────────────
('O que são Coins e como funcionam',
$kb$Coins são a moeda interna da plataforma. O saldo é o mesmo XP da Trilha Gain: ao concluir aulas e desafios você ganha Coins, e também pode comprá-los.
Onde usar: desbloquear unidades da Trilha Gain e pagar uma análise de mercado em Sinais.
Segurança: o débito e o crédito de Coins são feitos sempre no servidor; não existe como o usuário alterar o próprio saldo. Se uma análise de Sinais falhar antes de entregar o resultado, o custo é devolvido automaticamente.
Se o saldo parecer errado, peça para o usuário abrir o suporte informando o e-mail da conta e a data aproximada da operação.$kb$,
'Outros'),

('Como comprar Coins',
$kb$Menu lateral > Comprar Coins. A tela mostra pacotes progressivos: quanto maior o pacote, maior o bônus em Coins.
Formas de pagamento: criptomoedas (NOWPayments), cartão (Asaas) e Pix (Depix).
Os Coins são creditados automaticamente quando o pagamento é confirmado pelo provedor; o prazo depende do método e da rede. O pedido fica registrado.
Se pagou e os Coins não apareceram depois de um tempo razoável, oriente o usuário a recarregar a página e, persistindo, falar com o suporte com o comprovante e o e-mail da conta. Não é possível o assistente creditar Coins manualmente.
O valor de cada pacote aparece na própria tela de compra e pode mudar; não cite preços de cabeça.$kb$,
'Pagamentos'),

-- ── Trilha Gain ────────────────────────────────────────────────────────────
('Trilha Gain: como funciona',
$kb$A Trilha Gain é um curso em unidades (mercado, gráficos, preço, plataforma, análise técnica, candles, método do app, instalação do EA, entre outras). Cada unidade tem aulas curtas em passos: conceito, ilustração, exercício.
Todas as aulas têm ilustrações interativas: gráficos de candles com anotações, calculadoras (risco/retorno, tamanho de posição, martingale), laboratório de candles e de timeframes, comparações e cenários "e se". É só tocar/clicar nos elementos para explorar.
Cada passo concluído rende XP, que é o mesmo saldo de Coins. O progresso é salvo por nó/aula, então dá para continuar de onde parou em qualquer dispositivo.
Algumas unidades são bloqueadas e exigem Coins para abrir (veja a entrada sobre desbloqueio).$kb$,
'Educação'),

('Trilha Gain: desbloquear unidades com Coins',
$kb$Unidades bloqueadas mostram um cadeado e o custo em Coins. Ao confirmar o desbloqueio, o valor é debitado do saldo e a unidade abre na hora, de forma permanente.
Se o saldo for insuficiente, a tela avisa; é possível ganhar Coins concluindo aulas das unidades abertas ou comprar em Comprar Coins.
O desbloqueio é feito pelo servidor, então não dá para abrir uma unidade sem o débito correspondente. Se o usuário foi cobrado e a unidade não abriu, peça para recarregar a página e, se persistir, acionar o suporte.$kb$,
'Educação'),

-- ── Diário ─────────────────────────────────────────────────────────────────
('Diário de Operações: registrar um trade',
$kb$Menu lateral > Diário. Cada operação guarda os dados do trade, o resultado, anotações e prints. O Diário tem calendário mensal com o resultado de cada dia, lista de operações e totais do mês (resultado, número de operações e taxa de acerto).
Para criar: use o botão de novo trade, preencha os campos e salve. Dá para editar abrindo o trade.
Os dados são privados: só o próprio usuário vê o seu Diário.$kb$,
'Outros'),

('Diário de Operações: vários prints por trade',
$kb$Cada trade aceita até 6 prints (por exemplo: entrada, gestão e saída). No editor do trade, use o campo de imagens para enviar um ou vários arquivos; é possível remover um print individualmente.
Ao clicar em um print, ele abre em um visualizador dentro da plataforma (sem abrir link externo), com zoom, arrastar e navegação entre os prints do trade. Trades antigos com um único print continuam funcionando normalmente.$kb$,
'Outros'),

('Diário de Operações: alternar entre R$ e $',
$kb$No topo do Diário há um botão para alternar a moeda de exibição entre Real (R$) e Dólar ($). Em dólar, os valores aparecem só com o símbolo $ (ex.: $5,38), sem "US$".
A escolha vale para o calendário, a lista, os totais, os cards de compartilhamento e também para o card do Diário na tela Início, e fica salva no navegador. Ela só muda a forma de exibir o símbolo; não converte cotação.$kb$,
'Outros'),

('Diário de Operações: compartilhar o trade em card',
$kb$Dentro de um trade, o botão de compartilhar gera um card de imagem do resultado, nos formatos feed e story. Você escolhe se mostra os valores (ou só pontos/percentuais) e se inclui os prints do trade no card; os prints aparecem em grade dentro do card.
Para reenquadrar um print no card: dê dois cliques sobre a imagem, arraste para posicionar e use o controle de zoom; "Redefinir" volta ao padrão e "Concluir" confirma. Depois é só baixar ou copiar a imagem.
Se o print não aparece no card e surge um aviso de CORS, é uma configuração do servidor de imagens; avise o suporte para ajustar.$kb$,
'Outros'),

('Diário de Operações: compartilhar um trade no Fórum',
$kb$No trade, use "Compartilhar no Fórum" para abrir uma discussão sobre aquela operação. Um modal permite ajustar o título e escolher quais prints enviar; o tópico é criado com os dados do trade e as imagens. Depois de publicado, o usuário é levado ao Fórum.
Só prints já hospedados no servidor de imagens do Fórum podem ser enviados dessa forma. Lembre o usuário de não expor dados pessoais nos prints.$kb$,
'Outros'),

('Início: o card do Diário',
$kb$Na tela Início há um card com o resumo do Diário do mês atual: resultado, número de operações e taxa de acerto. Ele respeita a moeda escolhida (R$ ou $) e leva ao Diário ao clicar.$kb$,
'Outros'),

-- ── Calendário Econômico ───────────────────────────────────────────────────
('Calendário Econômico: como usar',
$kb$Menu lateral > Calendário Econômico. Lista os eventos econômicos do dia e da semana (dados do TradingView) com horário, país, valor anterior, previsão e resultado. Um seletor de importância (2 ou 3 estrelas) filtra só os eventos mais relevantes.
Ao abrir um evento aparece a explicação do que ele mede e a leitura por ativo (como a notícia tende a ser lida para cada ativo acompanhado). Depois que a notícia sai, o resultado é comparado à previsão.
É conteúdo educativo, não recomendação de compra ou venda.$kb$,
'Educação'),

('Calendário Econômico: Macro por ativo',
$kb$Ao lado do seletor de 2/3 estrelas há o botão "Macro por ativo". Ele troca a lista de eventos por um compilado por ativo: para cada ativo acompanhado, reúne os eventos do período, o viés (favorável, contrário ou neutro) e uma nota geral. Serve para ver rapidamente o que pesa em cada ativo na semana.
Cada ativo tem um card compartilhável com esse resumo (veja a entrada de compartilhamento). O botão "Lista" volta à visão normal por evento.$kb$,
'Educação'),

('Calendário Econômico: compartilhar cards',
$kb$Cada ativo na leitura de um evento tem seu próprio botão de compartilhar, que gera o card só daquele ativo. Para notícias que já saíram, o card mostra apenas a linha de resultado (anterior, previsão, resultado) e dedica o restante ao texto da análise; antes da divulgação, o card traz o contexto do evento.
Também há card do compilado "Macro por ativo". Todos saem em feed e story e levam o rodapé "Não é recomendação · Leitura completa no app". A legenda sugerida é preenchida automaticamente e pode ser copiada.$kb$,
'Marketing'),

-- ── Sinais e Crypto ────────────────────────────────────────────────────────
('Sinais: como funciona a análise de mercado',
$kb$Menu lateral > Sinais. Funciona sob demanda: o usuário clica no botão "Analisar (N Coins)", o custo em Coins é debitado e o sistema gera uma leitura do mercado. O valor por análise é definido pela administração e aparece no próprio botão. Se a geração falhar antes de entregar o resultado, os Coins voltam automaticamente.
O conteúdo é uma leitura de apoio ao estudo, não recomendação de investimento. O assistente não deve opinar sobre o mercado nem prever movimentos.$kb$,
'Outros'),

('Crypto: o que tem na sessão',
$kb$Menu lateral > Crypto reúne relatórios e inteligência sobre criptoativos, incluindo o calendário de desbloqueio de tokens (vesting): mostra o próximo desbloqueio, a quantidade de tokens e a categoria, pois desbloqueios aumentam a oferta circulante. Os dados são atualizados automaticamente em rodízio.
É material informativo; não há recomendação de compra ou venda.$kb$,
'Outros'),

('Sala ao Vivo',
$kb$Menu lateral > Sala ao Vivo. Quando há transmissão em andamento, aparece um ponto vermelho piscando ao lado do item do menu. Dentro da sala o usuário acompanha a transmissão e o status (ao vivo ou encerrada). Fora do horário, a sala mostra que não estamos ao vivo.$kb$,
'Outros'),

-- ── Fórum ──────────────────────────────────────────────────────────────────
('Fórum: como participar',
$kb$Menu lateral > Fórum. Lista os tópicos com título, autor, respostas e última atividade. Para criar um tópico use o botão de novo tópico, escreva título e texto e, se quiser, anexe imagens. Para responder, abra o tópico e escreva no campo de resposta (também aceita imagens).
Tópicos fixados aparecem no topo e tópicos trancados não recebem novas respostas. Seja respeitoso; a equipe pode ocultar conteúdo que fuja das regras.
O nome exibido é o do perfil e a foto é a enviada em Configurações.$kb$,
'Outros'),

('Fórum: ver imagens dentro da plataforma',
$kb$Ao clicar em uma imagem de um tópico ou resposta, ela abre no visualizador interno, sem sair da plataforma: dá para dar zoom, arrastar a imagem e navegar entre as imagens daquela mensagem, e fechar com Esc ou no botão de fechar.$kb$,
'Outros'),

('Fórum: moderação e edição de títulos',
$kb$A equipe pode fixar e trancar tópicos e excluir conteúdo. Administradores também podem editar o título de um tópico: no tópico aparece um ícone de lápis ao lado do título; basta alterar (3 a 140 caracteres) e salvar com Enter ou "Salvar título"; Esc cancela. Usuários comuns não editam títulos, nem os próprios; se precisar corrigir um título, peça à administração.
Ao editar, a mensagem inicial pode passar a exibir "editado".$kb$,
'Outros'),

-- ── Conta ──────────────────────────────────────────────────────────────────
('Foto de perfil nas Configurações',
$kb$Configurações da conta, no perfil: há um campo para enviar uma foto. A foto aparece no menu lateral e nas mensagens do Fórum. Para trocar, envie outra; para tirar, use o botão "Remover", e as iniciais do nome voltam a ser mostradas.
Se a foto não carregar, tente um arquivo menor (JPG ou PNG) e confira a conexão.$kb$,
'Outros'),

('Como excluir a própria conta',
$kb$Configurações > seção "Excluir conta". Por segurança o sistema pede para digitar a palavra EXCLUIR e confirmar. A exclusão é definitiva e não pode ser desfeita: apaga o acesso, o perfil, a foto, o Diário, o progresso, os Coins e licenças/pedidos ligados ao usuário.
Contas de administrador não podem ser excluídas por esse caminho. Administradores podem excluir a conta de outros usuários pelo painel de Administração, mas nunca a de outro administrador.
Antes de excluir, se houver licença ativa de robô, o usuário perde o acesso a ela. Se aparecer erro na exclusão, peça para tentar novamente e, persistindo, falar com o suporte.$kb$,
'Outros'),

('O que acontece com as mensagens do Fórum após excluir a conta',
$kb$Os tópicos e respostas de quem exclui a conta permanecem no Fórum, de forma anônima: o nome passa a ser "Usuário excluído", sem foto e sem papel. Assim as conversas dos outros membros não se perdem. Nenhum outro dado do usuário é mantido.$kb$,
'Outros'),

-- ── Demais sessões ─────────────────────────────────────────────────────────
('Mesas Proprietárias (Prop Firms)',
$kb$Menu lateral > Mesas Proprietárias, com quatro abas:
• Mesas — cadastro das principais prop firms, com regras e custos; cada card leva ao site da mesa.
• Comparar — marque até 4 mesas para comparar lado a lado.
• Projeção — simula a evolução e a escala das contas.
• Gestão — acompanha as contas e a execução do plano.
Administradores podem cadastrar e editar mesas. As informações de regras e preços mudam com frequência: oriente o usuário a confirmar sempre no site oficial da mesa.$kb$,
'Outros'),

('Hand Bot, Downloads, Análise de Resultados e Live Portfólio',
$kb$• Hand Bot: robô (EA) para MetaTrader cujos parâmetros o usuário configura na plataforma; o EA lê essas configurações automaticamente. Cada conta do MetaTrader fica vinculada ao usuário.
• Downloads: arquivos dos robôs (EA) e materiais para baixar.
• Análise de Resultados: o usuário carrega relatórios e analisa seus resultados.
• Live Portfólio: acompanhamento das contas e robôs conectados.
Os dados vêm do EA instalado no MetaTrader do usuário (com WebRequest liberado e licença ativa); se algo não atualizar, confira essas duas condições. Para instalar, veja "Como instalar o robô".$kb$,
'Robôs'),

('Estratégias, Biblioteca, Artigos e Market',
$kb$• Estratégias: estratégias dos robôs publicadas na plataforma.
• Biblioteca: cursos e aulas (com player de aulas).
• Artigos e Análises: textos e análises publicados pela equipe.
• Market: produtos disponíveis na plataforma.
Conteúdo bloqueado mostra um cadeado; confira se a licença correspondente está ativa em Licenças.$kb$,
'Educação'),

('Torne-se Parceiro / Painel do Parceiro',
$kb$Clientes veem "Torne-se Parceiro" no menu: o formulário envia a candidatura para análise da equipe. Não há e-mail de contato para isso — tudo é feito pelo formulário. Aprovado, o usuário passa a ter o "Painel do Parceiro", com materiais de divulgação e acompanhamento. Parceiros, imediatos e administradores acessam o painel.$kb$,
'Marketing'),

('Cards de compartilhamento: feed ou story',
$kb$Todos os cards de compartilhamento da plataforma (Diário, conquistas da Trilha, notícias e Macro do Calendário Econômico, sinais) podem ser gerados no formato feed (quadrado/retrato) ou story (vertical). O layout se ajusta ao formato: no story o conteúdo ocupa melhor a altura da tela. Todos levam o rodapé "Não é recomendação · Leitura completa no app".$kb$,
'Marketing');

commit;

-- Conferência: deve listar as 5 entradas antigas + as 28 novas, todas ativas.
select category, count(*) as entradas, bool_and(is_active) as todas_ativas
from public.chat_knowledge_base
group by category
order by category;
