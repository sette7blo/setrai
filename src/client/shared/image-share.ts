export type ImageShareResult = 'shared' | 'downloaded' | 'cancelled'

export function imageOnlyShareData(file: File): ShareData {
  return { files: [file] }
}

function downloadImage(file: File): void {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export async function shareImage(file: File): Promise<ImageShareResult> {
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
