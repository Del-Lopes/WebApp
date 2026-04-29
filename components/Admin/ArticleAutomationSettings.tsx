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
        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
          <Bot size={24} className="text-slate-600" />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Gerar Novo Artigo</h3>
          <p className="text-sm text-slate-500 font-medium">
            Cole a URL de uma postagem e gere um artigo adaptado.
          </p>
        </div>
      </div>

      {/* Generation form */}
      <form onSubmit={handleGenerate} className="space-y-5">

        {/* Source URL */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700">
            URL da postagem de referência
          </label>
          <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-3 bg-white focus-within:border-violet-500 transition-colors">
            <Link size={16} className="text-slate-400 shrink-0" />
            <input
              type="url"
              required
              placeholder="https://exemplo.com/artigo-didatico"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              className="flex-1 outline-none text-sm text-slate-800 placeholder:text-slate-400 bg-transparent"
            />
            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-violet-600 transition-colors"
                title="Abrir URL"
              >
                <ExternalLink size={14} />
              </a>
            )}
          </div>
          <p className="text-xs text-slate-400">
            A IA vai ler o conteúdo desta página e criar um artigo novo em pt-BR, usando as imagens da própria URL.
          </p>
        </div>

        {/* Persona */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700">
            Persona do redator IA
          </label>
          <textarea
            rows={2}
            value={settings.writer_persona}
            onChange={(e) => setSettings({ ...settings, writer_persona: e.target.value })}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500 resize-none transition-colors bg-white"
          />
        </div>

        {/* Category */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700">
            Categoria do artigo gerado
          </label>
          <input
            type="text"
            value={settings.default_category}
            onChange={(e) => setSettings({ ...settings, default_category: e.target.value })}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500 transition-colors bg-white"
            placeholder="Análise Geral"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={generating || !sourceUrl.trim()}
          className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-colors shadow-md shadow-violet-500/20"
        >
          {generating ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} />
          )}
          {generating ? statusMessage : 'Gerar artigo'}
        </button>
      </form>

      {/* Result feedback */}
      {result && (
        <div
          className={`flex items-start gap-3 px-4 py-3 rounded-xl text-sm font-medium border ${
            result.type === 'success'
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
        >
          {result.type === 'success' ? (
            <CheckCircle size={16} className="mt-0.5 shrink-0" />
          ) : (
            <XCircle size={16} className="mt-0.5 shrink-0" />
          )}
          <span>{result.message}</span>
        </div>
      )}

      <div className="h-[1px] w-full bg-slate-100 my-8" />

      {/* AI Configuration Section */}
      <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm overflow-hidden relative group">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <Sparkles size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Configurações de Automação IA</h3>
            <p className="text-sm text-slate-500 font-medium">Gerencie chaves de API e modelos para geração de conteúdo.</p>
          </div>
        </div>

        <form onSubmit={handleUpdateConfig} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Gemini Config */}
            <div className="space-y-4 p-6 bg-slate-50 rounded-[24px] border border-slate-100">
              <h4 className="font-bold text-slate-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Google Gemini
              </h4>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400">API Key</label>
                <input 
                  type="password" 
                  value={aiConfig.gemini_api_key || ''} 
                  onChange={e => setAiConfig({...aiConfig, gemini_api_key: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-medium focus:border-violet-500 transition-colors"
                  placeholder="Sk-..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400">Modelo Principal</label>
                <input 
                  type="text" 
                  value={aiConfig.gemini_model || ''} 
                  onChange={e => setAiConfig({...aiConfig, gemini_model: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-medium focus:border-violet-500 transition-colors"
                  placeholder="gemini-2.0-flash-lite"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400">Cascata 2 (Fallback 1)</label>
                <input 
                  type="text" 
                  value={aiConfig.gemini_model_2 || ''} 
                  onChange={e => setAiConfig({...aiConfig, gemini_model_2: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-medium focus:border-violet-500 transition-colors"
                  placeholder="gemini-2.0-flash"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400">Cascata 3 (Fallback 2)</label>
                <input 
                  type="text" 
                  value={aiConfig.gemini_model_3 || ''} 
                  onChange={e => setAiConfig({...aiConfig, gemini_model_3: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-medium focus:border-violet-500 transition-colors"
                  placeholder="gemini-1.5-pro"
                />
              </div>
            </div>

            {/* Groq Config */}
            <div className="space-y-4 p-6 bg-slate-50 rounded-[24px] border border-slate-100">
              <h4 className="font-bold text-slate-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                Groq (Fallback)
              </h4>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400">API Key</label>
                <input 
                  type="password" 
                  value={aiConfig.groq_api_key || ''} 
                  onChange={e => setAiConfig({...aiConfig, groq_api_key: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-medium focus:border-violet-500 transition-colors"
                  placeholder="gsk_..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400">Modelo</label>
                <input 
                  type="text" 
                  value={aiConfig.groq_model || ''} 
                  onChange={e => setAiConfig({...aiConfig, groq_model: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-medium focus:border-violet-500 transition-colors"
                  placeholder="llama-3.3-70b-versatile"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingConfig || configLoading}
              className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-[20px] font-black hover:bg-green-600 transition-all shadow-xl disabled:opacity-50"
            >
              {savingConfig ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
              Salvar Configurações
            </button>
          </div>
        </form>
      </div>

      {/* Execution Logs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-slate-800 flex items-center gap-2">
            <Clock size={18} className="text-slate-400" />
            Histórico de gerações
          </h4>
          <button
            type="button"
            onClick={fetchLogs}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-violet-600 transition-colors"
          >
            <RefreshCw size={13} /> Atualizar
          </button>
        </div>

        {logsLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-slate-400" size={22} />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-sm">
            Nenhuma geração registrada ainda.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">URL de referência</th>
                  <th className="text-left px-4 py-3 font-semibold">Modelo</th>
                  <th className="text-left px-4 py-3 font-semibold">Data</th>
                  <th className="text-left px-4 py-3 font-semibold">Erro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="bg-white hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      {log.status === 'success' ? (
                        <span className="flex items-center gap-1 text-green-600 font-medium">
                          <CheckCircle size={14} /> OK
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-500 font-medium">
                          <XCircle size={14} /> Erro
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-[220px]">
                      <a
                        href={log.topic}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-600 hover:underline text-xs truncate block"
                        title={log.topic}
                      >
                        {log.topic}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs whitespace-nowrap">
                      {log.model_used}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                      {new Date(log.created_at).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td
                      className="px-4 py-3 text-red-400 text-xs max-w-[160px] truncate"
                      title={log.error_message ?? ''}
                    >
                      {log.error_message ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Missing settings notice */}
        {!session && (
          <div className="flex items-center gap-2 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs">
            <AlertCircle size={14} />
            Sessão não encontrada — faça login novamente.
          </div>
        )}
      </div>
    </div>
  )
}
