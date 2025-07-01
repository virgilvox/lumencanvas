// netlify/functions/vf.js  –  ESM
import 'dotenv/config'                 // loads .env during `netlify dev`
import { getStore } from '@netlify/blobs'
import multiparty   from 'multiparty'
import fs           from 'node:fs/promises'
import path         from 'node:path'

/*──────────────────────────────
  1.  Blob store
────────────────────────────────*/
const siteID = process.env.NETLIFY_SITE_ID
const token  = process.env.NETLIFY_AUTH_TOKEN

if (!siteID || !token) {
  throw new Error('➡  NETLIFY_SITE_ID or NETLIFY_AUTH_TOKEN missing – add them to .env')
}

const store = getStore({ name: 'vuefinder-files', siteID, token })

/*──────────────────────────────
  2.  Lambda handler
────────────────────────────────*/
export const handler = async (event) => {
  const ctype      = event.headers['content-type'] || ''
  const multipart  = ctype.includes('multipart/form-data')

  let action, payload
  if (event.httpMethod === 'GET') {
    action  = event.queryStringParameters.q || 'list'
    payload = { ...event.queryStringParameters }
  } else if (multipart) {
    action  = 'upload'
    payload = await parseForm(event)
  } else {
    payload = JSON.parse(event.body || '{}')
    action  = payload.action
  }

  try {
    switch (action) {
      case 'index':
      case 'list':     return listDir(payload.path || '')
      case 'upload':   return uploadFiles(payload)
      case 'delete':   return deleteItems(payload.items || [])
      case 'mkdir':    return makeDir(payload.path || '')
      case 'rename':   return rename(payload.item, payload.newItem)
      case 'download': return downloadUrl(payload.item)
      default:         return json(400, { error: `unknown action ${action}` })
    }
  } catch (err) {
    console.error('[vf] error', err)
    return json(500, { error: err.message })
  }
}

/*──────────────────────── helpers ───────────────────────*/
const json = (status, body) => ({
  statusCode: status,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

const parseForm = evt => new Promise((res, rej) =>
  new multiparty.Form().parse(
    { headers: evt.headers, body: Buffer.from(evt.body, 'base64') },
    (err, fields, files) => err ? rej(err) : res({ fields, files })
  ))

const BASE = process.env.PUBLIC_URL || 'http://localhost:8888'    // absolute base

/*──────────────────────── actions ───────────────────────*/
async function listDir(prefix = '') {
  const { blobs = [] } = await store.list({ prefix, details: true })
  const cdnBase = process.env.PUBLIC_URL ? `${BASE}/.netlify/images?url=` : null

  const files = blobs.map(b => {
    const raw  = `${BASE}/media/${encodeURIComponent(b.key)}`
    const mime = guessMime(b.key)
    const thumb = (cdnBase && mime.startsWith('image/'))
      ? `${cdnBase}${encodeURIComponent(raw)}&w=200&h=200&fit=cover`
      : raw

    return {
      name   : b.key.slice(prefix.length),
      is_dir : b.key.endsWith('/'),
      size   : b.size ?? 0,
      updated: b.updatedAt ?? null,
      key    : b.key,
      mime,
      url    : raw,
      thumb
    }
  })

  return json(200, { files })
}

async function uploadFiles({ fields, files }) {
  const dir = fields.path?.[0] ?? ''
  if (!files?.file?.length) return json(400, { error: 'no file' })

  await Promise.all(
    files.file.map(async f =>
      store.set(`${dir}${f.originalFilename}`, await fs.readFile(f.path)))
  )
  return json(200, { success: true })
}

const deleteItems = async keys => {
  await Promise.all(keys.map(k => store.delete(k)))
  return json(200, { success: true })
}

const makeDir = async path => {
  if (!path.endsWith('/')) path += '/'
  await store.set(path, new Uint8Array())        // zero-byte folder marker
  return json(200, { success: true })
}

async function rename(oldKey, newKey) {
  if (!oldKey || !newKey) return json(400, { error: 'item and newItem required' })
  const data = await store.get(oldKey, { type: 'arrayBuffer' })
  if (!data) return json(404, { error: 'source not found' })
  await store.set(newKey, Buffer.from(data))
  await store.delete(oldKey)
  return json(200, { success: true })
}

function downloadUrl(key) {
  if (!key) return json(400, { error: 'missing item' })
  return json(200, { url: `${BASE}/media/${encodeURIComponent(key)}` })
}

/*───────────────────── MIME helper ─────────────────────*/
function guessMime(filename) {
  switch (path.extname(filename).toLowerCase()) {
    case '.png':  return 'image/png'
    case '.jpg':
    case '.jpeg': return 'image/jpeg'
    case '.webp': return 'image/webp'
    case '.gif':  return 'image/gif'
    case '.svg':  return 'image/svg+xml'
    case '.mp4':  return 'video/mp4'
    case '.mov':  return 'video/quicktime'
    case '.webm': return 'video/webm'
    case '.pdf':  return 'application/pdf'
    default:      return 'application/octet-stream'
  }
}
