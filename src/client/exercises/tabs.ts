export function exerciseTabsMarkup(active: 'library' | 'discover', enabled: boolean): string {
  const library = `<a class="exercise-tab${active === 'library' ? ' exercise-tab--active' : ''}" href="/exercises"${active === 'library' ? ' aria-current="page"' : ''}>Library</a>`
  const discover = enabled
    ? `<a class="exercise-tab${active === 'discover' ? ' exercise-tab--active' : ''}" href="/exercises/discover"${active === 'discover' ? ' aria-current="page"' : ''}>Discover</a>`
    : '<span class="exercise-tab" aria-disabled="true">Discover</span>'
  return `<nav class="exercise-tabs" aria-label="Exercise sections">${library}${discover}</nav>`
}
