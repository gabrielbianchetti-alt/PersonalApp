import type { Metadata } from 'next'
import { getConvitePublicoAction } from '@/app/dashboard/convites/actions'
import { ConviteClient } from './ConviteClient'

export const metadata: Metadata = { title: 'Convite — PersonalHub' }
export const dynamic = 'force-dynamic'

export default async function ConvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const res = await getConvitePublicoAction(token)
  return <ConviteClient convite={res.data ?? null} error={res.error ?? null} />
}
