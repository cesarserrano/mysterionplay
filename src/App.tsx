import { useEffect, useMemo, useState } from 'react'
import AnswerForm from './components/AnswerForm'
import HintList from './components/HintList'
import Leaderboard from './components/Leaderboard'
import MysteryCard from './components/MysteryCard'
import YesterdayMystery from './components/YesterdayMystery'
import { getTodaysMystery, getYesterdayMystery } from './data/mysteries'
import { isAcceptedAnswer } from './utils/normalizeAnswer'

const buildLabel = `v${__APP_VERSION__}-${__APP_COMMIT__}`

function getUnlockDate(dateKey: string, time: string) {
  return new Date(`${dateKey}T${time}:00`)
}

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0')
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

function App() {
  const [now, setNow] = useState(() => new Date())
  const [guess, setGuess] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [solved, setSolved] = useState(false)
  const [message, setMessage] = useState('Observe.')

  const todayMystery = useMemo(() => getTodaysMystery(now), [now])
  const yesterdayMystery = useMemo(() => getYesterdayMystery(now), [now])

  const unlockedCount = todayMystery.tips.filter((tip) => now >= getUnlockDate(todayMystery.date, tip.unlockAt)).length
  const nextLockedHint = todayMystery.tips.find((tip) => now < getUnlockDate(todayMystery.date, tip.unlockAt))

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date())
    }, 1000)

    return () => window.clearInterval(interval)
  }, [])

  function handleSubmit() {
    if (solved) {
      setMessage('Resposta aceita.')
      return
    }

    if (!guess.trim()) {
      setMessage('Escreva algo primeiro.')
      return
    }

    setAttempts((current) => current + 1)

    if (isAcceptedAnswer(guess, todayMystery.answer, todayMystery.aliases)) {
      setSolved(true)
      setMessage('Resposta aceita.')
      return
    }

    setMessage('Ainda nao.')
  }

  const nextHintLabel = nextLockedHint
    ? formatCountdown(getUnlockDate(todayMystery.date, nextLockedHint.unlockAt).getTime() - now.getTime())
    : null

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

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-6 sm:px-6 sm:pb-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <MysteryCard mystery={todayMystery} />
          <AnswerForm
            attempts={attempts}
            message={message}
            onChange={setGuess}
            onSubmit={handleSubmit}
            solved={solved}
            value={guess}
          />
        </div>

        <div className="space-y-4">
          <section className="rounded-[2rem] border border-zinc-800 bg-zinc-900/55 p-4 sm:p-5">
            <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">ritual</p>
            <p className="mt-3 text-2xl font-semibold text-zinc-50 sm:text-3xl">{nextHintLabel ?? '00:00:00'}</p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {nextHintLabel ? 'Tempo ate a proxima dica.' : 'Nenhum segredo resta escondido hoje.'}
            </p>
          </section>
          <Leaderboard entries={todayMystery.leaderboard} />
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-8 sm:px-6 sm:pb-12 lg:grid-cols-[1fr_0.9fr]">
        <HintList hints={todayMystery.tips} nextHintLabel={nextHintLabel} unlockedCount={unlockedCount} />
        <YesterdayMystery mystery={yesterdayMystery} />
      </section>

      <footer className="mx-auto flex max-w-6xl items-center justify-between px-4 pb-8 text-xs uppercase tracking-[0.3em] text-zinc-600 sm:px-6">
        <p>powered by vitrinum</p>
        <div className="text-right">
          <p>{solved ? todayMystery.explanation : 'Ainda nao.'}</p>
          <p className="mt-2 text-[10px] tracking-[0.28em] text-zinc-700">{buildLabel}</p>
        </div>
      </footer>
    </main>
  )
}

export default App
