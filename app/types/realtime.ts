import type { FXRate, LiveValuation, MarketPrice } from '~/types/fund'

export type RealtimeScope =
    | 'diagnostics'
    | 'fund_history'
    | 'fund_state'
    | 'fx_rates'
    | 'instrument_prices'
    | 'live_valuation'
    | 'scheduler'

export type RealtimeConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected'

export interface RealtimeServerEvent {
    type: 'hello' | 'changed'
    generation_id: string
    revision: number
    occurred_at: string
    scopes: RealtimeScope[]
    instrument_ids: number[]
    instrument_prices: MarketPrice[]
    fx_rates: RealtimeFXRate[]
    live_valuation: LiveValuation | null
}

export interface RealtimeFXRate extends FXRate {
    base_currency: string
    quote_currency: string
}

export interface RealtimeClientEvent extends Omit<RealtimeServerEvent, 'type'> {
    type: 'changed' | 'resync'
}
