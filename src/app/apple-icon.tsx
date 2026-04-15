import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

const P_COLOR = '#2D5432'
const H_COLOR = '#6B9870'

export default function AppleIcon() {
  // Scale SVG viewBox (0 0 56 64) to fit 180×180
  // Use height as reference: 140px tall icon, centered
  const svgH = 140
  const scale = svgH / 64
  const svgW = 56 * scale  // ~122.5

  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 38,
          background: '#111827',
        }}
      >
        <svg
          width={svgW}
          height={svgH}
          viewBox="0 0 56 64"
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
