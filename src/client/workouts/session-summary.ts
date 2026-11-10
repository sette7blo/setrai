import { Share2 } from 'lucide'
import { iconElement } from '../app/navigation.js'
import { muscleMapMarkupForMuscles } from '../exercises/muscle-map.js'
import type { WeightUnit } from '../profile/types.js'
import { formatVolumeKg } from '../profile/weight-units.js'
import type { Exercise } from '../exercises/types.js'
import { statStrip, type StatStripCell } from '../shared/stat-strip.js'
import type { Program, Session } from './types.js'
import { completedSetCount, simpleVolume } from './session-logic.js'
import { formatSessionDate, sessionDuration, sessionExercises, sessionMuscles } from './history-session-card.js'
import { createSummaryImage, shareSummaryImage } from './session-summary-share.js'

export function summaryFacts(session: Session, program: Program | null, unit: WeightUnit = 'kg'): string[] {
  const sets = completedSetCount(session)
  const facts = [
    `${sets} ${sets === 1 ? 'set' : 'sets'} logged`
  ]

  if (program) {
    facts.unshift(program.name)
  } else {
    facts.unshift(session.programName)
  }

  const volume = simpleVolume(session)
  if (volume > 0) {
    facts.push(`${formatVolumeKg(volume, unit)} total volume`)
  }

  return facts
}

// A figure with no value is left out instead of shown as a placeholder.
export function summaryStats(session: Session, unit: WeightUnit = 'kg'): StatStripCell[] {
  const duration = sessionDuration(session)
  const volume = simpleVolume(session)
  const cells: StatStripCell[] = []
  if (duration) cells.push({ value: duration, label: 'Duration' })
  cells.push({ value: String(completedSetCount(session)), label: 'Sets' })
  if (volume > 0) cells.push({ value: formatVolumeKg(volume, unit), label: 'Volume' })
  cells.push({ value: String(sessionExercises(session).length), label: 'Exercises' })
  return cells
}

export function renderSessionSummary(session: Session, program: Program | null, unit: WeightUnit = 'kg'): HTMLElement {
  const section = document.createElement('section')
  section.className = 'session-summary'
  const fullExercises = (program?.exercises ?? session.plannedExercises).map(entry => entry.exercise).filter((exercise): exercise is Exercise => Boolean(exercise))
  const muscles = sessionMuscles(session, fullExercises)
  const doneSets = completedSetCount(session)
  const volume = simpleVolume(session)
  const exercises = sessionExercises(session)
  const duration = sessionDuration(session)

  const heading = document.createElement('header')
  heading.className = 'page-heading session-summary-heading'
  const title = document.createElement('h1')
  title.textContent = session.programName || program?.name || 'Workout'
  const meta = document.createElement('p')
  meta.className = 'session-summary-meta'
  meta.textContent = [session.finishedAt ? formatSessionDate(session.finishedAt) : '', muscles.names.slice(0, 4).join(' · ')].filter(Boolean).join(' · ')
  heading.append(title, meta)

  const stats = statStrip(summaryStats(session, unit), 'session-summary-stats')

  const map = document.createElement('div')
  map.className = 'session-summary-map'
  map.innerHTML = muscleMapMarkupForMuscles(muscles.primary, muscles.secondary)
  map.querySelector('svg')?.setAttribute('aria-hidden', 'true')

  const actions = document.createElement('div')
  actions.className = 'session-summary-actions'
  actions.dataset.summaryCapture = 'exclude'
  const share = document.createElement('button')
  share.type = 'button'
  share.className = 'button button--secondary session-summary-share'
  const shareLabel = document.createElement('span')
  shareLabel.textContent = 'Share image'
  share.append(iconElement(Share2), shareLabel)
  const shareStatus = document.createElement('span')
  shareStatus.className = 'session-summary-share-status'
  shareStatus.setAttribute('role', 'status')
  let image: Promise<File> | null = null
  const prepareImage = (): Promise<File> => {
    image ??= createSummaryImage({
      title: title.textContent || 'Workout',
      meta: meta.textContent || '',
      duration: duration || 'Done',
      sets: String(doneSets),
      volume: volume > 0 ? formatVolumeKg(volume, unit) : '—',
      exercises: String(exercises.length),
      receipt: summaryFacts(session, program, unit).slice(1).join(' · '),
      muscleMapSvg: map.innerHTML,
    })
    return image
  }
  share.addEventListener('click', async () => {
    share.disabled = true
    shareLabel.textContent = 'Preparing image…'
    shareStatus.textContent = ''
    try {
      const result = await shareSummaryImage(await prepareImage())
      shareStatus.textContent = result === 'downloaded' ? 'Image saved. Attach it to your post on X.' : ''
    } catch {
      image = null
      shareStatus.textContent = 'Could not create the image. Try again.'
    } finally {
      share.disabled = false
      shareLabel.textContent = 'Share image'
    }
  })

  const back = document.createElement('a')
  back.className = 'button button--primary'
  back.href = '/today'
  back.textContent = 'Done'
  actions.append(share, back, shareStatus)

  section.append(heading, stats, map, actions)
  return section
}
