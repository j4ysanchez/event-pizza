import { useEffect, useRef, useState, useCallback } from 'react'
import type { ZodType } from 'zod'
import { upcast } from '../events/upcasters'

const MAX_RECONNECT_ATTEMPTS = 3
const MAX_BACKOFF_MS = 30_000

interface SSEConnectionOptions {
  enabled?: boolean
  knownTypes?: Set<string>
}

interface SSEConnectionState {
  isConnected: boolean
  isStale: boolean
  reconnectAttempt: number
}

/**
 * Low-level SSE hook with:
 * - Exponential backoff reconnect (1s → 2s → 4s → max 30s)
 * - Sequence number gap detection (reconnects with ?after={seq} for server replay)
 * - After MAX_RECONNECT_ATTEMPTS failures → isStale = true (caller switches to polling)
 * - Zod event parsing — malformed events are logged and skipped
 */
export function useSSEConnection<T extends { sequenceNumber?: number }>(
  url: string | null,
  schema: ZodType<T>,
  onEvent: (event: T) => void,
  options: SSEConnectionOptions = {}
): SSEConnectionState {
  const { enabled = true, knownTypes } = options
  const [isConnected, setIsConnected] = useState(false)
  const [isStale, setIsStale] = useState(false)
  const [reconnectAttempt, setReconnectAttempt] = useState(0)

  const lastSeqRef = useRef<number>(-1)
  const attemptRef = useRef<number>(0)
  const esRef = useRef<EventSource | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const connect = useCallback(() => {
    if (!url || !enabled) return

    const seqParam = lastSeqRef.current >= 0 ? `?after=${lastSeqRef.current}` : ''
    const fullUrl = `${url}${seqParam}`
    const es = new EventSource(fullUrl)
    esRef.current = es

    es.onopen = () => {
      setIsConnected(true)
      setIsStale(false)
      attemptRef.current = 0
      setReconnectAttempt(0)
    }

    es.onmessage = (messageEvent: MessageEvent<string>) => {
      let parsed: unknown
      try {
        parsed = JSON.parse(messageEvent.data)
      } catch {
        console.error('[SSE] Failed to parse JSON:', messageEvent.data)
        return
      }

      const rawType = (parsed as any)?.type
      if (knownTypes && rawType && !knownTypes.has(rawType)) {
        console.warn('[SSE] Unknown event type, skipping:', rawType)
        return
      }

      const result = schema.safeParse(upcast(parsed))
      if (!result.success) {
        console.error('[SSE] Schema validation failed for known event:', rawType, result.error.flatten())
        return
      }

      const event = result.data
      const seq = event.sequenceNumber

      if (seq !== undefined) {
        // Duplicate: ignore
        if (seq <= lastSeqRef.current) return

        // Gap detected: reconnect requesting replay from last known position
        if (seq > lastSeqRef.current + 1 && lastSeqRef.current >= 0) {
          console.warn(`[SSE] Sequence gap detected: expected ${lastSeqRef.current + 1}, got ${seq}`)
          es.close()
          esRef.current = null
          // Reconnect immediately (gap, not error)
          connect()
          return
        }

        lastSeqRef.current = seq
      }

      onEventRef.current(event)
    }

    es.onerror = () => {
      es.close()
      esRef.current = null
      setIsConnected(false)

      attemptRef.current += 1
      setReconnectAttempt(attemptRef.current)

      if (attemptRef.current > MAX_RECONNECT_ATTEMPTS) {
        setIsStale(true)
        return
      }

      const backoff = Math.min(1000 * Math.pow(2, attemptRef.current - 1), MAX_BACKOFF_MS)
      timeoutRef.current = setTimeout(connect, backoff)
    }
  }, [url, enabled, schema, knownTypes])

  useEffect(() => {
    if (!url || !enabled) {
      esRef.current?.close()
      esRef.current = null
      setIsConnected(false)
      return
    }

    // Reset on url change
    lastSeqRef.current = -1
    attemptRef.current = 0
    setReconnectAttempt(0)
    setIsStale(false)

    connect()

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      esRef.current?.close()
      esRef.current = null
    }
  }, [url, enabled, connect])

  return { isConnected, isStale, reconnectAttempt }
}
