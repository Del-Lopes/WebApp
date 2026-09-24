import { useEffect, useState } from 'react';

// Relógio para textos relativos ("há 5s", contagem regressiva). Fica no
// componente folha que mostra o texto, não na página, para o tick não
// re-renderizar a tela inteira. Pausa com a aba oculta e, ao voltar, atualiza
// na hora. enabled=false desliga o timer (ex.: cooldown já expirado).
export function useNow(intervalMs: number, enabled = true): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return;
    let id: number | undefined;
    const start = () => {
      if (id === undefined) id = window.setInterval(() => setNow(Date.now()), intervalMs);
    };
    const stop = () => {
      if (id !== undefined) {
        window.clearInterval(id);
        id = undefined;
      }
    };
    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        setNow(Date.now());
        start();
      }
    };

    setNow(Date.now());
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs, enabled]);

  return now;
}
