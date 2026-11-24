<script setup lang="ts">
import type { SetPriceSourceRequest } from '~/types/priceSources'
import useAdminPriceSources from "~/composables/admin/useAdminPriceSources.ts";

const emit = defineEmits<{
  changed: []
}>()

const {
  items,
  pending,
  error,
  savingInstrumentID,
  saveError,
  saveResult,
  refresh,
  save,
} = useAdminPriceSources()

const search = ref('')

const enabledCount = computed(() => items.value.filter(item => item.sources.some(source => source.enabled)).length)
const mappedCount = computed(() => items.value.filter(item => item.sources.length !== 0).length)

const filteredItems = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('ru-RU')
  if (!query) {
    return items.value
  }

  return items.value.filter(item => [
    item.name,
    item.isin,
    item.ticker ?? '',
    item.asset_type,
    ...item.sources.flatMap(source => [source.provider, source.provider_symbol]),
  ].some(value => value.toLocaleLowerCase('ru-RU').includes(query)))
})

async function saveSource(input: SetPriceSourceRequest) {
  const result = await save(input)
  if (result?.changed) {
    emit('changed')
  }
}
</script>

<template>
  <section id="price-sources" class="price-sources" aria-labelledby="price-sources-title">
    <div class="section-heading">
      <div>
        <h2 id="price-sources-title">Источники котировок</h2>
        <p class="section-description">
          Всего {{ items.length }} · с привязкой {{ mappedCount }} · с активным источником {{ enabledCount }}
        </p>
      </div>

      <button type="button" :disabled="pending || savingInstrumentID !== null" @click="refresh()">
        {{ pending ? 'Обновляем…' : 'Обновить' }}
      </button>
    </div>

    <div v-if="error" class="notice notice-error">
      <span>{{ error }}</span>
      <button type="button" :disabled="pending" @click="refresh()">Повторить</button>
    </div>

    <div v-else-if="pending && items.length === 0" class="notice">
      Загружаем источники цен…
    </div>

    <div v-if="saveError" class="notice notice-error">
      {{ saveError }}
    </div>

    <div v-else-if="saveResult" class="notice notice-success">
      {{ saveResult.changed ? 'Источник цены сохранён.' : 'Изменений нет.' }}
    </div>

    <template v-if="items.length">
      <div class="toolbar">
        <label class="search-field">
          <span>Поиск</span>
          <input
              v-model="search"
              type="search"
              placeholder="Название, тикер, ISIN или поставщик"
          >
        </label>

        <p class="source-note">
          У каждого инструмента может быть один активный источник.
        </p>
      </div>

      <p v-if="filteredItems.length === 0" class="empty-state">
        По заданному фильтру инструменты не найдены.
      </p>

      <div v-else class="items-wrap">
        <div class="items-head" aria-hidden="true">
          <span>Инструмент</span>
          <span>Тикер / ISIN</span>
          <span>Сохранённые привязки</span>
          <span>Поставщик</span>
          <span>Тикер у поставщика</span>
          <span>Активен</span>
          <span></span>
        </div>

        <div class="items">
          <AdminPriceSourceItem
              v-for="item in filteredItems"
              :key="item.instrument_id"
              :item="item"
              :saving="savingInstrumentID === item.instrument_id"
              :disabled="savingInstrumentID !== null"
              @save="saveSource"
          />
        </div>
      </div>
    </template>

    <p v-else-if="!pending && !error" class="empty-state">
      В текущем составе фонда нет инструментов для настройки источников цен.
    </p>
  </section>
</template>

<style scoped>
.price-sources {
  margin-top: 28px;
}

h2,
p {
  margin-top: 0;
}

h2 {
  margin-bottom: 0;
  font-size: 1.08rem;
}

.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.section-description {
  margin: 4px 0 0;
  color: #697386;
  font-size: .76rem;
}

button {
  min-height: 32px;
  padding: 6px 9px;
  border: 1px solid #cbd2dc;
  border-radius: 0;
  color: #263244;
  background: #fff;
  font-size: .78rem;
  font-weight: 600;
}

button:disabled {
  cursor: default;
  opacity: .55;
}

.notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
  padding: 9px 11px;
  border: 1px solid #dfe4eb;
  border-radius: 0;
  color: #4f596a;
  background: #fff;
  font-size: .78rem;
}

.notice-error {
  border-color: #e2b9b9;
  color: #812e2e;
}

.notice-success {
  border-color: #cfe0d3;
  color: #285c3b;
}

.toolbar {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
  margin-top: 14px;
}

.source-note {
  margin-bottom: 2px;
  color: #697386;
  font-size: .72rem;
  text-align: right;
}

.search-field {
  display: grid;
  width: min(520px, 100%);
  gap: 4px;
}

.search-field span {
  color: #596376;
  font-size: .7rem;
  font-weight: 600;
}

.search-field input {
  width: 100%;
  min-height: 32px;
  padding: 6px 8px;
  border: 1px solid #cbd2dc;
  border-radius: 0;
  background: #fff;
}

.items-wrap {
  margin-top: 10px;
  overflow-x: auto;
  border: 1px solid #dfe4eb;
  background: #fff;
}

.items-head,
.items {
  min-width: 1240px;
}

.items-head {
  display: grid;
  grid-template-columns: minmax(260px, 2.2fr) minmax(165px, 1fr) minmax(215px, 1.3fr) 110px minmax(150px, 1fr) 78px 92px;
  gap: 10px;
  padding: 7px 10px;
  border-bottom: 1px solid #dfe4eb;
  color: #6f7888;
  background: #f7f8fa;
  font-size: .68rem;
  font-weight: 600;
  white-space: nowrap;
}

.empty-state {
  margin: 14px 0 0;
  color: #697386;
  font-size: .8rem;
}

@media (max-width: 720px) {
  .section-heading,
  .toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .section-heading > button {
    align-self: flex-start;
  }

  .source-note {
    text-align: left;
  }
}
</style>
