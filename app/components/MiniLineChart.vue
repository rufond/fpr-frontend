<script setup lang="ts">
import { formatNumber } from '~/utils/format'

type ChartPoint = {
  time: number
  value: number
}

const props = defineProps<{
  title: string
  unit: string
  fractionDigits: number
  label: string
  points: ChartPoint[]
}>()

const chartWidth = 600
const chartHeight = 160
const chartPadding = 8

const displayPoints = computed(() => {
  const result: ChartPoint[] = []
  let previousValue: number | undefined

  for (const point of props.points) {
    if (result.length === 0 || point.value !== previousValue) {
      result.push(point)
      previousValue = point.value
    }
  }

  return result
})

const path = computed(() => {
  if (displayPoints.value.length < 2) {
    return ''
  }

  const values = displayPoints.value.map(point => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const valueRange = Math.max(Number.EPSILON, max - min)
  const pointRange = displayPoints.value.length - 1

  return displayPoints.value.map((point, index) => {
    const x = chartPadding + (index / pointRange) * (chartWidth - chartPadding * 2)
    const y = chartHeight - chartPadding - ((point.value - min) / valueRange) * (chartHeight - chartPadding * 2)

    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
  }).join(' ')
})

const range = computed(() => {
  if (displayPoints.value.length === 0) {
    return null
  }

  const values = displayPoints.value.map(point => point.value)

  return {
    min: Math.min(...values),
    max: Math.max(...values),
    latest: displayPoints.value.at(-1)?.value ?? values[0] ?? 0,
  }
})

const emptyLabel = computed(() => {
  return props.points.length > 1 ? 'Изменений нет' : 'Недостаточно точек для графика'
})

function formatted(value: number) {
  const number = formatNumber(String(value), props.fractionDigits)
  return props.unit === '$' ? `${props.unit}${number}` : `${number} ${props.unit}`
}
</script>

<template>
  <article class="history-chart">
    <div class="chart-heading">
      <div>
        <span>{{ title }}</span>
        <strong v-if="range">{{ formatted(range.latest) }}</strong>
        <strong v-else>—</strong>
      </div>

      <small v-if="range">
        {{ formatted(range.min) }} — {{ formatted(range.max) }}
      </small>
    </div>

    <svg
        v-if="path"
        viewBox="0 0 600 160"
        role="img"
        :aria-label="label"
    >
      <path :d="path" />
    </svg>

    <div v-else class="chart-empty">{{ emptyLabel }}</div>
  </article>
</template>

<style scoped>
.history-chart {
  min-width: 0;
  padding: 14px;
  border: 1px solid #edf0f4;
  border-radius: 10px;
}

.chart-heading {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.chart-heading > div {
  min-width: 0;
}

.chart-heading span,
.chart-heading small {
  color: #70798a;
  font-size: .78rem;
}

.chart-heading strong {
  display: block;
  margin-top: 3px;
  font-variant-numeric: tabular-nums;
}

svg {
  display: block;
  width: 100%;
  height: 160px;
  overflow: visible;
}

path {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  vector-effect: non-scaling-stroke;
}

.chart-empty {
  display: grid;
  height: 160px;
  place-items: center;
  color: #8a92a0;
  font-size: .78rem;
}
</style>
