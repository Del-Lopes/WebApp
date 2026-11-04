import React, { useMemo, useState } from 'react';
import { cn } from '../../../lib/cn';
import { Chip, Note, Panel, Readout, Slider, money } from './widgets';

// Calculadoras visuais. Valores de EURUSD: 1 pip = 0,0001; lote padrão = 100.000 unidades (US$ 10 por pip).
const PIP_USD = 10;

// ── Spread (e comissão) ──────────────────────────────────────────────────
export const SpreadCalc: React.FC<{ commission?: boolean }> = ({ commission }) => {
  const [sp, setSp] = useState(commission ? 0.2 : 1.2);
  const [lot, setLot] = useState(0.1);
  const [acct, setAcct] = useState<'std' | 'ecn'>(commission ? 'ecn' : 'std');
  const spread = commission ? (acct === 'ecn' ? 0.2 : 1.4) : sp;
  const comm = commission && acct === 'ecn' ? 7 * lot : 0; // US$ 7 por lote (ida e volta)
  const bid = 1.085, ask = bid + spread * 0.0001;
  const cost = spread * PIP_USD * lot + comm;
  return (
    <div className="space-y-2.5">
      {commission && (
        <div className="flex gap-2">
          <Chip on={acct === 'std'} onClick={() => setAcct('std')}>Conta padrão (spread maior)</Chip>
          <Chip on={acct === 'ecn'} onClick={() => setAcct('ecn')}>Conta ECN (spread + comissão)</Chip>
        </div>
      )}
      <Panel>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-lg border border-danger/25 bg-danger/10 py-2"><p className="eyebrow-muted">Bid (você vende)</p><p className="font-mono text-lg font-bold text-danger-fg tabular-nums">{bid.toFixed(5)}</p></div>
          <div className="rounded-lg border border-success/25 bg-success/10 py-2"><p className="eyebrow-muted">Ask (você compra)</p><p className="font-mono text-lg font-bold text-success-fg tabular-nums">{ask.toFixed(5)}</p></div>
        </div>
        <div className="mt-2 flex items-center justify-center">
          <div className="h-2 rounded-full bg-warning transition-all" style={{ width: `${Math.max(4, spread * 18)}%` }} />
        </div>
        <p className="mt-1 text-center text-xs text-fg-muted">Spread = <b className="text-warning-fg">{spread.toFixed(1)} pips</b> (a distância entre os dois preços)</p>
      </Panel>
      <Panel className="space-y-2">
        {!commission && <Slider label="Spread" value={sp} min={0} max={5} step={0.1} onChange={setSp} unit=" pips" fmt={(v) => v.toFixed(1)} />}
        <Slider label="Tamanho (lote)" value={lot} min={0.01} max={1} step={0.01} onChange={setLot} fmt={(v) => v.toFixed(2)} />
      </Panel>
      <div className="flex gap-2">
        <Readout label="Custo ao abrir" value={money(cost)} tone="dn" />
        <Readout label="Empata com" value={`${(spread + (comm ? comm / (PIP_USD * lot) : 0)).toFixed(1)} pips`} tone="ac" />
      </div>
      <Note tone="wn">Ao comprar, você já entra {money(cost)} no negativo. O preço precisa andar a seu favor só para você empatar.</Note>
    </div>
  );
};

