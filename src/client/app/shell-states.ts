export function errorState(message: string): string {
  return `
    <section class="state-panel page-state page-state--error state-panel--error" role="alert">
      <h1>Setrai could not load</h1>
      <p>${message}</p>
      <button class="button button--primary" data-retry>Try again</button>
    </section>
  `
}
