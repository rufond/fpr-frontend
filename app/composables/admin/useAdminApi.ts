import {useAdminAuth} from "~/composables/admin/useAdminAuth.ts";

type AdminRequestOptions = {
    method?: 'GET' | 'POST'
    body?: Record<string, unknown>
}

export function useAdminApi() {
    const { token, clear } = useAdminAuth()

    async function request<T>(url: string, options: AdminRequestOptions = {}) {
        if (!token.value) {
            throw new Error('admin session is not available')
        }

        try {
            return await $fetch<T>(url, {
                ...options,
                headers: {
                    Authorization: `Bearer ${token.value}`,
                },
            })
        } catch (reason) {
            if (isUnauthorized(reason)) {
                clear()
            }

            throw reason
        }
    }

    return {
        request,
    }
}

function isUnauthorized(reason: unknown) {
    if (!reason || typeof reason !== 'object') {
        return false
    }

    const response = 'response' in reason ? reason.response : null
    if (!response || typeof response !== 'object') {
        return false
    }

    return 'status' in response && response.status === 401
}
