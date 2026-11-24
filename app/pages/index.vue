<script setup lang="ts">
import { fundInfo } from '~/data/fund'
import { formatDate, formatMoney, formatNumber, formatPercent, formatSignedMoney, formatSignedPercent, valueTone } from '~/utils/format'

const { state, pending, error, refresh } = useFundState()
useFundRealtime()

const { data: portfolio } = usePortfolioIndex()
const snapshot = computed(() => state.value?.official_snapshot)
const market = computed(() => state.value?.market)
const unitPrice = computed(() => market.value?.unit_price)
const live = computed(() => market.value?.live_valuation)
const hasCoverage = computed(() => Number(live.value?.live_coverage_percent) > 0)
const currentNAV = computed(() => hasCoverage.value ? live.value?.estimated_nav_usd : undefined)
const comparison = computed(() => {
  const raw = live.value?.premium_discount_percent
  if (!hasCoverage.value || raw == null) return null
  const value = Number(raw)
  return {
    label: value < 0 ? 'Дисконт' : value > 0 ? 'Премия' : 'На уровне оценки',
    amount: `${value > 0 ? '+' : ''}${formatPercent(raw)}`,
    tone: value < 0 ? 'discount' : value > 0 ? 'premium' : 'neutral',
  }
})
</script>

<template>
  <a href="#main" class="skip-link">Перейти к содержимому</a>
  <header class="site-header">
    <div class="container header-inner">
      <a href="/" class="brand" aria-label="FPR — главная">
        <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
        FPR
      </a>
      <nav aria-label="Навигация по странице">
        <a v-if="snapshot" href="#assets">Состав фонда</a>
      </nav>
    </div>
  </header>

  <main id="main" class="container page">
    <section class="intro" aria-labelledby="fund-title">
      <div>
        <h1 id="fund-title">{{ fundInfo.name }}</h1>
        <p class="intro-note">Неофициальная таблица</p>
      </div>
      <a v-if="snapshot" class="report-link" :href="fundInfo.officialUrl" target="_blank" rel="noopener noreferrer">
        <span>Состав от</span>
        <time :datetime="snapshot.as_of_date">{{ formatDate(snapshot.as_of_date) }}</time>
        <span aria-hidden="true">↗</span>
      </a>
    </section>

    <div v-if="error" class="notice" role="alert">
      <div>
        <strong>Не удалось обновить данные фонда</strong>
        <div>{{ state ? 'Показаны последние загруженные данные.' : 'Проверьте подключение или попробуйте позже.' }}</div>
      </div>
      <button type="button" :disabled="pending" @click="refresh">Повторить</button>
    </div>
    <p v-else-if="!state" class="notice" role="status">Загружаем данные фонда…</p>

    <template v-if="snapshot">
      <div class="overview">
        <section class="quote-panel" aria-label="Основные показатели фонда">
          <div class="market-summary">
            <div class="price-block">
              <h2>Биржевая цена пая</h2>
              <div class="quote-value" :class="valueTone(unitPrice?.day_change?.unit_change ?? '')">
                <PriceDay v-if="unitPrice" :isin="fundInfo.unitISIN" :value="unitPrice.unit_value" :currency="unitPrice.currency" :priced-at="unitPrice.priced_at" name="Биржевая цена пая" />
                <span v-else>—</span>
                <span v-if="unitPrice && market?.unit_price_usd && market.usd_rub" class="quote-usd">
                  <PriceDay
                    :isin="fundInfo.unitISIN" :value="market.unit_price_usd" currency="USD"
                    :priced-at="unitPrice.priced_at" :conversion-rate="market.usd_rub.rate"
                    name="Биржевая цена пая в долларах"
                  />
                </span>
              </div>
              <p v-if="unitPrice?.day_change" class="day-change">
                <strong :class="valueTone(unitPrice.day_change.unit_change)">
                  {{ formatSignedMoney(unitPrice.day_change.unit_change, unitPrice.currency) }} · {{ formatSignedPercent(unitPrice.day_change.percent) }}
                </strong>
                за день
              </p>
              <div v-if="comparison" class="spread" :class="comparison.tone" title="Биржевая цена относительно оценки пая по котировкам">
                <span>{{ comparison.label }}</span>
                <strong>{{ comparison.amount }}</strong>
              </div>
            </div>
            <FundNAVChart
              class="nav-block" :live="currentNAV ? live ?? undefined : undefined"
              :official-value="snapshot.nav_usd" :official-date="snapshot.as_of_date"
            />
          </div>

          <dl class="metrics">
            <div>
              <dt>РСИП по данным УК</dt>
              <dd>{{ formatMoney(snapshot.calculated_unit_value_usd, 'USD', 4) }}</dd>
            </div>
            <div>
              <dt>Оценка пая по котировкам</dt>
              <dd v-if="hasCoverage && live">
                {{ live.estimated_calculated_unit_value_rub
                  ? formatMoney(live.estimated_calculated_unit_value_rub, 'RUB')
                  : formatMoney(live.estimated_calculated_unit_value_usd, 'USD', 4) }}
              </dd>
              <dd v-else>—</dd>
            </div>
            <div v-if="currentNAV">
              <dt>СЧА по данным УК</dt>
              <dd>
                {{ formatMoney(snapshot.nav_usd, 'USD', 0) }}
                <small v-if="snapshot.unit_count" :title="formatDate(snapshot.unit_count.as_of_date)">{{ formatNumber(snapshot.unit_count.units_outstanding, 4) }} паёв</small>
              </dd>
            </div>
            <div>
              <dt>Доллар / рубль</dt>
              <dd>{{ formatMoney(market?.usd_rub?.rate, 'RUB', 4) }}</dd>
            </div>
          </dl>
        </section>

        <FundAllocation :categories="snapshot.categories" />
      </div>

      <FundAssets
        id="assets" :as-of="snapshot.as_of_date" :assets="snapshot.assets" :prices="market?.asset_prices ?? {}"
        :valuations="portfolio?.latest_valuations ?? {}" :position-starts="portfolio?.position_starts ?? {}"
      />
    </template>
  </main>

