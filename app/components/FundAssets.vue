<script setup lang="ts">
import InfoPopover from './InfoPopover.vue'
import type { FundAsset, FundInstrument, MarketPrice, PriceReturn } from '~/types/fund'
import type { ClosedPosition, EntryReference, Holding, PositionStart } from '~/types/portfolio'
import { formatDate, formatMarketTime, formatMoney, formatNumber, formatPercent, formatSignedMoney, formatSignedPercent, valueTone } from '~/utils/format'

const props = defineProps<{
  assets: FundAsset[]
  prices: Record<number, MarketPrice>
  valuations: Record<string, Holding>
  positionStarts: Record<string, PositionStart>
  asOf: string
}>()

const tabs = [
  { key: 'all', label: 'Все' },
  { key: 'bonds', label: 'Облигации' },
  { key: 'equities', label: 'Акции и ДР' },
  { key: 'other', label: 'Деньги и прочее' },
] as const
type AssetGroup = typeof tabs[number]['key']

interface TableRow {
  key: string
  name: string
  isin?: string
  ticker?: string
  type: string
  group: Exclude<AssetGroup, 'all'>
  quantity?: string | null
  asset?: FundAsset
  instrument?: FundInstrument | null
  price?: MarketPrice
  valuation?: Holding
  closed?: ClosedPosition
  entry?: EntryReference
  profit?: PriceReturn
  start?: PositionStart
}

const selected = ref<AssetGroup>('all')
const query = ref('')
const showClosed = ref(false)
const sortBy = ref<'share' | 'name'>('share')
const referenceLabels = {
  disclosure: 'Последняя оценка УК',
  sheet: 'На выходе по таблице автора',
  legacy: 'Котировка из бэкапа',
}
const providerLabels: Record<string, string> = { moex: 'Мосбиржа', yahoo: 'Yahoo Finance', kase: 'KASE', nasdaq: 'Nasdaq' }
const collator = new Intl.Collator('ru', { numeric: true })
const { data: archive, status: archiveStatus, error: archiveError, execute: loadArchive } =
  useLazyAsyncData('closed-holdings', () => $fetch<ClosedPosition[]>('/api/v1/portfolio/closed'), { immediate: false })

watch(showClosed, (show) => { if (show) void loadArchive() })
watch(() => props.asOf, () => { if (showClosed.value) void loadArchive() })
usePortfolioRealtime(() => { if (showClosed.value) void loadArchive() })

const activeRows = computed<TableRow[]>(() => props.assets.map((asset) => {
  const instrument = asset.instrument
  const valuation = instrument ? props.valuations[instrument.isin] : undefined
  const price = instrument ? props.prices[instrument.id] : undefined
  return {
    key: `active-${asset.row_no}`,
    name: instrument?.name || asset.source_name || asset.source_type,
    isin: instrument?.isin,
    ticker: instrument?.ticker || valuation?.ipo?.ticker || price?.symbol,
    type: asset.source_type,
    group: instrument ? (instrument.asset_type === 'bond' ? 'bonds' : 'equities') : 'other',
    quantity: asset.quantity,
    start: instrument ? props.positionStarts[instrument.isin] : undefined,
    asset, instrument, price, valuation, entry: valuation?.ipo, profit: price?.entry_return,
  }
}))

const closedRows = computed<TableRow[]>(() => {
  if (!showClosed.value || !archive.value) return []
  const active = new Set(activeRows.value.map(row => row.isin))
  return archive.value.filter(item => !active.has(item.isin)).map((item) => {
    const valuation = props.valuations[item.isin]
    return {
      key: `closed-${item.isin}`, name: item.name, isin: item.isin,
      ticker: item.ticker || valuation?.ipo?.ticker,
      type: item.kind === 'bond' ? 'Облигации' : item.kind === 'depositary_receipt' ? 'Депозитарные расписки' : 'Акции',
      group: item.kind === 'bond' ? 'bonds' : 'equities',
      start: props.positionStarts[item.isin],
      quantity: item.quantity, valuation, closed: item, entry: item.entry ?? valuation?.ipo, profit: item.exit?.return,
    }
  })
})

