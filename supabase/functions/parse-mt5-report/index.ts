// Supabase Edge Function — parse-mt5-report
// Parseia um relatório HTML do MetaTrader 5 (pt-BR, UTF-16 LE) e popula
// as tabelas mt5_reports e mt5_trades.
// Deno runtime — fetch() only, no Node SDKs

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ParseRequest {
  report_id: string
}

interface Trade {
  position_id: string | null
  symbol: string
  side: 'buy' | 'sell'
  volume: number
  open_time: string
  open_price: number
  stop_loss: number | null
  take_profit: number | null
  close_time: string | null
  close_price: number | null
  commission: number | null
  swap: number | null
  profit: number
}

interface Metrics {
  account_number: string | null
  account_name: string | null
  broker: string | null
  currency: string | null
  account_type: string | null
  report_date: string | null

  net_profit: number | null
  gross_profit: number | null
  gross_loss: number | null
  profit_factor: number | null
  expected_payoff: number | null
  recovery_factor: number | null
  sharpe_ratio: number | null
  absolute_drawdown: number | null
  max_drawdown: number | null
  max_drawdown_percent: number | null
  relative_drawdown_percent: number | null
  total_trades: number | null
  short_trades: number | null
  short_trades_won_percent: number | null
  long_trades: number | null
  long_trades_won_percent: number | null
  profit_trades: number | null
  profit_trades_percent: number | null
  loss_trades: number | null
  loss_trades_percent: number | null
  largest_profit: number | null
  largest_loss: number | null
  average_profit: number | null
  average_loss: number | null
}

// ─── Decodificação ────────────────────────────────────────────────────────────

function decodeHtml(bytes: Uint8Array): string {
  // Detecta BOM UTF-16 LE (FF FE) ou UTF-16 BE (FE FF). Caso contrário assume UTF-8.
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(bytes.subarray(2))
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(bytes.subarray(2))
  }
  return new TextDecoder('utf-8').decode(bytes)
}

// ─── Helpers de parsing ───────────────────────────────────────────────────────

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim()
}

function parseNumber(text: string | null | undefined): number | null {
  if (!text) return null
  // Remove espaços (incl. non-breaking) e símbolos não numéricos exceto . , - +
  const cleaned = text.replace(/[\s ]/g, '').replace(/[^\d.,\-+]/g, '')
  if (!cleaned) return null
  // O MT5 em pt-BR usa "." como milhar quando há, mas no nosso relatório real
  // os números vêm sem separador de milhar nas métricas. Vamos remover vírgulas
  // (que aparecem em alguns números longos) tratando como separador de milhar.
  // Se houver vírgula E ponto, vírgula é milhar. Se só vírgula, vírgula é decimal.
  let normalized = cleaned
  const hasDot = normalized.includes('.')
  const hasComma = normalized.includes(',')
  if (hasDot && hasComma) {
    normalized = normalized.replace(/,/g, '')
  } else if (hasComma && !hasDot) {
    normalized = normalized.replace(',', '.')
  }
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

function parseInt0(text: string | null | undefined): number | null {
  const n = parseNumber(text)
  if (n === null) return null
  return Math.trunc(n)
}

function parseDateTime(text: string | null | undefined): string | null {
  if (!text) return null
  // Formato MT5 pt-BR: "2026.04.17 01:30:00" ou "2026.04.17 01:30"
  const m = text.trim().match(/(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?/)
  if (!m) return null
  const [, y, mo, d, h, mi, s] = m
  return `${y}-${mo}-${d}T${h}:${mi}:${s ?? '00'}Z`
}

/** Extrai o valor de uma linha que contém o label seguido de <b>valor</b>. */
function findMetric(html: string, label: string): string | null {
  // Escapa caracteres regex no label
  const safe = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // Procura o label seguido de </td>, depois <td...><b>VALOR</b></td>
  const re = new RegExp(`${safe}\\s*<\\/td>\\s*<td[^>]*><b>([^<]*)<\\/b>`, 'i')
  const m = html.match(re)
  return m ? m[1].trim() : null
}

/** "33.33 (0.32%)" → { value: 33.33, percent: 0.32 } */
function splitValueAndPercent(text: string | null): { value: number | null; percent: number | null } {
  if (!text) return { value: null, percent: null }
  const m = text.match(/^([^()]+?)\s*\(([^)]+)\)\s*$/)
  if (!m) return { value: parseNumber(text), percent: null }
  return {
    value: parseNumber(m[1]),
    percent: parseNumber(m[2].replace('%', '')),
  }
}

/** "1296 (87.33%)" → { count: 1296, percent: 87.33 } */
function splitCountAndPercent(text: string | null): { count: number | null; percent: number | null } {
  if (!text) return { count: null, percent: null }
  const m = text.match(/^(\d[\d\s.,]*)\s*\(([^)]+)\)\s*$/)
  if (!m) return { count: parseInt0(text), percent: null }
  return {
    count: parseInt0(m[1]),
    percent: parseNumber(m[2].replace('%', '')),
  }
}

