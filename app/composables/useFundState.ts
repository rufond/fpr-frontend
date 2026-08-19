import type { FundState } from '~/types/fund'

export function useFundState() {
  const state = useState<FundState | null>('fund-state', () => null)
  const pending = useState('fund-state-pending', () => false)
  const error = useState<string | null>('fund-state-error', () => null)

  async function refresh() {
    if (pending.value) {
      return
    }

    pending.value = true
    error.value = null

    try {
      state.value = await $fetch<FundState>('/api/v1/fund/state')
    } catch (reason) {
      error.value = reason instanceof Error ? reason.message : 'Не удалось загрузить данные фонда.'
    } finally {
      pending.value = false
    }
  }

  return {
    state,
    pending,
    error,
    refresh,
  }
}
