<script setup lang="ts">
import { useFundRealtime } from "~/composables/useFundRealtime"
import { fundInfo } from '~/data/fund'
import { formatDate, formatNumber, formatPercent } from '~/utils/format'

const FundIntradayHistory = defineAsyncComponent(() => import('~/components/FundIntradayHistory.vue'))

const { state, error, refresh } = useFundState()

useFundRealtime()

const snapshot = computed(() => state.value?.official_snapshot)
const market = computed(() => state.value?.market)

const historyRequested = ref(false)
const historyVisible = ref(false)

function toggleHistory() {
  historyRequested.value = true
  historyVisible.value = !historyVisible.value
}
</script>

<template>
  <main class="page-shell">
    <header class="fund-header">
      <div>
        <p class="eyebrow">Неофициальный информационный сайт</p>
        <h1>{{ fundInfo.name }}</h1>
        <p class="fund-description">{{ fundInfo.fullName }}</p>
      </div>

      <dl class="fund-meta">
        <div>
          <dt>Правила</dt>
          <dd>№ {{ fundInfo.rulesNumber }}</dd>
        </div>
        <div>
          <dt>ISIN пая</dt>
          <dd>{{ fundInfo.unitISIN }}</dd>
        </div>
        <div>
          <dt>Управляющая компания</dt>
          <dd>{{ fundInfo.managementCompany }}</dd>
        </div>
      </dl>
    </header>

    <div v-if="error" class="notice notice-error">
      <span>{{ error }}</span>
      <button type="button" @click="refresh">Повторить</button>
    </div>

    <div v-else-if="!state" class="notice">
      Загружаем актуальные данные фонда…
    </div>

    <template v-if="snapshot">
      <section class="section">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Текущее состояние</p>
            <h2>Данные на {{ formatDate(snapshot.as_of_date) }}</h2>
          </div>

          <button
              class="history-toggle"
              type="button"
              :aria-expanded="historyVisible"
              @click="toggleHistory"
          >
            {{ historyVisible ? 'Скрыть динамику' : 'Динамика 24 часа' }}
          </button>
        </div>

        <div class="metrics-grid">
          <article class="metric-card">
            <span>Расчётная стоимость пая</span>
            <strong>${{ formatNumber(snapshot.calculated_unit_value_usd, 4) }}</strong>
            <small>официальное значение УК</small>
          </article>

          <article class="metric-card">
            <span>Live РСИП</span>
            <strong>
              <template v-if="market?.live_valuation?.estimated_calculated_unit_value_rub">
                {{ formatNumber(market.live_valuation.estimated_calculated_unit_value_rub, 2) }} ₽
              </template>
              <template v-else>—</template>
            </strong>
            <small v-if="market?.live_valuation">
              покрытие {{ formatPercent(market.live_valuation.live_coverage_percent, 1) }}
            </small>
            <small v-else>рыночная оценка пока недоступна</small>
          </article>

          <article class="metric-card">
            <span>БСИП MOEX</span>
            <strong>
              <template v-if="market?.unit_price">
                {{ formatNumber(market.unit_price.unit_value, 2) }} {{ market.unit_price.currency }}
              </template>
              <template v-else>—</template>
            </strong>
            <small>биржевая цена пая</small>
          </article>

          <article class="metric-card">
            <span>Премия / дисконт</span>
            <strong>{{ formatPercent(market?.live_valuation?.premium_discount_percent, 2) }}</strong>
            <small>БСИП относительно live РСИП</small>
          </article>

          <article class="metric-card">
            <span>СЧА</span>
            <strong>${{ formatNumber(snapshot.nav_usd, 0) }}</strong>
            <small>официальное значение УК</small>
          </article>

          <article class="metric-card">
            <span>USD / RUB</span>
            <strong>{{ formatNumber(market?.usd_rub?.rate, 4) }}</strong>
            <small>текущий курс MOEX</small>
          </article>
        </div>

        <FundIntradayHistory
            v-if="historyRequested"
            v-show="historyVisible"
        />
      </section>

      <section class="section">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Состав фонда</p>
            <h2>Активы</h2>
          </div>
          <span>{{ snapshot.assets.length }} позиций</span>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
            <tr>
              <th>Актив</th>
              <th>Тип</th>
              <th>Тикер / ISIN</th>
              <th class="number-cell">Количество</th>
              <th class="number-cell">Доля активов</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="asset in snapshot.assets" :key="asset.row_no">
              <td>
                <strong>{{ asset.instrument?.name || asset.source_name || asset.source_type }}</strong>
                <small v-if="asset.instrument?.issuer && asset.instrument.issuer !== asset.instrument.name">
                  {{ asset.instrument.issuer }}
                </small>
              </td>
              <td>{{ asset.source_type }}</td>
              <td class="code-cell">
                {{ asset.instrument?.ticker || asset.instrument?.isin || '—' }}
              </td>
              <td class="number-cell">
                {{ formatNumber(asset.quantity, 4) }}
              </td>
              <td class="number-cell">
                <template v-if="asset.asset_share_upper_bound">&lt; </template>{{ formatPercent(asset.asset_share_percent, 2) }}
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.page-shell {
  width: min(1180px, calc(100% - 32px));
  margin: 0 auto;
  padding: 48px 0 72px;
}

