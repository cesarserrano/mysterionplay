import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadsDir = path.join(__dirname, '..', 'uploads')
const prisma = new PrismaClient()

const apiKey = process.env.OPENAI_API_KEY
const model = process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-2'
const size = process.env.OPENAI_IMAGE_SIZE ?? '1024x1536'
const quality = process.env.OPENAI_IMAGE_QUALITY ?? 'medium'

function readOptions() {
  const args = process.argv.slice(2)
  const limitIndex = args.indexOf('--limit')
  const idIndex = args.indexOf('--id')
  const limit = limitIndex >= 0 ? Number(args[limitIndex + 1]) : 1

  if ((!Number.isInteger(limit) || limit < 1) && !args.includes('--all')) {
    throw new Error('Use --limit with an integer greater than zero, or use --all.')
  }

  return {
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    id: idIndex >= 0 ? args[idIndex + 1] : undefined,
    limit: args.includes('--all') ? undefined : limit,
  }
}

function getImageFileName(id) {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error(`Mystery id "${id}" cannot be used as an image file name.`)
  }

  return `mystery-${id}.jpg`
}

async function requestImage(prompt) {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      size,
      quality,
      output_format: 'jpeg',
      output_compression: 88,
    }),
  })

  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload.error?.message ?? `OpenAI image generation failed with HTTP ${response.status}.`)
  }

  const encodedImage = payload.data?.[0]?.b64_json
  if (!encodedImage) {
    throw new Error('OpenAI image generation returned no image data.')
  }

  return Buffer.from(encodedImage, 'base64')
}

async function saveImage(mystery) {
  const fileName = getImageFileName(mystery.id)
  const publicUrl = `/api/uploads/${fileName}`
  const targetPath = path.join(uploadsDir, fileName)
  const temporaryPath = `${targetPath}.tmp`

  await prisma.mystery.update({
    where: { id: mystery.id },
    data: { status: 'PROCESSING' },
  })

  try {
    const image = await requestImage(mystery.imagePrompt)
    await fs.writeFile(temporaryPath, image)
    await fs.rename(temporaryPath, targetPath)

    await prisma.mystery.update({
      where: { id: mystery.id },
      data: {
        image: publicUrl,
        imageUrl: publicUrl,
        status: 'READY',
      },
    })

    console.log(`READY ${mystery.id} ${publicUrl}`)
  } catch (error) {
    await fs.rm(temporaryPath, { force: true })
    await prisma.mystery.update({
      where: { id: mystery.id },
      data: { status: 'ERROR' },
    })
    throw error
  }
}

async function run() {
  const options = readOptions()
  if (!options.dryRun && !apiKey) {
    throw new Error('OPENAI_API_KEY is required unless --dry-run is used.')
  }

  await fs.mkdir(uploadsDir, { recursive: true })

  const mysteries = await prisma.mystery.findMany({
    where: {
      ...(options.id ? { id: options.id } : {}),
      imagePrompt: { not: '' },
      ...(options.force
        ? {}
        : {
            imageUrl: null,
            status: { in: ['PENDING', 'ERROR'] },
          }),
    },
    orderBy: { date: 'asc' },
    take: options.limit,
  })

  if (mysteries.length === 0) {
    console.log('No pending mystery images found.')
    return
  }

  console.log(`Preparing ${mysteries.length} image(s) with ${model}, ${size}, quality=${quality}.`)

  if (options.dryRun) {
    for (const mystery of mysteries) {
      console.log(`PENDING ${mystery.id} ${mystery.title}`)
    }
    return
  }

  for (const mystery of mysteries) {
    try {
      await saveImage(mystery)
    } catch (error) {
      console.error(`ERROR ${mystery.id}: ${error instanceof Error ? error.message : String(error)}`)
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
