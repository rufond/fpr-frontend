import type {
    RunSchedulerJobResult,
    SchedulerJob,
    SchedulerJobsResult,
} from '~/types/scheduler'
import type { RealtimeClientEvent } from '~/types/realtime'
import {useAdminApi} from "~/composables/admin/useAdminApi.ts";
import {useAdminAuth} from "~/composables/admin/useAdminAuth.ts";
import {useRealtime} from "~/composables/useRealtime.ts";

export function useAdminScheduler() {
    const { request } = useAdminApi()
    const { token } = useAdminAuth()
    const realtime = useRealtime()

    const jobs = ref<SchedulerJob[]>([])
    const pending = ref(false)
    const error = ref<string | null>(null)

    const runPendingKey = ref<string | null>(null)
    const runError = ref<string | null>(null)
    const runResult = ref<RunSchedulerJobResult | null>(null)

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
            const result = await request<SchedulerJobsResult>('/api/v1/admin/scheduler/jobs')
            jobs.value = result.items
        } catch (reason) {
            error.value = errorMessage(reason, 'Не удалось загрузить задачи scheduler.')
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

    async function run(job: SchedulerJob) {
        if (runPendingKey.value || job.running) {
            return
        }

        runPendingKey.value = job.key
        runError.value = null
        runResult.value = null

        try {
            runResult.value = await request<RunSchedulerJobResult>(
                '/api/v1/admin/scheduler/run',
                {
                    method: 'POST',
                    body: {
                        key: job.key,
                    },
                },
            )

            await refresh(true)
        } catch (reason) {
            runError.value = errorMessage(reason, 'Не удалось запустить задачу.')
        } finally {
            runPendingKey.value = null
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
                jobs.value = []
                pending.value = false
                error.value = null
                runPendingKey.value = null
                runError.value = null
                runResult.value = null
                return
            }

            if (import.meta.client) {
                unsubscribe = realtime.subscribe(['scheduler'], handleRealtime)
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
        jobs,
        pending,
        error,
        runPendingKey,
        runError,
        runResult,
        refresh,
        run,
    }
}

function errorMessage(reason: unknown, fallback: string) {
    if (reason && typeof reason === 'object' && 'data' in reason) {
        const data = reason.data

        if (typeof data === 'string') {
            return data
        }

        if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
            return data.error
        }
    }

    return reason instanceof Error ? reason.message : fallback
}
