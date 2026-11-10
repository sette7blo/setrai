// Appearance preference, stored on this device. "system" follows the device setting.
// The same key and attribute are applied before first paint by the inline script in index.html.
export type ThemeChoice = 'system' | 'light' | 'dark'

export const THEME_STORAGE_KEY = 'setrai-theme'
export const THEME_COLORS = { light: '#f3f3f0', dark: '#0f1011' } as const

export function normalizeTheme(value: unknown): ThemeChoice {
  return value === 'light' || value === 'dark' ? value : 'system'
}

export function storedTheme(): ThemeChoice {
  try {
    return normalizeTheme(localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return 'system'
  }
}

// Sets the attribute the stylesheet keys on and the browser chrome colour to match.
export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement
  if (choice === 'system') delete root.dataset.theme
  else root.dataset.theme = choice
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    const own = meta.dataset.scheme === 'dark' ? 'dark' : 'light'
    meta.content = THEME_COLORS[choice === 'system' ? own : choice]
  })
}

// Applies the choice even when it cannot be saved, so it still holds for this visit.
export function saveTheme(choice: ThemeChoice): void {
  applyTheme(choice)
  try {
    if (choice === 'system') localStorage.removeItem(THEME_STORAGE_KEY)
    else localStorage.setItem(THEME_STORAGE_KEY, choice)
  } catch { /* Storage is unavailable; the choice lasts until the page reloads. */ }
}
