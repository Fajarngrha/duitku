import { useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { Modal } from '../components/Modal'
import { useFinance } from '../context/FinanceContext'
import { CATEGORY_COLORS } from '../data/mock'

export function CategoriesPage() {
  const { categories, usageByCategory, addCategory } = useFinance()
  const [open, setOpen] = useState(false)

  return (
    <div>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">Categories</h1>
          <p className="mt-1 text-sm text-muted">Manage expense categories used by the Telegram bot.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white"
        >
          <Plus size={16} />
          New Category
        </button>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => {
          const count = usageByCategory[category.id] ?? 0
          return (
            <article key={category.id} className="rounded-lg border border-line bg-surface px-5 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: category.color }} />
                {category.name}
              </div>
              <div className="my-4 border-t border-line" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Usage</span>
                <span>
                  <span className="font-semibold">{count}</span> transactions
                </span>
              </div>
            </article>
          )
        })}
      </div>

      {open && (
        <NewCategoryDialog
          onClose={() => setOpen(false)}
          onCreate={(name, color) => {
            addCategory({ name, color })
            setOpen(false)
          }}
        />
      )}
    </div>
  )
}

function NewCategoryDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (name: string, color: string) => void
}) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(CATEGORY_COLORS[0])
  const [error, setError] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setError('Enter a category name.')
      return
    }
    onCreate(name.trim(), color)
  }

  return (
    <Modal title="New category" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium tracking-wide text-muted uppercase">Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Health"
            className="field"
            autoFocus
          />
        </label>
        <div>
          <p className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">Color</p>
          <div className="flex gap-2">
            {CATEGORY_COLORS.map((swatch) => (
              <button
                key={swatch}
                type="button"
                aria-label={`Use color ${swatch}`}
                onClick={() => setColor(swatch)}
                className={`h-7 w-7 rounded-md ${color === swatch ? 'ring-2 ring-ink ring-offset-2' : ''}`}
                style={{ background: swatch }}
              />
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-line px-3 py-2 text-sm font-medium hover:bg-nav"
          >
            Cancel
          </button>
          <button type="submit" className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white">
            Create
          </button>
        </div>
      </form>
    </Modal>
  )
}
