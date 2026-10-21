import type { Profile, WeightUnit } from '../profile/types.js'
import type { BodyWeightEntry } from '../profile/body-weight/types.js'
import { displayWeightFromKg, formatBodyWeightFromKg } from '../profile/weight-units.js'
import { oldestFirst } from '../profile/body-weight/format.js'

export type BodyShareRange = '4w' | '3m' | '1y' | 'all'

export interface BodyShareOptions {
  range: BodyShareRange
  includeWeights: boolean
  includeBmi: boolean
  includeGoal: boolean
}

const rangeLabels: Record<BodyShareRange, string> = {
  '4w': '4 weeks',
  '3m': '3 months',
  '1y': '1 year',
  all: 'All time',
}

function dateValue(date: string): Date {
  return new Date(`${date}T00:00:00`)
}

export function filterBodyShareEntries(entries: BodyWeightEntry[], range: BodyShareRange): BodyWeightEntry[] {
  const sorted = oldestFirst(entries)
  if (range === 'all' || sorted.length === 0) return sorted
  const latest = dateValue(sorted.at(-1)?.date ?? '')
  const cutoff = new Date(latest)
  if (range === '4w') cutoff.setDate(cutoff.getDate() - 27)
  if (range === '3m') cutoff.setMonth(cutoff.getMonth() - 3)
  if (range === '1y') cutoff.setFullYear(cutoff.getFullYear() - 1)
  return sorted.filter(entry => dateValue(entry.date) >= cutoff)
}

export function bodyShareImageName(): string {
  return 'setrai-body-progress.png'
}

function shortDate(date: string): string {
  return dateValue(date).toLocaleDateString('en', { month: 'short', day: 'numeric' })
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

function drawStat(context: CanvasRenderingContext2D, x: number, y: number, value: string, label: string): void {
  drawPanel(context, x, y, 225, 132, 24)
  context.fillStyle = '#050505'
  context.font = '800 38px system-ui, sans-serif'
  context.fillText(value, x + 24, y + 58, 180)
  context.fillStyle = '#615d55'
  context.font = '800 17px ui-monospace, monospace'
  context.fillText(label.toUpperCase(), x + 24, y + 101, 180)
}

function imageFromSource(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not load share image asset'))
    image.src = source
  })
}

function goalProgress(entries: BodyWeightEntry[], targetWeightKg: number): { percent: number, remainingKg: number } {
  const first = entries[0].weightKg
  const latest = entries.at(-1)?.weightKg ?? first
  const needed = targetWeightKg - first
  const percent = needed === 0 ? 100 : Math.min(100, Math.max(0, ((latest - first) / needed) * 100))
  return { percent, remainingKg: targetWeightKg - latest }
}

