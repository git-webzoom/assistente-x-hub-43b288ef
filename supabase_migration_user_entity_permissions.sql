-- ============================================
-- Migration: User Entity Permissions
-- Tabela para controle granular de permissões por entidade para cada usuário
-- ============================================

-- Criar tabela de permissões por entidade
CREATE TABLE IF NOT EXISTS public.user_entity_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    entity_key TEXT NOT NULL,
    can_view BOOLEAN NOT NULL DEFAULT true,
    can_create BOOLEAN NOT NULL DEFAULT true,
    can_edit BOOLEAN NOT NULL DEFAULT true,
    can_delete BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT user_entity_permissions_unique UNIQUE (user_id, entity_key)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_entity_permissions_user_id ON public.user_entity_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_entity_permissions_entity_key ON public.user_entity_permissions(entity_key);

-- Enable RLS
ALTER TABLE public.user_entity_permissions ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver suas próprias permissões
CREATE POLICY "Users can view their own permissions"
ON public.user_entity_permissions FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Policy: Admins/Supervisors podem gerenciar permissões de usuários do mesmo tenant
CREATE POLICY "Admins can manage permissions in tenant"
ON public.user_entity_permissions FOR ALL TO authenticated
USING (
    -- Superadmin pode tudo
    public.has_role(auth.uid(), 'superadmin') OR
    -- Admin pode gerenciar permissões de usuários do mesmo tenant
    public.has_role(auth.uid(), 'admin') OR
    -- Supervisor pode gerenciar apenas permissões de 'user' do mesmo tenant
    (public.has_role(auth.uid(), 'supervisor') AND 
     user_id IN (
       SELECT u.id FROM public.users u
       INNER JOIN public.user_roles ur ON ur.user_id = u.id
       WHERE u.tenant_id = public.get_user_tenant(auth.uid())
       AND ur.role = 'user'
     ))
)
WITH CHECK (
    public.has_role(auth.uid(), 'superadmin') OR
    public.has_role(auth.uid(), 'admin') OR
    (public.has_role(auth.uid(), 'supervisor') AND 
     user_id IN (
       SELECT u.id FROM public.users u
       INNER JOIN public.user_roles ur ON ur.user_id = u.id
       WHERE u.tenant_id = public.get_user_tenant(auth.uid())
       AND ur.role = 'user'
     ))
);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_user_entity_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_entity_permissions_updated_at ON public.user_entity_permissions;
CREATE TRIGGER trigger_update_user_entity_permissions_updated_at
    BEFORE UPDATE ON public.user_entity_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_entity_permissions_updated_at();

-- ============================================
-- INSTRUÇÕES:
-- 1. Execute este SQL no Supabase SQL Editor
-- 2. Verifique se a função has_role já existe (deve existir de migrations anteriores)
-- 3. Verifique se a função get_user_tenant já existe
-- ============================================
