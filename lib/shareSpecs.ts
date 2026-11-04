// Monta os cards de compartilhamento de Sinais e do Calendário Econômico a partir
// dos dados da tela. Só apresentação: nada aqui consulta o banco nem muda estado.
import type { Signal } from '../types';
import type { AnalysisSection, StructuredAnalysis } from './signalAnalysis';
import {
  AssetReading, EconEvent, EconProfile, Dir, Outcome, ScenarioKey, displayTitle, fmtDiff, fmtValue, fmtTime, FOCUS_ASSET_LABEL,
} from './econCalendar';
import { AssetMacro, biasLabel } from './econMacro';
import type { CardSpec, Dir3, ShareStat, Tone } from './shareCard';
import { TrendAnalysis, richStateName } from './trendMeter';

const fmtPrice = (v: number | null): string => {
  if (v == null) return '—';
  const abs = Math.abs(v);
  const digits = abs >= 1000 ? 2 : abs >= 100 ? 3 : abs >= 10 ? 4 : 5;
  return v.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
};

const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' });

const clip = (t: string, n: number) => {
  const c = t.replace(/\s+/g, ' ').trim();
  return c.length > n ? `${c.slice(0, n).replace(/[ ,.;:]+$/, '')}…` : c;
};

// ── Sinais ──────────────────────────────────────────────────────────────
const THEME_PRIORITY = ['confluencia', 'tendencia', 'momentum', 'macro', 'volatilidade', 'niveis', 'cenarios'];

function themeTile(s: AnalysisSection): { title: string; value: string; tone: Tone } {
  const m = s.metrics[0];
  return {
    title: s.title,
    value: m ? m.value : s.tone === 'up' ? 'Positivo' : s.tone === 'down' ? 'Negativo' : 'Neutro',
    tone: m?.tone ?? s.tone,
  };
}

