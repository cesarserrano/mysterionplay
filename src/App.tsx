const hints = [
  { time: '10:00', text: 'A resposta parece obvia so depois que aparece.' },
  { time: '13:00', text: 'Olhe para fora do centro.' },
  { time: '16:00', text: 'Nem tudo esta no primeiro plano.' },
  { time: '19:00', text: 'O nome importa mais que a forma.' },
  { time: '22:00', text: 'Pense em espelho.' },
]

const ranking = [
  { name: 'nocturno', score: 96, time: '08:14' },
  { name: 'cesar', score: 88, time: '09:03' },
  { name: 'pixel_13', score: 74, time: '11:42' },
  { name: 'anagrama', score: 61, time: '15:20' },
  { name: 'oraculo', score: 42, time: '20:08' },
]

function App() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6 sm:py-6">
        <div>
          <p className="text-xs uppercase tracking-[0.45em] text-violet-400/70">powered by vitrinum</p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">MysterionPlay</h1>
        </div>
        <nav className="hidden gap-6 text-sm text-zinc-400 sm:flex">
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

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 sm:py-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <div className="order-2 lg:order-1">
          <p className="inline-flex rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1.5 text-xs text-violet-200">
            Um misterio por dia
          </p>
          <h2 className="mt-4 max-w-xl text-3xl font-bold tracking-tight text-zinc-50 sm:text-5xl">
            Olhe a imagem e responda.
          </h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-zinc-400 sm:text-base">
            As dicas entram ao longo do dia se voce precisar.
          </p>
          <a
            href="#ranking"
            className="mt-5 inline-flex rounded-2xl border border-zinc-700 px-5 py-3 text-sm font-medium text-zinc-200 hover:border-zinc-400"
          >
            Ver ranking
          </a>
        </div>

        <div
          id="misterio"
          className="order-1 rounded-[2rem] border border-zinc-800 bg-zinc-900/70 p-4 shadow-2xl shadow-black/40 sm:p-5 lg:order-2"
        >
          <div className="aspect-[4/3] rounded-[1.5rem] border border-zinc-800 bg-[radial-gradient(circle_at_35%_30%,rgba(139,92,246,0.28),transparent_32%),linear-gradient(135deg,#18181b,#09090b)] p-4 sm:p-6">
            <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-zinc-700 text-center">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-zinc-500 sm:text-sm">misterio do dia</p>
                <p className="mt-3 text-2xl font-semibold text-zinc-100 sm:mt-4 sm:text-3xl">A Sala Sem Porta</p>
                <p className="mt-2 text-xs text-zinc-500 sm:mt-3 sm:text-sm">placeholder da imagem/enigma</p>
              </div>
            </div>
          </div>

          <form className="mt-4 flex flex-col gap-3 sm:mt-5 sm:flex-row">
            <input
              className="min-w-0 flex-1 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-violet-400/70"
              placeholder="Digite sua resposta"
            />
            <button className="rounded-2xl bg-violet-500 px-6 py-3 font-medium text-white hover:bg-violet-400" type="button">
              Enviar
            </button>
          </form>
          <p className="mt-3 text-xs text-zinc-500 sm:text-sm">Tentativas: 0 | Pontuacao maxima atual: 100</p>
        </div>
      </section>

      <section id="dicas" className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Dicas</h3>
          <a className="text-xs text-zinc-500 hover:text-zinc-300" href="#misterio">
            Voltar ao enigma
          </a>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {hints.map((hint, index) => (
            <article key={hint.time} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.25em] text-zinc-600">dica {index + 1}</p>
                <p className="text-xs text-violet-300">{hint.time}</p>
              </div>
              <p className="mt-3 text-sm leading-5 text-zinc-400">{hint.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="ranking" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="rounded-[2rem] border border-zinc-800 bg-zinc-900/70 p-6">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-zinc-600">temporada zero</p>
              <h3 className="mt-2 text-2xl font-semibold sm:text-3xl">Ranking diario</h3>
            </div>
            <p className="hidden text-sm text-zinc-500 sm:block">mockado por enquanto</p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-800">
            {ranking.map((player, index) => (
              <div
                key={player.name}
                className="grid grid-cols-[44px_1fr_72px_64px] items-center border-b border-zinc-800 px-4 py-4 text-sm last:border-b-0 sm:grid-cols-[56px_1fr_90px_80px]"
              >
                <span className="text-zinc-500">#{index + 1}</span>
                <span className="font-medium text-zinc-100">{player.name}</span>
                <span className="text-right text-violet-300">{player.score} pts</span>
                <span className="text-right text-zinc-500">{player.time}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
