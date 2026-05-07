import heroImage from '../assets/hero.png'
import type { PublicMystery } from '../types'

type MysteryCardProps = {
  mystery: PublicMystery
}

function MysteryCard({ mystery }: MysteryCardProps) {
  const imageSrc = mystery.image === 'hero' ? heroImage : mystery.image

  return (
    <section
      id="misterio"
      className="rounded-[2rem] border border-zinc-800 bg-zinc-900/75 p-4 shadow-2xl shadow-black/40 sm:p-5"
    >
      <div className="overflow-hidden rounded-[1.5rem] border border-zinc-800 bg-zinc-950">
        <img
          alt={mystery.title}
          className="aspect-[4/3] w-full object-cover"
          src={imageSrc}
        />
      </div>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">misterio do dia</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
            {mystery.title}
          </h2>
        </div>
        <p className="rounded-full border border-zinc-800 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-zinc-500">
          {mystery.date}
        </p>
      </div>
    </section>
  )
}

export default MysteryCard
