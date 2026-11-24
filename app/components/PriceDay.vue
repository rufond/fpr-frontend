<script setup lang="ts">
import type { MarketHistory, PriceReturn } from '~/types/fund'
import { formatMarketTime, formatMoney, formatSignedMoney, formatSignedPercent, valueTone } from '~/utils/format'

const props = defineProps<{
  isin: string
  value: string
  currency: string
  pricedAt: string
  name: string
  digits?: number
  source?: string
  dayChange?: PriceReturn
  conversionRate?: string
  positionValue?: string
}>()

const prices = useState<Record<string, { quote: string, loadedAt: number, data: MarketHistory }>>('price-day-cache', () => ({}))
const loading = ref(false)
const failed = ref(false)
const open = ref(false)
let controller: AbortController | undefined
const amount = computed(() => (props.conversionRate ? '≈ ' : '') + formatMoney(props.value, props.currency, props.digits))
const series = computed(() => {
  const cached = prices.value[props.isin]
  if (cached?.quote !== props.pricedAt) return []
  return props.conversionRate ? cached.data.unit_prices_usd ?? [] : cached.data.unit_prices
})
const points = computed(() => {
  const start = series.value.findLastIndex(point => point.currency !== props.currency) + 1
  return series.value.slice(start).map(point => ({ at: point.priced_at, value: point.unit_value }))
})
const priceChart = useTemplateRef('priceChart')

async function load() {
  const cached = prices.value[props.isin]
  if (cached?.quote === props.pricedAt && Date.now() - cached.loadedAt < 60_000
    && (!props.conversionRate || cached.data.usd_rub?.rate === props.conversionRate)) return
  controller?.abort()
  const request = new AbortController()
  controller = request
  loading.value = true
  failed.value = false
  const { isin, pricedAt } = props
  try {
    const data = await $fetch<MarketHistory>('/api/v1/fund/market-history', {
      method: 'POST',
      body: { isin, from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
      signal: request.signal,
    })
    prices.value[isin] = { quote: pricedAt, loadedAt: Date.now(), data }
  } catch {
    if (!request.signal.aborted) failed.value = true
  } finally {
    if (controller === request) loading.value = false
  }
}

function show() {
  open.value = true
  void load()
}

watch([() => props.pricedAt, () => props.conversionRate], () => { if (open.value) void load() })
onUnmounted(() => controller?.abort())
</script>

<template>
  <InfoPopover :aria-label="`${name}, ${amount}${dayChange ? ', за день ' + formatSignedPercent(dayChange.percent) : ''}, график за 24 часа`" @opened="show" @closed="open = false" @keydown="priceChart?.navigate($event)">
    <span class="price-line" :class="valueTone(dayChange?.percent ?? '')">
      <span class="price-amount">{{ amount }}</span>
      <sup v-if="dayChange" class="value-delta">{{ formatSignedPercent(dayChange.percent) }}</sup>
    </span>
    <template #detail>
      <div class="price-detail">
        <strong>Котировки за 24 часа</strong>
        <small>{{ source ?? 'Мосбиржа' }} · {{ formatMarketTime(pricedAt) }}</small>
        <small v-if="conversionRate">Пересчёт по курсу $1 = {{ formatMoney(conversionRate, 'RUB', 4) }}</small>
        <TimeSeriesChart
          v-if="points.length" ref="priceChart" class="price-chart" :points="points"
          :label="name" :currency="currency" :digits="digits ?? 4" embedded
        />
        <p v-else-if="loading" role="status">Загружаем котировки…</p>
        <p v-else-if="failed">Котировки недоступны.</p>
        <p v-else>За сутки недостаточно котировок.</p>
        <small v-if="positionValue">Стоимость позиции {{ formatMoney(positionValue, currency) }}</small>
        <small v-if="dayChange?.total">За торговый день {{ formatSignedMoney(dayChange.total, currency) }}</small>
      </div>
    </template>
  </InfoPopover>
</template>

<style scoped>
.price-line { display: inline-flex; align-items: baseline; gap: 6px; white-space: nowrap; }
.price-amount { text-decoration: underline dotted #8e80b3; text-underline-offset: 3px; text-decoration-thickness: 1px; }
.price-line.positive { color: var(--positive); }
.price-line.negative { color: var(--negative); }
.price-detail { width: 256px; max-width: calc(100vw - 44px); }
.price-detail small { display: block; color: var(--muted); margin-top: 3px; }
.price-detail p { margin: 8px 0 3px; }
.price-chart { --chart-height: 64px; margin-block: 7px; }
</style>
