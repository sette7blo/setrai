// Shared drawing kit for the images people share from Setrai. Every image is the same 1080x1350
// sheet: chalk ground, white cards, iron text, heavy condensed numerals. Colours are read once from
// the light design tokens, so the images match the app and stay light when the app is dark.

export const SHARE_WIDTH = 1080
export const SHARE_HEIGHT = 1350
export const SHARE_MARGIN = 60
export const SHARE_INNER = SHARE_WIDTH - SHARE_MARGIN * 2

const TOKENS = {
  ground: '--color-bg',
  surface: '--color-surface',
  surfaceStrong: '--color-surface-strong',
  border: '--color-border',
  borderStrong: '--color-border-strong',
  text: '--color-text',
  muted: '--color-muted',
  mutedStrong: '--color-muted-strong',
  onPrimary: '--color-on-primary',
  accent: '--color-brand',
  readySoft: '--status-ready-soft',
  moderateSoft: '--status-moderate-soft',
  recoveringSoft: '--status-recovering-soft',
} as const

export type SharePalette = Record<keyof typeof TOKENS, string>

export interface ShareSheet {
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D
  palette: SharePalette
}

export interface ShareStat {
  value: string
  label: string
}

let cachedPalette: SharePalette | null = null

// `.theme-light` pins the light token values on a throwaway element, whatever theme the app is in.
export function sharePalette(): SharePalette {
  if (cachedPalette) return cachedPalette
  const probe = document.createElement('div')
  probe.className = 'theme-light'
  probe.hidden = true
  document.body.append(probe)
  const style = getComputedStyle(probe)
  const palette = Object.fromEntries(
    Object.entries(TOKENS).map(([name, token]) => [name, style.getPropertyValue(token).trim()])
  ) as SharePalette
  probe.remove()
  cachedPalette = palette
  return palette
}

// Canvas text uses the app typeface; `condensed` selects the narrow width used for titles and numerals.
export function shareFont(weight: number, size: number, condensed = false): string {
  return `${weight} ${condensed ? 'condensed ' : ''}${size}px Archivo, sans-serif`
}

// A canvas falls back silently when a face is not loaded yet, so load every style the sheets draw first.
async function fontsReady(): Promise<void> {
  if (!document.fonts) return
  const sample = 'Setrai 0123456789'
  await Promise.all([shareFont(400, 24), shareFont(600, 24), shareFont(700, 24, true), shareFont(800, 64, true)]
    .map(font => document.fonts.load(font, sample).catch(() => [])))
  await document.fonts.ready
}

export async function createShareSheet(): Promise<ShareSheet> {
  await fontsReady()
  const canvas = document.createElement('canvas')
  canvas.width = SHARE_WIDTH
  canvas.height = SHARE_HEIGHT
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not create the image')
  const palette = sharePalette()
  context.fillStyle = palette.ground
  context.fillRect(0, 0, SHARE_WIDTH, SHARE_HEIGHT)
  context.textBaseline = 'alphabetic'
  return { canvas, context, palette }
}

export function loadShareImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not load share image asset'))
    image.src = source
  })
}

// Shortens text with an ellipsis instead of squeezing it to fit.
export function fitText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (context.measureText(text).width <= maxWidth) return text
  let cut = text
  while (cut.length > 1 && context.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1)
  return `${cut.trimEnd()}…`
}

export function drawText(
  sheet: ShareSheet,
  text: string,
  x: number,
  y: number,
  options: { font: string, color: string, maxWidth?: number, align?: CanvasTextAlign },
): void {
  const { context } = sheet
  context.font = options.font
  context.fillStyle = options.color
  context.textAlign = options.align ?? 'left'
  context.fillText(options.maxWidth ? fitText(context, text, options.maxWidth) : text, x, y)
  context.textAlign = 'left'
}

