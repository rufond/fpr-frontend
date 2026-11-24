<script setup lang="ts">
import type { LiveValuation, MarketHistory } from '~/types/fund'
import { formatDate, formatMoney, formatPercent, formatSignedPercent, valueTone } from '~/utils/format'

const props = defineProps<{ live?: LiveValuation, officialValue: string, officialDate: string }>()
const titleId = useId()
const { data, status } = useLazyAsyncData(
  'fund-nav-day-chart',
  () => $fetch<MarketHistory>('/api/v1/fund/market-history', {
    method: 'POST',
    body: { from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
  }),
  { server: false, watch: [() => props.live?.observed_at], dedupe: 'cancel' },
)

const points = computed(() => (data.value?.live_values ?? [])
  .filter(point => Number(point.live_coverage_percent) > 0)
  .map(point => ({ at: point.observed_at, value: point.estimated_nav_usd })))
</script>

<template>
  <figure class="nav-chart" :aria-labelledby="titleId">
    <figcaption>
      <span :id="titleId">Оценка СЧА за 24 часа</span>
      <strong v-if="live" :class="valueTone(live.live_delta_usd)">{{ formatMoney(live.estimated_nav_usd, 'USD', 0) }}</strong>
    </figcaption>

    <p v-if="live?.live_delta_percent != null" class="nav-change">
      <strong :class="valueTone(live.live_delta_percent)">{{ formatSignedPercent(live.live_delta_percent) }}</strong>
      к СЧА УК на {{ formatDate(officialDate) }}
    </p>

    <TimeSeriesChart v-if="points.length" :points="points" label="Оценка СЧА" currency="USD" :digits="0" axis-in-millions />
    <p v-else-if="!live" class="chart-note">
      По данным УК {{ formatMoney(officialValue, 'USD', 0) }} на {{ formatDate(officialDate) }}
    </p>
    <p v-else-if="status === 'error'" class="chart-note">График недоступен.</p>
    <p v-else-if="status === 'pending'" class="chart-note">Загрузка графика…</p>
    <p v-else class="chart-note">Пока мало данных для графика.</p>

    <p v-if="live" class="coverage">Покрытие котировками {{ formatPercent(live.live_coverage_percent, 1) }}</p>
  </figure>
</template>

<style scoped>
.nav-chart { min-width: 0; width: 100%; margin: 0; color: var(--muted); font-size: .72rem; }
figcaption { display: flex; align-items: baseline; flex-wrap: wrap; justify-content: space-between; gap: 3px 8px; }
figcaption span { font-weight: 600; }
figcaption strong { color: #32234c; font-size: clamp(.84rem, 1.3vw, 1.08rem); font-variant-numeric: tabular-nums; white-space: nowrap; }
.nav-change { margin: 2px 0 0; font-variant-numeric: tabular-nums; }
.positive { color: var(--positive); }
.negative { color: var(--negative); }
.chart-note { min-height: 51px; display: grid; align-content: center; margin: 4px 0 0; }
.coverage { margin: 4px 0 0; font-size: .68rem; }
</style>
