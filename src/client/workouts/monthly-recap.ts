import { CalendarDays, Share2, X } from 'lucide'

import { iconElement } from '../app/navigation.js'
import type { WeightUnit } from '../profile/types.js'
import { formatVolumeKg } from '../profile/weight-units.js'
import { shareImage } from '../shared/image-share.js'
import type { MonthlyRecap } from './monthly-recap-data.js'
import { createMonthlyRecapImage } from './monthly-recap-image.js'

function shareExperience(recap: MonthlyRecap, unit: WeightUnit): { button: HTMLButtonElement, dialog: HTMLDialogElement } {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'button quiet monthly-recap-share'
  button.append(iconElement(Share2), Object.assign(document.createElement('span'), { textContent: 'Share' }))

  const dialog = document.createElement('dialog')
  dialog.className = 'body-share-sheet monthly-recap-sheet'
  dialog.setAttribute('aria-labelledby', 'monthly-recap-share-title')
  dialog.innerHTML = `<div class="body-share-sheet__surface"><header><div><small>MONTHLY TRAINING RECAP</small><h2 id="monthly-recap-share-title">Share ${recap.label}</h2></div><button type="button" class="body-share-close" aria-label="Close"></button></header><div class="body-share-preview" aria-live="polite"><span>Preparing preview…</span></div><p class="body-share-status" aria-live="polite"></p><button type="button" class="button button--primary body-share-submit"></button></div>`
  dialog.querySelector('.body-share-close')?.append(iconElement(X))
  dialog.querySelector('.body-share-submit')?.append(iconElement(Share2), Object.assign(document.createElement('span'), { textContent: 'Share image' }))
  const preview = dialog.querySelector('.body-share-preview') as HTMLElement
  const status = dialog.querySelector('.body-share-status') as HTMLElement
  const submit = dialog.querySelector('.body-share-submit') as HTMLButtonElement
  let previewUrl = ''
  let cachedFile: File | null = null

  const renderPreview = async (): Promise<void> => {
    cachedFile = null
    submit.disabled = true
    preview.innerHTML = '<span>Preparing preview…</span>'
    try {
      const file = await createMonthlyRecapImage(recap, unit)
      cachedFile = file
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      previewUrl = URL.createObjectURL(file)
      const image = document.createElement('img')
      image.src = previewUrl
      image.alt = `Preview of ${recap.label} training recap`
      preview.replaceChildren(image)
      submit.disabled = false
    } catch (error) {
      preview.innerHTML = '<span>Could not prepare this recap.</span>'
      status.textContent = error instanceof Error ? error.message : 'Could not prepare image.'
    }
  }

  button.addEventListener('click', () => {
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')
    void renderPreview()
  })
  dialog.querySelector('.body-share-close')?.addEventListener('click', () => dialog.close())
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close() })
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

export function monthlyRecapCard(recap: MonthlyRecap, unit: WeightUnit): HTMLElement {
  const card = document.createElement('section')
  card.className = 'monthly-recap-card'
  const head = document.createElement('header')
  const title = document.createElement('div')
  title.className = 'monthly-recap-title'
  title.append(iconElement(CalendarDays))
  const copy = document.createElement('span')
  copy.append(
    Object.assign(document.createElement('small'), { textContent: 'MONTHLY RECAP' }),
    Object.assign(document.createElement('strong'), { textContent: recap.label }),
  )
  title.append(copy)
  head.append(title)

  const metrics = document.createElement('div')
  metrics.className = 'monthly-recap-metrics'
  const values = [
    [String(recap.workoutCount), 'Workouts'],
    [String(recap.activeDays), 'Active days'],
    [recap.totalVolume > 0 ? formatVolumeKg(recap.totalVolume, unit) : '—', 'Volume'],
  ]
  values.forEach(([value, label]) => {
    const item = document.createElement('div')
    item.append(Object.assign(document.createElement('strong'), { textContent: value }), Object.assign(document.createElement('span'), { textContent: label }))
    metrics.append(item)
  })

  if (recap.workoutCount > 0) {
    const share = shareExperience(recap, unit)
    head.append(share.button)
    card.append(head, metrics, share.dialog)
  } else {
    const empty = document.createElement('small')
    empty.className = 'monthly-recap-empty'
    empty.textContent = 'No completed workouts this month.'
    card.append(head, metrics, empty)
  }
  return card
}
