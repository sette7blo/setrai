import { Activity, BatteryCharging, CheckCircle2, HeartPulse, Hourglass, Info, Leaf } from 'lucide'
import { iconElement } from '../app/navigation.js'
import { pageSummary } from '../shared/page-chrome.js'
import { EXERCISE_BODY_SVG } from '../exercises/body-map.js'
import { displayName } from '../exercises/format.js'
import { muscleRegion } from '../exercises/muscle-map.js'
import { lastTrainedText, recoveryPercent, sortedRecovery, statusLabel } from './format.js'
import type { RecoveryMuscle, RecoveryOverview, RecoveryStatus } from './types.js'

const CANONICAL_MUSCLES = ['Back', 'Biceps', 'Calves', 'Chest', 'Core', 'Glutes', 'Hamstrings', 'Quadriceps', 'Shoulders', 'Triceps']
const STATUS_ORDER: Record<RecoveryStatus, number> = { recovering: 0, moderate: 1, ready: 2 }
type RecoveryCategory = RecoveryStatus | 'fresh'

function statusClass(status?: RecoveryStatus): string {
  if (!status) return 'fresh'
  return status === 'moderate' ? 'moderate' : status
}

function recoveryByRegion(recovery: RecoveryOverview): Map<string, RecoveryMuscle> {
  const map = new Map<string, RecoveryMuscle>()
  for (const item of recovery.muscles) {
    const region = muscleRegion(item.muscle) ?? displayName(item.muscle)
    const current = map.get(region)
    if (!current || item.recovery < current.recovery) map.set(region, item)
  }
  return map
}

export function recoveryPartition(recovery: RecoveryOverview): { byRegion: Map<string, RecoveryMuscle>, counts: Record<RecoveryCategory, number> } {
  const byRegion = recoveryByRegion(recovery)
  const counts: Record<RecoveryCategory, number> = { fresh: 0, ready: 0, moderate: 0, recovering: 0 }
  for (const muscle of CANONICAL_MUSCLES) counts[byRegion.get(muscle)?.status ?? 'fresh'] += 1
  return { byRegion, counts }
}

function averageReadiness(recovery: RecoveryOverview): number {
  const byRegion = recoveryByRegion(recovery)
  const total = CANONICAL_MUSCLES.reduce((sum, muscle) => sum + (byRegion.get(muscle)?.recovery ?? 1), 0)
  return Math.round((total / CANONICAL_MUSCLES.length) * 100)
}

export function recoveryBodyMapMarkup(recovery: RecoveryOverview): string {
  const { byRegion } = recoveryPartition(recovery)
  return EXERCISE_BODY_SVG.replace(/<polygon([^>]*)>/g, (_match, attributes: string) => {
    const muscle = attributes.match(/data-muscle="([^"]+)"/)?.[1]
    if (!muscle) return `<polygon${attributes.replace(/\s*\//, '')} class="recovery-map__decor"/>`
    const item = byRegion.get(muscle)
    return `<polygon${attributes.replace(/\s*\//, '')} class="recovery-map__${statusClass(item?.status)}" data-status="${statusClass(item?.status)}"/>`
  }).replace('<svg ', '<svg id="recovery-body" aria-hidden="true" ')
}

export function recoveryHero(recovery: RecoveryOverview): HTMLElement {
  const readiness = averageReadiness(recovery)
  const { counts } = recoveryPartition(recovery)
  const metrics = [
    { icon: Activity, text: `${readiness}% ready` },
    { icon: CheckCircle2, text: `${counts.ready} ready` },
    { icon: Leaf, text: `${counts.fresh} fresh` },
    { icon: Hourglass, text: `${counts.recovering} recovering` },
  ]
  if (counts.moderate > 0) metrics.push({ icon: BatteryCharging, text: `${counts.moderate} moderate` })
  return pageSummary({
    icon: HeartPulse,
    title: 'Muscle readiness',
    className: 'program-browse-hero recovery-hero recovery-hero--compact page-summary',
    metrics,
  })
}

