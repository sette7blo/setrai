import { Dumbbell } from 'lucide'
import { iconElement } from '../app/navigation.js'

export function createExerciseImage(
  imageUrl: string,
  alt: string,
  className = 'exercise-image'
): HTMLElement {
  const frame = document.createElement('div')
  frame.className = `${className} exercise-image-frame`

  const placeholder = document.createElement('div')
  placeholder.className = 'exercise-image-placeholder'
  placeholder.setAttribute('aria-hidden', 'true')
  placeholder.append(iconElement(Dumbbell))

  const label = document.createElement('span')
  label.textContent = 'Setrai movement'
  placeholder.append(label)

  if (!imageUrl) {
    frame.classList.add('exercise-image-frame--fallback')
    frame.append(placeholder)
    return frame
  }

  const image = document.createElement('img')
  image.src = imageUrl
  image.alt = alt
  image.loading = 'lazy'
  image.decoding = 'async'
  image.addEventListener('error', () => {
    frame.classList.add('exercise-image-frame--fallback')
    frame.replaceChildren(placeholder)
  })

  frame.append(image)
  return frame
}

export function imageFallbackState(imageUrl: string, failed: boolean): 'image' | 'fallback' {
  return imageUrl && !failed ? 'image' : 'fallback'
}
