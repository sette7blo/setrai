import assert from 'node:assert/strict'
import test from 'node:test'

import { ApiClient } from '../../src/client/shared/api/client.js'
import {
  finishSession,
  logSessionSet,
  startProgramSession,
  updateSessionSet
} from '../../src/client/workouts/api.js'
import {
  normalizeSession,
  normalizeProgram,
  normalizeProgramExercise,
  programSummary
} from '../../src/client/workouts/format.js'
import {
  historyHero,
  hasUnusualSessionDuration,
  sessionDateKey,
  sessionHistoryCard,
  sessionMuscles,
  sessionVolume
} from '../../src/client/workouts/history-session-card.js'
import {
  completedSetCount,
  currentSetNumber,
  firstIncompleteExerciseIndex,
  plannedSetsRemaining,
  sessionProgress,
  simpleVolume,
  totalPlannedSets
} from '../../src/client/workouts/session-logic.js'
import { renderSessionSummary, summaryFacts } from '../../src/client/workouts/session-summary.js'
import { createHistoryCalendar } from '../../src/client/workouts/history-calendar.js'
import { sessionLinks, workoutLoadingSkeleton } from '../../src/client/workouts/page.js'
import { homeHeading, libraryHeading } from '../../src/client/app/section-navigation.js'
import type { Program, Session } from '../../src/client/workouts/types.js'

test('normalizes and orders Program exercises', () => {
  const program = normalizeProgram({
    id: 1,
    slug: 'upper-a',
    name: 'Upper A',
    description: 'Press day',
    difficulty: 'intermediate',
    tags: ['strength'],
    exercises: [
      { exerciseId: 2, exerciseSlug: 'row', exerciseName: 'Row', position: 2 },
      { exercise_id: 1, exercise_slug: 'bench-press', exercise_name: 'Bench Press', position: 1, rest_sec: 120, weight: 80 }
    ]
  })

  assert.equal(program.name, 'Upper A')
  assert.equal(program.exercises[0].exerciseSlug, 'bench-press')
  assert.equal(program.exercises[0].restSec, 120)
  assert.equal(program.exercises[0].weight, 80)
  assert.equal(programSummary(program), '2 exercises · Intermediate')
})

test('normalizes rest aliases in Program Exercise payloads', () => {
  assert.equal(normalizeProgramExercise({ exerciseId: 1, restSeconds: 75 }).restSec, 75)
  assert.equal(normalizeProgramExercise({ exerciseId: 1, restSec: 60 }).restSec, 60)
})

test('Session API sends start Program payload', async () => {
  const originalFetch = globalThis.fetch
  const calls: Array<{ url: string, init?: RequestInit }> = []
  try {
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init })
      return new Response(JSON.stringify({ session: { id: 7, programId: 3, programName: 'Upper A', sets: [] } }), { status: 201 })
    }
    const session = await startProgramSession(3, new ApiClient())
    assert.equal(session.id, 7)
    assert.equal(calls[0].url, '/api/sessions')
    assert.equal(calls[0].init?.method, 'POST')
    assert.deepEqual(JSON.parse(String(calls[0].init?.body)), { programId: 3 })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Session API sends log, update, and finish contracts', async () => {
  const originalFetch = globalThis.fetch
  const calls: Array<{ url: string, init?: RequestInit }> = []
  try {
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init })
      if (String(url).endsWith('/finish')) {
        return new Response(JSON.stringify({ session: { id: 9, programName: 'Upper A', finishedAt: 'now', sets: [] } }), { status: 200 })
      }
      return new Response(JSON.stringify({ set: { id: 2, sessionId: 9, exerciseId: 4, setNumber: 1, reps: 10, weight: 32.5, done: true } }), { status: 200 })
    }

    await logSessionSet(9, { exerciseId: 4, setNumber: 1, reps: 10, weight: 32.5, done: true }, new ApiClient())
    await updateSessionSet(9, 2, { reps: 9, weight: 35, done: true, setNumber: 1 }, new ApiClient())
    await finishSession(9, 'Felt good', new ApiClient())

    assert.equal(calls[0].url, '/api/sessions/9/sets')
    assert.deepEqual(JSON.parse(String(calls[0].init?.body)), { exerciseId: 4, setNumber: 1, reps: 10, weight: 32.5, done: true })
    assert.equal(calls[1].url, '/api/sessions/9/sets/2')
    assert.equal(calls[1].init?.method, 'PATCH')
    assert.deepEqual(JSON.parse(String(calls[1].init?.body)), { reps: 9, weight: 35, done: true, setNumber: 1 })
    assert.equal(calls[2].url, '/api/sessions/9/finish')
    assert.deepEqual(JSON.parse(String(calls[2].init?.body)), { notes: 'Felt good' })
  } finally {
    globalThis.fetch = originalFetch
  }
})

