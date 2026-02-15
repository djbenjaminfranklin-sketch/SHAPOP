import { useState, useRef, useCallback, useEffect } from 'react'

interface UseMuxBroadcastOptions {
  streamId: string | undefined
  token: string | undefined
  mediaStream: MediaStream | null
}

interface UseMuxBroadcastReturn {
  isConnected: boolean
  isBroadcasting: boolean
  error: string | null
  startBroadcast: () => void
  stopBroadcast: () => void
}

export function useMuxBroadcast({ streamId, token, mediaStream }: UseMuxBroadcastOptions): UseMuxBroadcastReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [isBroadcasting, setIsBroadcasting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const retryCountRef = useRef(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stoppedRef = useRef(false)

  const MAX_RETRIES = 5

  const cleanup = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop()
    }
    recorderRef.current = null

    if (wsRef.current) {
      wsRef.current.close()
    }
    wsRef.current = null

    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }

    setIsConnected(false)
    setIsBroadcasting(false)
  }, [])

  const connect = useCallback(async () => {
    if (!streamId || !token || !mediaStream || stoppedRef.current) return

    setError(null)

    const { wsUrl: buildWsUrl } = await import('../lib/api')
    const wsUrlStr = buildWsUrl(`/ws/video?streamId=${streamId}&token=${token}`)

    const ws = new WebSocket(wsUrlStr)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      setError(null)
      retryCountRef.current = 0

      // Start MediaRecorder to send video chunks
      try {
        // Prefer webm/vp8 for broad compatibility
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
          ? 'video/webm;codecs=vp8,opus'
          : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
            ? 'video/webm;codecs=vp8'
            : 'video/webm'

        const recorder = new MediaRecorder(mediaStream, {
          mimeType,
          videoBitsPerSecond: 1_500_000,
        })

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(event.data)
          }
        }

        recorder.start(1000) // Send chunks every 1 second
        recorderRef.current = recorder
        setIsBroadcasting(true)
      } catch (err) {
        setError(`MediaRecorder error: ${(err as Error).message}`)
      }
    }

    ws.onclose = () => {
      setIsConnected(false)
      setIsBroadcasting(false)

      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop()
      }
      recorderRef.current = null

      // Reconnect with exponential backoff
      if (!stoppedRef.current && retryCountRef.current < MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 16000)
        retryCountRef.current++
        retryTimerRef.current = setTimeout(() => {
          connect()
        }, delay)
      }
    }

    ws.onerror = () => {
      setError('WebSocket connection error')
    }
  }, [streamId, token, mediaStream])

  const startBroadcast = useCallback(() => {
    stoppedRef.current = false
    retryCountRef.current = 0
    connect()
  }, [connect])

  const stopBroadcast = useCallback(() => {
    stoppedRef.current = true
    cleanup()
  }, [cleanup])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stoppedRef.current = true
      cleanup()
    }
  }, [cleanup])

  return {
    isConnected,
    isBroadcasting,
    error,
    startBroadcast,
    stopBroadcast,
  }
}
