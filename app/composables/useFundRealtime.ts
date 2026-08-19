import { onUnmounted } from 'vue'
import type { RealtimeClientEvent, RealtimeScope } from '~/types/realtime'
import {useRealtime} from "~/composables/useRealtime.ts";

const initialHTTPFallbackDelay = 200

const scopes: RealtimeScope[] = [
    'fund_state',
    'instrument_prices',
    'fx_rates',
    'live_valuation',
]

export function useFundRealtime() {
    if (!import.meta.client) {
        return
    }

    const realtime = useRealtime()
    const { state, pending, refresh } = useFundState()

    let initialRefreshStarted = false
    let helloReceived = false

    const fallbackTimer = setTimeout(() => {
        initialRefreshStarted = true
        void refresh()
    }, initialHTTPFallbackDelay)

    const unsubscribe = realtime.subscribe(scopes, handleEvent)

    function handleEvent(event: RealtimeClientEvent) {
        if (event.type === 'resync') {
            if (!helloReceived) {
                helloReceived = true
                clearTimeout(fallbackTimer)

                if (!initialRefreshStarted) {
                    initialRefreshStarted = true
                    void refresh()
                    return
                }
            }

            void refresh()
            return
        }

        if (event.scopes.includes('fund_state')) {
            void refresh()
            return
        }

        if (!state.value) {
            void refresh()
            return
        }

        if (pending.value) {
            void refresh()
            return
        }

        if (event.scopes.includes('instrument_prices') && state.value.market.unit_price) {
            const unitPrice = event.instrument_prices.find(
                price => price.instrument_id === state.value?.market.unit_price?.instrument_id,
            )

            if (unitPrice) {
                state.value = {
                    ...state.value,
                    market: {
                        ...state.value.market,
                        unit_price: unitPrice,
                    },
                }
            }
        }

        if (event.scopes.includes('fx_rates')) {
            const usdRub = event.fx_rates.find(
                rate => rate.base_currency === 'USD' && rate.quote_currency === 'RUB',
            )

            if (usdRub) {
                state.value = {
                    ...state.value,
                    market: {
                        ...state.value.market,
                        usd_rub: {
                            rate: usdRub.rate,
                            priced_at: usdRub.priced_at,
                        },
                    },
                }
            }
        }

        if (event.scopes.includes('live_valuation') && event.live_valuation) {
            state.value = {
                ...state.value,
                market: {
                    ...state.value.market,
                    live_valuation: event.live_valuation,
                },
            }
        }
    }

    onUnmounted(() => {
        clearTimeout(fallbackTimer)
        unsubscribe()
    })
}
