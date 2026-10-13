import { createRecoveryWorkoutPanel } from '../quick-workout/recovery-panel.js'
import { getProfile } from '../profile/api.js'
import { readableApiError } from '../shared/api/errors.js'
import { Activity, BatteryCharging, CheckCircle2, Clock, HeartPulse, Hourglass, Info, Leaf } from 'lucide'
import { iconElement } from '../app/navigation.js'
import { EXERCISE_BODY_SVG } from '../exercises/body-map.js'
import { displayName } from '../exercises/format.js'
import { muscleRegion } from '../exercises/muscle-map.js'
import { getRecovery } from './api.js'
import { lastTrainedText, recoveryPercent, sortedRecovery, statusLabel } from './format.js'
import type { RecoveryMuscle, RecoveryOverview, RecoveryStatus } from './types.js'

const CANONICAL_MUSCLES = ['Back', 'Biceps', 'Calves', 'Chest', 'Core', 'Glutes', 'Hamstrings', 'Quadriceps', 'Shoulders', 'Triceps']
const STATUS_ORDER: Record<RecoveryStatus, number> = { recovering: 0, moderate: 1, ready: 2 }

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

function averageReadiness(recovery: RecoveryOverview): number {
  const byRegion = recoveryByRegion(recovery)
  const total = CANONICAL_MUSCLES.reduce((sum, muscle) => sum + (byRegion.get(muscle)?.recovery ?? 1), 0)
  return Math.round((total / CANONICAL_MUSCLES.length) * 100)
}

function recoveryRing(percent: number): HTMLElement {
  const tone = percent >= 80 ? 'ready' : percent >= 50 ? 'moderate' : 'recovering'
  const ring = document.createElement('div')
  ring.className = `recovery-ring recovery-ring--${tone}`
  ring.innerHTML = `<svg viewBox="0 0 44 44" aria-hidden="true"><circle class="recovery-ring-track" cx="22" cy="22" r="18" pathLength="100"/><circle class="recovery-ring-fill" cx="22" cy="22" r="18" pathLength="100" stroke-dasharray="100" stroke-dashoffset="${100 - percent}" transform="rotate(-90 22 22)"/></svg><span><strong>${percent}%</strong><small>ready</small></span>`
  return ring
}

export function recoveryBodyMapMarkup(recovery: RecoveryOverview): string {
  const byRegion = recoveryByRegion(recovery)
  return EXERCISE_BODY_SVG.replace(/<polygon([^>]*)>/g, (_match, attributes: string) => {
    const muscle = attributes.match(/data-muscle="([^"]+)"/)?.[1]
    if (!muscle) return `<polygon${attributes.replace(/\s*\/$/, '')} class="recovery-map__decor"/>`
    const item = byRegion.get(muscle)
    return `<polygon${attributes.replace(/\s*\/$/, '')} class="recovery-map__${statusClass(item?.status)}" data-status="${statusClass(item?.status)}"/>`
  }).replace(/data-muscle="([^"]+)"/g, 'data-muscle="$1" tabindex="0" role="button" aria-label="$1 recovery details"').replace('<svg ', '<svg id="recovery-body" role="img" aria-label="Front and back muscle recovery map" ')
}

export function recoveryHero(recovery: RecoveryOverview): HTMLElement {
  const hero = document.createElement('section')
  hero.className = 'program-browse-hero recovery-hero recovery-hero--compact'
  const icon = document.createElement('span')
  icon.className = 'program-browse-icon recovery-hero-icon'
  icon.setAttribute('aria-hidden', 'true')
  icon.append(iconElement(HeartPulse))
  const copy = document.createElement('div')
  copy.className = 'recovery-hero-copy'
  const title = document.createElement('h2')
  title.textContent = 'Muscle readiness'
  const metrics = document.createElement('div')
  metrics.className = 'program-browse-metrics recovery-hero-metrics'
  const readiness = averageReadiness(recovery)
  const byRegion = recoveryByRegion(recovery)
  const fresh = CANONICAL_MUSCLES.filter(muscle => !byRegion.has(muscle)).length
  const ready = [...byRegion.values()].filter((item) => item.status === 'ready').length
  const moderate = [...byRegion.values()].filter((item) => item.status === 'moderate').length
  const recovering = [...byRegion.values()].filter((item) => item.status === 'recovering').length
  for (const [iconNode, text] of [[iconElement(Activity), `${readiness}% overall recovery`], [iconElement(CheckCircle2), `${ready} ready`], [iconElement(Leaf), `${fresh} fresh`], [iconElement(Hourglass), `${recovering} recovering`]] as const) {
    const pill = document.createElement('span')
    pill.append(iconNode, document.createTextNode(text))
    metrics.append(pill)
  }
  if (moderate > 0) {
    const pill = document.createElement('span')
    pill.append(iconElement(BatteryCharging), document.createTextNode(`${moderate} moderate`))
    metrics.append(pill)
  }
  copy.append(title, metrics)
  hero.append(icon, copy)
  return hero
}

