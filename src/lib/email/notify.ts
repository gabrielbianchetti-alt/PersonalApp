// ──────────────────────────────────────────────────────────────────────────────
// Módulo server-only (importado apenas por server actions; usa env não-pública).
// Envio de e-mail de notificações via Resend.
//
// O envio JÁ está implementado, mas só dispara quando `RESEND_API_KEY` existe —
// até lá é um no-op seguro (pode ser chamado à vontade). Para ativar:
//   1. Criar conta no Resend e verificar o domínio `personalhub.fit`
//      (registros DNS: SPF, DKIM e, opcionalmente, DMARC).
//   2. Definir `RESEND_API_KEY` no ambiente (Vercel + .env.local). Opcional:
//      `RESEND_FROM` para sobrescrever o remetente padrão.
//   3. (Opcional) Apontar o SMTP do Resend no Supabase Auth, caso queira que os
//      e-mails transacionais do Auth (confirmação / reset de senha) também saiam
//      pelo domínio verificado.
// ──────────────────────────────────────────────────────────────────────────────

const DEFAULT_FROM = 'PersonalHub <nao-responda@personalhub.fit>'

export interface NotificacaoEmail {
  to: string
  titulo: string
  mensagem: string
  link?: string | null
}

export type EnvioEmailResultado =
  | { enviado: true; id?: string }
  | { enviado: false; motivo: 'resend-nao-configurado' | 'sem-destinatario' | 'erro-envio'; detalhe?: string }

export async function enviarEmailNotificacao(
  notif: NotificacaoEmail,
): Promise<EnvioEmailResultado> {
  if (!notif.to) return { enviado: false, motivo: 'sem-destinatario' }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { enviado: false, motivo: 'resend-nao-configurado' }

  try {
    // Import dinâmico: o SDK só é carregado quando há key (no-op fica leve).
    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)
    const base = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const text = `${notif.mensagem}${notif.link ? `\n\n${base}${notif.link}` : ''}`

    const { data, error } = await resend.emails.send({
      from:    process.env.RESEND_FROM ?? DEFAULT_FROM,
      to:      notif.to,
      subject: notif.titulo,
      text,
    })

    if (error) {
      console.error('enviarEmailNotificacao:', error)
      return { enviado: false, motivo: 'erro-envio', detalhe: error.message }
    }
    return { enviado: true, id: data?.id }
  } catch (e) {
    console.error('enviarEmailNotificacao:', e)
    return { enviado: false, motivo: 'erro-envio', detalhe: e instanceof Error ? e.message : String(e) }
  }
}
