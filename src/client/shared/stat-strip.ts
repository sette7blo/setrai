export interface StatStripCell {
  value: string
  label: string
}

// One bordered strip of figures: a large condensed numeral over a small label per cell.
export function statStrip(cells: StatStripCell[], className = ''): HTMLElement {
  const strip = document.createElement('dl')
  strip.className = className ? `stat-strip ${className}` : 'stat-strip'
  for (const { value, label } of cells) {
    const cell = document.createElement('div')
    cell.className = 'stat-strip-cell'
    const figure = document.createElement('dd')
    figure.textContent = value
    const caption = document.createElement('dt')
    caption.textContent = label
    cell.append(figure, caption)
    strip.append(cell)
  }
  return strip
}