function drawChart(
  context: CanvasRenderingContext2D,
  entries: BodyWeightEntry[],
  unit: WeightUnit,
  includeWeights: boolean,
  targetWeightKg: number | null | undefined,
): void {
  const x = 96
  const y = 564
  const width = 888
  const height = 390
  const values = entries.map(entry => displayWeightFromKg(entry.weightKg, unit))
  const target = targetWeightKg ? displayWeightFromKg(targetWeightKg, unit) : null
  const domain = target === null ? values : [...values, target]
  const minValue = Math.min(...domain)
  const maxValue = Math.max(...domain)
  const padding = Math.max((maxValue - minValue) * .12, unit === 'lb' ? 1 : .5)
  const min = minValue - padding
  const max = maxValue + padding
  const range = max - min || 1
  const points = values.map((value, index) => ({
    x: x + (index / Math.max(1, values.length - 1)) * width,
    y: y + (1 - (value - min) / range) * height,
  }))

  context.font = '700 18px ui-monospace, monospace'
  context.textAlign = 'right'
  for (let index = 0; index <= 4; index += 1) {
    const lineY = y + (height * index / 4)
    context.strokeStyle = 'rgba(5,5,5,.12)'
    context.lineWidth = 2
    context.beginPath()
    context.moveTo(x, lineY)
    context.lineTo(x + width, lineY)
    context.stroke()
    if (includeWeights) {
      const value = max - (range * index / 4)
      context.fillStyle = '#706b62'
      context.fillText(value.toFixed(0), x - 16, lineY + 6)
    }
  }
  context.textAlign = 'left'

  if (target !== null) {
    const targetY = y + (1 - (target - min) / range) * height
    context.setLineDash([12, 10])
    context.strokeStyle = '#9a7131'
    context.lineWidth = 3
    context.beginPath()
    context.moveTo(x, targetY)
    context.lineTo(x + width, targetY)
    context.stroke()
    context.setLineDash([])
  }

  const area = context.createLinearGradient(0, y, 0, y + height)
  area.addColorStop(0, 'rgba(5,5,5,.18)')
  area.addColorStop(1, 'rgba(5,5,5,0)')
  context.beginPath()
  context.moveTo(points[0].x, y + height)
  points.forEach((point, index) => index === 0 ? context.lineTo(point.x, point.y) : context.lineTo(point.x, point.y))
  context.lineTo(points.at(-1)?.x ?? x, y + height)
  context.closePath()
  context.fillStyle = area
  context.fill()

  context.beginPath()
  points.forEach((point, index) => index === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y))
  context.strokeStyle = '#050505'
  context.lineWidth = 7
  context.lineJoin = 'round'
  context.lineCap = 'round'
  context.stroke()
  points.forEach(point => {
    context.beginPath()
    context.arc(point.x, point.y, 9, 0, Math.PI * 2)
    context.fillStyle = '#f3eee2'
    context.fill()
    context.strokeStyle = '#050505'
    context.lineWidth = 5
    context.stroke()
  })

  context.fillStyle = '#615d55'
  context.font = '700 20px ui-monospace, monospace'
  context.fillText(shortDate(entries[0].date), x, y + height + 42)
  context.textAlign = 'right'
  context.fillText(shortDate(entries.at(-1)?.date ?? entries[0].date), x + width, y + height + 42)
  context.textAlign = 'left'
}

function drawBmi(context: CanvasRenderingContext2D, bmi: number): void {
  const x = 60
  const y = 1050
  const width = 960
  drawPanel(context, x, y, width, 116, 26)
  context.fillStyle = '#050505'
  context.font = '800 22px ui-monospace, monospace'
  context.fillText('BMI ESTIMATE', x + 28, y + 42)
  const label = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese'
  context.textAlign = 'right'
  context.font = '800 30px system-ui, sans-serif'
  context.fillText(`${bmi.toFixed(1)} · ${label}`, x + width - 28, y + 43)
  context.textAlign = 'left'
  const barX = x + 28
  const barY = y + 68
  const barWidth = width - 56
  const zones = [
    { width: .14, color: '#d6d4cc' },
    { width: .26, color: '#f4f3ee' },
    { width: .20, color: '#c4c1b8' },
    { width: .40, color: '#8f8c84' },
  ]
  let offset = barX
  zones.forEach(zone => {
    context.fillStyle = zone.color
    context.fillRect(offset, barY, barWidth * zone.width, 22)
    offset += barWidth * zone.width
  })
  const marker = barX + Math.max(0, Math.min(1, (bmi - 15) / 25)) * barWidth
  context.fillStyle = '#050505'
  context.fillRect(marker - 3, barY - 6, 6, 34)
}

