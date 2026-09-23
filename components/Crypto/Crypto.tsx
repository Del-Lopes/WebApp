import React, { useEffect, useState } from 'react';
import { Bitcoin, Flame, Layers, Rocket, Brain, Info, AlertTriangle, Landmark, Star } from 'lucide-react';
import { BackButton } from '../BackButton';
import { TrendingView } from './TrendingView';
import { NarrativesView } from './NarrativesView';
import { GainersView } from './GainersView';
import { ReportView } from './ReportView';
import { DefiView } from './DefiView';
import { WatchlistView } from './WatchlistView';
import { MarketPulse } from './MarketPulse';
import { ensureTodaySnapshot, advanceUnlockScan } from '../../lib/cryptoData';

interface Props {
  onBack: () => void;
}

type TabKey = 'trending' | 'narratives' | 'gainers' | 'defi' | 'watchlist' | 'report';

const TABS: { key: TabKey; label: string; Icon: React.ElementType }[] = [
  { key: 'trending',   label: 'Trending',   Icon: Flame },
  { key: 'narratives', label: 'Narrativas', Icon: Layers },
  { key: 'gainers',    label: 'Maiores altas', Icon: Rocket },
  { key: 'defi',       label: 'DeFi',       Icon: Landmark },
  { key: 'watchlist',  label: 'Minha lista', Icon: Star },
  { key: 'report',     label: 'Relatório IA', Icon: Brain },
];

export const Crypto: React.FC<Props> = ({ onBack }) => {
  const [tab, setTab] = useState<TabKey>('trending');

  // Captura o retrato de hoje na primeira visita do dia. A function é idempotente
  // por dia (UTC), então repetir é no-op — e o histórico começa a acumular sem
  // depender de um agendador estar configurado.
  useEffect(() => { void ensureTodaySnapshot(); }, []);

  // Avança a varredura do calendário de desbloqueios. Ela processa um lote por
  // execução e pula o que já leu há pouco, então acelera o bootstrap sem
  // martelar a fonte. Só dispara quando o usuário entra na aba que usa o dado.
  useEffect(() => {
    if (tab === 'defi' || tab === 'watchlist') void advanceUnlockScan();
  }, [tab]);

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <BackButton onClick={onBack} />
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center">
            <Bitcoin size={18} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Crypto</h1>
            <p className="text-xs text-slate-400">Inteligência de mercado e tendências</p>
          </div>
        </div>
      </div>

      {/* Disclaimer — enquadramento responsável */}
      <div className="rounded-xl bg-amber-50 ring-1 ring-amber-100 p-3 flex items-start gap-2">
        <AlertTriangle size={15} className="text-amber-500 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-800 leading-relaxed">
          Conteúdo informativo e educacional, <strong>não</strong> recomendação de investimento. Dados de mercado via CoinGecko.
          Cripto é volátil e a maioria dos projetos novos fracassa — sempre faça sua própria pesquisa (DYOR).
        </p>
      </div>

      {/* Termômetro — contexto para tudo que vem abaixo */}
      <MarketPulse />

      {/* Abas */}
      <div className="flex gap-2 p-1 rounded-2xl bg-slate-100 w-fit overflow-x-auto max-w-full">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
              tab === key ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === 'report' && (
        <p className="flex items-center gap-2 text-xs text-slate-400">
          <Info size={13} /> A IA lê os dados de setores/trending e redige um panorama. Cada relatório custa Coins.
        </p>
      )}

      {/* Conteúdo */}
      {tab === 'trending' && <TrendingView />}
      {tab === 'narratives' && <NarrativesView />}
      {tab === 'gainers' && <GainersView />}
      {tab === 'defi' && <DefiView />}
      {tab === 'watchlist' && <WatchlistView />}
      {tab === 'report' && <ReportView />}
    </div>
  );
};
