import { useEffect, useMemo, useState } from 'react'
import AdminPanel from './components/AdminPanel'
import AnswerForm from './components/AnswerForm'
import HintList from './components/HintList'
import Leaderboard from './components/Leaderboard'
import MysteryCard from './components/MysteryCard'
import YesterdayMystery from './components/YesterdayMystery'
import {
  adminLogout,
  adminLogin,
  createAdminMystery,
  deleteAdminMystery,
  fetchAdminMysteries,
  fetchAdminSubmissions,
  fetchGame,
  resetAdminSubmissions,
  submitGuess,
  uploadAdminImage,
  updateAdminMystery,
} from './lib/api'
import type { AdminMystery, AdminSubmission, GamePayload } from './types'

const buildLabel = `v${__APP_VERSION__}-${__APP_COMMIT__}`
const PLAYER_ID_KEY = 'mysterionplay.player-id'
const PLAYER_NAME_KEY = 'mysterionplay.player-name'

function getRoute() {
  return window.location.pathname.startsWith('/admin') ? 'admin' : 'game'
}

function getOrCreatePlayerId() {
  const existing = window.localStorage.getItem(PLAYER_ID_KEY)
  if (existing) {
    return existing
  }

  const next =
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `player-${Math.random().toString(36).slice(2, 10)}`
  window.localStorage.setItem(PLAYER_ID_KEY, next)
  return next
}

function getInitialPlayerName() {
  const stored = window.localStorage.getItem(PLAYER_NAME_KEY)
  if (stored) {
    return stored
  }

  const generated = `visitante_${Math.random().toString(36).slice(2, 6)}`
  window.localStorage.setItem(PLAYER_NAME_KEY, generated)
  return generated
}

function toLocalDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getUnlockStatus(dateKey: string, unlockAt: string, now: Date) {
  const todayKey = toLocalDateKey(now)
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  if (dateKey < todayKey) {
    return true
  }

  if (dateKey > todayKey) {
    return false
  }

  return unlockAt <= currentTime
}

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0')
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

function getNextHintLabel(game: GamePayload | null, now: Date) {
  if (!game) {
    return null
  }

  const pendingTip = game.today.tips.find((tip) => !getUnlockStatus(game.today.date, tip.unlockAt, now))
  if (!pendingTip) {
    return null
  }

  const unlockDate = new Date(`${game.today.date}T${pendingTip.unlockAt}:00`)
  return formatCountdown(unlockDate.getTime() - now.getTime())
}