// ── Lote e pip ───────────────────────────────────────────────────────────
export const LotPipCalc: React.FC<{ focus?: 'lot' | 'pip' }> = ({ focus = 'lot' }) => {
  const [lot, setLot] = useState(0.1);
  const [pips, setPips] = useState(20);
  const pl = pips * PIP_USD * lot;
  const price = 1.085 + pips * 0.0001;
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-1.5">
        {[[0.01, 'Micro 0,01'], [0.1, 'Mini 0,10'], [1, 'Padrão 1,00']].map(([v, l]) => (
          <Chip key={v as number} on={lot === v} onClick={() => setLot(v as number)}>{l as string}</Chip>
        ))}
      </div>
      <Panel>
        <p className="text-center text-xs text-fg-muted">EURUSD parte de 1.08500</p>
        <p className="text-center font-mono text-3xl font-bold tabular-nums text-fg">
          1.08<span className={cn('rounded px-0.5', focus === 'pip' ? 'bg-warning/25 text-warning-fg' : '')}>{price.toFixed(5).slice(4, 7)}</span><span className="text-fg-subtle">{price.toFixed(5).slice(7)}</span>
        </p>
        <p className="text-center text-[11px] text-fg-subtle">{focus === 'pip' ? 'O 4º decimal destacado é o pip: 0,0001' : 'Cada 0,0001 de movimento é 1 pip'}</p>
      </Panel>
      <Panel><Slider label="Movimento" value={pips} min={-50} max={50} onChange={setPips} unit=" pips" fmt={(v) => (v > 0 ? `+${v}` : `${v}`)} /></Panel>
      <div className="flex gap-2">
        <Readout label="Valor do pip" value={money(PIP_USD * lot)} tone="ac" />
        <Readout label="Resultado (compra)" value={`${pl >= 0 ? '+' : ''}${money(pl)}`} tone={pl >= 0 ? 'up' : 'dn'} />
      </div>
      <Note>O mesmo movimento de {Math.abs(pips)} pips vale {money(Math.abs(pips) * PIP_USD * 0.01)} com 0,01 lote e {money(Math.abs(pips) * PIP_USD * 1)} com 1 lote. <b>O lote escala o ganho e a perda.</b></Note>
    </div>
  );
};

// ── Alavancagem e margem ─────────────────────────────────────────────────
export const LeverageCalc: React.FC<{ stopout?: boolean }> = ({ stopout }) => {
  const [lev, setLev] = useState(100);
  const [lot, setLot] = useState(0.5);
  const [cap, setCap] = useState(1000);
  const [adv, setAdv] = useState(0);
  const notional = lot * 100000 * 1.085;
  const margin = notional / lev;
  const equity = cap - adv * PIP_USD * lot;
  const level = margin > 0 ? (equity / margin) * 100 : 0;
  const blocked = margin > cap;
  const out = stopout && level < 50;
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-1.5">{[10, 30, 100, 500].map((l) => <Chip key={l} on={lev === l} onClick={() => setLev(l)}>1:{l}</Chip>)}</div>
      <Panel className="space-y-2">
        <Slider label="Capital" value={cap} min={100} max={10000} step={100} onChange={setCap} fmt={(v) => money(v, 0)} />
        <Slider label="Lote" value={lot} min={0.01} max={3} step={0.01} onChange={setLot} fmt={(v) => v.toFixed(2)} />
        {stopout && <Slider label="Contra você" value={adv} min={0} max={200} onChange={setAdv} unit=" pips" />}
      </Panel>
      <Panel>
        <div className="flex items-center justify-between text-xs text-fg-muted"><span>Posição controlada</span><b className="font-mono text-fg tabular-nums">{money(notional, 0)}</b></div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-tint/10">
          <div className={cn('h-full rounded-full transition-all', blocked ? 'bg-danger' : margin / cap > 0.5 ? 'bg-warning' : 'bg-success')} style={{ width: `${Math.min(100, (margin / cap) * 100)}%` }} />
        </div>
        <p className="mt-1 text-xs text-fg-muted">Margem usada: <b className="text-fg">{money(margin)}</b> de {money(cap, 0)} ({Math.min(999, (margin / cap) * 100).toFixed(0)}% do capital)</p>
      </Panel>
      {stopout && (
        <div className="flex gap-2">
          <Readout label="Patrimônio" value={money(equity)} tone={equity >= cap ? 'ac' : 'dn'} />
          <Readout label="Nível de margem" value={`${level.toFixed(0)}%`} tone={out ? 'dn' : 'up'} />
        </div>
      )}
      {blocked ? <Note tone="dn">Margem maior que o capital: a corretora não deixa abrir essa posição. Reduza o lote ou aumente a alavancagem.</Note>
        : out ? <Note tone="dn"><b>Stop out!</b> Com o nível de margem abaixo de 50%, a corretora fecha suas posições para limitar o prejuízo.</Note>
          : <Note>Alavancagem 1:{lev} libera {money(notional, 0)} de exposição com só {money(margin)} de garantia. {stopout ? 'Arraste "Contra você" e veja o nível de margem cair.' : 'Mais alavancagem = menos margem, mas o risco da posição continua o mesmo.'}</Note>}
    </div>
  );
};

