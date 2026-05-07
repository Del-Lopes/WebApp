import React, { useMemo, useState } from 'react';
import {
  ArrowLeft, Loader2, MessageSquare, Users, Calendar, RefreshCw, Sparkles,
  AlertTriangle, BarChart3, MessagesSquare, Tag,
} from 'lucide-react';
import { useChatStats, type ConversationSummary } from '../../../hooks/useChatStats';
import { useAuth } from '../../../contexts/AuthContext';
import { ConversationDetail } from './ConversationDetail';

interface ChatModerationProps {
  onBack: () => void;
}

type Tab = 'overview' | 'conversations' | 'topics';

const PERIOD_OPTIONS = [
  { value: 7, label: '7 dias' },
  { value: 14, label: '14 dias' },
  { value: 30, label: '30 dias' },
  { value: 60, label: '60 dias' },
  { value: 90, label: '90 dias' },
];

export function ChatModeration({ onBack }: ChatModerationProps) {
  const { session } = useAuth();
  const [periodDays, setPeriodDays] = useState(7);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedConv, setSelectedConv] = useState<ConversationSummary | null>(null);
  const [classifying, setClassifying] = useState(false);
  const [classifyError, setClassifyError] = useState<string | null>(null);
  const { overview, conversations, topics, loading, error, refresh } = useChatStats(periodDays);

  const maxBarCount = useMemo(() => {
    if (!overview) return 1;
    return Math.max(1, ...overview.perDay.map((d) => d.count));
  }, [overview]);

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
                    <div className="space-y-1.5">
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
                </div>
              ))}
            </div>
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
