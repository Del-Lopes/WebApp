import React, { useState, useEffect } from 'react';
import { Plus, Activity, Server, TrendingUp, X, Trash2, AlertCircle, ArrowUpDown, ShieldCheck } from 'lucide-react';
import { Robot, UserRole, Product } from '../types';
import { RobotDetails } from './RobotDetails';
import { BackButton } from './BackButton';
import { supabase } from '../lib/supabase';

interface StrategiesProps {
  userRole: UserRole;
  robots: Robot[]; // Kept for prop compatibility but unused for data source now
  onAddRobot: (robot: Robot) => void; // Legacy
  onUpdateRobot: (robot: Robot) => void; // Legacy
  onDeleteRobot: (id: string) => void; // Legacy
  onBack?: () => void;
}

const PRESET_STRATEGIES = [
  'Alpha Trend Hawk',
  'Scalper Pro X',
  'Gold Rush AI',
  'Neural Network V2',
  'Price Action Grid',
  'Arbitrage Master',
  'Volatility Breakout'
];

export const Strategies: React.FC<StrategiesProps> = ({ 
  userRole,
  onBack
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'delete'>('add');
  const [selectedRobot, setSelectedRobot] = useState<Robot | null>(null);
  const [robots, setRobots] = useState<Robot[]>([]);
  const [loading, setLoading] = useState(true);
  // Default to 'desc' (Highest Profitability first) as requested
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>('desc');

  const sortedRobots = React.useMemo(() => {
    if (!sortOrder) return robots;

    return [...robots].sort((a, b) => {
      // Parse profitability string (e.g. "+12.5%" -> 12.5)
      const getVal = (r: Robot) => {
        const str = r.profitability?.replace('%', '') || '0';
        return parseFloat(str);
      };

      const valA = getVal(a);
      const valB = getVal(b);

      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });
  }, [robots, sortOrder]);

  // Fetch Robots from Supabase
  useEffect(() => {
    fetchRobots();
  }, []);

  const fetchRobots = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('type', 'ea')
        // Default sort by created_at serverside, but we'll sort by profitability client-side if selected
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedRobots: Robot[] = data.map((item: any) => ({
          id: item.id,
          name: item.title,
          description: item.description,
          // Map metadata fields back to Robot type
          version: item.metadata?.version || '1.0',
          pair: item.metadata?.pair || 'UNK',
          status: item.metadata?.status || 'Em Análise',
          profitability: item.metadata?.profitability || '0.0%',
          images: item.metadata?.images || [],
          manualImages: item.metadata?.manualImages || [],
          avatar_url: item.metadata?.avatar_url || '',
          external_url: item.metadata?.external_url || '',
          myfxbook_url: item.metadata?.myfxbook_url || ''
        }));
        setRobots(mappedRobots);
      }
    } catch (error) {
      console.error('Error fetching strategies:', error);
    } finally {
      setLoading(false);
    }
  };

  // Form States
  const [newRobot, setNewRobot] = useState({ name: '', version: '', pair: '' });
  const [robotToDeleteId, setRobotToDeleteId] = useState('');

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRobot.name || !newRobot.pair) return;

    try {
      const metadata = {
        version: newRobot.version || '1.0',
        pair: newRobot.pair.toUpperCase(),
        status: 'Aguardando',
        profitability: '0.0%',
        images: [],
        manualImages: [],
        avatar_url: '',
        external_url: '',
        myfxbook_url: ''
      };

      const { data, error } = await supabase.from('products').insert({
        type: 'ea',
        title: newRobot.name,
        description: 'Nova estratégia adicionada a partir do modelo ' + newRobot.name,
        image_url: `https://picsum.photos/600/400?random=${Math.floor(Math.random() * 100)}`, // Placeholder
        metadata: metadata
      }).select();

      if (error) throw error;

      await fetchRobots(); // Refresh list
      setNewRobot({ name: '', version: '', pair: '' });
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Error adding strategy:', error);
      alert('Erro ao criar estratégia: ' + error.message);
    }
  };

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!robotToDeleteId) return;
    
    // Legacy support logic removed, utilizing direct DB call
    await handleDeleteClick(robotToDeleteId, 'Selected Robot');
    setIsModalOpen(false);
  };

  const handleUpdateRobot = async (updatedRobot: Robot) => {
    try {
      const metadata = {
        version: updatedRobot.version,
        pair: updatedRobot.pair,
        status: updatedRobot.status,
        profitability: updatedRobot.profitability,
        images: updatedRobot.images,
        manualImages: updatedRobot.manualImages,
        avatar_url: updatedRobot.avatar_url,
        external_url: updatedRobot.external_url,
        myfxbook_url: updatedRobot.myfxbook_url
      };

      const { error } = await supabase
        .from('products')
        .update({
          title: updatedRobot.name,
          description: updatedRobot.description,
          metadata: metadata
        })
        .eq('id', updatedRobot.id);

      if (error) throw error;

      await fetchRobots();
      setSelectedRobot(updatedRobot);
    } catch (error: any) {
      console.error('Error updating strategy:', error);
      alert('Erro ao atualizar: ' + error.message);
    }
  };

  const handleDeleteClick = async (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja excluir a estratégia e todos os dados?`)) {
      try {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', id);

        if (error) throw error;

        await fetchRobots(); // Refresh list
        if (selectedRobot?.id === id) {
          setSelectedRobot(null);
        }
      } catch (error: any) {
        alert('Erro ao excluir: ' + error.message);
      }
    }
  };

  // If a robot is selected, show the details view instead of the grid
  if (selectedRobot) {
    return (
      <RobotDetails 
        robot={selectedRobot} 
        onBack={() => setSelectedRobot(null)} 
        userRole={userRole}
        onUpdate={handleUpdateRobot}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          {onBack && <BackButton onClick={onBack} />}
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Estratégias e Robôs</h2>
            <p className="text-slate-500 text-sm">Expert Advisors e Provedores de estratégias.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortOrder(current => current === 'desc' ? 'asc' : 'desc')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
              sortOrder 
                ? 'bg-green-50 border-green-200 text-green-700' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            title="Ordenar por Rentabilidade"
          >
            <ArrowUpDown size={16} />
            <span className="text-sm font-medium">
              Rentabilidade
              {sortOrder === 'asc' && ' (↑)'}
              {sortOrder === 'desc' && ' (↓)'}
            </span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-500">Carregando estratégias...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sortedRobots.map((robot) => (
            <div key={robot.id} className="group bg-white border border-slate-200 hover:border-green-500/50 rounded-xl p-5 transition-all duration-300 relative overflow-hidden shadow-sm hover:shadow-md cursor-pointer" onClick={() => setSelectedRobot(robot)}>
              {/* Background Icon Decoration */}
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-slate-900 pointer-events-none">
                <Activity size={80} />
              </div>
              
              <div className="flex justify-between items-start mb-4 relative z-10">
                {robot.avatar_url ? (
                   <div className="w-20 h-20 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                     <img src={robot.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                   </div>
                ) : (
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-green-600 group-hover:text-green-500 group-hover:border-green-500/30 transition-colors">
                    <Server size={24} />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold border bg-green-100 text-green-700 border-green-200">
                    {robot.status}
                  </span>

                  {/* Delete Button (Card Action) */}
                  {userRole === 'admin' && (
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteClick(robot.id, robot.name);
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors z-20"
                      title="Excluir Robô"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-green-700 transition-colors relative z-10">{robot.name}</h3>
              <div className="text-sm text-slate-500 mb-6 flex items-center gap-2 relative z-10">
                <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200">{robot.version}</span>
                <span>•</span>
                <span className="font-semibold">{robot.pair}</span>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 relative z-10">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Performance</span>
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-1.5 font-bold ${
                      robot.profitability.startsWith('+') ? 'text-green-600' : 
                      robot.profitability.startsWith('-') ? 'text-red-500' : 'text-slate-400'
                    }`}>
                      <TrendingUp size={14} />
                      {robot.profitability}
                    </div>
                    {/* MyFxBook Verified Icon - Card */}
                    {robot.myfxbook_url && (
                        <a 
                            href={robot.myfxbook_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()} 
                            className="flex items-center gap-1 bg-orange-50 border border-orange-200 text-orange-700 px-1.5 py-0.5 rounded text-[10px] font-bold hover:bg-orange-100 transition-colors"
                            title="Verificado no MyFxBook"
                        >
                            <ShieldCheck size={10} />
                            MyFxBook
                        </a>
                    )}
                  </div>
                </div>
                <span className="text-sm text-green-600 hover:text-green-700 font-medium hover:underline">
                  Acessar &rarr;
                </span>
              </div>
            </div>
          ))}

          {/* Admin Card to Add New Strategy */}
          {userRole === 'admin' && (
            <button 
              onClick={() => {
                setModalMode('add');
                setIsModalOpen(true);
              }}
              className="border-2 border-dashed border-slate-300 hover:border-green-500/50 bg-slate-50 hover:bg-white rounded-xl p-5 flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-green-600 transition-all min-h-[220px] group"
            >
              <div className="w-12 h-12 rounded-full bg-slate-200 group-hover:bg-green-100 flex items-center justify-center transition-colors">
                <Plus size={24} />
              </div>
              <span className="font-medium">Gerenciar Robôs</span>
            </button>
          )}
        </div>
      )}

      {/* Modal - Manage Strategies */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-6 shadow-2xl transform transition-all">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xl font-bold text-slate-900">Gerenciar Estratégias</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 mb-6">
              <button 
                type="button"
                onClick={() => setModalMode('add')}
                className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
                  modalMode === 'add' ? 'text-green-600 border-b-2 border-green-600' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Nova Estratégia
              </button>
              <button 
                type="button"
                onClick={() => setModalMode('delete')}
                className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
                  modalMode === 'delete' ? 'text-red-600 border-b-2 border-red-600' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Excluir Estratégia
              </button>
            </div>

            {modalMode === 'add' ? (
              <form onSubmit={handleAddSubmit} className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Nome da Estratégia</label>
                  <input
                    type="text"
                    required
                    value={newRobot.name}
                    onChange={(e) => setNewRobot({...newRobot, name: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all placeholder:text-slate-400"
                    placeholder="Ex: Alpha Global Trader"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Performance Fee</label>
                    <input
                      type="text"
                      value={newRobot.version}
                      onChange={(e) => setNewRobot({...newRobot, version: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all placeholder:text-slate-400"
                      placeholder="Ex: 20%"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">Par (Ativo)</label>
                    <input
                      type="text"
                      required
                      value={newRobot.pair}
                      onChange={(e) => setNewRobot({...newRobot, pair: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all placeholder:text-slate-400"
                      placeholder="Ex: EURUSD"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 rounded-lg font-medium transition-colors border border-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-green-600/20"
                  >
                    Criar Estratégia
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleDeleteSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="bg-red-50 border border-red-100 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
                  <p className="text-sm text-red-700">
                    A exclusão removerá o Robô do banco de dados para TODOS os usuários.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Selecionar Robô para Excluir</label>
                  <select
                    required
                    value={robotToDeleteId}
                    onChange={(e) => setRobotToDeleteId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all cursor-pointer appearance-none"
                    disabled={robots.length === 0}
                  >
                    <option value="" disabled>
                      {robots.length === 0 ? 'Nenhum robô disponível' : 'Selecione um robô...'}
                    </option>
                    {robots.map((robot) => (
                      <option key={robot.id} value={robot.id}>{robot.name} ({robot.pair})</option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 rounded-lg font-medium transition-colors border border-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!robotToDeleteId}
                    className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-red-600/20"
                  >
                    Excluir Definitivamente
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};