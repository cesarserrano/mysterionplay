import heroImage from '../assets/hero.png'
import type { YesterdayMystery as YesterdayMysteryType } from '../types'

type YesterdayMysteryProps = {
  mystery: YesterdayMysteryType
}

function YesterdayMystery({ mystery }: YesterdayMysteryProps) {
  const imageSrc = mystery.image === 'hero' ? heroImage : mystery.image

  return (
    <section className="rounded-[2rem] border border-zinc-800 bg-zinc-900/65 p-4 sm:p-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">ontem</p>
          <h3 className="mt-2 text-lg font-semibold text-zinc-100">{mystery.answer}</h3>
        </div>
        <p className="text-xs text-zinc-500">{mystery.date}</p>
      </div>

      <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-zinc-800 bg-zinc-950">
        <img alt={`Resposta anterior: ${mystery.answer}`} className="aspect-[4/3] w-full object-cover opacity-80" src={imageSrc} />
      </div>

      <p className="mt-4 text-sm leading-6 text-zinc-400">{mystery.explanation}</p>

      <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-800">
        {mystery.leaderboard.map((entry, index) => (
          <div
            key={`${entry.name}-${entry.time}`}
            className="grid grid-cols-[38px_1fr_58px_68px] items-center gap-3 border-b border-zinc-800 px-4 py-4 text-sm last:border-b-0 sm:grid-cols-[48px_1fr_72px_86px]"
          >
            <span className="text-zinc-500">#{index + 1}</span>
            <span className="font-medium text-zinc-100">{entry.name}</span>
            <span className="text-right text-amber-200">{entry.time}</span>
            <span className="text-right text-zinc-500">{entry.hintsUsed} dicas</span>
          </div>
        ))}
      </div>
    </section>
  )
}

export default YesterdayMystery
