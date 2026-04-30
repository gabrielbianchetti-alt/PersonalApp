import type { CSSProperties } from 'react'

interface Props {
  className?: string
  style?: CSSProperties
  width?: string | number
  height?: string | number
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
}

const RADIUS: Record<NonNullable<Props['rounded']>, string> = {
  sm: '4px', md: '6px', lg: '8px', xl: '12px', '2xl': '16px', full: '9999px',
}

export function Skeleton({ className, style, width, height, rounded = 'lg' }: Props) {
  return (
    <div
      aria-hidden
      className={`ph-skeleton ${className ?? ''}`.trim()}
      style={{
        width:  width  ?? '100%',
        height: height ?? '1em',
        borderRadius: RADIUS[rounded],
        ...style,
      }}
    />
  )
}
