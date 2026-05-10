import { useEffect, useState } from 'react'
import type { SocialPost, SocialPlanResponse } from '../types'

const PLATFORMS = {
  x: 'X/Twitter',
  instagram_feed: 'Instagram Feed',
  instagram_story: 'Instagram Story',
  tiktok: 'TikTok',
}

const PLATFORM_COLORS = {
  x: 'bg-zinc-800',
  instagram_feed: 'bg-pink-900',
  instagram_story: 'bg-purple-900',
  tiktok: 'bg-black',
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

function SocialRitual({ dateKey, mysteryTitle }: SocialRitualProps) {
  const [plan, setPlan] = useState<SocialPlanResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

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
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      className={`rounded border-l-2 border-l-zinc-600 p-3 ${PLATFORM_COLORS[post.platform]}`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex gap-2">
                          <span className="rounded bg-zinc-700 px-2 py-1 text-[10px] uppercase tracking-wider text-zinc-200">
                            {PLATFORMS[post.platform]}
                          </span>
                          <span className="rounded bg-zinc-700 px-2 py-1 text-[10px] uppercase tracking-wider text-zinc-300">
                            {post.type}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] uppercase tracking-wider ${
                            post.status === 'draft'
                              ? 'text-zinc-400'
                              : post.status === 'ready'
                                ? 'text-yellow-400'
                                : post.status === 'posted'
                                  ? 'text-green-400'
                                  : 'text-zinc-500'
                          }`}
                        >
                          {post.status}
                        </span>
                      </div>

                      <p className="mb-3 whitespace-pre-wrap break-words text-sm text-zinc-100">
                        {post.text}
                      </p>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCopy(post.text, post.id)}
                          className={`flex-1 rounded px-3 py-2 text-[11px] uppercase tracking-wider transition-colors ${
                            copied === post.id
                              ? 'bg-green-700 text-green-100'
                              : 'border border-zinc-600 bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                          }`}
                        >
                          {copied === post.id ? '✓ Copiado' : 'Copiar texto'}
                        </button>
                      </div>
                    </div>
                  ))}
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
