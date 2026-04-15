import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

const P_COLOR = '#2D5432'
const H_COLOR = '#6B9870'

export default function Icon() {
  // Scale SVG viewBox (0 0 56 64) to 32×32
  // Scale factor: 32/64 = 0.5 for height; width = 56*0.5 = 28; we center in 32px
  const scale = 32 / 64  // 0.5
  const offsetX = (32 - 56 * scale) / 2  // (32-28)/2 = 2

  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 7,
          background: '#111827',
        }}
      >
        <svg
          width={56 * scale}
          height={64 * scale}
          viewBox="0 0 56 64"
          style={{ marginLeft: 0 }}
        >
          {/* H */}
          <rect x="12" y="20" width="13" height="44" rx="4" fill={H_COLOR} />
          <rect x="42" y="20" width="14" height="44" rx="4" fill={H_COLOR} />
          <rect x="12" y="36" width="44" height="12" fill={H_COLOR} />
          {/* P */}
          <path
            fillRule="evenodd"
            fill={P_COLOR}
            d="M 0 5 Q 0 0 5 0 H 33 Q 50 0 50 17 Q 50 34 33 34 H 18 V 59 Q 18 64 13 64 H 5 Q 0 64 0 59 Z M 18 11 H 30 Q 40 11 40 17 Q 40 23 30 23 H 18 Z"
          />
        </svg>
      </div>
    ),
    { ...size },
  )
}
