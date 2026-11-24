<script setup lang="ts">
import type {
  AdminPriceSourceInstrument,
  PriceSourceProvider,
  SetPriceSourceRequest,
} from '~/types/priceSources'

const props = defineProps<{
  item: AdminPriceSourceInstrument
  saving: boolean
  disabled: boolean
}>()

const emit = defineEmits<{
  save: [input: SetPriceSourceRequest]
}>()

const provider = ref<PriceSourceProvider | ''>('')
const providerSymbol = ref('')
const enabled = ref(false)
const equitySourceForBond = computed(() => props.item.asset_type === 'bond' && ['kase', 'nasdaq'].includes(provider.value))

watch(
    () => props.item,
    () => resetDraft(),
    {
      immediate: true,
    },
)

const selectedSource = computed(() => provider.value
    ? props.item.sources.find(item => item.provider === provider.value) ?? null
    : null)

const symbolChanged = computed(() => (
    selectedSource.value !== null &&
    selectedSource.value.provider_symbol !== providerSymbol.value.trim().toUpperCase()
))

const canSave = computed(() => (
    !props.disabled &&
    provider.value !== '' &&
    providerSymbol.value.trim() !== ''
))

function resetDraft() {
  const source = props.item.sources.find(item => item.enabled) ?? props.item.sources[0]

  provider.value = source?.provider ?? ''
  providerSymbol.value = source?.provider_symbol ?? ''
  enabled.value = source?.enabled ?? false
}

function selectProvider() {
  if (!provider.value) {
    providerSymbol.value = ''
    enabled.value = false
    return
  }

  const source = props.item.sources.find(item => item.provider === provider.value)

  providerSymbol.value = source?.provider_symbol ?? ''
  enabled.value = !equitySourceForBond.value && (source?.enabled ?? false)
}

function submit() {
  if (!canSave.value || !provider.value) {
    return
  }

  emit('save', {
    instrument_id: props.item.instrument_id,
    provider: provider.value,
    provider_symbol: providerSymbol.value.trim(),
    enabled: !equitySourceForBond.value && enabled.value,
  })
}

function providerName(value: PriceSourceProvider) {
  switch (value) {
    case 'moex':
      return 'MOEX'
    case 'yahoo':
      return 'Yahoo'
    case 'kase':
      return 'KASE'
    case 'nasdaq':
      return 'Nasdaq'
  }
}

function assetTypeName(value: string) {
  switch (value) {
    case 'equity':
      return 'Акция'
    case 'depositary_receipt':
      return 'Депозитарная расписка'
    case 'bond':
      return 'Облигация'
    default:
      return value
  }
}
</script>

<template>
  <form class="price-source-item" @submit.prevent="submit">
    <div class="instrument">
      <strong>{{ item.name }}</strong>
      <span>{{ assetTypeName(item.asset_type) }} · ID {{ item.instrument_id }}</span>
    </div>

    <div class="identifier">
      <strong v-if="item.ticker">{{ item.ticker }}</strong>
      <code>{{ item.isin }}</code>
    </div>

    <div class="sources">
      <span v-if="item.sources.length === 0" class="no-source">Не задан</span>
      <span
          v-for="source in item.sources"
          v-else
          :key="source.id"
          class="source"
          :class="{ 'source-enabled': source.enabled }"
      >
        <i></i>{{ providerName(source.provider) }} · {{ source.provider_symbol }}
      </span>
    </div>

    <label class="field provider-field">
      <span>Поставщик</span>
      <select v-model="provider" aria-label="Поставщик котировок" :disabled="disabled" required @change="selectProvider">
        <option value="" disabled>—</option>
        <option value="moex">MOEX</option>
        <option value="yahoo">Yahoo</option>
        <option value="kase">KASE</option>
        <option value="nasdaq">Nasdaq</option>
      </select>
    </label>

    <label class="field symbol-field">
      <span>Тикер у поставщика</span>
      <input
          v-model="providerSymbol"
          type="text"
          aria-label="Тикер у поставщика"
          :disabled="disabled || !provider"
          autocomplete="off"
          spellcheck="false"
          required
      >
    </label>

    <label class="enabled-field">
      <input
          v-model="enabled"
          type="checkbox"
          aria-label="Использовать этот источник"
          :disabled="disabled || !provider || equitySourceForBond"
      >
      <span>{{ enabled ? 'Да' : 'Нет' }}</span>
    </label>

    <button type="submit" :disabled="!canSave">
      {{ saving ? 'Сохраняем…' : 'Сохранить' }}
    </button>

    <p v-if="equitySourceForBond" class="provider-note">
      Источник поддерживает акции и расписки.
    </p>
    <p v-else-if="symbolChanged" class="provider-note provider-warning">
      При смене тикера сохранённая история котировок этого источника будет удалена.
    </p>
  </form>
</template>

<style scoped>
.price-source-item {
  display: grid;
  grid-template-columns: minmax(260px, 2.2fr) minmax(165px, 1fr) minmax(215px, 1.3fr) 110px minmax(150px, 1fr) 78px 92px;
  gap: 10px;
  align-items: center;
  padding: 8px 10px;
  border-bottom: 1px solid #edf0f3;
}

.price-source-item:last-child {
  border-bottom: 0;
}

.instrument,
.identifier,
.sources {
  min-width: 0;
}

.instrument strong,
.instrument span,
.identifier strong,
.identifier code,
.source {
  display: block;
}

.instrument strong {
  overflow: hidden;
  font-size: .76rem;
  line-height: 1.25;
  text-overflow: ellipsis;
}

.instrument span,
.identifier code,
.no-source {
  margin-top: 2px;
  color: #737c8b;
  font-size: .66rem;
}

.identifier strong {
  font-size: .74rem;
}

.identifier code {
  color: #4e596a;
  white-space: nowrap;
}

.sources {
  display: grid;
  gap: 2px;
}

.source {
  overflow: hidden;
  color: #6c7584;
  font-size: .68rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source i {
  display: inline-block;
  width: 5px;
  height: 5px;
  margin-right: 5px;
  border-radius: 50%;
  background: #b2b8c2;
  vertical-align: 1px;
}

.source-enabled {
  color: #285c3b;
  font-weight: 600;
}

.source-enabled i {
  background: #4d9465;
}

.field {
  display: grid;
  gap: 2px;
}

.field > span {
  display: none;
}

select,
input[type='text'] {
  width: 100%;
  min-height: 30px;
  padding: 5px 7px;
  border: 1px solid #cbd2dc;
  border-radius: 0;
  background: #fff;
  font-size: .72rem;
}

.enabled-field {
  display: flex;
  align-items: center;
  gap: 5px;
  min-height: 30px;
  color: #596376;
  font-size: .7rem;
  white-space: nowrap;
}

button {
  min-height: 30px;
  padding: 5px 8px;
  border: 1px solid #cbd2dc;
  border-radius: 0;
  color: #263244;
  background: #fff;
  font-size: .72rem;
  font-weight: 600;
}

button:disabled,
select:disabled,
input:disabled {
  cursor: default;
  opacity: .55;
}

.provider-note {
  grid-column: 4 / -1;
  margin: -2px 0 1px;
  color: #697386;
  font-size: .66rem;
}

.provider-warning {
  color: #8a5a16;
}
</style>
