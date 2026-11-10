// One Progress section: a white card with a title and an optional muted note on the right.
export function statsCard(title: string, note = '', modifier = ''): { card: HTMLElement, head: HTMLElement } {
  const card = document.createElement('section')
  card.className = modifier ? `stats-card ${modifier}` : 'stats-card'
  const head = document.createElement('div')
  head.className = 'stats-card-head'
  head.append(Object.assign(document.createElement('h2'), { textContent: title }))
  if (note) head.append(Object.assign(document.createElement('small'), { textContent: note }))
  card.append(head)
  return { card, head }
}

// Moves the note under the title, for heads that also carry a control on the right.
export function stackCardNote(head: HTMLElement): void {
  const title = document.createElement('div')
  title.className = 'stats-card-title'
  title.append(...head.querySelectorAll(':scope > h2, :scope > small'))
  head.prepend(title)
}
