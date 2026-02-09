import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, DollarSign, Trash2, Wallet, Edit2, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Account {
  id: string;
  name: string;
  balance: number;
  currency: string;
  location?: string;
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

  // New account state
  const [isAdding, setIsAdding] = useState(false);
  const [newAccount, setNewAccount] = useState({ name: '', balance: '', location: '' });

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Account>>({});

  useEffect(() => {
    fetchAccounts();
  }, []);

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
          location: editValues.location
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Total Capital Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col justify-center">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <DollarSign className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Capital Total</p>
              <h3 className="text-3xl font-bold text-slate-900">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalCapital)}
              </h3>
            </div>
          </div>
        </div>

        {/* Pie Chart Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-8">
           <div className="relative w-32 h-32 shrink-0 rounded-full" style={{ background: `conic-gradient(${gradientStops})` }}>
               <div className="absolute inset-0 m-auto w-16 h-16 bg-white rounded-full flex items-center justify-center text-xs font-bold text-slate-400">
                   {accounts.length} Contas
               </div>
           </div>
           
           <div className="flex-1 overflow-y-auto max-h-32 custom-scrollbar">
               <h4 className="text-sm font-bold text-slate-700 mb-2">Distribuição</h4>
               <div className="space-y-2">
                   {accounts.map((acc, idx) => (
                       <div key={acc.id} className="flex items-center justify-between text-xs">
                           <div className="flex items-center gap-2">
                               <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                               <span className="text-slate-600 truncate max-w-[100px]" title={acc.name}>{acc.name}</span>
                           </div>
                           <span className="font-mono font-medium text-slate-900">
                               {((acc.balance / totalCapital) * 100).toFixed(1)}%
                           </span>
                       </div>
                   ))}
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

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Conta</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Local</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Saldo</th>
                {isAdmin && <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500 animate-pulse">
                    Carregando contas...
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                    Nenhuma conta cadastrada.
                  </td>
                </tr>
              ) : (
                accounts.map((account) => (
                  <tr key={account.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 group-hover:bg-white group-hover:shadow-md transition-all border border-slate-200">
                          <Wallet size={18} />
                        </div>
                        <div className="ml-4">
                          {editingId === account.id ? (
                            <input
                              type="text"
                              value={editValues.name || ''}
                              onChange={e => setEditValues({ ...editValues, name: e.target.value })}
                              className="px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-900 w-full"
                              autoFocus
                            />
                          ) : (
                            <div className="text-sm font-bold text-slate-900">{account.name}</div>
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
                        new Intl.NumberFormat('en-US', { 
                          style: 'currency', 
                          currency: 'USD' 
                        }).format(account.balance)
                      )}
                    </td>
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
