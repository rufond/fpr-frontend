import { onMounted, onUnmounted } from 'vue'
import type {
    FundMarketHistory,
    IntradayMarketPrice,
    LiveValuePoint,
} from '~/types/fund'
import type { RealtimeClientEvent, RealtimeScope } from '~/types/realtime'

const historyWindowMs = 24 * 60 * 60 * 1000

const scopes: RealtimeScope[] = [
    'instrument_prices',
    'live_valuation',
]

export function useFundMarketHistory() {
    const { state } = useFundState()
    const realtime = useRealtime()

    const history = ref<FundMarketHistory | null>(null)
    const pending = ref(false)
    const error = ref<string | null>(null)

    let unsubscribe: (() => void) | null = null

    onMounted(() => {
        void refresh()
        unsubscribe = realtime.subscribe(scopes, handleRealtime)
    })

    onUnmounted(() => {
        unsubscribe?.()
    })

    async function refresh() {
        if (pending.value) {
            return
        }

        pending.value = true
        error.value = null

        try {
            history.value = await $fetch<FundMarketHistory>('/api/v1/fund/market-history', {
                method: 'POST',
                body: {
                    from: new Date(Date.now() - historyWindowMs).toISOString(),
                },
            })
        } catch (reason) {
            error.value = reason instanceof Error ? reason.message : 'Не удалось загрузить динамику за 24 часа.'
        } finally {
            pending.value = false
        }
    }

    function handleRealtime(event: RealtimeClientEvent) {
        if (event.type === 'resync') {
            void refresh()
            return
        }

        if (!history.value) {
            return
        }

        if (event.scopes.includes('instrument_prices')) {
            const instrumentID = state.value?.market.unit_price?.instrument_id
            const price = instrumentID
                ? event.instrument_prices.find(item => item.instrument_id === instrumentID)
                : null

            if (price) {
                upsertUnitPrice({
                    unit_value: price.unit_value,
                    currency: price.currency,
                    priced_at: price.priced_at,
                })
            }
        }

        if (event.scopes.includes('live_valuation') && event.live_valuation) {
            upsertLiveValue({
                observed_at: event.live_valuation.observed_at,
                estimated_nav_usd: event.live_valuation.estimated_nav_usd,
                estimated_calculated_unit_value_usd: event.live_valuation.estimated_calculated_unit_value_usd,
                live_delta_usd: event.live_valuation.live_delta_usd,
                live_coverage_percent: event.live_valuation.live_coverage_percent,
            })
        }

        trimHistory()
    }

    function upsertUnitPrice(value: IntradayMarketPrice) {
        if (!history.value) {
            return
        }

        const items = [...history.value.unit_prices]
        const index = items.findIndex(item => item.priced_at === value.priced_at)

        if (index >= 0) {
            items[index] = value
        } else {
            items.push(value)
            items.sort((left, right) => Date.parse(left.priced_at) - Date.parse(right.priced_at))
        }

        history.value = {
            ...history.value,
            unit_prices: items,
        }
    }

    function upsertLiveValue(value: LiveValuePoint) {
        if (!history.value) {
            return
        }

        const items = [...history.value.live_values]
        const index = items.findIndex(item => item.observed_at === value.observed_at)

        if (index >= 0) {
            items[index] = value
        } else {
            items.push(value)
            items.sort((left, right) => Date.parse(left.observed_at) - Date.parse(right.observed_at))
        }

        history.value = {
            ...history.value,
            live_values: items,
        }
    }

    function trimHistory() {
        if (!history.value) {
            return
        }

        const cutoff = Date.now() - historyWindowMs

        history.value = {
            unit_prices: history.value.unit_prices.filter(item => Date.parse(item.priced_at) >= cutoff),
            live_values: history.value.live_values.filter(item => Date.parse(item.observed_at) >= cutoff),
        }
    }

    return {
        history,
        pending,
        error,
        refresh,
    }
}
