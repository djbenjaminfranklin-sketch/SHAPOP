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

  // Get all remote camera tracks (seller + potential co-host)
  const videoTracks = tracks.filter(
    t => t.source === Track.Source.Camera && t.publication?.track
      && t.participant.identity !== undefined
      && participants.some(p => p.identity === t.participant.identity)
  ) as import('@livekit/components-react').TrackReference[]

  const audioTracks = tracks.filter(
    t => t.source === Track.Source.Microphone && t.publication?.track
      && t.participant.identity !== undefined
      && participants.some(p => p.identity === t.participant.identity)
  ) as import('@livekit/components-react').TrackReference[]

  if (videoTracks.length === 0) {
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

  // Single publisher — full screen
  if (videoTracks.length === 1) {
    return (
      <div style={{ width: '100%', height: '100%', position: 'relative', ...style }}>
        <VideoTrack
          trackRef={videoTracks[0]}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {audioTracks.map((at, i) => at.publication?.track && (
          <AudioTrack key={i} trackRef={at} volume={muted ? 0 : 1} />
        ))}
      </div>
    )
  }

  // Multiple publishers (co-host) — split screen vertically
  // Sort: seller first, cohost second
  const sorted = [...videoTracks].sort((a, b) => {
    const aIsSeller = a.participant.identity?.startsWith('seller-') ? 0 : 1
    const bIsSeller = b.participant.identity?.startsWith('seller-') ? 0 : 1
    return aIsSeller - bIsSeller
  })

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', ...style }}>
      {sorted.map((vt, i) => (
        <div key={i} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <VideoTrack
            trackRef={vt}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {/* Label */}
          <div style={{
            position: 'absolute', bottom: '6px', left: '6px',
            backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
            padding: '2px 8px', borderRadius: '6px',
            fontSize: '10px', fontWeight: 700, color: '#fff',
          }}>
            {vt.participant.identity?.startsWith('seller-') ? 'Host' : 'Co-host'}
          </div>
        </div>
      ))}
      {audioTracks.map((at, i) => at.publication?.track && (
        <AudioTrack key={`audio-${i}`} trackRef={at} volume={muted ? 0 : 1} />
      ))}
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