export async function createBodyProgressImage(
  entries: BodyWeightEntry[],
  profile: Profile,
  options: BodyShareOptions,
): Promise<File> {
  const selected = filterBodyShareEntries(entries, options.range)
  if (selected.length < 2) throw new Error('At least two entries are needed to share a trend')
  const allEntries = oldestFirst(entries)
  const unit = profile.weightUnit
  const latest = selected.at(-1) as BodyWeightEntry
  const first = selected[0]
  const last7 = selected.slice(-7)
  const average = last7.reduce((sum, entry) => sum + entry.weightKg, 0) / last7.length
  const change = displayWeightFromKg(latest.weightKg - first.weightKg, unit)
  const bmi = profile.heightCm ? latest.weightKg / ((profile.heightCm / 100) ** 2) : null

  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1350
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not create body-progress image')
  const gradient = context.createLinearGradient(0, 0, 1080, 1350)
  gradient.addColorStop(0, '#fffaf0')
  gradient.addColorStop(.58, '#f3eee2')
  gradient.addColorStop(1, '#e9e1d2')
  context.fillStyle = gradient
  context.fillRect(0, 0, 1080, 1350)

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
  context.fillText('BODY PROGRESS', 60, 186)
  context.fillStyle = '#050505'
  context.font = '800 68px system-ui, sans-serif'
  context.fillText('Weight trend', 60, 258)
  context.fillStyle = '#4d4a44'
  context.font = '500 24px system-ui, sans-serif'
  context.fillText(`${shortDate(first.date)} – ${shortDate(latest.date)} · ${selected.length} check-ins · ${rangeLabels[options.range]}`, 60, 302, 960)

  const current = options.includeWeights ? formatBodyWeightFromKg(latest.weightKg, unit) : `${selected.length}`
  const currentLabel = options.includeWeights ? 'Current' : 'Check-ins'
  const averageText = options.includeWeights ? formatBodyWeightFromKg(average, unit) : rangeLabels[options.range]
  const averageLabel = options.includeWeights ? '7-entry avg' : 'Range'
  const changeText = options.includeWeights ? `${change > 0 ? '+' : ''}${change.toFixed(1)} ${unit}` : `${change > 0 ? 'Up' : change < 0 ? 'Down' : 'Stable'}`
  const goal = options.includeGoal && profile.targetWeightKg
    ? (options.includeWeights ? formatBodyWeightFromKg(profile.targetWeightKg, unit) : `${goalProgress(allEntries, profile.targetWeightKg).percent.toFixed(0)}%`)
    : `${selected.length}`
  const goalLabel = options.includeGoal && profile.targetWeightKg ? (options.includeWeights ? 'Goal' : 'Goal progress') : 'Check-ins'
  drawStat(context, 60, 340, current, currentLabel)
  drawStat(context, 305, 340, averageText, averageLabel)
  drawStat(context, 550, 340, changeText, 'Change')
  drawStat(context, 795, 340, goal, goalLabel)

  drawPanel(context, 60, 506, 960, 500, 34)
  context.fillStyle = '#050505'
  context.font = '800 22px ui-monospace, monospace'
  context.fillText('WEIGHT TREND', 88, 550)
  drawChart(context, selected, unit, options.includeWeights, options.includeGoal ? profile.targetWeightKg : null)

  if (options.includeBmi && bmi !== null) drawBmi(context, bmi)
  if (options.includeGoal && profile.targetWeightKg) {
    const progress = goalProgress(allEntries, profile.targetWeightKg)
    context.fillStyle = '#050505'
    context.font = '800 22px ui-monospace, monospace'
    context.fillText('GOAL PROGRESS', 60, 1214)
    context.fillStyle = '#4d4a44'
    context.font = '500 27px system-ui, sans-serif'
    const remaining = displayWeightFromKg(progress.remainingKg, unit)
    const detail = options.includeWeights
      ? `${progress.percent.toFixed(0)}% · ${Math.abs(remaining).toFixed(1)} ${unit} ${remaining >= 0 ? 'to gain' : 'to lose'}`
      : `${progress.percent.toFixed(0)}% toward goal`
    context.fillText(detail, 60, 1260)
  }
  context.fillStyle = '#615d55'
  context.font = '600 18px system-ui, sans-serif'
  context.fillText('Progress, not perfection.', 60, 1310)

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Could not create body-progress image')
  return new File([blob], bodyShareImageName(), { type: 'image/png' })
}
