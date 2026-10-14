import { Award, Clock, Dumbbell, Layers, ListOrdered } from 'lucide'
import { iconElement } from '../app/navigation.js'
import { muscleMapMarkupForMuscles } from '../exercises/muscle-map.js'
import type { WeightUnit } from '../profile/types.js'
import { formatVolumeKg } from '../profile/weight-units.js'
import type { Exercise } from '../exercises/types.js'
import type { Program, Session } from './types.js'
import { completedSetCount, simpleVolume } from './session-logic.js'
import { formatSessionDate, sessionDuration, sessionExercises, sessionMuscles } from './history-session-card.js'

export function summaryFacts(session: Session, program: Program | null): string[] {
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
    facts.push(`${volume.toLocaleString()} kg total volume`)
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
  proofCopy.textContent = summaryFacts(session, program).filter(fact => fact !== session.programName && fact !== program?.name).join(' · ')
  proof.append(proofTitle, proofCopy)

  const back = document.createElement('a')
  back.className = 'button button--primary'
  back.href = '/workouts'
  back.textContent = 'Back to Workouts'

  section.append(brand, hero, stats, map, proof, back)
  return section
}
