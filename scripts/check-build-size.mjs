import { gzipSync } from 'node:zlib'
import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'

const publicDir = '.output/public'
const outputDir = join(publicDir, '_nuxt')

const limits = {
  jsFileGzip: 160 * 1024,
  cssFileGzip: 32 * 1024,
  publicIndexJsGzip: 220 * 1024,
  publicIndexCssGzip: 48 * 1024,
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

function publicIndexAssets(html) {
  const paths = new Set()

  for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
    const value = match[1]
    if (!value?.startsWith('/_nuxt/')) {
      continue
    }

    if (value.endsWith('.js') || value.endsWith('.css')) {
      paths.add(join(publicDir, value.slice(1)))
    }
  }

  return paths
}

const files = (await filesIn(outputDir))
    .filter(path => path.endsWith('.js') || path.endsWith('.css'))

const result = []

for (const path of files) {
  const content = await readFile(path)
  result.push({
    path: relative(outputDir, path),
    absolutePath: path,
    type: path.endsWith('.js') ? 'js' : 'css',
    raw: (await stat(path)).size,
    gzip: gzipSync(content, { level: 9 }).length,
  })
}

result.sort((a, b) => b.gzip - a.gzip)

const indexHTML = await readFile(join(publicDir, 'index.html'), 'utf8')
const indexAssets = publicIndexAssets(indexHTML)

const indexTotals = {
  js: result
      .filter(item => item.type === 'js' && indexAssets.has(item.absolutePath))
      .reduce((sum, item) => sum + item.gzip, 0),
  css: result
      .filter(item => item.type === 'css' && indexAssets.has(item.absolutePath))
      .reduce((sum, item) => sum + item.gzip, 0),
}

for (const item of result) {
  console.log(`${item.type.toUpperCase().padEnd(3)} ${String(Math.ceil(item.gzip / 1024)).padStart(4)} KiB gzip  ${item.path}`)
}

console.log(`Public index JS:  ${Math.ceil(indexTotals.js / 1024)} KiB gzip`)
console.log(`Public index CSS: ${Math.ceil(indexTotals.css / 1024)} KiB gzip`)

const violations = []

for (const item of result) {
  if (item.type === 'js' && item.gzip > limits.jsFileGzip) {
    violations.push(`${item.path}: JS chunk exceeds ${limits.jsFileGzip / 1024} KiB gzip`)
  }
  if (item.type === 'css' && item.gzip > limits.cssFileGzip) {
    violations.push(`${item.path}: CSS chunk exceeds ${limits.cssFileGzip / 1024} KiB gzip`)
  }
}

if (indexTotals.js > limits.publicIndexJsGzip) {
  violations.push(`public index JS exceeds ${limits.publicIndexJsGzip / 1024} KiB gzip`)
}
if (indexTotals.css > limits.publicIndexCssGzip) {
  violations.push(`public index CSS exceeds ${limits.publicIndexCssGzip / 1024} KiB gzip`)
}

if (violations.length > 0) {
  console.error('\nBundle size budget failed:')
  for (const violation of violations) {
    console.error(`- ${violation}`)
  }
  process.exitCode = 1
}
