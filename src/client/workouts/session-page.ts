import { ChevronLeft } from 'lucide'
import { ApiError, readableApiError } from '../shared/api/errors.js'
import { iconElement } from '../app/navigation.js'
import { getExercise } from '../exercises/api.js'
import { createExerciseImage } from '../exercises/image.js'
import { getProgram, getSession, logSessionSet, updateSessionSet, deleteSessionSet, finishSession } from './api.js'
import { prescriptionLine } from './format.js'
import { createRestTimer, renderRestTimer, tickRestTimer, type RestTimerState } from './rest-timer.js'
import { renderLoggedSet } from './session-set.js'
import { renderSessionSummary } from './session-summary.js'
import {
  currentSetNumber,
  firstIncompleteExerciseIndex,
  plannedSetsRemaining,
  sessionProgress,
  setsForExercise
} from './session-logic.js'
import type { Program, ProgramExercise, Session, UpdateSetInput } from './types.js'

interface SessionViewState {
  session: Session
  program: Program | null
  exerciseIndex: number
  restTimer: RestTimerState | null
  timerId: number | null
}

function loadingView(): HTMLElement {
  const section = document.createElement('section')
  section.className = 'live-session live-session--loading'
  section.innerHTML = '<div></div><div></div><div></div>'
  return section
}

function errorView(title: string, message: string): HTMLElement {
  const section = document.createElement('section')
  section.className = 'workouts-empty'
  section.innerHTML = `
    <p class="eyebrow">Session</p>
    <h1>${title}</h1>
    <p>${message}</p>
    <a class="button button--primary" href="/workouts">Back to Workouts</a>
  `
  return section
}

async function loadProgramForSession(session: Session): Promise<Program | null> {
  if (!session.programId) {
    return null
  }

  try {
    const program = await getProgram(session.programId)
    const exercises = await Promise.all(program.exercises.map(async (entry) => {
      try {
        return { ...entry, exercise: await getExercise(entry.exerciseId) }
      } catch {
        return entry
      }
    }))
    return { ...program, exercises }
  } catch {
    return null
  }
}

function plannedExercise(state: SessionViewState): ProgramExercise | null {
  return state.program?.exercises[state.exerciseIndex] ?? null
}

function exerciseNav(state: SessionViewState, rerender: () => void): HTMLElement {
  const nav = document.createElement('div')
  nav.className = 'session-nav'
  const prev = document.createElement('button')
  prev.type = 'button'
  prev.textContent = 'Previous'
  prev.disabled = state.exerciseIndex <= 0
  prev.addEventListener('click', () => {
    state.exerciseIndex = Math.max(0, state.exerciseIndex - 1)
    rerender()
  })
  const next = document.createElement('button')
  next.type = 'button'
  next.textContent = 'Next'
  next.disabled = !state.program || state.exerciseIndex >= state.program.exercises.length - 1
  next.addEventListener('click', () => {
    if (state.program) {
      state.exerciseIndex = Math.min(state.program.exercises.length - 1, state.exerciseIndex + 1)
      rerender()
    }
  })
  nav.append(prev, next)
  return nav
}

function setForm(
  state: SessionViewState,
  exercise: ProgramExercise,
  onLogged: () => void
): HTMLElement {
  const form = document.createElement('form')
  form.className = 'set-log-form'
  const setNumber = currentSetNumber(state.session, exercise)
  form.innerHTML = `
    <label>
      <span>Reps</span>
      <input name="reps" type="number" min="1" inputmode="numeric" value="${exercise.reps.match(/\d+/)?.[0] ?? '8'}" required>
    </label>
    <label>
      <span>Weight kg</span>
      <input name="weight" type="number" min="0" step="0.5" inputmode="decimal" value="${exercise.weight ?? ''}">
    </label>
  `
  const button = document.createElement('button')
  button.type = 'submit'
  button.className = 'button button--primary set-log-form__submit'
  button.textContent = `Complete Set ${setNumber}`
  form.append(button)

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    button.disabled = true
    const data = new FormData(form)
    void logSessionSet(state.session.id, {
      exerciseId: exercise.exerciseId,
      setNumber,
      reps: Number(data.get('reps')),
      weight: data.get('weight') ? Number(data.get('weight')) : null,
      done: true
    }).then(async () => {
      state.session = await getSession(state.session.id)
      state.restTimer = createRestTimer(exercise.restSec)
      if (state.program) {
        state.exerciseIndex = firstIncompleteExerciseIndex(state.session, state.program)
      }
      onLogged()
    }).catch(() => {
      button.disabled = false
    })
  })

  return form
}

