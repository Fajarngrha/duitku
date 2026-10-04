import type { Category } from '../types'

const RULES: { pattern: RegExp; categoryId: string }[] = [
  { pattern: /makan|warteg|ngopi|kopi|nasi|minum|resto|cafe|jajan/, categoryId: 'food' },
  { pattern: /bensin|gojek|grab|ojek|tol|parkir|transport/, categoryId: 'transport' },
  { pattern: /listrik|pln|air|pdam|wifi|pulsa|tagihan|bill/, categoryId: 'bills' },
  { pattern: /beli|buku|belanja|toko|shopping|shopee/, categoryId: 'shopping' },
]

export function parseExpense(text: string) {
  const cleaned = text.trim().replace(/^rp\.?\s*/i, '')
  const match = cleaned.match(/^([\d.]+)\s+(.+)$/)
  if (!match) return null

  const amount = Number(match[1].replace(/\./g, ''))
  const description = match[2].trim()
  if (!Number.isFinite(amount) || amount <= 0 || !description) return null

  return { amount, description }
}

export function inferCategoryId(description: string, categories: Category[]) {
  const text = description.toLowerCase()
  const named = categories.find((category) => text.includes(category.name.toLowerCase()))
  if (named) return named.id

  for (const rule of RULES) {
    if (rule.pattern.test(text) && categories.some((category) => category.id === rule.categoryId)) {
      return rule.categoryId
    }
  }

  return categories[0]?.id ?? ''
}
