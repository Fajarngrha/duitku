export type Profile = {
  name: string
  handle: string
}

export type Category = {
  id: string
  name: string
  color: string
}

export type Transaction = {
  id: string
  description: string
  amount: number
  categoryId: string
  occurredAt: string
}

export type ChartPoint = {
  name: string
  amount: number
}
