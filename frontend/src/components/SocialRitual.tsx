import { useEffect, useState } from 'react'
import type { SocialPost, SocialPlanResponse } from '../types'

const PLATFORMS = {
  x: 'X/Twitter',
  instagram_feed: 'Instagram Feed',
  instagram_story: 'Instagram Story',
  tiktok: 'TikTok',
}

const STATUS_COLORS = {
  draft: 'bg-zinc-800 border-zinc-700 text-zinc-100',
  ready: 'bg-amber-900 border-amber-700 text-amber-100',
  posted: 'bg-green-900 border-green-700 text-green-100',
  skipped: 'bg-slate-800 border-slate-700 text-slate-100',
}

const STATUS_LABELS = {
  draft: 'Rascunho',
  ready: 'Pronto',
  posted: 'Publicado',
  skipped: 'Ignorado',
}

type SocialRitualProps = {
  dateKey: string
  mysteryTitle: string
}

function groupPostsByTime(posts: SocialPost[]) {
  const grouped: Record<string, SocialPost[]> = {}
  posts.forEach((post) => {
    if (!grouped[post.time]) {
      grouped[post.time] = []
    }
    grouped[post.time].push(post)
  })
  return grouped
}

function formatDate(isoDate: string) {
  if (!isoDate) return ''
  const date = new Date(isoDate)
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(date)
}

