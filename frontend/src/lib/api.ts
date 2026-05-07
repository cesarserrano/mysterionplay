import type { AdminMystery, AdminSubmission, GamePayload, GuessResponse } from '../types'

async function request<T>(input: string, init?: RequestInit) {
  const response = await fetch(input, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
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
  return request<{ ok: true }>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export function fetchAdminMysteries(token: string) {
  return request<{ mysteries: AdminMystery[] }>('/api/admin/mysteries', {
    headers: { 'x-admin-token': token },
  })
}

export function fetchAdminSubmissions(token: string, mysteryId: string) {
  return request<{ submissions: AdminSubmission[] }>(
    `/api/admin/submissions?mysteryId=${encodeURIComponent(mysteryId)}`,
    { headers: { 'x-admin-token': token } },
  )
}

export function createAdminMystery(token: string, mystery: AdminMystery) {
  return request<{ mystery: AdminMystery }>('/api/admin/mysteries', {
    method: 'POST',
    headers: { 'x-admin-token': token },
    body: JSON.stringify(mystery),
  })
}

export function updateAdminMystery(token: string, mystery: AdminMystery) {
  return request<{ mystery: AdminMystery }>(`/api/admin/mysteries/${encodeURIComponent(mystery.id)}`, {
    method: 'PUT',
    headers: { 'x-admin-token': token },
    body: JSON.stringify(mystery),
  })
}

export function deleteAdminMystery(token: string, mysteryId: string) {
  return request<null>(`/api/admin/mysteries/${encodeURIComponent(mysteryId)}`, {
    method: 'DELETE',
    headers: { 'x-admin-token': token },
  })
}

export function resetAdminSubmissions(token: string, mysteryId: string) {
  return request<{ ok: true }>(`/api/admin/mysteries/${encodeURIComponent(mysteryId)}/reset-submissions`, {
    method: 'POST',
    headers: { 'x-admin-token': token },
  })
}
