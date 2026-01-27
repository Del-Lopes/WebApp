import { Robot, VideoContent, Article, MarketingAsset } from './types';

export const INITIAL_ROBOTS: Robot[] = [
  { 
    id: '1', 
    name: 'Alpha Trend Hawk', 
    version: '2.4.1', 
    pair: 'EURUSD', 
    status: 'active', 
    profitability: '+12.5%',
    description: 'O Alpha Trend Hawk é um EA seguidor de tendência projetado para o par EURUSD. Ele utiliza uma combinação de médias móveis exponenciais e o indicador RSI para identificar pontos de entrada precisos. Ideal para mercados voláteis, conta com sistema de proteção de capital e trailing stop dinâmico.',
    images: [
      'https://picsum.photos/600/400?random=10',
      'https://picsum.photos/600/400?random=11',
      'https://picsum.photos/600/400?random=12'
    ],
    manualImages: [
      'https://picsum.photos/600/800?random=13',
      'https://picsum.photos/600/800?random=14'
    ]
  },
  { 
    id: '2', 
    name: 'Scalper Pro X', 
    version: '1.0.5', 
    pair: 'GBPUSD', 
    status: 'stopped', 
    profitability: '-2.1%',
    description: 'Estratégia de scalping agressivo focada em capturar pequenos movimentos do mercado durante a sessão de Londres. O robô opera rompimentos de suporte e resistência em timeframes curtos (M1 e M5). Requer corretora com baixo spread e execução ECN.',
    images: [
      'https://picsum.photos/600/400?random=20',
      'https://picsum.photos/600/400?random=21'
    ],
    manualImages: [
      'https://picsum.photos/600/800?random=22'
    ]
  },
  { 
    id: '3', 
    name: 'Gold Rush AI', 
    version: '3.1.0', 
    pair: 'XAUUSD', 
    status: 'active', 
    profitability: '+8.3%',
    description: 'Desenvolvido especificamente para o Ouro (XAUUSD), este robô utiliza algoritmos de Machine Learning para prever reversões de preço. Possui filtro de notícias integrado e gerenciamento de risco avançado, evitando operações em momentos de alta instabilidade.',
    images: [
      'https://picsum.photos/600/400?random=30',
      'https://picsum.photos/600/400?random=31',
      'https://picsum.photos/600/400?random=32'
    ],
    manualImages: [
      'https://picsum.photos/600/800?random=33',
      'https://picsum.photos/600/800?random=34',
      'https://picsum.photos/600/800?random=35'
    ]
  },
];

export const MOCK_VIDEOS: VideoContent[] = [
  { id: '1', title: 'Mastering Market Structure', thumbnail: 'https://picsum.photos/400/225?random=1', duration: '14:20' },
  { id: '2', title: 'Risk Management 101', thumbnail: 'https://picsum.photos/400/225?random=2', duration: '08:45' },
  { id: '3', title: 'Setting Up Your VPS', thumbnail: 'https://picsum.photos/400/225?random=3', duration: '12:10' },
];

export const MOCK_ARTICLES: Article[] = [
  { id: '1', title: 'Weekly Market Outlook: USD Weakness?', excerpt: 'Analyzing the DXY index and potential reversals in major pairs for the upcoming week.', date: 'Oct 24, 2023' },
  { id: '2', title: 'Understanding Drawdown', excerpt: 'How to psychologically handle drawdown periods and ensure long-term survival.', date: 'Oct 20, 2023' },
];

export const MOCK_ASSETS: MarketingAsset[] = [
  { id: '1', title: 'Tradexperience Pitch Deck', type: 'PDF', size: '2.4 MB' },
  { id: '2', title: 'Performance Report Q3', type: 'PDF', size: '1.1 MB' },
  { id: '3', title: 'Social Media Kit', type: 'Image', size: '15 MB' },
];