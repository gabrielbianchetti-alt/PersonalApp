import type { Metadata } from 'next'
import { StyleguideView } from './StyleguideView'

export const metadata: Metadata = { title: 'Design System — PersonalHub' }

export default function StyleguidePage() {
  return <StyleguideView />
}
