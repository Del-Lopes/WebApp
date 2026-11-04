// Monta o tópico do Fórum a partir de uma operação do Diário. Só apresentação: nada aqui consulta ou grava no banco.

import type { TradeEntry } from '../hooks/useTradeJournal';
import { FORUM_TEXT_MAX, forumImagesEnabled, isForumImageKey, joinBody, MAX_IMAGES_PER_POST } from './forumImages';
import { entryScreenshots } from './journalImages';
import { formatMoney } from './journalCalendar';

export interface TradeTopicOptions {
  /** Mensagem do trader para abrir a conversa (o que quer discutir). */
  message: string;
  /** Mostra resultado em dinheiro e preços. */
  values: boolean;
  /** Mostra motivo de entrada/saída, análise e conclusão. */
  reflection: boolean;
  /** Mostra os estados emocionais e a avaliação. */
  emotional: boolean;
  /** Anexa os prints do trade (só os que estão no armazenamento do Fórum). */
  images: boolean;
}

export const defaultTopicTitle = (e: TradeEntry): string =>
  `Análise de operação em ${e.asset} (${e.side === 'buy' ? 'compra' : 'venda'})`;

/** Prints do trade que podem ir para o Fórum (chaves do R2); os antigos, de outro armazenamento, ficam de fora. */
export function forumEligibleShots(e: TradeEntry): { keys: string[]; skipped: number } {
  const all = entryScreenshots(e);
  if (!forumImagesEnabled) return { keys: [], skipped: all.length };
  const keys = all.filter(isForumImageKey).slice(0, MAX_IMAGES_PER_POST);
  return { keys, skipped: all.length - keys.length };
}

const when = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

export function buildTradeTopicBody(e: TradeEntry, o: TradeTopicOptions): string {
  const lines: string[] = [];
  if (o.message.trim()) lines.push(o.message.trim(), '');

  lines.push(`📊 ${e.asset} · ${e.side === 'buy' ? 'Compra' : 'Venda'} · ${e.volume} lote${e.volume !== 1 ? 's' : ''}`);
  lines.push(`📅 ${when(e.closed_at ?? e.opened_at)}${e.closed_at ? '' : ' (em aberto)'}`);
  if (o.values) {
    if (e.result_amount != null && e.closed_at) lines.push(`💰 Resultado: ${formatMoney(Number(e.result_amount))}`);
    if (e.entry_price != null && e.exit_price != null) lines.push(`🎯 Entrada → Saída: ${e.entry_price} → ${e.exit_price}`);
  }
  if (e.result_pips != null) lines.push(`📏 Pips/pontos: ${Number(e.result_pips) > 0 ? '+' : ''}${Number(e.result_pips).toFixed(1)}`);

  const block = (label: string, text: string | null) => { if (text?.trim()) lines.push('', `${label}:`, text.trim()); };
  if (o.reflection) {
    block('Motivo da entrada', e.entry_reason);
    block('Motivo da saída', e.exit_reason);
    block('Análise', e.analysis);
    block('Conclusão / aprendizado', e.conclusion);
  }
  if (o.emotional) {
    if (e.emotional_tags?.length) lines.push('', `Como me senti: ${e.emotional_tags.join(', ')}`);
    block('Sobre o emocional', e.emotional_note);
    if (e.rating != null) lines.push(`Minha nota para a operação: ${'★'.repeat(e.rating)}${'☆'.repeat(5 - e.rating)}`);
  }

  let text = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (text.length > FORUM_TEXT_MAX) text = `${text.slice(0, FORUM_TEXT_MAX - 1).replace(/\s+\S*$/, '')}…`;
  return joinBody(text, o.images ? forumEligibleShots(e).keys : []);
}
