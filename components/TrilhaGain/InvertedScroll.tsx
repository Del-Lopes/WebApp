import React, { useEffect, useRef } from 'react';

interface Props {
  children: React.ReactNode;
  className?: string;
}

// Sobe na árvore até achar o ancestral cujo overflow-y é scroll/auto
// (não exige que já tenha overflow agora — o conteúdo pode crescer depois).
function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node) {
    const oy = getComputedStyle(node).overflowY;
    if (oy === 'auto' || oy === 'scroll') return node;
    node = node.parentElement;
  }
  return null;
}

// Rolagem INVERTIDA aplicada ao container de scroll do App (ancestral):
// - ao montar, posiciona no FUNDO (mostra o começo da jornada = Unidade 1)
// - rolar a roda do mouse para BAIXO faz a trilha avançar (revela o que está acima)
// Não cria um scroll próprio — evita scroll duplo e problemas de altura.
export const InvertedScroll: React.FC<Props> = ({ children, className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = findScrollParent(ref.current);
    if (!scroller) return;

    let pinned = true; // gruda no fundo até o conteúdo assentar / usuário interagir
    const toBottom = () => { if (pinned) scroller.scrollTop = scroller.scrollHeight; };
    toBottom();

    const ro = new ResizeObserver(toBottom);
    ro.observe(scroller);
    if (ref.current) ro.observe(ref.current);

    const release = () => { pinned = false; };
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;          // deixa zoom passar
      pinned = false;
      e.preventDefault();
      scroller.scrollTop -= e.deltaY; // inverte: baixo → avança
    };

    scroller.addEventListener('wheel', onWheel, { passive: false });
    scroller.addEventListener('touchstart', release, { passive: true });
    scroller.addEventListener('keydown', release);
    const t = setTimeout(() => { pinned = false; }, 800);

    return () => {
      ro.disconnect();
      scroller.removeEventListener('wheel', onWheel);
      scroller.removeEventListener('touchstart', release);
      scroller.removeEventListener('keydown', release);
      clearTimeout(t);
    };
  }, []);

  return <div ref={ref} className={className}>{children}</div>;
};
