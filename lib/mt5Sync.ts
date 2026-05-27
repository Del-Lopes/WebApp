import { supabase } from './supabase';

export async function requestStrategyForceSync(strategyId: string): Promise<void> {
  const { error } = await supabase
    .from('strategy_mt5_status')
    .update({ force_sync: true })
    .eq('strategy_id', strategyId);
  if (error) throw new Error(error.message);
}

export async function requestPortfolioForceSync(accountId: string): Promise<void> {
  const { error } = await supabase
    .from('portfolio_mt5_status')
    .update({ force_sync: true })
    .eq('account_id', accountId);
  if (error) throw new Error(error.message);
}
