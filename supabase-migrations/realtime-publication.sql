-- Enables Supabase Realtime for the tables consumed by useRealtimeRefresh.
-- Idempotent: re-running this is safe — ALTER PUBLICATION ... ADD TABLE
-- raises duplicate_object on tables already in the publication, which we
-- swallow with a DO block.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'eventos_agenda',
    'cobrancas',
    'alunos',
    'faltas',
    'pacotes',
    'custos',
    'receitas_extras',
    'suspensoes',
    'feriados_decisoes',
    'preferencias_cobranca',
    'preferencias_faltas',
    'metas',
    'notificacoes_usuario'
  ]
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION
      WHEN duplicate_object THEN
        NULL; -- already added, skip
      WHEN undefined_table THEN
        RAISE NOTICE 'Table public.% does not exist — skipping', t;
    END;
  END LOOP;
END $$;
