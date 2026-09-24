import React, { useState, useEffect, useCallback } from 'react'
import {
  Bot,
  Sparkles,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Clock,
  Link,
  ExternalLink,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import {
  Badge, Button, Card, EmptyState, FieldMessage, Input, Label, Skeleton, Textarea,
  Table, THead, TBody, TR, TH, TD,
} from '../ui'

interface GenerationSettings {
  writer_persona: string
  default_category: string
}

interface AutomationLog {
  id: string
  article_id: string | null
  topic: string
  model_used: string
  status: 'success' | 'error'
  error_message: string | null
  created_at: string
}

interface GenerateResult {
  ok: boolean
  article_id?: string
  title?: string
  model?: string
  images_found?: number
  error?: string
}

interface AIConfiguration {
  id: string
  gemini_api_key: string | null
  gemini_model: string | null
  gemini_model_2: string | null
  gemini_model_3: string | null
  groq_api_key: string | null
  groq_model: string | null
}

const DEFAULT_PERSONA =
  'um educador com linguagem simplificada e de fácil entendimento para traders novatos.'

export const ArticleAutomationSettings: React.FC = () => {
  const { session } = useAuth()

  const [sourceUrl, setSourceUrl] = useState('')
  const [settings, setSettings] = useState<GenerationSettings>({
    writer_persona: DEFAULT_PERSONA,
    default_category: 'Análise Geral',
  })
  
  const [aiConfig, setAiConfig] = useState<AIConfiguration>({
    id: '00000000-0000-0000-0000-000000000001',
    gemini_api_key: '',
    gemini_model: 'gemini-2.0-flash-lite',
    gemini_model_2: 'gemini-2.0-flash',
    gemini_model_3: 'gemini-1.5-pro',
    groq_api_key: '',
    groq_model: 'llama-3.3-70b-versatile',
  })
  const [configLoading, setConfigLoading] = useState(true)
  const [savingConfig, setSavingConfig] = useState(false)

  const [logs, setLogs] = useState<AutomationLog[]>([])
  const [logsLoading, setLogsLoading] = useState(true)

  const [generating, setGenerating] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const fetchConfig = useCallback(async () => {
    setConfigLoading(true)
    const { data } = await supabase
      .from('ai_configurations')
      .select('*')
      .maybeSingle()
    if (data) setAiConfig(data as AIConfiguration)
    setConfigLoading(false)
  }, [])

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true)
    const { data } = await supabase
      .from('article_automation_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setLogs(data as AutomationLog[])
    setLogsLoading(false)
  }, [])

  useEffect(() => {
    fetchLogs()
    fetchConfig()
  }, [fetchLogs, fetchConfig])

  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingConfig(true)
    const { error } = await supabase
      .from('ai_configurations')
      .upsert(aiConfig)
    setSavingConfig(false)
    if (error) {
      alert('Erro ao salvar: ' + error.message)
    } else {
      setResult({ type: 'success', message: 'Configurações de IA salvas com sucesso!' })
      setTimeout(() => setResult(null), 3000)
    }
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session || !sourceUrl.trim()) return

    setGenerating(true)
    setStatusMessage('Iniciando...')
    setResult(null)

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-articles`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_url: sourceUrl.trim(),
          writer_persona: settings.writer_persona,
          default_category: settings.default_category,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
        throw new Error(errorData.error || `Erro na requisição: ${response.status}`)
      }

      if (!response.body) {
        throw new Error('Resposta sem corpo')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        
        if (value) {
          buffer += decoder.decode(value, { stream: true })
        }

        const lines = buffer.split('\n')
        // Keep the last chunk as buffer (might be an incomplete line)
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const data = JSON.parse(line)
            if (data.type === 'progress') {
              setStatusMessage(data.status)
            } else if (data.type === 'result') {
              setResult({
                type: 'success',
                message: `Artigo "${data.title}" gerado com sucesso via ${data.model}. ${data.images_found ?? 0} imagem(ns) importada(s).`,
              })
              setStatusMessage('Artigo gerado com sucesso!')
              setSourceUrl('')
              await fetchLogs()
            } else if (data.type === 'error') {
              throw new Error(data.error)
            }
          } catch (e) {
            console.error('Erro ao processar chunk:', e, line)
          }
        }
        
        if (done) {
          // Process any remaining data in the buffer just in case
          if (buffer.trim()) {
            try {
              const data = JSON.parse(buffer)
              if (data.type === 'progress') setStatusMessage(data.status)
              else if (data.type === 'result') {
                setResult({
                  type: 'success',
                  message: `Artigo "${data.title}" gerado com sucesso via ${data.model}. ${data.images_found ?? 0} imagem(ns) importada(s).`,
                })
                setStatusMessage('Artigo gerado com sucesso!')
                setSourceUrl('')
                await fetchLogs()
              }
              else if (data.type === 'error') throw new Error(data.error)
            } catch (e) {
               console.error('Erro ao processar chunk final:', e, buffer)
            }
          }
          break
        }
      }
    } catch (err: unknown) {
      setResult({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro desconhecido',
      })
      setStatusMessage('Falha ao gerar.')
    } finally {
      setGenerating(false)
      setTimeout(() => setResult(null), 8000)
    }
  }

  return (
    <div className="space-y-8 max-w-3xl">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-tint/5 border border-tint/10 rounded-2xl flex items-center justify-center shrink-0">
          <Bot size={24} className="text-fg-muted" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-xl font-semibold text-fg tracking-tight">Gerar Novo Artigo</h3>
          <p className="text-sm text-fg-muted">
            Cole a URL de uma postagem e gere um artigo adaptado.
          </p>
        </div>
      </div>

      {/* Generation form */}
      <form onSubmit={handleGenerate} className="space-y-5">

        {/* Source URL */}
        <div>
          <Label htmlFor="article-source-url">
            URL da postagem de referência
          </Label>
          <div className="flex items-center gap-2 rounded-lg bg-tint/3 border border-tint/10 px-3.5 py-2.5 transition-colors focus-within:border-accent/60 focus-within:ring-3 focus-within:ring-accent/20">
            <Link size={16} className="text-fg-subtle shrink-0" />
            <input
              id="article-source-url"
              type="url"
              required
              placeholder="https://exemplo.com/artigo-didatico"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              className="flex-1 min-w-0 outline-hidden text-sm text-fg placeholder:text-fg-subtle bg-transparent"
            />
            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-fg-subtle hover:text-accent-fg transition-colors rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                title="Abrir URL"
              >
                <ExternalLink size={14} />
              </a>
            )}
          </div>
          <FieldMessage>
            A IA vai ler o conteúdo desta página e criar um artigo novo em pt-BR, usando as imagens da própria URL.
          </FieldMessage>
        </div>

        {/* Persona */}
        <div>
          <Label htmlFor="article-writer-persona">
            Persona do redator IA
          </Label>
          <Textarea
            id="article-writer-persona"
            rows={2}
            value={settings.writer_persona}
            onChange={(e) => setSettings({ ...settings, writer_persona: e.target.value })}
            className="min-h-0 resize-none"
          />
        </div>

        {/* Category */}
        <div>
          <Label htmlFor="article-default-category">
            Categoria do artigo gerado
          </Label>
          <Input
            id="article-default-category"
            type="text"
            value={settings.default_category}
            onChange={(e) => setSettings({ ...settings, default_category: e.target.value })}
            placeholder="Análise Geral"
          />
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={generating || !sourceUrl.trim()}
          className="max-w-full"
        >
          {generating ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} />
          )}
          <span className="truncate">{generating ? statusMessage : 'Gerar artigo'}</span>
        </Button>
      </form>

      {/* Result feedback */}
      {result && (
        <div
          role={result.type === 'error' ? 'alert' : 'status'}
          className={`flex items-start gap-3 px-4 py-3 rounded-xl text-sm font-medium border ${
            result.type === 'success'
              ? 'bg-success/10 text-success-fg border-success/20'
              : 'bg-danger/10 text-danger-fg border-danger/20'
          }`}
        >
          {result.type === 'success' ? (
            <CheckCircle size={16} className="mt-0.5 shrink-0" />
          ) : (
            <XCircle size={16} className="mt-0.5 shrink-0" />
          )}
          <span className="min-w-0 break-words">{result.message}</span>
        </div>
      )}

      <div className="h-px w-full bg-tint/6 my-8" />

      {/* AI Configuration Section */}
      <Card className="relative overflow-hidden">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-center text-accent-fg shrink-0">
            <Sparkles size={24} />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-xl font-semibold text-fg tracking-tight">Configurações de Automação IA</h3>
            <p className="text-sm text-fg-muted">Gerencie chaves de API e modelos para geração de conteúdo.</p>
          </div>
        </div>

        <form onSubmit={handleUpdateConfig} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Gemini Config */}
            <div className="space-y-4 p-4 sm:p-6 bg-tint/3 rounded-2xl border border-tint/6">
              <h4 className="font-semibold text-fg flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent" />
                Google Gemini
              </h4>
              <div>
                <Label htmlFor="ai-gemini-key">API Key</Label>
                <Input
                  id="ai-gemini-key"
                  type="password"
                  value={aiConfig.gemini_api_key || ''}
                  onChange={e => setAiConfig({...aiConfig, gemini_api_key: e.target.value})}
                  className="font-mono"
                  placeholder="Sk-..."
                />
              </div>
              <div>
                <Label htmlFor="ai-gemini-model">Modelo Principal</Label>
                <Input
                  id="ai-gemini-model"
                  type="text"
                  value={aiConfig.gemini_model || ''}
                  onChange={e => setAiConfig({...aiConfig, gemini_model: e.target.value})}
                  className="font-mono"
                  placeholder="gemini-2.0-flash-lite"
                />
              </div>
              <div>
                <Label htmlFor="ai-gemini-model-2">Cascata 2 (Fallback 1)</Label>
                <Input
                  id="ai-gemini-model-2"
                  type="text"
                  value={aiConfig.gemini_model_2 || ''}
                  onChange={e => setAiConfig({...aiConfig, gemini_model_2: e.target.value})}
                  className="font-mono"
                  placeholder="gemini-2.0-flash"
                />
              </div>
              <div>
                <Label htmlFor="ai-gemini-model-3">Cascata 3 (Fallback 2)</Label>
                <Input
                  id="ai-gemini-model-3"
                  type="text"
                  value={aiConfig.gemini_model_3 || ''}
                  onChange={e => setAiConfig({...aiConfig, gemini_model_3: e.target.value})}
                  className="font-mono"
                  placeholder="gemini-1.5-pro"
                />
              </div>
            </div>

            {/* Groq Config */}
            <div className="space-y-4 p-4 sm:p-6 bg-tint/3 rounded-2xl border border-tint/6">
              <h4 className="font-semibold text-fg flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-fg-subtle" />
                Groq (Fallback)
              </h4>
              <div>
                <Label htmlFor="ai-groq-key">API Key</Label>
                <Input
                  id="ai-groq-key"
                  type="password"
                  value={aiConfig.groq_api_key || ''}
                  onChange={e => setAiConfig({...aiConfig, groq_api_key: e.target.value})}
                  className="font-mono"
                  placeholder="gsk_..."
                />
              </div>
              <div>
                <Label htmlFor="ai-groq-model">Modelo</Label>
                <Input
                  id="ai-groq-model"
                  type="text"
                  value={aiConfig.groq_model || ''}
                  onChange={e => setAiConfig({...aiConfig, groq_model: e.target.value})}
                  className="font-mono"
                  placeholder="llama-3.3-70b-versatile"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={savingConfig || configLoading}
              className="w-full sm:w-auto"
            >
              {savingConfig ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
              Salvar Configurações
            </Button>
          </div>
        </form>
      </Card>

      {/* Execution Logs */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h4 className="font-display font-semibold text-fg flex items-center gap-2">
            <Clock size={18} className="text-fg-subtle" />
            Histórico de gerações
          </h4>
          <Button variant="ghost" size="sm" onClick={fetchLogs} className="h-8 px-2.5 text-xs">
            <RefreshCw size={13} /> Atualizar
          </Button>
        </div>

        {logsLoading ? (
          <div className="space-y-2" aria-busy="true">
            {[0, 1, 2].map((k) => <Skeleton key={k} className="h-11 w-full rounded-lg" />)}
          </div>
        ) : logs.length === 0 ? (
          <EmptyState icon={Clock} title="Nenhuma geração registrada ainda." className="py-10" />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Status</TH>
                <TH>URL de referência</TH>
                <TH>Modelo</TH>
                <TH>Data</TH>
                <TH>Erro</TH>
              </tr>
            </THead>
            <TBody>
              {logs.map((log) => (
                <TR key={log.id}>
                  <TD>
                    {log.status === 'success' ? (
                      <Badge tone="success">
                        <CheckCircle size={14} /> OK
                      </Badge>
                    ) : (
                      <Badge tone="danger">
                        <XCircle size={14} /> Erro
                      </Badge>
                    )}
                  </TD>
                  <TD className="max-w-[220px]">
                    <a
                      href={log.topic}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-fg hover:underline underline-offset-4 text-xs truncate block rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                      title={log.topic}
                    >
                      {log.topic}
                    </a>
                  </TD>
                  <TD className="font-mono text-xs whitespace-nowrap">
                    {log.model_used}
                  </TD>
                  <TD className="font-mono tabular-nums whitespace-nowrap text-xs">
                    {new Date(log.created_at).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </TD>
                  <TD
                    className="text-danger-fg text-xs max-w-[160px] truncate"
                    title={log.error_message ?? ''}
                  >
                    {log.error_message ?? '—'}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}

        {/* Missing settings notice */}
        {!session && (
          <div className="flex items-center gap-2 mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg text-warning-fg text-xs">
            <AlertCircle size={14} className="shrink-0" />
            Sessão não encontrada — faça login novamente.
          </div>
        )}
      </div>
    </div>
  )
}
