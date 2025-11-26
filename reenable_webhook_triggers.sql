-- Script para reabilitar todos os triggers de webhook
-- Use este script depois de testar se o problema foi resolvido

-- Reabilitar triggers de cards
CREATE TRIGGER card_created_webhook
  AFTER INSERT ON cards
  FOR EACH ROW
  EXECUTE FUNCTION webhook_card_created();

CREATE TRIGGER card_updated_webhook
  AFTER UPDATE ON cards
  FOR EACH ROW
  EXECUTE FUNCTION webhook_card_updated();

CREATE TRIGGER card_deleted_webhook
  AFTER DELETE ON cards
  FOR EACH ROW
  EXECUTE FUNCTION webhook_card_deleted();

CREATE TRIGGER card_moved_webhook
  AFTER UPDATE OF stage_id ON cards
  FOR EACH ROW
  EXECUTE FUNCTION webhook_card_moved();

-- Reabilitar triggers de contacts
CREATE TRIGGER contact_created_webhook
  AFTER INSERT ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION webhook_contact_created();

CREATE TRIGGER contact_updated_webhook
  AFTER UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION webhook_contact_updated();

CREATE TRIGGER contact_deleted_webhook
  AFTER DELETE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION webhook_contact_deleted();

-- Reabilitar triggers de products
CREATE TRIGGER product_created_webhook
  AFTER INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION webhook_product_created();

CREATE TRIGGER product_updated_webhook
  AFTER UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION webhook_product_updated();

CREATE TRIGGER product_deleted_webhook
  AFTER DELETE ON products
  FOR EACH ROW
  EXECUTE FUNCTION webhook_product_deleted();

-- Reabilitar triggers de appointments
CREATE TRIGGER appointment_created_webhook
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION webhook_appointment_created();

CREATE TRIGGER appointment_updated_webhook
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION webhook_appointment_updated();

CREATE TRIGGER appointment_deleted_webhook
  AFTER DELETE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION webhook_appointment_deleted();

-- Reabilitar triggers de tasks
CREATE TRIGGER task_created_webhook
  AFTER INSERT ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION webhook_task_created();

CREATE TRIGGER task_updated_webhook
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION webhook_task_updated();

CREATE TRIGGER task_deleted_webhook
  AFTER DELETE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION webhook_task_deleted();

-- Mensagem de confirmação
DO $$ 
BEGIN 
  RAISE NOTICE 'Todos os triggers de webhook foram reabilitados';
END $$;
