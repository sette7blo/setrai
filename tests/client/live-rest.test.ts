import assert from 'node:assert/strict'
import test from 'node:test'
import { renderRest } from '../../src/client/workouts/live-rest-view.js'
import { normalizeSession } from '../../src/client/workouts/format.js'
import type { LiveActions, LiveModel } from '../../src/client/workouts/live-model.js'

class Element {
  children: Element[] = []
  textContent = ''
  className = ''
  innerHTML = ''
  attributes: Record<string, string> = {}
  listeners: Record<string, ((event: KeyboardEvent) => void)[]> = {}
  append(...children: Element[]): void { this.children.push(...children) }
  appendChild(child: Element): Element { this.children.push(child); return child }
  setAttribute(name: string, value: string): void { this.attributes[name] = value }
  querySelector(): null { return null }
  addEventListener(name: string, fn: (event: KeyboardEvent) => void): void { (this.listeners[name] ??= []).push(fn) }
  focus(): void { (document as unknown as { activeElement: Element }).activeElement = this }
  dispatch(name: string, event = {} as KeyboardEvent): void { for (const fn of this.listeners[name] ?? []) fn(event) }
}

function elements(root: Element): Element[] { return [root, ...root.children.flatMap(elements)] }
function withDom(run: () => void): void {
  const original = globalThis.document
  try {
    globalThis.document = {
      activeElement: null,
      createElement: () => new Element(),
      createElementNS: () => new Element(),
      createTextNode: (text: string) => Object.assign(new Element(), { textContent: text })
    } as unknown as Document
    run()
  } finally { globalThis.document = original }
}
function model(): LiveModel {
  const session = normalizeSession({ id: 1, plannedExercises: [
    { exerciseId: 1, exerciseSlug: 'squat', exerciseName: 'Squat', sets: 1 },
    { exerciseId: 2, exerciseSlug: 'row', exerciseName: 'Row', sets: 2 }
  ], runtime: { exerciseIndex: 0, restNextIndex: 1, restEndsAt: Date.now() + 60000, restDurationSec: 60 } })
  return { session, exercises: session.plannedExercises, intervals: [], unit: 'kg', busy: false,
    openInstructions: new Set(), drafts: new Map(), intervalPage: 0, error: '' }
}
function controls(rest: LiveActions['rest']): LiveActions {
  return { rest, jump() {}, addSet() {}, log() {}, edit() {}, finish() {}, discard() {},
    startEmom() {}, pause() {}, seek() {}, render() {} }
}

test('rest names the next prescribed move and completion instead of an impossible extra set', () => withDom(() => {
  const state = model()
  const render = () => elements(renderRest(state, controls(() => {})) as unknown as Element).map(x => x.textContent)
  assert(render().includes('Row'))
  assert(render().includes('Set 1 of 2'))
  state.session.runtime!.restNextIndex = 0
  state.session.sets = [{ id: 1, sessionId: 1, exerciseId: 1, exerciseSlug: 'squat', exerciseName: 'Squat', setNumber: 1, reps: 8, weight: null, done: true, loggedAt: '' }]
  assert(render().includes('Finish session'))
  assert(!render().includes('Set 2 of 1'))
  state.intervals = [{ index: 0, blockIndex: 0, roundIndex: 0, intervalIndex: 0, startsAt: 0, endsAt: 60, duration: 60, steps: [] }]
  assert(render().includes('EMOM section'))
}))

test('rest adjustment, skip, Escape and keyboard wrapping remain accessible', () => withDom(() => {
  const changes: (number | null)[] = []
  const rest = renderRest(model(), controls(value => changes.push(value))) as unknown as Element
  assert.equal(rest.attributes.role, 'dialog')
  assert.equal(rest.attributes['aria-modal'], 'true')
  const buttons = rest.children.at(-1)!.children
  buttons.forEach(button => button.dispatch('click'))
  assert.deepEqual(changes, [-15, null, 15])
  const press = (key: string, shiftKey = false) => {
    let prevented = false
    rest.dispatch('keydown', { key, shiftKey, preventDefault() { prevented = true } } as KeyboardEvent)
    return prevented
  }
  buttons[2].focus()
  assert(press('Tab'))
  assert.equal(document.activeElement, buttons[0])
  assert(press('Tab', true))
  assert.equal(document.activeElement, buttons[2])
  assert(press('Escape'))
  assert.equal(changes.at(-1), null)
}))
