import React, { useEffect, useRef } from 'react';

interface Props {
  children: React.ReactNode;
  className?: string;
}

// Container de rolagem INVERTIDA:
// - ao montar, posiciona no FUNDO (mostra o começo da jornada = Unidade 1)
// - rolar a roda do mouse para BAIXO faz o conteúdo avançar (scrollTop diminui),
//   revelando as unidades seguintes (que estão acima no DOM).
// Mantém suporte a teclado/trackpad via o scroll nativo (só a roda é invertida).
export const InvertedScroll: React.FC<Props> = ({ children, className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);

  // Posiciona no fundo ao montar e mantém lá enquanto o conteúdo cresce
  // (imagens/banners assentando), até o usuário interagir.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let pinned = true; // enquanto o usuário não rolou, gruda no fundo
    const toBottom = () => { if (pinned) el.scrollTop = el.scrollHeight; };
    toBottom();
    const ro = new ResizeObserver(toBottom);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child as Element);
    const release = () => { pinned = false; };
    // qualquer interação solta o "pin"
    el.addEventListener('wheel', release, { passive: true });
    el.addEventListener('touchstart', release, { passive: true });
    el.addEventListener('keydown', release);
    const t = setTimeout(() => { pinned = false; }, 800);
    return () => {
      ro.disconnect();
      el.removeEventListener('wheel', release);
      el.removeEventListener('touchstart', release);
      el.removeEventListener('keydown', release);
      clearTimeout(t);
    };
  }, []);

  // Inverte o gesto da roda do mouse.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      // só intercepta rolagem vertical "de mouse"; deixa zoom (ctrl) passar
      if (e.ctrlKey) return;
      e.preventDefault();
      el.scrollTop -= e.deltaY; // inverte: baixo → conteúdo avança
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div ref={ref} className={`overflow-y-auto ${className}`}>
      {children}
    </div>
  );
};
