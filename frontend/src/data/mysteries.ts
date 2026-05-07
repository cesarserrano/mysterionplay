import heroImage from '../assets/hero.png'

export type Hint = {
  unlockAt: string
  text: string
}

export type LeaderboardEntry = {
  name: string
  time: string
  hintsUsed: number
}

export type Mystery = {
  id: string
  date: string
  title: string
  image: string
  answer: string
  aliases: string[]
  tips: Hint[]
  explanation: string
  leaderboard: LeaderboardEntry[]
}

export const mysteries: Mystery[] = [
  {
    id: '001',
    date: '2026-05-06',
    title: 'Misterio #001',
    image: heroImage,
    answer: 'chernobyl',
    aliases: ['tchernobyl', 'pripyat', 'usina de chernobyl', 'chernobil'],
    tips: [
      { unlockAt: '09:00', text: 'Nem tudo abandonado esta morto.' },
      { unlockAt: '12:00', text: 'O silencio aqui tem um som especifico.' },
      { unlockAt: '15:00', text: '1986 mudou este lugar para sempre.' },
      { unlockAt: '18:00', text: 'A natureza venceu parcialmente.' },
      { unlockAt: '21:00', text: 'Ucrania.' },
    ],
    explanation: 'Chernobyl virou simbolo de desastre, abandono e memoria contaminada.',
    leaderboard: [
      { name: 'anonimo_17', time: '00:42', hintsUsed: 0 },
      { name: 'vitrinum', time: '03:11', hintsUsed: 1 },
      { name: 'visitante_404', time: '07:38', hintsUsed: 2 },
    ],
  },
  {
    id: '000',
    date: '2026-05-05',
    title: 'Ontem',
    image: heroImage,
    answer: 'manhattan project',
    aliases: ['projeto manhattan', 'manhattan', 'los alamos'],
    tips: [
      { unlockAt: '09:00', text: 'Tudo comecou antes da explosao.' },
      { unlockAt: '12:00', text: 'Nao era apenas ciencia.' },
      { unlockAt: '15:00', text: 'O segredo tinha endereco.' },
      { unlockAt: '18:00', text: 'Guerra acelera o impossivel.' },
      { unlockAt: '21:00', text: 'Novo Mexico.' },
    ],
    explanation: 'O misterio anterior apontava para o programa que mudou a guerra e o seculo.',
    leaderboard: [
      { name: 'nocturno', time: '01:06', hintsUsed: 0 },
      { name: 'cinza', time: '04:29', hintsUsed: 1 },
      { name: 'ruido_branco', time: '08:13', hintsUsed: 2 },
    ],
  },
]

function toLocalDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getTodaysMystery(date = new Date()) {
  const todayKey = toLocalDateKey(date)
  return mysteries.find((mystery) => mystery.date === todayKey) ?? mysteries[0]
}

export function getYesterdayMystery(date = new Date()) {
  const todayMystery = getTodaysMystery(date)
  const todayIndex = mysteries.findIndex((mystery) => mystery.id === todayMystery.id)
  return mysteries[todayIndex + 1] ?? mysteries[1] ?? todayMystery
}
