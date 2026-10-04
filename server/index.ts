import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { inferCategoryId } from '../src/lib/parseExpense.ts'
import { cleanHandle, handleFromName } from '../src/lib/profile.ts'
import type { Category, Transaction } from '../src/types.ts'
import { loadEnv } from './env.ts'
import { readLedgerSnapshot, updateLedger } from './ledger.ts'
import { distReady, serveWeb } from './static.ts'
import { startTelegram, telegramStatus } from './telegram.ts'

loadEnv()

const production = process.env.NODE_ENV === 'production' || process.env.npm_lifecycle_event === 'start'
const host = process.env.HOST ?? (production ? '0.0.0.0' : '127.0.0.1')
const port = Number(process.env.PORT ?? process.env.BOT_PORT ?? (production ? 8080 : 8787))
const webReady = production && distReady()

function publicLedger(ledger: Awaited<ReturnType<typeof readLedgerSnapshot>>) {
  return {
    budget: ledger.budget,
    profile: ledger.profile,
    categories: ledger.categories,
    transactions: ledger.transactions,
    bot: { api: true, ...telegramStatus() },
  }
}

function send(response: ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body)
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  })
  response.end(payload)
}

async function readJson(request: IncomingMessage) {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  if (chunks.length === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>
}

function categoryIdFromName(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return `${base || 'category'}-${crypto.randomUUID().slice(0, 4)}`
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1')
    const { pathname } = url
    const method = request.method ?? 'GET'

    if (method === 'GET' && pathname === '/api/health') {
      send(response, 200, { ok: true, web: webReady })
      return
    }

    if (method === 'GET' && pathname === '/api/ledger') {
      send(response, 200, publicLedger(await readLedgerSnapshot()))
      return
    }

    if (method === 'POST' && pathname === '/api/transactions') {
      const body = await readJson(request)
      const description = String(body.description ?? '').trim()
      const amount = Number(body.amount)
      const occurredAt = String(body.occurredAt ?? '')
      if (!description || !Number.isFinite(amount) || amount <= 0 || !occurredAt) {
        send(response, 400, { error: 'Transaksi tidak lengkap.' })
        return
      }

      const ledger = await updateLedger((current) => {
        const categoryId = current.categories.some((category) => category.id === body.categoryId)
          ? String(body.categoryId)
          : inferCategoryId(description, current.categories)
        const transaction: Transaction = {
          id: crypto.randomUUID(),
          description,
          amount,
          categoryId,
          occurredAt,
        }
        current.transactions.push(transaction)
        return current
      })
      send(response, 201, publicLedger(ledger))
      return
    }

    const transactionMatch = pathname.match(/^\/api\/transactions\/([^/]+)$/)
    if (transactionMatch && method === 'PUT') {
      const body = await readJson(request)
      const id = decodeURIComponent(transactionMatch[1])
      const ledger = await updateLedger((current) => {
        const index = current.transactions.findIndex((transaction) => transaction.id === id)
        if (index === -1) return null
        const description = String(body.description ?? '').trim()
        const amount = Number(body.amount)
        const categoryId = String(body.categoryId ?? '')
        const occurredAt = String(body.occurredAt ?? '')
        if (!description || !Number.isFinite(amount) || amount <= 0 || !occurredAt) return null
        if (!current.categories.some((category) => category.id === categoryId)) return null
        current.transactions[index] = { id, description, amount, categoryId, occurredAt }
        return current
      })
      if (!ledger) {
        send(response, 400, { error: 'Transaksi tidak bisa diperbarui.' })
        return
      }
      send(response, 200, publicLedger(ledger))
      return
    }

    if (transactionMatch && method === 'DELETE') {
      const id = decodeURIComponent(transactionMatch[1])
      const ledger = await updateLedger((current) => {
        current.transactions = current.transactions.filter((transaction) => transaction.id !== id)
        return current
      })
      send(response, 200, publicLedger(ledger))
      return
    }

    if (method === 'PUT' && pathname === '/api/profile') {
      const body = await readJson(request)
      const name = String(body.name ?? '').trim()
      if (!name) {
        send(response, 400, { error: 'Nama wajib diisi.' })
        return
      }
      const handle = cleanHandle(String(body.handle ?? '')) || handleFromName(name)
      const ledger = await updateLedger((current) => {
        current.profile = { name, handle }
        return current
      })
      send(response, 200, publicLedger(ledger))
      return
    }

    if (method === 'POST' && pathname === '/api/categories') {
      const body = await readJson(request)
      const name = String(body.name ?? '').trim()
      const color = String(body.color ?? '#2563eb')
      if (!name) {
        send(response, 400, { error: 'Nama kategori wajib diisi.' })
        return
      }
      const ledger = await updateLedger((current) => {
        const category: Category = { id: categoryIdFromName(name), name, color }
        current.categories.push(category)
        return current
      })
      send(response, 201, publicLedger(ledger))
      return
    }

    if (pathname.startsWith('/api/')) {
      send(response, 404, { error: 'Tidak ditemukan.' })
      return
    }

    if (webReady) {
      serveWeb(request, response)
      return
    }

    send(response, 404, { error: 'Tidak ditemukan.' })
  } catch (error) {
    send(response, 500, { error: error instanceof Error ? error.message : 'Server error' })
  }
})

if (production && !webReady) {
  console.error('Folder dist belum ada. Jalankan npm run build sebelum npm start.')
}

server.listen(port, host, () => {
  console.log(`FinBot siap di http://${host}:${port}`)
  void startTelegram()
})
