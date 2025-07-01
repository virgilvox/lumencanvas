import { getStore } from '@netlify/blobs'
    
const store = getStore({ name: 'vuefinder-files' })

export const handler = async (event) => {
  // strip the “/media/” prefix and decode
  const key = decodeURIComponent(event.rawUrl.split('/media/')[1] || '')
  if (!key) return { statusCode: 400, body: 'missing key' }

  const blob = await store.get(key, { type: 'arrayBuffer' })
  if (!blob) return { statusCode: 404, body: 'not found' }

  return {
    statusCode: 200,
    headers: {
      'content-type': guessMime(key),
      // one-year immutable caching
      'cache-control': 'public, max-age=31536000, immutable'
    },
    body: Buffer.from(blob).toString('base64'),
    isBase64Encoded: true
  }
}

const guessMime = (name) => {
  const ext = name.split('.').pop().toLowerCase()
  return {
    png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg',
    webp:'image/webp', gif:'image/gif', svg:'image/svg+xml',
    mp4:'video/mp4', webm:'video/webm', mov:'video/quicktime'
  }[ext] || 'application/octet-stream'
}