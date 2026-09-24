import React, { useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

// Widget de gráfico interativo do TradingView (Advanced Chart).
// Carrega o script embed de terceiro (s3.tradingview.com) e monta o gráfico
// do símbolo/intervalo informados. Sem custo, atualiza ao vivo.
// Segue o tema do app: fundo e grade iguais à superfície dos cards.

const WIDGET_COLORS = {
  dark: { backgroundColor: 'rgba(17, 17, 17, 1)', gridColor: 'rgba(255, 255, 255, 0.04)' },
  light: { backgroundColor: 'rgba(255, 255, 255, 1)', gridColor: 'rgba(0, 0, 0, 0.05)' },
} as const;

interface Props {
  symbol: string;    // formato TradingView, ex.: 'OANDA:XAUUSD'
  interval: string;  // formato TradingView, ex.: '15', '60', 'D'
  height?: number;
}

export const TradingViewChart: React.FC<Props> = ({ symbol, interval, height = 320 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Limpa render anterior (troca de símbolo/intervalo).
    container.innerHTML = '';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = `${height}px`;
    widgetDiv.style.width = '100%';
    container.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval,
      timezone: 'America/Sao_Paulo',
      theme,
      style: '1',                    // candles
      locale: 'br',
      // Visual limpo: só os candles, sem toolbars/legenda/barras.
      hide_top_toolbar: true,
      hide_side_toolbar: true,
      hide_legend: true,
      hide_volume: true,
      withdateranges: false,
      allow_symbol_change: false,
      save_image: false,
      calendar: false,
      details: false,
      ...WIDGET_COLORS[theme],
      support_host: 'https://www.tradingview.com',
    });
    container.appendChild(script);

    return () => { container.innerHTML = ''; };
  }, [symbol, interval, height, theme]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container rounded-xl overflow-hidden border border-tint/8 bg-surface"
      style={{ height }}
    />
  );
};