// ── Risco por operação e tamanho da posição ──────────────────────────────
export const RiskCalc: React.FC<{ focus?: 'risk' | 'size' }> = ({ focus = 'risk' }) => {
  const [cap, setCap] = useState(5000);
  const [pct, setPct] = useState(1);
  const [stop, setStop] = useState(25);
  const risk = (cap * pct) / 100;
  const lot = risk / (stop * PIP_USD);
  const after10 = cap * Math.pow(1 - pct / 100, 10);
  return (
    <div className="space-y-2.5">
      <Panel className="space-y-2">
        <Slider label="Capital" value={cap} min={500} max={50000} step={500} onChange={setCap} fmt={(v) => money(v, 0)} />
        <Slider label="Risco por trade" value={pct} min={0.25} max={10} step={0.25} onChange={setPct} unit="%" fmt={(v) => v.toFixed(2)} />
        <Slider label="Stop loss" value={stop} min={5} max={100} onChange={setStop} unit=" pips" />
      </Panel>
      <div className="flex gap-2">
        <Readout label="Você arrisca" value={money(risk)} tone={pct > 3 ? 'dn' : 'ac'} />
        <Readout label="Lote ideal" value={lot.toFixed(2)} tone="up" />
      </div>
      <Panel>
        <p className="text-xs text-fg-muted">Depois de <b className="text-fg">10 perdas seguidas</b> o capital seria:</p>
        <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-tint/10"><div className={cn('h-full rounded-full transition-all', after10 / cap < 0.6 ? 'bg-danger' : after10 / cap < 0.85 ? 'bg-warning' : 'bg-success')} style={{ width: `${(after10 / cap) * 100}%` }} /></div>
        <p className="mt-1 font-mono text-sm font-bold tabular-nums text-fg">{money(after10, 0)} <span className="text-xs font-normal text-fg-muted">({((after10 / cap) * 100).toFixed(0)}% do capital)</span></p>
      </Panel>
      <Note tone={pct > 3 ? 'dn' : 'ac'}>
        {focus === 'size'
          ? <>Fórmula: <b>lote = risco em $ ÷ (stop em pips × valor do pip)</b> = {money(risk)} ÷ ({stop} × {money(PIP_USD, 0)}) = <b>{lot.toFixed(2)} lote</b>. Se o stop muda, o lote muda.</>
          : pct > 3 ? 'Acima de 3% por trade, uma sequência ruim comum já machuca muito o capital.' : 'Entre 1% e 2% por operação, uma sequência de perdas é suportável e você continua no jogo.'}
      </Note>
    </div>
  );
};

