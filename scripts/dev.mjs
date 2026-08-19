import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import http from 'node:http'
import https from 'node:https'
import process, { loadEnvFile } from 'node:process'

try {
    loadEnvFile()
} catch (error) {
    if (error?.code !== 'ENOENT') {
        throw error
    }
}

const backendTarget = new URL(process.env.FPR_BACKEND_URL || 'http://127.0.0.1:8080')
const sockets = new Set()

const proxyServer = createServer((_, response) => {
    response.writeHead(404)
    response.end()
})

proxyServer.on('upgrade', (request, clientSocket, head) => {
    const requestURL = new URL(request.url || '/', 'http://localhost')
    if (requestURL.pathname !== '/api/v1/realtime') {
        clientSocket.destroy()
        return
    }

    const targetURL = new URL(requestURL.pathname + requestURL.search, backendTarget)
    const transport = targetURL.protocol === 'https:' ? https : http
    const headers = {
        ...request.headers,
        host: targetURL.host,
        origin: `${targetURL.protocol}//${targetURL.host}`,
    }

    sockets.add(clientSocket)
    clientSocket.once('close', () => sockets.delete(clientSocket))

    const proxyRequest = transport.request({
        protocol: targetURL.protocol,
        hostname: targetURL.hostname,
        port: targetURL.port || undefined,
        method: request.method,
        path: targetURL.pathname + targetURL.search,
        headers,
    })

    proxyRequest.once('upgrade', (response, upstreamSocket, upstreamHead) => {
        sockets.add(upstreamSocket)
        upstreamSocket.once('close', () => sockets.delete(upstreamSocket))

        writeUpgradeResponse(clientSocket, response)

        if (upstreamHead.length > 0) {
            clientSocket.write(upstreamHead)
        }
        if (head.length > 0) {
            upstreamSocket.write(head)
        }

        upstreamSocket.pipe(clientSocket)
        clientSocket.pipe(upstreamSocket)
    })

    proxyRequest.once('response', (response) => {
        writeUpgradeResponse(clientSocket, response)
        response.pipe(clientSocket)
    })

    proxyRequest.once('error', (error) => {
        console.error(`[dev-ws-proxy] ${error.message}`)
        clientSocket.destroy()
    })

    proxyRequest.end()
})

proxyServer.once('error', (error) => {
    console.error(`[dev-ws-proxy] ${error.message}`)
    process.exit(1)
})

proxyServer.listen(0, '127.0.0.1', () => {
    const address = proxyServer.address()
    if (!address || typeof address === 'string') {
        throw new Error('cannot determine dev websocket proxy address')
    }

    const realtimeURL = `ws://127.0.0.1:${address.port}/api/v1/realtime`
    console.log(`[dev-ws-proxy] ${realtimeURL} -> ${backendTarget.origin}/api/v1/realtime`)

    const command = process.platform === 'win32' ? 'nuxt.cmd' : 'nuxt'
    const nuxt = spawn(command, ['dev', ...process.argv.slice(2)], {
        stdio: 'inherit',
        env: {
            ...process.env,
            FPR_DEV_REALTIME_URL: realtimeURL,
        },
    })

    nuxt.once('error', (error) => {
        console.error(`[nuxt] ${error.message}`)
        shutdown(1)
    })

    nuxt.once('exit', (code, signal) => {
        if (signal) {
            shutdown(0)
            return
        }

        shutdown(code ?? 1)
    })

    process.once('SIGINT', () => {
        nuxt.kill('SIGINT')
    })

    process.once('SIGTERM', () => {
        nuxt.kill('SIGTERM')
    })
})

function writeUpgradeResponse(socket, response) {
    socket.write(`HTTP/${response.httpVersion} ${response.statusCode} ${response.statusMessage || ''}\r\n`)

    for (let index = 0; index < response.rawHeaders.length; index += 2) {
        socket.write(`${response.rawHeaders[index]}: ${response.rawHeaders[index + 1]}\r\n`)
    }

    socket.write('\r\n')
}

function shutdown(code) {
    for (const socket of sockets) {
        socket.destroy()
    }

    proxyServer.close(() => {
        process.exit(code)
    })
}
