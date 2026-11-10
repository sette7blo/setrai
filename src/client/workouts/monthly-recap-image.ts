import type { WeightUnit } from '../profile/types.js'
import { formatVolumeKg } from '../profile/weight-units.js'
import {
  SHARE_INNER, SHARE_MARGIN, createShareSheet, drawShareCard, drawShareFooter, drawShareHeader, drawShareSectionTitle,
  drawShareStats, drawText, shareFont, shareSheetFile, type ShareSheet,
} from '../shared/share-canvas.js'
import type { MonthlyRecap } from './monthly-recap-data.js'
import { monthlyRecapImageName } from './monthly-recap-data.js'

// A month grid: days with a workout are filled, and a day with several shows its count.
function drawCalendar(sheet: ShareSheet, recap: MonthlyRecap, top: number): void {
  const { context, palette } = sheet
  const [year, month] = recap.month.split('-').map(Number)
  const days = new Date(year, month, 0).getDate()
  const start = new Date(year, month - 1, 1).getDay()
  const gap = 6
  const cell = (SHARE_INNER - 72 - gap * 6) / 7
  const left = SHARE_MARGIN + 36
  ;['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach((label, index) => {
    drawText(sheet, label, left + index * (cell + gap) + cell / 2, top - 22, { font: shareFont(400, 20), color: palette.muted, align: 'center' })
  })
  for (let day = 1; day <= days; day += 1) {
    const position = start + day - 1
    const x = left + (position % 7) * (cell + gap)
    const y = top + Math.floor(position / 7) * 76
    const count = recap.dayCounts.get(day) ?? 0
    context.beginPath()
    context.roundRect(x, y, cell, 66, 16)
    context.fillStyle = count ? palette.text : palette.surfaceStrong
    context.fill()
    drawText(sheet, String(day), x + cell / 2, y + 42, {
      font: shareFont(count ? 700 : 400, 24), color: count ? palette.onPrimary : palette.muted, align: 'center',
    })
    if (count > 1) drawText(sheet, `${count}×`, x + cell - 12, y + 22, { font: shareFont(600, 15), color: palette.onPrimary, align: 'right' })
  }
}

export async function createMonthlyRecapImage(recap: MonthlyRecap, unit: WeightUnit): Promise<File> {
  if (!recap.workoutCount) throw new Error('No completed workouts in this month')
  const sheet = await createShareSheet()
  const change = recap.volumeChangePercent === null
    ? 'First tracked month'
    : `${recap.volumeChangePercent >= 0 ? '+' : ''}${recap.volumeChangePercent.toFixed(0)}% volume vs previous month`
  await drawShareHeader(sheet, 'Monthly training recap', recap.label, change)
  drawShareStats(sheet, 356, [
    { value: String(recap.workoutCount), label: recap.workoutCount === 1 ? 'Workout' : 'Workouts' },
    { value: String(recap.activeDays), label: 'Active days' },
    { value: formatVolumeKg(recap.totalVolume, unit), label: 'Total volume' },
    { value: String(recap.activeWeeks), label: 'Active weeks' },
  ])
  drawShareCard(sheet, SHARE_MARGIN, 520, SHARE_INNER, 590)
  drawShareSectionTitle(sheet, 'Training calendar', SHARE_MARGIN + 36, 572)
  drawCalendar(sheet, recap, 636)
  const best = recap.bestWeek ? `${formatVolumeKg(recap.bestWeek.volume, unit)} best week` : 'No weighted sets'
  drawShareFooter(sheet, 1146, [`${best} · most trained: ${recap.topMuscle}`], 'Consistency compounds.')
  return shareSheetFile(sheet, monthlyRecapImageName(recap.month))
}
