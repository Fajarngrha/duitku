import type { Category, Profile, Transaction } from '../types'

export const defaultProfile: Profile = {
  name: 'Budi Santoso',
  handle: 'budis',
}

export const REPORT_PERIOD = 'October 2026'
export const MONTHLY_BUDGET = 2_000_000

export const CATEGORY_COLORS = [
  '#2563eb',
  '#16a34a',
  '#ef4444',
  '#f59e0b',
  '#7c3aed',
  '#475569',
]

export const seedCategories: Category[] = [
  { id: 'food', name: 'Food & Drink', color: '#2563eb' },
  { id: 'transport', name: 'Transport', color: '#16a34a' },
  { id: 'bills', name: 'Bills', color: '#ef4444' },
  { id: 'shopping', name: 'Shopping', color: '#f59e0b' },
]

export const seedTransactions: Transaction[] = [
  {
    id: 'tx-1',
    description: 'Makan siang di warteg',
    amount: 50_000,
    categoryId: 'food',
    occurredAt: '2026-10-01T19:30:00',
  },
  {
    id: 'tx-2',
    description: 'Bensin',
    amount: 150_000,
    categoryId: 'transport',
    occurredAt: '2026-10-01T15:15:00',
  },
  {
    id: 'tx-3',
    description: 'Ngopi',
    amount: 25_000,
    categoryId: 'food',
    occurredAt: '2026-09-30T23:00:00',
  },
  {
    id: 'tx-4',
    description: 'Listrik',
    amount: 500_000,
    categoryId: 'bills',
    occurredAt: '2026-09-28T16:00:00',
  },
  {
    id: 'tx-5',
    description: 'Beli buku',
    amount: 120_000,
    categoryId: 'shopping',
    occurredAt: '2026-09-27T21:20:00',
  },
  {
    id: 'tx-6',
    description: 'Gojek',
    amount: 35_000,
    categoryId: 'transport',
    occurredAt: '2026-09-27T02:45:00',
  },
]
