import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
const DATA_FILE = path.join(DATA_DIR, 'store.json')
const PORT = Number(process.env.PORT ?? 3001)
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? 'change-me'
const APP_TIMEZONE = process.env.APP_TIMEZONE ?? 'America/Sao_Paulo'

const app = express()
app.use(express.json({ limit: '1mb' }))

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true })
  try {
    await fs.access(DATA_FILE)
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify({ mysteries: [], submissions: [] }, null, 2))
  }
}

async function readStore() {
  await ensureStore()
  const contents = await fs.readFile(DATA_FILE, 'utf8')
  return JSON.parse(contents)
}

async function writeStore(store) {
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2))
}

function normalizeAnswer(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

function getZonedParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })

  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]))
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    timeKey: `${parts.hour}:${parts.minute}`,
  }
}

function getTodayMystery(store, date = new Date()) {
  const { dateKey } = getZonedParts(date)
  return store.mysteries.find((mystery) => mystery.date === dateKey) ?? store.mysteries[0] ?? null
}

function getYesterdayMystery(store, date = new Date()) {
  const today = getTodayMystery(store, date)
  if (!today) {
    return null
  }

  const index = store.mysteries.findIndex((mystery) => mystery.id === today.id)
  return store.mysteries[index + 1] ?? null
}

function getUnlockedCount(mystery, date = new Date()) {
  const { dateKey, timeKey } = getZonedParts(date)

  if (mystery.date < dateKey) {
    return mystery.tips.length
  }

  if (mystery.date > dateKey) {
    return 0
  }

  return mystery.tips.filter((tip) => tip.unlockAt <= timeKey).length
}

