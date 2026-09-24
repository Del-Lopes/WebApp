// Formatadores compartilhados da sessão Crypto.

export function fmtUsd(v: number | null): string {
  if (v == null) return '—';
  const abs = Math.abs(v);
  const digits = abs >= 1000 ? 0 : abs >= 1 ? 2 : abs >= 0.01 ? 4 : 8;
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits });
}

// Valores grandes (market cap, volume) → 1.2B, 340M, 5.6K.
export function fmtCompact(v: number | null): string {
  if (v == null || v === 0) return '—';
  const abs = Math.abs(v);
  if (abs >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

export function fmtPct(v: number | null): string {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
}

// Classe de cor conforme sinal (verde alta, vermelho baixa).
export function pctColor(v: number | null): string {
  if (v == null) return 'text-fg-subtle';
  return v >= 0 ? 'text-success-fg' : 'text-danger-fg';
}
