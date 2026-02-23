import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

interface MiniPlayerState {
  streamId: string
  streamTitle: string
  sellerName: string
  sellerAvatar: string | null
  lkUrl: string
  lkToken: string
}

interface MiniPlayerContextType {
  miniPlayer: MiniPlayerState | null
  minimizeStream: (state: MiniPlayerState) => void
  closeMiniPlayer: () => void
  expandMiniPlayer: () => void
}

const MiniPlayerContext = createContext<MiniPlayerContextType | undefined>(undefined)

export function MiniPlayerProvider({ children }: { children: ReactNode }) {
  const [miniPlayer, setMiniPlayer] = useState<MiniPlayerState | null>(null)
  const navigate = useNavigate()

  const minimizeStream = useCallback((state: MiniPlayerState) => {
    setMiniPlayer(state)
    navigate('/')
  }, [navigate])

  const closeMiniPlayer = useCallback(() => {
    setMiniPlayer(null)
  }, [])

  const expandMiniPlayer = useCallback(() => {
    if (miniPlayer) {
      const streamId = miniPlayer.streamId
      setMiniPlayer(null)
      navigate(`/stream/${streamId}`)
    }
  }, [miniPlayer, navigate])

  return (
    <MiniPlayerContext.Provider value={{ miniPlayer, minimizeStream, closeMiniPlayer, expandMiniPlayer }}>
      {children}
    </MiniPlayerContext.Provider>
  )
}

export function useMiniPlayer() {
  const ctx = useContext(MiniPlayerContext)
  if (!ctx) throw new Error('useMiniPlayer must be used within MiniPlayerProvider')
  return ctx
}
