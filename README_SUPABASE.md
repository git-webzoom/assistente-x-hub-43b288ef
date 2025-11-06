# Configuração do Supabase - AssistenteX

## 1. Criar projeto no Supabase

Acesse [https://supabase.com](https://supabase.com) e crie um novo projeto.

## 2. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-key
```

Você encontra essas informações em: **Project Settings** > **API**

## 3. Executar migrations

Execute a migration SQL no Supabase:

1. Acesse o **SQL Editor** no painel do Supabase
2. Copie todo o conteúdo do arquivo `supabase/migrations/20240101000000_initial_schema.sql`
3. Cole no editor e clique em **Run**

Isso criará:
- ✅ Tabelas: tenants, users, user_roles, contacts, pipelines, stages, cards, products, tasks, appointments, webhooks
- ✅ Enums para roles e status
- ✅ Funções de segurança (has_role, get_user_tenant)
- ✅ Trigger para sincronizar auth.users com public.users
- ✅ Políticas RLS para isolamento multi-tenant

## 4. Configurar autenticação

No Supabase, vá em **Authentication** > **Providers** e configure:

- ✅ Email: Ativado
- ✅ Confirm email: Desative para facilitar testes (pode reativar depois)

Em **Authentication** > **URL Configuration**:
- **Site URL**: `http://localhost:5173` (ou sua URL de produção)
- **Redirect URLs**: Adicione `http://localhost:5173/**`

## 5. Criar primeiro tenant (SuperAdmin)

Execute este SQL para criar um tenant de teste e seu primeiro usuário SuperAdmin:

```sql
-- Criar tenant
INSERT INTO public.tenants (name, plan) 
VALUES ('Minha Empresa', 'enterprise')
RETURNING id;

-- Após criar seu usuário via signup no app, atualize-o:
-- (substitua USER_ID pelo ID do usuário e TENANT_ID pelo ID do tenant criado acima)
UPDATE public.users 
SET tenant_id = 'TENANT_ID_AQUI'
WHERE id = 'USER_ID_AQUI';

-- Atribuir role de superadmin
INSERT INTO public.user_roles (user_id, role)
VALUES ('USER_ID_AQUI', 'superadmin');
```

## 6. Testar a aplicação

1. Inicie o projeto: `npm run dev`
2. Acesse `http://localhost:5173`
3. Crie uma conta em `/signup`
4. Faça login em `/login`
5. Acesse o dashboard em `/dashboard`

## Estrutura Multi-Tenant

Cada tenant (cliente) tem seus dados completamente isolados através de RLS policies.

### Hierarquia de Roles:

1. **SuperAdmin**: Acesso total, pode criar tenants
2. **Admin**: Gerencia tudo dentro do seu tenant
3. **Supervisor**: Visualiza e gerencia equipe e funis
4. **User**: Acesso operacional (cards, tarefas, contatos)

## Próximos passos

- ✅ Integrar páginas com dados reais do Supabase
- ✅ Implementar CRUD de contatos
- ✅ Implementar CRUD de produtos
- ✅ Implementar drag-and-drop no Kanban
- ✅ Adicionar sistema de tarefas e agendamentos
- ✅ Configurar webhooks
