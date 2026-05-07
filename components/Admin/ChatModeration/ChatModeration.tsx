import React, { useMemo, useState } from 'react';
import {
  ArrowLeft, Loader2, MessageSquare, Users, Calendar, RefreshCw, Sparkles,
  AlertTriangle, BarChart3, MessagesSquare, Tag, BookPlus,
  ThumbsUp, ThumbsDown, Trash2, Bot,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import {
  useChatStats,
  type ConversationSummary,
  type ChatTopicSummary,
  type FeedbackItem,
} from '../../../hooks/useChatStats';
import { useAuth } from '../../../contexts/AuthContext';
import { ConversationDetail } from './ConversationDetail';
import type { KnowledgeCategory, KnowledgeInput } from '../../../hooks/useKnowledge';

interface ChatModerationProps {
  onBack: () => void;
  /** Chamado quando o admin pede para criar uma entrada na Base de Conhecimento a partir de um tópico */
  onCreateKnowledge?: (draft: Partial<KnowledgeInput>) => void;
}

const KNOWLEDGE_CATEGORIES_SET = new Set<KnowledgeCategory>([
  'Licenças', 'Robôs', 'Pagamentos', 'Educação', 'Jornada', 'Marketing', 'Outros',
]);

function topicToKnowledgeCategory(topic: string): KnowledgeCategory {
  // Tenta casar o nome do tópico com uma categoria fixa; senão "Outros"
  const lower = topic.toLowerCase();
  if (lower.includes('licen')) return 'Licenças';
  if (lower.includes('robô') || lower.includes('robo') || lower.includes('instala')) return 'Robôs';
  if (lower.includes('pag') || lower.includes('assina') || lower.includes('cobra')) return 'Pagamentos';
  if (lower.includes('educa') || lower.includes('curso') || lower.includes('aula')) return 'Educação';
  if (lower.includes('jorn') || lower.includes('onboard')) return 'Jornada';
  if (lower.includes('market') || lower.includes('parc') || lower.includes('indic')) return 'Marketing';
  // Match exato
  for (const cat of KNOWLEDGE_CATEGORIES_SET) {
    if (cat.toLowerCase() === lower) return cat;
  }
  return 'Outros';
}

type Tab = 'overview' | 'conversations' | 'topics' | 'feedback';

const PERIOD_OPTIONS = [
  { value: 7, label: '7 dias' },
  { value: 14, label: '14 dias' },
  { value: 30, label: '30 dias' },
  { value: 60, label: '60 dias' },
  { value: 90, label: '90 dias' },
];

export function ChatModeration({ onBack, onCreateKnowledge }: ChatModerationProps) {
  const { session } = useAuth();
  const [periodDays, setPeriodDays] = useState(7);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedConv, setSelectedConv] = useState<ConversationSummary | null>(null);
  const [classifying, setClassifying] = useState(false);
  const [classifyError, setClassifyError] = useState<string | null>(null);
  const {
    overview, conversations, topics,
    feedbackOverview, feedbackItems,
    loading, error, refresh,
  } = useChatStats(periodDays);
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'down' | 'up'>('down');
  const [deletingFeedbackId, setDeletingFeedbackId] = useState<string | null>(null);

  const maxBarCount = useMemo(() => {
    if (!overview) return 1;
    return Math.max(1, ...overview.perDay.map((d) => d.count));
  }, [overview]);

  const handleDeleteFeedback = async (id: string) => {
    if (!window.confirm('Apagar esta avaliação? Ela não será mais contada nas estatísticas.')) return;
    setDeletingFeedbackId(id);
    const { error: err } = await supabase.from('chat_feedback').delete().eq('id', id);
    setDeletingFeedbackId(null);
    if (err) {
      window.alert(err.message);
      return;
    }
    await refresh();
  };

  const handleCreateKnowledgeFromBadFeedback = (item: FeedbackItem) => {
    if (!onCreateKnowledge) return;
    const title = item.preceding_user_content
      ? item.preceding_user_content.slice(0, 200)
      : 'Resposta marcada como inadequada';
    const content = `Pergunta original do usuário:\n"${item.preceding_user_content ?? '(não disponível)'}"\n\nResposta atual do bot (avaliada como ❌ inadequada):\n${item.assistant_content}\n\n[Escreva aqui a resposta correta que o assistente deve dar para essa pergunta.]`;
    onCreateKnowledge({
      title,
      content,
      category: 'Outros',
    });
  };

  const handleCreateKnowledgeFromTopic = (t: ChatTopicSummary) => {
    if (!onCreateKnowledge) return;
    const examples = t.sample_messages.length > 0
      ? `\n\nPerguntas frequentes dos usuários sobre este tópico:\n${t.sample_messages.map((s) => `- "${s}"`).join('\n')}\n\n[Escreva aqui as orientações que o assistente deve dar para essas perguntas.]`
      : '';
    onCreateKnowledge({
      title: t.topic.slice(0, 200),
      content: `${t.description ?? ''}${examples}`.trim(),
      category: topicToKnowledgeCategory(t.topic),
    });
  };

  const handleClassifyTopics = async () => {
    if (!session) return;
    if (!window.confirm(`Recalcular tópicos com base nos últimos ${periodDays} dias? Isso usa a API do Gemini.`)) return;
    setClassifying(true);
    setClassifyError(null);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const response = await fetch(`${supabaseUrl}/functions/v1/chat-classify-topics`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ period_days: periodDays }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.detail || data?.error || 'Falha ao classificar tópicos');
      }
      await refresh();
    } catch (e: any) {
      setClassifyError(e?.message ?? 'Erro inesperado');
    } finally {
      setClassifying(false);
    }
  };

  const formatTimestamp = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Conversas IA</h2>
            <p className="text-sm text-slate-500">Moderação e análise das interações com o assistente.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Período:</label>
          <select
            value={periodDays}
            onChange={(e) => setPeriodDays(Number(e.target.value))}
            className="text-sm rounded-lg border border-slate-300 bg-white px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
            Atualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-1">
        <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<BarChart3 size={16} />}>
          Visão Geral
        </TabButton>
        <TabButton active={activeTab === 'conversations'} onClick={() => setActiveTab('conversations')} icon={<MessagesSquare size={16} />}>
          Conversas ({conversations.length})
        </TabButton>
        <TabButton active={activeTab === 'topics'} onClick={() => setActiveTab('topics')} icon={<Tag size={16} />}>
          Tópicos
        </TabButton>
        <TabButton active={activeTab === 'feedback'} onClick={() => setActiveTab('feedback')} icon={<ThumbsUp size={16} />}>
          Feedback{feedbackOverview ? ` (${feedbackOverview.total})` : ''}
        </TabButton>
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {loading && !overview ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="animate-spin text-green-600" size={28} />
            </div>
          ) : overview ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  icon={<MessageSquare size={20} />}
                  label="Total de mensagens"
                  value={overview.totalMessages}
                  hint="todas as épocas"
                />
                <StatCard
                  icon={<MessageSquare size={20} />}
                  label={`Mensagens nos últimos ${periodDays}d`}
                  value={overview.messagesInPeriod}
                  hint={`${overview.activeUsersInPeriod} usuários ativos`}
                />
                <StatCard
                  icon={<Calendar size={20} />}
                  label="Mensagens hoje"
                  value={overview.messagesToday}
                  hint={`${overview.activeUsersToday} usuários ativos hoje`}
                />
                <StatCard
                  icon={<Users size={20} />}
                  label={`Usuários ativos (${periodDays}d)`}
                  value={overview.activeUsersInPeriod}
                  hint="usuários com 1+ mensagem"
                />
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="font-semibold text-slate-800 mb-4">Mensagens por dia — últimos {periodDays} dias</h3>
                <div className="flex items-end gap-1 h-40">
                  {overview.perDay.map((d) => {
                    const heightPct = maxBarCount > 0 ? (d.count / maxBarCount) * 100 : 0;
                    return (
                      <div key={d.date} className="flex-1 flex flex-col items-center gap-1 min-w-0 group">
                        <div className="text-[10px] text-slate-500 leading-none">{d.count > 0 ? d.count : ''}</div>
                        <div
                          className="w-full bg-green-500 hover:bg-green-600 rounded-t transition-all"
                          style={{ height: `${heightPct}%`, minHeight: d.count > 0 ? '4px' : '0' }}
                          title={`${d.date}: ${d.count} mensagens`}
                        />
                        <div className="text-[10px] text-slate-500 leading-tight truncate w-full text-center">
                          {d.date.slice(5)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {feedbackOverview && feedbackOverview.total > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-800">Satisfação com as respostas</h3>
                    <button
                      onClick={() => setActiveTab('feedback')}
                      className="text-xs text-green-700 hover:text-green-800 font-medium"
                    >
                      Ver todas →
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="text-3xl font-bold text-slate-900 tabular-nums">
                        {Math.round(feedbackOverview.approvalRate * 100)}%
                      </div>
                      <div className="text-xs text-slate-500">de aprovação</div>
                    </div>
                    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{ width: `${feedbackOverview.approvalRate * 100}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <span className="flex items-center gap-1"><ThumbsUp size={14} className="text-green-600" />{feedbackOverview.up}</span>
                      <span className="flex items-center gap-1"><ThumbsDown size={14} className="text-red-600" />{feedbackOverview.down}</span>
                    </div>
                  </div>
                </div>
              )}

              {topics.length > 0 && (
                <div>
                  <h3 className="font-semibold text-slate-800 mb-3">Top 3 tópicos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {topics.slice(0, 3).map((t) => (
                      <div key={t.id} className="bg-white border border-slate-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Tag size={14} className="text-green-600" />
                          <h4 className="font-semibold text-slate-800 text-sm">{t.topic}</h4>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 mb-2">{t.description}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-600">
                          <span className="font-medium">{t.message_count} msgs</span>
                          <span>•</span>
                          <span>{t.user_count} usuários</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* Conversations tab */}
      {activeTab === 'conversations' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading && conversations.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="animate-spin text-green-600" size={28} />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center text-slate-500 py-10 text-sm">
              Nenhuma conversa nos últimos {periodDays} dias.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Usuário</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium text-right">Mensagens</th>
                    <th className="px-4 py-3 font-medium">Última atividade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {conversations.map((c) => (
                    <tr
                      key={c.user_id}
                      onClick={() => setSelectedConv(c)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">{c.full_name || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{c.email ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-xs capitalize text-slate-700">
                          {c.role ?? 'client'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">{c.message_count}</td>
                      <td className="px-4 py-3 text-slate-600">{formatTimestamp(c.last_message_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Topics tab */}
      {activeTab === 'topics' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4">
            <div>
              <h3 className="font-semibold text-slate-800">Categorização por IA</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {topics.length > 0
                  ? `Última atualização: ${formatTimestamp(topics[0].generated_at)} (período: ${topics[0].period_days}d)`
                  : 'Ainda não há tópicos calculados.'}
              </p>
            </div>
            <button
              onClick={handleClassifyTopics}
              disabled={classifying}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {classifying ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
              {classifying ? 'Analisando...' : 'Recalcular tópicos'}
            </button>
          </div>

          {classifyError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{classifyError}</span>
            </div>
          )}

          {topics.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
              Clique em "Recalcular tópicos" para gerar a categorização das mensagens.
            </div>
          ) : (
            <div className="space-y-3">
              {topics.map((t) => (
                <div key={t.id} className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <Tag size={16} className="text-green-600" />
                      <h4 className="font-semibold text-slate-900">{t.topic}</h4>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-600 flex-shrink-0">
                      <span className="font-medium tabular-nums">{t.message_count} msgs</span>
                      <span className="tabular-nums">{t.user_count} usuários</span>
                    </div>
                  </div>
                  {t.description && <p className="text-sm text-slate-600 mb-3">{t.description}</p>}
                  {t.sample_messages.length > 0 && (
                    <div className="space-y-1.5 mb-3">
                      <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">Exemplos</p>
                      <ul className="space-y-1">
                        {t.sample_messages.map((s, i) => (
                          <li key={i} className="text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2 border-l-2 border-green-300">
                            "{s}"
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {onCreateKnowledge && (
                    <div className="flex justify-end pt-2 border-t border-slate-100">
                      <button
                        onClick={() => handleCreateKnowledgeFromTopic(t)}
                        className="flex items-center gap-1.5 text-sm text-green-700 hover:text-green-800 font-medium"
                        title="Criar uma entrada na Base de Conhecimento usando este tópico como ponto de partida"
                      >
                        <BookPlus size={14} />
                        Criar entrada na Base
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Feedback tab */}
      {activeTab === 'feedback' && (
        <div className="space-y-4">
          {feedbackOverview && feedbackOverview.total > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={<ThumbsUp size={20} />} label="Total avaliações" value={feedbackOverview.total} hint={`últimos ${periodDays}d`} />
              <StatCard icon={<ThumbsUp size={20} />} label="👍 Útil" value={feedbackOverview.up} />
              <StatCard icon={<ThumbsDown size={20} />} label="👎 Não útil" value={feedbackOverview.down} />
              <StatCard
                icon={<BarChart3 size={20} />}
                label="Taxa de aprovação"
                value={Math.round(feedbackOverview.approvalRate * 100)}
                hint="% de 👍 sobre o total"
              />
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
              Nenhum feedback registrado nos últimos {periodDays} dias.
            </div>
          )}

          {feedbackOverview && feedbackOverview.total > 0 && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-slate-600 mr-1">Mostrar:</span>
                {(['down', 'up', 'all'] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setFeedbackFilter(opt)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      feedbackFilter === opt
                        ? 'bg-green-600 text-white'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {opt === 'down' ? '👎 Não útil' : opt === 'up' ? '👍 Útil' : 'Todas'}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {feedbackItems
                  .filter((item) => feedbackFilter === 'all' || item.rating === feedbackFilter)
                  .map((item) => (
                    <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm">
                          {item.rating === 'up' ? (
                            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-medium">
                              <ThumbsUp size={12} /> Útil
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-medium">
                              <ThumbsDown size={12} /> Não útil
                            </span>
                          )}
                          <span className="text-slate-700 font-medium">
                            {item.user_full_name || item.user_email || 'Usuário'}
                          </span>
                          <span className="text-slate-400 text-xs">
                            {formatTimestamp(item.created_at)}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteFeedback(item.id)}
                          disabled={deletingFeedbackId === item.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Apagar avaliação"
                        >
                          {deletingFeedbackId === item.id ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                        </button>
                      </div>

                      {item.preceding_user_content && (
                        <div className="text-sm">
                          <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium mb-1">Pergunta do usuário</p>
                          <p className="text-slate-700 bg-slate-50 rounded-lg px-3 py-2 whitespace-pre-wrap">
                            {item.preceding_user_content}
                          </p>
                        </div>
                      )}

                      <div className="text-sm">
                        <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium mb-1 flex items-center gap-1.5">
                          <Bot size={12} /> Resposta do bot
                        </p>
                        <p className={`text-slate-700 rounded-lg px-3 py-2 whitespace-pre-wrap ${
                          item.rating === 'down' ? 'bg-red-50 border border-red-100' : 'bg-green-50 border border-green-100'
                        }`}>
                          {item.assistant_content}
                        </p>
                      </div>

                      {item.rating === 'down' && onCreateKnowledge && (
                        <div className="flex justify-end pt-1 border-t border-slate-100">
                          <button
                            onClick={() => handleCreateKnowledgeFromBadFeedback(item)}
                            className="flex items-center gap-1.5 text-sm text-green-700 hover:text-green-800 font-medium"
                            title="Cadastrar a resposta correta na Base de Conhecimento"
                          >
                            <BookPlus size={14} />
                            Criar entrada na Base
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      )}

      {selectedConv && (
        <ConversationDetail
          conversation={selectedConv}
          onClose={() => setSelectedConv(null)}
          onChanged={refresh}
        />
      )}
    </div>
  );
}

function TabButton({
  active, onClick, icon, children,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-green-600 text-green-700'
          : 'border-transparent text-slate-500 hover:text-slate-800'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function StatCard({
  icon, label, value, hint,
}: { icon: React.ReactNode; label: string; value: number; hint?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center gap-2 text-slate-500 text-xs mb-2">
        <span className="text-green-600">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="text-2xl font-bold text-slate-900 tabular-nums">{value.toLocaleString('pt-BR')}</div>
      {hint && <div className="text-[11px] text-slate-500 mt-0.5">{hint}</div>}
    </div>
  );
}
