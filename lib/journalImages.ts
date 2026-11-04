import { imageUrl } from './forumImages';

// Cada print guarda uma chave do R2 (novo storage) ou uma URL completa (uploads antigos).
export const journalImageSrc = (value: string): string => (/^https?:\/\//.test(value) ? value : imageUrl(value));

/** Máximo de prints por operação. */
export const MAX_JOURNAL_SCREENSHOTS = 6;

/** Todos os prints da operação; cai no campo antigo para linhas anteriores à migração. */
export const entryScreenshots = (e: { screenshot_url: string | null; screenshot_urls?: string[] | null }): string[] =>
  e.screenshot_urls && e.screenshot_urls.length > 0 ? e.screenshot_urls : e.screenshot_url ? [e.screenshot_url] : [];