function SocialRitual({ dateKey, mysteryTitle }: SocialRitualProps) {
  const [plan, setPlan] = useState<SocialPlanResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [updatingPostId, setUpdatingPostId] = useState<string | null>(null)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<SocialPost>>({})

  useEffect(() => {
    async function fetchPlan() {
      try {
        setLoading(true)
        const response = await fetch(`/api/social/${dateKey}`)
        if (!response.ok) {
          throw new Error('Falha ao carregar plano social.')
        }
        const data = await response.json()
        setPlan(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
        setPlan(null)
      } finally {
        setLoading(false)
      }
    }

    void fetchPlan()
  }, [dateKey])

  const isMandatory = (time: string) => ['00:00', '09:00', '21:00'].includes(time)

  const handleCopy = (text: string, postId: string) => {
    navigator.clipboard.writeText(text)
    setCopied(postId)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleStatusChange = (post: SocialPost, newStatus: string) => {
    setEditingPostId(post.id)
    setEditData({
      ...post,
      status: newStatus as SocialPost['status'],
      postedAt: newStatus === 'posted' ? new Date().toISOString() : post.postedAt,
    })
  }

  const handleSaveStatus = async () => {
    if (!editingPostId || !plan) return

    try {
      setUpdatingPostId(editingPostId)
      const response = await fetch(`/api/social/${editingPostId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      })

      if (!response.ok) {
        throw new Error('Falha ao atualizar status.')
      }

      const data = await response.json()
      setPlan({
        ...plan,
        posts: plan.posts.map((p) => (p.id === editingPostId ? data.post : p)),
      })

      setEditingPostId(null)
      setEditData({})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar')
    } finally {
      setUpdatingPostId(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 rounded border border-zinc-700 bg-zinc-900 p-6">
        <p className="text-sm text-zinc-400">Carregando ritual social...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4 rounded border border-red-700 bg-red-950 p-6">
        <p className="text-sm text-red-300">{error}</p>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="space-y-4 rounded border border-zinc-700 bg-zinc-900 p-6">
        <p className="text-sm text-zinc-400">Nenhum plano disponível.</p>
      </div>
    )
  }

  const grouped = groupPostsByTime(plan.posts)
  const times = Object.keys(grouped).sort()

  return (
    <div className="space-y-6">
      {/* Legenda de cores */}
      <div className="rounded border border-zinc-700 bg-zinc-900 p-4">
        <p className="mb-3 text-xs uppercase tracking-wider text-zinc-500">Legenda de Status</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.entries(STATUS_LABELS) as Array<[keyof typeof STATUS_LABELS, string]>).map(([status, label]) => (
            <div key={status} className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded border ${STATUS_COLORS[status]}`}></div>
              <span className="text-xs text-zinc-300">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Posts */}
      <div className="rounded border border-zinc-700 bg-zinc-900 p-6">
        <div className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.45em] text-zinc-500">Ritual Social</p>
          <h3 className="mt-2 text-xl font-semibold text-zinc-50">{dateKey}</h3>
          <p className="mt-2 text-sm text-zinc-400">{mysteryTitle}</p>
        </div>

        <div className="space-y-4">
          {times.map((time) => {
            const posts = grouped[time]
            const mandatory = isMandatory(time)

            return (
              <div key={time} className="rounded border border-zinc-700 bg-zinc-950 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <p className="font-mono text-lg font-bold text-zinc-100">{time}</p>
                    {mandatory && (
                      <span className="inline-block rounded bg-red-900 px-2 py-1 text-[10px] uppercase tracking-wider text-red-200">
                        Obrigatório
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {posts.map((post) => {
                    const isEditing = editingPostId === post.id
                    const displayPost = isEditing ? editData : post

                    return (
                      <div
                        key={post.id}
                        className={`rounded border-l-4 p-4 transition-colors ${STATUS_COLORS[displayPost.status || 'draft']}`}
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded bg-zinc-700 px-2 py-1 text-[10px] uppercase tracking-wider text-zinc-200">
                              {PLATFORMS[post.platform]}
                            </span>
                            <span className="rounded bg-zinc-700 px-2 py-1 text-[10px] uppercase tracking-wider text-zinc-300">
                              {post.type}
                            </span>
                          </div>
                        </div>

                        <p className="mb-3 whitespace-pre-wrap break-words text-sm text-zinc-100">
                          {displayPost.text}
                        </p>

                        {/* Info de publicação */}
                        {displayPost.postedAt && (
                          <div className="mb-3 space-y-1 border-t border-current border-opacity-20 pt-2">
                            <p className="text-xs text-current text-opacity-80">
                              📅 Publicado: {formatDate(displayPost.postedAt)}
                            </p>
                            {displayPost.postedBy && (
                              <p className="text-xs text-current text-opacity-80">
                                👤 Por: {displayPost.postedBy}
                              </p>
                            )}
                            {displayPost.externalPostId && (
                              <p className="text-xs text-current text-opacity-80">
                                🔗 ID externo: {displayPost.externalPostId}
                              </p>
                            )}
                            {displayPost.errorMessage && (
                              <p className="text-xs text-red-200">
                                ⚠️ Erro: {displayPost.errorMessage}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Controles */}
                        {isEditing ? (
                          <div className="space-y-2 border-t border-current border-opacity-20 pt-3">
                            <div className="grid gap-2">
                              <label className="text-xs text-current text-opacity-75">
                                Status
                                <select
                                  className="mt-1 block w-full rounded bg-zinc-950 px-2 py-1 text-xs text-zinc-100"
                                  value={displayPost.status || 'draft'}
                                  onChange={(e) =>
                                    setEditData({
                                      ...editData,
                                      status: e.target.value as SocialPost['status'],
                                      postedAt:
                                        e.target.value === 'posted' ? new Date().toISOString() : editData.postedAt,
                                    })
                                  }
                                >
                                  {(Object.entries(STATUS_LABELS) as Array<[keyof typeof STATUS_LABELS, string]>).map(
                                    ([status, label]) => (
                                      <option key={status} value={status}>
                                        {label}
                                      </option>
                                    ),
                                  )}
                                </select>
                              </label>

                              {displayPost.status === 'posted' && (
                                <label className="text-xs text-current text-opacity-75">
                                  Publicado por (opcional)
                                  <input
                                    className="mt-1 block w-full rounded bg-zinc-950 px-2 py-1 text-xs text-zinc-100 placeholder-zinc-600"
                                    placeholder="Seu nome/usuário"
                                    type="text"
                                    value={editData.postedBy || ''}
                                    onChange={(e) => setEditData({ ...editData, postedBy: e.target.value })}
                                  />
                                </label>
                              )}
                            </div>

                            <div className="flex gap-2">
                              <button
                                className="flex-1 rounded bg-green-700 px-2 py-1 text-xs uppercase tracking-wider text-green-100 hover:bg-green-600 disabled:opacity-60"
                                disabled={updatingPostId === post.id}
                                onClick={() => void handleSaveStatus()}
                                type="button"
                              >
                                {updatingPostId === post.id ? '...' : 'Salvar'}
                              </button>
                              <button
                                className="flex-1 rounded border border-zinc-600 px-2 py-1 text-xs uppercase tracking-wider text-zinc-300 hover:border-zinc-500"
                                onClick={() => {
                                  setEditingPostId(null)
                                  setEditData({})
                                }}
                                type="button"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2 border-t border-current border-opacity-20 pt-3">
                            <button
                              className={`flex-1 rounded px-2 py-1 text-[11px] uppercase tracking-wider transition-colors ${
                                copied === post.id
                                  ? 'bg-green-700 text-green-100'
                                  : 'border border-current border-opacity-40 bg-zinc-950 text-current hover:border-opacity-60'
                              }`}
                              onClick={() => handleCopy(displayPost.text, post.id)}
                              type="button"
                            >
                              {copied === post.id ? '✓ Copiado' : 'Copiar'}
                            </button>
                            <button
                              className="flex-1 rounded border border-current border-opacity-40 bg-zinc-950 px-2 py-1 text-[11px] uppercase tracking-wider text-current hover:border-opacity-60"
                              onClick={() => handleStatusChange(displayPost as SocialPost, displayPost.status || 'draft')}
                              type="button"
                            >
                              Status
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default SocialRitual