function recoveryRows(muscles: RecoveryMuscle[]): HTMLElement {
  const list = document.createElement('div')
  list.className = 'recovery-list'
  for (const item of muscles) {
    const row = document.createElement('button')
    row.type = 'button'
    row.className = `recovery-row recovery-row--${statusClass(item.status)}`
    row.dataset.muscle = item.muscle
    row.setAttribute('aria-pressed', 'false')
    const status = document.createElement('span')
    status.className = 'recovery-row-status'
    status.append(iconElement(item.status === 'ready' ? CheckCircle2 : item.status === 'moderate' ? BatteryCharging : Hourglass))
    const name = document.createElement('div')
    name.className = 'recovery-row-name'
    name.innerHTML = `<strong>${displayName(item.muscle)}</strong><small>${lastTrainedText(item.lastTrainedAt)}</small>`
    const track = document.createElement('div')
    track.className = 'recovery-row-track'
    track.innerHTML = `<i style="width:${Math.round(item.recovery * 100)}%"></i>`
    const meta = document.createElement('div')
    meta.className = 'recovery-row-meta'
    meta.innerHTML = `<strong>${recoveryPercent(item.recovery)}</strong><small>${statusLabel(item.status)}</small>`
    row.append(status, name, track, meta)
    list.append(row)
  }
  return list
}

function freshSummary(recovery: RecoveryOverview, select: (muscle: string) => void): HTMLElement | null {
  const { byRegion } = recoveryPartition(recovery)
  const fresh = CANONICAL_MUSCLES.filter((muscle) => !byRegion.has(muscle))
  if (!fresh.length) return null
  const summary = document.createElement('div')
  summary.className = 'recovery-fresh-summary'
  const heading = document.createElement('strong')
  heading.append(iconElement(Leaf), document.createTextNode('Fresh'))
  const chips = document.createElement('span')
  chips.className = 'recovery-fresh-chips'
  for (const name of fresh) {
    const chip = document.createElement('button')
    chip.type = 'button'
    chip.dataset.muscle = name
    chip.textContent = name
    chip.addEventListener('click', () => select(name))
    chips.append(chip)
  }
  summary.append(heading, chips)
  return summary
}

export function recoveryContent(recovery: RecoveryOverview): HTMLElement {
  const panel = document.createElement('section')
  panel.className = 'recovery-panel'
  const hero = recoveryHero(recovery)
  const partition = recoveryPartition(recovery)
  const tracked = sortedRecovery([...partition.byRegion].map(([region, item]) => ({
    ...item,
    muscle: region,
  }))).sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.recovery - b.recovery)

  const status = document.createElement('p')
  status.className = 'recovery-status'
  const tired = tracked.filter(item => item.status !== 'ready').slice(0, 3)
  status.append(
    iconElement(Info),
    document.createTextNode(
      tired.length
        ? `Muscles needing the most time: ${tired.map(i => displayName(i.muscle)).join(', ')}.`
        : 'All tracked muscles are ready.',
    ),
  )

  const map = document.createElement('div')
  map.className = 'recovery-map'
  map.innerHTML = `${recoveryBodyMapMarkup(recovery)}<div class="recovery-legend"><span class="rl ready">Ready</span><span class="rl moderate">Moderate</span><span class="rl recovering">Recovering</span><span class="rl fresh">Fresh</span></div>`

  const listPanel = document.createElement('div')
  listPanel.className = 'recovery-list-panel'
  if (tracked.length) listPanel.append(recoveryRows(tracked))

  const detail = document.createElement('p')
  detail.className = 'recovery-selection-detail'
  detail.setAttribute('aria-live', 'polite')
  detail.hidden = true
  detail.textContent = ''

  const select = (muscle: string): void => {
    const item = partition.byRegion.get(muscle)
    map.querySelectorAll<HTMLElement>('[data-muscle]').forEach(shape => {
      shape.classList.toggle('is-selected', shape.dataset.muscle === muscle)
    })
    listPanel.querySelectorAll<HTMLElement>('[data-muscle]').forEach(row => {
      const active = row.dataset.muscle === muscle
      row.classList.toggle('is-selected', active)
      if (row instanceof HTMLButtonElement) row.setAttribute('aria-pressed', String(active))
    })
    detail.hidden = false
    detail.textContent = item
      ? `${muscle}: ${recoveryPercent(item.recovery)} ${statusLabel(item.status)}. ${lastTrainedText(item.lastTrainedAt)}.`
      : `${muscle}: Fresh`
  }

  const fresh = freshSummary(recovery, select)
  if (fresh) listPanel.append(fresh)
  listPanel.append(detail)

  listPanel.querySelectorAll<HTMLElement>('.recovery-row[data-muscle]').forEach(row => {
    const muscle = row.dataset.muscle ?? ''
    row.addEventListener('click', () => select(muscle))
  })
  map.querySelectorAll<HTMLElement>('[data-muscle]').forEach(region => {
    const muscle = region.getAttribute('data-muscle') ?? ''
    region.addEventListener('click', () => select(muscle))
  })

  const layout = document.createElement('div')
  layout.className = 'recovery-layout'
  layout.append(map, listPanel)
  panel.append(hero, status, layout)
  return panel
}
