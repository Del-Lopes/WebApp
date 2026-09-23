-- ============================================================
-- Calendário Econômico — troca de fonte: Investing.com → TradingView.
--
-- O Cloudflare do Investing bloqueia IPs de datacenter (a edge do Supabase
-- recebe 403 sempre). O calendário do TradingView responde de datacenter e traz
-- atual/projeção/anterior, mas:
--   - não tem id estável por INDICADOR, só por divulgação → a chave do
--     indicador passa a ser texto (país + título normalizado);
--   - a importância dele é mais rígida que as estrelas do Investing (IPCA-15,
--     CAGED e IGP-M vêm como "baixa") → importância passa a ser nossa:
--     a do TradingView + a lista econ_key_indicator abaixo;
--   - não classifica o dado como bom/ruim para a moeda → sai a coluna de
--     polaridade; a cor do "atual" vem do cenário da interpretação.
--
-- As duas tabelas de dados são RECRIADAS: nenhuma coleta pelo Investing chegou
-- a gravar em produção (todas deram 403), então não há dado a preservar.
-- econ_calendar_sync e econ_calendar_claim_sync continuam como estão.
--
-- Rodar via SQL Editor ou db push, UMA vez. ⚠️ Não rode de novo depois que a
-- coleta começar: o drop apaga as divulgações e as interpretações já geradas
-- (as divulgações voltam no próximo sync; as interpretações custam IA de novo).
-- ============================================================

drop table if exists public.econ_calendar_event;
drop table if exists public.econ_event_profile;

-- ─── Perfil do indicador (descrição + interpretação IA) ─────────────────────

create table public.econ_event_profile (
  -- país + título normalizado, ex.: 'US:Non Farm Payrolls', 'BR:IPCA mid-month CPI YoY'
  event_key       text primary key,
  country         text not null,
  currency        text not null,
  title           text not null,          -- título original (inglês), sem sufixo de versão
  title_pt        text,                    -- título em português, vem da interpretação
  category        text,
  event_type      text,                    -- 'speech' | 'report' | null (dado numérico)
  importance      smallint not null,       -- 2 ou 3 estrelas
  description     text,
  source          text,
  source_url      text,
  interpretation  jsonb,
  interpreted_at  timestamptz,
  interpret_error text,
  updated_at      timestamptz not null default now()
);

-- ─── Divulgações ────────────────────────────────────────────────────────────

create table public.econ_calendar_event (
  occurrence_id    text primary key,       -- id da divulgação no TradingView
  event_key        text not null references public.econ_event_profile(event_key) on delete cascade,
  occurs_at        timestamptz not null,
  country          text not null,
  currency         text not null,
  title            text not null,          -- título original da divulgação (com sufixo)
  variant          text,                   -- 'Prévia' | 'Preliminar' | 'Final' | ...
  importance       smallint not null,
  unit             text,                   -- '%', 'K', 'M', 'B'...
  precision        smallint,
  reference_period text,
  actual           numeric,
  forecast         numeric,
  previous         numeric,
  updated_at       timestamptz not null default now()
);

create index econ_calendar_event_time_idx
  on public.econ_calendar_event (occurs_at);

create index econ_calendar_event_history_idx
  on public.econ_calendar_event (event_key, occurs_at desc);

-- ─── Indicadores-chave (nossa régua de importância) ─────────────────────────
--
-- Promove indicadores que o TradingView classifica abaixo do que o trader
-- brasileiro considera relevante. O padrão usa sintaxe LIKE (% = qualquer
-- coisa) e é comparado, sem diferenciar maiúsculas, com o título normalizado
-- (sem "Prel", "Final", "Flash"...). Vale a MAIOR importância entre esta lista e
-- a do TradingView (alta → 3, média → 2; baixa só entra se estiver aqui).
--
-- Editável pelo SQL Editor; a próxima coleta já aplica.

create table if not exists public.econ_key_indicator (
  id          serial primary key,
  country     text not null,
  pattern     text not null,
  importance  smallint not null check (importance in (2, 3)),
  note        text,
  unique (country, pattern)
);

alter table public.econ_key_indicator enable row level security;
-- Sem policy: só a edge function (service_role) lê.

