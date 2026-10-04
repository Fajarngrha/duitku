import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { defaultProfile, MONTHLY_BUDGET, seedCategories, seedTransactions } from '../data/mock'
import type { Category, ChartPoint, Profile, Transaction } from '../types'

export type BotLink = {
  api: boolean
  connected: boolean
  username: string | null
}

type LedgerPayload = {
  categories: Category[]
  transactions: Transaction[]
  budget: number
  profile?: Profile
  bot: BotLink
}

type FinanceContextValue = {
  categories: Category[]
  transactions: Transaction[]
  budget: number
  spent: number
  remaining: number
  chartData: ChartPoint[]
  recent: Transaction[]
  usageByCategory: Record<string, number>
  bot: BotLink
  profile: Profile
  updateProfile: (profile: Profile) => void
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void
  updateTransaction: (transaction: Transaction) => void
  deleteTransaction: (id: string) => void
  addCategory: (category: Omit<Category, 'id'>) => void
  categoryById: (id: string) => Category | undefined
}

const FinanceContext = createContext<FinanceContextValue | null>(null)

function categoryIdFromName(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return `${base || 'category'}-${crypto.randomUUID().slice(0, 4)}`
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>(seedCategories)
  const [transactions, setTransactions] = useState<Transaction[]>(seedTransactions)
  const [budget, setBudget] = useState(MONTHLY_BUDGET)
  const [profile, setProfile] = useState<Profile>(defaultProfile)
  const [bot, setBot] = useState<BotLink>({ api: false, connected: false, username: null })
  const liveRef = useRef(false)
  const generation = useRef(0)

  function applyLedger(ledger: LedgerPayload) {
    setCategories(ledger.categories)
    setTransactions(ledger.transactions)
    setBudget(ledger.budget)
    setProfile(ledger.profile ?? defaultProfile)
    setBot(ledger.bot)
    liveRef.current = true
  }

  useEffect(() => {
    let stopped = false
    let timer = 0

    async function refresh() {
      const ticket = generation.current
      try {
        const response = await fetch('/api/ledger')
        if (!response.ok) throw new Error('Ledger unavailable')
        const ledger = (await response.json()) as LedgerPayload
        if (!stopped && ticket === generation.current) applyLedger(ledger)
      } catch {
        if (!stopped) {
          liveRef.current = false
          setBot((current) => ({ ...current, api: false, connected: false }))
        }
      }
    }

    async function tick() {
      await refresh()
      if (!stopped) timer = window.setTimeout(tick, 3000)
    }

    void tick()
    return () => {
      stopped = true
      window.clearTimeout(timer)
    }
  }, [])

  async function persist(path: string, init: RequestInit) {
    if (!liveRef.current) return false
    const ticket = ++generation.current
    const response = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    })
    if (!response.ok || ticket !== generation.current) return false
    applyLedger((await response.json()) as LedgerPayload)
    return true
  }

  const value = useMemo<FinanceContextValue>(() => {
    const spent = transactions.reduce((sum, transaction) => sum + transaction.amount, 0)
    const usageByCategory: Record<string, number> = {}
    for (const category of categories) usageByCategory[category.id] = 0
    for (const transaction of transactions) {
      usageByCategory[transaction.categoryId] = (usageByCategory[transaction.categoryId] ?? 0) + 1
    }

    const totals = new Map<string, number>()
    for (const transaction of transactions) {
      totals.set(transaction.categoryId, (totals.get(transaction.categoryId) ?? 0) + transaction.amount)
    }

    const chartData = categories
      .map((category) => ({ name: category.name, amount: totals.get(category.id) ?? 0 }))
      .filter((point) => point.amount > 0)
      .sort((a, b) => b.amount - a.amount)

    const recent = [...transactions]
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, 5)

    return {
      categories,
      transactions: [...transactions].sort(
        (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
      ),
      budget,
      spent,
      remaining: budget - spent,
      chartData,
      recent,
      usageByCategory,
      bot,
      profile,
      updateProfile: (next) => {
        const name = next.name.trim()
        if (!name) return
        setProfile({ name, handle: next.handle })
        if (!liveRef.current) return
        void persist('/api/profile', { method: 'PUT', body: JSON.stringify({ name, handle: next.handle }) })
      },
      addTransaction: (transaction) => {
        if (!liveRef.current) {
          setTransactions((current) => [{ ...transaction, id: crypto.randomUUID() }, ...current])
          return
        }
        void persist('/api/transactions', { method: 'POST', body: JSON.stringify(transaction) })
      },
      updateTransaction: (transaction) => {
        if (!liveRef.current) {
          setTransactions((current) => current.map((item) => (item.id === transaction.id ? transaction : item)))
          return
        }
        void persist(`/api/transactions/${transaction.id}`, { method: 'PUT', body: JSON.stringify(transaction) })
      },
      deleteTransaction: (id) => {
        if (!liveRef.current) {
          setTransactions((current) => current.filter((item) => item.id !== id))
          return
        }
        void persist(`/api/transactions/${id}`, { method: 'DELETE' })
      },
      addCategory: (category) => {
        if (!liveRef.current) {
          setCategories((current) => [...current, { ...category, id: categoryIdFromName(category.name) }])
          return
        }
        void persist('/api/categories', { method: 'POST', body: JSON.stringify(category) })
      },
      categoryById: (id) => categories.find((category) => category.id === id),
    }
  }, [categories, transactions, budget, bot, profile])

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance() {
  const context = useContext(FinanceContext)
  if (!context) throw new Error('useFinance must be used within FinanceProvider')
  return context
}