// ─── Parser do cabeçalho ──────────────────────────────────────────────────────

function parseHeader(html: string): Partial<Metrics> {
  const result: Partial<Metrics> = {}

  // Nome
  const nameMatch = html.match(/Nome:\s*<\/th>\s*<th[^>]*><b>([^<]+)<\/b>/i)
  if (nameMatch) result.account_name = nameMatch[1].trim()

  // Conta — formato: "25026179 (USD, VantageInternational-Demo, demo, Hedge)"
  const accountMatch = html.match(/Conta:\s*<\/th>\s*<th[^>]*><b>([^<]+)<\/b>/i)
  if (accountMatch) {
    const raw = accountMatch[1].replace(/&nbsp;/g, ' ').trim()
    const m = raw.match(/^(\d+)\s*\(([^,)]+)(?:,\s*([^,)]+))?(?:,\s*([^,)]+))?(?:,\s*([^)]+))?\)/)
    if (m) {
      result.account_number = m[1].trim()
      result.currency = m[2]?.trim() ?? null
      // m[3] = broker server, m[4] = demo/real, m[5] = tipo (Hedge/Netting)
      if (m[4]) result.account_type = m[4].trim().toLowerCase().includes('real') ? 'real' : 'demo'
    } else {
      result.account_number = raw
    }
  }

  // Empresa (broker)
  const brokerMatch = html.match(/Empresa:\s*<\/th>\s*<th[^>]*><b>([^<]+)<\/b>/i)
  if (brokerMatch) result.broker = brokerMatch[1].trim()

  // Data do relatório
  const dateMatch = html.match(/Data:\s*<\/th>\s*<th[^>]*><b>([^<]+)<\/b>/i)
  if (dateMatch) result.report_date = parseDateTime(dateMatch[1])

  return result
}

// ─── Parser de métricas ───────────────────────────────────────────────────────

