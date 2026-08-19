<script setup lang="ts">
import MiniLineChart from '~/components/MiniLineChart.vue'

type ChartPoint = {
  time: number
  value: number
}

const { history, pending, error, refresh } = useFundMarketHistory()

const unitSeries = computed(() => {
  return numericSeries(history.value?.unit_prices ?? [], item => item.priced_at, item => item.unit_value)
})

const liveSeries = computed(() => {
  return numericSeries(
      history.value?.live_values ?? [],
      item => item.observed_at,
      item => item.estimated_calculated_unit_value_usd,
  )
})

const periodLabel = computed(() => {
  const timestamps = [
    ...unitSeries.value.map(point => point.time),
    ...liveSeries.value.map(point => point.time),
  ]

  if (timestamps.length === 0) {
    return 'последние 24 часа'
  }

  return `${formatDateTime(Math.min(...timestamps))} — ${formatDateTime(Math.max(...timestamps))}`
})

function numericSeries<T>(items: T[], time: (item: T) => string, value: (item: T) => string): ChartPoint[] {
  const result: ChartPoint[] = []

  for (const item of items) {
    const timestamp = Date.parse(time(item))
    const numericValue = Number(value(item))

    if (Number.isFinite(timestamp) && Number.isFinite(numericValue)) {
      result.push({
        time: timestamp,
        value: numericValue,
      })
    }
  }

  return result
}

function formatDateTime(value: number) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
</script>

<template>
  <div class="history-panel">
    <div class="history-heading">
      <div>
        <strong>Динамика за 24 часа</strong>
        <small>{{ periodLabel }}</small>
      </div>

      <button
          v-if="error"
          type="button"
          :disabled="pending"
          @click="refresh"
      >
        Повторить
      </button>
    </div>

    <p v-if="pending && !history" class="history-state">Загружаем короткую историю…</p>
    <p v-else-if="error && !history" class="history-state history-error">{{ error }}</p>

    <div v-else class="history-grid">
      <MiniLineChart
          title="БСИП MOEX"
          unit="₽"
          :fraction-digits="2"
          label="Динамика биржевой стоимости пая за 24 часа"
          :points="unitSeries"
      />

      <MiniLineChart
          title="Live РСИП"
          unit="$"
          :fraction-digits="4"
          label="Динамика расчётной live стоимости пая за 24 часа"
          :points="liveSeries"
      />
    </div>
  </div>
</template>

<style scoped>
.history-panel {
  margin-top: 12px;
  padding: 16px;
  border: 1px solid #e0e4ea;
  border-radius: 12px;
  background: #fff;
}

.history-heading {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.history-heading strong {
  display: block;
}

.history-heading small {
  display: block;
  margin-top: 3px;
  color: #70798a;
  font-size: .78rem;
}

.history-heading button {
  padding: 7px 10px;
  border: 1px solid #cbd2dc;
  border-radius: 7px;
  color: #273244;
  background: #fff;
}

.history-heading button:disabled {
  cursor: default;
  opacity: .55;
}

.history-state {
  margin: 0;
  padding: 28px 0;
  color: #70798a;
  text-align: center;
}

.history-error {
  color: #8d2d2d;
}

.history-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

@media (max-width: 720px) {
  .history-grid {
    grid-template-columns: 1fr;
  }
}
</style>
