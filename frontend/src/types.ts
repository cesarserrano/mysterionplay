export type Hint = {
  unlockAt: string
  text: string
}

export type LeaderboardEntry = {
  name: string
  time: string
  hintsUsed: number
  attempts: number
}

export type PublicMystery = {
  id: string
  date: string
  title: string
  image: string
  tips: Hint[]
  explanation: string
}

export type YesterdayMystery = PublicMystery & {
  answer: string
  leaderboard: LeaderboardEntry[]
}

export type PlayerState = {
  playerId: string
  name: string
  attempts: number
  solved: boolean
  hintsUsed: number
}

export type GamePayload = {
  today: PublicMystery | null
  leaderboard: LeaderboardEntry[]
  player: PlayerState | null
  yesterday: YesterdayMystery | null
  tomorrow: PublicMystery | null
}

export type GuessResponse = {
  solved: boolean
  attempts: number
  message: string
  explanation?: string
  leaderboard?: LeaderboardEntry[]
}

export type AdminMystery = PublicMystery & {
  answer: string
  aliases: string[]
}

export type AdminSubmission = {
  id: string
  mysteryId: string
  playerId: string
  name: string
  attempts: number
  startedAt: string
  solvedAt: string | null
  hintsUsed: number
}

export type AdminSessionResponse = {
  ok: true
}

export type SocialPost = {
  id: string
  mysteryId: string
  date: string
  time: string
  platform: 'x' | 'instagram_feed' | 'instagram_story' | 'tiktok'
  type: 'main' | 'hint_1' | 'hint_final' | 'stat' | 'mid_hint' | 'ranking' | 'atmosphere'
  status: 'draft' | 'ready' | 'posted' | 'skipped'
  text: string
  imageUrl?: string
  link?: string
  publishMode: 'manual' | 'automatic'
  postedAt?: string
  postedBy?: string
  externalPostId?: string
  errorMessage?: string
  createdAt: string
  updatedAt: string
}

export type SocialPlanResponse = {
  date: string
  posts: SocialPost[]
}
