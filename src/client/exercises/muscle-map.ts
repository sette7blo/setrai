import { EXERCISE_BODY_SVG } from './body-map.js'
import { displayName } from './format.js'
import type { Exercise } from './types.js'

const regions: Record<string, string> = {
  chest: 'Chest', 'upper-chest': 'Chest', pectorals: 'Chest', back: 'Back', lats: 'Back',
  'upper-back': 'Back', 'lower-back': 'Back', trapezius: 'Back', traps: 'Back',
  shoulders: 'Shoulders', deltoids: 'Shoulders', 'anterior-deltoid': 'Shoulders',
  'lateral-deltoid': 'Shoulders', 'posterior-deltoid': 'Shoulders',
  biceps: 'Biceps', brachialis: 'Biceps', forearms: 'Biceps',
  triceps: 'Triceps', core: 'Core', abs: 'Core', obliques: 'Core',
  quadriceps: 'Quadriceps', quads: 'Quadriceps', legs: 'Quadriceps',
  hamstrings: 'Hamstrings', glutes: 'Glutes', calves: 'Calves'
}

export function muscleRegion(muscle: string): string | undefined {
  return regions[muscle.trim().toLowerCase().replace(/[ _]+/g, '-')]
}

export function muscleMapMarkupForMuscles(primaryMuscles: string[], secondaryMuscles: string[]): string {
  const primary = new Set(primaryMuscles.map(muscleRegion).filter(Boolean))
  const secondary = new Set(secondaryMuscles.map(muscleRegion).filter(Boolean))
  primary.forEach(muscle => secondary.delete(muscle))
  return EXERCISE_BODY_SVG.replace(/<polygon([^>]*)>/g, (_match, attributes: string) => {
    const muscle = attributes.match(/data-muscle="([^"]+)"/)?.[1]
    const tone = muscle && primary.has(muscle) ? 'primary' : muscle && secondary.has(muscle) ? 'secondary' : 'inactive'
    return `<polygon${attributes.replace(/\s*\/$/, '')} class="muscle-map__${tone}"/>`
  })
}

export function muscleMapMarkup(exercise: Pick<Exercise, 'muscleGroup' | 'muscles'>): string {
  return muscleMapMarkupForMuscles([exercise.muscleGroup], exercise.muscles)
}

export function createMuscleMap(exercise: Exercise): HTMLElement {
  const section = document.createElement('section')
  section.className = 'detail-section muscle-map'
  const heading = document.createElement('h2')
  heading.textContent = 'Target muscles'
  const graphic = document.createElement('div')
  graphic.innerHTML = muscleMapMarkup(exercise)
  const svg = graphic.querySelector('svg')!
  svg.setAttribute('role', 'img')
  svg.setAttribute('aria-label', `Front and back muscle map. Primary: ${displayName(exercise.muscleGroup)}. Also works: ${exercise.muscles.map(displayName).join(', ') || 'none specified'}`)
  const legend = document.createElement('p')
  legend.className = 'muscle-map__legend'
  legend.innerHTML = '<span class="muscle-map__key-primary">● Primary</span> <span class="muscle-map__key-secondary">● Secondary</span> · Front / Back'
  section.append(heading, graphic, legend)
  return section
}
