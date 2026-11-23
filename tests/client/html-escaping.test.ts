import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { errorState } from '../../src/client/app/shell-states.js'

test('error state escapes the server message before it becomes markup', () => {
  const markup = errorState('Unknown field: <img src=x onerror=alert(1)> & "quoted"')
  assert.doesNotMatch(markup, /<img/)
  assert.match(markup, /&lt;img src=x onerror=alert\(1\)&gt; &amp; &quot;quoted&quot;/)
})

test('record share dialog keeps the exercise name out of its markup template', () => {
  const source = readFileSync('src/client/statistics/record-share.ts', 'utf8')
  const template = /dialog\.innerHTML = `([^`]*)`/.exec(source)?.[1]
  assert.ok(template, 'record share dialog template not found')
  assert.doesNotMatch(template, /\$\{/)
  assert.match(source, /textContent = `Share \$\{record\.exerciseName\}`/)
})
