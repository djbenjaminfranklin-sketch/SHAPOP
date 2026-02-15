import { CITY_COORDS } from '../lib/israelCities'
import type { CityStreamMap } from '../hooks/useCityStreamCounts'

interface IsraelMapProps {
  cityData: CityStreamMap
  onCityTap: (city: string) => void
  selectedCity: string | null
}

// Simplified Israel contour (~15 points) for 300x500 viewport
const ISRAEL_PATH = `
  M 130,52
  L 148,48
  L 158,70
  L 170,95
  L 165,120
  L 155,135
  L 140,140
  L 130,155
  L 120,175
  L 110,200
  L 105,230
  L 100,260
  L 108,290
  L 120,310
  L 140,340
  L 155,370
  L 150,400
  L 142,430
  L 135,460
  L 138,480
  L 140,470
  L 148,440
  L 160,400
  L 175,360
  L 185,310
  L 180,280
  L 175,260
  L 170,240
  L 165,210
  L 165,180
  L 170,150
  L 175,120
  L 170,95
  L 160,72
  L 150,55
  Z
`

// Palette for fallback avatar circles (no photo)
const AVATAR_COLORS = [
  '#F0908A', '#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
]

export default function IsraelMap({ cityData, onCityTap, selectedCity }: IsraelMapProps) {
  return (
    <svg
      viewBox="0 0 300 500"
      style={{ width: '100%', height: '100%', maxHeight: 'calc(100vh - 160px)' }}
    >
      <defs>
        <style>{`
          @keyframes map-pulse {
            0% { opacity: 0.4; transform: scale(1); }
            50% { opacity: 0; transform: scale(1.6); }
            100% { opacity: 0; transform: scale(1.6); }
          }
          .map-pulse-ring {
            animation: map-pulse 2s ease-out infinite;
            transform-box: fill-box;
            transform-origin: center;
          }
        `}</style>
        {/* Clip paths for each city's avatars */}
        {CITY_COORDS.map(city => {
          const data = cityData[city.name]
          if (!data || data.count === 0) return null
          // Get unique sellers
          const sellers = data.streams
            .map(s => ({ name: s.seller?.display_name || '', avatar: s.seller?.avatar_url || null }))
            .filter((s, i, arr) => arr.findIndex(x => x.name === s.name) === i)
            .slice(0, 3)

          const avatarR = 13
          const gap = 17
          const n = sellers.length
          const startX = city.x - ((n - 1) * gap) / 2

          return sellers.map((_, i) => (
            <clipPath key={`clip-${city.name}-${i}`} id={`clip-${city.name}-${i}`}>
              <circle cx={startX + i * gap} cy={city.y} r={avatarR} />
            </clipPath>
          ))
        })}
      </defs>

      {/* Country outline */}
      <path
        d={ISRAEL_PATH}
        fill="#1A1A1A"
        stroke="#333"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* City markers */}
      {CITY_COORDS.map(city => {
        const data = cityData[city.name]
        const count = data?.count || 0
        const isActive = count > 0
        const isSelected = selectedCity === city.name

        if (!isActive) {
          // Inactive city — small dim dot + label
          return (
            <g key={city.name}>
              <circle cx={city.x} cy={city.y} r={5} fill="#444" opacity={0.5} />
              <text
                x={city.x}
                y={city.y + 16}
                textAnchor="middle"
                fill="#555"
                fontSize="10"
                fontWeight="500"
                style={{ pointerEvents: 'none' }}
              >
                {city.name}
              </text>
            </g>
          )
        }

        // Active city — profile photo bubbles
        const sellers = data.streams
          .map(s => ({ name: s.seller?.display_name || '', avatar: s.seller?.avatar_url || null }))
          .filter((s, i, arr) => arr.findIndex(x => x.name === s.name) === i)
          .slice(0, 3)

        const avatarR = 13
        const gap = 17
        const n = sellers.length
        const startX = city.x - ((n - 1) * gap) / 2

        // Badge position: top-right of the rightmost avatar
        const badgeX = startX + (n - 1) * gap + avatarR - 2
        const badgeY = city.y - avatarR + 2

        return (
          <g
            key={city.name}
            onClick={() => onCityTap(city.name)}
            style={{ cursor: 'pointer' }}
          >
            {/* Pulse ring behind all avatars */}
            <circle
              cx={city.x}
              cy={city.y}
              r={avatarR + 4}
              fill="#F0908A"
              className="map-pulse-ring"
            />

            {/* Selection ring */}
            {isSelected && (
              <rect
                x={startX - avatarR - 4}
                y={city.y - avatarR - 4}
                width={(n - 1) * gap + avatarR * 2 + 8}
                height={avatarR * 2 + 8}
                rx={avatarR + 4}
                fill="none"
                stroke="#fff"
                strokeWidth="1.5"
                opacity={0.6}
              />
            )}

            {/* Avatar circles (rendered right-to-left so leftmost is on top) */}
            {[...sellers].reverse().map((seller, ri) => {
              const i = n - 1 - ri
              const cx = startX + i * gap
              const colorIdx = city.name.charCodeAt(0) + i
              const fallbackColor = AVATAR_COLORS[colorIdx % AVATAR_COLORS.length]

              return (
                <g key={i}>
                  {/* Dark border ring (underneath) */}
                  <circle cx={cx} cy={city.y} r={avatarR + 1.5} fill="#000" />

                  {seller.avatar ? (
                    <image
                      href={seller.avatar}
                      x={cx - avatarR}
                      y={city.y - avatarR}
                      width={avatarR * 2}
                      height={avatarR * 2}
                      clipPath={`url(#clip-${city.name}-${i})`}
                      preserveAspectRatio="xMidYMid slice"
                    />
                  ) : (
                    <>
                      <circle cx={cx} cy={city.y} r={avatarR} fill={fallbackColor} />
                      <text
                        x={cx}
                        y={city.y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#fff"
                        fontSize="12"
                        fontWeight="700"
                        style={{ pointerEvents: 'none' }}
                      >
                        {seller.name.charAt(0).toUpperCase()}
                      </text>
                    </>
                  )}
                </g>
              )
            })}

            {/* LIVE count badge */}
            <circle cx={badgeX} cy={badgeY} r={8} fill="#E8344E" stroke="#000" strokeWidth="1.5" />
            <text
              x={badgeX}
              y={badgeY}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#fff"
              fontSize="8"
              fontWeight="800"
              style={{ pointerEvents: 'none' }}
            >
              {count}
            </text>

            {/* City label */}
            <text
              x={city.x}
              y={city.y + avatarR + 14}
              textAnchor="middle"
              fill={isSelected ? '#fff' : '#ccc'}
              fontSize="10"
              fontWeight={isSelected ? '700' : '600'}
              style={{ pointerEvents: 'none' }}
            >
              {city.name}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
