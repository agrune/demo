// The demo's small backend: reactions (like · dislike), attachments, board settings and the activity feed.
// Served by the vite dev server (vite.config.ts) and by demo-server.mjs. Data lives in .demo-data/ next to this file.
//
//   GET  /api/reactions?task=<id>&user=<member id>   → { task, up, down, mine }
//   POST /api/reactions { task, user, kind, on }     → { task, up, down, mine }
//   GET  /api/tasks/<id>/attachments                 → [{ id, task, name, size, type, by, uploadedAt }]
//   POST /api/tasks/<id>/attachments  (body = file, x-file-name, x-user)  → the attachment
//   GET  /api/attachments/<id>/download              → the file
//   DELETE /api/attachments/<id>
//   GET  /api/settings · PUT /api/settings { … }     → settings
//   GET  /api/activity · POST /api/activity { text, user }
//   POST /api/reset                                  → back to the seed (data, files, settings)
//   GET  /api/state                                  → everything, for checking
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const DATA = process.env.DEMO_DATA_DIR || path.join(ROOT, '.demo-data')
const FILES = path.join(DATA, 'files')
const STATE = path.join(DATA, 'state.json')
const SEED_FILES = path.join(ROOT, 'demo-seed', 'files')

const MAX_FILE = 2 * 1024 * 1024
const MAX_PER_TASK = 5

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const latency = () => sleep(20 + Math.floor(Math.random() * 130))

// Other teammates' reactions, so counts are not all zero.
const SEED_REACTIONS = {
  'task-1': { 'member-2': 'up', 'member-3': 'up', 'member-7': 'up' },
  'task-2': { 'member-1': 'up', 'member-5': 'down' },
  'task-3': { 'member-4': 'up' },
  'task-4': {},
  'task-5': { 'member-9': 'down', 'member-10': 'down' },
  'task-6': { 'member-1': 'up', 'member-2': 'up' },
  'task-7': { 'member-3': 'up' },
  'task-8': {},
}

const SEED_ATTACHMENTS = [
  { id: 'att-1', task: 'task-2', name: 'auth-flow.md', type: 'text/markdown', by: 'Bob Kim', uploadedAt: '2026-11-10T02:10:00Z' },
  { id: 'att-2', task: 'task-3', name: 'notes.txt', type: 'text/plain', by: 'Charlie Park', uploadedAt: '2026-11-11T05:40:00Z' },
  { id: 'att-3', task: 'task-4', name: 'endpoints.csv', type: 'text/csv', by: 'Diana Lee', uploadedAt: '2026-11-11T07:00:00Z' },
  { id: 'att-4', task: 'task-6', name: 'UAT 회의록.txt', type: 'text/plain', by: 'Eve Wang', uploadedAt: '2026-11-12T09:30:00Z' },
]

const SEED_SETTINGS = {
  wipLimits: { todo: null, 'in-progress': null, 'in-review': null, done: null },
  showOverdue: true,
  notifications: { mentions: true, dailyDigest: false, weeklyReport: false },
  language: 'en',
}

export function seed() {
  fs.rmSync(DATA, { recursive: true, force: true })
  fs.mkdirSync(FILES, { recursive: true })
  for (const a of SEED_ATTACHMENTS) fs.copyFileSync(path.join(SEED_FILES, a.name), path.join(FILES, a.name))
  const state = {
    reactions: structuredClone(SEED_REACTIONS),
    attachments: SEED_ATTACHMENTS.map((a) => ({ ...a, size: fs.statSync(path.join(FILES, a.name)).size })),
    settings: structuredClone(SEED_SETTINGS),
    activity: [],
    nextId: 100,
  }
  save(state)
  return state
}

function load() {
  if (!fs.existsSync(STATE)) return seed()
  return JSON.parse(fs.readFileSync(STATE, 'utf8'))
}

function save(state) {
  fs.mkdirSync(DATA, { recursive: true })
  fs.writeFileSync(STATE, JSON.stringify(state, null, 2))
}

function counts(state, task, user) {
  const all = state.reactions[task] || {}
  const vals = Object.values(all)
  return { task, up: vals.filter((v) => v === 'up').length, down: vals.filter((v) => v === 'down').length, mine: all[user] || null }
}

function send(res, status, value) {
  const body = JSON.stringify(value)
  res.statusCode = status
  res.setHeader('content-type', 'application/json')
  res.setHeader('content-length', Buffer.byteLength(body))
  res.end(body)
}

function readBody(req, limit = MAX_FILE + 1) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > limit) { reject(Object.assign(new Error('File is larger than 2 MB'), { status: 413 })); req.destroy(); return }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

const readJson = async (req) => { const b = await readBody(req, 1024 * 1024); return b.length ? JSON.parse(b.toString('utf8')) : {} }

