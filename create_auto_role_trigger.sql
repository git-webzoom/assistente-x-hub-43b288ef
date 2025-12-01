-- Criar trigger para auto-criar role quando um novo usuário é criado
-- Isso garante que todo usuário sempre terá uma role

-- 1. Criar função que será executada pelo trigger
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

-- 2. Remover trigger antigo se existir
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;

-- 3. Criar novo trigger que executa APÓS inserção na tabela auth.users
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();

-- 4. Também criar trigger para a tabela users (caso seja usado para criar usuários)
DROP TRIGGER IF EXISTS on_public_user_created_role ON public.users;

CREATE TRIGGER on_public_user_created_role
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();
