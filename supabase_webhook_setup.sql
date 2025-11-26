-- Criar tabela de logs de webhooks
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB,
  status_code INTEGER,
  success BOOLEAN DEFAULT false,
  response_body TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event ON webhook_logs(event);

-- Habilitar RLS
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Política de RLS para webhook_logs (usuários podem ver seus próprios logs)
CREATE POLICY "Users can view their webhook logs"
  ON webhook_logs FOR SELECT
  USING (
    webhook_id IN (
      SELECT id FROM webhooks WHERE tenant_id IN (
        SELECT tenant_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Função auxiliar para disparar webhook via edge function
CREATE OR REPLACE FUNCTION trigger_webhook_dispatch(
  p_event TEXT,
  p_entity TEXT,
  p_data JSONB,
  p_tenant_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payload JSONB;
  v_supabase_url TEXT;
BEGIN
  -- Construir payload
  v_payload := jsonb_build_object(
    'event', p_event,
    'entity', p_entity,
    'data', p_data,
    'tenant_id', p_tenant_id,
    'user_id', p_user_id,
    'timestamp', NOW()
  );

  -- Obter URL do Supabase (você precisará configurar isso)
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  
  IF v_supabase_url IS NULL THEN
    v_supabase_url := 'https://onhnxxweldxjzhoaiwgq.supabase.co';
  END IF;

  -- Disparar webhook de forma assíncrona usando pg_net
  PERFORM
    net.http_post(
      url := v_supabase_url || '/functions/v1/dispatch-webhook',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := v_payload
    );
    
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro mas não falha a transação principal
    RAISE WARNING 'Failed to dispatch webhook: %', SQLERRM;
END;
$$;

-- ===========================================
-- TRIGGERS PARA CARDS
-- ===========================================

-- Trigger para card.created
CREATE OR REPLACE FUNCTION notify_card_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM trigger_webhook_dispatch(
    'card.created',
    'card',
    to_jsonb(NEW),
    NEW.tenant_id,
    NEW.created_by
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_card_created ON cards;
CREATE TRIGGER trigger_card_created
  AFTER INSERT ON cards
  FOR EACH ROW
  EXECUTE FUNCTION notify_card_created();

-- Trigger para card.updated
CREATE OR REPLACE FUNCTION notify_card_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM trigger_webhook_dispatch(
    'card.updated',
    'card',
    jsonb_build_object(
      'before', to_jsonb(OLD),
      'after', to_jsonb(NEW)
    ),
    NEW.tenant_id,
    NEW.created_by
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_card_updated ON cards;
CREATE TRIGGER trigger_card_updated
  AFTER UPDATE ON cards
  FOR EACH ROW
  EXECUTE FUNCTION notify_card_updated();

-- Trigger para card.deleted
CREATE OR REPLACE FUNCTION notify_card_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM trigger_webhook_dispatch(
    'card.deleted',
    'card',
    to_jsonb(OLD),
    OLD.tenant_id,
    OLD.created_by
  );
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trigger_card_deleted ON cards;
CREATE TRIGGER trigger_card_deleted
  AFTER DELETE ON cards
  FOR EACH ROW
  EXECUTE FUNCTION notify_card_deleted();

-- Trigger para card.moved (quando stage_id muda)
CREATE OR REPLACE FUNCTION notify_card_moved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    PERFORM trigger_webhook_dispatch(
      'card.moved',
      'card',
      jsonb_build_object(
        'card', to_jsonb(NEW),
        'from_stage_id', OLD.stage_id,
        'to_stage_id', NEW.stage_id
      ),
      NEW.tenant_id,
      NEW.created_by
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_card_moved ON cards;
CREATE TRIGGER trigger_card_moved
  AFTER UPDATE ON cards
  FOR EACH ROW
  EXECUTE FUNCTION notify_card_moved();

-- ===========================================
-- TRIGGERS PARA CONTACTS
-- ===========================================

CREATE OR REPLACE FUNCTION notify_contact_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM trigger_webhook_dispatch(
    'contact.created',
    'contact',
    to_jsonb(NEW),
    NEW.tenant_id,
    NEW.created_by
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_contact_created ON contacts;
CREATE TRIGGER trigger_contact_created
  AFTER INSERT ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION notify_contact_created();

CREATE OR REPLACE FUNCTION notify_contact_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM trigger_webhook_dispatch(
    'contact.updated',
    'contact',
    jsonb_build_object(
      'before', to_jsonb(OLD),
      'after', to_jsonb(NEW)
    ),
    NEW.tenant_id,
    NEW.created_by
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_contact_updated ON contacts;
CREATE TRIGGER trigger_contact_updated
  AFTER UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION notify_contact_updated();

CREATE OR REPLACE FUNCTION notify_contact_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM trigger_webhook_dispatch(
    'contact.deleted',
    'contact',
    to_jsonb(OLD),
    OLD.tenant_id,
    OLD.created_by
  );
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trigger_contact_deleted ON contacts;
CREATE TRIGGER trigger_contact_deleted
  AFTER DELETE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION notify_contact_deleted();

-- ===========================================
-- TRIGGERS PARA PRODUCTS
-- ===========================================

CREATE OR REPLACE FUNCTION notify_product_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM trigger_webhook_dispatch(
    'product.created',
    'product',
    to_jsonb(NEW),
    NEW.tenant_id,
    NEW.created_by
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_product_created ON products;
CREATE TRIGGER trigger_product_created
  AFTER INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION notify_product_created();

CREATE OR REPLACE FUNCTION notify_product_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM trigger_webhook_dispatch(
    'product.updated',
    'product',
    jsonb_build_object(
      'before', to_jsonb(OLD),
      'after', to_jsonb(NEW)
    ),
    NEW.tenant_id,
    NEW.created_by
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_product_updated ON products;
CREATE TRIGGER trigger_product_updated
  AFTER UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION notify_product_updated();

CREATE OR REPLACE FUNCTION notify_product_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM trigger_webhook_dispatch(
    'product.deleted',
    'product',
    to_jsonb(OLD),
    OLD.tenant_id,
    OLD.created_by
  );
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trigger_product_deleted ON products;
CREATE TRIGGER trigger_product_deleted
  AFTER DELETE ON products
  FOR EACH ROW
  EXECUTE FUNCTION notify_product_deleted();

-- ===========================================
-- TRIGGERS PARA APPOINTMENTS
-- ===========================================

CREATE OR REPLACE FUNCTION notify_appointment_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM trigger_webhook_dispatch(
    'appointment.created',
    'appointment',
    to_jsonb(NEW),
    NEW.tenant_id,
    NEW.created_by
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_appointment_created ON appointments;
CREATE TRIGGER trigger_appointment_created
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_appointment_created();

CREATE OR REPLACE FUNCTION notify_appointment_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM trigger_webhook_dispatch(
    'appointment.updated',
    'appointment',
    jsonb_build_object(
      'before', to_jsonb(OLD),
      'after', to_jsonb(NEW)
    ),
    NEW.tenant_id,
    NEW.created_by
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_appointment_updated ON appointments;
CREATE TRIGGER trigger_appointment_updated
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_appointment_updated();

CREATE OR REPLACE FUNCTION notify_appointment_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM trigger_webhook_dispatch(
    'appointment.deleted',
    'appointment',
    to_jsonb(OLD),
    OLD.tenant_id,
    OLD.created_by
  );
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trigger_appointment_deleted ON appointments;
CREATE TRIGGER trigger_appointment_deleted
  AFTER DELETE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_appointment_deleted();

-- ===========================================
-- TRIGGERS PARA TASKS
-- ===========================================

CREATE OR REPLACE FUNCTION notify_task_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM trigger_webhook_dispatch(
    'task.created',
    'task',
    to_jsonb(NEW),
    NEW.tenant_id,
    NEW.created_by
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_task_created ON tasks;
CREATE TRIGGER trigger_task_created
  AFTER INSERT ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_created();

CREATE OR REPLACE FUNCTION notify_task_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Disparar task.completed se status mudou para completed
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed' THEN
    PERFORM trigger_webhook_dispatch(
      'task.completed',
      'task',
      to_jsonb(NEW),
      NEW.tenant_id,
      NEW.created_by
    );
  END IF;

  -- Sempre disparar task.updated
  PERFORM trigger_webhook_dispatch(
    'task.updated',
    'task',
    jsonb_build_object(
      'before', to_jsonb(OLD),
      'after', to_jsonb(NEW)
    ),
    NEW.tenant_id,
    NEW.created_by
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_task_updated ON tasks;
CREATE TRIGGER trigger_task_updated
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_updated();

CREATE OR REPLACE FUNCTION notify_task_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM trigger_webhook_dispatch(
    'task.deleted',
    'task',
    to_jsonb(OLD),
    OLD.tenant_id,
    OLD.created_by
  );
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trigger_task_deleted ON tasks;
CREATE TRIGGER trigger_task_deleted
  AFTER DELETE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_deleted();
