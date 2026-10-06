export function formatDate(value: string): string {
  if (!value) return 'Not recorded'
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

export function formatRelativeDate(value: string): string {
  if (!value) return 'Not trained recently'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return formatDate(value)
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000))
  if (days === 0) return 'Today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

export function todayDate(): string {
  return new Date().toISOString().slice(0, 10)
}
