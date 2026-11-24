<script setup lang="ts">
import { formatMarketTime, formatMoney, formatNumber } from '~/utils/format'

const props = defineProps<{
  points: Array<{ at: string, value: string }>
  currency: string
  label: string
  digits?: number
  axisInMillions?: boolean
  embedded?: boolean
}>()

const activeTime = ref<number | null>(null)
const width = 320
const left = 3
const right = width - left
const top = 6
const bottom = 58

const chart = computed(() => {
  const points = props.points
    .map(point => ({ at: Date.parse(point.at), value: point.value, number: Number(point.value) }))
    .filter(point => Number.isFinite(point.at) && Number.isFinite(point.number))
  const first = points[0]
  const last = points.at(-1)
  if (!first || !last) return null

  const low = points.reduce((a, b) => a.number <= b.number ? a : b)
  const high = points.reduce((a, b) => a.number >= b.number ? a : b)
  const duration = last.at - first.at
  const range = high.number - low.number
  const plotted = points.map(point => ({
    ...point,
    x: duration ? left + (point.at - first.at) / duration * (right - left) : width / 2,
    y: range ? bottom - (point.number - low.number) / range * (bottom - top) : (top + bottom) / 2,
  }))
  const line = plotted.map((point, i) => `${i === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ')
  return { plotted, low, high, first, last, duration, line }
})
const active = computed(() => chart.value?.plotted.find(point => point.at === activeTime.value))

function axisValue(point: { value: string, number: number }) {
  if (!props.axisInMillions) return formatMoney(point.value, props.currency, props.digits)
  return `${formatNumber(String(point.number / 1_000_000), 3)} млн $`
}

function inspect(event: PointerEvent) {
  const series = chart.value
  if (!series) return
  const { left: edge, width: pixels } = (event.currentTarget as HTMLElement).getBoundingClientRect()
  if (!pixels) return
  const x = (event.clientX - edge) / pixels * width
  const at = series.first.at + (x - left) / (right - left) * series.duration
  activeTime.value = series.plotted.reduce((closest, point) =>
    Math.abs(point.at - at) < Math.abs(closest.at - at) ? point : closest,
  ).at
}

function navigate(event: KeyboardEvent) {
  const points = chart.value?.plotted
  if (!points || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const index = points.findIndex(point => point.at === activeTime.value)
  let next = index
  if (event.key === 'Home') next = 0
  else if (event.key === 'End' || index < 0) next = points.length - 1
  else next = Math.max(0, Math.min(points.length - 1, index + (event.key === 'ArrowLeft' ? -1 : 1)))
  activeTime.value = points[next]?.at ?? null
}

defineExpose({ navigate })
</script>

<template>
  <div v-if="chart" class="time-series">
    <div class="chart-view">
      <div
        class="plot" :tabindex="embedded ? undefined : 0" :aria-label="embedded ? undefined : label"
        @pointerdown="inspect" @pointermove="inspect" @pointerleave="$event.pointerType === 'mouse' && (activeTime = null)"
        @pointercancel="activeTime = null" @keydown="navigate" @blur="activeTime = null"
      >
        <svg
          :viewBox="`0 0 ${width} 64`" preserveAspectRatio="none" role="img"
          :aria-label="`${label}. Максимум ${formatMoney(chart.high.value, currency, digits)}, минимум ${formatMoney(chart.low.value, currency, digits)}`"
        >
          <path v-if="chart.high.number !== chart.low.number" :d="`M0 ${top}H${width} M0 ${bottom}H${width}`" class="grid" />
          <path v-if="chart.duration" :d="`${chart.line} L${right},63 L${left},63 Z`" class="area" />
          <path v-if="chart.duration" :d="chart.line" class="line" vector-effect="non-scaling-stroke" />
          <circle v-else :cx="chart.plotted[0]?.x" :cy="chart.plotted[0]?.y" r="3" class="point" />
          <template v-if="active">
            <line :x1="active.x" :x2="active.x" y1="0" y2="63" class="cursor" vector-effect="non-scaling-stroke" />
            <circle :cx="active.x" :cy="active.y" r="3.3" class="point" vector-effect="non-scaling-stroke" />
          </template>
        </svg>
      </div>
      <div class="axis" aria-hidden="true">
        <span>Макс {{ axisValue(chart.high) }}</span>
        <span>Мин {{ axisValue(chart.low) }}</span>
      </div>
    </div>
    <output class="chart-readout" aria-live="polite">
      <template v-if="active">
        <time>{{ formatMarketTime(active.at) }}</time>
        <strong>{{ formatMoney(active.value, currency, digits) }}</strong>
      </template>
      <template v-else>
        <time v-if="chart.duration">{{ formatMarketTime(chart.first.at).replace(' МСК', '') }}</time>
        <time>{{ formatMarketTime(chart.last.at) }}</time>
      </template>
    </output>
  </div>
</template>

<style scoped>
.time-series { color: var(--muted); font-size: .69rem; font-variant-numeric: tabular-nums; }
.chart-view { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 7px; margin-top: 5px; }
.plot { min-width: 0; cursor: crosshair; }
svg { display: block; width: 100%; height: var(--chart-height, 56px); }
.grid { fill: none; stroke: #ded5e9; stroke-width: 1; }
.area { fill: #ebe3f5; }
.line { fill: none; stroke: #70569d; stroke-width: 1.55; stroke-linejoin: round; stroke-linecap: round; }
.cursor { stroke: #827294; stroke-width: 1; stroke-dasharray: 3 2; }
.point { fill: #70569d; stroke: #fff; stroke-width: 1.5; }
.axis { display: flex; flex-direction: column; justify-content: space-between; gap: 4px; padding-block: 1px; white-space: nowrap; }
.chart-readout { display: flex; justify-content: space-between; align-items: baseline; gap: 5px; min-height: 1.4em; margin-top: 2px; }
.chart-readout strong { color: var(--ink); font-weight: 650; }
</style>
