export function cleanHandle(value: string) {
  return value
    .trim()
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 32)
}

export function handleFromName(name: string) {
  const compact = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16)
  return compact || 'user'
}
