import { readonly, ref } from 'vue'
import type {
    RealtimeClientEvent,
    RealtimeConnectionStatus,
    RealtimeScope,
    RealtimeServerEvent,
} from '~/types/realtime'

type RealtimeListener = {
    scopes: Set<RealtimeScope>
    handler: (event: RealtimeClientEvent) => void
}

const status = ref<RealtimeConnectionStatus>('idle')
const listeners = new Set<RealtimeListener>()

let socket: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempt = 0
let generationID = ''
let revision = 0
let helloReceived = false
let onlineListenerRegistered = false
let realtimeUrlOverride = ''

export function useRealtime() {
    const config = useRuntimeConfig()
    realtimeUrlOverride = String(config.public.realtimeUrl || '')

    function subscribe(scopes: RealtimeScope[], handler: (event: RealtimeClientEvent) => void): () => void {
        const listener: RealtimeListener = {
            scopes: new Set(scopes),
            handler,
        }

        listeners.add(listener)

        if (import.meta.client) {
            ensureOnlineListener()
            connect()
        }

        return () => {
            listeners.delete(listener)

            if (listeners.size === 0) {
                disconnect()
            }
        }
    }

    return {
        status: readonly(status),
        subscribe,
    }
}

function connect() {
    if (
        !import.meta.client
        || listeners.size === 0
        || socket !== null
        || status.value === 'connecting'
        || status.value === 'connected'
    ) {
        return
    }

    clearReconnectTimer()
    status.value = 'connecting'

    const currentSocket = new WebSocket(realtimeURL())
    socket = currentSocket

    currentSocket.onopen = () => {
        if (socket !== currentSocket) {
            return
        }

        reconnectAttempt = 0
        status.value = 'connected'
    }

    currentSocket.onmessage = (message) => {
        if (socket !== currentSocket || typeof message.data !== 'string') {
            return
        }

        const event = parseServerEvent(message.data)
        if (!event) {
            return
        }

        handleServerEvent(event)
    }

    currentSocket.onerror = () => {
        currentSocket.close()
    }

    currentSocket.onclose = () => {
        if (socket !== currentSocket) {
            return
        }

        socket = null
        status.value = 'disconnected'
        scheduleReconnect()
    }
}


function disconnect() {
    clearReconnectTimer()
    reconnectAttempt = 0
    status.value = 'idle'

    if (socket === null) {
        return
    }

    const currentSocket = socket
    socket = null
    currentSocket.close()
}

function handleServerEvent(event: RealtimeServerEvent) {
    if (event.type === 'hello') {
        generationID = event.generation_id
        revision = event.revision
        helloReceived = true

        broadcast({
            ...event,
            type: 'resync',
        })

        return
    }

    if (!helloReceived || event.generation_id !== generationID) {
        generationID = event.generation_id
        revision = event.revision
        helloReceived = true

        broadcast({
            ...event,
            type: 'resync',
        })

        return
    }

    if (event.revision <= revision) {
        return
    }

    if (revision > 0 && event.revision !== revision + 1) {
        revision = event.revision

        broadcast({
            ...event,
            type: 'resync',
        })

        return
    }

    revision = event.revision

    broadcast({
        ...event,
        type: 'changed',
    })
}

function broadcast(event: RealtimeClientEvent) {
    for (const listener of listeners) {
        if (event.type === 'changed' && !event.scopes.some(scope => listener.scopes.has(scope))) {
            continue
        }

        listener.handler(event)
    }
}

function parseServerEvent(value: string): RealtimeServerEvent | null {
    try {
        const event = JSON.parse(value) as Partial<RealtimeServerEvent>

        if (
            (event.type !== 'hello' && event.type !== 'changed')
            || typeof event.generation_id !== 'string'
            || typeof event.revision !== 'number'
            || typeof event.occurred_at !== 'string'
        ) {
            return null
        }

        return {
            type: event.type,
            generation_id: event.generation_id,
            revision: event.revision,
            occurred_at: event.occurred_at,
            scopes: Array.isArray(event.scopes) ? event.scopes : [],
            instrument_ids: Array.isArray(event.instrument_ids) ? event.instrument_ids : [],
            instrument_prices: Array.isArray(event.instrument_prices) ? event.instrument_prices : [],
            fx_rates: Array.isArray(event.fx_rates) ? event.fx_rates : [],
            live_valuation: event.live_valuation && typeof event.live_valuation === 'object'
                ? event.live_valuation
                : null,
        }
    } catch {
        return null
    }
}

function scheduleReconnect() {
    if (!import.meta.client || reconnectTimer !== null) {
        return
    }

    const delay = Math.min(30_000, 1_000 * Math.pow(2, reconnectAttempt))
    reconnectAttempt++

    reconnectTimer = setTimeout(() => {
        reconnectTimer = null
        connect()
    }, delay)
}

function clearReconnectTimer() {
    if (reconnectTimer === null) {
        return
    }

    clearTimeout(reconnectTimer)
    reconnectTimer = null
}

function ensureOnlineListener() {
    if (onlineListenerRegistered) {
        return
    }

    onlineListenerRegistered = true

    window.addEventListener('online', () => {
        reconnectAttempt = 0
        clearReconnectTimer()
        connect()
    })
}

function realtimeURL(): string {
    if (realtimeUrlOverride) {
        return realtimeUrlOverride
    }

    const url = new URL('/api/v1/realtime', window.location.origin)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'

    return url.toString()
}
