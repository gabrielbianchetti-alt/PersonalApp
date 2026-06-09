// ──────────────────────────────────────────────────────────────────────────────
// Módulo server-only (importado apenas por server actions; usa env não-pública).
// Ponto de integração de e-mail para notificações (Resend) — PENDENTE.
//
// Estado atual: STUB seguro. NENHUM e-mail é enviado. Esta é a única função
// onde o envio por e-mail deve ser plugado quando o Resend estiver configurado,
// então pode ser chamada à vontade desde já (no-op).
//
// O que falta para ativar (lado Resend/Supabase):
//   1. Criar conta no Resend e verificar o domínio `personalhub.fit`
//      (registros DNS: SPF, DKIM e, opcionalmente, DMARC).
//   2. Gerar a API key e definir `RESEND_API_KEY` no ambiente (Vercel + .env.local).
//   3. `npm i resend` e implementar o envio no TODO abaixo, usando o remetente
//      `nao-responda@personalhub.fit`.
//   4. (Opcional) Apontar o SMTP do Resend no Supabase Auth, caso queira que os
//      e-mails transacionais do Auth (confirmação de conta / reset de senha)
//      também saiam pelo domínio verificado.
// ──────────────────────────────────────────────────────────────────────────────

export interface NotificacaoEmail {
  to: string
  titulo: string
  mensagem: string
  link?: string | null
}

export type EnvioEmailResultado =
  | { enviado: true }
  | { enviado: false; motivo: 'resend-nao-configurado' | 'sem-destinatario' | 'nao-implementado' }

export async function enviarEmailNotificacao(
  notif: NotificacaoEmail,
): Promise<EnvioEmailResultado> {
  if (!notif.to) return { enviado: false, motivo: 'sem-destinatario' }
  if (!process.env.RESEND_API_KEY) return { enviado: false, motivo: 'resend-nao-configurado' }

  // TODO(Resend): implementar o envio real quando o domínio estiver verificado.
  //   import { Resend } from 'resend'
  //   const resend = new Resend(process.env.RESEND_API_KEY)
  //   const base = process.env.NEXT_PUBLIC_APP_URL ?? ''
  //   await resend.emails.send({
  //     from:    'PersonalHub <nao-responda@personalhub.fit>',
  //     to:      notif.to,
  //     subject: notif.titulo,
  //     text:    `${notif.mensagem}${notif.link ? `\n\n${base}${notif.link}` : ''}`,
  //   })
  //   return { enviado: true }
  return { enviado: false, motivo: 'nao-implementado' }
}
