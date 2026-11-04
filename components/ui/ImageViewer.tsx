import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, ExternalLink, Maximize2, X, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '../../lib/cn';

interface ImageViewerProps {
  /** Endereços já resolvidos (prontos para <img src>). */
  images: string[];
  /** Índice aberto; null fecha o visualizador. */
  index: number | null;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  /** Texto de acessibilidade/legenda de cada imagem. */
  label?: string;
}

const MIN = 1, MAX = 5;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

// Visualizador de galeria em tela cheia: zoom (roda do mouse, pinça, botões, duplo toque), arrastar para
// mover a imagem ampliada, navegar entre as imagens (setas, teclado, deslize, miniaturas) e Esc para fechar.
export const ImageViewer: React.FC<ImageViewerProps> = ({ images, index, onIndexChange, onClose, label = 'Imagem' }) => {
  const open = index !== null && images.length > 0;
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  // Guarda QUAL imagem terminou de carregar (em vez de um booleano) para não depender da ordem dos efeitos.
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ startDist: 0, startScale: 1, startX: 0, startY: 0, moved: false, lastTap: 0 });

  const i = index ?? 0;
  const count = images.length;
  const go = useCallback((d: number) => { if (count > 1) onIndexChange((i + d + count) % count); }, [i, count, onIndexChange]);

  const limit = useCallback((s: number, p: { x: number; y: number }) => {
    const r = stageRef.current?.getBoundingClientRect();
    if (!r) return p;
    const mx = (r.width * (s - 1)) / 2, my = (r.height * (s - 1)) / 2;
    return { x: clamp(p.x, -mx, mx), y: clamp(p.y, -my, my) };
  }, []);

  const zoomTo = useCallback((s: number) => {
    const ns = clamp(s, MIN, MAX);
    setScale(ns);
    setPos((p) => (ns === 1 ? { x: 0, y: 0 } : limit(ns, p)));
  }, [limit]);

  // Trocou de imagem: volta ao zoom inicial.
  useEffect(() => { setScale(1); setPos({ x: 0, y: 0 }); }, [index]);

  // Teclado, rolagem do fundo travada e vizinhas pré-carregadas.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === '+' || e.key === '=') zoomTo(scale * 1.4);
      else if (e.key === '-') zoomTo(scale / 1.4);
      else if (e.key === '0') zoomTo(1);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    [i + 1, i - 1].forEach((n) => { const src = images[(n + count) % count]; if (src) new Image().src = src; });
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, i, count, images, go, zoomTo, scale, onClose]);

  if (!open) return null;

  const onWheel = (e: React.WheelEvent) => zoomTo(scale * (e.deltaY < 0 ? 1.2 : 1 / 1.2));

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    g.moved = false;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      g.startDist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      g.startScale = scale;
    } else {
      g.startX = e.clientX; g.startY = e.clientY;
      setDragging(true);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const p = pointers.current.get(e.pointerId);
    if (!p) return;
    const g = gesture.current;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      zoomTo(g.startScale * (Math.hypot(a.x - b.x, a.y - b.y) / g.startDist));
      g.moved = true;
    } else if (scale > 1) {
      setPos((cur) => limit(scale, { x: cur.x + dx, y: cur.y + dy }));
      if (Math.abs(e.clientX - g.startX) + Math.abs(e.clientY - g.startY) > 4) g.moved = true;
    } else if (Math.abs(e.clientX - g.startX) > 4) {
      g.moved = true;
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const g = gesture.current;
    const wasSingle = pointers.current.size === 1;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) setDragging(false);
    if (!wasSingle) return;
    const dx = e.clientX - g.startX, dy = e.clientY - g.startY;
    // Imagem sem zoom: deslizar para o lado troca de imagem.
    if (scale === 1 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { go(dx < 0 ? 1 : -1); return; }
    // Duplo toque alterna o zoom.
    if (!g.moved) {
      const now = Date.now();
      if (now - g.lastTap < 300) { zoomTo(scale > 1 ? 1 : 2.5); g.lastTap = 0; } else g.lastTap = now;
    }
  };

  const src = images[i];
  const loaded = loadedSrc === src;
  const btn = 'flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/75 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-30';

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/95" role="dialog" aria-modal="true" aria-label={`${label} ${i + 1} de ${count}`}>
      {/* Barra superior */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
        <span className="font-mono text-sm tabular-nums text-white/80">{i + 1} / {count}</span>
        <div className="flex items-center gap-2">
          <button type="button" className={btn} onClick={() => zoomTo(scale / 1.4)} disabled={scale <= MIN} aria-label="Diminuir zoom"><ZoomOut size={18} /></button>
          <span className="w-12 text-center font-mono text-xs tabular-nums text-white/70">{Math.round(scale * 100)}%</span>
          <button type="button" className={btn} onClick={() => zoomTo(scale * 1.4)} disabled={scale >= MAX} aria-label="Aumentar zoom"><ZoomIn size={18} /></button>
          <button type="button" className={btn} onClick={() => zoomTo(1)} disabled={scale === 1} aria-label="Ajustar à tela"><Maximize2 size={17} /></button>
          <a href={src} target="_blank" rel="noopener noreferrer" className={cn(btn, 'hidden sm:flex')} aria-label="Abrir original em nova aba"><ExternalLink size={17} /></a>
          <button type="button" className={btn} onClick={onClose} aria-label="Fechar"><X size={20} /></button>
        </div>
      </div>

      {/* Palco */}
      <div
        ref={stageRef}
        className={cn('relative min-h-0 flex-1 select-none overflow-hidden', scale > 1 ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in')}
        style={{ touchAction: 'none' }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={(e) => { if (e.pointerType !== 'touch') zoomTo(scale > 1 ? 1 : 2.5); }}
        onClick={(e) => { if (e.target === e.currentTarget && scale === 1) onClose(); }}
      >
        {!loaded && <div className="absolute inset-0 flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" aria-hidden /></div>}
        <img
          key={src}
          src={src}
          alt={`${label} ${i + 1}`}
          draggable={false}
          ref={(el) => { if (el?.complete && el.naturalWidth > 0) setLoadedSrc(src); }}
          onLoad={() => setLoadedSrc(src)}
          className="absolute inset-0 m-auto max-h-full max-w-full object-contain"
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            transition: dragging ? 'none' : 'transform 160ms ease-out',
            opacity: loaded ? 1 : 0,
          }}
        />

        {count > 1 && (
          <>
            <button type="button" className={cn(btn, 'absolute left-3 top-1/2 -translate-y-1/2')} onPointerDown={(e) => e.stopPropagation()} onClick={() => go(-1)} aria-label="Imagem anterior"><ChevronLeft size={22} /></button>
            <button type="button" className={cn(btn, 'absolute right-3 top-1/2 -translate-y-1/2')} onPointerDown={(e) => e.stopPropagation()} onClick={() => go(1)} aria-label="Próxima imagem"><ChevronRight size={22} /></button>
          </>
        )}
      </div>

      {/* Miniaturas */}
      {count > 1 && (
        <div className="flex justify-center gap-2 overflow-x-auto px-4 py-3">
          {images.map((s, n) => (
            <button
              key={`${s}-${n}`}
              type="button"
              onClick={() => onIndexChange(n)}
              aria-label={`Ir para a imagem ${n + 1}`}
              aria-current={n === i}
              className={cn('h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-opacity focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white/70',
                n === i ? 'border-white opacity-100' : 'border-transparent opacity-50 hover:opacity-80')}
            >
              <img src={s} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" draggable={false} />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
};
