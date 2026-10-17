// Isolated Compose integration test. Never uses the operator's .env or database.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const image = process.argv[2] || 'setrai:local'
const project = `setrai-smoke-${process.pid}-${Date.now()}`
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'setrai-docker-'))
const composeFile = path.join(directory, 'compose.yaml')
const envFile = path.join(directory, '.env')
fs.copyFileSync(path.join(root, 'deploy', 'compose.yaml'), composeFile)
fs.writeFileSync(envFile, [
  `SETRAI_IMAGE=${image}`, 'SETRAI_BIND_ADDRESS=127.0.0.1', 'SETRAI_HTTP_PORT=0',
  'AI_ENABLED=false'
].join('\n') + '\n', { mode: 0o600 })
const composeArgs = ['compose', '--project-directory', directory, '--env-file', envFile,
  '--file', composeFile, '--project-name', project]

function docker(args, { tolerateFailure = false } = {}) {
  const result = spawnSync('docker', args, { encoding: 'utf8', timeout: 180000,
    env: { ...process.env, COMPOSE_DISABLE_ENV_FILE: 'true', SETRAI_IMAGE: image,
      SETRAI_BIND_ADDRESS: '127.0.0.1', SETRAI_HTTP_PORT: '0' } })
  if (result.status !== 0 && !tolerateFailure) {
    throw new Error(result.stderr || result.error?.message || `Docker exited ${result.status}`)
  }
  return result.stdout.trim()
}
function compose(args, options) { return docker([...composeArgs, ...args], options) }

try {
  compose(['config', '--quiet'])
  compose(['up', '--detach', '--pull', 'never', '--wait', '--wait-timeout', '120'])
  const port = compose(['port', 'setrai', '3000'])
  let base = `http://${port}`
  const json = async (pathname, method = 'GET', body) => {
    const response = await fetch(`${base}${pathname}`, {
      method, signal: AbortSignal.timeout(10000),
      ...(body ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {})
    })
    assert.ok(response.ok, `${method} ${pathname}: ${response.status}`)
    return response.json()
  }
  const capabilities = await json('/api/capabilities')
  assert.equal(capabilities.ai, false)
  assert.deepEqual(Object.keys(capabilities), ['ai'])
  const html = await (await fetch(base)).text()
  const script = html.match(/src="([^" ]+\.js)"/)?.[1]
  assert.ok(script, 'built client HTML references a JavaScript bundle')
  const asset = await fetch(`${base}${script}`)
  assert.ok(asset.ok)
  assert.match(asset.headers.get('content-type') || '', /javascript/)
  const { exercises } = await json('/api/exercises')
  assert.equal(exercises.length, 56, 'fresh database seeds the complete exercise library')
  const imageUrl = exercises.find(item => (item.image_url || item.imageUrl || '').startsWith('/images/'))
  assert.ok(imageUrl, 'seeded exercises include bundled image assets')
  const picture = await fetch(`${base}${imageUrl.image_url || imageUrl.imageUrl}`)
  assert.ok(picture.ok)
  assert.match(picture.headers.get('content-type') || '', /image/)
  const seededPrograms = (await json('/api/programs')).programs
  assert.equal(seededPrograms.length, 7)
  const { workout } = await json('/api/quick-workout', 'POST', { durationMinutes: 20 })
  assert.ok(workout.exercises.length > 0)
  assert.deepEqual((await json('/api/programs')).programs, seededPrograms, 'preview does not save a program')
  const { session } = await json('/api/quick-workout/start', 'POST', { workout })
  await json('/api/profile', 'PATCH', { trainingGoal: 'strength', weightUnit: 'lb' })
  const id = compose(['ps', '--quiet', 'setrai'])
  docker(['exec', id, 'node', '--input-type=module', '-e', `
    import assert from 'node:assert/strict'; import fs from 'node:fs';
    assert.notEqual(process.getuid(), 0);
    for (const item of ['/app/.env', '/app/.git', '/app/node_modules/typescript', '/app/node_modules/vite']) {
      assert.equal(fs.existsSync(item), false, item + ' must not ship in runtime');
    }
    assert.throws(() => fs.writeFileSync('/app/container-write-test', 'no'), /EROFS|EACCES/);
    assert.ok(fs.existsSync('/data/setrai.db'));
  `])
  // Remove/recreate the container, retaining this test's named volume.
  compose(['down', '--timeout', '30'])
  compose(['up', '--detach', '--pull', 'never', '--wait', '--wait-timeout', '120'])
  base = `http://${compose(['port', 'setrai', '3000'])}`
  assert.deepEqual(await json('/api/capabilities'), capabilities)
  const { profile } = await json('/api/profile')
  assert.equal(profile.trainingGoal, 'strength')
  assert.equal(profile.weightUnit, 'lb')
  assert.equal((await json('/api/exercises')).exercises.length, 56, 'restart does not duplicate exercises')
  const loaded = (await json(`/api/sessions/${session.id}`)).session
  assert.equal(loaded.id, session.id)
  assert.equal(loaded.plannedExercises.length, workout.exercises.length)
  assert.deepEqual((await json('/api/programs')).programs, seededPrograms, 'temporary workout stays out of Library')
  console.log('PASS Compose starts healthy, serves built app/images, seeds SQLite, and runs without optional integrations.')
  console.log('PASS non-root/read-only runtime excludes secrets and build tools; profile/session data survives container replacement.')
} finally {
  // Cleanup is restricted to resources created under this random test project.
  compose(['down', '--volumes', '--timeout', '30'], { tolerateFailure: true })
  fs.rmSync(directory, { recursive: true, force: true })
}
