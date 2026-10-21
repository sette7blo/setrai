import { Share2, X } from 'lucide'

import { iconElement } from '../app/navigation.js'
import type { WeightUnit } from '../profile/types.js'
import { shareImage } from '../shared/image-share.js'
import { weeklyVolumeForRange, type TrainingRange } from './format.js'
import type { WeeklyVolumePoint } from './types.js'
import { createVolumeProgressImage } from './volume-share-image.js'

const ranges: Array<{ value: TrainingRange, label: string }> = [
  { value: '4w', label: '4W' },
  { value: '3m', label: '3M' },
  { value: '1y', label: '1Y' },
  { value: 'all', label: 'All' },
]

export function createVolumeShareExperience(
  points: WeeklyVolumePoint[],
  unit: WeightUnit,
  initialRange: TrainingRange,
): { button: HTMLButtonElement, dialog: HTMLDialogElement } {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'button quiet small body-share-open volume-share-open'
  button.append(iconElement(Share2), Object.assign(document.createElement('span'), { textContent: 'Share report' }))

  const dialog = document.createElement('dialog')
  dialog.className = 'body-share-sheet volume-share-sheet'
  dialog.setAttribute('aria-labelledby', 'volume-share-title')
  dialog.innerHTML = `<div class="body-share-sheet__surface"><header><div><small>TRAINING PROGRESS</small><h2 id="volume-share-title">Share weekly volume</h2></div><button type="button" class="body-share-close" aria-label="Close"></button></header><div class="body-share-preview" aria-live="polite"><span>Preparing preview…</span></div><fieldset class="body-share-range"><legend>Date range</legend><div></div></fieldset><p class="body-share-status" aria-live="polite"></p><button type="button" class="button button--primary body-share-submit"></button></div>`
  dialog.querySelector('.body-share-close')?.append(iconElement(X))
  dialog.querySelector('.body-share-submit')?.append(iconElement(Share2), Object.assign(document.createElement('span'), { textContent: 'Share image' }))

  const rangeRow = dialog.querySelector('.body-share-range div') as HTMLElement
  const preview = dialog.querySelector('.body-share-preview') as HTMLElement
  const status = dialog.querySelector('.body-share-status') as HTMLElement
  const submit = dialog.querySelector('.body-share-submit') as HTMLButtonElement
  let activeRange = initialRange
  let previewUrl = ''
  let cachedFile: File | null = null
  let renderVersion = 0

  const renderPreview = async (): Promise<void> => {
    const version = ++renderVersion
    cachedFile = null
    submit.disabled = true
    preview.innerHTML = '<span>Preparing preview…</span>'
    status.textContent = ''
    try {
      const selected = weeklyVolumeForRange(points, activeRange)
      const file = await createVolumeProgressImage(selected, unit, activeRange)
      if (version !== renderVersion) return
      cachedFile = file
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      previewUrl = URL.createObjectURL(file)
      const image = document.createElement('img')
      image.src = previewUrl
      image.alt = 'Preview of the Weekly volume share image'
      preview.replaceChildren(image)
      submit.disabled = false
    } catch (error) {
      if (version !== renderVersion) return
      preview.innerHTML = '<span>No logged volume in this range.</span>'
      status.textContent = error instanceof Error ? error.message : 'Could not prepare image.'
    }
  }

  ranges.forEach(({ value, label }) => {
    const choice = document.createElement('button')
    choice.type = 'button'
    choice.textContent = label
    choice.dataset.range = value
    choice.setAttribute('aria-pressed', String(value === activeRange))
    choice.addEventListener('click', () => {
      activeRange = value
      rangeRow.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String((item as HTMLElement).dataset.range === value)))
      void renderPreview()
    })
    rangeRow.append(choice)
  })

  button.addEventListener('click', () => {
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')
    void renderPreview()
  })
  dialog.querySelector('.body-share-close')?.addEventListener('click', () => dialog.close())
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close()
  })
  dialog.addEventListener('close', () => {
    status.textContent = ''
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    previewUrl = ''
  })
  submit.addEventListener('click', async () => {
    if (!cachedFile) return
    submit.disabled = true
    status.textContent = 'Opening share sheet…'
    const result = await shareImage(cachedFile)
    status.textContent = result === 'shared' ? 'Image shared.' : result === 'downloaded' ? 'Image saved. Attach it to your post on X.' : ''
    submit.disabled = false
  })

  return { button, dialog }
}
