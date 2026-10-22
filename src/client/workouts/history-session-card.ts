import { CheckCircle2, ChevronDown, Layers, PlayCircle, RotateCcw } from 'lucide'
import { displayName } from '../exercises/format.js'
import { muscleMapMarkupForMuscles } from '../exercises/muscle-map.js'
import type { Exercise } from '../exercises/types.js'
import { iconElement } from '../app/navigation.js'
import { pageSummary } from '../shared/page-chrome.js'
import { pageEmpty } from '../shared/page-states.js'
import { formatVolumeKg, formatWeightFromKg } from '../profile/weight-units.js'
import type { WeightUnit } from '../profile/types.js'
import type { Session } from './types.js'

export function formatSessionDate(value: string): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10)))
    : new Date(value.endsWith('Z') ? value : `${value}Z`)
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

export function sessionDateKey(session: Session): string | null {
  const stamp = session.finishedAt ?? session.startedAt
  const date = new Date(stamp.endsWith('Z') ? stamp : `${stamp}Z`)
  if (Number.isNaN(date.getTime())) return null
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function historyHero(sessions: Session[]): HTMLElement {
  const completed = sessions.filter(session => session.finishedAt).length
  const active = sessions.length - completed
  const sets = sessions.reduce((total, session) => total + session.sets.filter(set => set.done).length, 0)
  return pageSummary({
    icon: RotateCcw,
    title: 'Workout history',
    className: 'program-browse-hero history-hero',
    metrics: [
      { icon: CheckCircle2, text: `${completed} completed` },
      { icon: Layers, text: `${sets} sets` },
      ...(active ? [{ icon: PlayCircle, text: `${active} active` }] : []),
    ],
  })
}

export function sessionDuration(session: Session): string {
  if (!session.finishedAt) return ''
  const started = new Date(session.startedAt.endsWith('Z') ? session.startedAt : `${session.startedAt}Z`)
  const finished = new Date(session.finishedAt.endsWith('Z') ? session.finishedAt : `${session.finishedAt}Z`)
  const minutes = Math.round((finished.getTime() - started.getTime()) / 60000)
  if (!Number.isFinite(minutes) || minutes <= 0) return ''
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`
}

export function hasUnusualSessionDuration(session: Session): boolean {
  if (!session.finishedAt) return false
  const started = new Date(session.startedAt.endsWith('Z') ? session.startedAt : `${session.startedAt}Z`)
  const finished = new Date(session.finishedAt.endsWith('Z') ? session.finishedAt : `${session.finishedAt}Z`)
  const minutes = (finished.getTime() - started.getTime()) / 60000
  return Number.isFinite(minutes) && (minutes < 5 || minutes > 240)
}

export function sessionExercises(session: Session): { slug: string, name: string }[] {
  const entries = new Map<string, string>()
  for (const exercise of session.plannedExercises) {
    const key = exercise.exerciseSlug || exercise.exerciseName
    if (key) entries.set(key, exercise.exerciseName || displayName(key))
  }
  for (const set of session.sets.filter(item => item.done)) {
    const key = set.exerciseSlug || set.exerciseName
    if (key) entries.set(key, set.exerciseName || displayName(key))
  }
  return [...entries.entries()].map(([slug, name]) => ({ slug, name }))
}

export function sessionMuscles(session: Session, exercises: Exercise[]): { primary: string[], secondary: string[], names: string[] } {
  const primary = new Set<string>()
  const secondary = new Set<string>()
  for (const item of sessionExercises(session)) {
    const planned = session.plannedExercises.find(entry => entry.exerciseSlug === item.slug || entry.exerciseName === item.name)
    const full = planned?.exercise ?? exercises.find(exercise => exercise.slug === item.slug || exercise.id === planned?.exerciseId || exercise.name === item.name)
    if (full?.muscleGroup) primary.add(full.muscleGroup)
    for (const muscle of full?.muscles ?? []) secondary.add(muscle)
  }
  primary.forEach(muscle => secondary.delete(muscle))
  const names = [...new Set([...primary, ...secondary].filter(Boolean).map(displayName))]
  return { primary: [...primary], secondary: [...secondary], names }
}

export function sessionVolume(session: Session): number {
  return session.sets.filter(set => set.done).reduce((total, set) => total + set.reps * (set.weight ?? 0), 0)
}

export function sessionDetail(session: Session, unit: WeightUnit = 'kg'): HTMLElement {
  const detail = document.createElement('div')
  detail.className = 'session-detail'
  const doneSets = session.sets.filter(set => set.done)
  const exercises = sessionExercises(session)
  const duration = sessionDuration(session)
  const volume = sessionVolume(session)
  const summary = document.createElement('div')
  summary.className = 'session-receipt-summary'
  for (const item of [
    { value: duration || (session.finishedAt ? 'Done' : 'Active'), label: 'Duration' },
    { value: String(doneSets.length), label: 'Sets' },
    { value: String(exercises.length), label: 'Exercises' },
    { value: volume > 0 ? formatVolumeKg(volume, unit) : '—', label: 'Volume' }
  ]) {
    const tile = document.createElement('div')
    const value = document.createElement('strong')
    value.textContent = item.value
    const label = document.createElement('span')
    label.textContent = item.label
    tile.append(value, label)
    summary.append(tile)
  }
  detail.append(summary)
  if (!doneSets.length) {
    detail.append(pageEmpty({
      title: session.finishedAt ? 'No sets were logged in this session.' : 'No sets logged yet.',
      description: session.finishedAt ? undefined : 'Resume the workout to keep going.',
      compact: true,
      className: 'workout-browser-empty history-session-empty',
    }))
  } else {
    const byExercise = new Map<string, typeof doneSets>()
    for (const set of doneSets) {
      const key = set.exerciseSlug || set.exerciseName
      byExercise.set(key, [...(byExercise.get(key) ?? []), set])
    }
    let index = 1
    for (const [key, sets] of byExercise) {
      const row = document.createElement('div')
      row.className = 'session-detail-ex'
      const name = document.createElement('div')
      name.className = 'session-detail-ex-name'
      const number = document.createElement('span')
      number.className = 'session-detail-index'
      number.textContent = String(index++).padStart(2, '0')
      name.append(number, document.createTextNode(sets[0]?.exerciseName || displayName(key)))
      const pills = document.createElement('div')
      pills.className = 'session-detail-sets'
      for (const set of [...sets].sort((a, b) => a.setNumber - b.setNumber)) {
        const pill = document.createElement('span')
        pill.className = 'set-pill'
        pill.textContent = `${set.reps}${set.weight === null ? '' : ` × ${formatWeightFromKg(set.weight, unit)}`}`
        pills.append(pill)
      }
      row.append(name, pills)
      detail.append(row)
    }
  }
  if (!session.finishedAt) {
    const actions = document.createElement('div')
    actions.className = 'workout-card-actions session-actions'
    const link = document.createElement('a')
    link.className = 'button button--primary'
    link.href = `/sessions/${session.id}`
    link.textContent = 'Resume workout'
    actions.append(link)
    detail.append(actions)
  }
  return detail
}

export function sessionHistoryCard(session: Session, exercises: Exercise[], unit: WeightUnit = 'kg'): HTMLElement {
  const card = document.createElement('details')
  card.className = `workout-card history-session-card${session.finishedAt ? '' : ' history-session-card--active'}`
  const summary = document.createElement('summary')
  summary.className = 'workout-card-header'
  summary.setAttribute('aria-label', `Expand ${session.programName}`)
  const map = document.createElement('span')
  map.className = 'workout-card-map'
  const muscles = sessionMuscles(session, exercises)
  map.innerHTML = muscleMapMarkupForMuscles(muscles.primary, muscles.secondary)
  map.querySelector('svg')?.setAttribute('aria-hidden', 'true')
  const info = document.createElement('span')
  info.className = 'workout-card-info'
  const top = document.createElement('span')
  top.className = 'history-session-top'
  const name = document.createElement('strong')
  name.className = 'workout-card-name'
  name.textContent = session.programName
  top.append(name)
  if (!session.finishedAt) {
    const status = document.createElement('span')
    status.className = 'history-session-status'
    status.textContent = 'Active'
    top.append(status)
  }
  const meta = document.createElement('span')
  meta.className = 'workout-card-meta'
  meta.textContent = [formatSessionDate(session.finishedAt ?? session.startedAt), sessionDuration(session)].filter(Boolean).join(' · ')
  const doneSets = session.sets.filter(set => set.done).length
  const exerciseCount = sessionExercises(session).length
  const stats = document.createElement('span')
  stats.className = 'history-stat-row'
  for (const text of [`${doneSets} set${doneSets === 1 ? '' : 's'}`, `${exerciseCount} exercise${exerciseCount === 1 ? '' : 's'}`, sessionVolume(session) > 0 ? formatVolumeKg(sessionVolume(session), unit) : '']) {
    if (!text) continue
    const pill = document.createElement('span')
    pill.className = 'history-stat-pill'
    pill.textContent = text
    stats.append(pill)
  }
  const focus = document.createElement('span')
  focus.className = 'workout-card-muscles'
  focus.textContent = muscles.names.slice(0, 4).join(' · ')
  info.append(top, meta, stats)
  if (hasUnusualSessionDuration(session)) {
    const quality = document.createElement('span')
    quality.className = 'history-data-quality'
    quality.textContent = 'Check logged duration'
    info.append(quality)
  }
  if (focus.textContent) info.append(focus)
  summary.append(map, info, iconElement(ChevronDown))
  const body = document.createElement('div')
  body.className = 'workout-card-body'
  body.append(sessionDetail(session, unit))
  card.append(summary, body)
  card.addEventListener('toggle', () => { summary.setAttribute('aria-label', `${card.open ? 'Collapse' : 'Expand'} ${session.programName}`) })
  return card
}