// ── Stop, alvo e relação risco/retorno ───────────────────────────────────
export const RRCalc: React.FC<{ focus?: 'sl' | 'tp' | 'rr' }> = ({ focus = 'rr' }) => {
  const [sl, setSl] = useState(20);
  const [tp, setTp] = useState(40);
  const [wr, setWr] = useState(40);
  const rr = tp / sl;
  const be = 100 / (1 + rr);
  const ev = (wr / 100) * rr - (1 - wr / 100);
  const H = 150, mid = 75, scale = 0.45;
  const yTp = mid - Math.min(tp * scale, 68), ySl = mid + Math.min(sl * scale, 68);
  return (
    <div className="space-y-2.5">
      <Panel>
        <svg viewBox={`0 0 340 ${H}`} className="w-full h-auto" role="img" aria-label="Stop e alvo">
          <rect x={20} y={yTp} width={300} height={mid - yTp} fill="#10b981" opacity={0.15} />
          <rect x={20} y={mid} width={300} height={ySl - mid} fill="#f43f5e" opacity={0.15} />
          <g className="text-fg-muted"><line x1={20} x2={320} y1={mid} y2={mid} stroke="currentColor" strokeWidth={1.5} /></g>
          <line x1={20} x2={320} y1={yTp} y2={yTp} stroke="#10b981" strokeWidth={2} strokeDasharray="5 3" />
          <line x1={20} x2={320} y1={ySl} y2={ySl} stroke="#f43f5e" strokeWidth={2} strokeDasharray="5 3" />
          <text x={26} y={yTp + 12} fontSize={10} fontWeight={700} fill="#10b981">Take profit · +{tp} pips</text>
          <text x={26} y={mid - 4} fontSize={10} fontWeight={700} className="fill-current text-fg">Entrada</text>
          <text x={26} y={ySl - 4} fontSize={10} fontWeight={700} fill="#f43f5e">Stop loss · -{sl} pips</text>
          <text x={314} y={mid - 4} textAnchor="end" fontSize={11} fontWeight={800} className="fill-current text-accent-fg">R:R 1:{rr.toFixed(1)}</text>
        </svg>
      </Panel>
      <Panel className="space-y-2">
        <Slider label="Stop loss" value={sl} min={5} max={60} onChange={setSl} unit=" pips" />
        <Slider label="Take profit" value={tp} min={5} max={150} onChange={setTp} unit=" pips" />
        <Slider label="Taxa de acerto" value={wr} min={10} max={90} onChange={setWr} unit="%" />
      </Panel>
      <div className="flex gap-2">
        <Readout label="Acerto p/ empatar" value={`${be.toFixed(0)}%`} tone="ac" />
        <Readout label="Esperado por trade" value={`${ev >= 0 ? '+' : ''}${ev.toFixed(2)}R`} tone={ev >= 0 ? 'up' : 'dn'} />
      </div>
      <Note tone={ev >= 0 ? 'up' : 'dn'}>
        {focus === 'sl' ? `O stop define quanto você aceita perder: ${sl} pips. Alvo maior que o stop dá espaço para errar mais e ainda lucrar.`
          : focus === 'tp' ? `O alvo define onde você realiza: +${tp} pips. Um alvo distante demais raramente é atingido; perto demais não paga as perdas.`
            : `Com R:R 1:${rr.toFixed(1)} você só precisa acertar ${be.toFixed(0)}% das vezes para empatar. Com ${wr}% de acerto, o resultado esperado é ${ev >= 0 ? 'positivo' : 'negativo'}.`}
      </Note>
    </div>
  );
};

// ── Drawdown ─────────────────────────────────────────────────────────────
export const DrawdownCalc: React.FC = () => {
  const [dd, setDd] = useState(30);
  const need = (1 / (1 - dd / 100) - 1) * 100;
  return (
    <div className="space-y-2.5">
      <Panel className="space-y-3">
        <Slider label="Queda (drawdown)" value={dd} min={5} max={90} onChange={setDd} unit="%" />
        <div>
          <div className="mb-1 flex justify-between text-xs text-fg-muted"><span>Capital perdido</span><b className="text-danger-fg">-{dd}%</b></div>
          <div className="h-3 overflow-hidden rounded-full bg-tint/10"><div className="h-full rounded-full bg-danger transition-all" style={{ width: `${dd}%` }} /></div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs text-fg-muted"><span>Ganho necessário para voltar</span><b className="text-success-fg">+{need.toFixed(0)}%</b></div>
          <div className="h-3 overflow-hidden rounded-full bg-tint/10"><div className="h-full rounded-full bg-success transition-all" style={{ width: `${Math.min(100, need / 5)}%` }} /></div>
        </div>
      </Panel>
      <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
        {[10, 20, 50, 80].map((d) => (
          <button key={d} type="button" onClick={() => setDd(d)} className="rounded-lg border border-tint/10 bg-tint/3 px-1 py-1.5">
            <p className="text-fg-muted">-{d}%</p><p className="font-mono font-bold text-success-fg tabular-nums">+{((1 / (1 - d / 100) - 1) * 100).toFixed(0)}%</p>
          </button>
        ))}
      </div>
      <Note tone="wn">Perder é mais fácil que recuperar: cair {dd}% exige subir {need.toFixed(0)}% para voltar ao zero. Por isso proteger o capital vem primeiro.</Note>
    </div>
  );
};

