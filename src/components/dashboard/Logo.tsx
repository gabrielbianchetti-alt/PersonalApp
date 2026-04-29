import type { CSSProperties } from 'react'

interface Props {
  /** lado em px do quadrado em que a logo é desenhada (default 32) */
  size?: number
  className?: string
  style?: CSSProperties
  ariaLabel?: string
  /**
   * Cor da logo. Aceita qualquer valor CSS (color/var()).
   * Default: var(--green-primary) — segue a cor accent escolhida pelo professor.
   */
  color?: string
}

/**
 * Logo "ph" do PersonalHub aplicada como máscara CSS sobre um background
 * colorido. Por padrão usa var(--green-primary), que é definida pelo accent
 * do professor — então a logo acompanha o tema escolhido sem precisar de
 * múltiplas versões coloridas do asset.
 *
 * Use APENAS dentro do app autenticado. Em superfícies públicas (landing,
 * login, convite, e-mail) prefira o <img src="/logo-1024x1024.png" /> com
 * o verde esmeralda fixo.
 */
export function Logo({
  size = 32,
  className,
  style,
  ariaLabel = 'PersonalHub',
  color = 'var(--green-primary)',
}: Props) {
  return (
    <span
      role="img"
      aria-label={ariaLabel}
      className={className}
      style={{
        display: 'inline-block',
        width:   size,
        height:  size,
        flexShrink: 0,
        backgroundColor: color,
        WebkitMaskImage:    'url(/logo-1024x1024.png)',
        WebkitMaskSize:     'contain',
        WebkitMaskPosition: 'center',
        WebkitMaskRepeat:   'no-repeat',
        maskImage:    'url(/logo-1024x1024.png)',
        maskSize:     'contain',
        maskPosition: 'center',
        maskRepeat:   'no-repeat',
        ...style,
      }}
    />
  )
}
