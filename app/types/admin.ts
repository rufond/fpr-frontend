export interface AdminLoginResult {
    token: string
}

export interface AdminDiagnosticIssue {
    key: string
    severity: 'error' | 'warning'
    source: string
    type: string
    message: string
    instrument_id: number | null
    details: Record<string, unknown>
}

export interface AdminDiagnostics {
    total: number
    errors: number
    warnings: number
    items: AdminDiagnosticIssue[]
}
