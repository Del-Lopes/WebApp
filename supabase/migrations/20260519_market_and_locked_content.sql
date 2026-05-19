-- Migration: Market (loja interna) + travar conteudo na Biblioteca
-- Reusa a tabela public.products (que ja contem cursos type='course' e robos type='ea').
-- Adiciona colunas opcionais; nao remove nem altera dados existentes.

-- ============================================================
-- 1) Trava na Biblioteca (cursos)
-- ============================================================
-- is_locked: quando true, o cliente ve o card mas com cadeado;
--            clique abre modal informativo em vez do player.
-- lock_note: mensagem opcional exibida no modal do cadeado
--            (ex: "Em producao, lancamento em junho").
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_locked  boolean NOT NULL DEFAULT false;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS lock_note  text;

-- ============================================================
-- 2) Campos da nova secao Market
-- ============================================================
-- price_label:    string livre para exibir ("R$ 297", "12x R$ 29", "Gratis")
--                 sem gateway de pagamento por enquanto.
-- is_published:   visivel pro cliente quando true. Admin sempre ve tudo.
-- category:       agrupador opcional ("Cursos", "Robos", "Ebooks"...).
-- sort_order:     ordenacao manual no grid do Market.
-- show_in_market: se true, o produto aparece na secao Market
--                 (cursos com type='course' continuam na Biblioteca por padrao;
--                 marque show_in_market=true se quiser que tambem apareca na loja).
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS price_label     text;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_published    boolean NOT NULL DEFAULT true;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category        text;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sort_order      integer NOT NULL DEFAULT 0;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS show_in_market  boolean NOT NULL DEFAULT false;

-- Indice para listagem do Market (visiveis, ordenados)
CREATE INDEX IF NOT EXISTS products_market_idx
  ON public.products (show_in_market, is_published, sort_order)
  WHERE show_in_market = true;
