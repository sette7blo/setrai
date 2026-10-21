export type SummaryShareResult = 'shared' | 'downloaded' | 'cancelled'

export interface SummaryImageContent {
  title: string
  meta: string
  duration: string
  sets: string
  volume: string
  exercises: string
  receipt: string
  muscleMapSvg: string
}

export function summaryImageName(title: string): string {
  const slug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${slug || 'setrai'}-workout.png`
}

export function imageOnlyShareData(file: File): ShareData {
  return { files: [file] }
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  context.beginPath()
  context.roundRect(x, y, width, height, radius)
}

function drawStat(context: CanvasRenderingContext2D, x: number, y: number, value: string, label: string): void {
  roundedRect(context, x, y, 465, 138, 28)
  context.fillStyle = 'rgba(255,255,255,.72)'
  context.fill()
  context.strokeStyle = 'rgba(5,5,5,.12)'
  context.lineWidth = 2
  context.stroke()
  context.fillStyle = '#050505'
  context.font = '800 50px system-ui, sans-serif'
  context.fillText(value, x + 32, y + 62)
  context.fillStyle = '#615d55'
  context.font = '800 22px system-ui, sans-serif'
  context.fillText(label.toUpperCase(), x + 32, y + 108)
}

function imageFromSource(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not load share image asset'))
    image.src = source
  })
}

function styledMuscleMap(markup: string): string {
  const namespaced = markup.includes('xmlns=') ? markup : markup.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
  return namespaced.replace(/(<svg[^>]*>)/, `$1<style>
    .muscle-map__inactive{fill:#d7d2c6;stroke:#f8f5ed;stroke-width:1.5}
    .muscle-map__primary{fill:#050505;stroke:#f8f5ed;stroke-width:1.5}
    .muscle-map__secondary{fill:#9a7131;stroke:#f8f5ed;stroke-width:1.5}
  </style>`)
}

async function drawMuscleMap(context: CanvasRenderingContext2D, markup: string): Promise<void> {
  const url = URL.createObjectURL(new Blob([styledMuscleMap(markup)], { type: 'image/svg+xml' }))
  try {
    const image = await imageFromSource(url)
    const maxWidth = 760
    const maxHeight = 420
    const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight)
    const width = image.naturalWidth * scale
    const height = image.naturalHeight * scale
    context.drawImage(image, (1080 - width) / 2, 682 + (420 - height) / 2, width, height)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function createSummaryImage(content: SummaryImageContent): Promise<File> {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1350
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not create workout image')

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
  } catch { /* The wordmark still identifies the image if the logo cannot load. */ }
  context.fillStyle = '#050505'
  context.font = '800 42px system-ui, sans-serif'
  context.fillText('Setrai', 160, 91)
  context.font = '800 14px ui-monospace, monospace'
  context.letterSpacing = '5px'
  context.fillText('AI TRAINING COACH', 160, 120)
  context.letterSpacing = '0px'

  context.fillStyle = '#5b5750'
  context.font = '800 20px system-ui, sans-serif'
  context.fillText('WORKOUT COMPLETE', 60, 186)
  context.fillStyle = '#050505'
  context.font = '800 68px system-ui, sans-serif'
  context.fillText(content.title, 60, 258, 960)
  context.fillStyle = '#4d4a44'
  context.font = '500 24px system-ui, sans-serif'
  context.fillText(content.meta, 60, 302, 960)

  drawStat(context, 60, 340, content.duration, 'Duration')
  drawStat(context, 555, 340, content.sets, 'Sets')
  drawStat(context, 60, 500, content.volume, 'Volume')
  drawStat(context, 555, 500, content.exercises, 'Exercises')

  roundedRect(context, 60, 660, 960, 470, 34)
  context.fillStyle = 'rgba(255,255,255,.58)'
  context.fill()
  context.strokeStyle = 'rgba(5,5,5,.12)'
  context.lineWidth = 2
  context.stroke()
  await drawMuscleMap(context, content.muscleMapSvg)

  context.strokeStyle = 'rgba(5,5,5,.14)'
  context.beginPath()
  context.moveTo(60, 1164)
  context.lineTo(1020, 1164)
  context.stroke()
  context.fillStyle = '#050505'
  context.font = '800 22px system-ui, sans-serif'
  context.fillText('TRAINING RECEIPT', 60, 1212)
  context.fillStyle = '#4d4a44'
  context.font = '500 28px system-ui, sans-serif'
  context.fillText(content.receipt, 60, 1262, 960)

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Could not create workout image')
  return new File([blob], summaryImageName(content.title), { type: 'image/png' })
}

function downloadImage(file: File): void {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export async function shareSummaryImage(file: File): Promise<SummaryShareResult> {
  const payload = imageOnlyShareData(file)
  const canShareFile = typeof navigator.share === 'function'
    && (typeof navigator.canShare !== 'function' || navigator.canShare(payload))

  if (canShareFile) {
    try {
      await navigator.share(payload)
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
    }
  }

  downloadImage(file)
  return 'downloaded'
}
