-- ============================================
-- DESABILITAR TODOS OS TRIGGERS DE WEBHOOK
-- Execute este script no Supabase SQL Editor
-- ============================================

-- Triggers de CARDS
DROP TRIGGER IF EXISTS trigger_card_created ON cards;
DROP TRIGGER IF EXISTS trigger_card_updated ON cards;
DROP TRIGGER IF EXISTS trigger_card_deleted ON cards;
DROP TRIGGER IF EXISTS trigger_card_moved ON cards;

-- Triggers de CONTACTS
DROP TRIGGER IF EXISTS trigger_contact_created ON contacts;
DROP TRIGGER IF EXISTS trigger_contact_updated ON contacts;
DROP TRIGGER IF EXISTS trigger_contact_deleted ON contacts;

-- Triggers de PRODUCTS
DROP TRIGGER IF EXISTS trigger_product_created ON products;
DROP TRIGGER IF EXISTS trigger_product_updated ON products;
DROP TRIGGER IF EXISTS trigger_product_deleted ON products;

-- Triggers de APPOINTMENTS
DROP TRIGGER IF EXISTS trigger_appointment_created ON appointments;
DROP TRIGGER IF EXISTS trigger_appointment_updated ON appointments;
DROP TRIGGER IF EXISTS trigger_appointment_deleted ON appointments;

-- Triggers de TASKS
DROP TRIGGER IF EXISTS trigger_task_created ON tasks;
DROP TRIGGER IF EXISTS trigger_task_updated ON tasks;
DROP TRIGGER IF EXISTS trigger_task_deleted ON tasks;

-- Mensagem de confirmação
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Todos os triggers de webhook foram desabilitados com sucesso';
  RAISE NOTICE '✅ Os webhooks agora são disparados apenas do frontend via dispatch-webhook-v2';
  RAISE NOTICE '✅ Isto resolve o erro: record "new" has no field "created_by"';
END $$;
