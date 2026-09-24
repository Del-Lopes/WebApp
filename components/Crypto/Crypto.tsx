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
import { PageHeader, Tabs } from '../ui';
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
      <PageHeader
        leading={<BackButton onClick={onBack} />}
        title={<span className="inline-flex items-center gap-2.5"><Bitcoin size={22} className="text-accent-fg" aria-hidden /> Crypto</span>}
        description="Inteligência de mercado e tendências"
        className="mb-2 sm:mb-2"
      />

      {/* Disclaimer — enquadramento responsável */}
      <div className="rounded-xl bg-warning/10 border border-warning/20 p-3 flex items-start gap-2">
        <AlertTriangle size={15} className="text-warning-fg mt-0.5 shrink-0" />
        <p className="text-xs text-warning-fg leading-relaxed">
          Conteúdo informativo e educacional, <strong>não</strong> recomendação de investimento. Dados de mercado via CoinGecko.
          Cripto é volátil e a maioria dos projetos novos fracassa — sempre faça sua própria pesquisa (DYOR).
        </p>
      </div>

      {/* Termômetro — contexto para tudo que vem abaixo */}
      <MarketPulse />

      {/* Abas */}
      <Tabs
        aria-label="Seções da Crypto"
        items={TABS.map(({ key, label, Icon }) => ({ key, label, icon: Icon }))}
        value={tab}
        onChange={setTab}
      />

      {tab === 'report' && (
        <p className="flex items-start gap-2 text-xs text-fg-muted">
          <Info size={13} className="mt-0.5 shrink-0" /> A IA lê os dados de setores/trending e redige um panorama. Cada relatório custa Coins.
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
