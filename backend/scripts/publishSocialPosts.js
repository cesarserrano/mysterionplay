import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const port = process.env.PORT ?? '3001'
const publicUrl = (process.env.PUBLIC_URL ?? 'https://mysterionplay.com.br').replace(/\/$/, '')
const graphVersion = process.env.META_GRAPH_VERSION ?? 'v24.0'
const instagramUserId = process.env.INSTAGRAM_USER_ID
const instagramAccessToken = process.env.INSTAGRAM_ACCESS_TOKEN
const appTimezone = process.env.APP_TIMEZONE ?? 'America/Sao_Paulo'

function readOptions() {
  const args = process.argv.slice(2)
  const limitIndex = args.indexOf('--limit')
  const limit = limitIndex >= 0 ? Number(args[limitIndex + 1]) : 1

  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error('Use --limit with an integer greater than zero.')
  }

  return {
    autoApprove: args.includes('--auto-approve'),
    dryRun: args.includes('--dry-run'),
    limit,
  }
}

function getZonedParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: appTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]))

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  }
}

async function ensureTodayPlan() {
  const response = await fetch(`http://127.0.0.1:${port}/api/social/today`)
  if (!response.ok && response.status !== 404) {
    throw new Error(`Could not prepare today's social plan: HTTP ${response.status}.`)
  }
}

function requireInstagramCredentials(dryRun) {
  if (!dryRun && (!instagramUserId || !instagramAccessToken)) {
    throw new Error('INSTAGRAM_USER_ID and INSTAGRAM_ACCESS_TOKEN are required.')
  }
}

async function graphPost(path, body) {
  const response = await fetch(`https://graph.facebook.com/${graphVersion}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      ...body,
      access_token: instagramAccessToken,
    }),
  })
  const payload = await response.json()

  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message ?? `Meta Graph API failed with HTTP ${response.status}.`)
  }

  return payload
}

async function publishInstagram(post) {
  const imageUrl = post.imageUrl ?? post.mystery.imageUrl
  if (!imageUrl) {
    throw new Error('Mystery image is not ready yet.')
  }

  const media = await graphPost(`${instagramUserId}/media`, {
    image_url: imageUrl.startsWith('http') ? imageUrl : `${publicUrl}${imageUrl}`,
    ...(post.platform === 'instagram_story' ? { media_type: 'STORIES' } : { caption: post.text }),
  })

  const published = await graphPost(`${instagramUserId}/media_publish`, {
    creation_id: media.id,
  })

  return published.id
}

async function markError(post, error) {
  await prisma.socialPost.update({
    where: { id: post.id },
    data: {
      errorMessage: error instanceof Error ? error.message : String(error),
      updatedAt: new Date(),
    },
  })
}

async function run() {
  const options = readOptions()
  requireInstagramCredentials(options.dryRun)
  await ensureTodayPlan()

  const now = getZonedParts()
  const posts = await prisma.socialPost.findMany({
    where: {
      date: now.date,
      time: { lte: now.time },
      platform: { in: ['instagram_feed', 'instagram_story'] },
      status: options.autoApprove ? { in: ['draft', 'ready'] } : 'ready',
    },
    include: { mystery: true },
    orderBy: [{ time: 'asc' }, { platform: 'asc' }],
    take: options.limit,
  })

  if (posts.length === 0) {
    console.log('No Instagram posts ready for publication.')
    return
  }

  console.log(`Preparing ${posts.length} Instagram post(s) for ${now.date} ${now.time}.`)

  for (const post of posts) {
    if (options.dryRun) {
      console.log(`READY ${post.time} ${post.platform} ${post.mystery.title}`)
      continue
    }

    try {
      const externalPostId = await publishInstagram(post)
      await prisma.socialPost.update({
        where: { id: post.id },
        data: {
          status: 'posted',
          publishMode: 'automatic',
          postedAt: new Date(),
          postedBy: 'instagram-worker',
          externalPostId,
          errorMessage: null,
          updatedAt: new Date(),
        },
      })
      console.log(`POSTED ${post.id} ${externalPostId}`)
    } catch (error) {
      await markError(post, error)
      console.error(`ERROR ${post.id}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
