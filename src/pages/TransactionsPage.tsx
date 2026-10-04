import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Filter, Pencil, Search, Trash2 } from 'lucide-react'
import { Modal } from '../components/Modal'
import { useFinance } from '../context/FinanceContext'
import { formatDateTime, formatRupiah, toDateTimeLocal } from '../lib/format'
import type { Transaction } from '../types'

export function TransactionsPage() {
  const { transactions, categories, categoryById, updateTransaction, deleteTransaction } = useFinance()
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null)
  const filterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!filterRef.current?.contains(event.target as Node)) setFilterOpen(false)
    }
    window.addEventListener('mousedown', onPointer)
    return () => window.removeEventListener('mousedown', onPointer)
  }, [])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return transactions.filter((transaction) => {
      const category = categoryById(transaction.categoryId)
      const matchesCategory = categoryId === 'all' || transaction.categoryId === categoryId
      const matchesQuery =
        needle.length === 0 ||
        transaction.description.toLowerCase().includes(needle) ||
        (category?.name.toLowerCase().includes(needle) ?? false)
      return matchesCategory && matchesQuery
    })
  }, [transactions, query, categoryId, categoryById])

  const activeCategory = categories.find((category) => category.id === categoryId)

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-[28px] font-bold tracking-tight">Transactions</h1>
        <p className="mt-1 text-sm text-muted">Review and manage your expenses entered via Telegram.</p>
      </header>

      <section className="rounded-lg border border-line bg-surface">
        <div className="flex flex-wrap items-center gap-3 px-5 py-4">
          <label className="relative block w-full max-w-sm">
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search descriptions or categories..."
              className="w-full rounded-md border border-line py-2 pr-3 pl-9 text-sm outline-none placeholder:text-faint focus:border-accent"
            />
          </label>

          <div className="relative" ref={filterRef}>
            <button
              type="button"
              aria-expanded={filterOpen}
              onClick={() => setFilterOpen((open) => !open)}
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                activeCategory ? 'border-accent text-accent' : 'border-line text-ink'
              } hover:bg-nav`}
            >
              <Filter size={15} />
              {activeCategory ? activeCategory.name : 'Filter'}
            </button>
            {filterOpen && (
              <div className="absolute left-0 z-20 mt-2 w-52 rounded-lg border border-line bg-surface p-1 shadow-[var(--shadow)]">
                <FilterOption
                  label="All categories"
                  active={categoryId === 'all'}
                  onClick={() => {
                    setCategoryId('all')
                    setFilterOpen(false)
                  }}
                />
                {categories.map((category) => (
                  <FilterOption
                    key={category.id}
                    label={category.name}
                    active={categoryId === category.id}
                    onClick={() => {
                      setCategoryId(category.id)
                      setFilterOpen(false)
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-t border-line text-left">
            <thead>
              <tr className="text-[11px] tracking-[0.08em] text-muted uppercase">
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Description</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 text-right font-medium">Amount</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm text-muted">
                    No transactions match this search.
                  </td>
                </tr>
              ) : (
                visible.map((transaction) => {
                  const category = categoryById(transaction.categoryId)
                  return (
                    <tr key={transaction.id} className="border-t border-line">
                      <td className="px-5 py-4 text-sm whitespace-nowrap text-muted">
                        {formatDateTime(transaction.occurredAt)}
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold">{transaction.description}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-md bg-nav px-2 py-1 text-xs font-medium">
                          {category?.name ?? 'Uncategorized'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-sm font-medium tabular-nums">
                        {formatRupiah(transaction.amount)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          <IconButton label={`Edit ${transaction.description}`} onClick={() => setEditing(transaction)}>
                            <Pencil size={15} />
                          </IconButton>
                          <IconButton
                            label={`Delete ${transaction.description}`}
                            onClick={() => setPendingDelete(transaction)}
                          >
                            <Trash2 size={15} />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {editing && (
        <EditDialog
          transaction={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSave={(next) => {
            updateTransaction(next)
            setEditing(null)
          }}
        />
      )}

      {pendingDelete && (
        <Modal title="Delete transaction" onClose={() => setPendingDelete(null)}>
          <p className="text-sm text-muted">
            Remove <span className="font-medium text-ink">{pendingDelete.description}</span> (
            {formatRupiah(pendingDelete.amount)}) from the ledger?
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPendingDelete(null)}
              className="rounded-md border border-line px-3 py-2 text-sm font-medium hover:bg-nav"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                deleteTransaction(pendingDelete.id)
                setPendingDelete(null)
              }}
              className="rounded-md bg-danger px-3 py-2 text-sm font-medium text-white"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function FilterOption({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full rounded-md px-3 py-2 text-left text-sm ${active ? 'bg-nav font-medium' : 'hover:bg-nav'}`}
    >
      {label}
    </button>
  )
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="rounded-md p-1.5 text-muted hover:bg-nav hover:text-ink"
    >
      {children}
    </button>
  )
}

function EditDialog({
  transaction,
  categories,
  onClose,
  onSave,
}: {
  transaction: Transaction
  categories: { id: string; name: string }[]
  onClose: () => void
  onSave: (transaction: Transaction) => void
}) {
  const [description, setDescription] = useState(transaction.description)
  const [amount, setAmount] = useState(String(transaction.amount))
  const [categoryId, setCategoryId] = useState(transaction.categoryId)
  const [occurredAt, setOccurredAt] = useState(toDateTimeLocal(transaction.occurredAt))
  const [error, setError] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    const parsedAmount = Number(amount)
    if (!description.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0 || !occurredAt) {
      setError('Enter a description, a positive amount, and a date.')
      return
    }
    onSave({
      ...transaction,
      description: description.trim(),
      amount: parsedAmount,
      categoryId,
      occurredAt: `${occurredAt}:00`,
    })
  }

  return (
    <Modal title="Edit transaction" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Description">
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="field"
          />
        </Field>
        <Field label="Amount (IDR)">
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="numeric"
            className="field font-mono"
          />
        </Field>
        <Field label="Category">
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="field">
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date">
          <input
            type="datetime-local"
            value={occurredAt}
            onChange={(event) => setOccurredAt(event.target.value)}
            className="field"
          />
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-line px-3 py-2 text-sm font-medium hover:bg-nav"
          >
            Cancel
          </button>
          <button type="submit" className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white">
            Save
          </button>
        </div>
      </form>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium tracking-wide text-muted uppercase">{label}</span>
      {children}
    </label>
  )
}
