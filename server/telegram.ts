import { inferCategoryId, parseExpense } from '../src/lib/parseExpense.ts'
import { updateLedger, type Ledger } from './ledger.ts'

type TelegramUpdate = {
  update_id: number
  message?: {
    text?: string
    chat: { id: number; type: string }
  }
}

type TelegramStatus = {
  connected: boolean
  username: string | null
}

const status: TelegramStatus = { connected: false, username: null }

export function telegramStatus() {
  return { ...status }
}

function formatRupiah(amount: number) {
  return `Rp ${amount.toLocaleString('id-ID')}`
}

function nowLocalIso() {
  const date = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

async function callTelegram<T>(token: string, method: string, body?: object): Promise<T> {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(method === 'getUpdates' ? 35_000 : 15_000),
  })
  const payload = (await response.json()) as { ok: boolean; result: T; description?: string }
  if (!payload.ok) throw new Error(payload.description ?? `${method} failed`)
  return payload.result
}

async function reply(token: string, chatId: number, text: string) {
  await callTelegram(token, 'sendMessage', { chat_id: chatId, text })
}

function commandName(text: string) {
  const [first] = text.trim().split(/\s+/)
  return first?.split('@')[0]?.toLowerCase() ?? ''
}

function allowedChat(ledger: Ledger, chatId: number) {
  const configured = process.env.TELEGRAM_CHAT_ID?.trim()
  if (configured) return Number(configured) === chatId
  if (ledger.ownerChatId === null) {
    ledger.ownerChatId = chatId
    return true
  }
  return ledger.ownerChatId === chatId
}

async function handleMessage(token: string, chatId: number, text: string) {
  const allowed = await updateLedger((ledger) => allowedChat(ledger, chatId))
  if (!allowed) {
    await reply(token, chatId, 'Bot ini hanya mencatat pengeluaran untuk pemilik FinBot.')
    return
  }

  const command = commandName(text)

  if (command === '/start' || command === '/bantuan' || command === '/help') {
    await reply(
      token,
      chatId,
      [
        'Halo, saya FinBot.',
        '',
        'Catat pengeluaran dengan format:',
        '50000 makan siang',
        '150000 bensin',
        '',
        'Perintah:',
        '/ringkas — total pemakaian dan sisa budget',
        '/bantuan — tampilkan pesan ini',
      ].join('\n'),
    )
    return
  }

  if (command === '/ringkas' || command === '/saldo') {
    const ledger = await updateLedger((current) => current)
    const spent = ledger.transactions.reduce((sum, transaction) => sum + transaction.amount, 0)
    await reply(
      token,
      chatId,
      `Total terpakai: ${formatRupiah(spent)}\nSisa budget: ${formatRupiah(ledger.budget - spent)}`,
    )
    return
  }

  const parsed = parseExpense(text)
  if (!parsed) {
    await reply(token, chatId, 'Formatnya: 50000 makan siang')
    return
  }

  const saved = await updateLedger((ledger) => {
    const categoryId = inferCategoryId(parsed.description, ledger.categories)
    const category = ledger.categories.find((item) => item.id === categoryId)
    const transaction = {
      id: crypto.randomUUID(),
      description: parsed.description,
      amount: parsed.amount,
      categoryId,
      occurredAt: nowLocalIso(),
    }
    ledger.transactions.push(transaction)
    return { transaction, categoryName: category?.name ?? 'Uncategorized' }
  })

  await reply(
    token,
    chatId,
    `Tercatat ${formatRupiah(saved.transaction.amount)}\n${saved.transaction.description} · ${saved.categoryName}`,
  )
}

export async function startTelegram() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
  if (!token) {
    console.log('TELEGRAM_BOT_TOKEN kosong. Isi token dari @BotFather di file .env, lalu jalankan ulang.')
    return
  }

  try {
    const me = await callTelegram<{ username?: string }>(token, 'getMe')
    await callTelegram(token, 'deleteWebhook', { drop_pending_updates: false })
    status.connected = true
    status.username = me.username ?? null
    console.log(`Telegram tersambung sebagai @${status.username ?? 'bot'}`)
  } catch (error) {
    status.connected = false
    console.error(`Token Telegram ditolak: ${error instanceof Error ? error.message : error}`)
    return
  }

  void poll(token)
}

async function poll(token: string) {
  let offset = 0
  for (;;) {
    try {
      const updates = await callTelegram<TelegramUpdate[]>(token, 'getUpdates', {
        offset,
        timeout: 25,
        allowed_updates: ['message'],
      })
      for (const update of updates) {
        offset = update.update_id + 1
        const message = update.message
        if (!message?.text || message.chat.type !== 'private') continue
        try {
          await handleMessage(token, message.chat.id, message.text)
        } catch (error) {
          console.error(`Gagal membalas chat: ${error instanceof Error ? error.message : error}`)
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (!message.includes('aborted')) console.error(`Polling Telegram gagal: ${message}`)
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }
  }
}