const rows = computed(() => {
  const terms = query.value.toLocaleLowerCase('ru').trim().split(/\s+/).filter(Boolean)
  const filtered = (row: TableRow) => {
    if (selected.value !== 'all' && row.group !== selected.value) return false
    const text = [row.name, row.type, row.isin, row.ticker, row.instrument?.issuer,
      row.asset?.source_name, row.asset?.currency].join(' ').toLocaleLowerCase('ru')
    return terms.every(term => text.includes(term))
  }
  const active = activeRows.value.filter(filtered).sort((a, b) => {
    if (sortBy.value === 'name') return collator.compare(a.name, b.name)
    return Number(b.asset?.asset_share_percent ?? 0) - Number(a.asset?.asset_share_percent ?? 0)
      || Number(a.asset?.asset_share_upper_bound) - Number(b.asset?.asset_share_upper_bound)
  })
  const closed = closedRows.value.filter(filtered)
  if (sortBy.value === 'name') closed.sort((a, b) => collator.compare(a.name, b.name))
  return [...active, ...closed]
})

const showQuotes = computed(() => selected.value !== 'other')
const showReturns = computed(() => showQuotes.value && selected.value !== 'bonds')
const columnCount = computed(() => 3 + Number(showQuotes.value) + 2 * Number(showReturns.value))

function shareText(asset: FundAsset) {
  return (asset.asset_share_upper_bound ? '< ' : '') + formatPercent(asset.asset_share_percent, 2)
}

function hasShareChange(value?: string) {
  return value != null && Math.abs(Number(value)) >= 0.005
}

function shareChange(value: string) {
  return `${Number(value) > 0 ? '+' : ''}${formatNumber(value, 2)} п. п.`
}

function closeRange(item: ClosedPosition) {
  if (!item.last_seen || !item.first_absent) return null
  const from = formatDate(item.last_seen)
  const to = formatDate(item.first_absent)
  return `${item.last_seen.slice(0, 4) === item.first_absent.slice(0, 4) ? from.slice(0, 5) : from} – ${to}`
}
</script>

