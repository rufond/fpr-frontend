export interface SchedulerJobsResult {
    items: SchedulerJob[]
}

export interface SchedulerJob {
    id: number
    key: string
    name: string
    spec: string
    running: boolean
    prev: string | null
    next: string | null
}

export interface RunSchedulerJobResult {
    run_id: number
    key: string
    status: string
    summary?: Record<string, unknown>
    error?: string
}
