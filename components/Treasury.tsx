import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, DollarSign, Trash2, Wallet, Edit2, Check, X, TrendingUp, Link2, Link2Off, Coins } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { TreasuryMt5ConnectModal } from './Treasury/TreasuryMt5ConnectModal';
import { disconnectTreasuryAccountFromMt5 } from '../lib/treasuryMt5Link';

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

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];

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
    try {
      const { error } = await supabase
        .from('treasury_accounts')
        .update({
          name: editValues.name,
          balance: Number(editValues.balance),
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
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tesouraria</h1>
          <p className="text-slate-500">Gestão de capital e contas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Total Capital Card - 25% width */}
        <div className="md:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col justify-center">
          <div className="flex flex-col items-center text-center gap-4 mb-4">
            <div className="p-4 bg-green-100 rounded-full">
              <DollarSign className="text-green-600" size={32} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Capital Total</p>
              <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalCapital)}
              </h3>
            </div>
          </div>
        </div>

        {/* Pie Chart Card - Row 2 */}
        <div className="md:col-span-3 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center">
           <h4 className="text-xl font-bold text-slate-800 mb-8 self-start w-full border-b border-slate-100 pb-4">Distribuição do Capital</h4>
           
           <div className="flex flex-col lg:flex-row items-center gap-12 w-full">
               <div className="relative w-80 h-80 shrink-0 group">
                   {/* Tooltip */}
                   {tooltip.show && tooltip.data && (
                       <div 
                           className="absolute z-50 bg-slate-900 text-white text-xs rounded-lg py-1.5 px-3 shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full transition-opacity duration-200"
                           style={{ left: tooltip.x, top: tooltip.y - 10 }}
                       >
                           <p className="font-bold mb-0.5">{tooltip.data.name}</p>
                           <div className="flex items-center gap-2">
                               <span className="text-slate-300">{tooltip.data.location || 'N/A'}</span>
                               <span className="font-mono text-green-400">
                                   {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(tooltip.data.balance)}
                               </span>
                           </div>
                           <div className="text-slate-400 mt-0.5 font-mono">
                               {((tooltip.data.balance / totalCapital) * 100).toFixed(1)}%
                           </div>
                       </div>
                   )}

                   <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                       {accounts.length === 0 && (
                           <circle cx="50" cy="50" r="37.5" fill="transparent" stroke="#e2e8f0" strokeWidth="25" />
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

                   <div className="absolute inset-0 m-auto w-40 h-40 bg-white rounded-full flex flex-col items-center justify-center border-4 border-slate-50 shadow-inner pointer-events-none">
                       <span className="text-3xl font-bold text-slate-800">{accounts.length}</span>
                       <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Contas</span>
                   </div>
               </div>
           
           <div className="flex-1 w-full overflow-y-auto max-h-80 custom-scrollbar pr-4">
               <h4 className="text-xl font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">Distribuição do Capital</h4>
               <div className="space-y-2">
                   {accounts.map((acc, idx) => (
                       <div key={acc.id} className="flex items-center justify-between text-base p-2 hover:bg-slate-50 rounded-xl transition-all hover:shadow-sm border border-transparent hover:border-slate-100">
                           <div className="flex items-center gap-4">
                               <div className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                               <div className="flex flex-col">
                                   <span className="font-bold text-slate-700 truncate max-w-[200px]" title={acc.name}>{acc.name}</span>
                                   <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{acc.location || 'N/A'}</span>
                               </div>
                           </div>
                           <div className="text-right">
                               <span className="block font-mono font-bold text-slate-900 text-lg">
                                   {((acc.balance / totalCapital) * 100).toFixed(1)}%
                               </span>
                               <span className="text-sm text-slate-500 font-mono">
                                   {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(acc.balance)}
                               </span>
                           </div>
                       </div>
                   ))}
               </div>
           </div>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-900">Contas Registradas</h2>
          {isAdmin && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20"
            >
              <Plus size={18} />
              <span>Nova Conta</span>
            </button>
          )}
        </div>

        {isAdding && (
          <form onSubmit={handleAddAccount} className="p-6 bg-slate-50 border-b border-slate-200 animate-in slide-in-from-top-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Conta</label>
                <input
                  type="text"
                  value={newAccount.name}
                  onChange={e => setNewAccount({ ...newAccount, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-sm"
                  placeholder="Ex: Binance Main"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Saldo</label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input
                      type="number"
                      value={newAccount.balance}
                      onChange={e => setNewAccount({ ...newAccount, balance: e.target.value })}
                      className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-sm"
                      placeholder="0.00"
                      step="0.01"
                      required
                    />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Local</label>
                <input
                  type="text"
                  value={newAccount.location}
                  onChange={e => setNewAccount({ ...newAccount, location: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-sm"
                  placeholder="Ex: Carteira Fria / Binance"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-bold shadow-md shadow-green-600/20"
              >
                Salvar Conta
              </button>
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

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Conta</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Local</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Saldo</th>
                {isStaff && <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">MT5</th>}
                {isAdmin && <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 animate-pulse">
                    Carregando contas...
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                    Nenhuma conta cadastrada.
                  </td>
                </tr>
              ) : (
                accounts.map((account) => (
                  <tr key={account.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
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
                          className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center transition-all border ${
                            (editingId === account.id ? editValues.trend : account.trend) === 'positive'
                              ? 'bg-green-100 text-green-600 border-green-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200 group-hover:bg-white group-hover:shadow-md'
                          } ${editingId === account.id ? 'cursor-pointer hover:scale-105 active:scale-95 ring-2 ring-offset-2 ring-transparent hover:ring-slate-100' : ''}`}
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
                              <input
                                type="text"
                                value={editValues.name || ''}
                                onChange={e => setEditValues({ ...editValues, name: e.target.value })}
                                className="px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-900 w-full"
                                autoFocus
                              />
                              <div className="relative group/coin">
                                <button
                                  type="button"
                                  onClick={() => setEditValues(prev => ({ ...prev, is_cent: !prev.is_cent }))}
                                  className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center transition-all border ${
                                    editValues.is_cent
                                      ? 'bg-gradient-to-br from-amber-300 to-yellow-500 text-amber-900 border-amber-400 shadow-md shadow-amber-500/40'
                                      : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                                  }`}
                                  aria-label="Marcar como conta cent"
                                >
                                  <Coins size={14} />
                                </button>
                                <div className="absolute z-20 left-1/2 -translate-x-1/2 top-full mt-2 w-56 px-3 py-2 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl opacity-0 pointer-events-none group-hover/coin:opacity-100 transition-opacity">
                                  <p className="font-bold mb-1">Conta cent</p>
                                  <p className="text-slate-300 leading-relaxed">
                                    Ative se a conta MT5 é em centavos. O equity recebido será dividido por 100 ao gravar o saldo.
                                  </p>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-bold text-slate-900">{account.name}</div>
                              {account.is_cent && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-gradient-to-br from-amber-300 to-yellow-500 text-amber-900 uppercase tracking-wider">
                                  <Coins size={10} /> Cent
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingId === account.id ? (
                        <input
                          type="text"
                          value={editValues.location || ''}
                          onChange={e => setEditValues({ ...editValues, location: e.target.value })}
                          className="px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm w-full"
                          placeholder="Local"
                        />
                      ) : (
                        <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          {account.location || 'N/A'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900 font-bold font-mono">
                      {editingId === account.id ? (
                        <input
                          type="number"
                          value={editValues.balance}
                          onChange={e => setEditValues({ ...editValues, balance: Number(e.target.value) })}
                          className="px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-900 text-right w-32"
                          step="0.01"
                        />
                      ) : (
                        <>
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD'
                          }).format(account.balance)}
                          {mt5Links[account.id] && (
                            <div className="text-[10px] font-normal text-green-600 mt-0.5 uppercase tracking-wider">
                              Sincronizado · #{mt5Links[account.id].account_login}
                            </div>
                          )}
                        </>
                      )}
                    </td>
                    {isStaff && (
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {mt5Links[account.id] ? (
                          <div className="relative group/mt5 inline-block">
                            <button
                              onClick={() => handleDisconnectMt5(account.id)}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-full border bg-green-50 text-green-600 border-green-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                              aria-label="Desconectar do MT5"
                            >
                              <Link2 size={16} />
                            </button>
                            <div className="absolute z-20 left-1/2 -translate-x-1/2 top-full mt-2 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-semibold rounded-md shadow-xl opacity-0 pointer-events-none group-hover/mt5:opacity-100 transition-opacity whitespace-nowrap">
                              Desconectar do MT5
                            </div>
                          </div>
                        ) : (
                          <div className="relative group/mt5 inline-block">
                            <button
                              onClick={() => setConnectingAccount(account)}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-full border bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-colors"
                              aria-label="Conectar ao MT5"
                            >
                              <Link2Off size={16} />
                            </button>
                            <div className="absolute z-20 left-1/2 -translate-x-1/2 top-full mt-2 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-semibold rounded-md shadow-xl opacity-0 pointer-events-none group-hover/mt5:opacity-100 transition-opacity whitespace-nowrap">
                              Conectar ao MT5
                            </div>
                          </div>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {editingId === account.id ? (
                        <div className="flex justify-end gap-2">
                           <button
                            onClick={() => saveEditing(account.id)}
                            className="text-green-600 hover:text-green-800 transition-colors p-1 bg-green-50 rounded"
                            title="Salvar"
                          >
                            <Check size={18} />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded"
                            title="Cancelar"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ) : isAdmin && (
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEditing(account)}
                            className="text-blue-400 hover:text-blue-600 transition-colors p-1 hover:bg-blue-50 rounded"
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteAccount(account.id)}
                            className="text-red-400 hover:text-red-600 transition-colors p-1 hover:bg-red-50 rounded"
                            title="Excluir"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