function formatElapsed(startedAt, solvedAt) {
  const ms = Math.max(0, new Date(solvedAt).getTime() - new Date(startedAt).getTime())
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function buildLeaderboard(store, mysteryId) {
  return store.submissions
    .filter((submission) => submission.mysteryId === mysteryId && submission.solvedAt)
    .sort((left, right) => new Date(left.solvedAt).getTime() - new Date(right.solvedAt).getTime())
    .map((submission) => ({
      name: submission.name,
      time: formatElapsed(submission.startedAt, submission.solvedAt),
      hintsUsed: submission.hintsUsed,
      attempts: submission.attempts,
    }))
}

function toPublicMystery(mystery) {
  return {
    id: mystery.id,
    date: mystery.date,
    title: mystery.title,
    image: mystery.image,
    tips: mystery.tips,
    explanation: mystery.explanation,
  }
}

function requireAdmin(req, res, next) {
  if (req.header('x-admin-token') !== ADMIN_TOKEN) {
    res.status(401).json({ error: 'Token invalido.' })
    return
  }

  next()
}

function validateMystery(body) {
  const tips = Array.isArray(body.tips) ? body.tips : []
  return {
    id: String(body.id ?? '').trim(),
    date: String(body.date ?? '').trim(),
    title: String(body.title ?? '').trim(),
    image: String(body.image ?? '').trim(),
    answer: String(body.answer ?? '').trim(),
    aliases: Array.isArray(body.aliases)
      ? body.aliases.map((alias) => String(alias).trim()).filter(Boolean)
      : [],
    tips: tips
      .map((tip) => ({
        unlockAt: String(tip.unlockAt ?? '').trim(),
        text: String(tip.text ?? '').trim(),
      }))
      .filter((tip) => tip.unlockAt && tip.text),
    explanation: String(body.explanation ?? '').trim(),
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/game', async (req, res) => {
  const store = await readStore()
  const today = getTodayMystery(store)
  const yesterday = getYesterdayMystery(store)

  if (!today) {
    res.status(404).json({ error: 'Nenhum misterio cadastrado.' })
    return
  }

  const playerId = String(req.query.playerId ?? '').trim()
  const playerSubmission = store.submissions.find(
    (submission) => submission.mysteryId === today.id && submission.playerId === playerId,
  )

  res.json({
    today: toPublicMystery(today),
    leaderboard: buildLeaderboard(store, today.id),
    player: playerSubmission
      ? {
          playerId: playerSubmission.playerId,
          name: playerSubmission.name,
          attempts: playerSubmission.attempts,
          solved: Boolean(playerSubmission.solvedAt),
          hintsUsed: playerSubmission.hintsUsed,
        }
      : null,
    yesterday: yesterday
      ? {
          ...toPublicMystery(yesterday),
          answer: yesterday.answer,
          leaderboard: buildLeaderboard(store, yesterday.id),
        }
      : null,
  })
})

app.post('/api/game/guess', async (req, res) => {
  const { playerId, guess, nickname } = req.body ?? {}
  const cleanPlayerId = String(playerId ?? '').trim()
  const cleanGuess = String(guess ?? '').trim()
  const cleanNickname = String(nickname ?? '').trim()

  if (!cleanPlayerId || !cleanGuess) {
    res.status(400).json({ error: 'Resposta incompleta.' })
    return
  }

  const store = await readStore()
  const today = getTodayMystery(store)

  if (!today) {
    res.status(404).json({ error: 'Nenhum misterio ativo.' })
    return
  }

  let submission = store.submissions.find(
    (entry) => entry.mysteryId === today.id && entry.playerId === cleanPlayerId,
  )

  if (!submission) {
    submission = {
      id: `${today.id}-${cleanPlayerId}`,
      mysteryId: today.id,
      playerId: cleanPlayerId,
      name: cleanNickname || `visitante_${cleanPlayerId.slice(-4)}`,
      attempts: 0,
      startedAt: new Date().toISOString(),
      solvedAt: null,
      hintsUsed: 0,
    }
    store.submissions.push(submission)
  }

  if (cleanNickname) {
    submission.name = cleanNickname
  }

  if (submission.solvedAt) {
    res.json({
      solved: true,
      attempts: submission.attempts,
      message: 'Resposta aceita.',
      explanation: today.explanation,
      leaderboard: buildLeaderboard(store, today.id),
    })
    return
  }

  submission.attempts += 1
  const acceptedAnswers = [today.answer, ...today.aliases].map(normalizeAnswer)
  const normalizedGuess = normalizeAnswer(cleanGuess)

  if (acceptedAnswers.includes(normalizedGuess)) {
    submission.solvedAt = new Date().toISOString()
    submission.hintsUsed = getUnlockedCount(today)
    await writeStore(store)
    res.json({
      solved: true,
      attempts: submission.attempts,
      message: 'Resposta aceita.',
      explanation: today.explanation,
      leaderboard: buildLeaderboard(store, today.id),
    })
    return
  }

  await writeStore(store)
  res.json({
    solved: false,
    attempts: submission.attempts,
    message: 'Ainda nao.',
  })
})

app.post('/api/admin/login', (req, res) => {
  const token = String(req.body?.token ?? '')
  if (token !== ADMIN_TOKEN) {
    res.status(401).json({ error: 'Token invalido.' })
    return
  }

  res.json({ ok: true })
})

app.get('/api/admin/mysteries', requireAdmin, async (_req, res) => {
  const store = await readStore()
  const mysteries = [...store.mysteries].sort((left, right) => right.date.localeCompare(left.date))
  res.json({ mysteries })
})

app.get('/api/admin/submissions', requireAdmin, async (req, res) => {
  const store = await readStore()
  const mysteryId = String(req.query.mysteryId ?? '').trim()
  const submissions = mysteryId
    ? store.submissions.filter((submission) => submission.mysteryId === mysteryId)
    : store.submissions

  res.json({ submissions })
})

app.post('/api/admin/mysteries', requireAdmin, async (req, res) => {
  const store = await readStore()
  const mystery = validateMystery(req.body)

  if (!mystery.id || !mystery.date || !mystery.title || !mystery.answer || mystery.tips.length === 0) {
    res.status(400).json({ error: 'Campos obrigatorios ausentes.' })
    return
  }

  if (store.mysteries.some((entry) => entry.id === mystery.id)) {
    res.status(409).json({ error: 'Ja existe um misterio com esse id.' })
    return
  }

  store.mysteries.unshift(mystery)
  await writeStore(store)
  res.status(201).json({ mystery })
})

app.put('/api/admin/mysteries/:id', requireAdmin, async (req, res) => {
  const store = await readStore()
  const mystery = validateMystery(req.body)
  const mysteryId = String(req.params.id)
  const index = store.mysteries.findIndex((entry) => entry.id === mysteryId)

  if (index === -1) {
    res.status(404).json({ error: 'Misterio nao encontrado.' })
    return
  }

  store.mysteries[index] = { ...mystery, id: mysteryId }
  await writeStore(store)
  res.json({ mystery: store.mysteries[index] })
})

app.delete('/api/admin/mysteries/:id', requireAdmin, async (req, res) => {
  const store = await readStore()
  const mysteryId = String(req.params.id)

  store.mysteries = store.mysteries.filter((entry) => entry.id !== mysteryId)
  store.submissions = store.submissions.filter((entry) => entry.mysteryId !== mysteryId)
  await writeStore(store)
  res.status(204).end()
})

app.post('/api/admin/mysteries/:id/reset-submissions', requireAdmin, async (req, res) => {
  const store = await readStore()
  const mysteryId = String(req.params.id)
  store.submissions = store.submissions.filter((entry) => entry.mysteryId !== mysteryId)
  await writeStore(store)
  res.json({ ok: true })
})

app.listen(PORT, async () => {
  await ensureStore()
  console.log(`mysterionplay backend listening on ${PORT}`)
})
