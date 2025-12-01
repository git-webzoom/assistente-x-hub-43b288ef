-- ============================================================================
-- CORREÇÃO COMPLETA DO SISTEMA DE ROLES E MENU SUPER ADMIN
-- Execute este SQL completo no Supabase SQL Editor
-- ============================================================================

-- PASSO 1: Limpar políticas RLS antigas que causam recursão infinita
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Users can read their own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;

-- PASSO 2: Reconfigurar RLS de forma segura
-- --------------------------------------------------------------------------
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Política simples: usuários podem ver sua própria role
CREATE POLICY "Users can view own role"
ON user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Service role pode fazer tudo (para edge functions)
CREATE POLICY "Service role can manage all roles"
ON user_roles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- PASSO 3: Criar/atualizar função helper para verificar roles
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = _role
  )
$$;

-- PASSO 4: Garantir que enum app_role tenha todos os valores necessários
-- --------------------------------------------------------------------------
DO $$ 
BEGIN
  -- Adicionar supervisor se não existir
  BEGIN
    ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'supervisor';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
  
  -- Adicionar superadmin se não existir
  BEGIN
    ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'superadmin';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;

-- PASSO 5: Garantir que todos os usuários tenham uma role
-- --------------------------------------------------------------------------
INSERT INTO user_roles (user_id, role)
SELECT u.id, 'user'::app_role
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- PASSO 6: Promover o primeiro usuário a superadmin (se não houver nenhum)
-- --------------------------------------------------------------------------
DO $$
DECLARE
  first_user_id uuid;
  current_superadmin_count integer;
BEGIN
  -- Contar quantos superadmins existem
  SELECT COUNT(*) INTO current_superadmin_count 
  FROM user_roles 
  WHERE role = 'superadmin';
  
  -- Se não houver superadmin, promover o primeiro usuário
  IF current_superadmin_count = 0 THEN
    -- Pegar o primeiro usuário da tabela auth.users
    SELECT id INTO first_user_id 
    FROM auth.users 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    -- Atualizar para superadmin
    IF first_user_id IS NOT NULL THEN
      UPDATE user_roles 
      SET role = 'superadmin'::app_role 
      WHERE user_id = first_user_id;
      
      RAISE NOTICE 'Usuário % promovido a superadmin', first_user_id;
    END IF;
  ELSE
    RAISE NOTICE 'Já existe(m) % superadmin(s) no sistema', current_superadmin_count;
  END IF;
END $$;

-- PASSO 7: Criar trigger para auto-criar role para novos usuários
-- --------------------------------------------------------------------------
-- Função que será executada pelo trigger
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Inserir role padrão para o novo usuário
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::app_role)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Remover triggers antigos se existirem
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
DROP TRIGGER IF EXISTS on_public_user_created_role ON public.users;

-- Criar trigger para tabela auth.users
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();

-- Criar trigger para tabela public.users
CREATE TRIGGER on_public_user_created_role
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();

-- PASSO 8: Adicionar coluna banned_until se não existir
-- --------------------------------------------------------------------------
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'banned_until'
  ) THEN
    ALTER TABLE public.users ADD COLUMN banned_until timestamptz;
    RAISE NOTICE 'Coluna banned_until adicionada à tabela users';
  ELSE
    RAISE NOTICE 'Coluna banned_until já existe na tabela users';
  END IF;
END $$;

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================

-- Verificar resultado
SELECT 
  u.email,
  ur.role,
  CASE 
    WHEN u.banned_until IS NOT NULL AND u.banned_until > NOW() THEN 'Banido'
    ELSE 'Ativo'
  END as status
FROM auth.users au
JOIN public.users u ON au.id = u.id
LEFT JOIN user_roles ur ON au.id = ur.user_id
ORDER BY ur.role DESC, u.email;
