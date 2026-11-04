import React from 'react';
import type { Illu } from './dsl';
import { SceneChart } from './scene';
import { CandleLab, Compare, Fork, RegionMap, Reveal } from './widgets';
import {
  BalanceLab, DrawdownCalc, FibSeq, HoursCalc, LeverageCalc, LotPipCalc, MartingaleCalc,
  OverfitLab, RRCalc, RiskCalc, SlippageCalc, SpreadCalc,
} from './calcs';
import { TfLab } from './tflab';
import { MARKET_ILLUS } from './content.mercado';
import { CHART_ILLUS } from './content.graficos';
import { PRICE_ILLUS } from './content.preco';
import { PLATFORM_ILLUS } from './content.plataforma';

// Ilustrações interativas das aulas da Trilha. Ficam no código (e não no banco): a aula só precisa
// ter o mesmo título de unidade e de aula. Aulas que já têm `image_url` continuam com a imagem.
export const normKey = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const REGISTRY = new Map<string, Illu>();
for (const list of [MARKET_ILLUS, CHART_ILLUS, PRICE_ILLUS, PLATFORM_ILLUS]) {
  for (const [unit, lesson, illu] of list) REGISTRY.set(`${normKey(unit)}|${normKey(lesson)}`, illu);
}

export const findIllustration = (unit?: string, lesson?: string): Illu | null =>
  unit && lesson ? REGISTRY.get(`${normKey(unit)}|${normKey(lesson)}`) ?? null : null;

export const illustrationKeys = (): string[] => [...REGISTRY.keys()];

const CALCS: Record<Extract<Illu, { t: 'calc' }>['k'], () => React.ReactElement> = {
  spread: () => <SpreadCalc />,
  commission: () => <SpreadCalc commission />,
  lot: () => <LotPipCalc focus="lot" />,
  pip: () => <LotPipCalc focus="pip" />,
  lev: () => <LeverageCalc />,
  margin: () => <LeverageCalc stopout />,
  risk: () => <RiskCalc focus="risk" />,
  size: () => <RiskCalc focus="size" />,
  sl: () => <RRCalc focus="sl" />,
  tp: () => <RRCalc focus="tp" />,
  rr: () => <RRCalc focus="rr" />,
  dd: () => <DrawdownCalc />,
  mart: () => <MartingaleCalc />,
  hours: () => <HoursCalc />,
  kz: () => <HoursCalc killzones />,
  slip: () => <SlippageCalc />,
  overfit: () => <OverfitLab />,
  balance: () => <BalanceLab />,
  fibseq: () => <FibSeq />,
};

export const IllustrationView: React.FC<{ illu: Illu }> = ({ illu }) => {
  switch (illu.t) {
    case 'scene': return <SceneChart scene={illu.scene} />;
    case 'candle': return <CandleLab start={illu.start} presets={illu.presets} hint={illu.hint} />;
    case 'tf': return <TfLab tfs={illu.tfs} init={illu.init} dual={illu.dual} desc={illu.desc} foot={illu.foot} count={illu.count} />;
    case 'reveal': return <Reveal items={illu.items} lead={illu.lead} mode={illu.mode} />;
    case 'fork': return <Fork q={illu.q} opts={illu.opts} takeaway={illu.takeaway} />;
    case 'compare': return <Compare a={illu.a} b={illu.b} foot={illu.foot} />;
    case 'map': return <RegionMap regions={illu.regions} title={illu.title} />;
    case 'calc': return CALCS[illu.k]();
  }
};

/** Ilustração interativa de uma aula (ou nada, se ela não tiver uma cadastrada). */
export const LessonIllustration: React.FC<{ unit?: string; lesson?: string }> = ({ unit, lesson }) => {
  const illu = findIllustration(unit, lesson);
  if (!illu) return null;
  return (
    <div className="mb-4" data-illustration>
      <p className="eyebrow-muted mb-2">Interativo · toque e mexa</p>
      <IllustrationView illu={illu} />
    </div>
  );
};
