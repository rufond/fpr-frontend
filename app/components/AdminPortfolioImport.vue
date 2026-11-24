<script setup lang="ts">
import { useAdminApi } from '~/composables/admin/useAdminApi'

interface ImportResult {
  imported: number
  skipped: number
}

const { request } = useAdminApi()
const input = useTemplateRef<HTMLInputElement>('fileInput')
const file = shallowRef<File>()
const pending = ref(false)
const error = ref('')
const result = ref<ImportResult>()

function selectFile() {
  file.value = input.value?.files?.[0]
  error.value = ''
  result.value = undefined
}

async function importReports() {
  const selected = file.value
  if (!selected || pending.value) return
  error.value = ''
  result.value = undefined
  if (selected.size > 2 * 1024 * 1024) {
    error.value = 'Размер файла превышает 2 МБ.'
    return
  }

  pending.value = true
  try {
    result.value = await request<ImportResult>('/api/v1/admin/portfolio/import', {
      method: 'POST',
      body: selected.slice(0, selected.size, 'application/x-ndjson'),
    })
    if (input.value) input.value.value = ''
    file.value = undefined
  } catch (reason) {
    const data = (reason as { data?: { error?: unknown } } | null)?.data
    error.value = typeof data?.error === 'string' ? data.error : 'Не удалось импортировать справки.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <section id="portfolio-import" class="portfolio-import" aria-labelledby="portfolio-import-title">
    <h2 id="portfolio-import-title">Импорт справок УК</h2>
    <form @submit.prevent="importReports">
      <label>
        <span>Файл NDJSON, до 2 МБ</span>
        <input ref="fileInput" type="file" accept=".ndjson,application/x-ndjson" :disabled="pending" required @change="selectFile">
      </label>
      <button type="submit" :disabled="pending || !file">{{ pending ? 'Импортируем…' : 'Импортировать' }}</button>
    </form>
    <p v-if="error" class="import-error" role="alert">{{ error }}</p>
    <p v-else-if="result" role="status">Добавлено {{ result.imported }} · уже в архиве {{ result.skipped }}</p>
  </section>
</template>

<style scoped>
.portfolio-import { margin-top: 28px; }
h2 { margin: 0 0 9px; font-size: 1.15rem; }
form { display: flex; flex-wrap: wrap; align-items: end; gap: 9px 14px; }
label { display: grid; min-width: 0; gap: 4px; font-size: .8rem; }
label span { color: var(--muted); }
input { max-width: 100%; }
button { padding: 7px 10px; border: 1px solid var(--border); background: var(--surface); color: var(--ink); }
button:disabled { cursor: default; opacity: .55; }
p { margin: 8px 0 0; font-size: .8rem; }
.import-error { color: var(--negative); }
</style>
