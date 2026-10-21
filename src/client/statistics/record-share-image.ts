import type { WeightUnit } from '../profile/types.js'
import { formatWeightFromKg } from '../profile/weight-units.js'
import type { PersonalRecord } from './types.js'

export function recordShareImageName(record: PersonalRecord): string {
  const slug = record.exerciseSlug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `setrai-${slug || 'personal'}-record.png`
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  context.beginPath()
  context.roundRect(x, y, width, height, radius)
}

function imageFromSource(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not load share image asset'))
    image.src = source
  })
}

function recordDate(value?: string): string {
  if (!value) return 'All-time best'
  const normalized = value.includes('T') || value.endsWith('Z') ? value : `${value.replace(' ', 'T')}Z`
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? 'All-time best' : date.toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })
}

export async function createRecordShareImage(record: PersonalRecord, unit: WeightUnit): Promise<File> {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1350
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not create personal-record image')

  const gradient = context.createLinearGradient(0, 0, 1080, 1350)
  gradient.addColorStop(0, '#fffaf0')
  gradient.addColorStop(.58, '#f3eee2')
  gradient.addColorStop(1, '#e9e1d2')
  context.fillStyle = gradient
  context.fillRect(0, 0, 1080, 1350)
  context.fillStyle = 'rgba(154,113,49,.11)'
  context.beginPath()
  context.ellipse(850, 760, 520, 420, -.25, 0, Math.PI * 2)
  context.fill()

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
  context.fillText('PERSONAL RECORD', 60, 210)
  context.fillStyle = '#050505'
  context.font = '800 72px system-ui, sans-serif'
  context.fillText(record.exerciseName, 60, 304, 960)
  context.fillStyle = '#4d4a44'
  context.font = '500 25px system-ui, sans-serif'
  context.fillText(recordDate(record.achievedAt), 60, 354)

  roundedRect(context, 60, 410, 960, 390, 44)
  context.fillStyle = 'rgba(255,255,255,.72)'
  context.fill()
  context.strokeStyle = 'rgba(5,5,5,.12)'
  context.lineWidth = 2
  context.stroke()
  context.fillStyle = '#615d55'
  context.font = '800 20px ui-monospace, monospace'
  context.fillText('RECORD SET', 108, 478)
  context.fillStyle = '#050505'
  context.font = '850 94px system-ui, sans-serif'
  const recordWeight = record.recordWeight ?? record.maxWeight
  const recordReps = record.recordReps
  const setText = recordReps ? `${formatWeightFromKg(recordWeight, unit)} × ${recordReps}` : formatWeightFromKg(recordWeight, unit)
  context.fillText(setText, 108, 600, 864)
  context.fillStyle = '#4d4a44'
  context.font = '650 30px system-ui, sans-serif'
  context.fillText(`${formatWeightFromKg(record.estimated1RM, unit)} estimated 1RM`, 108, 672)
  context.fillStyle = '#9a7131'
  context.font = '800 28px system-ui, sans-serif'
  const improvement = record.improvement && record.improvement > 0
    ? `+${formatWeightFromKg(record.improvement, unit)} from previous best`
    : 'First recorded best'
  context.fillText(improvement, 108, 730)

  roundedRect(context, 60, 850, 465, 180, 30)
  context.fillStyle = 'rgba(255,255,255,.6)'
  context.fill()
  context.fillStyle = '#050505'
  context.font = '800 48px system-ui, sans-serif'
  context.fillText(formatWeightFromKg(record.maxWeight, unit), 92, 928, 400)
  context.fillStyle = '#615d55'
  context.font = '800 18px ui-monospace, monospace'
  context.fillText('HEAVIEST SET', 92, 982)

  roundedRect(context, 555, 850, 465, 180, 30)
  context.fillStyle = 'rgba(255,255,255,.6)'
  context.fill()
  context.fillStyle = '#050505'
  context.font = '800 48px system-ui, sans-serif'
  context.fillText(formatWeightFromKg(record.estimated1RM, unit), 587, 928, 400)
  context.fillStyle = '#615d55'
  context.font = '800 18px ui-monospace, monospace'
  context.fillText('ESTIMATED 1RM', 587, 982)

  context.strokeStyle = 'rgba(5,5,5,.14)'
  context.beginPath()
  context.moveTo(60, 1110)
  context.lineTo(1020, 1110)
  context.stroke()
  context.fillStyle = '#050505'
  context.font = '800 22px ui-monospace, monospace'
  context.fillText('TRAINING RECEIPT', 60, 1162)
  context.fillStyle = '#4d4a44'
  context.font = '500 29px system-ui, sans-serif'
  context.fillText(`${record.exerciseName} · new all-time best`, 60, 1215, 960)
  context.fillStyle = '#615d55'
  context.font = '600 20px system-ui, sans-serif'
  context.fillText('Earned one set at a time.', 60, 1308)

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Could not create personal-record image')
  return new File([blob], recordShareImageName(record), { type: 'image/png' })
}
