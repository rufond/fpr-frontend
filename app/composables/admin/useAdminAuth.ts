import type { AdminLoginResult } from '~/types/admin'

const tokenStorageKey = 'fpr-admin-token'

export function useAdminAuth() {
    const token = useState<string | null>('admin-token', () => null)
    const initialized = useState('admin-token-initialized', () => false)

    if (import.meta.client && !initialized.value) {
        token.value = sessionStorage.getItem(tokenStorageKey)
        initialized.value = true
    }

    async function login(login: string, password: string) {
        const result = await $fetch<AdminLoginResult>('/api/v1/auth/login', {
            method: 'POST',
            body: {
                login,
                password,
            },
        })

        token.value = result.token
        sessionStorage.setItem(tokenStorageKey, result.token)
    }

    async function logout() {
        const currentToken = token.value

        clear()

        if (!currentToken) {
            return
        }

        try {
            await $fetch('/api/v1/auth/logout', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${currentToken}`,
                },
            })
        } catch {
            // Client-side logout must still clear a stale or already invalid session.
        }
    }

    function clear() {
        token.value = null

        if (import.meta.client) {
            sessionStorage.removeItem(tokenStorageKey)
        }
    }

    return {
        token,
        login,
        logout,
        clear,
    }
}
