import { useState, type FormEvent } from 'react'
import { FileText, LayoutGrid, Tag } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useFinance } from '../context/FinanceContext'
import { cleanHandle, handleFromName } from '../lib/profile'
import { Modal } from './Modal'

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/transactions', label: 'Transactions', icon: FileText, end: false },
  { to: '/categories', label: 'Categories', icon: Tag, end: false },
]

export function Layout() {
  const { profile, updateProfile } = useFinance()
  const [helpOpen, setHelpOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <div className="flex h-full min-h-screen bg-canvas text-ink">
      <aside className="flex w-[240px] shrink-0 flex-col border-r border-line bg-surface">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-white">
            <BotMark />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">FinBot Tracker</span>
        </div>

        <nav className="flex flex-col gap-1 px-3" aria-label="Primary">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${
                  isActive ? 'bg-nav font-medium text-ink' : 'text-muted hover:bg-nav hover:text-ink'
                }`
              }
            >
              <item.icon size={16} strokeWidth={1.75} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          aria-label="Edit profile"
          onClick={() => setProfileOpen(true)}
          className="mt-auto flex w-full items-center gap-3 border-t border-line px-4 py-4 text-left hover:bg-nav"
        >
          <Avatar />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">{profile.name}</p>
            <p className="truncate text-xs text-muted">@{profile.handle}</p>
          </div>
        </button>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-[1120px] px-8 py-8">
          <Outlet />
        </div>
      </main>

      <div className="fixed right-5 bottom-5 z-40">
        {helpOpen && (
          <div className="mb-3 w-72 rounded-lg border border-line bg-surface p-4 text-sm shadow-[var(--shadow)]">
            <p className="font-semibold">Telegram bot</p>
            <p className="mt-2 text-muted">
              Create a bot with @BotFather and put the token in <span className="font-mono text-ink">.env</span> as
              TELEGRAM_BOT_TOKEN. Restart the app, then send{' '}
              <span className="font-mono text-ink">50000 makan siang</span> in Telegram.
            </p>
            <p className="mt-2 text-muted">The dashboard reads the same ledger and refreshes every few seconds.</p>
          </div>
        )}
        <button
          type="button"
          aria-expanded={helpOpen}
          aria-label="Help"
          onClick={() => setHelpOpen((open) => !open)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-base font-semibold text-white"
        >
          ?
        </button>
      </div>

      {profileOpen && (
        <ProfileDialog
          name={profile.name}
          handle={profile.handle}
          onClose={() => setProfileOpen(false)}
          onSave={(next) => {
            updateProfile(next)
            setProfileOpen(false)
          }}
        />
      )}
    </div>
  )
}

function ProfileDialog({
  name,
  handle,
  onClose,
  onSave,
}: {
  name: string
  handle: string
  onClose: () => void
  onSave: (profile: { name: string; handle: string }) => void
}) {
  const [draftName, setDraftName] = useState(name)
  const [draftHandle, setDraftHandle] = useState(handle)
  const [error, setError] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    const nextName = draftName.trim()
    if (!nextName) {
      setError('Enter a name.')
      return
    }
    onSave({
      name: nextName,
      handle: cleanHandle(draftHandle) || handleFromName(nextName),
    })
  }

  return (
    <Modal title="Edit profile" onClose={onClose}>
      <form onSubmit={submit} autoComplete="off" className="space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium tracking-wide text-muted uppercase">Name</span>
          <input
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            name="profile-name"
            autoComplete="off"
            className="field"
            autoFocus
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium tracking-wide text-muted uppercase">Username</span>
          <input
            value={draftHandle}
            onChange={(event) => setDraftHandle(event.target.value)}
            name="profile-handle"
            autoComplete="off"
            spellCheck={false}
            className="field"
          />
        </label>
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

function BotMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="12" height="8" rx="2" stroke="white" strokeWidth="1.5" />
      <path d="M6 13h4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 11v2" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function Avatar() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true" className="shrink-0 rounded-full">
      <circle cx="18" cy="18" r="18" fill="#d6d3d1" />
      <circle cx="18" cy="14" r="6" fill="#a8a29e" />
      <path d="M6 31c2.2-5 6.4-7.5 12-7.5S27.8 26 30 31" fill="#a8a29e" />
    </svg>
  )
}
