import type { Program, Session } from './types.js'
import { completedSetCount, simpleVolume } from './session-logic.js'

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

export function renderSessionSummary(session: Session, program: Program | null): HTMLElement {
  const section = document.createElement('section')
  section.className = 'session-summary'
  section.innerHTML = `
    <p class="eyebrow">Workout complete</p>
    <h1></h1>
  `
  section.querySelector('h1')!.textContent = session.programName

  const list = document.createElement('dl')
  for (const fact of summaryFacts(session, program)) {
    const item = document.createElement('div')
    const dt = document.createElement('dt')
    dt.textContent = 'Summary'
    const dd = document.createElement('dd')
    dd.textContent = fact
    item.append(dt, dd)
    list.append(item)
  }

  const back = document.createElement('a')
  back.className = 'button button--primary'
  back.href = '/workouts'
  back.textContent = 'Back to Workouts'

  section.append(list, back)
  return section
}
