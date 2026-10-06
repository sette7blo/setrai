// scripts/check-architecture.mjs
//
// Setrai architecture guard.
//
// Goals:
// - keep handwritten source files reasonably small;
// - prevent obvious client/server boundary violations;
// - discourage generic junk-drawer filenames;
// - catch direct cross-feature imports that bypass documented service boundaries.
//
// This checker is intentionally conservative at first.
// Expand rules gradually as the codebase becomes real.

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const ROOT = process.cwd()

const SOURCE_ROOTS = [
  path.join(ROOT, 'src', 'server'),
  path.join(ROOT, 'src', 'client')
]

const MAX_LINES = 400

const SOURCE_EXTENSIONS = new Set([
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.jsx'
])

const GENERIC_FILENAMES = new Set([
  'utils.js',
  'utils.ts',
  'utils.jsx',
  'utils.tsx',
  'helpers.js',
  'helpers.ts',
  'helpers.jsx',
  'helpers.tsx',
  'misc.js',
  'misc.ts',
  'misc.jsx',
  'misc.tsx',
  'common.js',
  'common.ts',
  'common.jsx',
  'common.tsx'
])

const EXEMPT_PATH_PARTS = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  'vendor',
  'generated',
  '__generated__',
  'fixtures'
])

const SERVER_FEATURES = new Set([
  'exercises',
  'programs',
  'sessions',
  'body',
  'profile',
  'statistics',
  'recovery',
  'quick-workout',
  'ai',
  'nostr',
  'monero'
])

const CLIENT_FEATURES = new Set([
  'app',
  'exercises',
  'workouts',
  'statistics',
  'recovery',
  'profile',
  'quick-workout',
  'discover',
  'shared'
])

const ALLOWED_SERVER_FEATURE_IMPORTS = {
  exercises: new Set([]),

  programs: new Set([
    'exercises'
  ]),

  sessions: new Set([
    'programs',
    'exercises'
  ]),

  body: new Set([]),

  profile: new Set([]),

  statistics: new Set([
    'sessions',
    'exercises',
    'body',
    'profile'
  ]),

  recovery: new Set([
    'sessions',
    'exercises'
  ]),

  'quick-workout': new Set([
    'recovery',
    'exercises',
    'profile',
    'programs',
    'sessions'
  ]),

  ai: new Set([
    'exercises',
    'programs',
    'sessions',
    'statistics',
    'recovery'
  ]),

  nostr: new Set([
    'exercises',
    'programs',
    'sessions'
  ]),

  monero: new Set([])
}

const errors = []
const warnings = []

function normalize(filePath) {
  return filePath.split(path.sep).join('/')
}

function relative(filePath) {
  return normalize(path.relative(ROOT, filePath))
}

function isExempt(filePath) {
  const parts = normalize(filePath).split('/')
  return parts.some((part) => EXEMPT_PATH_PARTS.has(part))
}

function isSourceFile(filePath) {
  return SOURCE_EXTENSIONS.has(path.extname(filePath))
}

function walk(directory) {
  if (!fs.existsSync(directory)) {
    return []
  }

  const results = []

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name)

    if (isExempt(fullPath)) {
      continue
    }

    if (entry.isDirectory()) {
      results.push(...walk(fullPath))
      continue
    }

    if (entry.isFile() && isSourceFile(fullPath)) {
      results.push(fullPath)
    }
  }

  return results
}

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

function countLines(content) {
  if (content.length === 0) {
    return 0
  }

  return content.split(/\r?\n/).length
}

function fail(filePath, message) {
  errors.push(`${relative(filePath)}: ${message}`)
}

function warn(filePath, message) {
  warnings.push(`${relative(filePath)}: ${message}`)
}

function checkFileSize(filePath, content) {
  const rel = relative(filePath)

  if (rel.startsWith('src/server/db/seed/exercises/')) {
    return
  }

  const lines = countLines(content)

  if (lines > MAX_LINES) {
    fail(
      filePath,
      `contains ${lines} lines; handwritten source files should not exceed ${MAX_LINES} lines`
    )
  } else if (lines > 350) {
    warn(
      filePath,
      `contains ${lines} lines and is approaching the ${MAX_LINES}-line limit`
    )
  }
}

function checkGenericFilename(filePath) {
  const filename = path.basename(filePath).toLowerCase()

  if (GENERIC_FILENAMES.has(filename)) {
    fail(
      filePath,
      `generic filename "${filename}" is not allowed; use a responsibility-specific name`
    )
  }
}

