import React, { useState, useEffect } from 'react';
import { Plus, Activity, Server, TrendingUp, Trash2, AlertCircle, ArrowUpDown, ShieldCheck } from 'lucide-react';
import { Robot, UserRole, Product } from '../types';
import { RobotDetails } from './RobotDetails';
import { BackButton } from './BackButton';
import { Badge, Button, Input, Label, Modal, PageHeader, Select, Skeleton } from './ui';
import { supabase } from '../lib/supabase';
import { useStrategiesMt5Status } from '../hooks/useStrategiesMt5Status';

const LIVE_THRESHOLD_SEC = 360;

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

  const { statusByStrategy } = useStrategiesMt5Status();
  // Tick a cada 10s pra reavaliar "live" (received_at <= 360s atrás)
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(id);
  }, []);

  const isStrategyLive = (strategyId: string) => {
    const status = statusByStrategy[strategyId];
    if (!status?.received_at) return false;
    const ageSec = (Date.now() - new Date(status.received_at).getTime()) / 1000;
    return ageSec <= LIVE_THRESHOLD_SEC;
  };

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
      <PageHeader
        className="mb-0 sm:mb-0"
        leading={onBack && <BackButton onClick={onBack} />}
        eyebrow="Trading"
        title="Estratégias e Robôs"
        description="Expert Advisors e Provedores de estratégias."
        actions={
          <button
            onClick={() => setSortOrder(current => current === 'desc' ? 'asc' : 'desc')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60 ${
              sortOrder
                ? 'bg-accent/10 border-accent/20 text-accent-fg'
                : 'bg-tint/3 border-tint/10 text-fg-muted hover:bg-tint/6 hover:text-fg'
            }`}
            title="Ordenar por Rentabilidade"
          >
            <ArrowUpDown size={16} />
            <span className="text-sm font-medium">
              Rentabilidade
              {sortOrder === 'asc' && '-'}
              {sortOrder === 'desc' && '+'}
            </span>
          </button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" aria-busy="true" aria-label="Carregando estratégias...">
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass-card p-5 space-y-4">
              <div className="flex justify-between">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sortedRobots.map((robot) => (
            <div key={robot.id} className="group glass-card glass-card-hover p-5 relative overflow-hidden cursor-pointer" onClick={() => setSelectedRobot(robot)}>
              {/* Background Icon Decoration */}
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-fg pointer-events-none">
                <Activity size={80} />
              </div>

              <div className="flex justify-between items-start mb-4 relative z-10">
                {robot.avatar_url ? (
                   <div className="w-20 h-20 rounded-xl border border-tint/10 overflow-hidden">
                     <img src={robot.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                   </div>
                ) : (
                  <div className="p-2.5 bg-tint/3 rounded-lg border border-tint/10 text-accent-fg group-hover:border-accent/30 transition-colors">
                    <Server size={24} />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Badge tone="success" className="font-semibold">
                    {robot.status}
                  </Badge>

                  {/* Delete Button (Card Action) */}
                  {userRole === 'admin' && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteClick(robot.id, robot.name);
                      }}
                      className="p-1.5 text-fg-subtle hover:text-danger-fg hover:bg-danger/10 rounded-lg transition-colors z-20 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                      title="Excluir Robô"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>

              <h3 className="font-display text-lg font-semibold text-fg mb-1 group-hover:text-accent-fg transition-colors relative z-10">{robot.name}</h3>
              <div className="text-sm text-fg-muted mb-6 flex items-center gap-2 relative z-10">
                <span className="font-mono tabular-nums text-xs bg-tint/5 px-1.5 py-0.5 rounded-sm text-fg-muted border border-tint/10">{robot.version}</span>
                <span className="text-fg-subtle">•</span>
                <span className="font-mono font-semibold text-fg whitespace-nowrap">{robot.pair}</span>
              </div>

              <div className="flex items-center justify-between gap-3 pt-4 border-t border-tint/6 relative z-10">
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="eyebrow-muted">Performance</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className={`flex items-center gap-1.5 font-display font-semibold tabular-nums whitespace-nowrap ${
                      robot.profitability.startsWith('+') ? 'text-success-fg' :
                      robot.profitability.startsWith('-') ? 'text-danger-fg' : 'text-fg-muted'
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
                            className="flex items-center gap-1 bg-tint/5 border border-tint/10 text-fg-muted px-1.5 py-0.5 rounded-sm text-[10px] font-bold hover:text-fg hover:border-tint/20 transition-colors"
                            title="Verificado no MyFxBook"
                        >
                            <ShieldCheck size={10} />
                            MyFxBook
                        </a>
                    )}
                    {/* Live indicator — só quando há status MT5 recente */}
                    {isStrategyLive(robot.id) && (
                        <span
                            className="flex items-center gap-1 bg-success/10 border border-success/20 text-success-fg px-1.5 py-0.5 rounded-sm text-[10px] font-bold"
                            title="Dados ao vivo da conta MT5"
                        >
                            <span className="relative flex w-2 h-2">
                                <span className="absolute inline-flex w-full h-full rounded-full bg-success opacity-75 animate-ping" />
                                <span className="relative inline-flex w-2 h-2 rounded-full bg-success" />
                            </span>
                            Live
                        </span>
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-sm text-accent-fg font-medium group-hover:underline">
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
              className="border border-dashed border-tint/15 hover:border-accent/50 bg-tint/2 hover:bg-tint/4 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 text-fg-muted hover:text-accent-fg transition-all min-h-[220px] group focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              <div className="w-12 h-12 rounded-full bg-tint/5 border border-tint/10 group-hover:bg-accent/10 group-hover:border-accent/20 flex items-center justify-center transition-colors">
                <Plus size={24} />
              </div>
              <span className="font-medium">Gerenciar Robôs</span>
            </button>
          )}
        </div>
      )}

      {/* Modal - Manage Strategies */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Gerenciar Estratégias"
        closeOnOverlay={false}
      >
            {/* Modal Tabs */}
            <div className="flex border-b border-tint/8 mb-6">
              <button
                type="button"
                onClick={() => setModalMode('add')}
                className={`flex-1 pb-3 text-sm font-medium transition-colors relative -mb-px ${
                  modalMode === 'add' ? 'text-accent-fg border-b-2 border-accent' : 'text-fg-muted hover:text-fg'
                }`}
              >
                Nova Estratégia
              </button>
              <button
                type="button"
                onClick={() => setModalMode('delete')}
                className={`flex-1 pb-3 text-sm font-medium transition-colors relative -mb-px ${
                  modalMode === 'delete' ? 'text-danger-fg border-b-2 border-danger' : 'text-fg-muted hover:text-fg'
                }`}
              >
                Excluir Estratégia
              </button>
            </div>

            {modalMode === 'add' ? (
              <form onSubmit={handleAddSubmit} className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                <div>
                  <Label>Nome da Estratégia</Label>
                  <Input
                    type="text"
                    required
                    value={newRobot.name}
                    onChange={(e) => setNewRobot({...newRobot, name: e.target.value})}
                    placeholder="Ex: Alpha Global Trader"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Performance Fee</Label>
                    <Input
                      type="text"
                      value={newRobot.version}
                      onChange={(e) => setNewRobot({...newRobot, version: e.target.value})}
                      placeholder="Ex: 20%"
                    />
                  </div>
                  <div>
                    <Label>Par (Ativo)</Label>
                    <Input
                      type="text"
                      required
                      value={newRobot.pair}
                      onChange={(e) => setNewRobot({...newRobot, pair: e.target.value})}
                      className="font-mono"
                      placeholder="Ex: EURUSD"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                  >
                    Criar Estratégia
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleDeleteSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="bg-danger/10 border border-danger/20 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="text-danger-fg shrink-0 mt-0.5" size={20} />
                  <p className="text-sm text-danger-fg">
                    A exclusão removerá o Robô do banco de dados para TODOS os usuários.
                  </p>
                </div>

                <div>
                  <Label>Selecionar Robô para Excluir</Label>
                  <Select
                    required
                    value={robotToDeleteId}
                    onChange={(e) => setRobotToDeleteId(e.target.value)}
                    className="focus:border-danger/60 focus:ring-danger/20"
                    disabled={robots.length === 0}
                  >
                    <option value="" disabled>
                      {robots.length === 0 ? 'Nenhum robô disponível' : 'Selecione um robô...'}
                    </option>
                    {robots.map((robot) => (
                      <option key={robot.id} value={robot.id}>{robot.name} ({robot.pair})</option>
                    ))}
                  </Select>
                </div>

                <div className="pt-2 flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="danger"
                    disabled={!robotToDeleteId}
                    className="flex-1"
                  >
                    Excluir Definitivamente
                  </Button>
                </div>
              </form>
            )}
      </Modal>
    </div>
  );
};