</template>

<style scoped>
.container { width: min(1320px, calc(100% - 64px)); margin-inline: auto; }
.skip-link { position: absolute; z-index: 2; inset: 10px auto auto 10px; transform: translateY(-160%); background: white; padding: 10px; }
.skip-link:focus { transform: none; }
.site-header { background: #fdfcfe; border-bottom: 1px solid var(--border); }
.header-inner { min-height: 61px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.brand { display: inline-flex; align-items: center; gap: 9px; color: var(--ink); font-size: .94rem; font-weight: 750; letter-spacing: .1em; text-decoration: none; }
.brand-mark { width: 29px; height: 29px; display: flex; align-items: end; justify-content: center; gap: 3px; padding-bottom: 7px; border-radius: 6px; background: #e9e3f5; }
.brand-mark i { width: 3px; border-radius: 1px; background: #6d5aa0; height: 6px; }
.brand-mark i:nth-child(2) { height: 10px; }
.brand-mark i:nth-child(3) { height: 14px; }
nav { display: flex; gap: 24px; align-items: center; }
nav a { color: #565064; font-size: .84rem; font-weight: 550; text-decoration: none; }
nav a:hover, .report-link:hover { color: var(--accent); text-decoration: underline; text-underline-offset: 4px; }
.page { padding-block: 26px 36px; min-height: 67vh; }
.intro { display: flex; align-items: end; justify-content: space-between; gap: 8px 20px; flex-wrap: wrap; margin-bottom: 17px; }
h1 { margin: 0; font-size: clamp(1.7rem, 3.6vw, 2.45rem); line-height: 1.1; letter-spacing: -.04em; font-weight: 690; }
.intro-note { margin: 5px 0 0; color: var(--muted); font-size: .81rem; }
.report-link { display: inline-flex; flex: none; align-items: baseline; gap: 6px; color: var(--muted); font-size: .78rem; text-decoration: none; }
.report-link time { color: var(--ink); font-weight: 650; font-variant-numeric: tabular-nums; }
.report-link span:last-child { color: var(--accent); }
.overview { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr); gap: 16px; margin-bottom: 24px; }
.quote-panel { min-width: 0; display: flex; flex-direction: column; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); }
.market-summary { flex: auto; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.38fr); align-items: center; gap: 10px 20px; padding: 16px 20px; border-radius: var(--radius) var(--radius) 0 0; background: linear-gradient(108deg, #f4effa, #f9f7fb 80%); }
.price-block h2 { margin: 0 0 4px; color: #615475; font-weight: 580; font-size: .83rem; }
.quote-value { display: flex; align-items: baseline; flex-wrap: wrap; gap: 3px 12px; color: #32234c; font-size: clamp(1.95rem, 3.65vw, 2.92rem); font-weight: 690; line-height: 1.12; letter-spacing: -.05em; font-variant-numeric: tabular-nums; }
.quote-usd { color: #615475; font-size: clamp(.95rem, 1.55vw, 1.24rem); letter-spacing: -.02em; }
.nav-block { min-width: 0; border-left: 1px solid #e5deee; padding-left: 20px; }
.day-change { margin: 5px 0 0; color: var(--muted); font-size: .76rem; }
.positive { color: var(--positive); }
.negative { color: var(--negative); }
.spread { display: flex; align-items: baseline; gap: 5px; margin-top: 5px; color: #615475; font-size: .76rem; }
.spread strong { color: #54406c; font-size: .79rem; font-variant-numeric: tabular-nums; }
.spread.premium strong { color: var(--positive); }
.spread.discount strong { color: var(--negative); }
.metrics { display: grid; grid-auto-columns: minmax(0, 1fr); grid-auto-flow: column; margin: 0; padding: 13px 3px 14px; }
.metrics div { min-width: 0; padding: 0 11px; }
.metrics div + div { border-left: 1px solid #eae6ef; }
.metrics dt { color: var(--muted); font-size: .75rem; line-height: 1.3; }
.metrics dd { margin: 5px 0 0; color: var(--ink); font-size: clamp(.92rem, 1.55vw, 1.33rem); font-weight: 675; letter-spacing: -.03em; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.metrics small { display: block; margin-top: 3px; color: var(--muted); font-weight: 430; font-size: .69rem; letter-spacing: 0; }
.notice { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 18px; padding: 10px 13px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); color: var(--muted); }
.notice div div { margin-top: 4px; font-size: .84rem; }
.notice button { padding: 5px 8px; border: 1px solid var(--border); color: var(--accent); background: white; border-radius: 4px; }
section[id] { scroll-margin-top: 12px; }

@media (max-width: 1050px) {
  .overview { grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr); }
  .metrics { grid-auto-flow: row; grid-template-columns: repeat(2, minmax(0, 1fr)); padding-inline: 0; row-gap: 13px; }
  .metrics div { padding-inline: 14px; }
  .metrics div:nth-child(odd) { border-left: 0; }
}

@media (max-width: 720px) {
  .container { width: calc(100% - 28px); }
  .header-inner { min-height: 49px; }
  nav { gap: 12px; }
  nav a { font-size: .78rem; }
  .page { padding-block: 24px 30px; }
  .overview { grid-template-columns: 1fr; gap: 11px; margin-bottom: 20px; }
  .intro { margin-bottom: 17px; }
  .market-summary { padding: 12px 14px; }
  .nav-block { padding-left: 12px; }
}
@media (max-width: 480px) {
  .market-summary { grid-template-columns: 1fr; }
  .nav-block { border-left: 0; border-top: 1px solid #e5deee; padding: 10px 0 0; }
}
</style>