function statTile(icon: SVGElement, value: string, label: string, tone = ''): HTMLElement {
  const tile = document.createElement('div')
  tile.className = `recovery-stat${tone ? ` recovery-stat--${tone}` : ''}`
  const glyph = document.createElement('span')
  glyph.className = 'recovery-stat-icon'
  glyph.append(icon)
  const copy = document.createElement('span')
  copy.className = 'recovery-stat-copy'
  const strong = document.createElement('strong')
  strong.textContent = value
  const small = document.createElement('small')
  small.textContent = label
  copy.append(strong, small)
  tile.append(glyph, copy)
  return tile
}

function recoveryRows(muscles: RecoveryMuscle[]): HTMLElement {
  const list = document.createElement('div')
  list.className = 'recovery-list'
  for (const item of muscles) {
    const row = document.createElement('article')
    row.className = `recovery-row recovery-row--${statusClass(item.status)}`
    row.dataset.muscle = item.muscle
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

function freshSummary(recovery: RecoveryOverview): HTMLElement | null {
  const byRegion = recoveryByRegion(recovery)
  const fresh = CANONICAL_MUSCLES.filter((muscle) => !byRegion.has(muscle))
  if (!fresh.length) return null
  const summary = document.createElement('div')
  summary.className = 'recovery-fresh-summary'
  summary.innerHTML = `<strong>${iconElement(Leaf).outerHTML}<span>Fresh</span></strong><span class="recovery-fresh-chips">${fresh.map((name) => `<span>${name}</span>`).join('')}</span><small>Not logged in the lookback window, so available now.</small>`
  return summary
}

export function recoveryContent(recovery: RecoveryOverview): HTMLElement {
  const panel = document.createElement('section')
  panel.className = 'recovery-panel'
  const hero = recoveryHero(recovery)
  const grouped = [...recoveryByRegion(recovery)].map(([region, item]) => ({ ...item, muscle: region.toLowerCase() }))
  const sorted = sortedRecovery(grouped).sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.recovery - b.recovery)
  const recovering = grouped.filter((item) => item.status !== 'ready')
  const stats = document.createElement('div')
  stats.className = 'recovery-stats'
  const readyCount = CANONICAL_MUSCLES.length - recovering.length
  stats.append(
    statTile(iconElement(CheckCircle2), `${readyCount} of ${CANONICAL_MUSCLES.length}`, 'muscles ready', 'ready'),
    statTile(iconElement(Hourglass), String(recovering.length), recovering.length === 1 ? 'muscle recovering' : 'muscles recovering', recovering.length ? 'recovering' : ''),
    statTile(iconElement(Clock), recovery.lookbackDays ? `${recovery.lookbackDays}d` : 'Live', 'lookback window')
  )
  const status = document.createElement('p')
  status.className = 'recovery-status'
  const tired = sorted.filter((item) => item.status !== 'ready').slice(0, 3).map((item) => displayName(item.muscle))
  status.append(iconElement(Info), document.createTextNode(tired.length ? `Muscles needing the most time: ${tired.join(', ')}.` : 'All tracked muscles are ready.'))
  const map = document.createElement('div')
  map.className = 'recovery-map'
  map.innerHTML = `${recoveryBodyMapMarkup(recovery)}<div class="recovery-legend"><span class="rl ready">Ready</span><span class="rl moderate">Moderate</span><span class="rl recovering">Recovering</span><span class="rl fresh">Fresh</span></div>`
  const list = document.createElement('div')
  list.className = 'recovery-list-panel'
  if (sorted.length) list.append(recoveryRows(sorted))
  const fresh = freshSummary(recovery)
  if (fresh) list.append(fresh)
  const layout = document.createElement('div')
  layout.className = 'recovery-layout'
  layout.append(map, list)
  map.querySelectorAll<HTMLElement>('[data-muscle]').forEach(region => {
    const muscle = region.getAttribute('data-muscle') ?? ''
    const select = (): void => {
      map.querySelectorAll('[data-muscle]').forEach(item => item.classList.toggle('is-selected', item === region))
      list.querySelectorAll<HTMLElement>('.recovery-row').forEach(row => row.classList.toggle('is-selected', row.dataset.muscle === muscle.toLowerCase()))
    }
    region.addEventListener('click', select)
    region.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select() } })
  })
  panel.append(hero, stats, status, layout)
  return panel
}

function loadingView(): HTMLElement {
  const section = document.createElement('section')
  section.className = 'recovery-page recovery-page--loading'
  section.innerHTML = '<div></div><div></div><div></div>'
  return section
}

function errorView(message: string): HTMLElement {
  const section = document.createElement('section')
  section.className = 'recovery-empty'
  section.innerHTML = `<p class="eyebrow">Recovery</p><h1>Recovery unavailable</h1><p>${message}</p><button class="button button--primary" data-retry>Try again</button>`
  return section
}

export async function renderRecoveryPage(root: HTMLElement): Promise<void> {
  root.replaceChildren(loadingView())
  try {
    const [recovery, profile] = await Promise.all([getRecovery(), getProfile().catch(() => ({ equipment: [] as string[] }))])
    const page = document.createElement('div')
    page.className = 'recovery-page'
    page.append(recoveryContent(recovery), createRecoveryWorkoutPanel(profile.equipment))
    root.replaceChildren(page)
  } catch (error) {
    const view = errorView(readableApiError(error))
    view.querySelector('[data-retry]')?.addEventListener('click', () => { void renderRecoveryPage(root) })
    root.replaceChildren(view)
  }
}
