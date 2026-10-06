import { apiClient, type ApiClient } from '../shared/api/client.js'
import {
  normalizeProgram,
  normalizeSession,
  normalizeSessionSet
} from './format.js'
import type {
  LogSetInput,
  Program,
  ProgramListResponse,
  ProgramResponse,
  Session,
  SessionListResponse,
  SessionResponse,
  SessionSet,
  SessionSetResponse,
  UpdateSetInput
} from './types.js'

export async function listPrograms(client: ApiClient = apiClient): Promise<Program[]> {
  const response = await client.get<ProgramListResponse>('/api/programs')
  return response.programs.map(normalizeProgram)
}

export async function getProgram(id: number, client: ApiClient = apiClient): Promise<Program> {
  const response = await client.get<ProgramResponse>(`/api/programs/${id}`)
  return normalizeProgram(response.program)
}

export async function listSessions(client: ApiClient = apiClient): Promise<Session[]> {
  const response = await client.get<SessionListResponse>('/api/sessions')
  return response.sessions.map(normalizeSession)
}

export async function getSession(id: number, client: ApiClient = apiClient): Promise<Session> {
  const response = await client.get<SessionResponse>(`/api/sessions/${id}`)
  return normalizeSession(response.session)
}

export async function startProgramSession(programId: number, client: ApiClient = apiClient): Promise<Session> {
  const response = await client.request<SessionResponse>('/api/sessions', {
    method: 'POST',
    body: { programId }
  })
  return normalizeSession(response.session)
}

export async function logSessionSet(sessionId: number, input: LogSetInput, client: ApiClient = apiClient): Promise<SessionSet> {
  const response = await client.request<SessionSetResponse>(`/api/sessions/${sessionId}/sets`, {
    method: 'POST',
    body: input
  })
  return normalizeSessionSet(response.set)
}

export async function updateSessionSet(sessionId: number, setId: number, input: UpdateSetInput, client: ApiClient = apiClient): Promise<SessionSet> {
  const response = await client.request<SessionSetResponse>(`/api/sessions/${sessionId}/sets/${setId}`, {
    method: 'PATCH',
    body: input
  })
  return normalizeSessionSet(response.set)
}

export async function deleteSessionSet(sessionId: number, setId: number, client: ApiClient = apiClient): Promise<void> {
  await client.request<void>(`/api/sessions/${sessionId}/sets/${setId}`, {
    method: 'DELETE'
  })
}

export async function finishSession(sessionId: number, notes: string, client: ApiClient = apiClient): Promise<Session> {
  const response = await client.request<SessionResponse>(`/api/sessions/${sessionId}/finish`, {
    method: 'POST',
    body: notes.trim() ? { notes: notes.trim() } : {}
  })
  return normalizeSession(response.session)
}
