import type { Hint } from '../types'

type HintListProps = {
  hints: Hint[]
  unlockedCount: number
  nextHintLabel: string | null
  revealedCount: number
  onReveal: (index: number) => void
}

function HintList({ hints, unlockedCount, nextHintLabel, revealedCount, onReveal }: HintListProps) {
  return (
    <section id="dicas" className="rounded-[2rem] border border-zinc-800 bg-zinc-900/65 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">dicas</p>
          <h3 className="mt-2 text-lg font-semibold text-zinc-100">A resposta esta mais perto do que parece.</h3>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500">Liberadas</p>
          <p className="text-sm text-amber-200">
            {unlockedCount}/{hints.length}
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm text-zinc-400">
        {nextHintLabel ? `Proxima dica em ${nextHintLabel}.` : 'Todas as dicas respiram em aberto.'}
      </p>

      <div className="mt-4 grid gap-3">
        {hints.map((hint, index) => {
          const unlocked = index < unlockedCount
          const revealed = index < revealedCount

          return (
            <article
              key={`${hint.unlockAt}-${index}`}
              className={`rounded-2xl border p-4 ${
                unlocked ? 'border-zinc-800 bg-zinc-950/70' : 'border-zinc-900 bg-zinc-950/30'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] uppercase tracking-[0.28em] text-zinc-600">dica {index + 1}</p>
                <p className={`text-xs ${unlocked ? 'text-amber-200' : 'text-zinc-600'}`}>{hint.unlockAt}</p>
              </div>
              {unlocked ? (
                revealed ? (
                  <p className="mt-3 text-sm leading-6 text-zinc-300">{hint.text}</p>
                ) : (
                  <div className="mt-3">
                    <p className="text-sm text-zinc-500">Dica liberada. Clique para revelar.</p>
                    <button
                      className="mt-3 rounded-full border border-amber-200/30 px-4 py-2 text-xs uppercase tracking-[0.24em] text-amber-200 hover:border-amber-100"
                      onClick={() => onReveal(index)}
                      type="button"
                    >
                      Revelar
                    </button>
                  </div>
                )
              ) : (
                <p className="mt-3 text-sm leading-6 text-zinc-600">Dica bloqueada. O misterio ainda respira.</p>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default HintList
