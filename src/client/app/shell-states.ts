const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}

// The message comes from the server and can echo request data, so it is
// escaped before it becomes markup.
export function errorState(message: string): string {
  const safeMessage = message.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character])
  return `
    <section class="state-panel page-state page-state--error state-panel--error" role="alert">
      <h1>Setrai could not load</h1>
      <p>${safeMessage}</p>
      <button class="button button--primary" data-retry>Try again</button>
    </section>
  `
}
