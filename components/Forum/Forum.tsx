import React, { useCallback, useEffect, useState } from 'react';
import { MessagesSquare, Plus, Search, Pin, Lock, MessageCircle } from 'lucide-react';
import { BackButton } from '../BackButton';
import { Button, Card, PageHeader, Skeleton, EmptyState, Badge, Input, Modal, Label, Select, FieldMessage } from '../ui';
import { cn } from '../../lib/cn';
import { joinBody } from '../../lib/forumImages';
import {
  ForumCategory, ForumTopic, PAGE_SIZE,
  fetchCategories, fetchTopics, createTopic, timeAgo, roleLabel,
} from '../../lib/forum';
import { ForumTopicView } from './ForumTopicView';
import { Avatar } from './Avatar';
import { ForumEditor } from './ForumEditor';

interface Props {
  onBack: () => void;
}

export const Forum: React.FC<Props> = ({ onBack }) => {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [openTopicId, setOpenTopicId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);

  useEffect(() => {
    fetchCategories().then(setCategories).catch((e) => console.error('[Forum] categorias', e));
  }, []);

  const load = useCallback(async (nextPage: number) => {
    setLoading(true);
    setError(false);
    try {
      const rows = await fetchTopics({ categoryId, search: query, page: nextPage });
      setTopics((prev) => (nextPage === 0 ? rows : [...prev, ...rows]));
      setHasMore(rows.length === PAGE_SIZE);
      setPage(nextPage);
    } catch (e) {
      console.error('[Forum] tópicos', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [categoryId, query]);

  useEffect(() => { load(0); }, [load]);

  // Busca com pequeno atraso para não consultar a cada tecla.
  useEffect(() => {
    const t = window.setTimeout(() => setQuery(search), 350);
    return () => window.clearTimeout(t);
  }, [search]);

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? '';

  if (openTopicId) {
    return (
      <ForumTopicView
        topicId={openTopicId}
        categoryName={(id) => categoryName(id)}
        onBack={() => setOpenTopicId(null)}
        onChanged={() => load(0)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        className="mb-0 sm:mb-0"
        leading={<BackButton onClick={onBack} />}
        eyebrow={<span className="inline-flex items-center gap-1.5"><MessagesSquare size={12} /> Comunidade</span>}
        title="Fórum"
        description="Tire dúvidas, compartilhe análises e troque experiências com outros traders."
        actions={<Button onClick={() => setComposerOpen(true)}><Plus size={16} /> Novo tópico</Button>}
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="ds-scrollbar flex gap-2 overflow-x-auto pb-1">
          <CategoryChip active={categoryId === null} onClick={() => setCategoryId(null)}>Todos</CategoryChip>
          {categories.map((c) => (
            <CategoryChip key={c.id} active={categoryId === c.id} onClick={() => setCategoryId(c.id)} title={c.description ?? undefined}>
              {c.name}
            </CategoryChip>
          ))}
        </div>
        <div className="relative lg:w-72">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar tópicos"
            aria-label="Buscar tópicos"
            className="pl-9"
          />
        </div>
      </div>

      {error ? (
        <EmptyState
          icon={MessagesSquare}
          title="Não foi possível carregar o fórum"
          description="Verifique sua conexão e tente novamente."
          action={<Button variant="secondary" onClick={() => load(0)}>Tentar novamente</Button>}
        />
      ) : loading && topics.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
        </div>
      ) : topics.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title={query ? 'Nenhum tópico encontrado' : 'Nenhum tópico ainda'}
          description={query ? 'Tente outros termos de busca.' : 'Seja o primeiro a abrir uma conversa nesta categoria.'}
          action={!query && <Button onClick={() => setComposerOpen(true)}><Plus size={16} /> Novo tópico</Button>}
        />
      ) : (
        <div className="space-y-2">
          {topics.map((t) => (
            <TopicRow
              key={t.id}
              topic={t}
              categoryName={categoryId ? null : categoryName(t.category_id)}
              onOpen={() => setOpenTopicId(t.id)}
            />
          ))}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button variant="secondary" isLoading={loading} onClick={() => load(page + 1)}>Carregar mais</Button>
            </div>
          )}
        </div>
      )}

      <NewTopicModal
        open={composerOpen}
        categories={categories}
        defaultCategoryId={categoryId}
        onClose={() => setComposerOpen(false)}
        onCreated={(t) => { setComposerOpen(false); setOpenTopicId(t.id); load(0); }}
      />
    </div>
  );
};

const CategoryChip: React.FC<{ active: boolean; onClick: () => void; title?: string; children: React.ReactNode }> = ({ active, onClick, title, children }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-pressed={active}
    className={cn(
      'whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm transition-colors',
      'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60',
      active ? 'border-accent/40 bg-accent/10 text-accent-fg' : 'border-tint/10 bg-tint/3 text-fg-muted hover:text-fg hover:border-tint/20',
    )}
  >
    {children}
  </button>
);

const TopicRow: React.FC<{ topic: ForumTopic; categoryName: string | null; onOpen: () => void }> = ({ topic, categoryName, onOpen }) => {
  const badge = roleLabel(topic.author_role);
  return (
    <Card
      interactive
      padding="sm"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      className="flex items-center gap-4 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
    >
      <Avatar name={topic.author_name} userId={topic.author_id} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {topic.is_pinned && <Pin size={14} className="shrink-0 text-accent-fg" aria-label="Fixado" />}
          {topic.is_locked && <Lock size={14} className="shrink-0 text-fg-subtle" aria-label="Trancado" />}
          <h3 className="truncate font-medium text-fg group-hover:text-accent-fg transition-colors">{topic.title}</h3>
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-subtle">
          <span className="text-fg-muted">{topic.author_name}</span>
          {badge && <Badge tone="accent" className="px-1.5 py-0 text-[10px]">{badge}</Badge>}
          <span aria-hidden>·</span>
          <span>{timeAgo(topic.created_at)}</span>
          {categoryName && <><span aria-hidden>·</span><span>{categoryName}</span></>}
        </p>
      </div>
      <div className="hidden shrink-0 text-right sm:block">
        <p className="inline-flex items-center gap-1.5 text-sm tabular-nums text-fg">
          <MessageCircle size={14} className="text-fg-subtle" aria-hidden /> {topic.reply_count}
        </p>
        <p className="text-xs text-fg-subtle">{topic.reply_count > 0 ? `última ${timeAgo(topic.last_reply_at)}` : 'sem respostas'}</p>
      </div>
    </Card>
  );
};

const NewTopicModal: React.FC<{
  open: boolean;
  categories: ForumCategory[];
  defaultCategoryId: string | null;
  onClose: () => void;
  onCreated: (t: ForumTopic) => void;
}> = ({ open, categories, defaultCategoryId, onClose, onCreated }) => {
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCategoryId(defaultCategoryId ?? categories[0]?.id ?? '');
    setTitle('');
    setBody('');
    setImages([]);
    setError(null);
  }, [open, defaultCategoryId, categories]);

  const valid = categoryId && title.trim().length >= 3 && (body.trim().length > 0 || images.length > 0) && !uploading;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      onCreated(await createTopic(categoryId, title, joinBody(body, images)));
    } catch (err) {
      console.error('[Forum] criar tópico', err);
      setError('Não foi possível publicar o tópico. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo tópico"
      description="Seja claro no título: ajuda outros traders a encontrar e responder."
      size="lg"
      closeOnOverlay={false}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="forum-new-topic" isLoading={saving} disabled={!valid}>Publicar</Button>
        </>
      }
    >
      <form id="forum-new-topic" onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="forum-cat">Categoria</Label>
          <Select id="forum-cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor="forum-title" hint={`${title.length}/140`}>Título</Label>
          <Input id="forum-title" value={title} maxLength={140} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Como vocês gerenciam o drawdown diário na fase 1?" />
        </div>
        <div>
          <Label htmlFor="forum-body">Mensagem</Label>
          <ForumEditor
            id="forum-body"
            text={body}
            images={images}
            onTextChange={setBody}
            onImagesChange={setImages}
            onBusyChange={setUploading}
            className="min-h-40"
            placeholder="Descreva sua dúvida ou ideia com detalhes."
          />
        </div>
        {error && <FieldMessage error>{error}</FieldMessage>}
      </form>
    </Modal>
  );
};
