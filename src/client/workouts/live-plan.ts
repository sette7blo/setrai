import type { Session, ProgramExercise, TrainingStep, LiveRuntime } from './types.js'

export interface IntervalSlot {
  index: number
  blockIndex: number
  roundIndex: number
  intervalIndex: number
  startsAt: number
  endsAt: number
  duration: number
  steps: TrainingStep[]
}

export function compileIntervals(session: Session): IntervalSlot[] {
  const slots: IntervalSlot[] = []
  let elapsed = 0
  for (const [blockIndex, block] of (session.blocks ?? []).entries()) {
    if (block.type !== 'emom') continue
    const intervals = (block.intervals ?? []).filter((interval) => interval.durationSec > 0 && interval.steps.length)
    if (!intervals.length) continue
    const total = block.totalDurationSec || intervals.reduce((sum, interval) => sum + interval.durationSec, 0) * block.rounds
    let time = 0
    let position = 0
    while (time < total && slots.length < 10000) {
      const intervalIndex = position % intervals.length
      const interval = intervals[intervalIndex]
      const duration = Math.min(interval.durationSec, total - time)
      slots.push({ index: slots.length, blockIndex, roundIndex: Math.floor(position / intervals.length), intervalIndex,
        startsAt: elapsed, endsAt: elapsed + duration, duration, steps: interval.steps })
      elapsed += duration
      time += duration
      position++
    }
  }
  return slots
}

export function strengthExercises(session: Session): ProgramExercise[] {
  const timed = new Set((session.blocks ?? []).flatMap((block) => block.type === 'emom' ? (block.intervals ?? []).flatMap((interval) => interval.steps.map((step) => step.exerciseSlug)) : []))
  const straight = new Set((session.blocks ?? []).flatMap((block) => block.type === 'straight' ? (block.steps ?? []).map((step) => step.exerciseSlug) : []))
  return session.plannedExercises.filter((exercise) => !timed.has(exercise.exerciseSlug) || straight.has(exercise.exerciseSlug))
}

export function strengthSets(session: Session, exercise: ProgramExercise) {
  return session.sets.filter((set) => set.exerciseSlug === exercise.exerciseSlug && set.intervalIndex === undefined && set.done)
    .sort((a, b) => a.setNumber - b.setNumber)
}

export function setCount(session: Session, exercise: ProgramExercise): number {
  return Math.max(exercise.sets, session.runtime?.setCounts?.[exercise.exerciseSlug] ?? 0, ...strengthSets(session, exercise).map((set) => set.setNumber))
}

export function nextSet(session: Session, exercise: ProgramExercise): number {
  const done = new Set(strengthSets(session, exercise).map((set) => set.setNumber))
  let number = 1
  while (done.has(number)) number++
  return number
}

export function clockValue(runtime: LiveRuntime, now = Date.now()) {
  const delta = runtime.emomRunningSince == null ? 0 : Math.max(0, (now - runtime.emomRunningSince) / 1000)
  return { position: (runtime.emomPositionSec ?? 0) + delta, active: (runtime.emomActiveSec ?? 0) + delta }
}

export function intervalPhase(slot: IntervalSlot, position: number) {
  const elapsed = Math.max(0, position - slot.startsAt)
  let cursor = 0
  if (slot.steps.every((step) => (step.targetDurationSec ?? 0) > 0)) {
    for (const [index, step] of slot.steps.entries()) {
      cursor += step.targetDurationSec!
      if (elapsed < cursor) return { label: 'Work', stepIndex: index, remaining: Math.ceil(Math.min(cursor - elapsed, slot.endsAt - position)) }
    }
    return { label: 'Recover', stepIndex: null, remaining: Math.ceil(slot.endsAt - position) }
  }
  return { label: 'Interval', stepIndex: null, remaining: Math.ceil(slot.endsAt - position) }
}

export function phaseEndsAt(slot: IntervalSlot, position: number): number {
  if (slot.steps.every(step => (step.targetDurationSec ?? 0) > 0)) {
    let end = slot.startsAt
    for (const step of slot.steps) {
      end += step.targetDurationSec!
      if (position < end) return Math.min(end, slot.endsAt)
    }
  }
  return slot.endsAt
}

export function supersetNext(session: Session, exercise: ProgramExercise, number: number) {
  for (const [blockIndex, block] of (session.blocks ?? []).entries()) {
    if (block.type !== 'straight' || (block.steps?.length ?? 0) < 2) continue
    const stepIndex = block.steps!.findIndex((step) => step.exerciseSlug === exercise.exerciseSlug)
    if (stepIndex < 0) continue
    const last = stepIndex === block.steps!.length - 1
    const slug = last && number >= block.rounds ? null : block.steps![last ? 0 : stepIndex + 1].exerciseSlug
    return { blockIndex, stepIndex, roundIndex: number - 1, slug, rest: last ? block.restAfterRoundSec ?? 0 : 0 }
  }
  return null
}

export function timeLabel(seconds: number): string {
  const value = Math.max(0, Math.floor(seconds))
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
}
