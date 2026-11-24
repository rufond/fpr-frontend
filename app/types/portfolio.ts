import type { PriceReturn } from '~/types/fund'

export interface Observation {
  isin: string
  name: string
  kind: string
  currency?: string
  maturity?: string
  quantity: string
  value: string
  unit_value: string
  asset_share: string
  nav_share: string
  as_of_date: string
  report_currency: string
  source_url: string
}

export interface EntryReference {
  isin?: string
  ticker: string
  name: string
  date?: string
  quantity?: string
  entry_price_usd?: string
  reference_price_usd?: string
  reference_date?: string
  previous_legacy_price_usd?: string
  lockup_end?: string
  source_url?: string
  source?: 'legacy' | 'reported_trade'
  approximate?: boolean
  split_adjusted?: boolean
  closed_in_legacy?: boolean
}

export interface Holding extends Observation {
  previous?: Observation
  quantity_change?: string
  value_change?: string
  unit_change_percent?: string
  ipo?: EntryReference
  ipo_comparison_usd?: string
  ipo_comparison_percent?: string
}

export interface PositionStart {
  first_seen: string
  previous_absent?: string
  source_url: string
}

export interface PortfolioIndex {
  latest_valuations: Record<string, Holding>
  position_starts?: Record<string, PositionStart>
}

export interface ClosingReference {
  price: string
  currency: string
  basis: 'disclosure' | 'sheet' | 'legacy'
  date?: string
  source_url?: string
  return?: PriceReturn
}

export interface ClosedPosition {
  conversion?: { to_ticker: string, ratio: string, date: string, source_url: string }
  entry?: EntryReference
  exit?: ClosingReference
  isin: string
  name: string
  kind: string
  ticker?: string
  quantity?: string
  last_seen?: string
  first_absent?: string
  from_source?: string
  to_source?: string
}
