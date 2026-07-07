import React, { useEffect, useRef } from 'react';

// Widget de gráfico interativo do TradingView (Advanced Chart).
// Carrega o script embed de terceiro (s3.tradingview.com) e monta o gráfico
// do símbolo/intervalo informados. Sem custo, atualiza ao vivo.

interface Props {
  symbol: string;    // formato TradingView, ex.: 'OANDA:XAUUSD'
  interval: string;  // formato TradingView, ex.: '15', '60', 'D'
  height?: number;
}

export const TradingViewChart: React.FC<Props> = ({ symbol, interval, height = 320 }) => {
  const containerRef = useRef<HTMLDivElement>(null);

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
      theme: 'light',
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
      backgroundColor: 'rgba(255, 255, 255, 1)',
      support_host: 'https://www.tradingview.com',
    });
    container.appendChild(script);

    return () => { container.innerHTML = ''; };
  }, [symbol, interval, height]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container rounded-xl overflow-hidden ring-1 ring-slate-100"
      style={{ height }}
    />
  );
};