function program(): Program {
  return normalizeProgram({
    id: 1,
    slug: 'upper-a',
    name: 'Upper A',
    exercises: [
      { exerciseId: 10, exerciseName: 'Bench Press', exerciseSlug: 'bench-press', position: 0, sets: 2 },
      { exerciseId: 11, exerciseName: 'Row', exerciseSlug: 'row', position: 1, sets: 1 }
    ]
  })
}

function session(): Session {
  return {
    id: 5,
    programId: 1,
    programName: 'Upper A',
    startedAt: '',
    finishedAt: null,
    notes: '',
    plannedExercises: [],
    sets: [
      { id: 1, sessionId: 5, exerciseId: 10, exerciseSlug: 'bench-press', exerciseName: 'Bench Press', setNumber: 1, reps: 8, weight: 100, done: true, loggedAt: '' }
    ]
  }
}

test('live Session logic selects current set and exercise progression', () => {
  const p = program()
  const s = session()
  assert.equal(totalPlannedSets(p), 3)
  assert.equal(completedSetCount(s), 1)
  assert.equal(currentSetNumber(s, p.exercises[0]), 2)
  assert.equal(firstIncompleteExerciseIndex(s, p), 0)
  s.sets.push({ id: 2, sessionId: 5, exerciseId: 10, exerciseSlug: 'bench-press', exerciseName: 'Bench Press', setNumber: 2, reps: 7, weight: 100, done: true, loggedAt: '' })
  assert.equal(firstIncompleteExerciseIndex(s, p), 1)
  assert.equal(plannedSetsRemaining(s, p), 1)
  assert.equal(sessionProgress(s, p), '1 / 2 exercises · 2 / 3 sets')
})

test('Session summary reports logged set count and simple volume', () => {
  const s = session()
  assert.equal(simpleVolume(s), 800)
  assert.deepEqual(summaryFacts(s, program()), ['Upper A', '1 sets logged', '800 kg total volume'])
})

test('Session summary renders Setrai branded receipt with muscle map and stats', () => {
  const originalDocument = globalThis.document
  try {
    globalThis.document = {
      createElement: () => new TestElement(),
      createElementNS: () => new TestElement(),
      createTextNode: (text: string) => Object.assign(new TestElement(), { textContent: text })
    } as unknown as Document
    const s = session()
    s.startedAt = '2026-10-05T14:00:00.000Z'
    s.finishedAt = '2026-10-05T14:45:00.000Z'
    s.plannedExercises = [{ id: null, exerciseId: 10, exerciseSlug: 'bench-press', exerciseName: 'Bench Press', position: 0, sets: 2, reps: '8', restSec: 90, weight: null, notes: '' }]
    const summary = renderSessionSummary(s, program(), 'lb') as unknown as TestElement
    const text = elementText(summary)
    const classes = walkElements(summary).map(element => element.className).join(' ')
    assert.match(classes, /session-summary-brand/)
    assert.match(classes, /mobile-brand__logo/)
    assert.match(classes, /session-summary-map/)
    assert.match(classes, /session-summary-stat/)
    const logo = walkElements(summary).find(element => element.className === 'mobile-brand__logo') as (TestElement & { src?: string }) | undefined
    assert.equal(logo?.src, '/brand/setrai-logo-mark.jpg')
    assert.doesNotMatch(String(logo?.src), /editorial-logo/)
    assert.match(text, /Setrai/)
    assert.match(text, /AI Training Coach/)
    assert.match(text, /Workout complete/)
    assert.match(text, /Upper A/)
    assert.match(text, /1,764 lb/)
    assert.match(text, /Training receipt/)
  } finally {
    globalThis.document = originalDocument
  }
})

