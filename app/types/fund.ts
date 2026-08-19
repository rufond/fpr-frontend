export interface FundState {
  official_snapshot: OfficialSnapshot
  market: MarketState
}

export interface OfficialSnapshot {
  as_of_date: string
  observed_at: string
  calculated_unit_value_usd: string
  nav_usd: string
  assets: FundAsset[]
  categories: FundCategory[]
}

export interface FundAsset {
  row_no: number
  source_name: string
  source_type: string
  instrument: FundInstrument | null
  currency: string | null
  quantity: string | null
  asset_share_percent: string
  asset_share_upper_bound: boolean
}

export interface FundInstrument {
  id: number
  asset_type: string
  isin: string
  name: string
  issuer?: string
  ticker?: string
}

export interface FundCategory {
  row_no: number
  source_name: string
  asset_share_percent: string
}

export interface MarketState {
  unit_price: MarketPrice | null
  usd_rub: FXRate | null
  live_valuation: LiveValuation | null
}

export interface MarketPrice {
  instrument_id: number
  unit_value: string
  currency: string
  priced_at: string
}

export interface FXRate {
  rate: string
  priced_at: string
}

export interface LiveValuation {
  observed_at: string
  estimated_nav_usd: string
  estimated_calculated_unit_value_usd: string
  estimated_calculated_unit_value_rub: string | null
  premium_discount_percent: string | null
  live_delta_usd: string
  live_coverage_percent: string
}
