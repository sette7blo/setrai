import { Maximize2, Minimize2 } from 'lucide'
import { iconElement } from '../app/navigation.js'
import { createExerciseImage } from '../exercises/image.js'
import type { ProgramExercise } from './types.js'

const SIZE_KEY = 'setrai.live-image-size'

export function exerciseHero(exercise: ProgramExercise | undefined): HTMLElement {
  const panel = document.createElement('div')
  panel.className = 'live-media-panel'
  const hero = document.createElement('div')
  hero.className = 'live-media'
  panel.append(hero)
  const name = exercise?.exerciseName || 'Training session'
  if (!exercise?.exercise?.imageUrl) {
    hero.classList.add('live-media--empty')
    hero.textContent = name
    return panel
  }
  const frame = createExerciseImage(exercise.exercise.imageUrl, name, 'live-media__image')
  const toggle = document.createElement('button')
  toggle.type = 'button'
  toggle.className = 'live-media-size live-action'
  let expanded = false
  try { expanded = localStorage.getItem(SIZE_KEY) === 'expanded' } catch { /* Device storage is optional. */ }
  const paint = (): void => {
    panel.dataset.size = expanded ? 'expanded' : 'compact'
    toggle.setAttribute('aria-label', expanded ? 'Reduce exercise image' : 'Enlarge exercise image')
    toggle.title = expanded ? 'Reduce image' : 'Enlarge image'
    toggle.setAttribute('aria-pressed', String(expanded))
    toggle.replaceChildren(iconElement(expanded ? Minimize2 : Maximize2))
  }
  toggle.addEventListener('click', () => {
    expanded = !expanded
    try { localStorage.setItem(SIZE_KEY, expanded ? 'expanded' : 'compact') } catch { /* Keep the current choice without storage. */ }
    paint()
  })
  frame.querySelector('img')?.addEventListener('error', () => {
    hero.classList.add('live-media--empty')
    hero.textContent = name
    toggle.remove()
  })
  hero.append(frame)
  panel.append(toggle)
  paint()
  return panel
}
