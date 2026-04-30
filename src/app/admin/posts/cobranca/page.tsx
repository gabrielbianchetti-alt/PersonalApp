import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Post · Cobrança em 1 toque — PersonalHub' }

const GREEN = '#10B981'
const GREEN_SOFT = 'rgba(16, 185, 129, 0.15)'
const BG = '#0B0F19'
const WHITE = '#F9FAFB'
const GRAY = '#9CA3AF'
const PHONE_BG = '#0F1623'
const PHONE_BORDER = '#1F2937'
const BUBBLE_BG = '#1F2937'

export default function PostCobrancaPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#000',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '24px',
        overflow: 'auto',
      }}
    >
      {/* Animations & font scoping */}
      <style>{`
        @keyframes ph-arrow-pulse {
          0%, 100% { transform: translateX(0) scale(1); opacity: 1; }
          50%     { transform: translateX(-8px) scale(1.04); opacity: 0.85; }
        }
        @keyframes ph-glow-pulse {
          0%, 100% { text-shadow: 0 0 18px rgba(16, 185, 129, 0.45), 0 0 36px rgba(16, 185, 129, 0.25); }
          50%      { text-shadow: 0 0 28px rgba(16, 185, 129, 0.65), 0 0 56px rgba(16, 185, 129, 0.35); }
        }
        @keyframes ph-btn-pulse {
          0%, 100% { box-shadow: 0 12px 32px rgba(16, 185, 129, 0.35), 0 0 0 0 rgba(16, 185, 129, 0.4); }
          50%     { box-shadow: 0 12px 32px rgba(16, 185, 129, 0.55), 0 0 0 14px rgba(16, 185, 129, 0); }
        }
        .ph-canvas { font-family: var(--font-geist), 'Geist', system-ui, -apple-system, Segoe UI, sans-serif; }
      `}</style>

      <div
        className="ph-canvas"
        style={{
          position: 'relative',
          width: '1080px',
          height: '1350px',
          background: BG,
          color: WHITE,
          overflow: 'hidden',
          flexShrink: 0,
          borderRadius: '24px',
          boxShadow: '0 40px 120px rgba(0,0,0,0.6)',
        }}
      >
        {/* Mesh gradient — emerald glow top-right */}
        <div
          style={{
            position: 'absolute',
            top: '-220px',
            right: '-220px',
            width: '760px',
            height: '760px',
            background: 'radial-gradient(circle, rgba(16,185,129,0.32) 0%, rgba(16,185,129,0.10) 38%, transparent 68%)',
            filter: 'blur(40px)',
            pointerEvents: 'none',
          }}
        />
        {/* Mesh gradient — second accent bottom-left */}
        <div
          style={{
            position: 'absolute',
            bottom: '-260px',
            left: '-200px',
            width: '640px',
            height: '640px',
            background: 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, rgba(16,185,129,0.06) 40%, transparent 70%)',
            filter: 'blur(50px)',
            pointerEvents: 'none',
          }}
        />
        {/* Subtle grain overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.25) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Content stack */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '64px 72px 56px',
          }}
        >
          {/* Header — logo + brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              aria-label="PersonalHub"
              style={{
                width: '52px',
                height: '52px',
                backgroundColor: GREEN,
                WebkitMaskImage: 'url(/logo-1024x1024.png)',
                WebkitMaskSize: 'contain',
                WebkitMaskPosition: 'center',
                WebkitMaskRepeat: 'no-repeat',
                maskImage: 'url(/logo-1024x1024.png)',
                maskSize: 'contain',
                maskPosition: 'center',
                maskRepeat: 'no-repeat',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: '22px',
                fontWeight: 600,
                letterSpacing: '-0.01em',
                color: WHITE,
              }}
            >
              PersonalHub
            </span>
          </div>

          {/* Headline + sub */}
          <div style={{ marginTop: '54px' }}>
            <h1
              style={{
                fontSize: '92px',
                lineHeight: 1.02,
                fontWeight: 800,
                letterSpacing: '-0.035em',
                color: WHITE,
                margin: 0,
              }}
            >
              Sua cobrança<br />em <span style={{ color: GREEN }}>1 toque.</span>
            </h1>
            <p
              style={{
                marginTop: '24px',
                fontSize: '28px',
                lineHeight: 1.4,
                color: GRAY,
                fontWeight: 400,
                letterSpacing: '-0.005em',
                maxWidth: '780px',
              }}
            >
              O PersonalHub gera a mensagem com datas, valor e Pix.<br />
              <span style={{ color: WHITE, fontWeight: 500 }}>Você só envia.</span>
            </p>
          </div>

          {/* Phone mockup + arrow */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              marginTop: '32px',
              marginBottom: '24px',
            }}
          >
            {/* Phone */}
            <div
              style={{
                width: '430px',
                height: '700px',
                background: PHONE_BG,
                border: `2px solid ${PHONE_BORDER}`,
                borderRadius: '48px',
                boxShadow: '0 40px 80px rgba(0,0,0,0.55), 0 0 0 8px rgba(255,255,255,0.03)',
                padding: '14px',
                position: 'relative',
              }}
            >
              {/* Notch */}
              <div
                style={{
                  position: 'absolute',
                  top: '14px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '120px',
                  height: '28px',
                  background: '#000',
                  borderRadius: '20px',
                  zIndex: 2,
                }}
              />
              {/* Screen */}
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: BG,
                  borderRadius: '36px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '54px 22px 22px',
                }}
              >
                {/* Aluno header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    paddingBottom: '14px',
                    borderBottom: '1px solid #1F2937',
                  }}
                >
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '15px',
                      flexShrink: 0,
                    }}
                  >
                    AS
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: WHITE, lineHeight: 1.2 }}>
                      Ana Silva
                    </div>
                    <div style={{ fontSize: '11px', color: GRAY, marginTop: '2px' }}>
                      Cobrança · Abril/2026
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '4px 10px',
                      borderRadius: '999px',
                      background: GREEN_SOFT,
                      color: GREEN,
                      fontSize: '10px',
                      fontWeight: 600,
                      letterSpacing: '0.02em',
                    }}
                  >
                    PRONTA
                  </div>
                </div>

                {/* Resumo */}
                <div
                  style={{
                    marginTop: '14px',
                    padding: '12px 14px',
                    background: BUBBLE_BG,
                    borderRadius: '14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', color: GRAY, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      12 aulas
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 700, color: WHITE, marginTop: '2px' }}>
                      R$ 980,00
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: GREEN,
                      fontWeight: 600,
                      background: GREEN_SOFT,
                      padding: '6px 10px',
                      borderRadius: '8px',
                    }}
                  >
                    Pix incluído
                  </div>
                </div>

                {/* Mensagem preview */}
                <div
                  style={{
                    marginTop: '12px',
                    padding: '12px 14px',
                    background: BUBBLE_BG,
                    borderRadius: '14px',
                    fontSize: '11.5px',
                    lineHeight: 1.55,
                    color: WHITE,
                    flex: 1,
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ color: GRAY, fontSize: '10px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Mensagem
                  </div>
                  <div>
                    Oi Ana! 👋 Segue o resumo das aulas de <strong>abril/2026</strong>:
                  </div>
                  <div style={{ marginTop: '8px', color: GRAY }}>
                    📅 06, 08, 10, 13, 15, 17, 20, 22, 24, 27, 29 e 30 (12 aulas)
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    💰 Valor: <strong>R$ 980,00</strong>
                  </div>
                  <div style={{ marginTop: '6px', color: GRAY }}>
                    🔑 Pix: <span style={{ color: WHITE }}>gabriel@personalhub.fit</span>
                  </div>
                  <div style={{ marginTop: '8px', color: GRAY }}>
                    Vencimento: <span style={{ color: WHITE }}>05/05/2026</span>
                  </div>
                </div>

                {/* Botão WhatsApp */}
                <button
                  type="button"
                  style={{
                    marginTop: '14px',
                    width: '100%',
                    height: '54px',
                    background: GREEN,
                    color: '#062E22',
                    border: 'none',
                    borderRadius: '14px',
                    fontSize: '16px',
                    fontWeight: 700,
                    letterSpacing: '-0.01em',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    animation: 'ph-btn-pulse 2.2s ease-in-out infinite',
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M17.6 6.32A8.84 8.84 0 0 0 11.5 3.7a8.93 8.93 0 0 0-7.74 13.4L2.5 21.6l4.6-1.2a8.93 8.93 0 0 0 4.4 1.13h.01a8.93 8.93 0 0 0 8.92-8.93 8.85 8.85 0 0 0-2.83-6.28zm-6.1 13.74a7.42 7.42 0 0 1-3.78-1.04l-.27-.16-2.74.72.73-2.66-.18-.28a7.42 7.42 0 1 1 13.78-3.95 7.43 7.43 0 0 1-7.42 7.4zm4.07-5.55c-.22-.11-1.32-.65-1.52-.72-.21-.07-.35-.11-.5.11-.15.22-.58.72-.7.87-.13.15-.26.16-.48.05-.22-.11-.94-.35-1.79-1.1-.66-.59-1.1-1.32-1.23-1.54-.13-.22-.01-.34.1-.45.1-.1.22-.27.33-.4.11-.13.15-.22.22-.37.07-.15.04-.28-.02-.39-.05-.11-.5-1.2-.68-1.65-.18-.43-.36-.37-.5-.38l-.43-.01a.83.83 0 0 0-.6.28c-.21.22-.79.77-.79 1.88s.81 2.18.92 2.33c.11.15 1.6 2.43 3.87 3.41.54.24.96.38 1.29.49.54.17 1.04.15 1.43.09.44-.07 1.32-.54 1.51-1.07.19-.52.19-.97.13-1.07-.06-.1-.21-.16-.43-.27z" />
                  </svg>
                  Enviar WhatsApp
                </button>
              </div>
            </div>

            {/* Animated arrow + "1 toque" badge */}
            <div
              style={{
                position: 'absolute',
                right: '40px',
                bottom: '110px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                animation: 'ph-arrow-pulse 1.4s ease-in-out infinite',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  background: WHITE,
                  color: BG,
                  padding: '10px 18px',
                  borderRadius: '999px',
                  fontSize: '20px',
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                  whiteSpace: 'nowrap',
                }}
              >
                1 toque
              </div>
              <svg width="78" height="42" viewBox="0 0 78 42" fill="none" aria-hidden="true">
                <path
                  d="M4 21 Q 30 4, 70 21"
                  stroke={WHITE}
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M58 12 L72 21 L58 30"
                  stroke={WHITE}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </div>
          </div>

          {/* Bullets */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              columnGap: '40px',
              rowGap: '18px',
              marginTop: '8px',
            }}
          >
            {[
              'Mensagem pronta automaticamente',
              'Datas das aulas calculadas',
              'Pix incluído',
              'Envia direto pelo WhatsApp',
            ].map((text) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: GREEN_SOFT,
                    border: `1.5px solid ${GREEN}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M5 12.5 L10 17.5 L19 7.5"
                      stroke={GREEN}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span style={{ fontSize: '22px', color: WHITE, fontWeight: 500, letterSpacing: '-0.005em' }}>
                  {text}
                </span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div
            style={{
              marginTop: '40px',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontSize: '32px',
                fontWeight: 700,
                color: GREEN,
                letterSpacing: '-0.01em',
                animation: 'ph-glow-pulse 2.6s ease-in-out infinite',
              }}
            >
              personalhub.fit
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
