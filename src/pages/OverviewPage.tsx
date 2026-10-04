import { useState, type FormEvent } from 'react'
import { Send } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Modal } from '../components/Modal'
import { useFinance } from '../context/FinanceContext'
import { REPORT_PERIOD } from '../data/mock'
import { formatRupiah, formatShortDate, nowLocalIso } from '../lib/format'
import { inferCategoryId, parseExpense } from '../lib/parseExpense'

export function OverviewPage() {
  const { spent, budget, remaining, chartData, recent, categoryById, categories, addTransaction, bot } = useFinance()
  const [botOpen, setBotOpen] = useState(false)

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-[28px] font-bold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted">Financial summary for {REPORT_PERIOD}</p>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Stat label="Total spent" value={formatRupiah(spent)} />
        <Stat label="Budget" value={formatRupiah(budget)} />
        <Stat label="Remaining" value={formatRupiah(remaining)} tone={remaining >= 0 ? 'positive' : 'danger'} />

        <section className="rounded-lg border border-line bg-surface p-5 xl:col-span-2">
          <h2 className="text-base font-semibold">Expenses by Category</h2>
          <div className="mt-4 h-[300px]">
            {chartData.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted">No expenses recorded yet.</p>
            ) : (
              <CategoryChart />
            )}
          </div>
        </section>

        <section className="rounded-lg border border-line bg-surface xl:row-span-2">
          <h2 className="border-b border-line px-5 py-4 text-base font-semibold">Recent Activity</h2>
          {recent.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted">Transactions you add will show up here.</p>
          ) : (
            <ul>
              {recent.map((transaction) => {
                const category = categoryById(transaction.categoryId)
                return (
                  <li
                    key={transaction.id}
                    className="flex items-start justify-between gap-4 border-b border-line px-5 py-3.5 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{transaction.description}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {category?.name ?? 'Uncategorized'} · {formatShortDate(transaction.occurredAt)}
                      </p>
                    </div>
                    <p className="font-mono text-sm font-medium tabular-nums">{formatRupiah(transaction.amount)}</p>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="flex items-center gap-4 rounded-lg border border-accent-line bg-accent-soft px-5 py-4 xl:col-span-2">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-accent">
            <Send size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{bot.connected ? 'Telegram Bot Active' : 'Telegram Bot Offline'}</p>
            <p className="text-sm text-muted">
              {bot.connected
                ? `FinBot is connected as @${bot.username}. Send a message like "50000 makan siang" to track.`
                : 'Create a bot with @BotFather, paste TELEGRAM_BOT_TOKEN into .env, then restart.'}
            </p>
          </div>
          {bot.connected && bot.username ? (
            <a
              href={`https://t.me/${bot.username}`}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium hover:bg-nav"
            >
              Open Bot
            </a>
          ) : (
            <button
              type="button"
              onClick={() => setBotOpen(true)}
              className="shrink-0 rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium hover:bg-nav"
            >
              Open Bot
            </button>
          )}
        </section>
      </div>

      {botOpen && (
        <BotDialog
          onClose={() => setBotOpen(false)}
          onTrack={(message) => {
            const parsed = parseExpense(message)
            if (!parsed) return { ok: false as const }
            const categoryId = inferCategoryId(parsed.description, categories)
            addTransaction({
              description: parsed.description,
              amount: parsed.amount,
              categoryId,
              occurredAt: nowLocalIso(),
            })
            return { ok: true as const, ...parsed, categoryName: categoryById(categoryId)?.name ?? 'Uncategorized' }
          }}
        />
      )}
    </div>
  )
}

function Stat({ label, value, tone = 'ink' }: { label: string; value: string; tone?: 'ink' | 'positive' | 'danger' }) {
  const color = tone === 'positive' ? 'text-positive' : tone === 'danger' ? 'text-danger' : 'text-ink'
  return (
    <section className="rounded-lg border border-line bg-surface px-5 py-4">
      <p className="text-[11px] font-medium tracking-[0.08em] text-muted uppercase">{label}</p>
      <p className={`mt-2 text-[28px] leading-none font-bold tracking-tight ${color}`}>{value}</p>
    </section>
  )
}

function token(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function CategoryChart() {
  const { chartData } = useFinance()
  const peak = chartData[0]?.amount ?? 0
  const step = 150_000
  const axisMax = Math.max(step * 4, Math.ceil(peak / step) * step)
  const ticks = Array.from({ length: axisMax / step + 1 }, (_, index) => index * step)
  const highlight = chartData.findIndex((point) => point.amount === peak)

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke="var(--line)" />
        <XAxis
          dataKey="name"
          tick={{ fill: 'var(--muted)', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <YAxis
          domain={[0, axisMax]}
          ticks={ticks}
          tickFormatter={(value: number) => `Rp${value / 1000}k`}
          tick={{ fill: 'var(--faint)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip
          cursor={{ fill: 'transparent' }}
          formatter={(value) => [formatRupiah(Number(value)), 'Spent']}
          contentStyle={{
            border: '1px solid var(--line)',
            borderRadius: 8,
            fontSize: 12,
            boxShadow: 'none',
          }}
        />
        <Bar dataKey="amount" radius={[2, 2, 0, 0]} maxBarSize={56} isAnimationActive={false}>
          {chartData.map((point, index) => (
            <Cell key={point.name} fill={index === highlight ? token('--accent') : token('--bar')} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function BotDialog({
  onClose,
  onTrack,
}: {
  onClose: () => void
  onTrack: (message: string) =>
    | { ok: false }
    | { ok: true; amount: number; description: string; categoryName: string }
}) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [replies, setReplies] = useState<{ id: string; text: string }[]>([])

  function submit(event: FormEvent) {
    event.preventDefault()
    const result = onTrack(draft)
    if (!result.ok) {
      setError('Start with an amount, then a description. Example: 50000 makan siang')
      return
    }
    setError('')
    setReplies((current) => [
      {
        id: crypto.randomUUID(),
        text: `Tracked ${formatRupiah(result.amount)} for “${result.description}” in ${result.categoryName}.`,
      },
      ...current,
    ])
    setDraft('')
  }

  return (
    <Modal title="Telegram Bot" onClose={onClose}>
      <p className="text-sm text-muted">
        This box only previews the parser. After the BotFather token is in .env, Open Bot opens the real Telegram chat.
      </p>
      <form onSubmit={submit} className="mt-4 flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="50000 makan siang"
          aria-label="Message to FinBot"
          className="min-w-0 flex-1 rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button type="submit" className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white">
          Send
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      {replies.length > 0 && (
        <ul className="mt-4 space-y-2">
          {replies.map((reply) => (
            <li key={reply.id} className="rounded-md bg-nav px-3 py-2 text-sm">
              {reply.text}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
