import type { Profile, WeightUnit } from '../profile/types.js'
import type { BodyWeightEntry } from '../profile/body-weight/types.js'
import { displayWeightFromKg, formatBodyWeightFromKg } from '../profile/weight-units.js'
import { oldestFirst } from '../profile/body-weight/format.js'
import {
  SHARE_INNER, SHARE_MARGIN, createShareSheet, drawShareCard, drawShareFooter, drawShareHeader, drawShareSectionTitle,
  drawShareStats, drawText, shareFont, shareSheetFile, type ShareSheet,
} from '../shared/share-canvas.js'

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

function goalProgress(entries: BodyWeightEntry[], targetWeightKg: number): { percent: number, remainingKg: number } {
  const first = entries[0].weightKg
  const latest = entries.at(-1)?.weightKg ?? first
  const needed = targetWeightKg - first
  const percent = needed === 0 ? 100 : Math.min(100, Math.max(0, ((latest - first) / needed) * 100))
  return { percent, remainingKg: targetWeightKg - latest }
}

function drawChart(
  sheet: ShareSheet,
  entries: BodyWeightEntry[],
  unit: WeightUnit,
  includeWeights: boolean,
  targetWeightKg: number | null | undefined,
): void {
  const { context, palette } = sheet
  const x = SHARE_MARGIN + 96
  const y = 610
  const width = SHARE_INNER - 140
  const height = 330
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

  for (let index = 0; index <= 4; index += 1) {
    const lineY = y + (height * index / 4)
    context.fillStyle = palette.border
    context.fillRect(x, lineY - 1, width, 2)
    if (includeWeights) drawText(sheet, (max - (range * index / 4)).toFixed(0), x - 16, lineY + 7, { font: shareFont(400, 20), color: palette.muted, align: 'right' })
  }

  // The one accent on this image: the goal line.
  if (target !== null) {
    const targetY = y + (1 - (target - min) / range) * height
    context.setLineDash([12, 10])
    context.strokeStyle = palette.accent
    context.lineWidth = 3
    context.beginPath()
    context.moveTo(x, targetY)
    context.lineTo(x + width, targetY)
    context.stroke()
    context.setLineDash([])
  }

  context.beginPath()
  context.moveTo(points[0].x, y + height)
  points.forEach(point => context.lineTo(point.x, point.y))
  context.lineTo(points.at(-1)?.x ?? x, y + height)
  context.closePath()
  context.globalAlpha = .07
  context.fillStyle = palette.text
  context.fill()
  context.globalAlpha = 1

  context.beginPath()
  points.forEach((point, index) => index === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y))
  context.strokeStyle = palette.text
  context.lineWidth = 6
  context.lineJoin = 'round'
  context.lineCap = 'round'
  context.stroke()
  points.forEach(point => {
    context.beginPath()
    context.arc(point.x, point.y, 8, 0, Math.PI * 2)
    context.fillStyle = palette.surface
    context.fill()
    context.strokeStyle = palette.text
    context.lineWidth = 5
    context.stroke()
  })

  drawText(sheet, shortDate(entries[0].date), x, y + height + 44, { font: shareFont(400, 21), color: palette.muted })
  drawText(sheet, shortDate(entries.at(-1)?.date ?? entries[0].date), x + width, y + height + 44, { font: shareFont(400, 21), color: palette.muted, align: 'right' })
}

function drawBmi(sheet: ShareSheet, bmi: number, y: number): void {
  const { context, palette } = sheet
  drawShareCard(sheet, SHARE_MARGIN, y, SHARE_INNER, 120, 26)
  const label = bmi < 18.5 ? 'underweight' : bmi < 25 ? 'normal' : bmi < 30 ? 'overweight' : 'obese'
  drawShareSectionTitle(sheet, 'BMI estimate', SHARE_MARGIN + 32, y + 46)
  drawText(sheet, `${bmi.toFixed(1)}, ${label}`, SHARE_MARGIN + SHARE_INNER - 32, y + 46, { font: shareFont(700, 30, true), color: palette.text, align: 'right' })
  const barX = SHARE_MARGIN + 32
  const barY = y + 72
  const barWidth = SHARE_INNER - 64
  const zones = [
    { width: .14, color: palette.surfaceStrong },
    { width: .26, color: palette.readySoft },
    { width: .20, color: palette.moderateSoft },
    { width: .40, color: palette.recoveringSoft },
  ]
  let offset = barX
  zones.forEach(zone => {
    context.fillStyle = zone.color
    context.fillRect(offset, barY, barWidth * zone.width - 2, 22)
    offset += barWidth * zone.width
  })
  const marker = barX + Math.max(0, Math.min(1, (bmi - 15) / 25)) * barWidth
  context.fillStyle = palette.text
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
  const withGoal = Boolean(options.includeGoal && profile.targetWeightKg)

  const sheet = await createShareSheet()
  await drawShareHeader(sheet, 'Body progress', 'Weight trend', `${shortDate(first.date)} – ${shortDate(latest.date)} · ${selected.length} check-ins · ${rangeLabels[options.range]}`)
  drawShareStats(sheet, 356, [
    options.includeWeights
      ? { value: formatBodyWeightFromKg(latest.weightKg, unit), label: 'Current' }
      : { value: String(selected.length), label: 'Check-ins' },
    options.includeWeights
      ? { value: formatBodyWeightFromKg(average, unit), label: '7-entry avg' }
      : { value: rangeLabels[options.range], label: 'Range' },
    { value: options.includeWeights ? `${change > 0 ? '+' : ''}${change.toFixed(1)} ${unit}` : change > 0 ? 'Up' : change < 0 ? 'Down' : 'Stable', label: 'Change' },
    withGoal
      ? (options.includeWeights
          ? { value: formatBodyWeightFromKg(profile.targetWeightKg!, unit), label: 'Goal' }
          : { value: `${goalProgress(allEntries, profile.targetWeightKg!).percent.toFixed(0)}%`, label: 'Goal progress' })
      : { value: String(selected.length), label: 'Check-ins' },
  ])

  drawShareCard(sheet, SHARE_MARGIN, 520, SHARE_INNER, 500)
  drawShareSectionTitle(sheet, 'Weight trend', SHARE_MARGIN + 36, 572)
  drawChart(sheet, selected, unit, options.includeWeights, options.includeGoal ? profile.targetWeightKg : null)

  if (options.includeBmi && bmi !== null) drawBmi(sheet, bmi, 1044)
  const lines: string[] = []
  if (withGoal) {
    const progress = goalProgress(allEntries, profile.targetWeightKg!)
    const remaining = displayWeightFromKg(progress.remainingKg, unit)
    lines.push(options.includeWeights
      ? `Goal: ${progress.percent.toFixed(0)}% · ${Math.abs(remaining).toFixed(1)} ${unit} ${remaining >= 0 ? 'to gain' : 'to lose'}`
      : `Goal: ${progress.percent.toFixed(0)}% of the way`)
  }
  drawShareFooter(sheet, 1192, lines, 'Progress, not perfection.')
  return shareSheetFile(sheet, bodyShareImageName())
}
