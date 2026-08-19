import { gzipSync } from 'node:zlib'
import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'

const outputDir = '.output/public/_nuxt'

const limits = {
  jsFileGzip: 160 * 1024,
  cssFileGzip: 32 * 1024,
  allJsGzip: 512 * 1024,
  allCssGzip: 96 * 1024,
}

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...await filesIn(path))
    } else if (entry.isFile()) {
      files.push(path)
    }
  }

  return files
}

const files = (await filesIn(outputDir))
  .filter(path => path.endsWith('.js') || path.endsWith('.css'))

const result = []

for (const path of files) {
  const content = await readFile(path)
  result.push({
    path: relative(outputDir, path),
    type: path.endsWith('.js') ? 'js' : 'css',
    raw: (await stat(path)).size,
    gzip: gzipSync(content, { level: 9 }).length,
  })
}

result.sort((a, b) => b.gzip - a.gzip)

const totals = {
  js: result.filter(item => item.type === 'js').reduce((sum, item) => sum + item.gzip, 0),
  css: result.filter(item => item.type === 'css').reduce((sum, item) => sum + item.gzip, 0),
}

for (const item of result) {
  console.log(`${item.type.toUpperCase().padEnd(3)} ${String(Math.ceil(item.gzip / 1024)).padStart(4)} KiB gzip  ${item.path}`)
}

console.log(`Total JS:  ${Math.ceil(totals.js / 1024)} KiB gzip`)
console.log(`Total CSS: ${Math.ceil(totals.css / 1024)} KiB gzip`)

const violations = []

for (const item of result) {
  if (item.type === 'js' && item.gzip > limits.jsFileGzip) {
    violations.push(`${item.path}: JS chunk exceeds ${limits.jsFileGzip / 1024} KiB gzip`)
  }
  if (item.type === 'css' && item.gzip > limits.cssFileGzip) {
    violations.push(`${item.path}: CSS chunk exceeds ${limits.cssFileGzip / 1024} KiB gzip`)
  }
}

if (totals.js > limits.allJsGzip) {
  violations.push(`all JS exceeds ${limits.allJsGzip / 1024} KiB gzip`)
}
if (totals.css > limits.allCssGzip) {
  violations.push(`all CSS exceeds ${limits.allCssGzip / 1024} KiB gzip`)
}

if (violations.length > 0) {
  console.error('\nBundle size budget failed:')
  for (const violation of violations) {
    console.error(`- ${violation}`)
  }
  process.exitCode = 1
}