function parseMetrics(html: string): Partial<Metrics> {
  const m: Partial<Metrics> = {}

  m.net_profit = parseNumber(findMetric(html, 'Lucro Líquido Total:'))
  m.gross_profit = parseNumber(findMetric(html, 'Lucro Bruto:'))
  m.gross_loss = parseNumber(findMetric(html, 'Perda Bruta:'))
  m.profit_factor = parseNumber(findMetric(html, 'Fator de Lucro:'))
  m.expected_payoff = parseNumber(findMetric(html, 'Retorno Esperado \\(Payoff\\):'))
  m.recovery_factor = parseNumber(findMetric(html, 'Fator de Recuperação:'))
  m.sharpe_ratio = parseNumber(findMetric(html, 'Índice de Sharpe:'))

  m.absolute_drawdown = parseNumber(findMetric(html, 'Rebaixamento Absoluto do Saldo :'))

  const maxDD = findMetric(html, 'Rebaixamento Máximo do Saldo :')
  const maxDDParsed = splitValueAndPercent(maxDD)
  m.max_drawdown = maxDDParsed.value
  m.max_drawdown_percent = maxDDParsed.percent

  const relDD = findMetric(html, 'Rebaixamento Relativo do Saldo :')
  const relDDParsed = splitValueAndPercent(relDD)
  // Relativo vem como "0.32% (33.33)" — o primeiro é o percent
  m.relative_drawdown_percent = relDDParsed.value !== null && relDD?.includes('%')
    ? relDDParsed.value
    : relDDParsed.percent

  m.total_trades = parseInt0(findMetric(html, 'Total de Negociações:'))

  const shortT = splitCountAndPercent(findMetric(html, 'Posições Vendidas \\(% e ganhos\\):'))
  m.short_trades = shortT.count
  m.short_trades_won_percent = shortT.percent

  const longT = splitCountAndPercent(findMetric(html, 'Posições Compradas \\(% de ganhos\\):'))
  m.long_trades = longT.count
  m.long_trades_won_percent = longT.percent

  const profitT = splitCountAndPercent(findMetric(html, 'Negociações com Lucro \\(% of total\\):'))
  m.profit_trades = profitT.count
  m.profit_trades_percent = profitT.percent

  const lossT = splitCountAndPercent(findMetric(html, 'Negociações com Perda \\(% of total\\):'))
  m.loss_trades = lossT.count
  m.loss_trades_percent = lossT.percent

  m.largest_profit = parseNumber(findMetric(html, 'Maior lucro da negociação:'))
  m.largest_loss = parseNumber(findMetric(html, 'Maior perda na Negociação:'))
  m.average_profit = parseNumber(findMetric(html, 'Média lucro da negociação:'))
  m.average_loss = parseNumber(findMetric(html, 'Média perda na Negociação:'))

  return m
}

// ─── Parser de trades (seção Posições) ────────────────────────────────────────

function parseTrades(html: string): Trade[] {
  // Recorta a seção "Posições" até o início de "Ordens" ou "Posições Abertas"
  const start = html.search(/<b>Posições<\/b>/i)
  if (start === -1) return []
  const afterPositions = html.slice(start)
  const endRel = afterPositions.search(/<b>(Ordens|Posições Abertas|Resultados)<\/b>/i)
  const section = endRel === -1 ? afterPositions : afterPositions.slice(0, endRel)

  const trades: Trade[] = []
  // Regex de linha de trade: captura todas as <tr> com 14 colunas visíveis +
  // 1 coluna oculta (class="hidden") que contém o comentário com "Magic:".
  // Estrutura observada (linhas 80-95 do relatório):
  //   <td>open_time</td>
  //   <td>position_id</td>
  //   <td>symbol</td>
  //   <td>side</td>
  //   <td class="hidden" colspan="8">comentário</td>
  //   <td>volume</td>
  //   <td>open_price</td>
  //   <td>stop_loss</td>
  //   <td>take_profit</td>
  //   <td>close_time</td>
  //   <td>close_price</td>
  //   <td>commission</td>
  //   <td>swap</td>
  //   <td colspan="2">profit</td>
  const rowRe = /<tr\b[^>]*>\s*<td[^>]*>([^<]*)<\/td>\s*<td[^>]*>([^<]*)<\/td>\s*<td[^>]*>([^<]*)<\/td>\s*<td[^>]*>(buy|sell)<\/td>\s*<td[^>]*class="hidden"[^>]*>[^<]*<\/td>\s*<td[^>]*>([^<]*)<\/td>\s*<td[^>]*>([^<]*)<\/td>\s*<td[^>]*>([^<]*)<\/td>\s*<td[^>]*>([^<]*)<\/td>\s*<td[^>]*>([^<]*)<\/td>\s*<td[^>]*>([^<]*)<\/td>\s*<td[^>]*>([^<]*)<\/td>\s*<td[^>]*>([^<]*)<\/td>\s*<td[^>]*colspan="2"[^>]*>([^<]*)<\/td>\s*<\/tr>/gi

  let match
  while ((match = rowRe.exec(section)) !== null) {
    const [, openTime, posId, symbol, side, volume, openPrice, sl, tp, closeTime, closePrice, commission, swap, profit] = match
    const openTimeIso = parseDateTime(openTime)
    const openPriceN = parseNumber(openPrice)
    const profitN = parseNumber(profit)
    if (!openTimeIso || openPriceN === null || profitN === null) continue

    trades.push({
      position_id: posId.trim() || null,
      symbol: symbol.trim(),
      side: side.trim() as 'buy' | 'sell',
      volume: parseNumber(volume) ?? 0,
      open_time: openTimeIso,
      open_price: openPriceN,
      stop_loss: parseNumber(sl),
      take_profit: parseNumber(tp),
      close_time: parseDateTime(closeTime),
      close_price: parseNumber(closePrice),
      commission: parseNumber(commission),
      swap: parseNumber(swap),
      profit: profitN,
    })
  }

  return trades
}

