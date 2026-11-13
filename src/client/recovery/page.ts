import { CheckCircle2, Leaf } from 'lucide'
import { iconElement } from '../app/navigation.js'
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

export function recoveryBodyMapMarkup(recovery: RecoveryOverview): string {
  const { byRegion } = recoveryPartition(recovery)
  return EXERCISE_BODY_SVG.replace(/<polygon([^>]*)>/g, (_match, attributes: string) => {
    const muscle = attributes.match(/data-muscle="([^"]+)"/)?.[1]
    if (!muscle) return `<polygon${attributes.replace(/\s*\//, '')} class="recovery-map__decor"/>`
    const item = byRegion.get(muscle)
    return `<polygon${attributes.replace(/\s*\//, '')} class="recovery-map__${statusClass(item?.status)}" data-status="${statusClass(item?.status)}"/>`
  }).replace('<svg ', '<svg id="recovery-body" aria-hidden="true" ')
}

export function recoveryCountsText(recovery: RecoveryOverview): string {
  const { counts } = recoveryPartition(recovery)
  return [
    counts.recovering > 0 ? `${counts.recovering} recovering` : '',
    counts.moderate > 0 ? `${counts.moderate} moderate` : '',
    `${counts.ready} ready`,
    counts.fresh > 0 ? `${counts.fresh} fresh` : '',
  ].filter(Boolean).join(', ')
}

export function recoverySummary(recovery: RecoveryOverview): HTMLElement {
  const summary = document.createElement('div')
  summary.className = 'recovery-summary'
  const figure = document.createElement('p')
  figure.className = 'recovery-figure'
  const value = document.createElement('strong')
  value.textContent = String(recovery.readiness)
  const unit = document.createElement('span')
  unit.textContent = '% ready'
  figure.append(value, unit)
  const counts = document.createElement('p')
  counts.className = 'recovery-counts'
  counts.textContent = recoveryCountsText(recovery)
  summary.append(figure, counts)
  return summary
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
    const name = document.createElement('div')
    name.className = 'recovery-row-name'
    name.innerHTML = `<strong>${displayName(item.muscle)}</strong><small>${lastTrainedText(item.lastTrainedAt)}</small>`
    const meta = document.createElement('div')
    meta.className = 'recovery-row-meta'
    meta.innerHTML = `<strong>${recoveryPercent(item.recovery)}</strong><small>${statusLabel(item.status)}</small>`
    const track = document.createElement('div')
    track.className = 'recovery-row-track'
    track.innerHTML = `<i style="width:${Math.round(item.recovery * 100)}%"></i>`
    row.append(name, meta, track)
    list.append(row)
  }
  return list
}

// Muscles that need no attention collapse into one row of chips per group.
function chipGroup(label: string, icon: Parameters<typeof iconElement>[0], muscles: string[], select: (muscle: string) => void): HTMLElement | null {
  if (!muscles.length) return null
  const group = document.createElement('div')
  group.className = 'recovery-fresh-summary'
  const heading = document.createElement('strong')
  heading.append(iconElement(icon), document.createTextNode(label))
  const chips = document.createElement('span')
  chips.className = 'recovery-fresh-chips'
  for (const name of muscles) {
    const chip = document.createElement('button')
    chip.type = 'button'
    chip.dataset.muscle = name
    chip.textContent = displayName(name)
    chip.addEventListener('click', () => select(name))
    chips.append(chip)
  }
  group.append(heading, chips)
  return group
}

export function recoveryContent(recovery: RecoveryOverview): HTMLElement {
  const panel = document.createElement('section')
  panel.className = 'recovery-panel'
  const partition = recoveryPartition(recovery)
  const tracked = sortedRecovery([...partition.byRegion].map(([region, item]) => ({
    ...item,
    muscle: region,
  }))).sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.recovery - b.recovery)
  const tired = tracked.filter(item => item.status !== 'ready')
  const ready = tracked.filter(item => item.status === 'ready').map(item => item.muscle)
  const fresh = CANONICAL_MUSCLES.filter(muscle => !partition.byRegion.has(muscle))

  const head = document.createElement('div')
  head.className = 'recovery-head'
  head.append(recoverySummary(recovery))
  if (tired.length) {
    const status = document.createElement('p')
    status.className = 'recovery-status'
    status.textContent = `Muscles needing the most time: ${tired.slice(0, 3).map(item => displayName(item.muscle)).join(', ')}.`
    head.append(status)
  }

  const map = document.createElement('div')
  map.className = 'recovery-map'
  map.innerHTML = `${recoveryBodyMapMarkup(recovery)}<div class="recovery-legend"><span class="rl ready">Ready</span><span class="rl moderate">Moderate</span><span class="rl recovering">Recovering</span><span class="rl fresh">Fresh</span></div>`

  const listPanel = document.createElement('div')
  listPanel.className = 'recovery-list-panel'

  const detail = document.createElement('p')
  detail.className = 'recovery-selection-detail'
  detail.setAttribute('aria-live', 'polite')
  detail.hidden = true

  const select = (muscle: string): void => {
    const item = partition.byRegion.get(muscle)
    map.querySelectorAll<HTMLElement>('[data-muscle]').forEach(shape => {
      shape.classList.toggle('is-selected', shape.dataset.muscle === muscle)
    })
    listPanel.querySelectorAll<HTMLElement>('[data-muscle]').forEach(row => {
      const active = row.dataset.muscle === muscle
      row.classList.toggle('is-selected', active)
      if (row.classList.contains('recovery-row')) row.setAttribute('aria-pressed', String(active))
    })
    detail.hidden = false
    detail.textContent = item
      ? `${muscle}: ${recoveryPercent(item.recovery)} ${statusLabel(item.status).toLowerCase()}. ${lastTrainedText(item.lastTrainedAt)}.`
      : `${muscle}: fresh, not trained recently.`
  }

  if (tired.length) {
    const rows = recoveryRows(tired)
    rows.querySelectorAll<HTMLElement>('.recovery-row[data-muscle]').forEach(row => {
      row.addEventListener('click', () => select(row.dataset.muscle ?? ''))
    })
    listPanel.append(rows)
  }
  for (const group of [chipGroup('Ready', CheckCircle2, ready, select), chipGroup('Fresh', Leaf, fresh, select)]) {
    if (group) listPanel.append(group)
  }
  listPanel.append(detail)

  map.querySelectorAll<HTMLElement>('[data-muscle]').forEach(region => {
    region.addEventListener('click', () => select(region.getAttribute('data-muscle') ?? ''))
  })

  const layout = document.createElement('div')
  layout.className = 'recovery-layout'
  layout.append(map, listPanel)
  panel.append(head, layout)
  return panel
}
