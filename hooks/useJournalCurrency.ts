import { useSyncExternalStore } from 'react';
import { JournalCurrency, getJournalCurrency, setJournalCurrency, subscribeJournalCurrency } from '../lib/journalCalendar';

/** Moeda de exibição do Diário (R$ ou US$), lembrada neste navegador. Só muda o símbolo: os valores não são convertidos. */
export function useJournalCurrency(): [JournalCurrency, (c: JournalCurrency) => void] {
  const c = useSyncExternalStore(subscribeJournalCurrency, getJournalCurrency, () => 'BRL' as JournalCurrency);
  return [c, setJournalCurrency];
}
