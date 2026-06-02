import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const publicUrl = (process.env.PUBLIC_URL ?? 'https://mysterionplay.com.br').replace(/\/$/, '')

async function run() {
  const posts = await prisma.socialPost.findMany({
    where: {
      platform: 'tiktok',
      status: { in: ['draft', 'ready'] },
    },
    include: { mystery: true },
    orderBy: [{ date: 'asc' }, { time: 'asc' }],
  })

  if (posts.length === 0) {
    console.log('No TikTok posts waiting for manual publication.')
    return
  }

  for (const post of posts) {
    const imageUrl = post.imageUrl ?? post.mystery.imageUrl
    console.log('='.repeat(72))
    console.log(`${post.date} ${post.time} | ${post.mystery.title}`)
    console.log(imageUrl ? `${publicUrl}${imageUrl}` : 'IMAGE PENDING')
    console.log('')
    console.log(post.text)
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
