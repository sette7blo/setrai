import type { WeightUnit } from '../profile/types.js'
import { formatWeightFromKg, displayWeightFromKg } from '../profile/weight-units.js'
import type { ExerciseProgress, ExerciseProgressSession, ExerciseProgressSet } from '../statistics/types.js'

const MAX_POINTS = 50
const RECENT_ROWS = 5
const SVG_NS = 'http://www.w3.org/2000/svg'

export type ProgressMetric = 'estimated1RM' | 'durationSec' | 'reps'
export interface ProgressPoint { date: string, value: number }

// Loaded lifts chart estimated 1RM; timed holds chart duration; bodyweight
// work charts reps.
export function progressMetric(progress: ExerciseProgress): ProgressMetric {
  if (progress.sessions.some(session => session.bestEstimated1RM !== null)) return 'estimated1RM'
  if (progress.sessions.some(session => session.topSet.durationSec)) return 'durationSec'
  return 'reps'
}

// Oldest first, thinned evenly to at most MAX_POINTS while keeping the newest.
export function progressPoints(progress: ExerciseProgress, metric: ProgressMetric): ProgressPoint[] {
  const points = [...progress.sessions].reverse().flatMap((session): ProgressPoint[] => {
    const value = metric === 'estimated1RM' ? session.bestEstimated1RM : metric === 'durationSec' ? session.topSet.durationSec : session.topSet.reps
    return value ? [{ date: session.finishedAt, value }] : []
  })
  if (points.length <= MAX_POINTS) return points
  const step = (points.length - 1) / (MAX_POINTS - 1)
  return Array.from({ length: MAX_POINTS }, (_, index) => points[Math.round(index * step)])
}

function shortDate(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value.slice(0, 10) : date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

// "80 x 8, 8, 7" when the weight is shared, "80 x 8, 85 x 6" otherwise; timed
// sets as seconds, bodyweight sets as reps.
export function setsLine(sets: ExerciseProgressSet[], unit: WeightUnit): string {
  if (sets.every(set => set.durationSec)) return sets.map(set => `${set.durationSec} s`).join(', ')
  if (sets.every(set => !set.weight)) return `${sets.map(set => set.reps).join(', ')} reps`
  const weight = (set: ExerciseProgressSet): string => set.weight ? String(displayWeightFromKg(set.weight, unit)) : 'BW'
  const shared = sets.every(set => set.weight === sets[0].weight)
  return shared ? `${weight(sets[0])} x ${sets.map(set => set.reps).join(', ')}` : sets.map(set => `${weight(set)} x ${set.reps}`).join(', ')
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  node.className = className
  if (text) node.textContent = text
  return node
}

function chart(points: ProgressPoint[], label: string): SVGSVGElement {
  const width = 300
  const height = 120
  const pad = 8
  const values = points.map(point => point.value)
  const min = Math.min(...values)
  const range = Math.max(...values) - min || 1
  const x = (index: number): number => points.length === 1 ? width / 2 : pad + index * (width - pad * 2) / (points.length - 1)
  const y = (value: number): number => height - pad - (value - min) / range * (height - pad * 2)
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
  svg.setAttribute('class', 'exercise-progress__chart')
  svg.setAttribute('role', 'img')
  svg.setAttribute('aria-label', label)
  const line = document.createElementNS(SVG_NS, 'polyline')
  line.setAttribute('points', points.map((point, index) => `${x(index).toFixed(1)},${y(point.value).toFixed(1)}`).join(' '))
  line.setAttribute('class', 'exercise-progress__line')
  svg.append(line)
  const last = points.length - 1
  const dot = document.createElementNS(SVG_NS, 'circle')
  dot.setAttribute('cx', x(last).toFixed(1))
  dot.setAttribute('cy', y(points[last].value).toFixed(1))
  dot.setAttribute('r', '3.5')
  dot.setAttribute('class', 'exercise-progress__dot')
  svg.append(dot)
  return svg
}

function bestTile(label: string, value: string, date: string): HTMLElement {
  const tile = element('div', 'exercise-progress__best')
  tile.append(element('strong', '', value), element('span', '', label), element('small', '', shortDate(date)))
  return tile
}

function sessionRow(session: ExerciseProgressSession, unit: WeightUnit): HTMLElement {
  const row = element('li', 'exercise-progress__row')
  row.append(element('span', 'exercise-progress__date', shortDate(session.finishedAt)), element('span', 'exercise-progress__sets', setsLine(session.sets, unit)))
  return row
}

// null when there is no history: the section is left out entirely.
export function createExerciseProgress(progress: ExerciseProgress, unit: WeightUnit): HTMLElement | null {
  if (!progress.sessions.length) return null
  const metric = progressMetric(progress)
  const points = progressPoints(progress, metric)
  const section = element('section', 'detail-section exercise-progress')
  section.append(element('h2', '', 'Progress'))

  const bests = element('div', 'exercise-progress__bests')
  const { heaviestWeight, estimated1RM, mostReps, longestDurationSec } = progress.best
  if (metric === 'estimated1RM') {
    if (estimated1RM) bests.append(bestTile('Best est. 1RM', formatWeightFromKg(estimated1RM.value, unit), estimated1RM.date))
    if (heaviestWeight) bests.append(bestTile('Heaviest', formatWeightFromKg(heaviestWeight.value, unit), heaviestWeight.date))
  } else if (metric === 'durationSec' && longestDurationSec) {
    bests.append(bestTile('Longest', `${longestDurationSec.value} s`, longestDurationSec.date))
  }
  if (mostReps && metric !== 'durationSec') bests.append(bestTile('Most reps', String(mostReps.value), mostReps.date))
  if (bests.children.length) section.append(bests)

  const metricLabel = metric === 'estimated1RM' ? `Estimated 1RM per session (${unit})` : metric === 'durationSec' ? 'Longest set per session (seconds)' : 'Most reps per session'
  if (points.length > 1) section.append(element('p', 'exercise-progress__caption', metricLabel), chart(points.map(point => metric === 'estimated1RM' ? { ...point, value: displayWeightFromKg(point.value, unit) } : point), metricLabel))

  const list = element('ol', 'exercise-progress__rows')
  list.setAttribute('aria-label', 'Recent sessions')
  progress.sessions.slice(0, RECENT_ROWS).forEach(session => list.append(sessionRow(session, unit)))
  section.append(list)
  return section
}
