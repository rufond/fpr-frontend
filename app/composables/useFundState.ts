import type { FundState } from '~/types/fund'

export function useFundState() {
  const state = useState<FundState | null>('fund-state', () => null)
  const pending = useState('fund-state-pending', () => false)
  const refreshQueued = useState('fund-state-refresh-queued', () => false)
  const error = useState<string | null>('fund-state-error', () => null)

  async function refresh() {
    if (pending.value) {
      refreshQueued.value = true
      return
    }

    pending.value = true

    try {
      do {
        refreshQueued.value = false
        error.value = null

        try {
          state.value = await $fetch<FundState>('/api/v1/fund/state')
        } catch (reason) {
          error.value = reason instanceof Error ? reason.message : 'Не удалось загрузить данные фонда.'
        }
      } while (refreshQueued.value)
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
