import React, { useState } from 'react';
import { Plus, Download, Trash2, Search, TrendingUp, Wallet, Activity, Inbox, BarChart3, Bot, Settings } from 'lucide-react';
import {
  Button, Card, CardHeader, Label, Input, Textarea, Select, FieldMessage, Badge, Modal, Tabs,
  Table, THead, TBody, TR, TH, TD, Eyebrow, PageHeader, Stat, EmptyState, Skeleton,
} from './index';

// Página de amostra do design system — só em dev, em /__ui (ver index.tsx).
// Cada coluna é um [data-theme]: os mesmos componentes nos dois temas.

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-4">
    <div className="flex items-center gap-3">
      <p className="eyebrow-muted">{title}</p>
      <div className="hairline-neutral flex-1" />
    </div>
    {children}
  </section>
);

type TabKey = 'overview' | 'trades' | 'settings';

const ThemeColumn: React.FC<{ theme: 'dark' | 'light' }> = ({ theme }) => {
  const [tab, setTab] = useState<TabKey>('overview');
  const [open, setOpen] = useState(false);

  return (
    <div data-theme={theme} className="relative min-w-0 bg-page p-5 text-fg sm:p-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-grid-fade opacity-60" />
        <div className="absolute -left-40 top-10 h-[380px] w-[380px] rounded-full bg-brand-green/[0.06] blur-[120px]" />
      </div>

      <div className="relative space-y-10">
        <PageHeader
          eyebrow={`Tema ${theme === 'dark' ? 'escuro' : 'claro'}`}
          title={<>Design system <span className="text-gradient-brand">Trader AFK</span></>}
          description="Primitivos da Fase 2. Os mesmos componentes e classes, só o [data-theme] muda."
          actions={<><Button variant="secondary" size="sm"><Download size={16} /> Exportar</Button><Button size="sm"><Plus size={16} /> Nova conta</Button></>}
        />

        <Section title="Tipografia">
          <div className="space-y-2">
            <Eyebrow>Eyebrow de seção</Eyebrow>
            <h2 className="font-display text-3xl font-semibold text-fg">Título display (Space Grotesk)</h2>
            <p className="text-fg">Corpo em Inter. Texto principal em <code className="font-mono text-accent-fg">text-fg</code>.</p>
            <p className="text-sm text-fg-muted">Secundário em text-fg-muted (contraste AA).</p>
            <p className="text-xs text-fg-subtle">Terciário em text-fg-subtle — datas e rodapés.</p>
            <p className="font-mono text-lg tabular-nums text-fg">EURUSD 1.08452 · +0,34%</p>
            <Eyebrow pill>Sincronizado com o MT5</Eyebrow>
          </div>
        </Section>

        <Section title="Botões">
          <div className="flex flex-wrap gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger"><Trash2 size={16} /> Excluir</Button>
            <Button isLoading>Salvando</Button>
            <Button disabled>Desativado</Button>
            <Button size="icon" variant="secondary" aria-label="Buscar"><Search size={16} /></Button>
          </div>
        </Section>

        <Section title="Stats">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat label="Equity total" value="US$ 12.480,20" delta={{ value: '+2,4%', tone: 'up' }} hint="hoje" icon={Wallet} />
            <Stat label="P&L do dia" value="−US$ 184,00" delta={{ value: '−1,1%', tone: 'down' }} icon={Activity} />
            <Stat label="Contas" value="3" hint="2 conectadas" icon={Bot} />
          </div>
        </Section>

        <Section title="Cards e badges">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Card interactive>
              <CardHeader eyebrow="Robô" title="Trend Soldier" action={<Badge tone="success" dot>Ativo</Badge>} />
              <p className="text-sm text-fg-muted">Card interativo: a borda acende em verde no hover.</p>
            </Card>
            <Card>
              <CardHeader eyebrow="Licença" title="Conta 37233454" action={<Badge tone="warning" dot>Expira em 5d</Badge>} />
              <div className="flex flex-wrap gap-1.5">
                <Badge>Neutral</Badge><Badge tone="accent">Accent</Badge><Badge tone="success">Lucro</Badge>
                <Badge tone="danger">Perda</Badge><Badge tone="warning">Pendente</Badge><Badge tone="info">Info</Badge>
              </div>
            </Card>
          </div>
        </Section>

        <Section title="Abas">
          <Tabs<TabKey>
            aria-label="Seções da conta"
            value={tab}
            onChange={setTab}
            items={[
              { key: 'overview', label: 'Visão geral', icon: BarChart3 },
              { key: 'trades', label: 'Operações', icon: TrendingUp },
              { key: 'settings', label: 'Configurações', icon: Settings },
            ]}
          />
        </Section>

        <Section title="Tabela">
          <Table>
            <THead>
              <tr><TH>Ativo</TH><TH>Lado</TH><TH align="right">Lote</TH><TH align="right">Resultado</TH></tr>
            </THead>
            <TBody>
              <TR><TD className="font-medium text-fg">XAUUSD</TD><TD><Badge tone="success">Compra</Badge></TD><TD numeric>0,50</TD><TD numeric className="text-success-fg">+US$ 312,40</TD></TR>
              <TR><TD className="font-medium text-fg">EURUSD</TD><TD><Badge tone="danger">Venda</Badge></TD><TD numeric>1,00</TD><TD numeric className="text-danger-fg">−US$ 88,10</TD></TR>
              <TR><TD className="font-medium text-fg">WIN</TD><TD><Badge tone="success">Compra</Badge></TD><TD numeric>5</TD><TD numeric className="text-success-fg">+R$ 450,00</TD></TR>
            </TBody>
          </Table>
        </Section>

        <Section title="Formulário">
          <Card>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><Label htmlFor={`${theme}-name`}>Nome da conta</Label><Input id={`${theme}-name`} placeholder="Ex.: Conta principal" /></div>
              <div>
                <Label htmlFor={`${theme}-broker`}>Corretora</Label>
                <Select id={`${theme}-broker`} defaultValue=""><option value="" disabled>Selecione</option><option>Vantage</option><option>HFM</option></Select>
              </div>
              <div>
                <Label htmlFor={`${theme}-acc`} hint="só números">Conta MT5</Label>
                <Input id={`${theme}-acc`} defaultValue="12ab" aria-invalid="true" />
                <FieldMessage error>Número de conta inválido.</FieldMessage>
              </div>
              <div><Label htmlFor={`${theme}-disabled`}>Desativado</Label><Input id={`${theme}-disabled`} disabled value="Somente leitura" readOnly /></div>
              <div className="sm:col-span-2"><Label htmlFor={`${theme}-note`}>Observações</Label><Textarea id={`${theme}-note`} placeholder="Anotações sobre a conta…" /></div>
            </div>
            <div className="mt-5 flex justify-end gap-2"><Button variant="ghost">Cancelar</Button><Button onClick={() => setOpen(true)}>Abrir modal</Button></div>
          </Card>
        </Section>

        <Section title="Vazio e carregando">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <EmptyState icon={Inbox} title="Nenhuma operação" description="As operações do MT5 aparecem aqui assim que a conta sincronizar." action={<Button variant="outline" size="sm">Conectar MT5</Button>} />
            <Card className="space-y-3">
              <Skeleton className="h-4 w-1/3" /><Skeleton className="h-8 w-2/3" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-5/6" />
            </Card>
          </div>
        </Section>

        <Section title="Linhas">
          <div className="space-y-4"><div className="hairline" /><div className="hairline-neutral" /></div>
        </Section>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Excluir conta?"
        description="A conta sai do portfólio. O histórico de operações é mantido."
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button variant="danger" onClick={() => setOpen(false)}>Excluir</Button></>}
      >
        <p className="text-sm text-fg-muted">O modal fecha com Esc, clicando fora ou no X. O foco fica preso no painel.</p>
      </Modal>
    </div>
  );
};

const Showcase: React.FC = () => (
  <div className="h-screen overflow-y-auto">
    <div className="grid grid-cols-1 xl:grid-cols-2">
      <ThemeColumn theme="dark" />
      <ThemeColumn theme="light" />
    </div>
  </div>
);

export default Showcase;
