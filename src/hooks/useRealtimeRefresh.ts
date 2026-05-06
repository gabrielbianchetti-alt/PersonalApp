'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

/**
 * Subscribe to Supabase Realtime changes on the given tables (filtered by
 * professor_id = auth.uid()) and call router.refresh() when something changes.
 *
 * Combined with revalidatePath('/dashboard', 'layout') in the server actions,
 * this gives us live updates on the screen *while it's open*: a class added
 * from another tab/device or a cobrança marked paid elsewhere shows up here
 * within ~250ms without a manual reload.
 *
 * Pass `tables` as a comma-separated string to keep the dependency stable
 * without forcing callers to memoize an array. The order matters only for the
 * channel name; behavior is identical regardless.
 *
 * Requirement: each table listed must be in the `supabase_realtime`
 * publication. See supabase-migrations/realtime-publication.sql.
 */
export function useRealtimeRefresh(tables: string) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    let timer: ReturnType<typeof setTimeout> | null = null
    let channel: RealtimeChannel | null = null
    let cancelled = false

    // Debounce: a single mutation often triggers cascading writes (delete an
    // aluno → faltas/cobrancas/eventos/pacotes all fire). Coalesce into one
    // refresh to avoid thrashing.
    const refresh = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        router.refresh()
      }, 250)
    }

    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled || !user) return

      const tableList = tables.split(',').map(t => t.trim()).filter(Boolean)
      // Channel name must be unique per (tables, user). Without uniqueness the
      // server reuses an existing channel and silently drops our handlers.
      channel = supabase.channel(`rt:${user.id}:${tableList.join(',')}`)

      for (const table of tableList) {
        channel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            filter: `professor_id=eq.${user.id}`,
          },
          refresh,
        )
      }

      channel.subscribe()
    })

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      if (channel) void supabase.removeChannel(channel)
    }
  }, [tables, router])
}
