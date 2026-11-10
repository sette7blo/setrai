import { shareImage } from '../shared/image-share.js'
import {
  SHARE_INNER, SHARE_MARGIN, createShareSheet, drawShareCard, drawShareFooter, drawShareHeader, drawShareStats,
  loadShareImage, shareMuscleMapStyle, shareSheetFile, type ShareSheet, type ShareStat,
} from '../shared/share-canvas.js'

export { imageOnlyShareData } from '../shared/image-share.js'
export type { ImageShareResult as SummaryShareResult } from '../shared/image-share.js'

export interface SummaryImageContent {
  title: string
  meta: string
  /** Only the figures that have a value; the image omits the rest, like the summary screen. */
  stats: ShareStat[]
  receipt: string
  muscleMapSvg: string
}

export function summaryImageName(title: string): string {
  const slug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${slug || 'setrai'}-workout.png`
}

async function drawMuscleMap(sheet: ShareSheet, markup: string, top: number, height: number): Promise<void> {
  const namespaced = markup.includes('xmlns=') ? markup : markup.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
  const styled = namespaced.replace(/(<svg[^>]*>)/, `$1${shareMuscleMapStyle(sheet.palette)}`)
  const url = URL.createObjectURL(new Blob([styled], { type: 'image/svg+xml' }))
  try {
    const image = await loadShareImage(url)
    const scale = Math.min((SHARE_INNER - 160) / image.naturalWidth, (height - 80) / image.naturalHeight)
    const width = image.naturalWidth * scale
    const drawn = image.naturalHeight * scale
    sheet.context.drawImage(image, SHARE_MARGIN + (SHARE_INNER - width) / 2, top + (height - drawn) / 2, width, drawn)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function createSummaryImage(content: SummaryImageContent): Promise<File> {
  const sheet = await createShareSheet()
  await drawShareHeader(sheet, 'Workout complete', content.title, content.meta)
  drawShareStats(sheet, 356, content.stats)
  drawShareCard(sheet, SHARE_MARGIN, 520, SHARE_INNER, 580)
  await drawMuscleMap(sheet, content.muscleMapSvg, 520, 580)
  drawShareFooter(sheet, 1140, [content.receipt])
  return shareSheetFile(sheet, summaryImageName(content.title))
}

export function shareSummaryImage(file: File) {
  return shareImage(file)
}