export function signalCard(signal: Signal, analysis: StructuredAnalysis | null): CardSpec {
  const hasSetup = signal.action !== 'NONE';
  const sections = analysis?.sections ?? [];
  const ordered = [...sections].sort((a, b) => {
    const ia = THEME_PRIORITY.indexOf(a.id), ib = THEME_PRIORITY.indexOf(b.id);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  const note = sections.find((s) => s.id === 'cenarios')?.text
    ?? sections.find((s) => s.id === 'confluencia')?.text
    ?? (analysis ? undefined : (signal.analysis ?? signal.rationale ?? undefined));

  return {
    kind: 'signal',
    action: signal.action,
    symbol: signal.symbol,
    timeframe: signal.timeframe,
    when: fmtWhen(signal.created_at),
    levels: hasSetup
      ? [
          { label: 'Entrada', value: fmtPrice(signal.entry_price), tone: 'neutral' },
          { label: 'Stop', value: fmtPrice(signal.stop_loss), tone: 'down' },
          { label: 'Alvo', value: fmtPrice(signal.take_profit), tone: 'up' },
        ]
      : null,
    themes: ordered.filter((s) => s.id !== 'niveis' && s.id !== 'cenarios').slice(0, 4).map(themeTile),
    note: note ? clip(note, 190) : undefined,
  };
}

export const signalCaption = (signal: Signal) => {
  const verb = signal.action === 'BUY' ? 'compra' : signal.action === 'SELL' ? 'venda' : 'sem entrada';
  return `🔎 Análise IA de ${signal.symbol}${signal.timeframe ? ` (${signal.timeframe})` : ''}: ${verb}. Informativo, não é recomendação. Feita no Trader AFK: traderafk.com`;
};

// ── Calendário Econômico ────────────────────────────────────────────────
const dirOf = (d: Dir): Dir3 => (d === 'alta' ? 'up' : d === 'baixa' ? 'down' : 'flat');
const dirWord = (d: Dir) => (d === 'alta' ? 'alta' : d === 'baixa' ? 'baixa' : 'estável');
const toneOf = (d: Dir): Tone => (d === 'alta' ? 'up' : d === 'baixa' ? 'down' : 'neutral');
const SCENARIO_LABEL: Record<ScenarioKey, string> = { acima: 'Acima', em_linha: 'Em linha', abaixo: 'Abaixo' };
const SCENARIO_LABEL_QUAL: Record<ScenarioKey, string> = { acima: 'Hawkish', em_linha: 'Neutro', abaixo: 'Dovish' };
const RELEVANCE_ORDER = { alta: 0, media: 1, baixa: 2 } as const;

const COUNTRY_SHORT: Record<string, string> = {
  US: 'EUA', EU: 'Zona do Euro', GB: 'Reino Unido', JP: 'Japão', CN: 'China', BR: 'Brasil', DE: 'Alemanha',
  FR: 'França', IT: 'Itália', ES: 'Espanha', CA: 'Canadá', AU: 'Austrália', NZ: 'Nova Zelândia', CH: 'Suíça',
};

export function newsCard(event: EconEvent, profile: EconProfile | undefined, outcome: Outcome | null): CardSpec | null {
  const interp = profile?.interpretation;
  if (!interp) return null;
  const qual = interp.tipo === 'qualitativo';
  const labels = qual ? SCENARIO_LABEL_QUAL : SCENARIO_LABEL;
  const phase = outcome ? 'post' : 'pre';

  const time = new Date(event.occurs_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const meta = `${COUNTRY_SHORT[event.country] ?? event.country} · ${event.currency} · ${time}`;

  const numbers: ShareStat[] = [];
  if (event.previous != null) numbers.push({ label: 'Anterior', value: fmtValue(event.previous, event.unit, event.precision) });
  if (event.forecast != null) numbers.push({ label: 'Projeção', value: fmtValue(event.forecast, event.unit, event.precision) });
  if (outcome && event.actual != null) numbers.push({ label: 'Atual', value: fmtValue(event.actual, event.unit, event.precision), tone: 'up' });

  const base = {
    kind: 'news' as const,
    phase: phase as 'pre' | 'post',
    title: displayTitle(event, profile),
    meta,
    stars: event.importance,
    numbers,
  };

  if (!outcome) {
    // Antes da divulgação: o que cada cenário faria com a moeda.
    return {
      ...base,
      headline: 'Aguardando a divulgação',
      headlineTone: 'neutral',
      verdict: 'A reação vem da diferença entre o dado e a projeção.',
      rowsTitle: `Se o dado vier… (efeito em ${event.currency})`,
      rows: (['acima', 'em_linha', 'abaixo'] as ScenarioKey[]).map((k) => ({
        label: labels[k],
        value: `${event.currency} ${dirWord(interp.cenarios[k].moeda)}`,
        dir: dirOf(interp.cenarios[k].moeda),
      })),
      note: interp.resumo ? clip(interp.resumo, 150) : undefined,
    };
  }

  // Depois: o que aconteceu e como cada ativo tende a reagir a esse cenário.
  const hit = interp.cenarios[outcome.scenario];
  const against = outcome.baseline === 'forecast' ? 'da projeção' : 'do dado anterior';
  const headline = outcome.scenario === 'em_linha'
    ? 'Em linha'
    : `${outcome.scenario === 'acima' ? 'Acima' : 'Abaixo'} ${against}`;
  const assets = [...(profile?.asset_interpretation?.ativos ?? [])]
    .sort((a, b) => RELEVANCE_ORDER[a.relevancia] - RELEVANCE_ORDER[b.relevancia])
    .slice(0, 6);

  return {
    ...base,
    headline,
    headlineTone: toneOf(hit.moeda),
    verdict: `${event.currency} tende a ${dirWord(hit.moeda)}${hit.moeda !== 'neutra' ? ` ${hit.intensidade}` : ''}`
      + (outcome.scenario !== 'em_linha' ? ` · ${fmtDiff(outcome.diff, event.unit, event.precision)}` : ''),
    rowsTitle: assets.length ? 'Reação típica por ativo' : `Cenário: ${labels[outcome.scenario]}`,
    rows: assets.length
      ? assets.map((a) => ({
          label: a.ativo,
          value: dirWord(a[outcome.scenario]),
          dir: dirOf(a[outcome.scenario]),
        }))
      : hit.ativos.slice(0, 6).map((a) => ({ label: a.ativo, value: dirWord(a.direcao), dir: dirOf(a.direcao) })),
    note: hit.leitura ? clip(hit.leitura, 150) : undefined,
  };
}

export const newsCaption = (event: EconEvent, profile: EconProfile | undefined, outcome: Outcome | null) => {
  const t = displayTitle(event, profile);
  return outcome
    ? `📰 ${t}: saiu ${fmtValue(event.actual, event.unit, event.precision)}. Veja a leitura por ativo no Calendário Econômico do Trader AFK. Leitura por IA, não é recomendação. traderafk.com`
    : `📅 Hoje: ${t} (${event.currency}). Veja os cenários antes da divulgação no Calendário Econômico do Trader AFK. Leitura por IA, não é recomendação. traderafk.com`;
};


// Card exclusivo de UM ativo dentro de uma notícia: os três cenários do indicador e o efeito em só esse ativo.
export function assetNewsCard(event: EconEvent, profile: EconProfile | undefined, reading: AssetReading, outcome: Outcome | null): CardSpec | null {
  const base = newsCard(event, profile, outcome);
  const interp = profile?.interpretation;
  if (!base || base.kind !== 'news' || !interp) return null;
  const labels = interp.tipo === 'qualitativo' ? SCENARIO_LABEL_QUAL : SCENARIO_LABEL;
  const name = FOCUS_ASSET_LABEL[reading.ativo] ?? reading.ativo;
  const hit = outcome?.scenario ?? null;
  const dir = hit ? reading[hit] : null;
  return {
    ...base,
    eyebrow: `CALENDÁRIO ECONÔMICO · ${reading.ativo} · ${hit ? 'APÓS A NOTÍCIA' : 'ANTES DA NOTÍCIA'}`,
    headline: dir ? `${name} ${dirWord(dir)}` : `${name} (${reading.ativo})`,
    headlineTone: dir ? toneOf(dir) : 'neutral',
    verdict: hit
      ? (outcome!.scenario === 'em_linha' ? 'Dado em linha: ' : `Dado ${outcome!.scenario === 'acima' ? 'acima' : 'abaixo'}: `) + `reação típica do ${name}`
      : `Reação típica do ${name} em cada cenário`,
    rowsTitle: `${hit ? 'Cenários do dado' : 'Se o dado vier…'} (efeito no ${reading.ativo})`,
    rows: (['acima', 'em_linha', 'abaixo'] as ScenarioKey[]).map((k) => ({
      label: hit === k ? `${labels[k]} ✓` : labels[k],
      value: `${reading.ativo} ${dirWord(reading[k])}`,
      dir: dirOf(reading[k]),
    })),
    note: reading.leitura ? clip(reading.leitura, 150) : undefined,
  };
}

export const assetNewsCaption = (event: EconEvent, profile: EconProfile | undefined, reading: AssetReading, outcome: Outcome | null) => {
  const t = displayTitle(event, profile);
  const name = FOCUS_ASSET_LABEL[reading.ativo] ?? reading.ativo;
  return outcome
    ? `📰 ${t}: saiu ${fmtValue(event.actual, event.unit, event.precision)}. Reação típica do ${name} (${reading.ativo}) no Calendário Econômico do Trader AFK. Leitura por IA, não é recomendação. traderafk.com`
    : `📅 ${t}: o que esperar do ${name} (${reading.ativo}) em cada cenário, no Calendário Econômico do Trader AFK. Leitura por IA, não é recomendação. traderafk.com`;
};

// Card do compilado macro de um ativo: notícias que já saíram e as que ainda vão sair.
export function assetMacroCard(m: AssetMacro, periodLabel: string): CardSpec {
  const tone: Tone = m.bias === 'alta' ? 'up' : m.bias === 'baixa' ? 'down' : 'neutral';
  const rows = [
    ...m.released.filter((i) => i.dir !== null).slice(-3).map((i) => ({
      label: `${fmtTime(i.event.occurs_at)} · ${clip(i.title, 38)}`,
      value: dirWord(i.dir!),
      dir: dirOf(i.dir!),
    })),
    ...m.upcoming.slice(0, 2).map((i) => ({
      label: `${fmtTime(i.event.occurs_at)} · ${clip(i.title, 38)}`,
      value: 'a sair',
      dir: 'flat' as Dir3,
    })),
  ].slice(0, 5);
  return {
    kind: 'news',
    phase: 'pre',
    eyebrow: `CALENDÁRIO ECONÔMICO · MACRO · ${periodLabel.toUpperCase()}`,
    wide: true,
    title: `${m.label} (${m.ativo})`,
    meta: `${m.released.length} já saíram · ${m.upcoming.length} a sair`,
    stars: 0,
    numbers: [],
    headline: biasLabel(m.bias) + (m.bias === 'alta' || m.bias === 'baixa' ? ` ${m.strength}` : ''),
    headlineTone: tone,
    verdict: `Saldo das notícias de ${periodLabel.toLowerCase()}`,
    rowsTitle: rows.length ? 'Notícias que mexem no ativo' : 'Sem notícias relevantes',
    rows,
    note: clip(m.summary, 150),
  };
}

export const assetMacroCaption = (m: AssetMacro, periodLabel: string) =>
  `🧭 Macro do ${m.label} (${m.ativo}) — ${periodLabel.toLowerCase()}: ${biasLabel(m.bias).toLowerCase()}, ${m.released.length} notícia(s) já saíram e ${m.upcoming.length} ainda vão sair. Compilado por IA no Calendário Econômico do Trader AFK, não é recomendação. traderafk.com`;

// ── Painel de tendência ─────────────────────────────────────────────────
const STATE_TONE: Record<number, Tone> = { 0: 'neutral', 1: 'up', 2: 'neutral', 3: 'down', 4: 'neutral', 5: 'up', 6: 'down' };

export function trendCard(assetLabel: string, analysis: TrendAnalysis, at: Date): CardSpec {
  const up = analysis.superTrend === 'up' || analysis.bias === 1;
  const down = analysis.superTrend === 'down' || analysis.bias === -1;
  const tone: Tone = up ? 'up' : down ? 'down' : 'neutral';
  return {
    kind: 'result',
    eyebrow: 'Painel de tendência',
    title: assetLabel,
    subtitle: at.toLocaleString('pt-BR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' }),
    headlineLabel: 'Viés consolidado',
    headline: up ? 'ALTA' : down ? 'BAIXA' : 'NEUTRO',
    tone,
    stats: analysis.perByTF.map((r) => ({ label: r.label, value: richStateName(r.state), tone: STATE_TONE[r.state] ?? 'neutral' })),
    footer: 'Informativo · não é recomendação',
  };
}

export const trendCaption = (assetLabel: string, analysis: TrendAnalysis) => {
  const up = analysis.superTrend === 'up' || analysis.bias === 1;
  const down = analysis.superTrend === 'down' || analysis.bias === -1;
  return `📊 Painel de tendência de ${assetLabel}: viés de ${up ? 'alta' : down ? 'baixa' : 'neutro'} em ${analysis.perByTF.length} timeframes. Informativo, não é recomendação. Veja no Trader AFK: traderafk.com`;
};

// ── Loja de Coins (sem valores em R$: só o que foi conquistado) ─────────
export function coinsCard(coins: number, packageName: string | null, balance: number | null): CardSpec {
  const stats: ShareStat[] = [];
  if (packageName) stats.push({ label: 'Pacote', value: packageName });
  if (balance != null) stats.push({ label: 'Saldo atual', value: balance.toLocaleString('pt-BR'), tone: 'up' });
  return {
    kind: 'result',
    eyebrow: 'Loja de Coins',
    title: 'Coins conquistados',
    subtitle: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
    headlineLabel: 'Novo crédito',
    headline: `+${coins.toLocaleString('pt-BR')} Coins`,
    tone: 'up',
    stats,
    footer: 'Para análises de IA, tendência e a Trilha Gain',
  };
}

export const coinsCaption = (coins: number) =>
  `🪙 +${coins.toLocaleString('pt-BR')} Coins na conta! Vou usar nas análises de IA, no painel de tendência e na Trilha Gain do Trader AFK. traderafk.com`;