// ── Martingale ───────────────────────────────────────────────────────────
export const MartingaleCalc: React.FC = () => {
  const [n, setN] = useState(5);
  const cap = 5000, base = 50;
  const bets = Array.from({ length: Math.min(n + 1, 11) }, (_, i) => base * 2 ** i);
  const lost = base * (2 ** n - 1);
  const next = base * 2 ** n;
  const broke = next > cap - lost;
  const max = bets[bets.length - 1];
  return (
    <div className="space-y-2.5">
      <Panel><Slider label="Perdas seguidas" value={n} min={1} max={10} onChange={setN} /></Panel>
      <Panel>
        <div className="flex h-28 items-end gap-1">
          {bets.map((b, i) => (
            <div key={i} className="flex flex-1 flex-col items-center justify-end gap-0.5">
              <div className={cn('w-full rounded-t transition-all', i === bets.length - 1 ? 'bg-warning' : 'bg-danger/60')} style={{ height: `${Math.max(4, (b / max) * 100)}%` }} />
              <span className="font-mono text-[9px] text-fg-subtle">{i + 1}ª</span>
            </div>
          ))}
        </div>
        <p className="mt-1 text-center text-[11px] text-fg-subtle">Valor apostado em cada tentativa (dobra a cada perda)</p>
      </Panel>
      <div className="flex gap-2">
        <Readout label="Já perdeu" value={money(lost, 0)} tone="dn" />
        <Readout label="Próxima aposta" value={money(next, 0)} tone={broke ? 'dn' : 'ac'} />
      </div>
      <Note tone={broke ? 'dn' : 'wn'}>{broke ? `Com capital de ${money(cap, 0)}, você não consegue nem cobrir a próxima aposta. É assim que o martingale quebra contas.` : `Começando com ${money(base, 0)}, ${n} perdas seguidas já custam ${money(lost, 0)} (${((lost / cap) * 100).toFixed(0)}% do capital). Sequências longas existem.`}</Note>
    </div>
  );
};

// ── Horários de mercado ──────────────────────────────────────────────────
const SESSIONS: { n: string; s: number; e: number; c: string }[] = [
  { n: 'Sydney', s: 19, e: 4, c: '#a78bfa' },
  { n: 'Tóquio', s: 21, e: 6, c: '#f472b6' },
  { n: 'Londres', s: 5, e: 14, c: '#38bdf8' },
  { n: 'Nova York', s: 10, e: 19, c: '#34d399' },
];
const inSess = (h: number, s: number, e: number) => (s < e ? h >= s && h < e : h >= s || h < e);

export const HoursCalc: React.FC<{ killzones?: boolean }> = ({ killzones }) => {
  const [h, setH] = useState(11);
  const active = SESSIONS.filter((s) => inSess(h, s.s, s.e));
  const KZ = [{ n: 'Londres', s: 4, e: 7, c: '#38bdf8' }, { n: 'Nova York', s: 9, e: 12, c: '#34d399' }];
  const kzOn = KZ.filter((k) => inSess(h, k.s, k.e));
  const heat = Math.min(100, active.length * 30 + (active.length >= 2 ? 15 : 0));
  return (
    <div className="space-y-2.5">
      <Panel>
        <div className="relative space-y-1.5">
          {(killzones ? KZ : SESSIONS).map((s) => (
            <div key={s.n} className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-[11px] font-semibold text-fg-muted">{s.n}</span>
              <div className="relative h-3 flex-1 rounded-full bg-tint/8">
                {(s.s < s.e ? [[s.s, s.e]] : [[s.s, 24], [0, s.e]]).map(([a, b], i) => (
                  <div key={i} className="absolute top-0 h-full rounded-full" style={{ left: `${(a / 24) * 100}%`, width: `${((b - a) / 24) * 100}%`, background: s.c, opacity: 0.8 }} />
                ))}
              </div>
            </div>
          ))}
          <div className="pointer-events-none absolute inset-y-0 w-0.5 rounded-full bg-fg" style={{ left: `calc(4.5rem + (100% - 4.5rem) * ${h / 24})` }} />
        </div>
        <div className="ml-[72px] mt-1 flex justify-between text-[9px] text-fg-subtle"><span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>24h</span></div>
      </Panel>
      <Panel><Slider label="Hora (Brasília)" value={h} min={0} max={23} onChange={setH} fmt={(v) => `${String(v).padStart(2, '0')}:00`} /></Panel>
      <div className="flex gap-2">
        <Readout label={killzones ? 'Janela ativa' : 'Mercados abertos'} value={killzones ? (kzOn.map((k) => k.n).join(' + ') || 'nenhuma') : active.map((a) => a.n).join(' + ') || 'poucos'} tone="ac" />
        <Readout label="Movimento" value={killzones ? (kzOn.length ? 'alto' : 'baixo') : heat >= 70 ? 'alto' : heat >= 35 ? 'médio' : 'baixo'} tone={(killzones ? kzOn.length > 0 : heat >= 70) ? 'up' : 'mu'} />
      </div>
      <Note>{killzones ? 'As killzones concentram o fluxo institucional. Fora delas, o preço tende a andar de lado. Horários aproximados (Brasília), mudam com o horário de verão.'
        : active.length >= 2 ? 'Sobreposição de sessões: mais participantes, mais volume e movimentos mais fortes. Horários aproximados (Brasília).' : 'Poucas sessões abertas: o mercado costuma andar devagar e de lado. Horários aproximados (Brasília).'}</Note>
    </div>
  );
};

