import { ChevronLeft, Play } from 'lucide'
import { ApiError, readableApiError } from '../shared/api/errors.js'
import { iconElement } from '../app/navigation.js'
import { getExercise } from '../exercises/api.js'
import { createExerciseImage } from '../exercises/image.js'
import { displayName } from '../exercises/format.js'
import { getProgram, startProgramSession } from './api.js'
import { prescriptionLine } from './format.js'
import type { Program, ProgramExercise } from './types.js'

function loadingView(): HTMLElement {
  const section = document.createElement('section')
  section.className = 'program-detail program-detail--loading'
  section.innerHTML = '<div></div><div></div><div></div>'
  return section
}

function errorView(title: string, message: string): HTMLElement {
  const section = document.createElement('section')
  section.className = 'workouts-empty'
  section.innerHTML = `
    <p class="eyebrow">Program</p>
    <h1>${title}</h1>
    <p>${message}</p>
    <a class="button button--primary" href="/workouts">Back to Workouts</a>
  `
  return section
}

async function enrichProgram(program: Program): Promise<Program> {
  const exercises = await Promise.all(program.exercises.map(async (entry) => {
    try {
      return {
        ...entry,
        exercise: await getExercise(entry.exerciseId)
      }
    } catch {
      return entry
    }
  }))
  return { ...program, exercises }
}

function exerciseRow(entry: ProgramExercise): HTMLElement {
  const article = document.createElement('article')
  article.className = 'program-exercise-row'
  article.append(createExerciseImage(
    entry.exercise?.imageUrl ?? '',
    `${entry.exerciseName} exercise image`,
    'program-exercise-row__image'
  ))

  const body = document.createElement('div')
  body.className = 'program-exercise-row__body'
  const name = document.createElement('h3')
  name.textContent = entry.exerciseName || entry.exercise?.name || 'Exercise'
  const prescription = document.createElement('p')
  prescription.textContent = prescriptionLine(entry)
  body.append(name, prescription)

  if (entry.exercise?.muscleGroup) {
    const muscle = document.createElement('small')
    muscle.textContent = displayName(entry.exercise.muscleGroup)
    body.append(muscle)
  }

  if (entry.notes) {
    const notes = document.createElement('em')
    notes.textContent = entry.notes
    body.append(notes)
  }

  article.append(body)
  return article
}

function renderProgram(program: Program): HTMLElement {
  const page = document.createElement('article')
  page.className = 'program-detail'

  const back = document.createElement('a')
  back.className = 'detail-back'
  back.href = '/workouts'
  back.append(iconElement(ChevronLeft), document.createTextNode('Workouts'))

  const hero = document.createElement('section')
  hero.className = 'program-detail__hero'
  const copy = document.createElement('div')
  copy.innerHTML = `
    <p class="eyebrow">Program</p>
    <h1>${program.name}</h1>
    <p class="hero-summary">${program.description || 'A focused Setrai training program.'}</p>
  `
  const start = document.createElement('button')
  start.type = 'button'
  start.className = 'button button--primary'
  start.append(iconElement(Play), document.createTextNode('Start Workout'))
  start.addEventListener('click', () => {
    void startProgramSession(program.id).then((session) => {
      window.location.href = `/sessions/${session.id}`
    })
  })
  hero.append(copy, start)

  const list = document.createElement('section')
  list.className = 'program-exercise-list'
  const heading = document.createElement('h2')
  heading.textContent = 'Exercises'
  list.append(heading)
  for (const entry of program.exercises) {
    list.append(exerciseRow(entry))
  }

  page.append(back, hero, list)
  return page
}

export async function renderProgramDetail(root: HTMLElement, id: number): Promise<void> {
  root.replaceChildren(loadingView())
  try {
    const program = await enrichProgram(await getProgram(id))
    root.replaceChildren(renderProgram(program))
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      root.replaceChildren(errorView('Program not found', 'This program may have been removed.'))
      return
    }

    root.replaceChildren(errorView('Unable to load program', readableApiError(error)))
  }
}
