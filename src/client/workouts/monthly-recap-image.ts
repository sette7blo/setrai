import type { WeightUnit } from '../profile/types.js'
import { formatVolumeKg } from '../profile/weight-units.js'
import type { MonthlyRecap } from './monthly-recap-data.js'
import { monthlyRecapImageName } from './monthly-recap-data.js'

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

function drawCalendar(context: CanvasRenderingContext2D, recap: MonthlyRecap): void {
  const [year, month] = recap.month.split('-').map(Number)
  const first = new Date(year, month - 1, 1)
  const days = new Date(year, month, 0).getDate()
  const start = first.getDay()
  const x = 96
  const y = 598
  const cell = 126
  const gap = 4
  const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  context.fillStyle = '#615d55'
  context.font = '800 17px ui-monospace, monospace'
  context.textAlign = 'center'
  labels.forEach((label, index) => context.fillText(label, x + index * (cell + gap) + cell / 2, y - 24))

  for (let day = 1; day <= days; day += 1) {
    const position = start + day - 1
    const column = position % 7
    const row = Math.floor(position / 7)
    const cellX = x + column * (cell + gap)
    const cellY = y + row * 78
    const count = recap.dayCounts.get(day) ?? 0
    roundedRect(context, cellX, cellY, cell, 66, 16)
    context.fillStyle = count ? (count > 1 ? '#9a7131' : '#111111') : 'rgba(255,255,255,.52)'
    context.fill()
    context.fillStyle = count ? '#fffaf0' : '#615d55'
    context.font = '750 21px system-ui, sans-serif'
    context.fillText(String(day), cellX + cell / 2, cellY + 40)
    if (count > 1) {
      context.fillStyle = '#fffaf0'
      context.font = '800 11px ui-monospace, monospace'
      context.fillText(`${count}×`, cellX + cell - 20, cellY + 19)
    }
  }
  context.textAlign = 'left'
}

export async function createMonthlyRecapImage(recap: MonthlyRecap, unit: WeightUnit): Promise<File> {
  if (!recap.workoutCount) throw new Error('No completed workouts in this month')
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1350
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not create monthly recap image')

  const gradient = context.createLinearGradient(0, 0, 1080, 1350)
  gradient.addColorStop(0, '#fffaf0')
  gradient.addColorStop(.58, '#f3eee2')
  gradient.addColorStop(1, '#e9e1d2')
  context.fillStyle = gradient
  context.fillRect(0, 0, 1080, 1350)
  try {
    const logo = await imageFromSource('/brand/setrai-logo-mark.jpg')
    context.drawImage(logo, 60, 54, 80, 74)
  } catch { /* Wordmark remains when the image is unavailable. */ }
  context.fillStyle = '#050505'
  context.font = '800 42px system-ui, sans-serif'
  context.fillText('Setrai', 160, 91)
  context.font = '800 14px ui-monospace, monospace'
  context.letterSpacing = '5px'
  context.fillText('AI TRAINING COACH', 160, 120)
  context.letterSpacing = '0px'

  context.fillStyle = '#5b5750'
  context.font = '800 20px system-ui, sans-serif'
  context.fillText('MONTHLY TRAINING RECAP', 60, 186)
  context.fillStyle = '#050505'
  context.font = '800 68px system-ui, sans-serif'
  context.fillText(recap.label, 60, 258, 960)
  context.fillStyle = '#4d4a44'
  context.font = '500 24px system-ui, sans-serif'
  const change = recap.volumeChangePercent === null ? 'First tracked month' : `${recap.volumeChangePercent >= 0 ? '+' : ''}${recap.volumeChangePercent.toFixed(0)}% volume vs previous month`
  context.fillText(change, 60, 302)

  drawStat(context, 60, String(recap.workoutCount), 'Workouts')
  drawStat(context, 305, String(recap.activeDays), 'Active days')
  drawStat(context, 550, formatVolumeKg(recap.totalVolume, unit), 'Total volume')
  drawStat(context, 795, String(recap.activeWeeks), 'Active weeks')

  drawPanel(context, 60, 506, 960, 570, 34)
  context.fillStyle = '#050505'
  context.font = '800 22px ui-monospace, monospace'
  context.fillText('TRAINING CALENDAR', 88, 550)
  drawCalendar(context, recap)

  context.strokeStyle = 'rgba(5,5,5,.14)'
  context.beginPath()
  context.moveTo(60, 1110)
  context.lineTo(1020, 1110)
  context.stroke()
  context.fillStyle = '#050505'
  context.font = '800 22px ui-monospace, monospace'
  context.fillText('MONTHLY RECEIPT', 60, 1160)
  context.fillStyle = '#4d4a44'
  context.font = '500 27px system-ui, sans-serif'
  const best = recap.bestWeek ? `${formatVolumeKg(recap.bestWeek.volume, unit)} best week` : 'No weighted sets'
  context.fillText(`${recap.workoutCount} workouts · ${best}`, 60, 1210, 960)
  context.fillText(`Most trained: ${recap.topMuscle}`, 60, 1254, 960)
  context.fillStyle = '#615d55'
  context.font = '600 18px system-ui, sans-serif'
  context.fillText('Consistency compounds.', 60, 1310)

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Could not create monthly recap image')
  return new File([blob], monthlyRecapImageName(recap.month), { type: 'image/png' })
}
