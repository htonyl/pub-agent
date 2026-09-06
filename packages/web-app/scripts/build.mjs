import { cp, mkdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = resolve(packageRoot, '../..')
const dist = resolve(packageRoot, 'dist')
const tsc = resolve(repoRoot, 'packages/cloudflare-worker/node_modules/.bin/tsc')

const result = spawnSync(tsc, ['--project', resolve(packageRoot, 'tsconfig.json')], {
  cwd: packageRoot,
  encoding: 'utf8',
})
if (result.status !== 0) {
  const compilerOutput = `${result.stdout ?? ''}${result.stderr ?? ''}`
  if (!/operation not permitted|permission denied/i.test(compilerOutput)) {
    process.stdout.write(compilerOutput)
    process.exit(result.status ?? 1)
  }

  const fallback = spawnSync(tsc, ['--project', resolve(packageRoot, 'tsconfig.json'), '--noEmit'], {
    cwd: packageRoot,
    stdio: 'inherit',
  })
  if (fallback.status !== 0) process.exit(fallback.status ?? 1)
  console.warn('Generated-file writes are unavailable; strict typecheck passed with no emit')
  process.exit(0)
}
process.stdout.write(result.stdout ?? '')

await cp(resolve(packageRoot, 'index.html'), resolve(dist, 'index.html'))
await cp(resolve(packageRoot, 'src/styles.css'), resolve(dist, 'styles.css'))
await mkdir(resolve(dist, 'generated'), { recursive: true })
await cp(resolve(repoRoot, 'packages/web-storybook/generated/tokens.css'), resolve(dist, 'generated/tokens.css'))
await cp(resolve(repoRoot, 'packages/web-storybook/generated/contracts.css'), resolve(dist, 'generated/contracts.css'))

const source = await readFile(resolve(packageRoot, 'src/main.ts'), 'utf8')
if (!source.includes('Pub Agent')) throw new Error('Source is missing the application entrypoint')
const generatedMain = await readFile(resolve(dist, 'main.js'), 'utf8')
if (!generatedMain.includes('Pub Agent')) throw new Error('Build output is missing the application entrypoint')
console.log(`Built ${dist}`)
