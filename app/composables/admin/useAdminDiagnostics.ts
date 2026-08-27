import type { AdminDiagnostics } from '~/types/admin'
import type { RealtimeClientEvent } from '~/types/realtime'
import {useAdminApi} from "~/composables/admin/useAdminApi.ts";
import {useAdminAuth} from "~/composables/admin/useAdminAuth.ts";
import {useRealtime} from "~/composables/useRealtime.ts";

export function useAdminDiagnostics() {
    const { request } = useAdminApi()
    const { token } = useAdminAuth()
    const realtime = useRealtime()

    const diagnostics = ref<AdminDiagnostics | null>(null)
    const pending = ref(false)
    const error = ref<string | null>(null)

    let refreshRunning = false
    let refreshQueued = false
    let unsubscribe: (() => void) | null = null

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
            diagnostics.value = await request<AdminDiagnostics>('/api/v1/admin/diagnostics')
        } catch (reason) {
            error.value = reason instanceof Error ? reason.message : 'Не удалось загрузить диагностику.'
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

    function handleRealtime(_event: RealtimeClientEvent) {
        void refresh(true)
    }

    watch(
        token,
        value => {
            if (unsubscribe) {
                unsubscribe()
                unsubscribe = null
            }

            if (!value) {
                diagnostics.value = null
                pending.value = false
                error.value = null
                return
            }

            if (import.meta.client) {
                unsubscribe = realtime.subscribe(['diagnostics'], handleRealtime)
            }
        },
        {
            immediate: true,
        },
    )

    onUnmounted(() => {
        unsubscribe?.()
    })

    return {
        diagnostics,
        pending,
        error,
        refresh,
    }
}