// Brand row, then what the image is, its title in the page-title style, and one quieter line.
export async function drawShareHeader(sheet: ShareSheet, kind: string, title: string, meta: string): Promise<void> {
  const { context, palette } = sheet
  try {
    const mark = await loadShareImage('/brand/setrai-mark.png')
    const height = 46
    context.drawImage(mark, SHARE_MARGIN, 58, height * mark.naturalWidth / mark.naturalHeight, height)
  } catch { /* The wordmark still identifies the image if the mark cannot load. */ }
  drawText(sheet, 'Setrai', SHARE_MARGIN + 66, 97, { font: shareFont(800, 44, true), color: palette.text })
  drawText(sheet, kind, SHARE_MARGIN, 196, { font: shareFont(600, 24), color: palette.muted })
  drawText(sheet, title, SHARE_MARGIN, 272, { font: shareFont(800, 76, true), color: palette.text, maxWidth: SHARE_INNER })
  if (meta) drawText(sheet, meta, SHARE_MARGIN, 316, { font: shareFont(400, 26), color: palette.mutedStrong, maxWidth: SHARE_INNER })
}

export function drawShareCard(sheet: ShareSheet, x: number, y: number, width: number, height: number, radius = 32): void {
  const { context, palette } = sheet
  context.beginPath()
  context.roundRect(x, y, width, height, radius)
  context.fillStyle = palette.surface
  context.fill()
  context.strokeStyle = palette.border
  context.lineWidth = 2
  context.stroke()
}

// One bordered strip of figures, the same component the app uses: a condensed numeral over a label.
export function drawShareStats(sheet: ShareSheet, y: number, stats: ShareStat[], height = 132): void {
  if (!stats.length) return
  const { context, palette } = sheet
  drawShareCard(sheet, SHARE_MARGIN, y, SHARE_INNER, height)
  const cell = SHARE_INNER / stats.length
  stats.forEach((stat, index) => {
    const x = SHARE_MARGIN + cell * index
    if (index > 0) {
      context.fillStyle = palette.border
      context.fillRect(x - 1, y, 2, height)
    }
    drawText(sheet, stat.value, x + 26, y + 64, { font: shareFont(700, 48, true), color: palette.text, maxWidth: cell - 44 })
    drawText(sheet, stat.label, x + 26, y + 102, { font: shareFont(400, 21), color: palette.muted, maxWidth: cell - 44 })
  })
}

export function drawShareSectionTitle(sheet: ShareSheet, text: string, x: number, y: number): void {
  drawText(sheet, text, x, y, { font: shareFont(700, 30, true), color: sheet.palette.text })
}

// Closing lines under a hairline: up to two facts, then a quiet sign-off at the bottom edge.
export function drawShareFooter(sheet: ShareSheet, y: number, lines: string[], signOff = ''): void {
  const { context, palette } = sheet
  context.fillStyle = palette.border
  context.fillRect(SHARE_MARGIN, y, SHARE_INNER, 2)
  lines.filter(Boolean).forEach((line, index) => {
    drawText(sheet, line, SHARE_MARGIN, y + 56 + index * 44, { font: shareFont(400, 28), color: palette.mutedStrong, maxWidth: SHARE_INNER })
  })
  if (signOff) drawText(sheet, signOff, SHARE_MARGIN, SHARE_HEIGHT - 44, { font: shareFont(400, 21), color: palette.muted })
}

// Target scheme for the body diagram, as inline rules because an SVG drawn to a canvas cannot see page CSS.
export function shareMuscleMapStyle(palette: SharePalette): string {
  return `<style>
    polygon{fill:${palette.border};stroke:${palette.surface};stroke-width:1.2}
    .muscle-map__primary{fill:${palette.text}}
    .muscle-map__secondary{fill:${palette.borderStrong}}
  </style>`
}

export async function shareSheetFile(sheet: ShareSheet, name: string): Promise<File> {
  const blob = await new Promise<Blob | null>(resolve => sheet.canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Could not create the image')
  return new File([blob], name, { type: 'image/png' })
}
