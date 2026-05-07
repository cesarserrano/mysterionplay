type AnswerFormProps = {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  attempts: number
  solved: boolean
  message: string
}

function AnswerForm({ value, onChange, onSubmit, attempts, solved, message }: AnswerFormProps) {
  return (
    <section className="rounded-[2rem] border border-zinc-800 bg-zinc-900/65 p-4 sm:p-5">
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <input
          className="min-w-0 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-amber-300/70"
          onChange={(event) => onChange(event.target.value)}
          placeholder="Digite sua resposta"
          value={value}
        />
        <button
          className="rounded-2xl bg-amber-200 px-6 py-3 font-medium text-zinc-950 transition hover:bg-amber-100"
          type="submit"
        >
          Responder
        </button>
      </form>

      <div className="mt-3 flex items-center justify-between gap-4 text-xs text-zinc-500 sm:text-sm">
        <p>Tentativas: {attempts}</p>
        <p>{solved ? 'Sem mais pistas.' : 'Observe.'}</p>
      </div>

      <p
        className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
          solved
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
            : 'border-zinc-800 bg-zinc-950/70 text-zinc-300'
        }`}
      >
        {message}
      </p>
    </section>
  )
}

export default AnswerForm
