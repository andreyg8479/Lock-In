/**
 * Lists every Vitest case in this package, or runs the suite and prints
 * only passing tests with their full describe/it titles (file > suite > test).
 *
 * Usage (from frontend/):
 *   node scripts/list-frontend-tests.mjs           # collect tests (no run)
 *   node scripts/list-frontend-tests.mjs passed    # run tests, show what passed
 */
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const mode = process.argv[2] ?? 'list'

const args =
  mode === 'passed'
    ? ['vitest', 'run', '--reporter=verbose', '--silent', '--no-color']
    : mode === 'list'
      ? ['vitest', 'list']
      : null

if (!args) {
  console.error('Usage: node scripts/list-frontend-tests.mjs [list|passed]')
  process.exit(1)
}

const result = spawnSync('npx', args, {
  cwd: root,
  stdio: 'inherit',
  shell: true,
})

process.exit(result.status === 0 ? 0 : result.status ?? 1)
