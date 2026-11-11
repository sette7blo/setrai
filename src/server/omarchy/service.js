import { buildSnapshot, writeSnapshotFile } from './snapshot.js'

const DEBOUNCE_MS = 500

export function createOmarchyService(config, services, options = {}) {
  const getNow = options.now ?? (() => new Date())
  const debounceMs = options.debounceMs ?? DEBOUNCE_MS
  const log = options.log ?? console

  let intervalTimer = null
  let debounceTimer = null
  let lastError = ''

  function writeNow() {
    if (!config.snapshotEnabled) return false

    try {
      writeSnapshotFile(
        config.snapshotPath,
        buildSnapshot(services, getNow())
      )
      lastError = ''
      return true
    } catch (error) {
      // A broken snapshot path must never take the training app down.
      // Repeats of the same failure are logged once.
      if (error.message !== lastError) {
        lastError = error.message
        log.warn(`Omarchy snapshot write failed: ${error.message}`)
      }

      return false
    }
  }

  function requestWrite() {
    if (!config.snapshotEnabled || debounceTimer) return

    debounceTimer = setTimeout(() => {
      debounceTimer = null
      writeNow()
    }, debounceMs)
    debounceTimer.unref()
  }

  function start() {
    if (!config.snapshotEnabled || intervalTimer) return

    writeNow()
    intervalTimer = setInterval(writeNow, config.snapshotIntervalMs)
    intervalTimer.unref()
  }

  function getSnapshot() {
    return buildSnapshot(services, getNow())
  }

  function stop() {
    clearInterval(intervalTimer)
    clearTimeout(debounceTimer)
    intervalTimer = null
    debounceTimer = null
  }

  return {
    start,
    stop,
    writeNow,
    requestWrite,
    getSnapshot
  }
}