// ── Slippage ─────────────────────────────────────────────────────────────
export const SlippageCalc: React.FC = () => {
  const [vol, setVol] = useState(1);
  const [lot, setLot] = useState(1);
  const slip = [0, 0.3, 1.2, 3.5, 8][vol];
  const names = ['Mercado calmo', 'Normal', 'Ativo', 'Notícia forte', 'Notícia extrema'];
  const cost = slip * PIP_USD * lot;
  return (
    <div className="space-y-2.5">
      <Panel className="space-y-2">
        <Slider label="Volatilidade" value={vol} min={0} max={4} onChange={setVol} fmt={(v) => names[v]} />
        <Slider label="Lote" value={lot} min={0.1} max={5} step={0.1} onChange={setLot} fmt={(v) => v.toFixed(1)} />
      </Panel>
      <Panel>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div><p className="eyebrow-muted">Você clicou em</p><p className="font-mono text-lg font-bold text-fg tabular-nums">1.08500</p></div>
          <div><p className="eyebrow-muted">Executou em</p><p className={cn('font-mono text-lg font-bold tabular-nums', slip > 0 ? 'text-danger-fg' : 'text-success-fg')}>{(1.085 + slip * 0.0001).toFixed(5)}</p></div>
        </div>
      </Panel>
      <div className="flex gap-2"><Readout label="Escorregou" value={`${slip.toFixed(1)} pips`} tone={slip > 0 ? 'dn' : 'up'} /><Readout label="Custo extra" value={money(cost)} tone={cost > 0 ? 'dn' : 'up'} /></div>
      <Note tone="wn">Slippage é a diferença entre o preço pedido e o executado. Cresce com volatilidade e com o tamanho da ordem, principalmente em notícias.</Note>
    </div>
  );
};

// ── Overfitting (otimização) ─────────────────────────────────────────────
export const OverfitLab: React.FC = () => {
  const [k, setK] = useState(1);
  const pts = 40;
  const data = useMemo(() => {
    const noise = (i: number, s: number) => Math.sin(i * 1.7 + s) * 3 + Math.sin(i * 0.6 + s * 2) * 4;
    const back = Array.from({ length: pts }, (_, i) => 40 + i * (0.8 + k * 0.45) + noise(i, 1) / (1 + k * 0.6));
    const fwd = Array.from({ length: pts }, (_, i) => 40 + i * (0.8 - k * 0.12) + noise(i, 9) * (1 + k * 0.15));
    return { back, fwd };
  }, [k]);
  const all = [...data.back, ...data.fwd];
  const lo = Math.min(...all), hi = Math.max(...all);
  const W = 340, H = 130;
  const d = (arr: number[]) => arr.map((v, i) => `${i ? 'L' : 'M'}${(8 + (i / (pts - 1)) * (W - 16)).toFixed(1)} ${(8 + (1 - (v - lo) / (hi - lo)) * (H - 16)).toFixed(1)}`).join('');
  return (
    <div className="space-y-2.5">
      <Panel>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Backtest x resultado real">
          <path d={d(data.back)} fill="none" stroke="#10b981" strokeWidth={2.2} strokeLinecap="round" />
          <path d={d(data.fwd)} fill="none" stroke="#f43f5e" strokeWidth={2.2} strokeLinecap="round" strokeDasharray="5 3" />
        </svg>
        <div className="flex justify-center gap-4 text-xs"><span className="font-semibold text-emerald-500">— Backtest (passado)</span><span className="font-semibold text-rose-500">- - Mercado real (futuro)</span></div>
      </Panel>
      <Panel><Slider label="Otimização" value={k} min={0} max={5} onChange={setK} fmt={(v) => ['nenhuma', 'leve', 'média', 'forte', 'extrema', 'absurda'][v]} /></Panel>
      <Note tone={k >= 3 ? 'dn' : 'ac'}>{k >= 3 ? 'O backtest ficou "perfeito", mas o robô só decorou o passado. No mercado real o resultado desaba: isso é overfitting.' : 'Pouca otimização: passado e futuro se parecem. É um sinal mais honesto de que a estratégia pode funcionar.'}</Note>
    </div>
  );
};

