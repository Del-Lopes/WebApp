import React, { useCallback, useEffect, useState } from 'react';
import { Pin, Lock, Unlock, Trash2, Pencil, MessagesSquare, Send } from 'lucide-react';
import { BackButton } from '../BackButton';
import { Button, Card, Skeleton, EmptyState, Badge, FieldMessage } from '../ui';
import { useAuth } from '../../contexts/AuthContext';
import {
  ForumTopic, ForumPost,
  fetchTopic, fetchPosts, createPost, updatePost, deletePost, updateTopic, deleteTopic, timeAgo, roleLabel,
} from '../../lib/forum';
import { joinBody, splitBody } from '../../lib/forumImages';
import { Avatar } from './Avatar';
import { ForumEditor } from './ForumEditor';
import { PostBody } from './PostBody';

interface Props {
  topicId: string;
  categoryName: (id: string) => string;
  onBack: () => void;
  /** Avisa a lista que algo mudou (resposta, moderação, exclusão). */
  onChanged: () => void;
}

export const ForumTopicView: React.FC<Props> = ({ topicId, categoryName, onBack, onChanged }) => {
  const { user, role } = useAuth();
  const isStaff = role === 'admin' || role === 'first_mate';
  const [topic, setTopic] = useState<ForumTopic | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [replyImages, setReplyImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [t, p] = await Promise.all([fetchTopic(topicId), fetchPosts(topicId)]);
      setTopic(t);
      setPosts(p);
    } catch (e) {
      console.error('[Forum] tópico', e);
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => { load(); }, [load]);

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!reply.trim() && replyImages.length === 0) || uploading) return;
    setSending(true);
    setError(null);
    try {
      const post = await createPost(topicId, joinBody(reply, replyImages));
      setPosts((prev) => [...prev, post]);
      setReply('');
      setReplyImages([]);
      onChanged();
    } catch (err) {
      console.error('[Forum] responder', err);
      setError('Não foi possível enviar sua resposta. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  const moderate = async (patch: Partial<Pick<ForumTopic, 'is_pinned' | 'is_locked'>>) => {
    if (!topic) return;
    try {
      await updateTopic(topic.id, patch);
      setTopic({ ...topic, ...patch });
      onChanged();
    } catch (e) {
      console.error('[Forum] moderar', e);
    }
  };

  const removeTopic = async () => {
    if (!topic || !window.confirm('Excluir este tópico e todas as respostas?')) return;
    try {
      await deleteTopic(topic.id);
      onChanged();
      onBack();
    } catch (e) {
      console.error('[Forum] excluir tópico', e);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="space-y-6">
        <BackButton onClick={onBack} />
        <EmptyState icon={MessagesSquare} title="Tópico não encontrado" description="Ele pode ter sido removido." />
      </div>
    );
  }

  const canEditTopic = user?.id === topic.author_id || isStaff;
  const canReply = !topic.is_locked || isStaff;

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-3">
        <div className="shrink-0 pt-0.5"><BackButton onClick={onBack} /></div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="eyebrow inline-flex items-center gap-2">
            {categoryName(topic.category_id)}
            {topic.is_pinned && <Badge tone="accent"><Pin size={11} /> Fixado</Badge>}
            {topic.is_locked && <Badge tone="neutral"><Lock size={11} /> Trancado</Badge>}
          </p>
          <h1 className="font-display text-2xl font-semibold leading-tight text-fg break-words sm:text-3xl">{topic.title}</h1>
        </div>
      </header>

      {isStaff && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => moderate({ is_pinned: !topic.is_pinned })}>
            <Pin size={14} /> {topic.is_pinned ? 'Desafixar' : 'Fixar'}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => moderate({ is_locked: !topic.is_locked })}>
            {topic.is_locked ? <><Unlock size={14} /> Destrancar</> : <><Lock size={14} /> Trancar</>}
          </Button>
        </div>
      )}

      <PostCard
        authorName={topic.author_name}
        authorRole={topic.author_role}
        createdAt={topic.created_at}
        edited={topic.updated_at !== topic.created_at}
        body={topic.body}
        highlight
        canEdit={canEditTopic}
        onSave={async (body) => {
          await updateTopic(topic.id, { body });
          setTopic({ ...topic, body, updated_at: new Date().toISOString() });
        }}
        onDelete={removeTopic}
      />

      <div className="flex items-center gap-3">
        <p className="eyebrow-muted">{posts.length} {posts.length === 1 ? 'resposta' : 'respostas'}</p>
        <div className="hairline-neutral flex-1" aria-hidden />
      </div>

      <div className="space-y-3">
        {posts.map((p) => (
          <PostCard
            key={p.id}
            authorName={p.author_name}
            authorRole={p.author_role}
            createdAt={p.created_at}
            edited={p.updated_at !== p.created_at}
            body={p.body}
            canEdit={user?.id === p.author_id || isStaff}
            onSave={async (body) => {
              await updatePost(p.id, body);
              setPosts((prev) => prev.map((x) => (x.id === p.id ? { ...x, body, updated_at: new Date().toISOString() } : x)));
            }}
            onDelete={async () => {
              if (!window.confirm('Excluir esta resposta?')) return;
              try {
                await deletePost(p.id);
                setPosts((prev) => prev.filter((x) => x.id !== p.id));
                onChanged();
              } catch (e) {
                console.error('[Forum] excluir resposta', e);
              }
            }}
          />
        ))}
      </div>

      {canReply ? (
        <Card>
          <form onSubmit={sendReply} className="space-y-3">
            <label htmlFor="forum-reply" className="text-sm font-medium text-fg">Sua resposta</label>
            <ForumEditor
              id="forum-reply"
              text={reply}
              images={replyImages}
              onTextChange={setReply}
              onImagesChange={setReplyImages}
              onBusyChange={setUploading}
              placeholder="Escreva uma resposta construtiva."
            />
            {error && <FieldMessage error>{error}</FieldMessage>}
            <div className="flex justify-end">
              <Button type="submit" isLoading={sending} disabled={(!reply.trim() && replyImages.length === 0) || uploading}><Send size={16} /> Responder</Button>
            </div>
          </form>
        </Card>
      ) : (
        <p className="flex items-center justify-center gap-2 rounded-xl border border-tint/10 bg-tint/3 p-4 text-sm text-fg-muted">
          <Lock size={15} aria-hidden /> Este tópico foi trancado pela moderação e não aceita novas respostas.
        </p>
      )}
    </div>
  );
};

