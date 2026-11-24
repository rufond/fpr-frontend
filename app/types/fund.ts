export interface FundState {
  official_snapshot: OfficialSnapshot
  market: MarketState
}

export interface OfficialSnapshot {
  as_of_date: string
  observed_at: string
  calculated_unit_value_usd: string
  nav_usd: string
  unit_count?: FundUnitCount | null
  assets: FundAsset[]
  categories: FundCategory[]
}

export interface FundUnitCount {
  as_of_date: string
  units_outstanding: string
  source_url: string
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
  share_change_pp?: string
  previous_share_date?: string
  disclosure_unit_estimate_usd?: string
}

export interface FundInstrument {
  id: number
  asset_type: string
  isin: string
  name: string
  issuer?: string
  ticker?: string
  bond_details?: BondDetails
}

export interface BondDetails {
  nominal_value?: string
  nominal_currency?: string
  maturity_date?: string
  coupon_rate_percent?: string
}

export interface FundCategory {
  row_no: number
  source_name: string
  asset_share_percent: string
}

export interface MarketState {
  unit_price: MarketPrice | null
  unit_price_usd?: string
  asset_prices?: Record<number, MarketPrice>
  usd_rub: FXRate | null
  live_valuation: LiveValuation | null
}

export interface MarketPrice {
  instrument_id: number
  provider?: string
  fund_unit?: boolean
  position_value?: string
  previous_close?: string
  day_change?: PriceReturn
  entry_return?: PriceReturn
  entry_fx?: FXRate
  archived?: boolean
  symbol?: string
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
  live_delta_percent?: string
  live_coverage_percent: string
}

export interface IntradayMarketPrice {
  unit_value: string
  currency: string
  priced_at: string
}

export interface LiveValuePoint {
  observed_at: string
  estimated_nav_usd: string
  estimated_calculated_unit_value_usd: string
  live_delta_usd: string
  live_coverage_percent: string
}

export interface PriceReturn {
  unit_change: string
  percent: string
  total?: string
  entry_value?: string
  approximate?: boolean
}

export interface MarketHistory {
  live_values?: LiveValuePoint[]
  unit_prices: IntradayMarketPrice[]
  unit_prices_usd?: IntradayMarketPrice[]
  unit_change?: string
  unit_change_percent?: string
  usd_rub?: FXRate
}
