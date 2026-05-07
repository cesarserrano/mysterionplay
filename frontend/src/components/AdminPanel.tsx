import { useEffect, useRef, useState } from 'react'
import type { AdminMystery, AdminSubmission } from '../types'

type AdminPanelProps = {
  mysteries: AdminMystery[]
  submissions: AdminSubmission[]
  onCreate: (mystery: AdminMystery) => Promise<void>
  onDelete: (mysteryId: string) => Promise<void>
  onLoadSubmissions: (mysteryId: string) => Promise<void>
  onResetSubmissions: (mysteryId: string) => Promise<void>
  onUploadImage: (file: File) => Promise<string>
  onUpdate: (mystery: AdminMystery) => Promise<void>
  onLogout: () => void
}

function emptyMystery(): AdminMystery {
  return {
    id: '',
    date: '',
    title: '',
    image: 'hero',
    answer: '',
    aliases: [],
    explanation: '',
    tips: [
      { unlockAt: '09:00', text: '' },
      { unlockAt: '12:00', text: '' },
      { unlockAt: '15:00', text: '' },
      { unlockAt: '18:00', text: '' },
      { unlockAt: '21:00', text: '' },
    ],
  }
}

function AdminPanel({
  mysteries,
  submissions,
  onCreate,
  onDelete,
  onLoadSubmissions,
  onResetSubmissions,
  onUploadImage,
  onUpdate,
  onLogout,
}: AdminPanelProps) {
  const [selectedId, setSelectedId] = useState(mysteries[0]?.id ?? 'new')
  const [draft, setDraft] = useState<AdminMystery>(mysteries[0] ?? emptyMystery())
  const [status, setStatus] = useState('Pronto.')
  const [busy, setBusy] = useState(false)
  const loadSubmissionsRef = useRef(onLoadSubmissions)

  useEffect(() => {
    loadSubmissionsRef.current = onLoadSubmissions
  }, [onLoadSubmissions])

  useEffect(() => {
    if (selectedId !== 'new') {
      void loadSubmissionsRef.current(selectedId)
    }
  }, [selectedId])

  const selectedMystery = mysteries.find((mystery) => mystery.id === selectedId) ?? null
  const isNew = selectedId === 'new' || selectedMystery === null

  async function handleSave() {
    setBusy(true)
    setStatus('Salvando...')

    const payload: AdminMystery = {
      ...draft,
      aliases: draft.aliases.map((alias) => alias.trim()).filter(Boolean),
      tips: draft.tips.map((tip) => ({
        unlockAt: tip.unlockAt.trim(),
        text: tip.text.trim(),
      })),
    }

    try {
      if (isNew) {
        await onCreate(payload)
        setStatus('Misterio criado.')
        return
      }

      await onUpdate(payload)
      setStatus('Misterio salvo.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Falha ao salvar misterio.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.45em] text-zinc-500">admin</p>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-50">Sala de controle</h1>
        </div>
        <button
          className="rounded-2xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-400"
          onClick={onLogout}
          type="button"
        >
          Sair
        </button>
      </header>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-8 sm:px-6 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-[2rem] border border-zinc-800 bg-zinc-900/65 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm uppercase tracking-[0.35em] text-zinc-500">misterios</h2>
            <button
              className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:border-zinc-400"
              onClick={() => {
                setSelectedId('new')
                setDraft(emptyMystery())
              }}
              type="button"
            >
              Novo
            </button>
          </div>

          <div className="mt-4 grid gap-2">
            {mysteries.map((mystery) => (
              <button
                key={mystery.id}
                className={`rounded-2xl border px-4 py-3 text-left ${
                  selectedId === mystery.id ? 'border-amber-200/40 bg-amber-200/10' : 'border-zinc-800 bg-zinc-950/60'
                }`}
                onClick={() => {
                  setSelectedId(mystery.id)
                  setDraft(mystery)
                }}
                type="button"
              >
                <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">{mystery.date}</p>
                <p className="mt-2 text-sm font-medium text-zinc-100">{mystery.title}</p>
              </button>
            ))}
          </div>
        </aside>

        <div className="space-y-4">
          <section className="rounded-[2rem] border border-zinc-800 bg-zinc-900/65 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">
                  {isNew ? 'novo misterio' : draft.id}
                </p>
                <p className="mt-2 text-sm text-zinc-400">{status}</p>
              </div>
              {!isNew ? (
                <button
                  className="rounded-2xl border border-red-500/30 px-4 py-2 text-sm text-red-200 hover:border-red-400 disabled:opacity-60"
                  disabled={busy}
                  onClick={async () => {
                    try {
                      setBusy(true)
                      setStatus('Excluindo...')
                      await onDelete(draft.id)
                      setSelectedId('new')
                      setDraft(emptyMystery())
                      setStatus('Misterio removido.')
                    } catch (error) {
                      setStatus(error instanceof Error ? error.message : 'Falha ao excluir misterio.')
                    } finally {
                      setBusy(false)
                    }
                  }}
                  type="button"
                >
                  Excluir
                </button>
              ) : null}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className="text-zinc-400">ID</span>
                <input
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3"
                  disabled={!isNew}
                  onChange={(event) => setDraft({ ...draft, id: event.target.value })}
                  value={draft.id}
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="text-zinc-400">Data</span>
                <input
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3"
                  onChange={(event) => setDraft({ ...draft, date: event.target.value })}
                  type="date"
                  value={draft.date}
                />
              </label>
              <label className="grid gap-2 text-sm sm:col-span-2">
                <span className="text-zinc-400">Titulo</span>
                <input
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3"
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  value={draft.title}
                />
              </label>
              <label className="grid gap-2 text-sm sm:col-span-2">
                <span className="text-zinc-400">Imagem</span>
                <input
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3"
                  onChange={(event) => setDraft({ ...draft, image: event.target.value })}
                  placeholder="hero, /mysteries/001.jpg ou https://..."
                  value={draft.image}
                />
                <input
                  accept="image/*"
                  className="text-xs text-zinc-500 file:mr-4 file:rounded-full file:border-0 file:bg-zinc-800 file:px-4 file:py-2 file:text-zinc-200"
                  onChange={async (event) => {
                    const file = event.target.files?.[0]
                    if (!file) {
                      return
                    }

                    try {
                      setBusy(true)
                      setStatus('Enviando imagem...')
                      const imageUrl = await onUploadImage(file)
                      setDraft((current) => ({ ...current, image: imageUrl }))
                      setStatus('Imagem enviada.')
                    } catch (error) {
                      setStatus(error instanceof Error ? error.message : 'Falha ao enviar imagem.')
                    } finally {
                      event.target.value = ''
                      setBusy(false)
                    }
                  }}
                  type="file"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="text-zinc-400">Resposta</span>
                <input
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3"
                  onChange={(event) => setDraft({ ...draft, answer: event.target.value })}
                  value={draft.answer}
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="text-zinc-400">Aliases</span>
                <input
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3"
                  onChange={(event) =>
                    setDraft({ ...draft, aliases: event.target.value.split(',').map((value) => value.trim()) })
                  }
                  placeholder="resposta 2, resposta 3"
                  value={draft.aliases.join(', ')}
                />
              </label>
              <label className="grid gap-2 text-sm sm:col-span-2">
                <span className="text-zinc-400">Explicacao</span>
                <textarea
                  className="min-h-28 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3"
                  onChange={(event) => setDraft({ ...draft, explanation: event.target.value })}
                  value={draft.explanation}
                />
              </label>
            </div>

            <div className="mt-5 grid gap-3">
              {draft.tips.map((tip, index) => (
                <div
                  key={`${index}-${tip.unlockAt}`}
                  className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 sm:grid-cols-[110px_1fr]"
                >
                  <input
                    className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2"
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        tips: draft.tips.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, unlockAt: event.target.value } : entry,
                        ),
                      })
                    }
                    placeholder="09:00"
                    value={tip.unlockAt}
                  />
                  <input
                    className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2"
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        tips: draft.tips.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, text: event.target.value } : entry,
                        ),
                      })
                    }
                    placeholder={`Dica ${index + 1}`}
                    value={tip.text}
                  />
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                className="rounded-2xl bg-amber-200 px-5 py-3 text-sm font-medium text-zinc-950 hover:bg-amber-100 disabled:opacity-60"
                disabled={busy}
                onClick={() => void handleSave()}
                type="button"
              >
                {busy ? 'Processando...' : isNew ? 'Criar misterio' : 'Salvar misterio'}
              </button>
              {!isNew ? (
                <button
                  className="rounded-2xl border border-zinc-700 px-5 py-3 text-sm text-zinc-300 hover:border-zinc-400 disabled:opacity-60"
                  disabled={busy}
                  onClick={async () => {
                    try {
                      setBusy(true)
                      setStatus('Resetando ranking...')
                      await onResetSubmissions(draft.id)
                      setStatus('Ranking resetado.')
                    } catch (error) {
                      setStatus(error instanceof Error ? error.message : 'Falha ao resetar ranking.')
                    } finally {
                      setBusy(false)
                    }
                  }}
                  type="button"
                >
                  Resetar ranking
                </button>
              ) : null}
            </div>
          </section>

          <section className="rounded-[2rem] border border-zinc-800 bg-zinc-900/65 p-4 sm:p-5">
            <h2 className="text-sm uppercase tracking-[0.35em] text-zinc-500">submissoes</h2>
            <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-800">
              {submissions.length === 0 ? (
                <p className="px-4 py-5 text-sm text-zinc-500">Nenhuma submissao ainda.</p>
              ) : (
                submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="grid grid-cols-[1fr_70px_72px] items-center gap-3 border-b border-zinc-800 px-4 py-4 text-sm last:border-b-0 sm:grid-cols-[1fr_90px_90px_160px]"
                  >
                    <span className="font-medium text-zinc-100">{submission.name}</span>
                    <span className="text-right text-zinc-400">{submission.attempts} tent.</span>
                    <span className="text-right text-amber-200">{submission.hintsUsed} dicas</span>
                    <span className="hidden text-right text-zinc-500 sm:block">
                      {submission.solvedAt ? 'Resolvido' : 'Em aberto'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}

export default AdminPanel
