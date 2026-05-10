import crypto from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import multer from 'multer'
import pg from 'pg'

const { Pool } = pg

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SEED_FILE = path.join(__dirname, 'data', 'store.json')
const UPLOADS_DIR = path.join(__dirname, 'uploads')
const PORT = Number(process.env.PORT ?? 3001)
const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://mysterion:mysterion@postgres:5432/mysterionplay'
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? 'change-me'
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET ?? ADMIN_TOKEN
const APP_TIMEZONE = process.env.APP_TIMEZONE ?? 'America/Sao_Paulo'
const COOKIE_NAME = 'mysterion_admin'

const pool = new Pool({ connectionString: DATABASE_URL })
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 },
})

const app = express()
app.use(express.json({ limit: '1mb' }))
app.use('/api/uploads', express.static(UPLOADS_DIR))

function signAdminValue(value) {
  return crypto.createHmac('sha256', ADMIN_SESSION_SECRET).update(value).digest('hex')
}

function createAdminCookieValue() {
  const value = 'admin'
  return `${value}.${signAdminValue(value)}`
}

function verifyAdminCookieValue(cookieValue) {
  if (!cookieValue || !cookieValue.includes('.')) {
    return false
  }

  const [value, signature] = cookieValue.split('.', 2)
  const expected = signAdminValue(value)

  try {
    return (
      crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) &&
      value === 'admin'
    )
  } catch {
    return false
  }
}

function parseCookies(cookieHeader = '') {
  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf('=')
        if (separator === -1) {
          return [part, '']
        }

        return [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))]
      }),
  )
}

function setAdminSessionCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${createAdminCookieValue()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secure}`,
  )
}

function clearAdminSessionCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
  )
}

async function ensureFilesystem() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true })
}

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mysteries (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      image TEXT NOT NULL,
      answer TEXT NOT NULL,
      aliases JSONB NOT NULL DEFAULT '[]'::jsonb,
      tips JSONB NOT NULL DEFAULT '[]'::jsonb,
      explanation TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      mystery_id TEXT NOT NULL REFERENCES mysteries(id) ON DELETE CASCADE,
      player_id TEXT NOT NULL,
      name TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      started_at TIMESTAMPTZ NOT NULL,
      solved_at TIMESTAMPTZ NULL,
      hints_used INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (mystery_id, player_id)
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS social_posts (
      id TEXT PRIMARY KEY,
      mystery_id TEXT NOT NULL REFERENCES mysteries(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      platform TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      text TEXT NOT NULL,
      image_url TEXT,
      link TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

async function seedDatabaseIfNeeded() {
  const existing = await pool.query('SELECT COUNT(*)::int AS count FROM mysteries')
  if (existing.rows[0]?.count > 0) {
    return
  }

  const contents = await fs.readFile(SEED_FILE, 'utf8')
  const seed = JSON.parse(contents)

  for (const mystery of seed.mysteries ?? []) {
    await pool.query(
      `
        INSERT INTO mysteries (id, date, title, image, answer, aliases, tips, explanation)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)
      `,
      [
        mystery.id,
        mystery.date,
        mystery.title,
        mystery.image,
        mystery.answer,
        JSON.stringify(mystery.aliases ?? []),
        JSON.stringify(mystery.tips ?? []),
        mystery.explanation,
      ],
    )
  }

  for (const submission of seed.submissions ?? []) {
    await pool.query(
      `
        INSERT INTO submissions (id, mystery_id, player_id, name, attempts, started_at, solved_at, hints_used)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        submission.id,
        submission.mysteryId,
        submission.playerId,
        submission.name,
        submission.attempts,
        submission.startedAt,
        submission.solvedAt,
        submission.hintsUsed,
      ],
    )
  }
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

function normalizeMysteryRow(row) {
  return {
    id: row.id,
    date: row.date,
    title: row.title,
    image: row.image,
    answer: row.answer,
    aliases: row.aliases ?? [],
    tips: row.tips ?? [],
    explanation: row.explanation,
  }
}

