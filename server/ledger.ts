import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { defaultProfile, MONTHLY_BUDGET, seedCategories, seedTransactions } from '../src/data/mock.ts'
import { cleanHandle, handleFromName } from '../src/lib/profile.ts'
import type { Category, Profile, Transaction } from '../src/types.ts'

export type Ledger = {
  budget: number
  ownerChatId: number | null
  profile: Profile
  categories: Category[]
  transactions: Transaction[]
}

function normalizeProfile(profile: Profile | undefined): Profile {
  const name = profile?.name?.trim() || defaultProfile.name
  return {
    name,
    handle: cleanHandle(profile?.handle ?? '') || handleFromName(name),
  }
}

const ledgerPath = path.join(process.cwd(), 'data', 'ledger.json')

let queue: Promise<unknown> = Promise.resolve()

function emptyLedger(): Ledger {
  return {
    budget: MONTHLY_BUDGET,
    ownerChatId: null,
    profile: defaultProfile,
    categories: seedCategories,
    transactions: seedTransactions,
  }
}

async function readLedger(): Promise<Ledger> {
  try {
    const raw = await readFile(ledgerPath, 'utf8')
    const parsed = JSON.parse(raw) as Ledger
    return {
      budget: parsed.budget ?? MONTHLY_BUDGET,
      ownerChatId: parsed.ownerChatId ?? null,
      profile: normalizeProfile(parsed.profile),
      categories: parsed.categories ?? seedCategories,
      transactions: parsed.transactions ?? [],
    }
  } catch {
    const ledger = emptyLedger()
    await writeLedger(ledger)
    return ledger
  }
}

async function writeLedger(ledger: Ledger) {
  await mkdir(path.dirname(ledgerPath), { recursive: true })
  await writeFile(ledgerPath, JSON.stringify(ledger, null, 2))
}

export function updateLedger<T>(change: (ledger: Ledger) => T | Promise<T>) {
  const run = queue.then(async () => {
    const ledger = await readLedger()
    const result = await change(ledger)
    await writeLedger(ledger)
    return result
  })
  queue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

export function readLedgerSnapshot() {
  return updateLedger((ledger) => structuredClone(ledger))
}
