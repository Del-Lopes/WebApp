// ============================================================
// Calendário Econômico › compilado macro por ativo.
//
// Junta, para cada ativo em foco (XAUUSD, NAS100, US30, WIN, WDO, BTC), as
// notícias do período que mexem nele: as que já saíram (com o cenário que
// aconteceu) e as que ainda vão sair (com os cenários possíveis). Tudo é
// calculado no cliente a partir da interpretação por ativo que a edge já gera
// (asset_interpretation); nada novo é gravado nem consultado.
// ============================================================

import {
  AssetReading, Dir, EconEvent, EconProfile, FocusAssetId, FOCUS_ASSET_LABEL, Outcome,
  evaluateOutcome, displayTitle, fmtTime,
} from './econCalendar';

export interface MacroItem {
  event: EconEvent;
  title: string;
  reading: AssetReading;
  outcome: Outcome | null;
  /** Direção para o ativo no cenário que aconteceu (null se ainda não saiu). */
  dir: Dir | null;
  /** Peso da notícia para o ativo (sensibilidade × importância). */
  weight: number;
}

export type MacroBias = 'alta' | 'baixa' | 'neutro' | 'misto';

export interface AssetMacro {
  ativo: FocusAssetId;
  label: string;
  released: MacroItem[];
  upcoming: MacroItem[];
  /** -1 (tudo contra) … +1 (tudo a favor), só com o que já saiu. */
  score: number;
  bias: MacroBias;
  strength: 'forte' | 'moderado' | 'leve';
  /** Quantas notícias de baixa sensibilidade ficaram de fora. */
  hidden: number;
  summary: string;
  /** Peso total (já saído + pendente): ordena os ativos do mais para o menos movimentado. */
  activity: number;
}

export const FOCUS_ASSETS = Object.keys(FOCUS_ASSET_LABEL) as FocusAssetId[];

const SENSITIVITY_WEIGHT = { alta: 3, media: 2, baixa: 1 } as const;
const IMPORTANCE_WEIGHT: Record<number, number> = { 3: 1.5, 2: 1 };

const sign = (d: Dir | null): number => (d === 'alta' ? 1 : d === 'baixa' ? -1 : 0);

export const biasLabel = (b: MacroBias): string =>
  b === 'alta' ? 'Viés de alta' : b === 'baixa' ? 'Viés de baixa' : b === 'misto' ? 'Sinais mistos' : 'Neutro';

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Compilado macro de cada ativo para o conjunto de eventos recebido (já filtrado por período). */
export function buildAssetMacros(
  events: EconEvent[],
  profiles: Map<string, EconProfile>,
  now: number,
): AssetMacro[] {
  const byAsset = new Map<FocusAssetId, { released: MacroItem[]; upcoming: MacroItem[]; hidden: number }>();
  for (const id of FOCUS_ASSETS) byAsset.set(id, { released: [], upcoming: [], hidden: 0 });

  for (const event of events) {
    const profile = profiles.get(event.event_key);
    const readings = profile?.asset_interpretation?.ativos;
    if (!profile || !readings) continue;
    const outcome = evaluateOutcome(event);
    for (const reading of readings) {
      const bucket = byAsset.get(reading.ativo);
      if (!bucket) continue;
      // Notícia de baixa sensibilidade polui o compilado: só entra na contagem.
      if (reading.relevancia === 'baixa') { bucket.hidden += 1; continue; }
      const item: MacroItem = {
        event,
        title: displayTitle(event, profile),
        reading,
        outcome,
        dir: outcome ? reading[outcome.scenario] : null,
        weight: SENSITIVITY_WEIGHT[reading.relevancia] * (IMPORTANCE_WEIGHT[event.importance] ?? 1),
      };
      // "Saiu" = tem o dado atual. Passou do horário sem dado = ainda aguardando.
      (event.actual != null ? bucket.released : bucket.upcoming).push(item);
    }
  }

  const out: AssetMacro[] = [];
  for (const ativo of FOCUS_ASSETS) {
    const b = byAsset.get(ativo)!;
    const byTime = (a: MacroItem, c: MacroItem) => new Date(a.event.occurs_at).getTime() - new Date(c.event.occurs_at).getTime();
    b.released.sort(byTime);
    b.upcoming.sort(byTime);

    const scored = b.released.filter((i) => i.dir !== null);
    const totalW = scored.reduce((s, i) => s + i.weight, 0);
    const net = scored.reduce((s, i) => s + sign(i.dir) * i.weight, 0);
    const score = totalW > 0 ? net / totalW : 0;
    const ups = scored.filter((i) => i.dir === 'alta').length;
    const downs = scored.filter((i) => i.dir === 'baixa').length;

    let bias: MacroBias = 'neutro';
    if (score >= 0.25) bias = 'alta';
    else if (score <= -0.25) bias = 'baixa';
    else if (ups > 0 && downs > 0) bias = 'misto';
    const abs = Math.abs(score);
    const strength: AssetMacro['strength'] = abs >= 0.6 ? 'forte' : abs >= 0.4 ? 'moderado' : 'leve';

    const label = FOCUS_ASSET_LABEL[ativo];
    const parts: string[] = [];
    if (scored.length > 0) {
      const flat = scored.length - ups - downs;
      parts.push(
        `${plural(scored.length, 'notícia já saiu', 'notícias já saíram')} com efeito em ${label}: `
        + `${ups} puxando para cima, ${downs} para baixo${flat ? ` e ${flat} neutra${flat > 1 ? 's' : ''}` : ''}. `
        + (bias === 'neutro' ? 'Saldo neutro até agora.'
          : bias === 'misto' ? 'Sinais contraditórios: o saldo não aponta direção clara.'
            : `Saldo de ${bias === 'alta' ? 'alta' : 'baixa'} ${strength}.`),
      );
    } else if (b.released.length > 0) {
      parts.push(`${plural(b.released.length, 'notícia já saiu', 'notícias já saíram')}, sem projeção para medir a surpresa.`);
    }
    const next = b.upcoming[0];
    if (next) {
      const late = new Date(next.event.occurs_at).getTime() <= now;
      parts.push(
        `${plural(b.upcoming.length, 'notícia ainda vai sair', 'notícias ainda vão sair')}`
        + `${late ? ' (a primeira aguarda a divulgação)' : `; a próxima é ${next.title} às ${fmtTime(next.event.occurs_at)}`}.`,
      );
    }
    if (parts.length === 0) parts.push(`Nenhuma notícia relevante para ${label} neste período.`);

    out.push({
      ativo, label,
      released: b.released, upcoming: b.upcoming,
      score, bias, strength, hidden: b.hidden,
      summary: parts.join(' '),
      activity: [...b.released, ...b.upcoming].reduce((s, i) => s + i.weight, 0),
    });
  }
  return out.sort((a, c) => c.activity - a.activity);
}
