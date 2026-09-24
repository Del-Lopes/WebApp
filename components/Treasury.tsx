import React, { useState, useEffect } from 'react';
import { Plus, DollarSign, Trash2, Wallet, Edit2, Check, X, TrendingUp, Link2, Link2Off, Coins } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { TreasuryMt5ConnectModal } from './Treasury/TreasuryMt5ConnectModal';
import { disconnectTreasuryAccountFromMt5 } from '../lib/treasuryMt5Link';
import { BackButton } from './BackButton';
import { Button, Card, PageHeader, Label, Input, Badge, Table, THead, TBody, TR, TH, TD, EmptyState, Skeleton } from './ui';
import { cn } from '../lib/cn';

interface Account {
  id: string;
  name: string;
  balance: number;
  currency: string;
  location?: string;
  trend?: 'neutral' | 'positive';
  is_cent?: boolean;
}

interface Mt5LinkRow {
  account_id: string;
  account_login: number;
  api_key_prefix: string;
  last_equity: number | null;
  last_reported_at: string | null;
}

interface TreasuryProps {
  onBack: () => void;
}

// Fatias do gráfico: escala de verdes da marca alternada com neutros
// (sem azul/roxo decorativo; vermelho e âmbar ficam reservados ao semântico).
const COLORS = ['#22c55e', '#a3a3a3', '#15803d', '#5eea96', '#737373', '#16a34a', '#bbf7d0', '#525252'];

