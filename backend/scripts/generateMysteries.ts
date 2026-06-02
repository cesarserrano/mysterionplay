import {
  atmospheres,
  decades,
  emotionalRegisters,
  locations,
  subjects,
  times,
  type MysterySubject,
} from '../src/mysteryCatalog.js'
const DEFAULT_DAYS = 60
let disconnectPrisma: (() => Promise<void>) | undefined
const IMAGE_STYLE = [
  'Brazilian digital noir',
  'analog 35mm documentary photograph',
  'subtle film grain and muted colors',
  'cold fluorescent lighting',
  'deep soft shadows',
  'wet reflective surfaces',
  'empty environment',
  'no visible people',
  'plausible real-world scene',
  'no supernatural elements',
  'no readable text',
  'no logos',
  'no watermarks',
].join(', ')

type Options = {
  startDate: string
  days: number
  dryRun: boolean
}

function getSaoPauloDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function readOptions(): Options {
  const args = process.argv.slice(2)
  const startIndex = args.indexOf('--start')
  const daysIndex = args.indexOf('--days')
  const startDate = startIndex >= 0 ? args[startIndex + 1] : getSaoPauloDateKey()
  const days = daysIndex >= 0 ? Number(args[daysIndex + 1]) : DEFAULT_DAYS

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate ?? '')) {
    throw new Error('Use --start in YYYY-MM-DD format.')
  }

  if (!Number.isInteger(days) || days < 1 || days > subjects.length) {
    throw new Error(`Use --days between 1 and ${subjects.length}.`)
  }

  return { startDate, days, dryRun: args.includes('--dry-run') }
}

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

function hash(value: string) {
  let result = 2166136261
  for (const character of value) {
    result ^= character.charCodeAt(0)
    result = Math.imul(result, 16777619)
  }
  return result >>> 0
}

function pick<T>(items: T[], seed: string, offset = 0) {
  return items[(hash(seed) + offset * 7919) % items.length]
}

function addDays(dateKey: string, amount: number) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + amount))
  return date.toISOString().slice(0, 10)
}

function idFromDate(dateKey: string) {
  return dateKey.replaceAll('-', '')
}

function difficultyFor(index: number, seed: string) {
  const base = [2, 3, 3, 4, 2, 4, 5, 3, 1, 4][index % 10]
  return Math.max(1, Math.min(5, base + (hash(seed) % 3 === 0 ? 1 : 0)))
}

function titleFor(index: number, dateKey: string) {
  const series = ['Plantao', 'Protocolo', 'Arquivo', 'Linha Morta', 'Ultimo Turno', 'Sala de Espera']
  return `${pick(series, dateKey, index)} ${idFromDate(dateKey)}`
}

function promptFor(subject: MysterySubject, dateKey: string, index: number) {
  const location = pick(locations, dateKey, index)
  const time = pick(times, subject.answer, index)
  const atmosphere = pick(atmospheres, dateKey, index + 2)
  const emotion = pick(emotionalRegisters, subject.answer, index + 4)
  const decade = pick(decades, dateKey, index + 6)

  return [
    `Scene: ${location}, Brazil, at ${time}, evoking the ${decade}.`,
    `Primary contextual evidence: ${subject.evidence}.`,
    `Atmosphere: ${atmosphere}; ${emotion}.`,
    'Include restrained bureaucratic details, aging plastic, old cables, worn tile, a red digital clock somewhere in the background, and hints of obsolete Brazilian infrastructure.',
    'The evidence must feel naturally abandoned in the environment, never staged as a product shot, and must not dominate the frame.',
    `Visual direction: ${IMAGE_STYLE}.`,
    'Composition: mobile-friendly vertical 4:5 frame, cinematic but understated, eye-level documentary angle, realistic optics, no humans, no silhouettes, no hands, no faces, no explicit answer, no legible writing.',
  ].join(' ')
}

function tipsFor(subject: MysterySubject, dateKey: string, index: number) {
  const opening = [
    'A sala fechou, mas uma rotina ainda parece incompleta.',
    'A chuva apagou o movimento, nao o vestigio.',
    'Alguma coisa aqui continuou esperando depois do expediente.',
    'O objeto nao foi guardado porque ainda parecia necessario.',
    'A madrugada preservou um pequeno procedimento antigo.',
  ]

  return [
    { unlockAt: '09:00', text: pick(opening, dateKey, index) },
    { unlockAt: '12:00', text: subject.contextualHint },
    { unlockAt: '15:00', text: subject.technicalHint },
    { unlockAt: '18:00', text: subject.nearAnswerHint },
    { unlockAt: '21:00', text: `Procure um objeto ligado a esta memoria: ${subject.aliases[0] ?? subject.answer}.` },
  ]
}

function buildSeason(options: Options) {
  const selectedSubjects = subjects.slice(0, options.days)

  return selectedSubjects.map((subject, index) => {
    const date = addDays(options.startDate, index)
    return {
      id: idFromDate(date),
      date,
      title: titleFor(index, date),
      image: 'hero',
      answer: subject.answer,
      aliases: subject.aliases,
      difficulty: difficultyFor(index, date),
      imagePrompt: promptFor(subject, date, index),
      imageUrl: null,
      status: 'PENDING',
      tips: tipsFor(subject, date, index),
      explanation: subject.explanation,
    }
  })
}

function assertUniqueSeason(season: ReturnType<typeof buildSeason>) {
  const ids = new Set<string>()
  const dates = new Set<string>()
  const answers = new Set<string>()

  for (const mystery of season) {
    const answer = normalize(mystery.answer)
    if (ids.has(mystery.id) || dates.has(mystery.date) || answers.has(answer)) {
      throw new Error(`Duplicate mystery data detected around ${mystery.id}.`)
    }
    ids.add(mystery.id)
    dates.add(mystery.date)
    answers.add(answer)
  }
}

async function generate() {
  const options = readOptions()
  const season = buildSeason(options)
  assertUniqueSeason(season)

  if (options.dryRun) {
    console.table(
      season.map(({ id, date, answer, difficulty }) => ({ id, date, answer, difficulty })),
    )
    console.log(`Dry run complete: ${season.length} coherent mysteries prepared.`)
    return
  }

  const { prisma } = await import('../src/prisma.js')
  disconnectPrisma = () => prisma.$disconnect()
  const existing = await prisma.mystery.findMany({
    select: { id: true, date: true, answer: true },
  })
  const existingIds = new Set(existing.map((mystery) => mystery.id))
  const existingDates = new Set(existing.map((mystery) => mystery.date))
  const existingAnswers = new Set(existing.map((mystery) => normalize(mystery.answer)))
  const pending = season.filter(
    (mystery) =>
      !existingIds.has(mystery.id) &&
      !existingDates.has(mystery.date) &&
      !existingAnswers.has(normalize(mystery.answer)),
  )

  if (pending.length > 0) {
    await prisma.$transaction(
      pending.map((mystery) =>
        prisma.mystery.create({
          data: mystery,
        }),
      ),
    )
  }

  console.log(`Season window: ${season[0].date} to ${season.at(-1)?.date}.`)
  console.log(`Created ${pending.length} mysteries; skipped ${season.length - pending.length} existing records.`)
}

generate()
  .catch((error) => {
    console.error('Mystery generation failed.')
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await disconnectPrisma?.()
  })
