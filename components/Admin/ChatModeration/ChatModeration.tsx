import React, { useMemo, useState } from 'react';
import {
  Loader2, MessageSquare, Users, Calendar, RefreshCw, Sparkles,
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
import { BackButton } from '../../BackButton';
import {
  Badge, Button, Card, EmptyState, PageHeader, Select, Skeleton, Tabs,
  Table, THead, TBody, TR, TH, TD,
} from '../../ui';
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

  const errorBox = 'flex items-start gap-2 p-3 rounded-lg bg-danger/10 text-danger-fg border border-danger/20 text-sm';
  const linkBtn = 'flex items-center gap-1.5 text-sm text-accent-fg hover:underline underline-offset-4 font-medium rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60';

  return (
    <div className="space-y-6">
      <PageHeader
        className="mb-0 sm:mb-0"
        leading={<BackButton onClick={onBack} />}
        title="Conversas IA"
        description="Moderação e análise das interações com o assistente."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="chat-mod-period" className="text-sm text-fg-muted">Período:</label>
            <Select
              id="chat-mod-period"
              value={periodDays}
              onChange={(e) => setPeriodDays(Number(e.target.value))}
              className="py-2 w-auto min-w-[7.5rem]"
            >
              {PERIOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
            <Button variant="secondary" size="sm" onClick={refresh} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
              Atualizar
            </Button>
          </div>
        }
      />

      {error && (
        <div role="alert" className={errorBox}>
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <Tabs<Tab>
        aria-label="Seções de Conversas IA"
        value={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'overview', label: 'Visão Geral', icon: BarChart3 },
          { key: 'conversations', label: <>Conversas (<span className="font-mono tabular-nums">{conversations.length}</span>)</>, icon: MessagesSquare },
          { key: 'topics', label: 'Tópicos', icon: Tag },
          { key: 'feedback', label: <>Feedback{feedbackOverview ? <> (<span className="font-mono tabular-nums">{feedbackOverview.total}</span>)</> : ''}</>, icon: ThumbsUp },
        ]}
      />

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {loading && !overview ? (
            <div className="space-y-6" aria-busy="true">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[0, 1, 2, 3].map((k) => <Skeleton key={k} className="h-28 rounded-2xl" />)}
              </div>
              <Skeleton className="h-56 rounded-2xl" />
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

              <Card>
                <h3 className="font-display font-semibold text-fg mb-4">Mensagens por dia — últimos {periodDays} dias</h3>
                <div className="flex items-end gap-1 h-40">
                  {overview.perDay.map((d) => {
                    const heightPct = maxBarCount > 0 ? (d.count / maxBarCount) * 100 : 0;
                    return (
                      <div key={d.date} className="flex-1 flex flex-col items-center gap-1 min-w-0 group">
                        <div className="text-[10px] text-fg-muted font-mono tabular-nums leading-none">{d.count > 0 ? d.count : ''}</div>
                        <div
                          className="w-full bg-accent/70 hover:bg-accent rounded-t-sm transition-all"
                          style={{ height: `${heightPct}%`, minHeight: d.count > 0 ? '4px' : '0' }}
                          title={`${d.date}: ${d.count} mensagens`}
                        />
                        <div className="text-[10px] text-fg-subtle font-mono tabular-nums leading-tight truncate w-full text-center">
                          {d.date.slice(5)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {feedbackOverview && feedbackOverview.total > 0 && (
                <Card>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h3 className="font-display font-semibold text-fg">Satisfação com as respostas</h3>
                    <button
                      onClick={() => setActiveTab('feedback')}
                      className="shrink-0 text-xs text-accent-fg hover:underline underline-offset-4 font-medium rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                    >
                      Ver todas →
                    </button>
                  </div>
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-4">
                    <div>
                      <div className="text-3xl font-semibold text-fg font-mono tabular-nums whitespace-nowrap">
                        {Math.round(feedbackOverview.approvalRate * 100)}%
                      </div>
                      <div className="text-xs text-fg-muted">de aprovação</div>
                    </div>
                    <div className="flex-1 min-w-[8rem] h-3 bg-tint/6 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-success"
                        style={{ width: `${feedbackOverview.approvalRate * 100}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-3 text-sm text-fg-muted">
                      <span className="flex items-center gap-1 font-mono tabular-nums whitespace-nowrap"><ThumbsUp size={14} className="text-success-fg" />{feedbackOverview.up}</span>
                      <span className="flex items-center gap-1 font-mono tabular-nums whitespace-nowrap"><ThumbsDown size={14} className="text-danger-fg" />{feedbackOverview.down}</span>
                    </div>
                  </div>
                </Card>
              )}

              {topics.length > 0 && (
                <div>
                  <h3 className="font-display font-semibold text-fg mb-3">Top 3 tópicos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {topics.slice(0, 3).map((t) => (
                      <Card key={t.id} padding="sm">
                        <div className="flex items-center gap-2 mb-1 min-w-0">
                          <Tag size={14} className="text-accent-fg shrink-0" />
                          <h4 className="font-semibold text-fg text-sm truncate">{t.topic}</h4>
                        </div>
                        <p className="text-xs text-fg-muted line-clamp-2 mb-2">{t.description}</p>
                        <div className="flex items-center gap-3 text-xs text-fg-muted">
                          <span className="font-medium font-mono tabular-nums whitespace-nowrap">{t.message_count} msgs</span>
                          <span aria-hidden>•</span>
                          <span className="font-mono tabular-nums whitespace-nowrap">{t.user_count} usuários</span>
                        </div>
                      </Card>
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
        loading && conversations.length === 0 ? (
          <Card padding="none" className="divide-y divide-tint/6" aria-busy="true">
            {[0, 1, 2, 3].map((k) => (
              <div key={k} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-12 ml-auto" />
              </div>
            ))}
          </Card>
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={MessagesSquare}
            title={<>Nenhuma conversa nos últimos {periodDays} dias.</>}
          />
        ) : (
          <Table className="text-left">
            <THead>
              <tr>
                <TH>Usuário</TH>
                <TH>Email</TH>
                <TH>Tipo</TH>
                <TH align="right">Mensagens</TH>
                <TH>Última atividade</TH>
              </tr>
            </THead>
            <TBody>
              {conversations.map((c) => (
                <TR
                  key={c.user_id}
                  interactive
                  onClick={() => setSelectedConv(c)}
                >
                  <TD className="font-medium text-fg">{c.full_name || '—'}</TD>
                  <TD>{c.email ?? '—'}</TD>
                  <TD>
                    <Badge className="capitalize">{c.role ?? 'client'}</Badge>
                  </TD>
                  <TD numeric>{c.message_count}</TD>
                  <TD className="whitespace-nowrap font-mono tabular-nums">{formatTimestamp(c.last_message_at)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )
      )}

      {/* Topics tab */}
      {activeTab === 'topics' && (
        <div className="space-y-4">
          <Card padding="sm" className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-display font-semibold text-fg">Categorização por IA</h3>
              <p className="text-xs text-fg-muted mt-0.5">
                {topics.length > 0
                  ? `Última atualização: ${formatTimestamp(topics[0].generated_at)} (período: ${topics[0].period_days}d)`
                  : 'Ainda não há tópicos calculados.'}
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleClassifyTopics}
              disabled={classifying}
            >
              {classifying ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
              {classifying ? 'Analisando...' : 'Recalcular tópicos'}
            </Button>
          </Card>

          {classifyError && (
            <div role="alert" className={errorBox}>
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{classifyError}</span>
            </div>
          )}

          {topics.length === 0 ? (
            <EmptyState
              icon={Tag}
              title='Clique em "Recalcular tópicos" para gerar a categorização das mensagens.'
            />
          ) : (
            <div className="space-y-3">
              {topics.map((t) => (
                <Card key={t.id}>
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Tag size={16} className="text-accent-fg shrink-0" />
                      <h4 className="font-semibold text-fg break-words">{t.topic}</h4>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-fg-muted shrink-0">
                      <span className="font-medium font-mono tabular-nums whitespace-nowrap">{t.message_count} msgs</span>
                      <span className="font-mono tabular-nums whitespace-nowrap">{t.user_count} usuários</span>
                    </div>
                  </div>
                  {t.description && <p className="text-sm text-fg-muted mb-3">{t.description}</p>}
                  {t.sample_messages.length > 0 && (
                    <div className="space-y-1.5 mb-3">
                      <p className="eyebrow-muted">Exemplos</p>
                      <ul className="space-y-1">
                        {t.sample_messages.map((s, i) => (
                          <li key={i} className="text-sm text-fg bg-tint/3 rounded-lg px-3 py-2 border-l-2 border-accent/40 break-words">
                            "{s}"
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {onCreateKnowledge && (
                    <div className="flex justify-end pt-2 border-t border-tint/6">
                      <button
                        onClick={() => handleCreateKnowledgeFromTopic(t)}
                        className={linkBtn}
                        title="Criar uma entrada na Base de Conhecimento usando este tópico como ponto de partida"
                      >
                        <BookPlus size={14} />
                        Criar entrada na Base
                      </button>
                    </div>
                  )}
                </Card>
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
            <EmptyState
              icon={ThumbsUp}
              title={<>Nenhum feedback registrado nos últimos {periodDays} dias.</>}
            />
          )}

          {feedbackOverview && feedbackOverview.total > 0 && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-fg-muted mr-1">Mostrar:</span>
                {(['down', 'up', 'all'] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setFeedbackFilter(opt)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60 ${
                      feedbackFilter === opt
                        ? 'bg-accent/10 border-accent/30 text-accent-fg font-medium'
                        : 'bg-tint/3 border-tint/10 text-fg-muted hover:bg-tint/6 hover:text-fg'
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
                    <Card key={item.id} padding="sm" className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2 text-sm min-w-0">
                          {item.rating === 'up' ? (
                            <Badge tone="success">
                              <ThumbsUp size={12} /> Útil
                            </Badge>
                          ) : (
                            <Badge tone="danger">
                              <ThumbsDown size={12} /> Não útil
                            </Badge>
                          )}
                          <span className="text-fg font-medium break-all">
                            {item.user_full_name || item.user_email || 'Usuário'}
                          </span>
                          <span className="text-fg-subtle text-xs font-mono tabular-nums whitespace-nowrap">
                            {formatTimestamp(item.created_at)}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteFeedback(item.id)}
                          disabled={deletingFeedbackId === item.id}
                          className="shrink-0 p-1.5 rounded-lg text-fg-subtle hover:text-danger-fg hover:bg-danger/10 transition-colors disabled:opacity-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                          title="Apagar avaliação"
                          aria-label="Apagar avaliação"
                        >
                          {deletingFeedbackId === item.id ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                        </button>
                      </div>

                      {item.preceding_user_content && (
                        <div className="text-sm">
                          <p className="eyebrow-muted mb-1">Pergunta do usuário</p>
                          <p className="text-fg bg-tint/5 rounded-lg px-3 py-2 whitespace-pre-wrap break-words">
                            {item.preceding_user_content}
                          </p>
                        </div>
                      )}

                      <div className="text-sm">
                        <p className="eyebrow-muted mb-1 flex items-center gap-1.5">
                          <Bot size={12} /> Resposta do bot
                        </p>
                        <p className={`text-fg rounded-lg px-3 py-2 whitespace-pre-wrap break-words border ${
                          item.rating === 'down' ? 'bg-danger/5 border-danger/20' : 'bg-success/5 border-success/20'
                        }`}>
                          {item.assistant_content}
                        </p>
                      </div>

                      {item.rating === 'down' && onCreateKnowledge && (
                        <div className="flex justify-end pt-1 border-t border-tint/6">
                          <button
                            onClick={() => handleCreateKnowledgeFromBadFeedback(item)}
                            className={linkBtn}
                            title="Cadastrar a resposta correta na Base de Conhecimento"
                          >
                            <BookPlus size={14} />
                            Criar entrada na Base
                          </button>
                        </div>
                      )}
                    </Card>
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

function StatCard({
  icon, label, value, hint,
}: { icon: React.ReactNode; label: string; value: number; hint?: string }) {
  return (
    <div className="glass-card p-4 min-w-0">
      <div className="flex items-start gap-2 text-fg-muted text-xs mb-2">
        <span className="text-accent-fg shrink-0">{icon}</span>
        <span className="min-w-0">{label}</span>
      </div>
      <div className="text-2xl font-semibold text-fg font-mono tabular-nums whitespace-nowrap">{value.toLocaleString('pt-BR')}</div>
      {hint && <div className="text-[11px] text-fg-muted mt-0.5">{hint}</div>}
    </div>
  );
}
