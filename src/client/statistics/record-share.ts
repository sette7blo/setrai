import { Share2, X } from 'lucide'

import { iconElement } from '../app/navigation.js'
import type { WeightUnit } from '../profile/types.js'
import { shareImage } from '../shared/image-share.js'
import type { PersonalRecord } from './types.js'
import { createRecordShareImage } from './record-share-image.js'

export function createRecordShareExperience(record: PersonalRecord, unit: WeightUnit): { button: HTMLButtonElement, dialog: HTMLDialogElement } {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'button quiet stats-record-share'
  button.setAttribute('aria-label', `Share ${record.exerciseName} personal record`)
  button.append(iconElement(Share2))

  const dialog = document.createElement('dialog')
  dialog.className = 'body-share-sheet record-share-sheet'
  dialog.setAttribute('aria-labelledby', 'record-share-title')
  dialog.innerHTML = `<div class="body-share-sheet__surface"><header><div><small>PERSONAL RECORD</small><h2 id="record-share-title">Share ${record.exerciseName}</h2></div><button type="button" class="body-share-close" aria-label="Close"></button></header><div class="body-share-preview" aria-live="polite"><span>Preparing preview…</span></div><p class="body-share-status" aria-live="polite"></p><button type="button" class="button button--primary body-share-submit"></button></div>`
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
    status.textContent = ''
    try {
      const file = await createRecordShareImage(record, unit)
      cachedFile = file
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      previewUrl = URL.createObjectURL(file)
      const image = document.createElement('img')
      image.src = previewUrl
      image.alt = `Preview of ${record.exerciseName} personal record image`
      preview.replaceChildren(image)
      submit.disabled = false
    } catch (error) {
      preview.innerHTML = '<span>Could not prepare this record.</span>'
      status.textContent = error instanceof Error ? error.message : 'Could not prepare image.'
    }
  }

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
