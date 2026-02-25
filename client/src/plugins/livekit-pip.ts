import { registerPlugin } from '@capacitor/core'

interface LiveKitPiPPlugin {
  prepare(options: { url: string; token: string }): Promise<void>
  startPiP(): Promise<void>
  stop(): Promise<void>
  addListener(event: 'pipStarted' | 'pipStopped', cb: () => void): Promise<{ remove: () => Promise<void> }>
}

const LiveKitPiP = registerPlugin<LiveKitPiPPlugin>('LiveKitPiP')
export default LiveKitPiP
