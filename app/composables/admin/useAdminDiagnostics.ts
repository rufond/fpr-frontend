import type { AdminDiagnostics } from '~/types/admin'
import {useAdminApi} from "~/composables/admin/useAdminApi.ts";

export function useAdminDiagnostics() {
    const { request } = useAdminApi()

    const diagnostics = ref<AdminDiagnostics | null>(null)
    const pending = ref(false)
    const error = ref<string | null>(null)

    async function refresh() {
        if (pending.value) {
            return
        }

        pending.value = true
        error.value = null

        try {
            diagnostics.value = await request<AdminDiagnostics>('/api/v1/admin/diagnostics')
        } catch (reason) {
            error.value = reason instanceof Error ? reason.message : 'Не удалось загрузить диагностику.'
        } finally {
            pending.value = false
        }
    }

    return {
        diagnostics,
        pending,
        error,
        refresh,
    }
}
