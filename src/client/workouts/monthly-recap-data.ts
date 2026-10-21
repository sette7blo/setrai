import type { Exercise } from '../exercises/types.js'
import { displayName } from '../exercises/format.js'
import type { Session } from './types.js'
import { sessionDateKey, sessionVolume } from './history-session-card.js'

export interface MonthlyRecap {
  month: string
  label: string
  sessions: Session[]
  workoutCount: number
  activeDays: number
  activeWeeks: number
  totalVolume: number
  previousVolume: number
  volumeChangePercent: number | null
  bestWeek: { weekStart: string, volume: number } | null
  topMuscle: string
  dayCounts: Map<number, number>
}

function monthLabel(month: string): string {
  const [year, value] = month.split('-').map(Number)
  return new Date(year, value - 1, 1).toLocaleDateString('en', { month: 'long', year: 'numeric' })
}

function previousMonth(month: string): string {
  const [year, value] = month.split('-').map(Number)
  const date = new Date(year, value - 2, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function weekStart(key: string): string {
  const date = new Date(`${key}T00:00:00`)
  const day = date.getDay() || 7
  date.setDate(date.getDate() - day + 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function completedInMonth(sessions: Session[], month: string): Session[] {
  return sessions.filter(session => session.finishedAt && sessionDateKey(session)?.startsWith(month))
}

function totalVolume(sessions: Session[]): number {
  return sessions.reduce((sum, session) => sum + sessionVolume(session), 0)
}

export function monthlyRecap(sessions: Session[], exercises: Exercise[], month: string): MonthlyRecap {
  const selected = completedInMonth(sessions, month)
  const previous = completedInMonth(sessions, previousMonth(month))
  const days = new Set<string>()
  const weeks = new Map<string, number>()
  const muscles = new Map<string, number>()
  const dayCounts = new Map<number, number>()

  selected.forEach(session => {
    const key = sessionDateKey(session)
    if (!key) return
    days.add(key)
    dayCounts.set(Number(key.slice(8, 10)), (dayCounts.get(Number(key.slice(8, 10))) ?? 0) + 1)
    const week = weekStart(key)
    weeks.set(week, (weeks.get(week) ?? 0) + sessionVolume(session))
    session.sets.filter(set => set.done && set.weight && set.reps > 0).forEach(set => {
      const exercise = exercises.find(item => item.id === set.exerciseId || item.slug === set.exerciseSlug)
      const muscle = exercise?.muscleGroup || 'other'
      muscles.set(muscle, (muscles.get(muscle) ?? 0) + set.weight! * set.reps)
    })
  })

  const currentVolume = totalVolume(selected)
  const previousVolume = totalVolume(previous)
  const bestWeek = [...weeks.entries()].reduce<{ weekStart: string, volume: number } | null>((best, [weekStart, volume]) =>
    !best || volume > best.volume ? { weekStart, volume } : best, null)
  const topMuscle = [...muscles.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]

  return {
    month,
    label: monthLabel(month),
    sessions: selected,
    workoutCount: selected.length,
    activeDays: days.size,
    activeWeeks: weeks.size,
    totalVolume: currentVolume,
    previousVolume,
    volumeChangePercent: previousVolume > 0 ? ((currentVolume - previousVolume) / previousVolume) * 100 : null,
    bestWeek,
    topMuscle: topMuscle ? displayName(topMuscle) : '—',
    dayCounts,
  }
}

export function monthlyRecapImageName(month: string): string {
  return `setrai-${month}-training-recap.png`
}
