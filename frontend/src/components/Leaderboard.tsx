import type { LeaderboardEntry } from '../data/mysteries'

type LeaderboardProps = {
  entries: LeaderboardEntry[]
}

function Leaderboard({ entries }: LeaderboardProps) {
  return (
    <section id="ranking" className="rounded-[2rem] border border-zinc-800 bg-zinc-900/65 p-4 sm:p-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">ranking diario</p>
          <h3 className="mt-2 text-lg font-semibold text-zinc-100">Os mais rapidos.</h3>
        </div>
        <p className="text-xs text-zinc-500">mockado por enquanto</p>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-800">
        {entries.map((entry, index) => (
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

export default Leaderboard
