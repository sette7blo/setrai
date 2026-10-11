import { readableApiError } from '../shared/api/errors.js'
import { getExercise } from '../exercises/api.js'
import { getProfile } from '../profile/api.js'
import { getSession, saveLiveState, logSessionSet, finishSession, discardSession } from './api.js'
import { editLoggedSet } from './live-edit.js'
import { renderSessionSummary } from './session-summary.js'
import { renderLiveShell, updateLiveClocks } from './live-shell.js'
import { clockValue, compileIntervals, intervalPhase, phaseEndsAt, nextSet, setCount, strengthExercises, supersetNext } from './live-plan.js'
import { createCountdownAudio } from './live-audio.js'
import type { LiveModel, LiveActions } from './live-model.js'
import type { LiveRuntime, Program, ProgramExercise, Session } from './types.js'

function summaryProgram(session: Session): Program {
  return { id: session.programId ?? 0, slug: '', name: session.programName, description: '', difficulty: '', tags: [],
    isTemporary: false, exercises: session.plannedExercises, blocks: session.blocks }
}

export async function renderSessionPage(root: HTMLElement, id: number): Promise<void> {
  root.textContent = 'Loading session…'
  try {
    const [session, profile] = await Promise.all([getSession(id), getProfile().catch(() => ({ weightUnit: 'kg' as const }))])
    session.plannedExercises = await Promise.all(session.plannedExercises.map(async (entry) => {
      if (entry.exercise) return entry
      try { return { ...entry, exercise: await getExercise(entry.exerciseId) } } catch { return entry }
    }))
    if (session.finishedAt) { root.replaceChildren(renderSessionSummary(session, summaryProgram(session))); return }
    const exercises = strengthExercises(session)
    const intervals = compileIntervals(session)
    session.runtime ??= {}
    session.runtime.mode ??= exercises.length ? 'strength' : 'emom'
    session.runtime.exerciseIndex = Math.min(Math.max(0, session.runtime.exerciseIndex ?? exercises.findIndex((exercise) => nextSet(session, exercise) <= setCount(session, exercise))), Math.max(0, exercises.length - 1))
    const model: LiveModel = { session, exercises, intervals, unit: profile.weightUnit, busy: false, openInstructions: new Set(), drafts: new Map(), intervalPage: 0, error: '' }
    model.intervalPage = Math.floor((intervals.find((slot) => slot.endsAt > clockValue(session.runtime!).position)?.index ?? 0) / 5)
    runSession(root, model)
  } catch (error) {
    root.textContent = readableApiError(error)
    const back = document.createElement('a')
    back.href = '/workouts'
    back.textContent = 'Back to Workouts'
    root.append(back)
  }
}