// ── Oferta e demanda ─────────────────────────────────────────────────────
export const BalanceLab: React.FC = () => {
  const [v, setV] = useState(0);
  const buy = 50 + v / 2;
  const price = 1.085 + v * 0.00004;
  return (
    <div className="space-y-2.5">
      <Panel className="space-y-2">
        <div className="flex h-8 overflow-hidden rounded-lg text-xs font-bold text-white">
          <div className="flex items-center justify-center bg-emerald-500 transition-all" style={{ width: `${buy}%` }}>{buy > 18 && `Compradores ${buy.toFixed(0)}%`}</div>
          <div className="flex items-center justify-center bg-rose-500 transition-all" style={{ width: `${100 - buy}%` }}>{100 - buy > 18 && `Vendedores ${(100 - buy).toFixed(0)}%`}</div>
        </div>
        <Slider label="Quem pressiona" value={v} min={-100} max={100} onChange={setV} fmt={(x) => (x === 0 ? 'equilíbrio' : x > 0 ? 'compra' : 'venda')} />
      </Panel>
      <Panel>
        <p className="text-center text-xs text-fg-muted">Preço do EURUSD</p>
        <p className={cn('text-center font-mono text-3xl font-bold tabular-nums transition-colors', v > 5 ? 'text-success-fg' : v < -5 ? 'text-danger-fg' : 'text-fg')}>
          {v > 5 ? '▲ ' : v < -5 ? '▼ ' : '• '}{price.toFixed(5)}
        </p>
      </Panel>
      <Note tone={v > 5 ? 'up' : v < -5 ? 'dn' : 'ac'}>
        {v > 5 ? 'Demanda maior que a oferta: os compradores aceitam pagar mais e o preço sobe.'
          : v < -5 ? 'Oferta maior que a demanda: os vendedores aceitam receber menos e o preço cai.'
            : 'Equilíbrio entre compra e venda: o preço fica parado, esperando alguém ceder.'}
      </Note>
    </div>
  );
};

// ── Sequência de Fibonacci e a razão áurea ───────────────────────────────
export const FibSeq: React.FC = () => {
  const seq = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];
  const [n, setN] = useState(7);
  const a = seq[n - 1], b = seq[n - 2], c = seq[n - 3] ?? 1;
  return (
    <div className="space-y-2.5">
      <Panel>
        <div className="flex flex-wrap justify-center gap-1.5">
          {seq.slice(0, n).map((x, i) => (
            <span key={i} className={cn('flex h-9 min-w-9 items-center justify-center rounded-lg border px-1.5 font-mono text-sm font-bold tabular-nums',
              i === n - 1 ? 'border-warning/50 bg-warning/15 text-warning-fg' : 'border-tint/10 bg-tint/5 text-fg')}>{x}</span>
          ))}
        </div>
        <p className="mt-2 text-center text-[11px] text-fg-subtle">Cada número é a soma dos dois anteriores</p>
      </Panel>
      <Panel><Slider label="Quantos números" value={n} min={4} max={12} onChange={setN} /></Panel>
      <div className="flex gap-2">
        <Readout label={`${b} ÷ ${a}`} value={(b / a).toFixed(3)} tone="ac" />
        <Readout label={`${c} ÷ ${a}`} value={(c / a).toFixed(3)} tone="ac" />
      </div>
      <Note>Quanto mais avançamos na sequência, mais a razão se aproxima de <b>0,618</b> (e a outra de <b>0,382</b>). São esses números que viram os níveis do Fibonacci no gráfico.</Note>
    </div>
  );
};