async function reactions(req, res, url) {
  if (req.method === 'GET') {
    await latency()
    return send(res, 200, counts(load(), url.searchParams.get('task'), url.searchParams.get('user')))
  }
  const { task, user, kind, on } = await readJson(req)
  if (!task || !user || !['up', 'down'].includes(kind)) return send(res, 400, { error: 'task, user and kind (up · down) are needed' })
  await latency()
  const state = load()
  const mine = (state.reactions[task] ||= {})
  if (on) mine[user] = kind
  else if (mine[user] === kind) delete mine[user]
  save(state)
  return send(res, 200, counts(state, task, user))
}

async function listAttachments(res, task) {
  await latency()
  return send(res, 200, load().attachments.filter((a) => a.task === task))
}

async function upload(req, res, task) {
  const name = decodeURIComponent(String(req.headers['x-file-name'] || '')).replace(/[\\/]/g, '_').trim()
  if (!name) return send(res, 400, { error: 'x-file-name is needed' })
  const body = await readBody(req)
  const state = load()
  const mine = state.attachments.filter((a) => a.task === task)
  if (mine.some((a) => a.name === name)) return send(res, 409, { error: `A file named "${name}" is already attached` })
  if (mine.length >= MAX_PER_TASK) return send(res, 409, { error: `A task can have up to ${MAX_PER_TASK} files` })
  // simulated processing time (scan · thumbnail)
  await sleep(120 + Math.floor(Math.random() * 80))
  await fsp.writeFile(path.join(FILES, name), body)
  const item = {
    id: `att-${state.nextId++}`,
    task,
    name,
    size: body.length,
    type: String(req.headers['content-type'] || 'application/octet-stream'),
    by: decodeURIComponent(String(req.headers['x-user'] || 'Unknown')),
    uploadedAt: new Date().toISOString(),
  }
  state.attachments.push(item)
  save(state)
  return send(res, 201, item)
}

async function download(res, id) {
  const a = load().attachments.find((x) => x.id === id)
  if (!a) return send(res, 404, { error: 'No such file' })
  const body = await fsp.readFile(path.join(FILES, a.name))
  res.statusCode = 200
  res.setHeader('content-type', a.type)
  res.setHeader('content-length', body.length)
  res.setHeader('content-disposition', `attachment; filename="${a.name}"`)
  res.end(body)
}

async function removeAttachment(res, id) {
  await latency()
  const state = load()
  const a = state.attachments.find((x) => x.id === id)
  if (!a) return send(res, 404, { error: 'No such file' })
  state.attachments = state.attachments.filter((x) => x.id !== id)
  if (!state.attachments.some((x) => x.name === a.name)) fs.rmSync(path.join(FILES, a.name), { force: true })
  save(state)
  return send(res, 200, { ok: true })
}

async function settings(req, res) {
  await latency()
  const state = load()
  if (req.method === 'PUT') {
    const patch = await readJson(req)
    state.settings = { ...state.settings, ...patch }
    save(state)
  }
  return send(res, 200, state.settings)
}

async function activity(req, res) {
  const state = load()
  if (req.method === 'GET') return send(res, 200, state.activity.slice(-50))
  const { text, user } = await readJson(req)
  await sleep(250 + Math.floor(Math.random() * 100))
  const now = load()
  const item = { id: `act-${now.nextId++}`, text: String(text || ''), user: String(user || ''), at: new Date().toISOString() }
  now.activity.push(item)
  save(now)
  return send(res, 201, item)
}

// true when the request was an API request (and has been answered).
export async function handleApi(req, res) {
  const url = new URL(req.url || '/', 'http://demo')
  if (!url.pathname.startsWith('/api/') || url.pathname === '/api/npc-reply') return false
  const p = url.pathname
  let m
  try {
    if (p === '/api/reset' && req.method === 'POST') { seed(); send(res, 200, { ok: true }) }
    else if (p === '/api/state') send(res, 200, load())
    else if (p === '/api/reactions') await reactions(req, res, url)
    else if ((m = /^\/api\/tasks\/([^/]+)\/attachments$/.exec(p))) {
      if (req.method === 'POST') await upload(req, res, decodeURIComponent(m[1]))
      else await listAttachments(res, decodeURIComponent(m[1]))
    } else if ((m = /^\/api\/attachments\/([^/]+)\/download$/.exec(p))) await download(res, m[1])
    else if ((m = /^\/api\/attachments\/([^/]+)$/.exec(p)) && req.method === 'DELETE') await removeAttachment(res, m[1])
    else if (p === '/api/settings') await settings(req, res)
    else if (p === '/api/activity') await activity(req, res)
    else send(res, 404, { error: 'Not found' })
  } catch (e) {
    if (!res.headersSent) { res.removeHeader('content-disposition'); send(res, e.status || 500, { error: e.message }) }
    else res.end()
  }
  return true
}