export const Treasury: React.FC<TreasuryProps> = ({ onBack }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const isStaff = role === 'admin' || role === 'first_mate';

  // New account state
  const [isAdding, setIsAdding] = useState(false);
  const [newAccount, setNewAccount] = useState({ name: '', balance: '', location: '' });

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Account>>({});
  const [tooltip, setTooltip] = useState<{show: boolean, x: number, y: number, data: Account | null}>({
    show: false, x: 0, y: 0, data: null
  });

  // MT5 link state
  const [mt5Links, setMt5Links] = useState<Record<string, Mt5LinkRow>>({});
  const [connectingAccount, setConnectingAccount] = useState<Account | null>(null);

  useEffect(() => {
    fetchAccounts();
    if (isStaff) fetchMt5Links();
  }, [isStaff]);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('treasury_accounts')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMt5Links = async () => {
    try {
      const { data, error } = await supabase
        .from('treasury_mt5_link')
        .select('account_id, account_login, api_key_prefix, last_equity, last_reported_at');
      if (error) throw error;
      const map: Record<string, Mt5LinkRow> = {};
      (data || []).forEach((row) => { map[row.account_id] = row as Mt5LinkRow; });
      setMt5Links(map);
    } catch (error) {
      console.error('Error fetching mt5 links:', error);
    }
  };

  const handleDisconnectMt5 = async (accountId: string) => {
    if (!confirm('Desconectar esta conta do MT5? O saldo deixará de atualizar automaticamente.')) return;
    try {
      await disconnectTreasuryAccountFromMt5(accountId);
      setMt5Links((prev) => {
        const next = { ...prev };
        delete next[accountId];
        return next;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao desconectar.';
      alert(message);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccount.name || !newAccount.balance) return;
    if (!Number.isFinite(parseFloat(newAccount.balance))) {
      alert('Informe um saldo válido.');
      return;
    }

    try {
      const { error } = await supabase.from('treasury_accounts').insert({
        name: newAccount.name,
        balance: parseFloat(newAccount.balance),
        location: newAccount.location || 'USD', // Default or user input
        currency: 'USD' // Fixed for now or unnecessary
      });

      if (error) throw error;

      setNewAccount({ name: '', balance: '', location: '' });
      setIsAdding(false);
      fetchAccounts();
    } catch (error) {
      console.error('Error adding account:', error);
      alert('Erro ao adicionar conta');
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conta?')) return;
    try {
      const { error } = await supabase.from('treasury_accounts').delete().eq('id', id);
      if (error) throw error;
      fetchAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Erro ao excluir conta');
    }
  };

  const startEditing = (account: Account) => {
    setEditingId(account.id);
    setEditValues(account);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValues({});
  };

  const saveEditing = async (id: string) => {
    // Campo vazio virava Number('') = 0 e zerava o saldo sem aviso.
    const balance = editValues.balance;
    if (balance === undefined || balance === null || !Number.isFinite(Number(balance))) {
      alert('Informe um saldo válido.');
      return;
    }
    try {
      const { error } = await supabase
        .from('treasury_accounts')
        .update({
          name: editValues.name,
          balance: Number(balance),
          location: editValues.location,
          trend: editValues.trend,
          is_cent: !!editValues.is_cent,
        })
        .eq('id', id);

      if (error) throw error;
      setEditingId(null);
      setEditValues({});
      fetchAccounts();
    } catch (error) {
      console.error('Error updating account:', error);
      alert('Erro ao atualizar conta');
    }
  };

  const totalCapital = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  // Pie Chart Data Calculation
  let currentAngle = 0;
  const gradientStops = accounts.length > 0 ? accounts.map((acc, idx) => {
      const percentage = (acc.balance / totalCapital) * 100;
      const start = currentAngle;
      const end = currentAngle + percentage;
      currentAngle = end;
      const color = COLORS[idx % COLORS.length];
      return `${color} ${start}% ${end}%`;
  }).join(', ') : '#e2e8f0 0% 100%';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        leading={<BackButton onClick={onBack} />}
        title="Tesouraria"
        description="Gestão de capital e contas"
        className="mb-8"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Total Capital Card - 25% width */}
        <Card className="md:col-span-1 h-full flex flex-col justify-center">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="p-4 bg-accent/10 border border-accent/20 rounded-full">
              <DollarSign className="text-accent-fg" size={32} />
            </div>
            <div className="min-w-0 max-w-full">
              <p className="eyebrow-muted mb-2">Capital Total</p>
              <h3 className="font-mono tabular-nums whitespace-nowrap text-2xl lg:text-3xl font-semibold text-fg tracking-tight">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalCapital)}
              </h3>
            </div>
          </div>
        </Card>

        {/* Pie Chart Card - Row 2 */}
        <Card padding="lg" className="md:col-span-3 flex flex-col items-center">
           <h4 className="font-display text-xl font-semibold text-fg mb-8 self-start w-full border-b border-tint/6 pb-4">Distribuição do Capital</h4>

           <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12 w-full">
               <div className="relative w-64 h-64 sm:w-80 sm:h-80 shrink-0 group">
                   {/* Tooltip */}
                   {tooltip.show && tooltip.data && (
                       <div
                           className="absolute z-50 bg-elevated border border-tint/10 text-fg text-xs rounded-lg py-1.5 px-3 shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full transition-opacity duration-200"
                           style={{ left: tooltip.x, top: tooltip.y - 10 }}
                       >
                           <p className="font-semibold mb-0.5">{tooltip.data.name}</p>
                           <div className="flex items-center gap-2">
                               <span className="text-fg-muted">{tooltip.data.location || 'N/A'}</span>
                               <span className="font-mono tabular-nums whitespace-nowrap text-accent-fg">
                                   {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(tooltip.data.balance)}
                               </span>
                           </div>
                           <div className="text-fg-muted mt-0.5 font-mono tabular-nums">
                               {((tooltip.data.balance / totalCapital) * 100).toFixed(1)}%
                           </div>
                       </div>
                   )}

                   <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                       {accounts.length === 0 && (
                           <circle cx="50" cy="50" r="37.5" fill="transparent" className="stroke-tint/10" strokeWidth="25" />
                       )}
                       {accounts.map((acc, idx) => {
                           const percentage = acc.balance / totalCapital;
                           const strokeDasharray = `${percentage * 235.619} 235.619`;
                           // Calculate accumulated offset
                           const currentOffset = accounts.slice(0, idx).reduce((sum, a) => sum + (a.balance/totalCapital), 0) * 235.619;

                           return (
                               <circle
                                   key={acc.id}
                                   cx="50"
                                   cy="50"
                                   r="37.5"
                                   fill="transparent"
                                   stroke={COLORS[idx % COLORS.length]}
                                   strokeWidth="25"
                                   strokeDasharray={strokeDasharray}
                                   strokeDashoffset={-currentOffset}
                                   className="transition-all duration-300 hover:opacity-90 cursor-pointer"
                                   onMouseEnter={(e) => {
                                       setTooltip({
                                           show: true,
                                           x: 0, // Initial, updated by move
                                           y: 0,
                                           data: acc
                                       });
                                   }}
                                   onMouseMove={(e) => {
                                       const rect = e.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
                                       if (rect) {
                                           setTooltip(prev => ({
                                               ...prev,
                                               x: e.clientX - rect.left,
                                               y: e.clientY - rect.top
                                           }));
                                       }
                                   }}
                                   onMouseLeave={() => setTooltip(prev => ({ ...prev, show: false }))}
                               />
                           );
                       })}
                   </svg>

                   <div className="absolute inset-0 m-auto w-32 h-32 sm:w-40 sm:h-40 bg-surface rounded-full flex flex-col items-center justify-center border-4 border-page pointer-events-none">
                       <span className="font-mono tabular-nums text-3xl font-semibold text-fg">{accounts.length}</span>
                       <span className="eyebrow-muted mt-1">Contas</span>
                   </div>
               </div>

           <div className="flex-1 w-full min-w-0 overflow-y-auto max-h-80 ds-scrollbar sm:pr-4">
               <h4 className="font-display text-xl font-semibold text-fg mb-3 border-b border-tint/6 pb-2">Distribuição do Capital</h4>
               <div className="space-y-2">
                   {accounts.map((acc, idx) => (
                       <div key={acc.id} className="flex items-center justify-between gap-3 text-base p-2 hover:bg-tint/3 rounded-xl transition-colors border border-transparent hover:border-tint/8">
                           <div className="flex items-center gap-4 min-w-0">
                               <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                               <div className="flex flex-col min-w-0">
                                   <span className="font-semibold text-fg truncate max-w-[200px]" title={acc.name}>{acc.name}</span>
                                   <span className="text-xs font-medium text-fg-muted uppercase tracking-wide truncate">{acc.location || 'N/A'}</span>
                               </div>
                           </div>
                           <div className="text-right shrink-0">
                               <span className="block font-mono tabular-nums whitespace-nowrap font-semibold text-fg text-lg">
                                   {((acc.balance / totalCapital) * 100).toFixed(1)}%
                               </span>
                               <span className="text-sm text-fg-muted font-mono tabular-nums whitespace-nowrap">
                                   {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(acc.balance)}
                               </span>
                           </div>
                       </div>
                   ))}
               </div>
           </div>
           </div>
        </Card>
      </div>

      <Card padding="none" className="overflow-hidden">
        <div className="px-5 py-4 sm:p-6 border-b border-tint/8 flex justify-between items-center gap-3 bg-tint/2">
          <h2 className="font-display text-lg font-semibold text-fg">Contas Registradas</h2>
          {isAdmin && (
            <Button size="sm" onClick={() => setIsAdding(true)}>
              <Plus size={18} />
              <span>Nova Conta</span>
            </Button>
          )}
        </div>

        {isAdding && (
          <form onSubmit={handleAddAccount} className="p-5 sm:p-6 bg-tint/2 border-b border-tint/8 animate-in slide-in-from-top-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <Label>Nome da Conta</Label>
                <Input
                  type="text"
                  value={newAccount.name}
                  onChange={e => setNewAccount({ ...newAccount, name: e.target.value })}
                  placeholder="Ex: Binance Main"
                  required
                />
              </div>
              <div>
                <Label>Saldo</Label>
                <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle text-sm pointer-events-none">$</span>
                    <Input
                      type="number"
                      value={newAccount.balance}
                      onChange={e => setNewAccount({ ...newAccount, balance: e.target.value })}
                      className="pl-7 font-mono tabular-nums"
                      placeholder="0.00"
                      step="0.01"
                      required
                    />
                </div>
              </div>
              <div>
                <Label>Local</Label>
                <Input
                  type="text"
                  value={newAccount.location}
                  onChange={e => setNewAccount({ ...newAccount, location: e.target.value })}
                  placeholder="Ex: Carteira Fria / Binance"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsAdding(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Salvar Conta
              </Button>
            </div>
          </form>
        )}

        {connectingAccount && (
          <TreasuryMt5ConnectModal
            accountId={connectingAccount.id}
            accountName={connectingAccount.name}
            onClose={() => setConnectingAccount(null)}
            onConnected={() => {
              setConnectingAccount(null);
              fetchMt5Links();
            }}
          />
        )}

        <Table wrapperClassName="rounded-none border-0">
            <THead>
              <tr>
                <TH className="px-6 py-4">Conta</TH>
                <TH className="px-6 py-4">Local</TH>
                <TH align="right" className="px-6 py-4">Saldo</TH>
                {isStaff && <TH align="center" className="px-6 py-4">MT5</TH>}
                {isAdmin && <TH align="right" className="px-6 py-4">Ações</TH>}
              </tr>
            </THead>
            <TBody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-6">
                    <span className="sr-only">Carregando contas...</span>
                    <div className="space-y-3">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-6">
                    <EmptyState icon={Wallet} title="Nenhuma conta cadastrada." />
                  </td>
                </tr>
              ) : (
                accounts.map((account) => (
                  <TR key={account.id} className="group">
                    <TD className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          onClick={() => {
                            if (editingId === account.id) {
                              setEditValues(prev => ({
                                ...prev,
                                trend: prev.trend === 'positive' ? 'neutral' : 'positive'
                              }));
                            }
                          }}
                          className={cn(
                            'shrink-0 h-10 w-10 rounded-full flex items-center justify-center transition-all border',
                            (editingId === account.id ? editValues.trend : account.trend) === 'positive'
                              ? 'bg-success/10 text-success-fg border-success/20'
                              : 'bg-tint/5 text-fg-muted border-tint/10 group-hover:border-tint/20',
                            editingId === account.id && 'cursor-pointer hover:scale-105 active:scale-95 ring-2 ring-offset-2 ring-offset-surface ring-transparent hover:ring-accent/40',
                          )}
                        >
                          {(editingId === account.id ? editValues.trend : account.trend) === 'positive' ? (
                            <TrendingUp size={18} />
                          ) : (
                            <Wallet size={18} />
                          )}
                        </div>
                        <div className="ml-4 flex items-center gap-2">
                          {editingId === account.id ? (
                            <>
                              <Input
                                type="text"
                                value={editValues.name || ''}
                                onChange={e => setEditValues({ ...editValues, name: e.target.value })}
                                className="px-2.5 py-1.5 min-w-[10rem]"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => setEditValues(prev => ({ ...prev, is_cent: !prev.is_cent }))}
                                title={editValues.is_cent
                                  ? 'Conta cent ativa — o equity recebido será dividido por 100 ao gravar o saldo. Clique para desativar.'
                                  : 'Ative se a conta MT5 é em centavos. O equity recebido será dividido por 100 ao gravar o saldo.'}
                                className={cn(
                                  'shrink-0 inline-flex items-center justify-center p-1.5 rounded-lg border transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60',
                                  editValues.is_cent
                                    ? 'bg-warning/10 text-warning-fg border-warning/20 hover:bg-tint/5 hover:text-fg-muted hover:border-tint/10'
                                    : 'bg-tint/5 text-fg-muted border-tint/10 hover:bg-warning/10 hover:text-warning-fg hover:border-warning/20',
                                )}
                              >
                                <Coins size={14} />
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-semibold text-fg">{account.name}</div>
                              {account.is_cent && (
                                <Badge tone="warning" className="gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-sm">
                                  <Coins size={10} /> Cent
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </TD>
                    <TD className="px-6 py-4 whitespace-nowrap">
                      {editingId === account.id ? (
                        <Input
                          type="text"
                          value={editValues.location || ''}
                          onChange={e => setEditValues({ ...editValues, location: e.target.value })}
                          className="px-2.5 py-1.5 min-w-[8rem]"
                          placeholder="Local"
                        />
                      ) : (
                        <Badge>{account.location || 'N/A'}</Badge>
                      )}
                    </TD>
                    <TD numeric className="px-6 py-4 font-semibold">
                      {editingId === account.id ? (
                        <Input
                          type="number"
                          value={editValues.balance ?? ''}
                          onChange={e => setEditValues({ ...editValues, balance: e.target.value === '' ? undefined : Number(e.target.value) })}
                          className="px-2.5 py-1.5 text-right w-32 font-mono tabular-nums"
                          step="0.01"
                        />
                      ) : (
                        <>
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD'
                          }).format(account.balance)}
                          {mt5Links[account.id] && (
                            <div className="text-[10px] font-normal text-success-fg mt-0.5 uppercase tracking-wider">
                              Sincronizado · #{mt5Links[account.id].account_login}
                            </div>
                          )}
                        </>
                      )}
                    </TD>
                    {isStaff && (
                      <TD align="center" className="px-6 py-4 whitespace-nowrap">
                        {mt5Links[account.id] ? (
                          <button
                            onClick={() => handleDisconnectMt5(account.id)}
                            className="inline-flex items-center justify-center p-1.5 bg-success/10 text-success-fg border border-success/20 hover:bg-danger/10 hover:text-danger-fg hover:border-danger/20 rounded-lg transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                            title="Desconectar do MT5"
                          >
                            <Link2 size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={() => setConnectingAccount(account)}
                            className="inline-flex items-center justify-center p-1.5 bg-tint/5 text-fg-muted border border-tint/10 hover:bg-accent/10 hover:text-accent-fg hover:border-accent/30 rounded-lg transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                            title="Conectar ao MT5"
                          >
                            <Link2Off size={14} />
                          </button>
                        )}
                      </TD>
                    )}
                    <TD align="right" className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {editingId === account.id ? (
                        <div className="flex justify-end gap-2">
                           <button
                            onClick={() => saveEditing(account.id)}
                            className="text-success-fg transition-colors p-1 bg-success/10 hover:bg-success/15 border border-success/20 rounded-md focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                            title="Salvar"
                          >
                            <Check size={18} />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="text-fg-muted hover:text-fg transition-colors p-1 hover:bg-tint/5 border border-transparent rounded-md focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                            title="Cancelar"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ) : isAdmin && (
                        <div className="flex justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEditing(account)}
                            className="text-fg-muted hover:text-accent-fg transition-colors p-1 hover:bg-accent/10 rounded-md focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteAccount(account.id)}
                            className="text-fg-muted hover:text-danger-fg transition-colors p-1 hover:bg-danger/10 rounded-md focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                            title="Excluir"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
        </Table>
      </Card>
    </div>
  );
};
