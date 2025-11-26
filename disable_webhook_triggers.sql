-- Script para desabilitar temporariamente todos os triggers de webhook
-- Isso permite testar se o problema está nos triggers ou no código frontend

-- Desabilitar triggers de cards
DROP TRIGGER IF EXISTS card_created_webhook ON cards;
DROP TRIGGER IF EXISTS card_updated_webhook ON cards;
DROP TRIGGER IF EXISTS card_deleted_webhook ON cards;
DROP TRIGGER IF EXISTS card_moved_webhook ON cards;

-- Desabilitar triggers de contacts
DROP TRIGGER IF EXISTS contact_created_webhook ON contacts;
DROP TRIGGER IF EXISTS contact_updated_webhook ON contacts;
DROP TRIGGER IF EXISTS contact_deleted_webhook ON contacts;

-- Desabilitar triggers de products
DROP TRIGGER IF EXISTS product_created_webhook ON products;
DROP TRIGGER IF EXISTS product_updated_webhook ON products;
DROP TRIGGER IF EXISTS product_deleted_webhook ON products;

-- Desabilitar triggers de appointments
DROP TRIGGER IF EXISTS appointment_created_webhook ON appointments;
DROP TRIGGER IF EXISTS appointment_updated_webhook ON appointments;
DROP TRIGGER IF EXISTS appointment_deleted_webhook ON appointments;

-- Desabilitar triggers de tasks
DROP TRIGGER IF EXISTS task_created_webhook ON tasks;
DROP TRIGGER IF EXISTS task_updated_webhook ON tasks;
DROP TRIGGER IF EXISTS task_deleted_webhook ON tasks;

-- Mensagem de confirmação
DO $$ 
BEGIN 
  RAISE NOTICE 'Todos os triggers de webhook foram desabilitados';
  RAISE NOTICE 'Agora apenas as chamadas do frontend via dispatchWebhookFromClient irão disparar webhooks';
END $$;
