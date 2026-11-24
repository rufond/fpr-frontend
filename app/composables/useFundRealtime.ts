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
    document.addEventListener('visibilitychange', refreshVisible)

    function refreshVisible() {
        if (document.visibilityState === 'visible') void refresh()
    }

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

        if (event.scopes.includes('instrument_prices') || event.scopes.includes('fx_rates')) {
            void refresh()
            return
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
        document.removeEventListener('visibilitychange', refreshVisible)
        unsubscribe()
    })
}
