-- Diário › vários prints por operação.
-- screenshot_urls guarda todas as imagens (chave do R2 ou URL completa), na ordem de envio.
-- screenshot_url continua existindo e espelha a primeira imagem (compatibilidade).

ALTER TABLE public.trade_journal
  ADD COLUMN IF NOT EXISTS screenshot_urls text[] NOT NULL DEFAULT '{}';

UPDATE public.trade_journal
   SET screenshot_urls = ARRAY[screenshot_url]
 WHERE screenshot_url IS NOT NULL
   AND cardinality(screenshot_urls) = 0;
