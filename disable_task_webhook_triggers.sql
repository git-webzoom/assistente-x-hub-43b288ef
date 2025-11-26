-- Script para desabilitar os triggers de webhook de tasks
-- Execute este script no Supabase SQL Editor

DROP TRIGGER IF EXISTS trigger_task_created ON tasks;
DROP TRIGGER IF EXISTS trigger_task_updated ON tasks;
DROP TRIGGER IF EXISTS trigger_task_deleted ON tasks;

-- Mensagem de confirmação
DO $$ 
BEGIN 
  RAISE NOTICE 'Triggers de webhook de tasks desabilitados com sucesso';
  RAISE NOTICE 'Os webhooks agora serão disparados apenas do frontend';
END $$;