// ─── Handler ──────────────────────────────────────────────────────────────────

async function markFailed(reportId: string, message: string) {
  await supabaseAdmin
    .from('mt5_reports')
    .update({ status: 'failed', error_message: message })
    .eq('id', reportId)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = (await req.json()) as ParseRequest
    if (!body?.report_id) {
      return new Response(JSON.stringify({ error: 'report_id obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Busca o report
    const { data: report, error: reportErr } = await supabaseAdmin
      .from('mt5_reports')
      .select('id, user_id, storage_path, status')
      .eq('id', body.report_id)
      .single()
    if (reportErr || !report) {
      return new Response(JSON.stringify({ error: 'Relatório não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Baixa o arquivo do Storage
    const { data: fileBlob, error: dlErr } = await supabaseAdmin.storage
      .from('mt5-reports')
      .download(report.storage_path)
    if (dlErr || !fileBlob) {
      await markFailed(report.id, 'Falha ao baixar arquivo do Storage')
      return new Response(JSON.stringify({ error: 'Falha ao baixar arquivo' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const buffer = new Uint8Array(await fileBlob.arrayBuffer())
    const html = decodeHtml(buffer)

    // Parse
    const header = parseHeader(html)
    const metrics = parseMetrics(html)
    const trades = parseTrades(html)

    // Update do report
    const { error: updErr } = await supabaseAdmin
      .from('mt5_reports')
      .update({
        ...header,
        ...metrics,
        status: 'ready',
        error_message: null,
      })
      .eq('id', report.id)
    if (updErr) {
      await markFailed(report.id, `Falha ao salvar métricas: ${updErr.message}`)
      return new Response(JSON.stringify({ error: 'Falha ao salvar métricas' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Insert dos trades em lote (chunked por 500 para evitar payload gigante)
    if (trades.length > 0) {
      // Remove trades existentes (idempotência se reprocessar)
      await supabaseAdmin.from('mt5_trades').delete().eq('report_id', report.id)

      const chunkSize = 500
      for (let i = 0; i < trades.length; i += chunkSize) {
        const chunk = trades.slice(i, i + chunkSize).map((t) => ({
          report_id: report.id,
          user_id: report.user_id,
          ...t,
        }))
        const { error: insErr } = await supabaseAdmin.from('mt5_trades').insert(chunk)
        if (insErr) {
          await markFailed(report.id, `Falha ao inserir trades: ${insErr.message}`)
          return new Response(JSON.stringify({ error: 'Falha ao inserir trades' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        report_id: report.id,
        trades_count: trades.length,
        metrics_extracted: Object.values(metrics).filter((v) => v !== null).length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'Erro inesperado', message: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
