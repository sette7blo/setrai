export function overviewCard(label: string, value: string): HTMLElement {
  const article = document.createElement('article')
  article.className = 'stat-card'
  const strong = document.createElement('strong')
  strong.textContent = value
  const span = document.createElement('span')
  span.textContent = label
  article.append(strong, span)
  return article
}
