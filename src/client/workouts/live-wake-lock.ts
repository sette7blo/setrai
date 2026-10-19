import NoSleep from 'nosleep.js'

interface NoSleepController {
  readonly isEnabled: boolean
  enable(): Promise<unknown>
  disable(): void
}

const NoSleepClass = NoSleep as unknown as new () => NoSleepController

export interface LiveWakeLock {
  enable(): Promise<void>
  disable(): void
}

export function createLiveWakeLock(
  createController: () => NoSleepController = () => new NoSleepClass()
): LiveWakeLock {
  const controller = createController()
  let disposed = false
  let pending: Promise<void> | null = null

  return {
    enable() {
      if (disposed || document.hidden || controller.isEnabled) return Promise.resolve()
      if (pending) return pending
      pending = controller.enable()
        .then(() => undefined)
        .catch(() => undefined)
        .finally(() => { pending = null })
      return pending
    },
    disable() {
      if (disposed) return
      disposed = true
      controller.disable()
    }
  }
}
