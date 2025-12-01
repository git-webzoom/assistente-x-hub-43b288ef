-- ============================================
-- MIGRATION: User Management Enhancements
-- Execute this in Supabase SQL Editor
-- ============================================

-- 1. Atualizar enum de roles para incluir supervisor
DO $$ 
BEGIN
    -- Verificar se o tipo já existe
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('user', 'supervisor', 'admin', 'superadmin');
    ELSE
        -- Adicionar novos valores se não existirem
        BEGIN
            ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'supervisor';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
        BEGIN
            ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'superadmin';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
    END IF;
END $$;

-- 2. Adicionar coluna banned_until na tabela users se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'banned_until'
    ) THEN
        ALTER TABLE public.users ADD COLUMN banned_until TIMESTAMPTZ;
        CREATE INDEX IF NOT EXISTS idx_users_banned_until ON public.users(banned_until);
    END IF;
END $$;

-- 3. Garantir que a tabela user_roles existe
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT user_roles_user_id_key UNIQUE (user_id)
);

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- 5. Enable RLS na tabela user_roles se ainda não estiver
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 6. Criar/atualizar policies para user_roles
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all roles in tenant" ON public.user_roles;
CREATE POLICY "Admins can view all roles in tenant"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'superadmin')
    )
);

-- 7. Criar função auxiliar para verificar se usuário tem uma role específica
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 8. Garantir que todos os usuários existentes tenham uma role
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user'::public.app_role
FROM public.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

COMMENT ON COLUMN public.users.banned_until IS 'Data até quando o usuário está banido. NULL = não banido';
COMMENT ON TABLE public.user_roles IS 'Armazena as roles dos usuários no sistema';
COMMENT ON FUNCTION public.has_role IS 'Verifica se um usuário tem uma role específica';
