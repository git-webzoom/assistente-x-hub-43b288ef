-- FIX: Infinite recursion in user_roles RLS policies
-- Este SQL corrige o problema de recursão infinita nas políticas RLS

-- 1. Remover todas as políticas antigas da tabela user_roles
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Users can read their own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;

-- 2. Desabilitar RLS temporariamente (vamos reabilitar depois)
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- 3. Reabilitar RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas simples e seguras SEM recursão
-- Permitir que qualquer usuário autenticado leia sua própria role
CREATE POLICY "Users can view own role"
ON user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Permitir que service_role (backend) faça tudo
CREATE POLICY "Service role can manage all roles"
ON user_roles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 5. Garantir que a função has_role existe e está correta
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

-- 6. Garantir que todos os usuários tenham uma role
INSERT INTO user_roles (user_id, role)
SELECT u.id, 'user'::app_role
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 7. Verificar se existe algum superadmin, se não, promover o primeiro usuário
DO $$
DECLARE
  first_user_id uuid;
BEGIN
  -- Verificar se já existe um superadmin
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE role = 'superadmin') THEN
    -- Pegar o primeiro usuário da tabela auth.users
    SELECT id INTO first_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
    
    -- Atualizar para superadmin
    IF first_user_id IS NOT NULL THEN
      UPDATE user_roles 
      SET role = 'superadmin'::app_role 
      WHERE user_id = first_user_id;
      
      RAISE NOTICE 'Usuário % promovido a superadmin', first_user_id;
    END IF;
  END IF;
END $$;
