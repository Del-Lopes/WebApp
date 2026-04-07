import React, { useState, useEffect } from 'react';
import { Key, ShieldCheck, CheckCircle2, Clock, AlertCircle, Edit2, Calendar, XCircle, Settings, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BackButton } from './BackButton';
import { LicenseRequest, LicenseTitle } from '../types';

interface LicensesProps {
  onBack?: () => void;
}

export const Licenses: React.FC<LicensesProps> = ({ onBack }) => {
  const { user, role } = useAuth();
  const [mt5Account, setMt5Account] = useState('');
  const [selectedTitle, setSelectedTitle] = useState('MT5');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<LicenseRequest[]>([]);
  const [titles, setTitles] = useState<LicenseTitle[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showTitleManager, setShowTitleManager] = useState(false);
  const [newTitleName, setNewTitleName] = useState('');

  useEffect(() => {
    if (user) {
      fetchRequests();
      fetchTitles();
    }
  }, [user]);

  const fetchTitles = async () => {
      try {
          const { data } = await supabase.from('license_titles').select('*').order('name');
          if (data) {
              setTitles(data);
              // Set default selected title if available
              if (data.length > 0 && !data.find(t => t.name === selectedTitle)) {
                  setSelectedTitle(data[0].name);
              }
          }
      } catch (e) {
          console.error('Error fetching titles:', e);
      }
  };

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
            license_title: selectedTitle,
            status: 'pending'
          }
        ]);

      if (error) throw error;

      setSubmitted(true);
      setMt5Account('');
      fetchRequests();
      
      setTimeout(() => {
        setSubmitted(false);
      }, 3000);
    } catch (err: any) {
      console.error('Error creating license request:', err);
      setError(err.message || 'Erro ao solicitar licença.');
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
          expires_at: null
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
    <div className="max-w-4xl mx-auto pt-8 px-4 pb-20">
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

      <div className="space-y-8">
        {/* Request Form - NOW FIRST */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm relative overflow-hidden h-fit animate-in fade-in slide-in-from-top-4 duration-500">
          {submitted && (
            <div className="absolute inset-0 bg-white/95 z-10 flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-300">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 size={40} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Licença Solicitada!</h3>
              <p className="text-slate-500 text-sm">Sua solicitação foi enviada para análise.</p>
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 font-display">
                <Plus size={20} className="text-green-600" />
                Nova Solicitação
              </h3>
              {(role === 'admin' || role === 'first_mate') && (
                  <button 
                      onClick={() => setShowTitleManager(true)}
                      className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-transparent hover:border-green-100"
                      title="Gerenciar Títulos"
                  >
                      <Settings size={18} />
                  </button>
              )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Número da Conta</label>
              <div className="relative group">
                <input
                  type="number"
                  required
                  value={mt5Account}
                  onChange={(e) => setMt5Account(e.target.value)}
                  disabled={loading}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 pl-12 text-slate-900 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all placeholder:text-slate-400 font-mono text-lg disabled:opacity-50"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-green-600/20 hover:shadow-green-600/30 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Enviando...' : 'Solicitar Acesso'}
            </button>
          </form>
        </div>

        {/* Request History - NOW SECOND */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm h-fit">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2 font-display">
            <Clock size={20} className="text-slate-400" />
            Histórico de Solicitações
          </h3>
          
          {historyRequests.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm italic">
              Nenhuma outra solicitação encontrada.
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {historyRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded uppercase tracking-wider">
                            {req.license_title || 'MT5'}
                        </span>
                        <span className="block font-mono font-medium text-slate-700">Conta: {req.mt5_account}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{new Date(req.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusColor(req.status)}`}>
                    {getStatusIcon(req.status)}
                    <span>{req.status === 'pending' ? 'Pendente' : req.status === 'approved' ? 'Aprovado' : 'Rejeitado'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Licenses - NOW THIRD */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm h-fit">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2 font-display">
            <ShieldCheck size={20} className="text-green-600" />
            Licenças Ativas
          </h3>

          {activeLicenses.length === 0 ? (
            <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm">
              Nenhuma licença ativa no momento.
            </div>
          ) : (
            <div className="space-y-4 max-h-[520px] overflow-y-auto pr-2 custom-scrollbar">
              {activeLicenses.map((req) => (
                <div key={req.id} className="p-5 bg-green-50/30 rounded-2xl border border-green-100/50 flex flex-col gap-4 hover:bg-green-50/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex-1">
                        {editingId === req.id ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-green-500 w-full"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <span className="block font-mono font-bold text-lg text-slate-900">{req.mt5_account}</span>
                            <div className="flex items-center gap-1.5 text-[9px] font-bold bg-green-100/60 text-green-700 px-2.5 py-1 rounded-lg uppercase tracking-wider border border-green-200/50">
                                <Key size={10} className="shrink-0" />
                                <span className="truncate max-w-[120px]">{req.license_title || 'MT5'}</span>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-1.5">
                          <Calendar size={10} className="text-slate-400" />
                          Expira em: <span className="text-slate-700">{req.expires_at ? new Date(req.expires_at).toLocaleDateString() : 'Não definida'}</span>
                        </div>
                      </div>
                    </div>
                    
                    {editingId === req.id ? (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleUpdateAccount(req.id)}
                          className="p-2 text-green-600 hover:bg-green-100 rounded-xl transition-all shadow-sm bg-white"
                          title="Confirmar"
                        >
                          <CheckCircle2 size={18} />
                        </button>
                        <button 
                          onClick={() => setEditingId(null)}
                          className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-all shadow-sm bg-white"
                          title="Cancelar"
                        >
                          <XCircle size={18} />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                          setEditingId(req.id);
                          setEditValue(req.mt5_account);
                        }}
                        className="p-2.5 bg-white border border-slate-100 text-slate-400 hover:text-green-600 hover:border-green-100 hover:shadow-md rounded-xl transition-all"
                        title="Editar Conta"
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
      </div>

      {/* Admin Title Manager Modal */}
      {showTitleManager && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-slate-800">Gerenciar Títulos</h3>
                      <button onClick={() => setShowTitleManager(false)}><XCircle size={24} className="text-slate-400 hover:text-slate-600 transition-colors" /></button>
                  </div>

                  <div className="space-y-4">
                      <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={newTitleName}
                            onChange={(e) => setNewTitleName(e.target.value)}
                            placeholder="Ex: MT4 Gold"
                            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-green-500 transition-all"
                          />
                          <button 
                            onClick={async () => {
                                if (!newTitleName) return;
                                const { error } = await supabase.from('license_titles').insert({ name: newTitleName });
                                if (error) {
                                    alert("Erro ou título já existente");
                                } else {
                                    setNewTitleName('');
                                    fetchTitles();
                                }
                            }}
                            className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-500 transition-colors shadow-sm"
                          >
                              <Plus size={20} />
                          </button>
                      </div>

                      <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                          {titles.map(t => (
                              <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100/50 transition-colors">
                                  <span className="font-medium text-slate-700">{t.name}</span>
                                  <button 
                                    onClick={async () => {
                                        if (confirm(`Excluir título "${t.name}"?`)) {
                                            const { error } = await supabase.from('license_titles').delete().eq('id', t.id);
                                            if (error) alert("Erro ao excluir. O título pode estar em uso.");
                                            fetchTitles();
                                        }
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                                  >
                                      <Trash2 size={16} />
                                  </button>
                              </div>
                          ))}
                          {titles.length === 0 && (
                              <p className="text-center text-slate-400 text-xs py-10 italic">Nenhum título cadastrado.</p>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};