test('Workout history derives aggregate muscles and stable date keys without opening a session route', () => {
  const s = session()
  s.startedAt = '2026-10-05T14:00:00.000Z'
  s.finishedAt = '2026-10-05T14:45:00.000Z'
  s.plannedExercises = [
    { id: null, exerciseId: 10, exerciseSlug: 'bench-press', exerciseName: 'Bench Press', position: 0, sets: 2, reps: '8', restSec: 90, weight: null, notes: '' },
    { id: null, exerciseId: 11, exerciseSlug: 'row', exerciseName: 'Row', position: 1, sets: 2, reps: '10', restSec: 90, weight: null, notes: '' }
  ]
  s.sets.push({ id: 2, sessionId: 5, exerciseId: 11, exerciseSlug: 'row', exerciseName: 'Row', setNumber: 1, reps: 10, weight: 60, done: true, loggedAt: '' })

  const muscles = sessionMuscles(s, [
    { id: 10, slug: 'bench-press', name: 'Bench Press', description: '', category: '', muscleGroup: 'chest', muscles: ['triceps'], equipment: [], difficulty: '', movementType: '', tags: [], instructions: [], imageUrl: '', favourite: false, defaultSets: 3, defaultReps: '8', defaultRest: 90 },
    { id: 11, slug: 'row', name: 'Row', description: '', category: '', muscleGroup: 'back', muscles: ['biceps'], equipment: [], difficulty: '', movementType: '', tags: [], instructions: [], imageUrl: '', favourite: false, defaultSets: 3, defaultReps: '10', defaultRest: 90 }
  ])

  assert.equal(sessionDateKey(s), '2026-10-05')
  assert.deepEqual(muscles.primary, ['chest', 'back'])
  assert.deepEqual(muscles.secondary, ['triceps', 'biceps'])
  assert.equal(sessionVolume(s), 1400)
})

test('Workout history flags implausible durations without hiding a completed session', () => {
  const short = { ...session(), startedAt: '2026-10-05T14:00:00.000Z', finishedAt: '2026-10-05T14:03:00.000Z' }
  const normal = { ...session(), startedAt: '2026-10-05T14:00:00.000Z', finishedAt: '2026-10-05T14:45:00.000Z' }
  assert.equal(hasUnusualSessionDuration(short), true)
  assert.equal(hasUnusualSessionDuration(normal), false)
})

class TestElement {
  href = ''
  className = ''
  classList = { add: (...names: string[]) => { this.className = [this.className, ...names].filter(Boolean).join(' ') } }
  dataset: Record<string, string> = {}
  disabled = false
  textContent = ''
  innerHTML = ''
  children: TestElement[] = []
  listeners: Record<string, Array<() => void>> = {}
  type = ''
  attributes: Record<string, string> = {}

  append(...children: TestElement[]): void { this.children.push(...children) }
  prepend(...children: TestElement[]): void { this.children.unshift(...children) }
  appendChild(child: TestElement): TestElement { this.children.push(child); return child }
  replaceChildren(...children: TestElement[]): void { this.children = [...children] }
  setAttribute(name: string, value: string): void { this.attributes[name] = value }
  querySelector(): TestElement | null { return null }
  addEventListener(name: string, handler: () => void): void { (this.listeners[name] ??= []).push(handler) }
  click(): void { for (const handler of this.listeners.click ?? []) handler() }
}

class TestButton extends TestElement {}

function walkElements(root: TestElement): TestElement[] {
  return [root, ...root.children.flatMap(walkElements)]
}

function elementText(root: TestElement): string {
  return [root.textContent, ...root.children.map(elementText)].join(' ')
}

test('Home owns History and Recovery while Library owns Exercises and Programs', () => {
  const originalDocument = globalThis.document
  try {
    globalThis.document = {
      createElement: () => new TestElement(),
      createElementNS: () => new TestElement(),
      createTextNode: (text: string) => Object.assign(new TestElement(), { textContent: text })
    } as unknown as Document
    const home = homeHeading('recovery') as unknown as TestElement
    const homeNodes = walkElements(home)
    assert.equal(homeNodes.some((node) => node.href === '/statistics/history'), true)
    assert.equal(homeNodes.some((node) => node.href === '/statistics/recovery'), true)
    assert.match(elementText(home), /Training.*History.*Body.*Recovery/)
    assert.equal(homeNodes.some((node) => node.attributes['aria-current'] === 'page'), true)

    const library = libraryHeading('programs') as unknown as TestElement
    const libraryNodes = walkElements(library)
    assert.equal(libraryNodes.some((node) => node.href === '/library/exercises'), true)
    assert.equal(libraryNodes.some((node) => node.href === '/library/programs'), true)
    assert.match(elementText(library), /Exercises.*Programs/)
  } finally {
    globalThis.document = originalDocument
  }
})

test('Workout history hero stays compact without explanatory copy', () => {
  const originalDocument = globalThis.document
  try {
    globalThis.document = {
      createElement: () => new TestElement(),
      createElementNS: () => new TestElement(),
      createTextNode: (text: string) => Object.assign(new TestElement(), { textContent: text })
    } as unknown as Document
    const s = session()
    s.startedAt = '2026-10-05T14:00:00.000Z'
    s.finishedAt = '2026-10-05T14:45:00.000Z'
    const hero = historyHero([s]) as unknown as TestElement
    const text = elementText(hero)
    assert.match(text, /Workout history/)
    assert.match(text, /1 sessions/)
    assert.match(text, /1 completed/)
    assert.match(text, /1 sets/)
    assert.doesNotMatch(text, /Every live session/)
    assert.doesNotMatch(text, /sets logged/)
  } finally {
    globalThis.document = originalDocument
  }
})

