import { useState, useRef, useCallback, useEffect } from 'react'
import { Room, RoomEvent, type LocalTrackPublication } from 'livekit-client'

interface UseLiveKitBroadcastOptions {
  livekitUrl: string | undefined
  livekitToken: string | undefined
}

interface UseLiveKitBroadcastReturn {
  isConnected: boolean
  isBroadcasting: boolean
  error: string | null
  startBroadcast: () => void
  stopBroadcast: () => void
}

export function useLiveKitBroadcast({ livekitUrl, livekitToken }: UseLiveKitBroadcastOptions): UseLiveKitBroadcastReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [isBroadcasting, setIsBroadcasting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const roomRef = useRef<Room | null>(null)
  const stoppedRef = useRef(false)

  const cleanup = useCallback(async () => {
    const room = roomRef.current
    if (room) {
      try {
        // Stop tracks synchronously first (track.stop() is sync)
        room.localParticipant.trackPublications.forEach((pub: LocalTrackPublication) => {
          if (pub.track) {
            pub.track.stop()
            room.localParticipant.unpublishTrack(pub.track)
          }
        })
        await room.disconnect()
      } catch {
        // ignore cleanup errors
      }
      roomRef.current = null
    }
    // Guard against state updates after unmount
    if (!stoppedRef.current) {
      setIsConnected(false)
      setIsBroadcasting(false)
    }
  }, [])

  const startBroadcast = useCallback(async () => {
    if (!livekitUrl || !livekitToken) return
    stoppedRef.current = false
    setError(null)

    try {
      // Clean up any existing room
      if (roomRef.current) {
        await cleanup()
      }

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      })
      roomRef.current = room

      room.on(RoomEvent.Connected, () => {
        setIsConnected(true)
        setError(null)
      })

      room.on(RoomEvent.Disconnected, () => {
        setIsConnected(false)
        setIsBroadcasting(false)
      })

      room.on(RoomEvent.LocalTrackPublished, () => {
        setIsBroadcasting(true)
      })

      room.on(RoomEvent.LocalTrackUnpublished, () => {
        const hasTracks = room.localParticipant.trackPublications.size > 0
        if (!hasTracks) setIsBroadcasting(false)
      })

      // Connect to the LiveKit room
      await room.connect(livekitUrl, livekitToken)
      setIsConnected(true)

      if (stoppedRef.current) {
        await room.disconnect()
        roomRef.current = null
        return
      }

      // Publish camera and microphone
      await room.localParticipant.enableCameraAndMicrophone()
      setIsBroadcasting(true)
    } catch (err) {
      setError(`LiveKit error: ${(err as Error).message}`)
      setIsConnected(false)
      setIsBroadcasting(false)
    }
  }, [livekitUrl, livekitToken, cleanup])

  const stopBroadcast = useCallback(async () => {
    stoppedRef.current = true
    await cleanup()
    // Explicitly update state since component is still mounted when user calls stop
    stoppedRef.current = false
    setIsConnected(false)
    setIsBroadcasting(false)
  }, [cleanup])

  // Cleanup on unmount — fire-and-forget since useEffect cleanup must be sync
  useEffect(() => {
    return () => {
      stoppedRef.current = true
      // Stop tracks synchronously for immediate resource release
      const room = roomRef.current
      if (room) {
        room.localParticipant.trackPublications.forEach((pub: LocalTrackPublication) => {
          if (pub.track) {
            pub.track.stop()
          }
        })
      }
      void cleanup()
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
