export type PriceSourceProvider = 'moex' | 'yahoo' | 'kase' | 'nasdaq'

export interface AdminPriceSource {
    id: number
    provider: PriceSourceProvider
    provider_symbol: string
    enabled: boolean
}

export interface AdminPriceSourceInstrument {
    instrument_id: number
    asset_type: string
    isin: string
    name: string
    ticker?: string
    sources: AdminPriceSource[]
}

export interface AdminPriceSourcesResult {
    items: AdminPriceSourceInstrument[]
}

export interface SetPriceSourceRequest {
    instrument_id: number
    provider: PriceSourceProvider
    provider_symbol: string
    enabled: boolean
}

export interface SetPriceSourceResult {
    changed: boolean
    instrument_id: number
    source: AdminPriceSource
}
