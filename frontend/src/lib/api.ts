import type { AdminMystery, AdminSessionResponse, AdminSubmission, GamePayload, GuessResponse } from '../types'

async function request<T>(input: string, init?: RequestInit) {
  const headers = new Headers(init?.headers)
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(input, {
    ...init,
    credentials: 'same-origin',
    headers,
  })

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(data?.error ?? 'Falha na requisicao.')
  }

  if (response.status === 204) {
    return null as T
  }

  return (await response.json()) as T
}

export function fetchGame(playerId: string) {
  return request<GamePayload>(`/api/game?playerId=${encodeURIComponent(playerId)}`)
}

export function submitGuess(payload: { playerId: string; nickname: string; guess: string }) {
  return request<GuessResponse>('/api/game/guess', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function adminLogin(token: string) {
  return request<AdminSessionResponse>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export function adminLogout() {
  return request<AdminSessionResponse>('/api/admin/logout', {
    method: 'POST',
  })
}

export function fetchAdminMysteries() {
  return request<{ mysteries: AdminMystery[] }>('/api/admin/mysteries')
}

export function fetchAdminSubmissions(mysteryId: string) {
  return request<{ submissions: AdminSubmission[] }>(`/api/admin/submissions?mysteryId=${encodeURIComponent(mysteryId)}`)
}

export function createAdminMystery(mystery: AdminMystery) {
  return request<{ mystery: AdminMystery }>('/api/admin/mysteries', {
    method: 'POST',
    body: JSON.stringify(mystery),
  })
}

export function updateAdminMystery(mystery: AdminMystery) {
  return request<{ mystery: AdminMystery }>(`/api/admin/mysteries/${encodeURIComponent(mystery.id)}`, {
    method: 'PUT',
    body: JSON.stringify(mystery),
  })
}

export function deleteAdminMystery(mysteryId: string) {
  return request<null>(`/api/admin/mysteries/${encodeURIComponent(mysteryId)}`, {
    method: 'DELETE',
  })
}

export function resetAdminSubmissions(mysteryId: string) {
  return request<{ ok: true }>(`/api/admin/mysteries/${encodeURIComponent(mysteryId)}/reset-submissions`, {
    method: 'POST',
  })
}

export async function uploadAdminImage(file: File) {
  const formData = new FormData()
  formData.append('image', file)

  const response = await fetch('/api/admin/upload', {
    method: 'POST',
    body: formData,
    credentials: 'same-origin',
  })

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(data?.error ?? 'Falha no upload.')
  }

  return (await response.json()) as { imageUrl: string }
}
