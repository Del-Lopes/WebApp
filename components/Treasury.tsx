import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, DollarSign, Trash2, Wallet, Edit2, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Account {
  id: string;
  name: string;
  balance: number;
  currency: string;
}

interface TreasuryProps {
  onBack: () => void;
}

export const Treasury: React.FC<TreasuryProps> = ({ onBack }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // New account state
  const [isAdding, setIsAdding] = useState(false);
  const [newAccount, setNewAccount] = useState({ name: '', balance: '', currency: 'USD' });

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Account>>({});

  useEffect(() => {
    fetchAccounts();
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (data && data.role === 'admin') {
        setIsAdmin(true);
      }
    }
  };

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
        currency: newAccount.currency,
      });

      if (error) throw error;

      setNewAccount({ name: '', balance: '', currency: 'USD' });
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
          currency: editValues.currency
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

  const totalCapitalUSD = accounts
    .filter(a => a.currency === 'USD')
    .reduce((sum, acc) => sum + acc.balance, 0);

  const totalCapitalBRL = accounts
    .filter(a => a.currency === 'BRL')
    .reduce((sum, acc) => sum + acc.balance, 0);

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
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <DollarSign className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total em USD</p>
              <h3 className="text-2xl font-bold text-slate-900">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalCapitalUSD)}
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <DollarSign className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total em BRL</p>
              <h3 className="text-2xl font-bold text-slate-900">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCapitalBRL)}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-900">Contas Registradas</h2>
          {isAdmin && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Plus size={18} />
              <span>Nova Conta</span>
            </button>
          )}
        </div>

        {isAdding && (
          <form onSubmit={handleAddAccount} className="p-6 bg-slate-50 border-b border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Conta</label>
                <input
                  type="text"
                  value={newAccount.name}
                  onChange={e => setNewAccount({ ...newAccount, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder="Ex: Binance Main"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Saldo</label>
                <input
                  type="number"
                  value={newAccount.balance}
                  onChange={e => setNewAccount({ ...newAccount, balance: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder="0.00"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Moeda</label>
                <select
                  value={newAccount.currency}
                  onChange={e => setNewAccount({ ...newAccount, currency: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="USD">USD</option>
                  <option value="BRL">BRL</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-900"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Salvar Conta
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Conta</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Moeda</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Saldo</th>
                {isAdmin && <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    Carregando contas...
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    Nenhuma conta cadastrada.
                  </td>
                </tr>
              ) : (
                accounts.map((account) => (
                  <tr key={account.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center">
                          <Wallet className="text-slate-600" size={20} />
                        </div>
                        <div className="ml-4">
                          {editingId === account.id ? (
                            <input
                              type="text"
                              value={editValues.name || ''}
                              onChange={e => setEditValues({ ...editValues, name: e.target.value })}
                              className="px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-900"
                            />
                          ) : (
                            <div className="text-sm font-medium text-slate-900">{account.name}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingId === account.id ? (
                        <select
                          value={editValues.currency}
                          onChange={e => setEditValues({ ...editValues, currency: e.target.value })}
                          className="px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
                        >
                          <option value="USD">USD</option>
                          <option value="BRL">BRL</option>
                        </select>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-800">
                          {account.currency}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900 font-medium">
                      {editingId === account.id ? (
                        <input
                          type="number"
                          value={editValues.balance}
                          onChange={e => setEditValues({ ...editValues, balance: Number(e.target.value) })}
                          className="px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-900 text-right w-32"
                          step="0.01"
                        />
                      ) : (
                        new Intl.NumberFormat(account.currency === 'BRL' ? 'pt-BR' : 'en-US', { 
                          style: 'currency', 
                          currency: account.currency 
                        }).format(account.balance)
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {editingId === account.id ? (
                        <div className="flex justify-end gap-2">
                           <button
                            onClick={() => saveEditing(account.id)}
                            className="text-green-600 hover:text-green-800 transition-colors p-1"
                            title="Salvar"
                          >
                            <Check size={18} />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                            title="Cancelar"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ) : isAdmin && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => startEditing(account)}
                            className="text-blue-400 hover:text-blue-600 transition-colors p-1"
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteAccount(account.id)}
                            className="text-red-400 hover:text-red-600 transition-colors p-1"
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