test('Workout history card omits receipt label and honors profile lb volume', () => {
  const originalDocument = globalThis.document
  try {
    globalThis.document = {
      createElement: () => new TestElement(),
      createElementNS: () => new TestElement(),
      createTextNode: (text: string) => Object.assign(new TestElement(), { textContent: text })
    } as unknown as Document
    const s = session()
    s.finishedAt = '2026-10-05T14:45:00.000Z'
    s.plannedExercises = [{ id: null, exerciseId: 10, exerciseSlug: 'bench-press', exerciseName: 'Bench Press', position: 0, sets: 2, reps: '8', restSec: 90, weight: null, notes: '' }]
    s.sets = [{ id: 2, sessionId: 5, exerciseId: 10, exerciseSlug: 'bench-press', exerciseName: 'Bench Press', setNumber: 1, reps: 10, weight: 100, done: true, loggedAt: '' }]
    const card = sessionHistoryCard(s, [], 'lb') as unknown as TestElement
    const text = elementText(card)
    assert.match(text, /1 set/)
    assert.match(text, /1 exercise/)
    assert.match(text, /2,205 lb/)
    assert.doesNotMatch(text, /2,205 lb volume/)
    assert.doesNotMatch(text, /Receipt/)
  } finally {
    globalThis.document = originalDocument
  }
})

test('Workout history calendar selects the clicked day instead of the final rendered cursor day', () => {
  const originalDocument = globalThis.document
  const originalWindow = globalThis.window
  const originalButton = globalThis.HTMLButtonElement
  try {
    globalThis.HTMLButtonElement = TestButton as unknown as typeof HTMLButtonElement
    globalThis.document = {
      createElement: (tag: string) => tag === 'button' ? new TestButton() : new TestElement(),
      createElementNS: () => new TestElement(),
      createTextNode: (text: string) => Object.assign(new TestElement(), { textContent: text })
    } as unknown as Document
    globalThis.window = { location: { search: '' } } as unknown as Window & typeof globalThis
    let selected = ''
    const today = new Date()
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const s = { ...session(), finishedAt: `${key}T12:00:00.000Z`, startedAt: `${key}T11:00:00.000Z` }
    const calendar = createHistoryCalendar([s], null, date => { selected = date ?? '' }) as unknown as TestElement
    const button = walkElements(calendar).find(element => element.dataset.historyDate === key) as TestButton | undefined
    if (!button) throw new Error('expected clickable history day')
    button.click()
    assert.equal(selected, key)
  } finally {
    globalThis.document = originalDocument
    globalThis.window = originalWindow
    globalThis.HTMLButtonElement = originalButton
  }
})


test('Library keeps only active Resume without duplicating completed history', () => {
  const originalDocument = globalThis.document
  try {
    globalThis.document = {
      createElement: () => new TestElement(),
      createElementNS: () => new TestElement(),
      createTextNode: (text: string) => Object.assign(new TestElement(), { textContent: text })
    } as unknown as Document
    const complete = normalizeSession({ id: 1, programName: 'Completed workout', finishedAt: '2026-10-09T12:00:00Z' })
    const active = normalizeSession({ id: 2, programName: 'Active workout' })
    const links = sessionLinks([complete, active]) as unknown as TestElement
    assert.deepEqual(links.children.map(child => child.href), ['/sessions/2'])
    assert.match(elementText(links.children[0]), /Resume Active workout/)
    assert(!elementText(links).includes('Recent sessions'))
    assert(!elementText(links).includes('Completed workout'))
    for (const sessions of [[], [complete]]) {
      const actions = sessionLinks(sessions) as unknown as TestElement
      assert.deepEqual(actions.children.map(child => child.href), [])
    }
  } finally { globalThis.document = originalDocument }
})

test('Workout loading skeletons render route-specific placeholder cards', () => {
  const originalDocument = globalThis.document
  try {
    globalThis.document = {
      createElement: () => new TestElement()
    } as unknown as Document
    const library = workoutLoadingSkeleton('library') as unknown as TestElement
    const history = workoutLoadingSkeleton('history') as unknown as TestElement
    assert.match(library.className, /workout-loading--library/)
    assert.match(history.className, /workout-loading--history/)
    assert.equal(library.children.length, 2)
    assert.equal(history.children.length, 3)
    assert(library.children.every(child => child.className === 'workout-loading-card'))
  } finally { globalThis.document = originalDocument }
})
