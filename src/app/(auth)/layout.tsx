export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: 'var(--bg-base)' }}>
      {/* Subtle background glow */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-[0.04] blur-3xl"
          style={{ background: 'var(--green-primary)' }}
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <img src="/personalhub-icon.svg" alt="PH" className="w-9 h-9 rounded-xl" />
          <span className="text-xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            PersonalHub
          </span>
        </div>

        {children}
      </div>
    </div>
  )
}
