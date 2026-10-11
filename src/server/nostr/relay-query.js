import { randomUUID } from 'node:crypto'

export function queryRelay(relay, filter, { Socket = WebSocket, timeoutMs = 7000 } = {}) {
  return new Promise((resolve, reject) => {
    const id = randomUUID()
    const events = []
    let socket
    let done = false
    const finish = (error) => {
      if (done) return
      done = true
      clearTimeout(timer)
      if (socket?.readyState === 1) socket.send(JSON.stringify(['CLOSE', id]))
      socket?.close()
      if (error && !events.length) reject(error)
      else resolve(events)
    }
    const timer = setTimeout(() => finish(new Error('Relay request timed out')), timeoutMs)
    try {
      socket = new Socket(relay)
      socket.addEventListener('open', () => {
        if (!done) socket.send(JSON.stringify(['REQ', id, filter]))
      })
      socket.addEventListener('message', ({ data }) => {
        if (done || typeof data !== 'string' || data.length > 1000000) return
        let message
        try { message = JSON.parse(data) } catch { return }
        if (!Array.isArray(message) || message[1] !== id) return
        if (message[0] === 'EVENT' && message[2] && events.length < filter.limit) events.push(message[2])
        if (message[0] === 'EOSE') finish()
        if (message[0] === 'CLOSED') finish(new Error('Relay rejected request'))
      })
      socket.addEventListener('error', () => finish(new Error('Relay connection failed')))
      socket.addEventListener('close', () => finish(new Error('Relay disconnected')))
    } catch { finish(new Error('Relay connection failed')) }
  })
}
