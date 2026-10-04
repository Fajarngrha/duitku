const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function parts(iso: string) {
  const date = new Date(iso)
  return {
    month: MONTHS[date.getMonth()],
    day: String(date.getDate()).padStart(2, '0'),
    year: date.getFullYear(),
    hours: String(date.getHours()).padStart(2, '0'),
    minutes: String(date.getMinutes()).padStart(2, '0'),
  }
}

export function formatRupiah(amount: number) {
  return `Rp ${amount.toLocaleString('id-ID')}`
}

export function formatDateTime(iso: string) {
  const { month, day, year, hours, minutes } = parts(iso)
  return `${month} ${day}, ${year} ${hours}:${minutes}`
}

export function formatShortDate(iso: string) {
  const { month, day } = parts(iso)
  return `${month} ${day}`
}

export function toDateTimeLocal(iso: string) {
  const date = new Date(iso)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function nowLocalIso() {
  return `${toDateTimeLocal(new Date().toISOString())}:00`
}
