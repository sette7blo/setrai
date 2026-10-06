import { Dumbbell, History } from 'lucide'
import { readableApiError } from '../shared/api/errors.js'
import { iconElement } from '../app/navigation.js'
import { listPrograms, listSessions, startProgramSession } from './api.js'
import { createProgramCard } from './program-card.js'
import type { Program, Session } from './types.js'

function loadingView(): HTMLElement {
  const section = document.createElement('section')
  section.className = 'workouts-page workouts-page--loading'
  section.innerHTML = `
    <div class="workout-hero"><div></div><div></div><div></div></div>
    <div class="program-grid"><article></article><article></article></div>
  `
  return section
}

function errorView(message: string): HTMLElement {
  const section = document.createElement('section')
  section.className = 'workouts-empty'
  section.innerHTML = `
    <p class="eyebrow">Workouts</p>
    <h1>Training unavailable</h1>
    <p>${message}</p>
    <button class="button button--primary" type="button" data-retry>Try again</button>
  `
  return section
}

function hero(activeSessions: Session[]): HTMLElement {
  const section = document.createElement('section')
  section.className = 'workout-hero'
  section.innerHTML = `
    <div>
      <p class="eyebrow">Workouts</p>
      <h1>Start training</h1>
      <p class="hero-summary">Pick a program, resume an active workout, and keep set logging fast enough for the gym floor.</p>
    </div>
  `

  if (activeSessions.length > 0) {
    const resume = document.createElement('a')
    resume.className = 'button button--primary'
    resume.href = `/sessions/${activeSessions[0].id}`
    resume.textContent = `Resume ${activeSessions[0].programName}`
    section.append(resume)
  }

  return section
}

function programsSection(programs: Program[], onStart: (program: Program) => void): HTMLElement {
  const section = document.createElement('section')
  section.className = 'workout-section'
  const heading = document.createElement('div')
  heading.className = 'section-heading'
  heading.append(iconElement(Dumbbell))
  const h2 = document.createElement('h2')
  h2.textContent = 'Programs'
  heading.append(h2)
  section.append(heading)

  if (programs.length === 0) {
    const empty = document.createElement('div')
    empty.className = 'workouts-empty'
    empty.innerHTML = '<h3>No programs yet.</h3><p>Create programs through the API or a later Program Builder phase, then they will appear here for training.</p>'
    section.append(empty)
    return section
  }

  const grid = document.createElement('div')
  grid.className = 'program-grid'
  for (const program of programs) {
    grid.append(createProgramCard(program, onStart))
  }
  section.append(grid)
  return section
}

function sessionStatus(session: Session): string {
  const started = session.startedAt ? new Date(`${session.startedAt}Z`).toLocaleString() : 'Started'
  return session.finishedAt ? `${started} · finished` : `${started} · active`
}

function recentSessionsSection(sessions: Session[]): HTMLElement {
  const section = document.createElement('section')
  section.className = 'workout-section'
  const heading = document.createElement('div')
  heading.className = 'section-heading'
  heading.append(iconElement(History))
  const h2 = document.createElement('h2')
  h2.textContent = 'Recent Sessions'
  heading.append(h2)
  section.append(heading)

  if (sessions.length === 0) {
    const empty = document.createElement('p')
    empty.className = 'muted-line'
    empty.textContent = 'No sessions logged yet.'
    section.append(empty)
    return section
  }

  const list = document.createElement('div')
  list.className = 'recent-session-list'
  for (const session of sessions.slice(0, 6)) {
    const link = document.createElement('a')
    link.href = `/sessions/${session.id}`
    link.className = session.finishedAt ? 'recent-session' : 'recent-session recent-session--active'
    link.innerHTML = `<strong>${session.programName}</strong><span>${sessionStatus(session)}</span>`
    list.append(link)
  }
  section.append(list)
  return section
}

function renderLoaded(root: HTMLElement, programs: Program[], sessions: Session[]): void {
  async function start(program: Program): Promise<void> {
    const session = await startProgramSession(program.id)
    window.location.href = `/sessions/${session.id}`
  }

  const page = document.createElement('div')
  page.className = 'workouts-page'
  page.append(
    hero(sessions.filter((session) => !session.finishedAt)),
    programsSection(programs, (program) => { void start(program) }),
    recentSessionsSection(sessions)
  )
  root.replaceChildren(page)
}

export async function renderWorkoutsPage(root: HTMLElement): Promise<void> {
  root.replaceChildren(loadingView())
  try {
    const [programs, sessions] = await Promise.all([listPrograms(), listSessions()])
    renderLoaded(root, programs, sessions)
  } catch (error) {
    const view = errorView(readableApiError(error))
    view.querySelector('[data-retry]')?.addEventListener('click', () => {
      void renderWorkoutsPage(root)
    })
    root.replaceChildren(view)
  }
}
