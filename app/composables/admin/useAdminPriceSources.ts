import type {
    AdminPriceSourceInstrument,
    AdminPriceSourcesResult,
    SetPriceSourceRequest,
    SetPriceSourceResult,
} from '~/types/priceSources'
import {useAdminApi} from "~/composables/admin/useAdminApi.ts";
import {useAdminAuth} from "~/composables/admin/useAdminAuth.ts";

function useAdminPriceSources() {
    const { request } = useAdminApi()
    const { token } = useAdminAuth()

    const items = ref<AdminPriceSourceInstrument[]>([])
    const pending = ref(false)
    const error = ref<string | null>(null)

    const savingInstrumentID = ref<number | null>(null)
    const saveError = ref<string | null>(null)
    const saveResult = ref<SetPriceSourceResult | null>(null)

    let refreshRunning = false
    let refreshQueued = false

    async function refresh(silent = false) {
        if (!token.value) {
            return
        }

        if (refreshRunning) {
            refreshQueued = true
            return
        }

        refreshRunning = true

        if (!silent) {
            pending.value = true
        }

        error.value = null

        try {
            const result = await request<AdminPriceSourcesResult>('/api/v1/admin/price-sources')
            items.value = result.items
        } catch (reason) {
            error.value = priceSourceErrorMessage(reason, 'Не удалось загрузить источники цен.')
        } finally {
            if (!silent) {
                pending.value = false
            }

            refreshRunning = false

            if (refreshQueued) {
                refreshQueued = false
                void refresh(true)
            }
        }
    }

    async function save(input: SetPriceSourceRequest) {
        if (savingInstrumentID.value !== null) {
            return null
        }

        savingInstrumentID.value = input.instrument_id
        saveError.value = null
        saveResult.value = null

        try {
            const result = await request<SetPriceSourceResult>(
                '/api/v1/admin/price-sources/set',
                {
                    method: 'POST',
                    body: input,
                },
            )

            saveResult.value = result
            await refresh(true)

            return result
        } catch (reason) {
            saveError.value = priceSourceErrorMessage(reason, 'Не удалось сохранить источник цены.')
            return null
        } finally {
            savingInstrumentID.value = null
        }
    }

    watch(
        token,
        value => {
            if (!value) {
                items.value = []
                pending.value = false
                error.value = null
                savingInstrumentID.value = null
                saveError.value = null
                saveResult.value = null
                return
            }

            void refresh()
        },
        {
            immediate: true,
        },
    )

    return {
        items,
        pending,
        error,
        savingInstrumentID,
        saveError,
        saveResult,
        refresh,
        save,
    }
}

export default useAdminPriceSources

function priceSourceErrorMessage(reason: unknown, fallback: string) {
    if (reason && typeof reason === 'object' && 'data' in reason) {
        const data = reason.data

        if (typeof data === 'string') {
            return data
        }

        if (data && typeof data === 'object') {
            if ('errors' in data && data.errors && typeof data.errors === 'object') {
                const messages = Object.values(data.errors).filter(value => typeof value === 'string')
                if (messages.length) {
                    return messages.join(' ')
                }
            }

            if ('error' in data && typeof data.error === 'string') {
                return data.error
            }
        }
    }

    return reason instanceof Error ? reason.message : fallback
}
