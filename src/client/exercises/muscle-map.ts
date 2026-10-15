import { EXERCISE_BODY_SVG } from './body-map.js'
import { displayName } from './format.js'
import { recoveryMuscleRegion } from './taxonomy.js'
import type { Exercise } from './types.js'

export function muscleRegion(muscle: string): string | undefined {
  return recoveryMuscleRegion(muscle)
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
