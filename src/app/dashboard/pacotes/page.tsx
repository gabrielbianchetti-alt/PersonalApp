import { listPacotesAction } from './actions'
import { PacotesHub } from './PacotesHub'

export const dynamic = 'force-dynamic'

export default async function PacotesPage() {
  const { data, error } = await listPacotesAction()
  return <PacotesHub pacotes={data ?? []} initialError={error ?? null} />
}