async function getAllMysteries() {
  const result = await pool.query('SELECT * FROM mysteries ORDER BY date DESC, id DESC')
  return result.rows.map(normalizeMysteryRow)
}

function getTimeline(mysteries, dateKey) {
  const sortedAsc = [...mysteries].sort((left, right) => left.date.localeCompare(right.date))
  const today = sortedAsc.find((mystery) => mystery.date === dateKey) ?? null
  const todayIndex = today ? sortedAsc.findIndex((mystery) => mystery.id === today.id) : -1
  const previousIndex = today
    ? todayIndex - 1
    : sortedAsc.findLastIndex((mystery) => mystery.date < dateKey)
  const nextIndex = today
    ? todayIndex + 1
    : sortedAsc.findIndex((mystery) => mystery.date > dateKey)

  return {
    today,
    yesterday: previousIndex >= 0 ? sortedAsc[previousIndex] : null,
    tomorrow: nextIndex >= 0 ? sortedAsc[nextIndex] : null,
  }
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

async function buildLeaderboard(mysteryId) {
  const result = await pool.query(
    `
      SELECT name, attempts, started_at, solved_at, hints_used
      FROM submissions
      WHERE mystery_id = $1 AND solved_at IS NOT NULL
      ORDER BY solved_at ASC
    `,
    [mysteryId],
  )

  return result.rows.map((submission) => ({
    name: submission.name,
    attempts: submission.attempts,
    hintsUsed: submission.hints_used,
    time: formatElapsed(submission.started_at, submission.solved_at),
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
  const cookies = parseCookies(req.headers.cookie)
  const hasValidCookie = verifyAdminCookieValue(cookies[COOKIE_NAME])
  const hasValidHeader = req.header('x-admin-token') === ADMIN_TOKEN

  if (!hasValidCookie && !hasValidHeader) {
    res.status(401).json({ error: 'Sessao invalida.' })
    return
  }

  next()
}

function validateMystery(body = {}) {
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

async function getSubmission(mysteryId, playerId) {
  const result = await pool.query(
    'SELECT * FROM submissions WHERE mystery_id = $1 AND player_id = $2 LIMIT 1',
    [mysteryId, playerId],
  )
  return result.rows[0] ?? null
}

function generateSocialPosts(mystery, dateKey) {
  const posts = []
  const baseUrl = 'https://mysterionplay.com.br'

  // Helper para criar post
  const createPost = (time, type, platform, text) => ({
    id: `${mystery.id}-${dateKey}-${time}-${platform}`,
    mysteryId: mystery.id,
    date: dateKey,
    time,
    platform,
    type,
    status: 'draft',
    text,
    imageUrl: null,
    link: baseUrl,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  // 00:00 - Main post (obrigatório)
  posts.push(
    createPost(
      '00:00',
      'main',
      'x',
      `Mistério #${mystery.id} disponível.

A frequência está morta.

${baseUrl}`,
    ),
  )

  posts.push(
    createPost(
      '00:00',
      'main',
      'instagram_feed',
      `Mistério #${mystery.id}

A frequência está morta.`,
    ),
  )

  // 09:00 - First hint (obrigatório)
  const firstHint = mystery.tips.find((tip) => tip.unlockAt === '09:00')
  if (firstHint) {
    posts.push(
      createPost(
        '09:00',
        'hint_1',
        'x',
        `A maioria ainda está olhando para as televisões.

${firstHint.text.substring(0, 150)}`,
      ),
    )

    posts.push(
      createPost(
        '09:00',
        'hint_1',
        'instagram_story',
        `${firstHint.text.substring(0, 100)}`,
      ),
    )
  } else {
    posts.push(
      createPost('09:00', 'hint_1', 'x', 'A maioria ainda está olhando para as televisões.'),
    )
  }

  // 21:00 - Last hint (obrigatório)
  const lastHint = mystery.tips[mystery.tips.length - 1] ?? mystery.tips[0]
  if (lastHint) {
    posts.push(
      createPost(
        '21:00',
        'hint_final',
        'x',
        `21:00

Ainda há tempo.

${lastHint.text.substring(0, 100)}`,
      ),
    )

    posts.push(
      createPost(
        '21:00',
        'hint_final',
        'instagram_story',
        `Última chance.

${lastHint.text.substring(0, 80)}`,
      ),
    )
  } else {
    posts.push(createPost('21:00', 'hint_final', 'x', '21:00\n\nAinda há tempo.'))
  }

  // 12:00 - Optional stat/observation
  const secondHint = mystery.tips.find((tip) => tip.unlockAt === '12:00')
  if (secondHint) {
    posts.push(
      createPost(
        '12:00',
        'stat',
        'x',
        `${secondHint.text.substring(0, 120)}

Sem pressa.`,
      ),
    )
  }

  // 15:00 - Optional mid hint
  const midHint = mystery.tips.find((tip) => tip.unlockAt === '15:00')
  if (midHint) {
    posts.push(
      createPost(
        '15:00',
        'mid_hint',
        'x',
        `Caminho do meio.

${midHint.text.substring(0, 100)}`,
      ),
    )
  }

  // 18:00 - Optional ranking/atmosphere
  const thirdHint = mystery.tips.find((tip) => tip.unlockAt === '18:00')
  if (thirdHint) {
    posts.push(
      createPost(
        '18:00',
        'ranking',
        'x',
        `${thirdHint.text.substring(0, 100)}

A noite se aproxima.`,
      ),
    )
  }

  return posts
}

async function getOrCreateSocialPlan(dateKey) {
  const allMysteries = await getAllMysteries()
  const timeline = getTimeline(allMysteries, dateKey)

  if (!timeline.today) {
    return null
  }

  const mystery = timeline.today
  const existing = await pool.query(
    'SELECT * FROM social_posts WHERE mystery_id = $1 AND date = $2',
    [mystery.id, dateKey],
  )

  if (existing.rowCount > 0) {
    return existing.rows.map((row) => ({
      id: row.id,
      mysteryId: row.mystery_id,
      date: row.date,
      time: row.time,
      platform: row.platform,
      type: row.type,
      status: row.status,
      text: row.text,
      imageUrl: row.image_url,
      link: row.link,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  }

  // Generate new posts
  const posts = generateSocialPosts(mystery, dateKey)

  // Save to database
  for (const post of posts) {
    await pool.query(
      `
        INSERT INTO social_posts (id, mystery_id, date, time, platform, type, status, text, image_url, link, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `,
      [
        post.id,
        post.mysteryId,
        post.date,
        post.time,
        post.platform,
        post.type,
        post.status,
        post.text,
        post.imageUrl,
        post.link,
        post.createdAt,
        post.updatedAt,
      ],
    )
  }

  return posts
}

async function getSocialPlan(dateKey) {
  const result = await pool.query(
    `
      SELECT * FROM social_posts
      WHERE date = $1
      ORDER BY time ASC, platform ASC
    `,
    [dateKey],
  )

  return result.rows.map((row) => ({
    id: row.id,
    mysteryId: row.mystery_id,
    date: row.date,
    time: row.time,
    platform: row.platform,
    type: row.type,
    status: row.status,
    text: row.text,
    imageUrl: row.image_url,
    link: row.link,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}


app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/game', async (req, res) => {
  const allMysteries = await getAllMysteries()
  const { dateKey } = getZonedParts()
  const timeline = getTimeline(allMysteries, dateKey)

  if (!timeline.today) {
    res.status(404).json({ error: 'Nenhum misterio cadastrado.' })
    return
  }

  const playerId = String(req.query.playerId ?? '').trim()
  const playerSubmission = playerId ? await getSubmission(timeline.today.id, playerId) : null

  res.json({
    today: toPublicMystery(timeline.today),
    leaderboard: await buildLeaderboard(timeline.today.id),
    player: playerSubmission
      ? {
          playerId: playerSubmission.player_id,
          name: playerSubmission.name,
          attempts: playerSubmission.attempts,
          solved: Boolean(playerSubmission.solved_at),
          hintsUsed: playerSubmission.hints_used,
        }
      : null,
    yesterday: timeline.yesterday
      ? {
          ...toPublicMystery(timeline.yesterday),
          answer: timeline.yesterday.answer,
          leaderboard: await buildLeaderboard(timeline.yesterday.id),
        }
      : null,
    tomorrow: timeline.tomorrow ? toPublicMystery(timeline.tomorrow) : null,
  })
})

app.post('/api/game/reveal-hint', async (req, res) => {
  const { playerId, nickname, mysteryId, hintIndex } = req.body ?? {}
  const cleanPlayerId = String(playerId ?? '').trim()
  const cleanMysteryId = String(mysteryId ?? '').trim()
  const cleanNickname = String(nickname ?? '').trim()
  const safeHintIndex = Number(hintIndex)

  if (!cleanPlayerId || !cleanMysteryId || Number.isNaN(safeHintIndex) || safeHintIndex < 0) {
    res.status(400).json({ error: 'Revelacao invalida.' })
    return
  }

  const resultMystery = await pool.query('SELECT * FROM mysteries WHERE id = $1 LIMIT 1', [cleanMysteryId])
  if (resultMystery.rowCount === 0) {
    res.status(404).json({ error: 'Misterio nao encontrado.' })
    return
  }

  const mystery = normalizeMysteryRow(resultMystery.rows[0])
  const unlockedCount = getUnlockedCount(mystery)
  const nextHintsUsed = Math.min(unlockedCount, safeHintIndex + 1)

  let submission = await getSubmission(cleanMysteryId, cleanPlayerId)
  if (!submission) {
    const created = await pool.query(
      `
        INSERT INTO submissions (id, mystery_id, player_id, name, attempts, started_at, solved_at, hints_used)
        VALUES ($1, $2, $3, $4, 0, $5, NULL, $6)
        RETURNING *
      `,
      [
        `${cleanMysteryId}-${cleanPlayerId}`,
        cleanMysteryId,
        cleanPlayerId,
        cleanNickname || `visitante_${cleanPlayerId.slice(-4)}`,
        new Date().toISOString(),
        nextHintsUsed,
      ],
    )
    submission = created.rows[0]
  } else {
    const updated = await pool.query(
      `
        UPDATE submissions
        SET name = $3, hints_used = GREATEST(hints_used, $4)
        WHERE mystery_id = $1 AND player_id = $2
        RETURNING *
      `,
      [cleanMysteryId, cleanPlayerId, cleanNickname || submission.name, nextHintsUsed],
    )
    submission = updated.rows[0]
  }

  res.json({ hintsUsed: submission.hints_used })
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

  const allMysteries = await getAllMysteries()
  const { dateKey } = getZonedParts()
  const { today } = getTimeline(allMysteries, dateKey)

  if (!today) {
    res.status(404).json({ error: 'Nenhum misterio ativo.' })
    return
  }

  let submission = await getSubmission(today.id, cleanPlayerId)

  if (!submission) {
    const result = await pool.query(
      `
        INSERT INTO submissions (id, mystery_id, player_id, name, attempts, started_at, solved_at, hints_used)
        VALUES ($1, $2, $3, $4, $5, $6, NULL, $7)
        RETURNING *
      `,
      [
        `${today.id}-${cleanPlayerId}`,
        today.id,
        cleanPlayerId,
        cleanNickname || `visitante_${cleanPlayerId.slice(-4)}`,
        0,
        new Date().toISOString(),
        0,
      ],
    )
    submission = result.rows[0]
  }

  if (cleanNickname && cleanNickname !== submission.name) {
    const result = await pool.query(
      `
        UPDATE submissions
        SET name = $3
        WHERE mystery_id = $1 AND player_id = $2
        RETURNING *
      `,
      [today.id, cleanPlayerId, cleanNickname],
    )
    submission = result.rows[0]
  }

  if (submission.solved_at) {
    res.json({
      solved: true,
      attempts: submission.attempts,
      message: 'Resposta aceita.',
      explanation: today.explanation,
      leaderboard: await buildLeaderboard(today.id),
    })
    return
  }

  const acceptedAnswers = [today.answer, ...today.aliases].map(normalizeAnswer)
  const normalizedGuess = normalizeAnswer(cleanGuess)
  const nextAttempts = submission.attempts + 1

  if (acceptedAnswers.includes(normalizedGuess)) {
    const result = await pool.query(
      `
        UPDATE submissions
        SET attempts = $3, solved_at = $4, hints_used = GREATEST(hints_used, $5)
        WHERE mystery_id = $1 AND player_id = $2
        RETURNING *
      `,
      [today.id, cleanPlayerId, nextAttempts, new Date().toISOString(), getUnlockedCount(today)],
    )
    submission = result.rows[0]

    res.json({
      solved: true,
      attempts: submission.attempts,
      message: 'Resposta aceita.',
      explanation: today.explanation,
      leaderboard: await buildLeaderboard(today.id),
    })
    return
  }

  const result = await pool.query(
    `
      UPDATE submissions
      SET attempts = $3
      WHERE mystery_id = $1 AND player_id = $2
      RETURNING *
    `,
    [today.id, cleanPlayerId, nextAttempts],
  )
  submission = result.rows[0]

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

  setAdminSessionCookie(res)
  res.json({ ok: true })
})

app.post('/api/admin/logout', requireAdmin, (_req, res) => {
  clearAdminSessionCookie(res)
  res.json({ ok: true })
})

app.post('/api/admin/upload', requireAdmin, upload.single('image'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Nenhum arquivo enviado.' })
    return
  }

  const extension = path.extname(req.file.originalname || '').toLowerCase() || '.jpg'
  const fileName = `${Date.now()}-${crypto.randomUUID()}${extension}`
  const target = path.join(UPLOADS_DIR, fileName)
  await fs.writeFile(target, req.file.buffer)
  res.status(201).json({ imageUrl: `/api/uploads/${fileName}` })
})

app.get('/api/admin/mysteries', requireAdmin, async (_req, res) => {
  res.json({ mysteries: await getAllMysteries() })
})

app.get('/api/admin/submissions', requireAdmin, async (req, res) => {
  const mysteryId = String(req.query.mysteryId ?? '').trim()
  const result = mysteryId
    ? await pool.query('SELECT * FROM submissions WHERE mystery_id = $1 ORDER BY created_at DESC', [mysteryId])
    : await pool.query('SELECT * FROM submissions ORDER BY created_at DESC')

  res.json({
    submissions: result.rows.map((submission) => ({
      id: submission.id,
      mysteryId: submission.mystery_id,
      playerId: submission.player_id,
      name: submission.name,
      attempts: submission.attempts,
      startedAt: submission.started_at,
      solvedAt: submission.solved_at,
      hintsUsed: submission.hints_used,
    })),
  })
})

app.post('/api/admin/mysteries', requireAdmin, async (req, res) => {
  const mystery = validateMystery(req.body)

  if (!mystery.id || !mystery.date || !mystery.title || !mystery.answer || mystery.tips.length === 0) {
    res.status(400).json({ error: 'Campos obrigatorios ausentes.' })
    return
  }

  try {
    await pool.query(
      `
        INSERT INTO mysteries (id, date, title, image, answer, aliases, tips, explanation)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)
      `,
      [
        mystery.id,
        mystery.date,
        mystery.title,
        mystery.image,
        mystery.answer,
        JSON.stringify(mystery.aliases),
        JSON.stringify(mystery.tips),
        mystery.explanation,
      ],
    )
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === '23505') {
      res.status(409).json({ error: 'Ja existe um misterio com esse id.' })
      return
    }
    throw error
  }

  res.status(201).json({ mystery })
})

app.put('/api/admin/mysteries/:id', requireAdmin, async (req, res) => {
  const mystery = validateMystery(req.body)
  const mysteryId = String(req.params.id)

  const result = await pool.query(
    `
      UPDATE mysteries
      SET date = $2, title = $3, image = $4, answer = $5, aliases = $6::jsonb, tips = $7::jsonb, explanation = $8
      WHERE id = $1
      RETURNING *
    `,
    [
      mysteryId,
      mystery.date,
      mystery.title,
      mystery.image,
      mystery.answer,
      JSON.stringify(mystery.aliases),
      JSON.stringify(mystery.tips),
      mystery.explanation,
    ],
  )

  if (result.rowCount === 0) {
    res.status(404).json({ error: 'Misterio nao encontrado.' })
    return
  }

  res.json({ mystery: normalizeMysteryRow(result.rows[0]) })
})

app.delete('/api/admin/mysteries/:id', requireAdmin, async (req, res) => {
  const result = await pool.query('DELETE FROM mysteries WHERE id = $1', [String(req.params.id)])
  if (result.rowCount === 0) {
    res.status(404).json({ error: 'Misterio nao encontrado.' })
    return
  }

  res.status(204).end()
})

app.post('/api/admin/mysteries/:id/reset-submissions', requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM submissions WHERE mystery_id = $1', [String(req.params.id)])
  res.json({ ok: true })
})

// Social rituals endpoints
app.get('/api/social/today', async (_req, res) => {
  const { dateKey } = getZonedParts()
  const posts = await getSocialPlan(dateKey)

  if (posts.length === 0) {
    const generated = await getOrCreateSocialPlan(dateKey)
    if (!generated) {
      res.status(404).json({ error: 'Nenhum misterio para hoje.' })
      return
    }
    res.json({ date: dateKey, posts: generated })
    return
  }

  res.json({ date: dateKey, posts })
})

app.get('/api/social/:date', async (req, res) => {
  const dateParam = String(req.params.date ?? '').trim()
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/

  if (!dateRegex.test(dateParam)) {
    res.status(400).json({ error: 'Data invalida. Use YYYY-MM-DD.' })
    return
  }

  const posts = await getSocialPlan(dateParam)

  if (posts.length === 0) {
    const generated = await getOrCreateSocialPlan(dateParam)
    if (!generated) {
      res.status(404).json({ error: 'Nenhum misterio para essa data.' })
      return
    }
    res.json({ date: dateParam, posts: generated })
    return
  }

  res.json({ date: dateParam, posts })
})

app.post('/api/social/generate/:date', requireAdmin, async (req, res) => {
  const dateParam = String(req.params.date ?? '').trim()
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/

  if (!dateRegex.test(dateParam)) {
    res.status(400).json({ error: 'Data invalida. Use YYYY-MM-DD.' })
    return
  }

  // Delete existing posts for this date
  await pool.query('DELETE FROM social_posts WHERE date = $1', [dateParam])

  // Generate new ones
  const generated = await getOrCreateSocialPlan(dateParam)
  if (!generated) {
    res.status(404).json({ error: 'Nenhum misterio para essa data.' })
    return
  }

  res.json({ date: dateParam, posts: generated })
})

async function bootstrap() {
  await ensureFilesystem()
  await migrate()
  await seedDatabaseIfNeeded()
  app.listen(PORT, () => {
    console.log(`mysterionplay backend listening on ${PORT}`)
  })
}

bootstrap().catch((error) => {
  console.error(error)
  process.exit(1)
})
