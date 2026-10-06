export function loadingState(): string {
  return `
    <section class="state-panel" aria-live="polite">
      <div class="pulse-mark"></div>
      <p class="eyebrow">Loading Setrai</p>
      <h1>Preparing your training shell</h1>
      <p>Connecting to the self-hosted Setrai server.</p>
    </section>
  `
}

export function errorState(message: string): string {
  return `
    <section class="state-panel state-panel--error" role="alert">
      <p class="eyebrow">Connection issue</p>
      <h1>Unable to load Setrai</h1>
      <p>${message}</p>
      <button class="button button--primary" data-retry>Try again</button>
    </section>
  `
}
