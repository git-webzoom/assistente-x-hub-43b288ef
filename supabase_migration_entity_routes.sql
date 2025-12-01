-- Migration: Entity Routes System
-- Cria sistema de rotas dinâmicas para entidades

-- Tabela de rotas de entidades
CREATE TABLE IF NOT EXISTS public.entity_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  key TEXT NOT NULL,              -- 'contacts', 'products', etc.
  slug TEXT NOT NULL,             -- slug da URL: 'contacts', 'products', etc.
  label TEXT NOT NULL,            -- nome exibido no menu
  icon TEXT NOT NULL,             -- nome do ícone (lucide)
  entity_type TEXT NOT NULL,      -- tipo de entidade para renderização
  is_active BOOLEAN DEFAULT true,
  order_index INT DEFAULT 0,
  config JSONB DEFAULT '{}',      -- configurações extras (colunas, filtros, etc.)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, key),
  UNIQUE(tenant_id, slug)
);

-- RLS Policies
ALTER TABLE public.entity_routes ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver rotas do seu tenant (ou rotas globais)
CREATE POLICY "Users can view entity routes for their tenant"
  ON public.entity_routes
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IS NULL OR 
    tenant_id IN (
      SELECT tenant_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Policy: Apenas superadmins podem inserir/atualizar/deletar
CREATE POLICY "Only superadmins can modify entity routes"
  ON public.entity_routes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_entity_routes_tenant_id ON public.entity_routes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_entity_routes_key ON public.entity_routes(key);
CREATE INDEX IF NOT EXISTS idx_entity_routes_slug ON public.entity_routes(slug);
CREATE INDEX IF NOT EXISTS idx_entity_routes_is_active ON public.entity_routes(is_active);

-- Inserir rotas padrão globais (tenant_id = NULL)
INSERT INTO public.entity_routes (tenant_id, key, slug, label, icon, entity_type, order_index, is_active) VALUES
(NULL, 'pipelines', 'pipelines', 'Funis', 'Kanban', 'pipelines', 1, true),
(NULL, 'contacts', 'contacts', 'Contatos', 'Users', 'contacts', 2, true),
(NULL, 'products', 'products', 'Produtos', 'Package', 'products', 3, true),
(NULL, 'calendar', 'calendar', 'Agenda', 'Calendar', 'calendar', 4, true),
(NULL, 'tasks', 'tasks', 'Tarefas', 'CheckSquare', 'tasks', 5, true)
ON CONFLICT DO NOTHING;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_entity_routes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entity_routes_updated_at
  BEFORE UPDATE ON public.entity_routes
  FOR EACH ROW
  EXECUTE FUNCTION update_entity_routes_updated_at();
