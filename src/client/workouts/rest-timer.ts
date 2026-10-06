export interface RestTimerState {
  remainingSec: number
  running: boolean
}

export function createRestTimer(durationSec: number): RestTimerState {
  return {
    remainingSec: Math.max(0, Math.round(durationSec)),
    running: durationSec > 0
  }
}

export function tickRestTimer(state: RestTimerState, elapsedSec = 1): RestTimerState {
  const remainingSec = Math.max(0, state.remainingSec - Math.max(0, elapsedSec))
  return {
    remainingSec,
    running: state.running && remainingSec > 0
  }
}

export function addRestSeconds(state: RestTimerState, deltaSec: number): RestTimerState {
  const remainingSec = Math.max(0, state.remainingSec + deltaSec)
  return {
    remainingSec,
    running: remainingSec > 0 && state.running
  }
}

export function skipRestTimer(): RestTimerState {
  return {
    remainingSec: 0,
    running: false
  }
}

export function formatRestTime(totalSec: number): string {
  const minutes = Math.floor(Math.max(0, totalSec) / 60)
  const seconds = Math.max(0, totalSec) % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function renderRestTimer(
  state: RestTimerState | null,
  onChange: (state: RestTimerState | null) => void
): HTMLElement {
  const panel = document.createElement('section')
  panel.className = state && state.remainingSec > 0 ? 'rest-timer rest-timer--active' : 'rest-timer'
  panel.setAttribute('aria-live', 'polite')

  if (!state || state.remainingSec <= 0) {
    panel.innerHTML = '<span>Rest timer ready after each logged set.</span>'
    return panel
  }

  const label = document.createElement('span')
  label.textContent = 'Rest'
  const time = document.createElement('strong')
  time.textContent = formatRestTime(state.remainingSec)
  const controls = document.createElement('div')
  controls.className = 'rest-timer__controls'

  const minus = document.createElement('button')
  minus.type = 'button'
  minus.textContent = '-15'
  minus.addEventListener('click', () => onChange(addRestSeconds(state, -15)))

  const skip = document.createElement('button')
  skip.type = 'button'
  skip.textContent = 'Skip'
  skip.addEventListener('click', () => onChange(skipRestTimer()))

  const plus = document.createElement('button')
  plus.type = 'button'
  plus.textContent = '+15'
  plus.addEventListener('click', () => onChange(addRestSeconds(state, 15)))

  controls.append(minus, skip, plus)
  panel.append(label, time, controls)
  return panel
}
