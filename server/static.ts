import { createReadStream, existsSync, statSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'

const distDir = path.resolve(process.cwd(), 'dist')

const mimeTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

export function distReady() {
  return existsSync(path.join(distDir, 'index.html'))
}

export function serveWeb(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405)
    response.end()
    return
  }

  const url = new URL(request.url ?? '/', 'http://127.0.0.1')
  const requested = decodeURIComponent(url.pathname)
  const relativePath = requested === '/' ? 'index.html' : requested.replace(/^\/+/, '')
  const filePath = path.resolve(distDir, relativePath)
  const outsideDist = path.relative(distDir, filePath).startsWith('..') || path.isAbsolute(path.relative(distDir, filePath))

  if (outsideDist) {
    response.writeHead(400)
    response.end('Bad path')
    return
  }

  const file = existsSync(filePath) && statSync(filePath).isFile() ? filePath : null
  const target = file ?? (path.extname(relativePath) ? null : path.join(distDir, 'index.html'))

  if (!target || !existsSync(target)) {
    response.writeHead(404)
    response.end('Not found')
    return
  }

  response.writeHead(200, {
    'Content-Type': mimeTypes[path.extname(target)] ?? 'application/octet-stream',
    'Content-Length': statSync(target).size,
  })
  if (request.method === 'HEAD') {
    response.end()
    return
  }
  createReadStream(target).pipe(response)
}