.fund-header {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(280px, .75fr);
  gap: 48px;
  align-items: end;
  margin-bottom: 36px;
}

h1,
h2,
p,
dl,
dd {
  margin-top: 0;
}

h1 {
  margin-bottom: 12px;
  font-size: clamp(2rem, 4vw, 3.6rem);
  line-height: 1.02;
  letter-spacing: -.045em;
}

h2 {
  margin-bottom: 0;
  font-size: 1.35rem;
  letter-spacing: -.02em;
}

.eyebrow {
  margin-bottom: 8px;
  color: #697386;
  font-size: .72rem;
  font-weight: 700;
  letter-spacing: .09em;
  text-transform: uppercase;
}

.fund-description {
  max-width: 720px;
  margin-bottom: 0;
  color: #596273;
  line-height: 1.6;
}

.fund-meta {
  display: grid;
  gap: 12px;
  margin-bottom: 0;
}

.fund-meta div {
  display: grid;
  grid-template-columns: 108px 1fr;
  gap: 12px;
}

.fund-meta dt,
.metric-card span,
.metric-card small,
.section-heading > span,
td small {
  color: #70798a;
  font-size: .78rem;
}

.fund-meta dd {
  margin-bottom: 0;
  font-size: .86rem;
  line-height: 1.45;
}

.notice {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
  padding: 14px 16px;
  border: 1px solid #dce1e8;
  border-radius: 10px;
  background: #fff;
}

.notice-error {
  border-color: #e2b9b9;
  color: #8d2d2d;
}

.notice button {
  padding: 7px 10px;
  border: 1px solid currentColor;
  border-radius: 7px;
  color: inherit;
  background: transparent;
}

.section + .section {
  margin-top: 36px;
}

.section-heading {
  display: flex;
  gap: 20px;
  align-items: end;
  justify-content: space-between;
  margin-bottom: 14px;
}

.section-heading .eyebrow {
  margin-bottom: 4px;
}

.history-toggle {
  padding: 7px 10px;
  border: 1px solid #cbd2dc;
  border-radius: 7px;
  color: #273244;
  background: #fff;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.metric-card {
  min-width: 0;
  padding: 17px 18px;
  border: 1px solid #e0e4ea;
  border-radius: 12px;
  background: #fff;
}

.metric-card span,
.metric-card small {
  display: block;
}

.metric-card strong {
  display: block;
  margin: 7px 0 5px;
  overflow: hidden;
  font-size: 1.35rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: -.025em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid #e0e4ea;
  border-radius: 12px;
  background: #fff;
}

table {
  width: 100%;
  min-width: 820px;
  border-collapse: collapse;
}

th,
td {
  padding: 12px 14px;
  border-bottom: 1px solid #edf0f4;
  text-align: left;
  vertical-align: middle;
}

th {
  color: #727b8b;
  background: #fafbfc;
  font-size: .72rem;
  font-weight: 700;
  letter-spacing: .04em;
  text-transform: uppercase;
}

td {
  font-size: .86rem;
}

tbody tr:last-child td {
  border-bottom: 0;
}

td strong,
td small {
  display: block;
}

.code-cell {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: .8rem;
}

.number-cell {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

@media (max-width: 820px) {
  .page-shell {
    width: min(100% - 24px, 1180px);
    padding-top: 28px;
  }

  .fund-header {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .fund-meta div {
    grid-template-columns: 1fr;
    gap: 2px;
  }
}
</style>