const PostCard: React.FC<{
  authorName: string;
  authorRole: string | null;
  createdAt: string;
  edited: boolean;
  body: string;
  highlight?: boolean;
  canEdit: boolean;
  onSave: (body: string) => Promise<void>;
  onDelete: () => void;
}> = ({ authorName, authorRole, createdAt, edited, body, highlight, canEdit, onSave, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [draftImages, setDraftImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const badge = roleLabel(authorRole);
  const canSave = (draft.trim().length > 0 || draftImages.length > 0) && !uploading;

  const startEditing = () => {
    const parts = splitBody(body);
    setDraft(parts.text);
    setDraftImages(parts.images);
    setEditing(true);
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave(joinBody(draft, draftImages));
      setEditing(false);
    } catch (e) {
      console.error('[Forum] editar', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className={highlight ? 'border-accent/20' : undefined}>
      <div className="flex items-start gap-3">
        <Avatar name={authorName} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="font-medium text-fg">{authorName}</span>
              {badge && <Badge tone="accent" className="px-1.5 py-0 text-[10px]">{badge}</Badge>}
              <span className="text-xs text-fg-subtle">{timeAgo(createdAt)}{edited && ' · editado'}</span>
            </p>
            {canEdit && !editing && (
              <div className="flex shrink-0 gap-1">
                <Button size="icon" variant="ghost" aria-label="Editar" title="Editar" onClick={startEditing}>
                  <Pencil size={15} />
                </Button>
                <Button size="icon" variant="ghost" aria-label="Excluir" title="Excluir" onClick={onDelete} className="hover:text-danger-fg">
                  <Trash2 size={15} />
                </Button>
              </div>
            )}
          </div>
          {editing ? (
            <div className="mt-3 space-y-2">
              <ForumEditor
                id={`forum-edit-${createdAt}`}
                text={draft}
                images={draftImages}
                onTextChange={setDraft}
                onImagesChange={setDraftImages}
                onBusyChange={setUploading}
                ariaLabel="Editar mensagem"
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
                <Button size="sm" isLoading={saving} disabled={!canSave} onClick={save}>Salvar</Button>
              </div>
            </div>
          ) : (
            <PostBody body={body} />
          )}
        </div>
      </div>
    </Card>
  );
};
