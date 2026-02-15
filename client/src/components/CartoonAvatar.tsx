// Deterministic cartoon avatar generator based on a seed string
// Generates unique SVG avatars with different features

const SKIN_COLORS = ['#FFDBB4', '#EDB98A', '#D08B5B', '#AE5D29', '#694D3D', '#F8D5C2']
const HAIR_COLORS = ['#2C1B18', '#4A3728', '#8D5524', '#D6B370', '#B55239', '#E8E1E1', '#5C3A6E', '#2D6B9F']
const BG_COLORS = ['#F0908A', '#A78BFA', '#34D399', '#FBBF24', '#60A5FA', '#F472B6', '#FB923C', '#818CF8']
const HAIR_STYLES = ['short', 'long', 'curly', 'spiky', 'bun', 'none'] as const
const EYE_STYLES = ['round', 'happy', 'cool'] as const

function hashSeed(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function pick<T>(arr: readonly T[], hash: number, offset: number): T {
  return arr[(hash + offset) % arr.length]
}

interface CartoonAvatarProps {
  seed: string
  size: number
}

export default function CartoonAvatar({ seed, size }: CartoonAvatarProps) {
  const h = hashSeed(seed)
  const skin = pick(SKIN_COLORS, h, 0)
  const hair = pick(HAIR_COLORS, h, 3)
  const bg = pick(BG_COLORS, h, 5)
  const hairStyle = pick(HAIR_STYLES, h, 7)
  const eyeStyle = pick(EYE_STYLES, h, 11)
  const hasBlush = h % 3 === 0
  const hasFreckles = h % 5 === 0

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* Background */}
      <rect width="100" height="100" rx="20" fill={bg} />

      {/* Head */}
      <ellipse cx="50" cy="52" rx="30" ry="33" fill={skin} />

      {/* Hair */}
      {hairStyle === 'short' && (
        <path d="M20 45c0-18 13-32 30-32s30 14 30 32c0 2-2 3-4 1-3-5-8-8-13-8h-26c-5 0-10 3-13 8-2 2-4 1-4-1z" fill={hair} />
      )}
      {hairStyle === 'long' && (
        <>
          <path d="M20 45c0-18 13-32 30-32s30 14 30 32c0 2-2 3-4 1-3-5-8-8-13-8h-26c-5 0-10 3-13 8-2 2-4 1-4-1z" fill={hair} />
          <rect x="17" y="42" width="8" height="35" rx="4" fill={hair} />
          <rect x="75" y="42" width="8" height="35" rx="4" fill={hair} />
        </>
      )}
      {hairStyle === 'curly' && (
        <>
          <circle cx="30" cy="28" r="10" fill={hair} />
          <circle cx="50" cy="22" r="11" fill={hair} />
          <circle cx="70" cy="28" r="10" fill={hair} />
          <circle cx="22" cy="40" r="8" fill={hair} />
          <circle cx="78" cy="40" r="8" fill={hair} />
        </>
      )}
      {hairStyle === 'spiky' && (
        <>
          <polygon points="35,20 40,35 30,35" fill={hair} />
          <polygon points="50,12 55,30 45,30" fill={hair} />
          <polygon points="65,20 70,35 60,35" fill={hair} />
          <polygon points="25,32 32,42 22,42" fill={hair} />
          <polygon points="75,32 78,42 68,42" fill={hair} />
          <path d="M23 42c3-12 13-22 27-22s24 10 27 22H23z" fill={hair} />
        </>
      )}
      {hairStyle === 'bun' && (
        <>
          <path d="M20 45c0-18 13-32 30-32s30 14 30 32c0 2-2 3-4 1-3-5-8-8-13-8h-26c-5 0-10 3-13 8-2 2-4 1-4-1z" fill={hair} />
          <circle cx="50" cy="15" r="12" fill={hair} />
        </>
      )}

      {/* Eyes */}
      {eyeStyle === 'round' && (
        <>
          <circle cx="38" cy="52" r="5" fill="white" />
          <circle cx="62" cy="52" r="5" fill="white" />
          <circle cx="39" cy="52" r="3" fill="#2C1B18" />
          <circle cx="63" cy="52" r="3" fill="#2C1B18" />
          <circle cx="40" cy="51" r="1.2" fill="white" />
          <circle cx="64" cy="51" r="1.2" fill="white" />
        </>
      )}
      {eyeStyle === 'happy' && (
        <>
          <path d="M33 52c3-4 7-4 10 0" stroke="#2C1B18" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M57 52c3-4 7-4 10 0" stroke="#2C1B18" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </>
      )}
      {eyeStyle === 'cool' && (
        <>
          <rect x="30" y="48" width="16" height="8" rx="4" fill="#2C1B18" opacity="0.8" />
          <rect x="54" y="48" width="16" height="8" rx="4" fill="#2C1B18" opacity="0.8" />
          <rect x="46" y="50" width="8" height="4" rx="2" fill="#2C1B18" opacity="0.5" />
          <line x1="31" y1="52" x2="45" y2="52" stroke="white" strokeWidth="1.5" opacity="0.4" />
          <line x1="55" y1="52" x2="69" y2="52" stroke="white" strokeWidth="1.5" opacity="0.4" />
        </>
      )}

      {/* Nose */}
      <ellipse cx="50" cy="60" rx="2.5" ry="2" fill={skin} stroke="#00000015" strokeWidth="1" />

      {/* Mouth — smile */}
      <path d="M42 67c4 5 12 5 16 0" stroke="#2C1B18" strokeWidth="2" strokeLinecap="round" fill="none" />

      {/* Blush */}
      {hasBlush && (
        <>
          <ellipse cx="32" cy="62" rx="5" ry="3" fill="#FF9999" opacity="0.35" />
          <ellipse cx="68" cy="62" rx="5" ry="3" fill="#FF9999" opacity="0.35" />
        </>
      )}

      {/* Freckles */}
      {hasFreckles && (
        <>
          <circle cx="35" cy="58" r="1" fill="#00000020" />
          <circle cx="38" cy="60" r="1" fill="#00000020" />
          <circle cx="62" cy="58" r="1" fill="#00000020" />
          <circle cx="65" cy="60" r="1" fill="#00000020" />
        </>
      )}

      {/* Ears */}
      <ellipse cx="20" cy="52" rx="5" ry="7" fill={skin} />
      <ellipse cx="80" cy="52" rx="5" ry="7" fill={skin} />
    </svg>
  )
}