function getImports(content) {
  const imports = []

  const staticImportRegex =
    /\b(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g

  const dynamicImportRegex =
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g

  const requireRegex =
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g

  for (const regex of [
    staticImportRegex,
    dynamicImportRegex,
    requireRegex
  ]) {
    let match

    while ((match = regex.exec(content)) !== null) {
      imports.push(match[1])
    }
  }

  return imports
}

function resolveRelativeImport(filePath, specifier) {
  if (!specifier.startsWith('.')) {
    return null
  }

  return normalize(
    path.resolve(path.dirname(filePath), specifier)
  )
}

function getServerFeature(filePath) {
  const rel = relative(filePath)
  const match = rel.match(/^src\/server\/([^/]+)\//)

  if (!match) {
    return null
  }

  return SERVER_FEATURES.has(match[1]) ? match[1] : null
}

function getClientFeature(filePath) {
  const rel = relative(filePath)
  const match = rel.match(/^src\/client\/([^/]+)\//)

  if (!match) {
    return null
  }

  return CLIENT_FEATURES.has(match[1]) ? match[1] : null
}

function extractServerFeatureFromResolvedPath(resolvedPath) {
  const marker = '/src/server/'
  const normalized = normalize(resolvedPath)
  const index = normalized.indexOf(marker)

  if (index === -1) {
    return null
  }

  const remainder = normalized.slice(index + marker.length)
  const feature = remainder.split('/')[0]

  return SERVER_FEATURES.has(feature) ? feature : null
}

function checkClientServerBoundary(filePath, imports) {
  const rel = relative(filePath)

  if (!rel.startsWith('src/client/')) {
    return
  }

  for (const specifier of imports) {
    const resolved = resolveRelativeImport(filePath, specifier)

    if (
      resolved &&
      normalize(resolved).includes('/src/server/')
    ) {
      fail(
        filePath,
        `client code must not import server code: "${specifier}"`
      )
    }
  }
}

function checkServerImportingClient(filePath, imports) {
  const rel = relative(filePath)

  if (!rel.startsWith('src/server/')) {
    return
  }

  for (const specifier of imports) {
    const resolved = resolveRelativeImport(filePath, specifier)

    if (
      resolved &&
      normalize(resolved).includes('/src/client/')
    ) {
      fail(
        filePath,
        `server code must not import client code: "${specifier}"`
      )
    }
  }
}

function checkCrossFeatureServerImports(filePath, imports) {
  const sourceFeature = getServerFeature(filePath)

  if (!sourceFeature) {
    return
  }

  const allowed =
    ALLOWED_SERVER_FEATURE_IMPORTS[sourceFeature] ?? new Set()

  for (const specifier of imports) {
    const resolved = resolveRelativeImport(filePath, specifier)

    if (!resolved) {
      continue
    }

    const targetFeature =
      extractServerFeatureFromResolvedPath(resolved)

    if (!targetFeature || targetFeature === sourceFeature) {
      continue
    }

    if (!allowed.has(targetFeature)) {
      fail(
        filePath,
        `server feature "${sourceFeature}" must not import "${targetFeature}" directly`
      )
    }
  }
}

function checkRepositoryAccess(filePath, imports) {
  const rel = relative(filePath)

  if (!rel.startsWith('src/server/')) {
    return
  }

  const sourceFeature = getServerFeature(filePath)

  if (!sourceFeature) {
    return
  }

  for (const specifier of imports) {
    const resolved = resolveRelativeImport(filePath, specifier)

    if (!resolved) {
      continue
    }

    const normalized = normalize(resolved)

    if (!normalized.includes('/src/server/db/repositories/')) {
      continue
    }

    const repositoryPath = normalized
      .split('/src/server/db/repositories/')[1]
    const firstRepositoryPart = repositoryPath.split('/')[0]
    const repositoryName = firstRepositoryPart
      .replace(/\.(js|mjs|cjs|ts|tsx|jsx)$/, '')

    const allowedRepositoryByFeature = {
      exercises: new Set(['exercises']),
      programs: new Set(['programs']),
      sessions: new Set(['sessions']),
      body: new Set(['body']),
      profile: new Set(['settings']),
      statistics: new Set([]),
      recovery: new Set([]),
      'quick-workout': new Set([]),
      ai: new Set([]),
      nostr: new Set([]),
      monero: new Set([])
    }

    const allowed =
      allowedRepositoryByFeature[sourceFeature] ?? new Set()

    if (!allowed.has(repositoryName)) {
      fail(
        filePath,
        `feature "${sourceFeature}" must not access repository "${repositoryName}" directly`
      )
    }
  }
}

function checkDangerousClientSecretNames(filePath, content) {
  const rel = relative(filePath)

  if (!rel.startsWith('src/client/')) {
    return
  }

  const forbiddenPatterns = [
    /\bNOSTR_NSEC\b/,
    /\bMONERO_SEED\b/,
    /\bSETRAI_AUTH_PASSWORD\b/,
    /\bAI_API_KEY\b/
  ]

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(content)) {
      fail(
        filePath,
        `client source references server secret "${pattern.source.replaceAll('\\b', '')}"`
      )
    }
  }
}

function checkFeatureDirectory(filePath) {
  const serverFeature = getServerFeature(filePath)

  if (serverFeature) {
    return
  }

  const clientFeature = getClientFeature(filePath)

  if (clientFeature) {
    return
  }

  const rel = relative(filePath)

  if (
    rel.startsWith('src/server/') &&
    rel !== 'src/server/index.js' &&
    !rel.startsWith('src/server/config/') &&
    !rel.startsWith('src/server/db/') &&
    !rel.startsWith('src/server/shared/')
  ) {
    warn(
      filePath,
      'source file is outside a documented server feature directory'
    )
  }

  if (
    rel.startsWith('src/client/') &&
    !rel.startsWith('src/client/shared/')
  ) {
    warn(
      filePath,
      'source file is outside a documented client feature directory'
    )
  }
}

function checkFile(filePath) {
  const content = readFile(filePath)
  const imports = getImports(content)

  checkFileSize(filePath, content)
  checkGenericFilename(filePath)
  checkClientServerBoundary(filePath, imports)
  checkServerImportingClient(filePath, imports)
  checkCrossFeatureServerImports(filePath, imports)
  checkRepositoryAccess(filePath, imports)
  checkDangerousClientSecretNames(filePath, content)
  checkFeatureDirectory(filePath)
}

function checkRequiredDocumentation() {
  const requiredFiles = [
    'AGENTS.md',
    'docs/instruction.md',
    'docs/architecture.md',
    'docs/modules.md',
    'docs/security.md',
    'docs/configuration.md',
    'docs/decisions/001-self-hosted-architecture.md',
    'docs/decisions/002-optional-nostr.md',
    'docs/decisions/003-monero-hot-wallet.md',
    'docs/decisions/004-module-size-policy.md'
  ]

  for (const rel of requiredFiles) {
    const fullPath = path.join(ROOT, rel)

    if (!fs.existsSync(fullPath)) {
      errors.push(`${rel}: required architecture document is missing`)
    }
  }
}

function checkRequiredDirectories() {
  const requiredDirectories = [
    'src/server/config',
    'src/server/db',
    'src/server/exercises',
    'src/server/programs',
    'src/server/sessions',
    'src/server/body',
    'src/server/profile',
    'src/server/statistics',
    'src/server/recovery',
    'src/server/quick-workout',
    'src/server/ai',
    'src/server/nostr',
    'src/server/monero',

    'src/client/app',
    'src/client/exercises',
    'src/client/workouts',
    'src/client/statistics',
    'src/client/recovery',
    'src/client/profile',
    'src/client/quick-workout',
    'src/client/discover',
    'src/client/shared'
  ]

  for (const rel of requiredDirectories) {
    const fullPath = path.join(ROOT, rel)

    if (!fs.existsSync(fullPath)) {
      warnings.push(`${rel}: documented module directory does not exist yet`)
    }
  }
}

function printResults(filesChecked) {
  console.log('')
  console.log('Setrai architecture check')
  console.log('=========================')
  console.log(`Files checked: ${filesChecked}`)
  console.log(`Warnings: ${warnings.length}`)
  console.log(`Errors: ${errors.length}`)
  console.log('')

  if (warnings.length > 0) {
    console.log('Warnings')
    console.log('--------')

    for (const warning of warnings) {
      console.log(`⚠ ${warning}`)
    }

    console.log('')
  }

  if (errors.length > 0) {
    console.log('Errors')
    console.log('------')

    for (const error of errors) {
      console.log(`✖ ${error}`)
    }

    console.log('')
  }

  if (errors.length === 0) {
    console.log('✓ Architecture check passed.')
    console.log('')
  } else {
    console.log('✖ Architecture check failed.')
    console.log('')
  }
}

function main() {
  checkRequiredDocumentation()
  checkRequiredDirectories()

  const files = SOURCE_ROOTS.flatMap(walk)

  for (const filePath of files) {
    checkFile(filePath)
  }

  printResults(files.length)

  if (errors.length > 0) {
    process.exitCode = 1
  }
}

main()