insert into public.econ_key_indicator (country, pattern, importance, note) values
  -- Estados Unidos
  ('US', 'Non Farm Payrolls',              3, 'Payroll'),
  ('US', 'Unemployment Rate',              3, null),
  ('US', 'Inflation Rate%',                3, 'CPI'),
  ('US', 'Core Inflation Rate%',           3, 'CPI núcleo'),
  ('US', 'Fed Interest Rate Decision',     3, 'FOMC'),
  ('US', 'FOMC%',                          3, 'Ata / coletiva do FOMC'),
  ('US', 'Fed Chair%',                     3, 'Powell / presidente do Fed'),
  ('US', 'GDP Growth Rate%',               3, 'PIB'),
  ('US', 'Retail Sales%',                  3, 'Varejo'),
  ('US', 'Core PCE Price Index%',          3, 'PCE núcleo'),
  ('US', 'PCE Price Index%',               3, 'PCE'),
  ('US', 'ISM Manufacturing PMI',          3, null),
  ('US', 'ISM Services PMI',               3, null),
  ('US', 'JOLTs Job Openings',             3, null),
  ('US', 'Initial Jobless Claims',         2, null),
  ('US', 'ADP Employment Change',          2, null),
  ('US', 'PPI%',                           2, null),
  ('US', 'Core PPI%',                      2, null),
  ('US', 'Michigan Consumer Sentiment',    2, null),
  ('US', 'CB Consumer Confidence',         2, null),
  ('US', 'Durable Goods Orders%',          2, null),
  ('US', 'EIA Crude Oil Stocks Change',    2, null),
  -- Brasil
  ('BR', 'Inflation Rate%',                3, 'IPCA'),
  ('BR', 'IPCA mid-month CPI%',            3, 'IPCA-15'),
  ('BR', '%Interest Rate Decision',        3, 'Selic / Copom'),
  ('BR', 'BCB Copom Meeting Minutes',      3, 'Ata do Copom'),
  ('BR', 'Net Payrolls',                   3, 'CAGED'),
  ('BR', 'GDP Growth Rate%',               3, 'PIB'),
  ('BR', 'IGP-M Inflation%',               2, null),
  ('BR', 'Unemployment Rate',              2, 'PNAD'),
  ('BR', 'Retail Sales%',                  2, null),
  ('BR', 'IBC-BR%',                        2, 'Prévia do PIB'),
  ('BR', 'Industrial Production%',         2, null),
  ('BR', 'BCB Focus Market Readout',       2, 'Boletim Focus'),
  ('BR', 'Current Account',                2, null),
  ('BR', '%Inflation Report%',             2, 'Relatório de Inflação'),
  ('BR', 'BCB National Monetary Council%', 2, 'CMN'),
  -- Zona do Euro e Alemanha
  ('EU', '%Interest Rate Decision',        3, 'BCE'),
  ('EU', '%Deposit Facility Rate',         3, 'BCE'),
  ('EU', 'ECB Press Conference',           3, null),
  ('EU', 'ECB President%',                 2, 'Lagarde'),
  ('EU', 'Inflation Rate%',                3, 'CPI'),
  ('EU', 'Core Inflation Rate%',           3, null),
  ('EU', 'GDP Growth Rate%',               2, null),
  ('EU', 'HCOB%PMI%',                      2, null),
  ('DE', 'Ifo Business Climate',           2, null),
  ('DE', 'ZEW Economic Sentiment%',        2, null),
  ('DE', 'Inflation Rate%',                2, null),
  ('DE', 'HCOB%PMI%',                      2, null),
  -- Reino Unido
  ('GB', '%Interest Rate Decision',        3, 'BoE'),
  ('GB', 'Inflation Rate%',                3, null),
  ('GB', 'GDP%',                           2, null),
  ('GB', 'Unemployment Rate',              2, null),
  ('GB', 'Retail Sales%',                  2, null),
  -- Japão
  ('JP', '%Interest Rate Decision',        3, 'BoJ'),
  ('JP', 'Inflation Rate%',                2, null),
  ('JP', 'GDP%',                           2, null),
  ('JP', 'Tankan%',                        2, null),
  -- China
  ('CN', 'GDP Growth Rate%',               3, null),
  ('CN', 'Inflation Rate%',                2, null),
  ('CN', 'NBS Manufacturing PMI',          2, null),
  ('CN', 'Industrial Production%',         2, null),
  ('CN', 'Retail Sales%',                  2, null),
  ('CN', 'Balance of Trade',               2, null),
  ('CN', 'Loan Prime Rate%',               2, null),
  -- Outros bancos centrais e dados de moedas principais
  ('CA', '%Interest Rate Decision',        3, 'BoC'),
  ('CA', 'Inflation Rate%',                2, null),
  ('CA', 'Unemployment Rate',              2, null),
  ('CA', 'Employment Change',              2, null),
  ('AU', '%Interest Rate Decision',        3, 'RBA'),
  ('AU', 'Employment Change',              2, null),
  ('AU', 'Unemployment Rate',              2, null),
  ('AU', 'Inflation Rate%',                2, null),
  ('CH', '%Interest Rate Decision',        3, 'SNB'),
  ('NZ', '%Interest Rate Decision',        3, 'RBNZ'),
  ('MX', '%Interest Rate Decision',        2, 'Banxico')
on conflict (country, pattern) do nothing;

-- ─── RLS: leitura para autenticado, escrita só service_role ─────────────────

alter table public.econ_event_profile  enable row level security;
alter table public.econ_calendar_event enable row level security;

drop policy if exists "econ_event_profile_read" on public.econ_event_profile;
create policy "econ_event_profile_read" on public.econ_event_profile
  for select to authenticated using (true);

drop policy if exists "econ_calendar_event_read" on public.econ_calendar_event;
create policy "econ_calendar_event_read" on public.econ_calendar_event
  for select to authenticated using (true);

-- Zera o status de erro herdado das tentativas no Investing.
update public.econ_calendar_sync set last_error = null where id = 1;
