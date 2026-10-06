import { Play } from 'lucide'
import { iconElement } from '../app/navigation.js'
import { displayName } from '../exercises/format.js'
import type { Program } from './types.js'
import { programSummary } from './format.js'

export function createProgramCard(
  program: Program,
  onStart: (program: Program) => void
): HTMLElement {
  const article = document.createElement('article')
  article.className = 'program-card'

  const link = document.createElement('a')
  link.className = 'program-card__link'
  link.href = `/programs/${program.id}`
  link.setAttribute('aria-label', `Open ${program.name}`)

  const title = document.createElement('h2')
  title.textContent = program.name
  const description = document.createElement('p')
  description.textContent = program.description || 'Program ready for a focused training session.'
  const meta = document.createElement('small')
  meta.textContent = programSummary(program)

  link.append(title, description, meta)

  const actions = document.createElement('div')
  actions.className = 'program-card__actions'
  const start = document.createElement('button')
  start.type = 'button'
  start.className = 'button button--primary'
  start.append(iconElement(Play), document.createTextNode('Start'))
  start.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    onStart(program)
  })
  actions.append(start)

  if (program.difficulty) {
    const difficulty = document.createElement('span')
    difficulty.className = 'program-difficulty'
    difficulty.textContent = displayName(program.difficulty)
    actions.append(difficulty)
  }

  article.append(link, actions)
  return article
}
