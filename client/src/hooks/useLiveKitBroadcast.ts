import { useState, useRef, useCallback, useEffect } from 'react'
import { Room, RoomEvent, Track, type LocalTrackPublication } from 'livekit-client'

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
        room.localParticipant.trackPublications.forEach((pub: LocalTrackPublication) => {
          if (pub.track) {
            room.localParticipant.unpublishTrack(pub.track)
          }
        })
        await room.disconnect()
      } catch {
        // ignore cleanup errors
      }
      roomRef.current = null
    }
    setIsConnected(false)
    setIsBroadcasting(false)
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
