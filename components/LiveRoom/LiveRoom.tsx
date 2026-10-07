import React, { useEffect, useState } from 'react';
import { Video, Lock, ExternalLink, CalendarClock, MessageSquare, LineChart, GraduationCap, AlertTriangle } from 'lucide-react';
import { BackButton } from '../BackButton';
import { Button, Card, PageHeader, Skeleton, Badge } from '../ui';
import { useAuth } from '../../contexts/AuthContext';
import { fetchLiveRoom, LiveRoomState } from '../../lib/liveRoom';

interface Props {
  onBack: () => void;
}

const HIGHLIGHTS = [
  {
    icon: LineChart,
    title: 'Leitura de mercado ao vivo',
    text: 'Acompanhe a análise dos gráficos e do contexto do dia em tempo real, com explicação do raciocínio por trás de cada leitura.',
  },
  {
    icon: MessageSquare,
    title: 'Tire suas dúvidas na hora',
    text: 'Interaja durante a sessão: dúvidas sobre a plataforma, os robôs, gestão de risco e o uso das ferramentas da Trader AFK.',
  },
  {
    icon: GraduationCap,
    title: 'Aprendizado na prática',
    text: 'Veja na prática os conceitos da Trilha Gain e da Biblioteca aplicados ao mercado, com foco em método e disciplina.',
  },
];

export const LiveRoom: React.FC<Props> = ({ onBack }) => {
  const { role } = useAuth();
  const [state, setState] = useState<LiveRoomState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchLiveRoom()
      .then((s) => { if (alive) setState(s); })
      .catch((e) => { console.error('[LiveRoom]', e); if (alive) setError(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const canEnter = !!state?.has_access && !!state.url;
  const isAdmin = role === 'admin';

  return (
    <div className="space-y-6">
      <PageHeader
        className="mb-0 sm:mb-0"
        leading={<BackButton onClick={onBack} />}
        eyebrow={state?.is_live ? (
          <span className="inline-flex items-center gap-1.5 text-danger-fg"><Video size={12} /> Estamos ao vivo</span>
        ) : <span className="inline-flex items-center gap-1.5"><Video size={12} /> Sala exclusiva</span>}
        title="Sala ao Vivo"
        description="Sessões ao vivo com a equipe Trader AFK para acompanhar o mercado e aprender na prática."
      />

      {/* Chamada principal + acesso */}
      <Card padding="lg" className="overflow-hidden">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute inset-0 bg-grid-fade opacity-50" />
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-green/[0.08] blur-[100px]" />
        </div>
        <div className="hairline absolute inset-x-0 top-0" aria-hidden />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="flex items-center gap-2">
              {state?.is_live && (
                <span className="relative flex h-2.5 w-2.5" aria-hidden>
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-danger" />
                </span>
              )}
              <span className={state?.is_live ? 'eyebrow-muted text-danger-fg' : 'eyebrow-muted'}>
                {state?.is_live ? 'Estamos ao vivo agora' : 'Sala exclusiva para assinantes'}
              </span>
            </div>
            <h2 className="font-display text-2xl font-semibold text-fg sm:text-3xl">
              Opere acompanhado, <span className="text-gradient-brand">ao vivo</span>.
            </h2>
            <p className="text-sm leading-relaxed text-fg-muted sm:text-base">
              A Sala ao Vivo é o espaço onde a equipe acompanha o mercado em tempo real, comenta o
              contexto do dia, mostra como usar as ferramentas da plataforma e responde às dúvidas dos
              membros. É um ambiente de aprendizado contínuo para quem quer evoluir com método.
            </p>
            {state?.schedule && (
              <p className="inline-flex items-center gap-2 text-sm text-fg">
                <CalendarClock size={16} className="text-accent-fg" aria-hidden />
                {state.schedule}
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-stretch gap-2 md:w-64">
            {loading ? (
              <Skeleton className="h-12 w-full rounded-lg" />
            ) : canEnter ? (
              <>
                <a
                  href={state!.url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand-green-bright to-brand-green px-7 text-base font-semibold text-brand-dark shadow-[0_10px_40px_-12px_rgba(34,197,94,0.55)] transition-all hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-page"
                >
                  <Video size={18} /> Acessar sala <ExternalLink size={14} className="opacity-70" />
                </a>
                <Badge tone="success" dot className="justify-center">Acesso liberado</Badge>
              </>
            ) : (
              <>
                <Button size="lg" variant="secondary" disabled className="w-full" aria-describedby="live-room-locked">
                  <Lock size={18} /> Acessar sala
                </Button>
                <p id="live-room-locked" className="text-center text-xs text-fg-muted">
                  {error
                    ? 'Não foi possível verificar seu acesso agora. Tente novamente em instantes.'
                    : state?.has_access && !state.configured
                      ? 'Seu acesso está liberado. O link da próxima sessão ainda não foi publicado.'
                      : 'Acesso exclusivo para assinantes. Fale com o suporte para liberar a sua entrada.'}
                </p>
              </>
            )}
            {isAdmin && (
              <p className="text-center text-[11px] text-fg-subtle">
                Link e acessos: Painel Admin › Sala ao Vivo
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* O que acontece na sala */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
          <Card key={title} className="space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-accent-fg">
              <Icon size={20} aria-hidden />
            </div>
            <h3 className="font-display text-base font-semibold text-fg">{title}</h3>
            <p className="text-sm leading-relaxed text-fg-muted">{text}</p>
          </Card>
        ))}
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-warning/20 bg-warning/10 p-3">
        <AlertTriangle size={15} className="mt-0.5 shrink-0 text-warning-fg" aria-hidden />
        <p className="text-xs leading-relaxed text-warning-fg">
          Conteúdo informativo e educacional. As leituras feitas na sala não constituem recomendação de
          investimento nem análise de valores mobiliários. Operar forex/CFD alavancado envolve alto risco e
          pode gerar perdas superiores ao capital. Decisões são de responsabilidade exclusiva de cada usuário.
        </p>
      </div>
    </div>
  );
};
