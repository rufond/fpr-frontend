<script setup lang="ts">
import type { FundCategory } from '~/types/fund'
import { formatPercent } from '~/utils/format'

const props = defineProps<{ categories: FundCategory[] }>()
const colors = ['#816ab1', '#4f978b', '#8babc5', '#ca9a77', '#aeb8c1', '#84ac93']
const ordered = computed(() => props.categories.toSorted((a, b) => Number(b.asset_share_percent) - Number(a.asset_share_percent)))
const barStyle = computed(() => {
  let start = 0
  const segments = ordered.value.map(({ asset_share_percent }, index) => {
    const end = start + Number(asset_share_percent)
    const segment = `${colors[index % colors.length]} ${start}% ${end}%`
    start = end
    return segment
  })
  segments.push(`#ede9f1 ${start}% 100%`)
  return `linear-gradient(to right, ${segments.join(', ')})`
})
</script>

<template>
  <section class="panel" aria-labelledby="allocation-title">
    <h2 id="allocation-title">Структура активов</h2>
    <template v-if="ordered.length">
      <div class="allocation-bar" aria-hidden="true" :style="{ background: barStyle }"></div>
      <ul>
        <li v-for="(category, index) in ordered" :key="category.row_no">
          <span class="swatch" aria-hidden="true" :style="{ backgroundColor: colors[index % colors.length] }"></span>
          <span>{{ category.source_name }}</span>
          <strong>{{ formatPercent(category.asset_share_percent, 4) }}</strong>
        </li>
      </ul>
    </template>
    <p v-else class="empty">Доли по категориям недоступны.</p>
  </section>
</template>

<style scoped>
.panel { min-width: 0; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); padding: 15px 16px; }
h2 { margin: 0 0 9px; font-size: .91rem; font-weight: 650; letter-spacing: -.015em; }
.allocation-bar { height: 6px; border-radius: 3px; }
ul { margin: 9px 0 0; list-style: none; padding: 0; }
li { display: grid; grid-template-columns: 7px minmax(0, 1fr) auto; align-items: baseline; gap: 7px; padding: 4px 0; color: var(--muted); font-size: .76rem; }
.swatch { width: 6px; height: 6px; border-radius: 50%; align-self: center; }
strong { white-space: nowrap; color: var(--ink); font-variant-numeric: tabular-nums; font-weight: 630; }
.empty { margin: 9px 0 0; color: var(--muted); font-size: .77rem; }
</style>
