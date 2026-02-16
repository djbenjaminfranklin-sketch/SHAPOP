import { LiveKitRoom, VideoTrack, AudioTrack, useRemoteParticipants, useTracks } from '@livekit/components-react'
import { Track } from 'livekit-client'
import type { CSSProperties } from 'react'

interface LiveKitViewerProps {
  livekitUrl: string
  livekitToken: string
  muted?: boolean
  style?: CSSProperties
}

function InnerViewer({ muted, style }: { muted?: boolean; style?: CSSProperties }) {
  const participants = useRemoteParticipants()
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: false },
      { source: Track.Source.Microphone, withPlaceholder: false },
    ],
    { onlySubscribed: true }
  )

  // Find the first remote camera track (the seller/publisher)
  const videoTrack = tracks.find(
    t => t.source === Track.Source.Camera && t.participant.identity !== undefined
      && participants.some(p => p.identity === t.participant.identity)
  )

  const audioTrack = tracks.find(
    t => t.source === Track.Source.Microphone && t.participant.identity !== undefined
      && participants.some(p => p.identity === t.participant.identity)
  )

  if (!videoTrack?.publication?.track) {
    return (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#000',
        ...style,
      }}>
        <div style={{
          width: '40px', height: '40px',
          border: '3px solid rgba(240,144,138,0.3)',
          borderTopColor: '#F0908A',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', ...style }}>
      <VideoTrack
        trackRef={videoTrack}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      {audioTrack?.publication?.track && (
        <AudioTrack trackRef={audioTrack} volume={muted ? 0 : 1} />
      )}
    </div>
  )
}

export default function LiveKitViewer({ livekitUrl, livekitToken, muted, style }: LiveKitViewerProps) {
  return (
    <LiveKitRoom
      serverUrl={livekitUrl}
      token={livekitToken}
      connect={true}
      audio={false}
      video={false}
      style={{ width: '100%', height: '100%' }}
    >
      <InnerViewer muted={muted} style={style} />
    </LiveKitRoom>
  )
}