<template>
  <section class="holdings" aria-labelledby="assets-title">
    <div class="section-header">
      <h2 id="assets-title">Состав фонда <span>{{ assets.length }} поз.</span></h2>
      <label class="search">
        <svg viewBox="0 0 16 16" width="15" height="15" fill="none" aria-hidden="true">
          <circle cx="6.6" cy="6.6" r="4.15" stroke="currentColor" stroke-width="1.25"/>
          <path d="m9.8 9.8 3.3 3.3" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
        </svg>
        <input v-model="query" type="search" aria-label="Поиск по составу фонда" placeholder="Название, тикер или ISIN">
      </label>
    </div>

    <div class="table-panel">
      <div class="controls">
        <div class="filters" role="group" aria-label="Тип актива">
          <button v-for="tab in tabs" :key="tab.key" type="button" :aria-pressed="selected === tab.key" @click="selected = tab.key">
            {{ tab.label }}
          </button>
        </div>

        <div class="table-actions">
          <label class="archive-toggle">
            <input v-model="showClosed" type="checkbox">
            <span>Показать закрытые</span>
          </label>
          <label class="sort">
            <span class="sr-only">Сортировка</span>
            <select v-model="sortBy">
              <option value="share">По доле</option>
              <option value="name">По названию</option>
            </select>
          </label>
        </div>
      </div>

      <div v-if="showClosed && archiveStatus === 'pending'" class="table-state" role="status">Загружаем закрытые позиции…</div>
      <div v-else-if="showClosed && archiveError" class="table-state" role="alert">
        Архив позиций недоступен. <button type="button" @click="loadArchive()">Повторить</button>
      </div>
      <div class="table-scroll" tabindex="0" role="region" aria-label="Позиции фонда">
        <table>
          <thead>
            <tr>
              <th scope="col">Актив</th>
              <th v-if="showQuotes" scope="col" class="numeric">Цена / за день</th>
              <th v-if="showReturns" scope="col" class="numeric">Результат</th>
              <th v-if="showReturns" scope="col" class="numeric">Цена входа</th>
              <th scope="col" class="numeric">Количество</th>
              <th scope="col" class="numeric">Доля</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.key" :class="{ archived: row.closed }">
              <th scope="row" class="asset-name">
                <div class="asset-line">
                  <InfoPopover :aria-label="row.start ? `${row.name}, в составе к ${formatDate(row.start.first_seen)}` : `${row.name}, сведения об активе`">
                    <span class="asset-caption">
                      <span class="asset-title" :class="{ 'ticker-first': row.ticker }">
                        <strong v-if="row.ticker">{{ row.ticker }}</strong>
                        <span>{{ row.name }}</span>
                      </span>
                      <time v-if="row.start" class="asset-since" :datetime="row.start.first_seen">к {{ formatDate(row.start.first_seen) }}</time>
                    </span>
                    <template #detail>
                      <strong>{{ row.name }}</strong>
                      <span class="detail-line">{{ [row.ticker, row.isin, row.type].filter(Boolean).join(' · ') }}</span>
                      <span v-if="row.start" class="detail-line">
                        <template v-if="row.start.previous_absent">Позиция появилась после {{ formatDate(row.start.previous_absent) }}, не позднее </template>
                        <template v-else>В составе к </template>
                        <a :href="row.start.source_url" target="_blank" rel="noopener noreferrer">{{ formatDate(row.start.first_seen) }}</a>
                      </span>
                      <template v-if="row.instrument?.bond_details">
                        <span v-if="row.instrument.bond_details.nominal_value" class="detail-line">Номинал {{ formatMoney(row.instrument.bond_details.nominal_value, row.instrument.bond_details.nominal_currency) }}</span>
                        <span v-if="row.instrument.bond_details.coupon_rate_percent" class="detail-line">Купон {{ formatPercent(row.instrument.bond_details.coupon_rate_percent, 4) }}</span>
                      </template>
                      <span v-if="row.instrument?.bond_details?.maturity_date || row.valuation?.maturity" class="detail-line">Погашение {{ formatDate(row.instrument?.bond_details?.maturity_date ?? row.valuation?.maturity) }}</span>
                      <span v-if="row.asset?.currency" class="detail-line">{{ row.asset.currency }}</span>
                    </template>
                  </InfoPopover>
                  <span v-if="row.closed" class="closed-status">
                    <a v-if="row.closed.conversion" class="closed-label" :href="row.closed.conversion.source_url" target="_blank" rel="noopener" :aria-label="`Конвертация в ${row.closed.conversion.to_ticker} · ${row.closed.conversion.ratio}`">{{ row.closed.conversion.to_ticker }} ↗</a>
                    <span v-else class="closed-label">Закрыта</span>
                    <span>{{ row.closed.conversion ? formatDate(row.closed.conversion.date) : closeRange(row.closed) ?? 'Дата неизвестна' }}</span>
                  </span>
                </div>
              </th>
              <td v-if="showQuotes" class="numeric">
                <InfoPopover v-if="row.closed?.exit" :aria-label="`Цена выхода ${row.name}, источник`">
                  <span class="estimated">≈{{ formatMoney(row.closed.exit.price, row.closed.exit.currency, 4) }}</span>
                  <template #detail>
                    <strong>{{ referenceLabels[row.closed.exit.basis] }}</strong>
                    <span v-if="row.closed.exit.date" class="detail-line">{{ formatDate(row.closed.exit.date) }}</span>
                    <span v-if="!row.closed.conversion" class="detail-line">Фактическая цена сделки неизвестна</span>
                  </template>
                </InfoPopover>
                <template v-else-if="!row.closed">
                  <PriceDay
                    v-if="row.price && row.isin && !row.price.archived"
                    :isin="row.isin" :name="row.name" :value="row.price.unit_value" :currency="row.price.currency"
                    :priced-at="row.price.priced_at" :digits="4" :source="providerLabels[row.price.provider ?? ''] ?? row.price.provider"
                    :day-change="row.price.day_change" :position-value="row.price.position_value"
                  />
                  <InfoPopover v-else-if="row.asset?.disclosure_unit_estimate_usd" :aria-label="`Приблизительная цена ${row.name} по данным УК`">
                    <span class="estimated">≈{{ formatMoney(row.asset.disclosure_unit_estimate_usd, 'USD') }}</span>
                    <template #detail>
                      <strong>Оценка по раскрытию УК от {{ formatDate(asOf) }}</strong>
                      <span class="detail-line">СЧА × доля актива ÷ количество. СЧА используется как приближение к общей стоимости активов.</span>
                      <span v-if="row.price" class="detail-line">Архивная котировка {{ formatMoney(row.price.unit_value, row.price.currency, 4) }} · {{ formatDate(row.price.priced_at.slice(0, 10)) }}</span>
                    </template>
                  </InfoPopover>
                  <InfoPopover v-else-if="row.price" :aria-label="`Последняя известная котировка ${row.name}`">
                    <span class="muted">{{ formatMoney(row.price.unit_value, row.price.currency, 4) }}</span>
                    <template #detail>
                      <strong>Архивная котировка</strong>
                      <span class="detail-line">{{ providerLabels[row.price.provider ?? ''] ?? row.price.provider }} · {{ formatMarketTime(row.price.priced_at) }}</span>
                    </template>
                  </InfoPopover>
                  <span v-else class="muted">—</span>
                </template>
                <span v-else class="muted">—</span>
              </td>
              <td v-if="showReturns" class="numeric">
                <component v-if="row.profit" :is="row.profit.approximate || row.price?.entry_fx || row.price?.archived ? InfoPopover : 'span'">
                  <span :class="valueTone(row.profit.percent)" class="values-inline">
                    <strong v-if="row.profit.total">{{ row.profit.approximate ? '≈' : '' }}{{ formatSignedMoney(row.profit.total, 'USD', 0) }}</strong>
                    <sup v-if="row.profit.total" class="value-delta">{{ formatSignedPercent(row.profit.percent, 1) }}</sup>
                    <span v-else>{{ row.profit.approximate ? '≈' : '' }}{{ formatSignedPercent(row.profit.percent, 1) }}</span>
                  </span>
                  <template #detail>
                    <span v-if="row.profit.approximate" class="detail-line">Расчёт по приблизительной цене входа</span>
                    <span v-if="row.price?.entry_fx" class="detail-line">$1 = {{ formatMoney(row.price.entry_fx.rate, row.price.currency, 4) }} · {{ formatMarketTime(row.price.entry_fx.priced_at) }}</span>
                    <span v-if="row.price?.archived" class="detail-line">Архивная котировка</span>
                  </template>
                </component>
                <span v-else class="muted">—</span>
              </td>
              <td v-if="showReturns" class="numeric">
                <InfoPopover v-if="row.entry?.entry_price_usd" :aria-label="`Цена входа ${row.name}, источник`">
                  {{ row.entry.approximate ? '≈' : '' }}{{ formatMoney(row.entry.entry_price_usd, 'USD', 4) }}
                  <template #detail>
                    <strong v-if="row.entry.source === 'reported_trade'">Сделка по данным «Коммерсанта»</strong>
                    <strong v-else>{{ row.entry.source === 'legacy' ? 'Прежний FPR' : 'Таблица автора' }}</strong>
                    <span v-if="row.entry.approximate" class="detail-line">Приблизительная цена входа</span>
                    <span v-if="row.entry.date" class="detail-line">{{ row.entry.source === 'reported_trade' ? 'Дата сделки' : row.entry.source === 'legacy' ? 'Дата в прежнем FPR' : 'IPO' }} {{ formatDate(row.entry.date) }}</span>
                    <span v-if="row.entry.split_adjusted" class="detail-line">Цена с учётом сплита</span>
                    <span v-if="row.profit?.entry_value" class="detail-line">{{ formatMoney(row.profit.entry_value, 'USD') }} за позицию</span>
                  </template>
                </InfoPopover>
                <span v-else class="muted">—</span>
              </td>
              <td class="numeric">{{ formatNumber(row.quantity, 4) }}</td>
              <td class="numeric share">
                <template v-if="row.asset">
                  <InfoPopover v-if="row.asset.previous_share_date && row.asset.share_change_pp && hasShareChange(row.asset.share_change_pp)"
                    :aria-label="`Доля ${row.name}, ${shareText(row.asset)}, изменение ${shareChange(row.asset.share_change_pp)}`">
                    <strong :class="valueTone(row.asset.share_change_pp)">{{ shareText(row.asset) }}</strong>
                    <template #detail>
                      <strong>Изменение доли {{ shareChange(row.asset.share_change_pp) }}</strong>
                      <span class="detail-line">{{ formatDate(row.asset.previous_share_date) }} → {{ formatDate(asOf) }}</span>
                    </template>
                  </InfoPopover>
                  <strong v-else>{{ shareText(row.asset) }}</strong>
                </template>
                <span v-else class="muted">—</span>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td :colspan="columnCount" class="empty">{{ query.trim() ? 'По этому запросу ничего не найдено.' : 'В этой категории нет позиций.' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <a v-if="selected === 'bonds'" class="kase-link" href="https://kase.kz/ru/app-gateway/documents/marketvaluation/" target="_blank" rel="noopener noreferrer">Рыночная оценка KASE ↗</a>
  </section>
</template>

<style scoped>
.holdings { min-width: 0; }
.section-header, .controls, .table-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 9px 14px; }
.section-header { justify-content: space-between; margin-bottom: 9px; }
h2 { display: flex; gap: 9px; align-items: baseline; margin: 0; font-size: 1.28rem; font-weight: 675; letter-spacing: -.028em; }
h2 span { color: var(--muted); font-size: .73rem; font-weight: 500; letter-spacing: 0; white-space: nowrap; }
.search { display: flex; align-items: center; gap: 7px; padding: 0 10px; border: 1px solid var(--border); border-radius: 5px; color: var(--muted); background: var(--surface); }
.search:focus-within { border-color: #a892c7; }
.search input { width: 175px; min-width: 0; background: transparent; color: var(--ink); border: 0; padding: 7px 0; font-size: .78rem; outline-offset: -1px; }
.table-panel { border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); }
.controls { justify-content: space-between; padding: 8px 13px; }
.filters { display: flex; gap: 2px; flex-wrap: wrap; }
.filters button { border: 0; border-radius: 4px; padding: 5px 8px; background: transparent; color: var(--muted); font-size: .79rem; font-weight: 550; }
.filters button[aria-pressed="true"] { color: var(--accent); background: var(--accent-soft); font-weight: 650; }
.filters button:hover { color: var(--accent); }
.archive-toggle { display: inline-flex; align-items: center; gap: 5px; color: var(--ink); font-size: .79rem; cursor: pointer; }
.archive-toggle input { accent-color: var(--accent); width: 15px; height: 15px; }
.sr-only { position: absolute; width: 1px; height: 1px; clip-path: inset(50%); overflow: hidden; white-space: nowrap; }
.sort select { border: 1px solid var(--border); border-radius: 4px; background: var(--surface); color: var(--muted); padding: 4px 5px; font-size: .77rem; }
.table-scroll { overflow-x: auto; border-radius: 0 0 var(--radius) var(--radius); }
.table-scroll:focus-visible { outline-offset: -2px; }
table { width: 100%; border-collapse: separate; border-spacing: 0; }
thead { background: #f5f2f8; }
thead th { color: #5c526c; font-size: .73rem; font-weight: 620; white-space: nowrap; border-bottom: 1px solid #eae5f0; }
td, th { text-align: left; padding: 7px 9px; font-size: .82rem; }
td:first-child, th:first-child { padding-left: 13px; }
td:last-child, th:last-child { padding-right: 14px; }
tbody tr { background: var(--surface); }
tbody tr + tr > * { border-top: 1px solid #efedf2; }
tbody tr:hover { background: #faf7fd; }
tbody tr.archived { background: #f6f3f7; }
tbody tr.archived:hover { background: #f0ecf4; }
tbody tr:not(.archived) + tr.archived > * { border-top: 1px solid #ded5e8; }
.asset-name { width: 41%; max-width: 0; min-width: 170px; }
.asset-line { display: flex; align-items: baseline; gap: 7px; min-width: 0; }
.archived .asset-line { display: grid; grid-template-columns: minmax(0, 1fr); justify-items: start; gap: 2px; }
.asset-line > button { min-width: 0; overflow: hidden; }
.asset-caption { display: flex; align-items: baseline; gap: 3px 7px; max-width: 100%; }
.asset-title { display: flex; align-items: baseline; gap: 6px; min-width: 0; white-space: nowrap; }
.asset-title span { overflow: hidden; text-overflow: ellipsis; font-weight: 610; }
.asset-since { flex-shrink: 0; color: var(--muted); font-size: .7rem; font-variant-numeric: tabular-nums; font-weight: 450; white-space: nowrap; }
.ticker-first span { color: var(--muted); font-weight: 490; }
.closed-status { display: flex; flex-wrap: wrap; align-items: baseline; gap: 1px 4px; max-width: 100%; color: #685d76; font-size: .7rem; font-weight: 500; }
.closed-label { color: #5b4b70; font-weight: 640; }
a.closed-label { text-underline-offset: 2px; }
.numeric { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.values-inline { display: inline-flex; align-items: baseline; gap: 5px; }
.values-inline strong { font-weight: 650; }
.detail-line { display: block; margin-top: 4px; color: var(--muted); font-size: .74rem; }
.estimated, .muted { color: var(--muted); }
.positive { color: var(--positive); }
.negative { color: var(--negative); }
.empty, .table-state { margin: 0; padding: 11px 13px; color: var(--muted); font-size: .8rem; }
.table-state button { border: 0; background: none; color: var(--accent); text-decoration: underline; }
.kase-link { display: inline-block; margin-top: 7px; font-size: .75rem; text-underline-offset: 3px; }
@media (max-width: 690px) {
  .controls { padding-inline: 9px; }
  .search { flex: 1 1 145px; max-width: 215px; }
  .search input { width: 100%; }
  tbody th:first-child, thead th:first-child { position: sticky; left: 0; min-width: 138px; padding-left: 9px; background: inherit; box-shadow: 1px 0 #eae5f0; }
  thead th:first-child { background: #f5f2f8; }
  .asset-caption { display: grid; grid-template-columns: minmax(0, 1fr); row-gap: 1px; }
  .closed-status { font-size: .65rem; }
}
</style>
