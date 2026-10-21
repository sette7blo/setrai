import type { WeightUnit } from '../profile/types.js'
import { formatVolumeKg } from '../profile/weight-units.js'
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

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  context.beginPath()
  context.roundRect(x, y, width, height, radius)
}

function drawPanel(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius = 28): void {
  roundedRect(context, x, y, width, height, radius)
  context.fillStyle = 'rgba(255,255,255,.7)'
  context.fill()
  context.strokeStyle = 'rgba(5,5,5,.12)'
  context.lineWidth = 2
  context.stroke()
}

function drawStat(context: CanvasRenderingContext2D, x: number, value: string, label: string): void {
  drawPanel(context, x, 340, 225, 132, 24)
  context.fillStyle = '#050505'
  context.font = '800 38px system-ui, sans-serif'
  context.fillText(value, x + 24, 398, 180)
  context.fillStyle = '#615d55'
  context.font = '800 16px ui-monospace, monospace'
  context.fillText(label.toUpperCase(), x + 24, 441, 180)
}

function imageFromSource(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not load share image asset'))
    image.src = source
  })
}

function drawVolumeChart(context: CanvasRenderingContext2D, points: WeeklyVolumePoint[], unit: WeightUnit, best: WeeklyVolumePoint): void {
  const shown = points.slice(-12)
  const chartX = 120
  const chartY = 588
  const chartWidth = 840
  const chartHeight = 362
  const max = Math.max(1, ...shown.map(point => point.volume))

  context.textAlign = 'right'
  context.font = '700 17px ui-monospace, monospace'
  for (let index = 0; index <= 4; index += 1) {
    const y = chartY + chartHeight * index / 4
    context.strokeStyle = 'rgba(5,5,5,.12)'
    context.lineWidth = 2
    context.beginPath()
    context.moveTo(chartX, y)
    context.lineTo(chartX + chartWidth, y)
    context.stroke()
    context.fillStyle = '#706b62'
    context.fillText(compactVolume(max * (1 - index / 4), unit), chartX - 14, y + 6)
  }
  context.textAlign = 'left'

  const gap = shown.length > 8 ? 12 : 20
  const available = chartWidth - gap * Math.max(0, shown.length - 1)
  const barWidth = Math.min(74, available / shown.length)
  const usedWidth = shown.length * barWidth + (shown.length - 1) * gap
  const startX = chartX + (chartWidth - usedWidth) / 2
  shown.forEach((point, index) => {
    const height = Math.max(5, point.volume / max * chartHeight)
    const x = startX + index * (barWidth + gap)
    const y = chartY + chartHeight - height
    roundedRect(context, x, y, barWidth, height, Math.min(12, barWidth / 3))
    context.fillStyle = point.weekStart === best.weekStart ? '#9a7131' : '#111111'
    context.fill()
    context.save()
    context.translate(x + barWidth / 2, chartY + chartHeight + 22)
    context.rotate(-Math.PI / 4)
    context.fillStyle = '#615d55'
    context.font = '700 15px ui-monospace, monospace'
    context.textAlign = 'right'
    context.fillText(weekLabel(point.weekStart), 0, 0)
    context.restore()
  })
  context.textAlign = 'left'
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

  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1350
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not create weekly-volume image')

  const gradient = context.createLinearGradient(0, 0, 1080, 1350)
  gradient.addColorStop(0, '#fffaf0')
  gradient.addColorStop(.58, '#f3eee2')
  gradient.addColorStop(1, '#e9e1d2')
  context.fillStyle = gradient
  context.fillRect(0, 0, 1080, 1350)
  context.fillStyle = 'rgba(154,113,49,.08)'
  context.beginPath()
  context.ellipse(910, 1260, 420, 190, -.15, 0, Math.PI * 2)
  context.fill()

  try {
    const logo = await imageFromSource('/brand/setrai-logo-mark.jpg')
    context.drawImage(logo, 60, 54, 80, 74)
  } catch { /* The wordmark keeps the export branded if the logo asset fails. */ }
  context.fillStyle = '#050505'
  context.font = '800 42px system-ui, sans-serif'
  context.fillText('Setrai', 160, 91)
  context.font = '800 14px ui-monospace, monospace'
  context.letterSpacing = '5px'
  context.fillText('AI TRAINING COACH', 160, 120)
  context.letterSpacing = '0px'

  context.fillStyle = '#5b5750'
  context.font = '800 20px system-ui, sans-serif'
  context.fillText('TRAINING PROGRESS', 60, 186)
  context.fillStyle = '#050505'
  context.font = '800 68px system-ui, sans-serif'
  context.fillText('Weekly volume', 60, 258)
  context.fillStyle = '#4d4a44'
  context.font = '500 24px system-ui, sans-serif'
  const chartNote = report.points.length > shown ? ` · latest ${shown} shown` : ''
  context.fillText(`${weekLabel(first.weekStart)} – ${weekLabel(latest.weekStart)} · ${rangeLabels[range]}${chartNote}`, 60, 302, 960)

  drawStat(context, 60, compactVolume(report.totalVolume, unit), 'Range volume')
  drawStat(context, 305, compactVolume(report.averageVolume, unit), 'Avg / active week')
  drawStat(context, 550, compactVolume(report.best.volume, unit), 'Best week')
  drawStat(context, 795, String(report.points.length), 'Active weeks')

  drawPanel(context, 60, 506, 960, 560, 34)
  context.fillStyle = '#050505'
  context.font = '800 22px ui-monospace, monospace'
  context.fillText('WEEKLY VOLUME', 88, 550)
  drawVolumeChart(context, report.points, unit, report.best)

  context.strokeStyle = 'rgba(5,5,5,.14)'
  context.beginPath()
  context.moveTo(60, 1110)
  context.lineTo(1020, 1110)
  context.stroke()
  context.fillStyle = '#050505'
  context.font = '800 22px ui-monospace, monospace'
  context.fillText('TRAINING RECEIPT', 60, 1160)
  context.fillStyle = '#4d4a44'
  context.font = '500 28px system-ui, sans-serif'
  context.fillText(`${report.points.length} active weeks · ${formatVolumeKg(report.totalVolume, unit)} total`, 60, 1210, 960)
  context.fillText(`Peak ${weekLabel(report.best.weekStart)} · ${formatVolumeKg(report.best.volume, unit)}`, 60, 1254, 960)
  context.fillStyle = '#615d55'
  context.font = '600 18px system-ui, sans-serif'
  context.fillText('Consistency compounds.', 60, 1310)

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Could not create weekly-volume image')
  return new File([blob], volumeShareImageName(), { type: 'image/png' })
}
