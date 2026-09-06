import { access, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const packageRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const requiredSourceFiles = ['index.html', 'src/main.ts', 'src/styles.css', 'scripts/build.mjs']
for (const file of requiredSourceFiles) await access(resolve(packageRoot, file))

const source = await readFile(resolve(packageRoot, 'src/main.ts'), 'utf8')
const styles = await readFile(resolve(packageRoot, 'src/styles.css'), 'utf8')
const html = await readFile(resolve(packageRoot, 'index.html'), 'utf8')
const requiredMarkers = [
  'pending',
  'reconnecting',
  'resync-required',
  'conflict',
  'approve-dialog',
  'document-blocks',
  'DocumentTransport',
]
for (const marker of requiredMarkers) {
  if (!source.includes(marker) && !html.includes(marker)) throw new Error(`Missing UI marker: ${marker}`)
}
for (const marker of ['prefers-reduced-motion', 'focus-visible', '2.75rem', '--pa-']) {
  if (!styles.includes(marker)) throw new Error(`Missing accessibility/token styling marker: ${marker}`)
}

const build = spawnSync('node', [resolve(packageRoot, 'scripts/build.mjs')], { cwd: packageRoot, stdio: 'inherit' })
if (build.status !== 0) process.exit(build.status ?? 1)
console.log('web-app smoke check passed')