function App() {
  const [route, setRoute] = useState<'game' | 'admin'>(() => getRoute())
  const [now, setNow] = useState(() => new Date())
  const [playerId] = useState(() => getOrCreatePlayerId())
  const [nickname, setNickname] = useState(() => getInitialPlayerName())
  const [guess, setGuess] = useState('')
  const [message, setMessage] = useState('Observe.')
  const [busy, setBusy] = useState(false)
  const [game, setGame] = useState<GamePayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [adminAuthenticated, setAdminAuthenticated] = useState(false)
  const [adminChecked, setAdminChecked] = useState(false)
  const [adminDraftToken, setAdminDraftToken] = useState('')
  const [adminBusy, setAdminBusy] = useState(false)
  const [adminError, setAdminError] = useState<string | null>(null)
  const [adminMysteries, setAdminMysteries] = useState<AdminMystery[]>([])
  const [adminSubmissions, setAdminSubmissions] = useState<AdminSubmission[]>([])

  useEffect(() => {
    const onPopState = () => setRoute(getRoute())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    window.localStorage.setItem(PLAYER_NAME_KEY, nickname)
  }, [nickname])

  useEffect(() => {
    if (route === 'game') {
      let cancelled = false
      const load = async () => {
        try {
          const payload = await fetchGame(playerId)
          if (cancelled) {
            return
          }

          setGame(payload)
          setError(null)
          if (payload.player) {
            setNickname(payload.player.name)
          }
        } catch (loadError) {
          if (!cancelled) {
            setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar o misterio.')
          }
        }
      }

      void load()
      const interval = window.setInterval(() => {
        void load()
      }, 60000)
      return () => {
        cancelled = true
        window.clearInterval(interval)
      }
    }

    return undefined
  }, [playerId, route])

  useEffect(() => {
    if (route === 'admin') {
      let cancelled = false
      const load = async () => {
        try {
          const payload = await fetchAdminMysteries()
          if (!cancelled) {
            setAdminAuthenticated(true)
            setAdminError(null)
            setAdminChecked(true)
            setAdminMysteries(payload.mysteries)
          }
        } catch (loadError) {
          if (!cancelled) {
            setAdminAuthenticated(false)
            setAdminChecked(true)
            setAdminError(loadError instanceof Error ? loadError.message : 'Sessao invalida.')
          }
        }
      }

      void load()
      return () => {
        cancelled = true
      }
    }

    return undefined
  }, [route])

  const unlockedCount = useMemo(() => {
    if (!game) {
      return 0
    }

    return game.today.tips.filter((tip) => getUnlockStatus(game.today.date, tip.unlockAt, now)).length
  }, [game, now])

  const nextHintLabel = useMemo(() => getNextHintLabel(game, now), [game, now])

  async function handleSubmit() {
    if (!guess.trim()) {
      setMessage('Escreva algo primeiro.')
      return
    }

    setBusy(true)
    try {
      const response = await submitGuess({
        playerId,
        nickname,
        guess,
      })

      setMessage(response.message)
      setGuess('')
      if (response.leaderboard && game) {
        setGame({
          ...game,
          leaderboard: response.leaderboard,
          player: {
            playerId,
            name: nickname,
            attempts: response.attempts,
            solved: response.solved,
            hintsUsed: unlockedCount,
          },
        })
      }
      const payload = await fetchGame(playerId)
      setGame(payload)
      if (payload.player) {
        setNickname(payload.player.name)
      }
    } catch (submitError) {
      setMessage(submitError instanceof Error ? submitError.message : 'Falha ao responder.')
    } finally {
      setBusy(false)
    }
  }

  async function handleAdminLogin() {
    setAdminBusy(true)
    setAdminError(null)
    try {
      await adminLogin(adminDraftToken)
      setAdminDraftToken('')
      const payload = await fetchAdminMysteries()
      setAdminAuthenticated(true)
      setAdminChecked(true)
      setAdminMysteries(payload.mysteries)
    } catch (loginError) {
      setAdminError(loginError instanceof Error ? loginError.message : 'Falha no login.')
    } finally {
      setAdminBusy(false)
    }
  }

  function navigate(nextRoute: 'game' | 'admin') {
    const path = nextRoute === 'admin' ? '/admin' : '/'
    if (nextRoute === 'admin') {
      setAdminChecked(false)
    }
    window.history.pushState({}, '', path)
    setRoute(nextRoute)
  }

  if (route === 'admin' && !adminChecked) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-10 sm:px-6">
          <section className="w-full rounded-[2rem] border border-zinc-800 bg-zinc-900/70 p-5 sm:p-6">
            <p className="text-[11px] uppercase tracking-[0.45em] text-zinc-500">admin</p>
            <h1 className="mt-3 text-3xl font-semibold text-zinc-50">Verificando a sala.</h1>
          </section>
        </div>
      </main>
    )
  }

  if (route === 'admin' && !adminAuthenticated) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-10 sm:px-6">
          <section className="w-full rounded-[2rem] border border-zinc-800 bg-zinc-900/70 p-5 sm:p-6">
            <p className="text-[11px] uppercase tracking-[0.45em] text-zinc-500">admin</p>
            <h1 className="mt-3 text-3xl font-semibold text-zinc-50">Entre com o token.</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-400">Sem painel magico. So a chave certa.</p>
            <div className="mt-5 grid gap-3">
              <input
                className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3"
                onChange={(event) => setAdminDraftToken(event.target.value)}
                placeholder="ADMIN_TOKEN"
                type="password"
                value={adminDraftToken}
              />
              <button
                className="rounded-2xl bg-amber-200 px-6 py-3 font-medium text-zinc-950 disabled:opacity-70"
                disabled={adminBusy}
                onClick={() => void handleAdminLogin()}
                type="button"
              >
                {adminBusy ? 'Entrando...' : 'Entrar'}
              </button>
              <button
                className="text-sm text-zinc-500 hover:text-zinc-300"
                onClick={() => navigate('game')}
                type="button"
              >
                Voltar ao site
              </button>
            </div>
            {adminError ? <p className="mt-4 text-sm text-red-300">{adminError}</p> : null}
          </section>
        </div>
      </main>
    )
  }

  if (route === 'admin') {
    return (
      <AdminPanel
        mysteries={adminMysteries}
        onCreate={async (mystery) => {
          await createAdminMystery(mystery)
          const payload = await fetchAdminMysteries()
          setAdminMysteries(payload.mysteries)
        }}
        onDelete={async (mysteryId) => {
          await deleteAdminMystery(mysteryId)
          const payload = await fetchAdminMysteries()
          setAdminMysteries(payload.mysteries)
        }}
        onLoadSubmissions={async (mysteryId) => {
          const payload = await fetchAdminSubmissions(mysteryId)
          setAdminSubmissions(payload.submissions)
        }}
        onLogout={async () => {
          await adminLogout()
          setAdminAuthenticated(false)
          setAdminChecked(true)
          navigate('game')
        }}
        onResetSubmissions={async (mysteryId) => {
          await resetAdminSubmissions(mysteryId)
          const payload = await fetchAdminSubmissions(mysteryId)
          setAdminSubmissions(payload.submissions)
        }}
        onUploadImage={async (file) => {
          const payload = await uploadAdminImage(file)
          return payload.imageUrl
        }}
        onUpdate={async (mystery) => {
          await updateAdminMystery(mystery)
          const payload = await fetchAdminMysteries()
          setAdminMysteries(payload.mysteries)
        }}
        submissions={adminSubmissions}
      />
    )
  }

  const solved = Boolean(game?.player?.solved)

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(120,113,108,0.15),transparent_30%),linear-gradient(180deg,#09090b_0%,#111111_45%,#09090b_100%)] text-zinc-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6 sm:py-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.45em] text-zinc-500">mysterionplay</p>
          <h1 className="mt-2 text-xl font-semibold tracking-[0.18em] text-zinc-50 sm:text-2xl">Observe.</h1>
        </div>
        <nav className="hidden gap-6 text-sm text-zinc-500 sm:flex">
          <a className="hover:text-zinc-100" href="#misterio">
            Misterio
          </a>
          <a className="hover:text-zinc-100" href="#dicas">
            Dicas
          </a>
          <a className="hover:text-zinc-100" href="#ranking">
            Ranking
          </a>
        </nav>
      </header>

      {error ? <p className="mx-auto max-w-6xl px-4 text-sm text-red-300 sm:px-6">{error}</p> : null}

      {game ? (
        <>
          <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-6 sm:px-6 sm:pb-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <MysteryCard mystery={game.today} />
              <AnswerForm
                attempts={game.player?.attempts ?? 0}
                busy={busy}
                message={message}
                nickname={nickname}
                onChange={setGuess}
                onNicknameChange={setNickname}
                onSubmit={() => void handleSubmit()}
                solved={solved}
                value={guess}
              />
            </div>

            <div className="space-y-4">
              <section className="rounded-[2rem] border border-zinc-800 bg-zinc-900/55 p-4 sm:p-5">
                <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">ritual</p>
                <p className="mt-3 text-2xl font-semibold text-zinc-50 sm:text-3xl">
                  {nextHintLabel ?? '00:00:00'}
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  {nextHintLabel ? 'Tempo ate a proxima dica.' : 'Nenhum segredo resta escondido hoje.'}
                </p>
              </section>
              {game.tomorrow ? (
                <section className="rounded-[2rem] border border-zinc-800 bg-zinc-900/45 p-4 sm:p-5">
                  <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">amanha</p>
                  <p className="mt-3 text-lg font-semibold text-zinc-50">{game.tomorrow.title}</p>
                  <p className="mt-2 text-sm text-zinc-400">{game.tomorrow.date}</p>
                </section>
              ) : null}
              <Leaderboard entries={game.leaderboard} />
            </div>
          </section>

          <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-8 sm:px-6 sm:pb-12 lg:grid-cols-[1fr_0.9fr]">
            <HintList hints={game.today.tips} nextHintLabel={nextHintLabel} unlockedCount={unlockedCount} />
            {game.yesterday ? <YesterdayMystery mystery={game.yesterday} /> : null}
          </section>

          <footer className="mx-auto flex max-w-6xl items-center justify-between px-4 pb-8 text-xs uppercase tracking-[0.3em] text-zinc-600 sm:px-6">
            <p>powered by vitrinum</p>
            <div className="text-right">
              <p>{solved ? game.today.explanation : 'O misterio ainda respira.'}</p>
              <p className="mt-2 text-[10px] tracking-[0.28em] text-zinc-700">{buildLabel}</p>
            </div>
          </footer>
        </>
      ) : (
        <div className="mx-auto max-w-6xl px-4 py-16 text-sm text-zinc-500 sm:px-6">Carregando o misterio.</div>
      )}
    </main>
  )
}

export default App
