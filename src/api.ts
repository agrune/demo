import type { TaskStatus } from '@/types'

export interface Reactions {
  task: string
  up: number
  down: number
  mine: 'up' | 'down' | null
}

export interface Attachment {
  id: string
  task: string
  name: string
  size: number
  type: string
  by: string
  uploadedAt: string
}

export interface BoardSettings {
  wipLimits: Record<TaskStatus, number | null>
  showOverdue: boolean
  notifications: { mentions: boolean; dailyDigest: boolean; weeklyReport: boolean }
  language: string
}

async function json<T>(res: Response): Promise<T> {
  const body = await res.json()
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`)
  return body as T
}

export const api = {
  reactions: (task: string, user: string) =>
    fetch(`/api/reactions?task=${encodeURIComponent(task)}&user=${encodeURIComponent(user)}`).then((r) => json<Reactions>(r)),
  react: (task: string, user: string, kind: 'up' | 'down', on: boolean) =>
    fetch('/api/reactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ task, user, kind, on }),
    }).then((r) => json<Reactions>(r)),
  attachments: (task: string) => fetch(`/api/tasks/${encodeURIComponent(task)}/attachments`).then((r) => json<Attachment[]>(r)),
  upload: (task: string, file: File, by: string) =>
    fetch(`/api/tasks/${encodeURIComponent(task)}/attachments`, {
      method: 'POST',
      headers: {
        'content-type': file.type || 'application/octet-stream',
        'x-file-name': encodeURIComponent(file.name),
        'x-user': encodeURIComponent(by),
      },
      body: file,
    }).then((r) => json<Attachment>(r)),
  removeAttachment: (id: string) => fetch(`/api/attachments/${id}`, { method: 'DELETE' }).then((r) => json<{ ok: boolean }>(r)),
  downloadUrl: (id: string) => `/api/attachments/${id}/download`,
  settings: () => fetch('/api/settings').then((r) => json<BoardSettings>(r)),
  saveSettings: (patch: Partial<BoardSettings>) =>
    fetch('/api/settings', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch),
    }).then((r) => json<BoardSettings>(r)),
  activity: (text: string, user: string) =>
    fetch('/api/activity', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, user }),
    }).then((r) => json<{ id: string }>(r)),
}

export function formatSize(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}
