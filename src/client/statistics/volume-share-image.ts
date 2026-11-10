import type { WeightUnit } from '../profile/types.js'
import { formatVolumeKg } from '../profile/weight-units.js'
import {
  SHARE_INNER, SHARE_MARGIN, createShareSheet, drawShareCard, drawShareFooter, drawShareHeader, drawShareSectionTitle,
  drawShareStats, drawText, shareFont, shareSheetFile, type ShareSheet,
} from '../shared/share-canvas.js'
import type { WeeklyVolumePoint } from './types.js'
import type { TrainingRange } from './format.js'

export interface VolumeShareReport {
  points: WeeklyVolumePoint[]
  totalVolume: number
  averageVolume: number
  best: WeeklyVolumePoint
}

const rangeLabels: Record<TrainingRange, string> = {
  '4w': '4 weeks',
  '3m': '3 months',
  '1y': '1 year',
  all: 'All time',
}

export function volumeShareImageName(): string {
  return 'setrai-weekly-volume.png'
}

export function volumeShareReport(points: WeeklyVolumePoint[]): VolumeShareReport | null {
  const sorted = [...points].sort((a, b) => a.weekStart.localeCompare(b.weekStart))
  if (sorted.length === 0) return null
  const totalVolume = sorted.reduce((sum, point) => sum + point.volume, 0)
  const best = sorted.reduce((peak, point) => point.volume > peak.volume ? point : peak)
  return { points: sorted, totalVolume, averageVolume: totalVolume / sorted.length, best }
}

function weekLabel(value: string): string {
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('en', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function displayVolume(volumeKg: number, unit: WeightUnit): number {
  return unit === 'lb' ? volumeKg * 2.2046226218 : volumeKg
}

function compactVolume(volumeKg: number, unit: WeightUnit): string {
  const value = displayVolume(volumeKg, unit)
  return `${new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value)} ${unit}`
}

function drawVolumeChart(sheet: ShareSheet, points: WeeklyVolumePoint[], unit: WeightUnit, best: WeeklyVolumePoint): void {
  const { context, palette } = sheet
  const shown = points.slice(-12)
  const chartX = SHARE_MARGIN + 120
  const chartY = 620
  const chartWidth = SHARE_INNER - 160
  const chartHeight = 340
  const max = Math.max(1, ...shown.map(point => point.volume))

  for (let index = 0; index <= 4; index += 1) {
    const y = chartY + chartHeight * index / 4
    context.fillStyle = palette.border
    context.fillRect(chartX, y - 1, chartWidth, 2)
    drawText(sheet, compactVolume(max * (1 - index / 4), unit), chartX - 16, y + 7, { font: shareFont(400, 19), color: palette.muted, align: 'right' })
  }

  const gap = shown.length > 8 ? 12 : 20
  const barWidth = Math.min(74, (chartWidth - gap * Math.max(0, shown.length - 1)) / shown.length)
  const startX = chartX + (chartWidth - (shown.length * barWidth + (shown.length - 1) * gap)) / 2
  shown.forEach((point, index) => {
    const height = Math.max(5, point.volume / max * chartHeight)
    const x = startX + index * (barWidth + gap)
    context.beginPath()
    context.roundRect(x, chartY + chartHeight - height, barWidth, height, Math.min(12, barWidth / 3))
    // The one accent on this image: the best week.
    context.fillStyle = point.weekStart === best.weekStart ? palette.accent : palette.text
    context.fill()
    context.save()
    context.translate(x + barWidth / 2, chartY + chartHeight + 24)
    context.rotate(-Math.PI / 4)
    drawText(sheet, weekLabel(point.weekStart), 0, 0, { font: shareFont(400, 18), color: palette.muted, align: 'right' })
    context.restore()
  })
}

export async function createVolumeProgressImage(
  points: WeeklyVolumePoint[],
  unit: WeightUnit,
  range: TrainingRange,
): Promise<File> {
  const report = volumeShareReport(points)
  if (!report) throw new Error('No logged volume in this range')
  const first = report.points[0]
  const latest = report.points.at(-1) as WeeklyVolumePoint
  const shown = Math.min(12, report.points.length)

  const sheet = await createShareSheet()
  const chartNote = report.points.length > shown ? ` · latest ${shown} shown` : ''
  await drawShareHeader(sheet, 'Training progress', 'Weekly volume', `${weekLabel(first.weekStart)} – ${weekLabel(latest.weekStart)} · ${rangeLabels[range]}${chartNote}`)
  drawShareStats(sheet, 356, [
    { value: compactVolume(report.totalVolume, unit), label: 'Range volume' },
    { value: compactVolume(report.averageVolume, unit), label: 'Avg / active week' },
    { value: compactVolume(report.best.volume, unit), label: 'Best week' },
    { value: String(report.points.length), label: 'Active weeks' },
  ])
  drawShareCard(sheet, SHARE_MARGIN, 520, SHARE_INNER, 590)
  drawShareSectionTitle(sheet, 'Weekly volume', SHARE_MARGIN + 36, 572)
  drawVolumeChart(sheet, report.points, unit, report.best)
  drawShareFooter(sheet, 1146, [
    `${report.points.length} active weeks · ${formatVolumeKg(report.totalVolume, unit)} total`,
    `Peak ${weekLabel(report.best.weekStart)} · ${formatVolumeKg(report.best.volume, unit)}`,
  ], 'Consistency compounds.')
  return shareSheetFile(sheet, volumeShareImageName())
}