function runSession(root: HTMLElement, model: LiveModel): void {
  let timer = 0
  let phaseKey = ''
  let disposed = false
  let writes: Promise<unknown> = Promise.resolve()
  let wakeLock: { release(): Promise<void> } | null = null
  const audio = createCountdownAudio()
  const runtime = () => model.session.runtime!
  const report = (error: unknown) => { model.error = readableApiError(error); render() }
  function persist(patch: LiveRuntime): Promise<unknown> {
    Object.assign(runtime(), patch)
    writes = writes.catch(() => undefined).then(() => saveLiveState(model.session.id, patch))
    return writes
  }
  async function wake() {
    try {
      const navigatorWithWake = navigator as Navigator & { wakeLock?: { request(type: string): Promise<{ release(): Promise<void> }> } }
      wakeLock = await navigatorWithWake.wakeLock?.request('screen') ?? null
      if (disposed) await wakeLock?.release()
    } catch { /* Training remains available when screen wake locks are unavailable. */ }
  }
  function unlockAudio() { void audio.unlock().then(() => syncAudio()) }
  function syncAudio(now = Date.now()) {
    if (document.hidden || disposed) { audio.sync(null); return }
    if (runtime().restEndsAt && runtime().restEndsAt! > now) {
      audio.sync({ key: 'rest', endsAt: runtime().restEndsAt! }, now)
      return
    }
    const clock = clockValue(runtime(), now)
    const slot = model.intervals.find(item => item.endsAt > clock.position)
    if (runtime().mode !== 'emom' || runtime().emomRunningSince == null || !slot) { audio.sync(null); return }
    const end = phaseEndsAt(slot, clock.position)
    audio.sync({ key: `emom:${slot.index}:${end}`, endsAt: runtime().emomRunningSince! + (end - (runtime().emomPositionSec ?? 0)) * 1000 }, now)
  }
  function cleanup() {
    if (disposed) return
    disposed = true
    window.clearInterval(timer)
    document.removeEventListener('visibilitychange', visible)
    window.removeEventListener('pagehide', cleanup)
    root.removeEventListener('pointerdown', unlockAudio)
    void wakeLock?.release()
    audio.close()
  }
  function visible() { syncAudio(); if (!document.hidden) { void wake(); tick() } }
  function render() {
    if (disposed) return
    const scroll = root.querySelector('.live-body')?.scrollTop ?? 0
    const wasResting = root.querySelector('.live-rest') !== null
    root.replaceChildren(renderLiveShell(model, controls))
    const restAction = root.querySelector<HTMLButtonElement>('.live-rest-actions button:nth-child(2)')
    restAction?.focus({ preventScroll: true })
    if (wasResting && !restAction) root.querySelector<HTMLButtonElement>('.live-footer .live-primary')?.focus({ preventScroll: true })
    root.querySelector<HTMLElement>('.live-rail [aria-current]')?.scrollIntoView({ block: 'nearest', inline: 'center' })
    const body = root.querySelector('.live-body')
    if (body) body.scrollTop = scroll
    updateLiveClocks(root, model)
    phaseKey = currentPhaseKey()
    syncAudio()
  }
  function currentPhaseKey(now = Date.now()) {
    const value = clockValue(runtime(), now).position
    const slot = model.intervals.find((item) => item.endsAt > value)
    return `${slot?.index ?? 'complete'}:${slot ? intervalPhase(slot, value).stepIndex : ''}`
  }
  function clearRest() {
    const next = runtime().restNextIndex
    void persist({ restEndsAt: null, restNextIndex: null, ...(next != null ? { exerciseIndex: next } : {}) }).catch(report)
    render()
  }
  function tick() {
    if (!root.isConnected) { cleanup(); return }
    const now = Date.now()
    if (runtime().restEndsAt) {
      const remaining = Math.ceil((runtime().restEndsAt! - now) / 1000)
      if (remaining <= 0) clearRest()
    }
    if (runtime().mode === 'emom' && runtime().emomRunningSince != null) {
      const clock = clockValue(runtime(), now)
      const total = model.intervals.at(-1)?.endsAt ?? 0
      if (clock.position >= total) {
        const excess = Math.max(0, clock.position - total)
        void persist({ emomPositionSec: total, emomActiveSec: Math.max(0, clock.active - excess), emomRunningSince: null }).catch(report)
        render()
      } else {
        const slot = model.intervals.find((item) => item.endsAt > clock.position)!
        if (currentPhaseKey(now) !== phaseKey) { model.intervalPage = Math.floor(slot.index / 5); render() }
      }
    }
    const displayNow = Date.now()
    syncAudio(displayNow)
    updateLiveClocks(root, model, displayNow)
  }
  async function mutate(work: () => Promise<void>) {
    if (model.busy) return
    model.busy = true
    model.error = ''
    render()
    try { await work() } catch (error) { model.error = readableApiError(error) }
    finally { model.busy = false; render() }
  }
  const controls: LiveActions = {
    render,
    jump(index) {
      void persist({ exerciseIndex: index, restEndsAt: null, restNextIndex: null }).catch(report)
      render()
      root.querySelector('.live-body')?.scrollTo(0, 0)
    },
    addSet(exercise) {
      const counts = { ...runtime().setCounts, [exercise.exerciseSlug]: setCount(model.session, exercise) + 1 }
      void persist({ setCounts: counts }).catch(report)
      render()
    },
    log(input, exercise) {
      void mutate(async () => {
        await writes
        const set = await logSessionSet(model.session.id, input)
        if (!model.session.sets.some((entry) => entry.id === set.id)) model.session.sets.push(set)
        if (!exercise) return
        const transition = supersetNext(model.session, exercise, input.setNumber)
        const index = runtime().exerciseIndex ?? 0
        const next = transition?.slug ? model.exercises.findIndex((entry) => entry.exerciseSlug === transition.slug)
          : nextSet(model.session, exercise) > setCount(model.session, exercise) ? Math.min(index + 1, model.exercises.length - 1) : index
        const rest = transition ? transition.rest : exercise.restSec
        await persist(rest > 0 ? { restEndsAt: Date.now() + rest * 1000, restDurationSec: rest, restNextIndex: next }
          : { exerciseIndex: Math.max(0, next) })
      })
    },
    edit(id) {
      editLoggedSet(model, id, render)
    },
    finish() {
      void mutate(async () => {
        const clock = clockValue(runtime())
        await persist({ emomPositionSec: clock.position, emomActiveSec: clock.active, emomRunningSince: null, restEndsAt: null })
        const finished = await finishSession(model.session.id, model.session.notes)
        cleanup()
        root.replaceChildren(renderSessionSummary(finished, summaryProgram(model.session)))
      })
    },
    discard() {
      if (!window.confirm('Discard this session and its logged sets?')) return
      void mutate(async () => { await writes; await discardSession(model.session.id); cleanup(); window.location.assign('/workouts') })
    },
    startEmom() {
      const now = Date.now()
      void persist({ mode: 'emom', emomStartedAt: runtime().emomStartedAt ?? now, emomRunningSince: now, restEndsAt: null }).catch(report)
      render()
    },
    pause() {
      const clock = clockValue(runtime())
      void persist({ emomPositionSec: clock.position, emomActiveSec: clock.active, emomRunningSince: runtime().emomRunningSince == null ? Date.now() : null }).catch(report)
      render()
    },
    seek(index) {
      const clock = clockValue(runtime())
      void persist({ emomPositionSec: model.intervals[index].startsAt, emomActiveSec: clock.active,
        emomRunningSince: runtime().emomRunningSince == null ? null : Date.now() }).catch(report)
      render()
    },
    rest(delta) {
      if (delta === null) { clearRest(); return }
      const end = Math.max(Date.now() + 5000, (runtime().restEndsAt ?? Date.now()) + delta * 1000)
      void persist({ restEndsAt: end, restDurationSec: Math.max(runtime().restDurationSec ?? 0, (end - Date.now()) / 1000) }).catch(report)
      updateLiveClocks(root, model)
      syncAudio()
    }
  }
  render()
  tick()
  timer = window.setInterval(tick, 100)
  root.addEventListener('pointerdown', unlockAudio)
  window.addEventListener('pagehide', cleanup)
  document.addEventListener('visibilitychange', visible)
  void wake()
}