function finishPanel(state: SessionViewState, rerender: () => void): HTMLElement {
  const form = document.createElement('form')
  form.className = 'finish-panel'
  form.innerHTML = `
    <label>
      <span>Workout notes</span>
      <textarea name="notes" rows="3" placeholder="Optional notes"></textarea>
    </label>
  `
  const button = document.createElement('button')
  button.type = 'submit'
  button.className = 'button button--secondary'
  button.textContent = 'Finish Workout'
  form.append(button)
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const remaining = plannedSetsRemaining(state.session, state.program)
    if (remaining > 0 && !window.confirm(`You still have ${remaining} planned sets remaining. Finish anyway?`)) {
      return
    }
    const data = new FormData(form)
    void finishSession(state.session.id, String(data.get('notes') ?? '')).then((session) => {
      state.session = session
      rerender()
    })
  })
  return form
}

function liveView(state: SessionViewState, rerender: () => void): HTMLElement {
  if (state.session.finishedAt) {
    return renderSessionSummary(state.session, state.program)
  }

  const exercise = plannedExercise(state)
  const page = document.createElement('article')
  page.className = 'live-session'
  const back = document.createElement('a')
  back.className = 'detail-back'
  back.href = '/workouts'
  back.append(iconElement(ChevronLeft), document.createTextNode('Workouts'))
  page.append(back)

  const header = document.createElement('section')
  header.className = 'live-session__header'
  header.innerHTML = `
    <p class="eyebrow">Live workout</p>
    <h1>${state.session.programName}</h1>
    <p class="session-progress">${sessionProgress(state.session, state.program)}</p>
  `
  page.append(header)

  page.append(renderRestTimer(state.restTimer, (next) => {
    state.restTimer = next
    rerender()
  }))

  if (!exercise) {
    const empty = document.createElement('section')
    empty.className = 'workouts-empty'
    empty.innerHTML = '<h2>No planned exercises available.</h2><p>This session can be reviewed, but the live workout plan is unavailable.</p>'
    page.append(empty, finishPanel(state, rerender))
    return page
  }

  const current = document.createElement('section')
  current.className = 'current-exercise'
  current.append(createExerciseImage(exercise.exercise?.imageUrl ?? '', `${exercise.exerciseName} exercise image`, 'current-exercise__image'))
  const body = document.createElement('div')
  body.className = 'current-exercise__body'
  const setNumber = currentSetNumber(state.session, exercise)
  body.innerHTML = `
    <span>Exercise ${state.exerciseIndex + 1} of ${state.program?.exercises.length ?? 1}</span>
    <h2>${exercise.exerciseName || exercise.exercise?.name || 'Exercise'}</h2>
    <p>Set ${setNumber} of ${exercise.sets}</p>
    <strong>${prescriptionLine(exercise)}</strong>
  `
  body.append(setForm(state, exercise, rerender), exerciseNav(state, rerender))
  current.append(body)
  page.append(current)

  const logged = document.createElement('section')
  logged.className = 'logged-sets'
  const title = document.createElement('h2')
  title.textContent = 'Logged sets'
  logged.append(title)
  const sets = setsForExercise(state.session, exercise.exerciseId)
  if (sets.length === 0) {
    const empty = document.createElement('p')
    empty.className = 'muted-line'
    empty.textContent = 'No sets logged for this exercise yet.'
    logged.append(empty)
  }
  for (const set of sets) {
    logged.append(renderLoggedSet(
      set,
      (setId: number, input: UpdateSetInput) => {
        void updateSessionSet(state.session.id, setId, input).then(async () => {
          state.session = await getSession(state.session.id)
          rerender()
        })
      },
      (setId: number) => {
        void deleteSessionSet(state.session.id, setId).then(async () => {
          state.session = await getSession(state.session.id)
          rerender()
        })
      }
    ))
  }
  page.append(logged, finishPanel(state, rerender))
  return page
}

function startTimer(state: SessionViewState, root: HTMLElement): void {
  if (state.timerId !== null) {
    window.clearInterval(state.timerId)
  }
  state.timerId = window.setInterval(() => {
    if (!state.restTimer?.running) {
      return
    }
    state.restTimer = tickRestTimer(state.restTimer)
    render(root, state)
  }, 1000)
}

function render(root: HTMLElement, state: SessionViewState): void {
  root.replaceChildren(liveView(state, () => render(root, state)))
  startTimer(state, root)
}

export async function renderSessionPage(root: HTMLElement, id: number): Promise<void> {
  root.replaceChildren(loadingView())
  try {
    const session = await getSession(id)
    const program = await loadProgramForSession(session)
    const state: SessionViewState = {
      session,
      program,
      exerciseIndex: program ? firstIncompleteExerciseIndex(session, program) : 0,
      restTimer: null,
      timerId: null
    }
    render(root, state)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      root.replaceChildren(errorView('Session not found', 'This workout session may have been removed.'))
      return
    }
    root.replaceChildren(errorView('Unable to load session', readableApiError(error)))
  }
}
