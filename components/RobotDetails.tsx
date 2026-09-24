import React, { useState, useEffect } from 'react';
import { ArrowLeft, ShieldCheck, Activity, BarChart2, BookOpen, Edit2, X, Save, Plus, Trash2, ExternalLink, ZoomIn, Upload } from 'lucide-react';
import { Robot, UserRole } from '../types';
import { uploadToSupabase } from '../lib/storage';
import { useStrategyMt5Status } from '../hooks/useStrategyMt5Status';
import { Mt5StatusCard } from './Mt5Connection/Mt5StatusCard';
import { Badge, Button, EmptyState, Input, Textarea } from './ui';

interface RobotDetailsProps {
  robot: Robot;
  onBack: () => void;
  userRole: UserRole;
  onUpdate: (updatedRobot: Robot) => void;
}

export const RobotDetails: React.FC<RobotDetailsProps> = ({ robot, onBack, userRole, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Robot>(robot);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { link: mt5Link, status: mt5Status, loading: mt5Loading, refetch: refetchMt5 } = useStrategyMt5Status(robot.id);

  // Sync state if prop changes
  useEffect(() => {
    setFormData(robot);
  }, [robot]);

  const handleSave = () => {
    onUpdate(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData(robot);
    setIsEditing(false);
  };

  // Generic input handler
  const handleChange = (field: keyof Robot, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Image handlers
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar_url' | 'images' | 'manualImages') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files) as File[]) {
        const url = await uploadToSupabase(file, 'strategies');
        urls.push(url);
      }

      if (type === 'avatar_url') {
        setFormData(prev => ({ ...prev, avatar_url: urls[0] }));
      } else {
        setFormData(prev => ({
          ...prev,
          [type]: [...(prev[type] || []), ...urls]
        }));
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Falha no upload');
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleAddMyFxBook = () => {
    const url = window.prompt("Insira a URL do MyFxBook:", formData.myfxbook_url || '');
    if (url !== null) {
         setFormData(prev => ({ ...prev, myfxbook_url: url }));
    }
  }

  const removeImage = (type: 'images' | 'manualImages', index: number) => {
    if (window.confirm("Remover esta imagem?")) {
      setFormData(prev => ({
        ...prev,
        [type]: (prev[type] || []).filter((_, i) => i !== index)
      }));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-fg-muted hover:text-accent-fg transition-colors group self-start rounded-lg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span>Voltar para Estratégias</span>
        </button>

        <div className="flex flex-wrap items-center gap-3">
           {isEditing ? (
             <input
               type="text"
               value={formData.status}
               onChange={(e) => handleChange('status', e.target.value)}
               className="px-3 py-1 rounded-full text-sm font-semibold border bg-tint/3 border-accent/40 text-fg placeholder:text-fg-subtle focus:outline-hidden focus:border-accent/70 focus:ring-3 focus:ring-accent/20 w-32"
               placeholder="Corretora"
             />
           ) : (
              <Badge tone="success" className="px-3 py-1 text-sm font-semibold">
                {formData.status}
              </Badge>
           )}
          <span className="font-mono tabular-nums whitespace-nowrap text-sm bg-tint/5 px-2 py-1 rounded-sm text-fg-muted border border-tint/10" title="Performance Fee">
            {formData.version}
          </span>

          {/* Admin Edit Controls */}
          {userRole === 'admin' && (
            <div className="ml-2 flex gap-2">
              {isEditing ? (
                <>
                  <Button size="sm" onClick={handleSave}>
                    <Save size={16} /> Salvar
                  </Button>
                  <Button size="sm" variant="secondary" onClick={handleCancel}>
                    <X size={16} /> Cancelar
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit2 size={16} /> Editar
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main grid: info card + MT5 sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

      {/* Main Info Card */}
      <div className="glass-card relative overflow-hidden p-6 md:p-8 min-w-0">
        <div className="hairline absolute inset-x-0 top-0" aria-hidden />
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Left Column: Info & Description */}
          <div className="flex-1 min-w-0 space-y-6">
            <div>
              <div className="flex flex-col gap-2 mb-4">
                {isEditing ? (
                  <div className="space-y-4 w-full">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className="font-display text-2xl sm:text-3xl font-semibold text-fg border-b-2 border-accent focus:outline-hidden bg-transparent w-full placeholder:text-fg-subtle"
                      placeholder="Nome do Robô"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                         <label className="block eyebrow-muted mb-1.5">Link de Acesso (Copy/Social)</label>
                         <Input
                          type="text"
                          value={formData.external_url || ''}
                          onChange={(e) => handleChange('external_url', e.target.value)}
                          className="py-1.5"
                          placeholder="https://..."
                        />
                      </div>
                      <div>
                         <label className="block eyebrow-muted mb-1.5">Upload de Avatar</label>
                         <label className={`flex items-center gap-2 px-4 py-1.5 border border-tint/10 bg-tint/3 rounded-lg text-sm text-fg-muted cursor-pointer hover:bg-tint/6 hover:text-fg transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <Upload size={14} className={isUploading ? 'animate-spin' : ''} />
                            {isUploading ? 'Enviando...' : 'Selecionar Arquivo'}
                            <input type="file" accept="image/*" className="hidden" disabled={isUploading} onChange={(e) => handleUpload(e, 'avatar_url')} />
                         </label>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 min-w-0">
                     {formData.avatar_url && (
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl border border-tint/10 overflow-hidden shrink-0">
                           <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                     )}
                     <h1 className="font-display text-2xl sm:text-3xl font-semibold text-fg break-words min-w-0">{formData.name}</h1>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-fg-muted text-sm">
                <div className="flex items-center gap-1.5">
                  <Activity size={16} className="text-accent-fg" />
                  Par:
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.pair}
                      onChange={(e) => handleChange('pair', e.target.value)}
                      className="bg-tint/3 border border-tint/10 rounded-md px-2 py-0.5 w-24 text-fg font-mono font-semibold focus:outline-hidden focus:border-accent/60"
                    />
                  ) : (
                    <strong className="font-mono text-fg whitespace-nowrap">{formData.pair}</strong>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <BarChart2 size={16} className={formData.profitability.includes('+') ? 'text-success-fg' : 'text-danger-fg'} />
                  Performance:
                  {isEditing ? (
                     <input
                      type="text"
                      value={formData.profitability}
                      onChange={(e) => handleChange('profitability', e.target.value)}
                      className="bg-tint/3 border border-tint/10 rounded-md px-2 py-0.5 w-24 text-fg font-mono font-semibold tabular-nums focus:outline-hidden focus:border-accent/60"
                    />
                  ) : (
                    <strong className={`font-display tabular-nums whitespace-nowrap ${formData.profitability.includes('+') ? 'text-success-fg' : 'text-danger-fg'}`}>{formData.profitability}</strong>
                  )}
                  {/* Verified MyFxBook Badge */}
                  {formData.myfxbook_url && (
                    <a
                      href={formData.myfxbook_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 bg-tint/5 border border-tint/10 text-fg-muted px-2 py-0.5 rounded-full text-xs font-bold hover:text-fg hover:border-tint/20 transition-colors ml-1"
                      title="Estratégia Verificada no MyFxBook"
                    >
                      <ShieldCheck size={12} />
                      MyFxBook
                    </a>
                  )}
                </div>

                {isEditing && (
                  <div className="flex items-center gap-1.5">
                     <span className="text-fg-muted">Performance Fee:</span>
                     <input
                      type="text"
                      value={formData.version}
                      onChange={(e) => handleChange('version', e.target.value)}
                      className="bg-tint/3 border border-tint/10 rounded-md px-2 py-0.5 w-20 text-fg font-mono font-semibold tabular-nums focus:outline-hidden focus:border-accent/60"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="max-w-none">
              <h3 className="font-display text-lg font-semibold text-fg flex items-center gap-2">
                <ShieldCheck size={20} className="text-accent-fg" />
                Sobre a Estratégia
              </h3>
              {isEditing ? (
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={6}
                  className="mt-2 leading-relaxed"
                  placeholder="Descrição da estratégia..."
                />
              ) : (
                <p className="mt-2 text-fg-muted leading-relaxed">
                  {formData.description || "Descrição detalhada indisponível para esta versão."}
                </p>
              )}
            </div>

            {!isEditing && (
              <div className="pt-4 flex gap-4">
                <a
                  href={formData.external_url ? (formData.external_url.startsWith('http') ? formData.external_url : `https://${formData.external_url}`) : '#'}
                  target="_blank"
                  rel="noreferrer"
                  className={`w-full sm:w-auto inline-flex items-center justify-center gap-3 h-12 px-8 rounded-lg bg-gradient-to-r from-brand-green-bright to-brand-green text-brand-dark font-semibold shadow-[0_10px_40px_-12px_rgba(34,197,94,0.55)] hover:brightness-110 hover:-translate-y-0.5 transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-page ${!formData.external_url ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                >
                  <ExternalLink size={20} />
                  Acessar Robô
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

        {/* MT5 sidebar */}
        <aside className="space-y-4 min-w-0">
          <Mt5StatusCard
            strategyId={robot.id}
            strategyName={robot.name}
            link={mt5Link}
            status={mt5Status}
            loading={mt5Loading}
            onChange={refetchMt5}
            userRole={userRole}
          />
        </aside>
      </div>

      {/* Operational Gallery */}
      <div className="space-y-4">
        <div className="flex items-end justify-between gap-3">
            <div>
              <h3 className="font-display text-xl font-semibold text-fg">Operacional & Backtests</h3>
            </div>
            {isEditing && (
                <button
                  onClick={handleAddMyFxBook}
                  className="flex items-center gap-1 text-sm font-semibold text-accent-fg hover:underline"
                >
                  <ShieldCheck size={16} /> MyFxBook
                </button>
            )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {formData.images?.map((img, idx) => (
            <div key={idx} className="group relative overflow-hidden rounded-xl border border-tint/8 bg-tint/3 aspect-[4/3] transition-colors hover:border-accent/40">
              <img
                src={img}
                alt={`Operacional ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              {!isEditing && (
                <div
                  onClick={() => setViewingImage(img)}
                  className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4 cursor-zoom-in"
                >
                  <span className="text-white font-medium text-sm flex items-center gap-2">
                      <ZoomIn size={16} /> Visualizar Ampliado
                  </span>
                </div>
              )}
              {isEditing && (
                 <button
                    onClick={() => removeImage('images', idx)}
                    className="absolute top-2 right-2 bg-brand-red hover:brightness-110 text-white p-2 rounded-lg transition-colors"
                    title="Remover imagem"
                 >
                    <Trash2 size={16} />
                 </button>
              )}
            </div>
          ))}
          {isEditing && (
            <label className="border border-dashed border-tint/15 hover:border-accent/50 rounded-xl flex flex-col items-center justify-center gap-2 text-fg-muted hover:text-accent-fg bg-tint/2 hover:bg-accent/5 transition-colors aspect-[4/3] cursor-pointer">
              {isUploading ? <Activity size={32} className="animate-spin" /> : <Plus size={32} />}
              <span className="text-sm font-medium">{isUploading ? 'Subindo...' : 'Adicionar Imagem'}</span>
              <input type="file" multiple accept="image/*" className="hidden" disabled={isUploading} onChange={(e) => handleUpload(e, 'images')} />
            </label>
          )}
          {(!formData.images?.length && !isEditing) && <EmptyState className="col-span-full py-10" icon={BarChart2} title="Nenhuma imagem disponível." />}
        </div>
      </div>

      {/* Manual Section */}
      <div className="space-y-4 pt-6 border-t border-tint/8">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-semibold text-fg flex items-center gap-2">
              <BookOpen size={22} className="text-fg-subtle shrink-0" />
              Manual de Instalação e Parâmetros
            </h3>
          </div>
           {isEditing && (
              <label className={`shrink-0 flex items-center gap-1 text-sm font-semibold text-accent-fg hover:underline cursor-pointer ${isUploading ? 'opacity-50' : ''}`}>
                <Plus size={16} />
                {isUploading ? 'Carregando...' : 'Adicionar Página'}
                <input type="file" multiple accept="image/*" className="hidden" disabled={isUploading} onChange={(e) => handleUpload(e, 'manualImages')} />
              </label>
          )}
        </div>

        {!isEditing && <p className="text-fg-muted text-sm">Siga o passo a passo visual abaixo para configurar seu robô corretamente.</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {formData.manualImages?.map((img, idx) => (
            <div key={idx} className="flex flex-col gap-2">
              <span className="eyebrow">Passo {idx + 1}</span>
              <div
                className={`rounded-xl border border-tint/8 overflow-hidden relative group transition-colors hover:border-accent/40 ${!isEditing ? 'cursor-zoom-in' : ''}`}
                onClick={!isEditing ? () => setViewingImage(img) : undefined}
              >
                <img
                  src={img}
                  alt={`Manual Página ${idx + 1}`}
                  className="w-full h-auto object-cover"
                />
                 {isEditing && (
                    <button
                      onClick={(e) => {
                          e.stopPropagation();
                          removeImage('manualImages', idx);
                      }}
                      className="absolute top-2 right-2 bg-brand-red hover:brightness-110 text-white p-2 rounded-lg transition-colors"
                      title="Remover página"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
                {!isEditing && (
                     <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                         <div className="bg-black/50 text-white p-2 rounded-full backdrop-blur-xs">
                             <ZoomIn size={24} />
                         </div>
                     </div>
                )}
              </div>
            </div>
          ))}
           {isEditing && (
            <label className="border border-dashed border-tint/15 hover:border-accent/50 rounded-xl flex flex-col items-center justify-center gap-2 text-fg-muted hover:text-accent-fg bg-tint/2 hover:bg-accent/5 transition-colors min-h-[200px] cursor-pointer">
              {isUploading ? <Activity size={32} className="animate-spin" /> : <Plus size={32} />}
              <span className="text-sm font-medium">{isUploading ? 'Subindo...' : 'Adicionar Página do Manual'}</span>
              <input type="file" multiple accept="image/*" className="hidden" disabled={isUploading} onChange={(e) => handleUpload(e, 'manualImages')} />
            </label>
          )}
          {(!formData.manualImages?.length && !isEditing) && <EmptyState className="col-span-full py-10" icon={BookOpen} title="Manual indisponível." />}
        </div>
      </div>

      {/* Image Viewer Overlay */}
      {viewingImage && (
        <div
            className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xs flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
            onClick={() => setViewingImage(null)}
        >
            <button
                onClick={() => setViewingImage(null)}
                className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
            >
                <X size={32} />
            </button>
            <img
                src={viewingImage}
                alt="Visualização Ampliada"
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
            />
        </div>
      )}
    </div>
  );
};
