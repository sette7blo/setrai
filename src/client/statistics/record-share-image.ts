import type { WeightUnit } from '../profile/types.js'
import { formatWeightFromKg } from '../profile/weight-units.js'
import {
  SHARE_INNER, SHARE_MARGIN, createShareSheet, drawShareCard, drawShareFooter, drawShareHeader, drawShareStats, drawText,
  shareFont, shareSheetFile,
} from '../shared/share-canvas.js'
import type { PersonalRecord } from './types.js'

export function recordShareImageName(record: PersonalRecord): string {
  const slug = record.exerciseSlug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `setrai-${slug || 'personal'}-record.png`
}

function recordDate(value?: string): string {
  if (!value) return 'All-time best'
  const normalized = value.includes('T') || value.endsWith('Z') ? value : `${value.replace(' ', 'T')}Z`
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? 'All-time best' : date.toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })
}

export async function createRecordShareImage(record: PersonalRecord, unit: WeightUnit): Promise<File> {
  const sheet = await createShareSheet()
  const { palette } = sheet
  await drawShareHeader(sheet, 'Personal record', record.exerciseName, recordDate(record.achievedAt))

  drawShareCard(sheet, SHARE_MARGIN, 356, SHARE_INNER, 420)
  const left = SHARE_MARGIN + 44
  const width = SHARE_INNER - 88
  drawText(sheet, 'Record set', left, 424, { font: shareFont(400, 26), color: palette.muted })
  const recordWeight = record.recordWeight ?? record.maxWeight
  const setText = record.recordReps ? `${formatWeightFromKg(recordWeight, unit)} × ${record.recordReps}` : formatWeightFromKg(recordWeight, unit)
  drawText(sheet, setText, left, 580, { font: shareFont(800, 150, true), color: palette.text, maxWidth: width })
  drawText(sheet, `${formatWeightFromKg(record.estimated1RM, unit)} estimated 1RM`, left, 650, { font: shareFont(400, 32), color: palette.mutedStrong, maxWidth: width })
  // The one accent on this image: how far the record moved.
  const improvement = record.improvement && record.improvement > 0
    ? `+${formatWeightFromKg(record.improvement, unit)} from previous best`
    : 'First recorded best'
  drawText(sheet, improvement, left, 716, { font: shareFont(700, 30), color: palette.accent, maxWidth: width })

  drawShareStats(sheet, 816, [
    { value: formatWeightFromKg(record.maxWeight, unit), label: 'Heaviest set' },
    { value: formatWeightFromKg(record.estimated1RM, unit), label: 'Estimated 1RM' },
  ], 150)
  drawShareFooter(sheet, 1146, [`${record.exerciseName} · new all-time best`], 'Earned one set at a time.')
  return shareSheetFile(sheet, recordShareImageName(record))
}
