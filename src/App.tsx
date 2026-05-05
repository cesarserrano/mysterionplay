const hints = [
  { time: '10:00', text: 'A resposta parece óbvia apenas depois que você a encontra.' },
  { time: '13:00', text: 'Observe o que está fora do centro.' },
  { time: '16:00', text: 'Nem toda pista está no primeiro plano.' },
  { time: '19:00', text: 'O nome importa mais do que a forma.' },
  { time: '22:00', text: 'A última dica raramente perdoa: pense em espelho.' },
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
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div>
          <p className="text-xs uppercase tracking-[0.45em] text-violet-400/70">powered by vitrinum</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">MysterionPlay</h1>
        </div>
        <nav className="hidden gap-6 text-sm text-zinc-400 sm:flex">
          <a className="hover:text-zinc-100" href="#misterio">Mistério</a>
          <a className="hover:text-zinc-100" href="#dicas">Dicas</a>
          <a className="hover:text-zinc-100" href="#ranking">Ranking</a>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <p className="mb-4 inline-flex rounded-full border border-violet-400/20 bg-violet-400/10 px-4 py-2 text-sm text-violet-200">
            Um mistério por dia. Cinco dicas. Um ranking.
          </p>
          <h2 className="max-w-3xl text-5xl font-bold tracking-tight text-zinc-50 sm:text-6xl">
            Resolva antes das dicas entregarem o cadáver.
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
            Uma imagem, uma resposta e algumas pistas liberadas ao longo do dia. Parece simples, que é exatamente como armadilhas educadas costumam se apresentar.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#misterio" className="rounded-2xl bg-zinc-100 px-6 py-3 text-center font-medium text-zinc-950 hover:bg-white">
              Jogar agora
            </a>
            <a href="#ranking" className="rounded-2xl border border-zinc-700 px-6 py-3 text-center font-medium text-zinc-200 hover:border-zinc-400">
              Ver ranking
            </a>
          </div>
        </div>

        <div id="misterio" className="rounded-[2rem] border border-zinc-800 bg-zinc-900/70 p-5 shadow-2xl shadow-black/40">
          <div className="aspect-[4/3] rounded-[1.5rem] border border-zinc-800 bg-[radial-gradient(circle_at_35%_30%,rgba(139,92,246,0.28),transparent_32%),linear-gradient(135deg,#18181b,#09090b)] p-6">
            <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-zinc-700 text-center">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-zinc-500">mistério do dia</p>
                <p className="mt-4 text-3xl font-semibold text-zinc-100">A Sala Sem Porta</p>
                <p className="mt-3 text-sm text-zinc-500">placeholder da imagem/enigma</p>
              </div>
            </div>
          </div>

          <form className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input
              className="min-w-0 flex-1 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-violet-400/70"
              placeholder="Digite sua resposta"
            />
            <button className="rounded-2xl bg-violet-500 px-6 py-3 font-medium text-white hover:bg-violet-400" type="button">
              Enviar
            </button>
          </form>
          <p className="mt-3 text-sm text-zinc-500">Tentativas: 0 · Pontuação máxima atual: 100</p>
        </div>
      </section>

      <section id="dicas" className="mx-auto grid max-w-6xl gap-6 px-6 py-10 lg:grid-cols-5">
        {hints.map((hint, index) => (
          <article key={hint.time} className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-600">dica {index + 1}</p>
            <p className="mt-3 text-sm text-violet-300">Liberada às {hint.time}</p>
            <p className="mt-4 text-sm leading-6 text-zinc-400">{hint.text}</p>
          </article>
        ))}
      </section>

      <section id="ranking" className="mx-auto max-w-6xl px-6 py-14">
        <div className="rounded-[2rem] border border-zinc-800 bg-zinc-900/70 p-6">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-zinc-600">temporada zero</p>
              <h3 className="mt-2 text-3xl font-semibold">Ranking diário</h3>
            </div>
            <p className="text-sm text-zinc-500">mockado, por enquanto. O banco ainda dorme.</p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-800">
            {ranking.map((player, index) => (
              <div key={player.name} className="grid grid-cols-[56px_1fr_90px_80px] items-center border-b border-zinc-800 px-4 py-4 last:border-b-0">
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
