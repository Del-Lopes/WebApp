import React, { useState, useEffect } from 'react';
import { Key, ShieldCheck, CheckCircle2, Clock, AlertCircle, Edit2, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BackButton } from './BackButton';

interface LicensesProps {
  onBack?: () => void;
}

interface LicenseRequest {
  id: string;
  mt5_account: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  expires_at?: string;
}

export const Licenses: React.FC<LicensesProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [mt5Account, setMt5Account] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<LicenseRequest[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user]);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('license_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error('Error fetching requests:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('license_requests')
        .insert([
          { 
            user_id: user.id,
            mt5_account: mt5Account,
            status: 'pending'
          }
        ]);

      if (error) throw error;

      setSubmitted(true);
      setMt5Account('');
      fetchRequests(); // Refresh list
      
      setTimeout(() => {
        setSubmitted(false);
      }, 3000);
    } catch (err: any) {
      console.error('Error creating license request:', err);
      setError(err.message || 'Erro ao solicitar licença. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAccount = async (id: string) => {
    if (!editValue) return;
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('license_requests')
        .update({ 
          mt5_account: editValue,
          status: 'pending',
          expires_at: null // Reset expiration since account changed
        })
        .eq('id', id);

      if (error) throw error;
      
      setEditingId(null);
      fetchRequests();
    } catch (err: any) {
      console.error('Error updating account:', err);
      setError(err.message || 'Erro ao atualizar conta.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle2 size={16} />;
      case 'rejected': return <AlertCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const activeLicenses = requests.filter(req => req.status === 'approved');
  const historyRequests = requests.filter(req => req.status !== 'approved');

  return (
    <div className="max-w-4xl mx-auto pt-8 px-4">
      <div className="text-center mb-10 relative">
        {onBack && (
            <div className="absolute left-0 top-0">
                 <BackButton onClick={onBack} />
            </div>
        )}
        <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-green-200 shadow-sm">
          <Key size={32} className="text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Gestor de Licença</h2>
        <p className="text-slate-500">Tudo relacionado as suas licenças MT4 e MT5.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-8">
          {/* Active Licenses */}
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm h-fit">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <ShieldCheck size={20} className="text-green-600" />
              Licenças Ativas
            </h3>

            {activeLicenses.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm">
                Nenhuma licença ativa no momento.
              </div>
            ) : (
              <div className="space-y-4">
                {activeLicenses.map((req) => (
                  <div key={req.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center font-bold">
                          MT5
                        </div>
                        <div>
                          {editingId === req.id ? (
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="bg-white border border-slate-300 rounded px-2 py-1 text-sm font-mono focus:outline-none focus:border-green-500"
                              autoFocus
                            />
                          ) : (
                            <span className="block font-mono font-bold text-slate-900">{req.mt5_account}</span>
                          )}
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                            <Calendar size={10} />
                            Expiração: {req.expires_at ? new Date(req.expires_at).toLocaleDateString() : 'Não definida'}
                          </div>
                        </div>
                      </div>
                      
                      {editingId === req.id ? (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleUpdateAccount(req.id)}
                            className="bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold hover:bg-green-500 transition-colors"
                          >
                            Salvar
                          </button>
                          <button 
                            onClick={() => setEditingId(null)}
                            className="bg-slate-200 text-slate-600 text-xs px-3 py-1.5 rounded-lg font-bold hover:bg-slate-300 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => {
                            setEditingId(req.id);
                            setEditValue(req.mt5_account);
                          }}
                          className="p-2 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition-all"
                          title="Editar conta"
                        >
                          <Edit2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Request Form */}
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm relative overflow-hidden h-fit">
            {submitted ? (
              <div className="absolute inset-0 bg-white/95 z-10 flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-300">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 size={40} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Licença Solicitada!</h3>
                <p className="text-slate-500">Sua solicitação foi enviada. Verifique o status ao lado.</p>
              </div>
            ) : null}

            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Key size={20} className="text-slate-400" />
              Nova Solicitação
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Número da Conta</label>
                <div className="relative group">
                  <input
                    type="number"
                    required
                    value={mt5Account}
                    onChange={(e) => setMt5Account(e.target.value)}
                    disabled={loading}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-4 pl-12 text-slate-900 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all placeholder:text-slate-400 font-mono text-lg disabled:opacity-50"
                    placeholder="Ex: 50123456"
                  />
                  <ShieldCheck size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-green-600 transition-colors" />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-xs text-green-800/80 leading-relaxed text-center">
                  Certifique-se que o número da conta está correto.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-green-600/20 hover:shadow-green-600/30 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Enviando...' : 'Solicitar Acesso'}
              </button>
            </form>
          </div>
        </div>

        {/* Request History */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm h-fit">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Clock size={20} className="text-slate-400" />
            Histórico de Solicitações
          </h3>
          
          {historyRequests.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              Nenhuma outra solicitação encontrada.
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {historyRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div>
                    <span className="block font-mono font-medium text-slate-700">Conta: {req.mt5_account}</span>
                    <span className="text-xs text-slate-400">{new Date(req.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(req.status)}`}>
                    {getStatusIcon(req.status)}
                    <span className="capitalize">{req.status === 'pending' ? 'Pendente' : req.status === 'approved' ? 'Aprovado' : 'Rejeitado'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};