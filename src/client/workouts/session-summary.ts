import { Award, Clock, Dumbbell, Layers, ListOrdered, Share2 } from 'lucide'
import { iconElement } from '../app/navigation.js'
import { muscleMapMarkupForMuscles } from '../exercises/muscle-map.js'
import type { WeightUnit } from '../profile/types.js'
import { formatVolumeKg } from '../profile/weight-units.js'
import type { Exercise } from '../exercises/types.js'
import type { Program, Session } from './types.js'
import { completedSetCount, simpleVolume } from './session-logic.js'
import { formatSessionDate, sessionDuration, sessionExercises, sessionMuscles } from './history-session-card.js'
import { createSummaryImage, shareSummaryImage } from './session-summary-share.js'

export function summaryFacts(session: Session, program: Program | null, unit: WeightUnit = 'kg'): string[] {
  const facts = [
    `${completedSetCount(session)} sets logged`
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

function statTile(icon: typeof Award, value: string, label: string): HTMLElement {
  const tile = document.createElement('div')
  tile.className = 'session-summary-stat'
  const iconWrap = document.createElement('span')
  iconWrap.className = 'session-summary-stat__icon'
  iconWrap.append(iconElement(icon))
  const strong = document.createElement('strong')
  strong.textContent = value
  const small = document.createElement('span')
  small.textContent = label
  tile.append(iconWrap, strong, small)
  return tile
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

  const brand = document.createElement('div')
  brand.className = 'session-summary-brand'
  const logo = document.createElement('img')
  logo.className = 'mobile-brand__logo'
  logo.src = '/brand/setrai-logo-mark.jpg'
  logo.alt = ''
  logo.setAttribute('aria-hidden', 'true')
  const wordmark = document.createElement('span')
  const name = document.createElement('strong')
  name.textContent = 'Setrai'
  const tagline = document.createElement('small')
  tagline.textContent = 'AI Training Coach'
  wordmark.append(name, tagline)
  brand.append(logo, wordmark)

  const medal = document.createElement('span')
  medal.className = 'session-summary-medal'
  medal.append(iconElement(Award))

  const copy = document.createElement('div')
  copy.className = 'session-summary-copy'
  const eyebrow = document.createElement('p')
  eyebrow.className = 'eyebrow'
  eyebrow.textContent = 'Workout complete'
  const title = document.createElement('h1')
  title.textContent = session.programName || program?.name || 'Workout'
  const meta = document.createElement('p')
  meta.className = 'session-summary-meta'
  meta.textContent = [session.finishedAt ? formatSessionDate(session.finishedAt) : '', muscles.names.slice(0, 4).join(' · ')].filter(Boolean).join(' · ')
  copy.append(eyebrow, title, meta)

  const hero = document.createElement('div')
  hero.className = 'session-summary-hero'
  hero.append(medal, copy)

  const stats = document.createElement('div')
  stats.className = 'session-summary-stats'
  stats.append(
    statTile(Clock, duration || 'Done', 'Duration'),
    statTile(ListOrdered, String(doneSets), 'Sets'),
    statTile(Dumbbell, volume > 0 ? formatVolumeKg(volume, unit) : '—', 'Volume'),
    statTile(Layers, String(exercises.length), 'Exercises')
  )

  const map = document.createElement('div')
  map.className = 'session-summary-map'
  map.innerHTML = muscleMapMarkupForMuscles(muscles.primary, muscles.secondary)
  map.querySelector('svg')?.setAttribute('aria-hidden', 'true')

  const proof = document.createElement('div')
  proof.className = 'session-summary-proof'
  const proofTitle = document.createElement('strong')
  proofTitle.textContent = 'Training receipt'
  const proofCopy = document.createElement('span')
  proofCopy.textContent = summaryFacts(session, program, unit).filter(fact => fact !== session.programName && fact !== program?.name).join(' · ')
  proof.append(proofTitle, proofCopy)

  const actions = document.createElement('div')
  actions.className = 'session-summary-actions'
  actions.dataset.summaryCapture = 'exclude'
  const share = document.createElement('button')
  share.type = 'button'
  share.className = 'button button--primary session-summary-share'
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
      receipt: proofCopy.textContent || '',
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
  back.className = 'button button--secondary'
  back.href = '/library/programs'
  back.textContent = 'Back to Library'
  actions.append(share, back, shareStatus)

  section.append(brand, hero, stats, map, proof, actions)
  return section
}
