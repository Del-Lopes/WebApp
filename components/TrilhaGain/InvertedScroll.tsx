import React, { useEffect, useRef, useState } from 'react';

interface Props {
  banner: React.ReactNode;   // fica FIXO no topo (não rola)
  children: React.ReactNode; // conteúdo rolável (em ordem natural)
}

// Layout: banner fixo no topo + área de rolagem REVERSA abaixo.
// Técnica scaleY(-1): o container rola normal (barra começa no topo e desce),
// mas o eixo visual é invertido — o conteúdo aparece de baixo p/ cima e, ao
// rolar p/ baixo, a aula 1 sai por baixo enquanto a 2 entra de cima (atrás
// do banner). O conteúdo interno leva outro scaleY(-1) para ficar legível.
export const InvertedScroll: React.FC<Props> = ({ banner, children }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>(0);

  // Altura disponível = do topo do componente até a base da janela.
  useEffect(() => {
    const calc = () => {
      const el = rootRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      setHeight(Math.max(240, window.innerHeight - top - 8));
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  return (
    <div ref={rootRef} className="flex flex-col" style={{ height }}>
      {/* Banner fixo no topo */}
      <div className="shrink-0 z-20">{banner}</div>

      {/* Área de rolagem reversa (barra normal, eixo invertido) */}
      <div className="ds-scrollbar flex-1 overflow-y-auto min-h-0" style={{ transform: 'scaleY(-1)' }}>
        <div style={{ transform: 'scaleY(-1)' }}>
          {children}
        </div>
      </div>
    </div>
  );
};
