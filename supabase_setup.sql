-- ============================================
-- ASSISTENTEX - SCHEMA INICIAL DO SUPABASE
-- ============================================
-- Execute este SQL no SQL Editor do Supabase
-- ============================================

-- Create enum for user roles
create type public.app_role as enum ('superadmin', 'admin', 'supervisor', 'user');

-- Create enum for task status
create type public.task_status as enum ('pending', 'done', 'cancelled');

-- Tenants table
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

alter table public.tenants enable row level security;

-- Users table (synced with auth.users)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete cascade,
  name text,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

-- User roles table (separate for security)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Security definer function to check roles
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- Security definer function to get user's tenant
create or replace function public.get_user_tenant(_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id
  from public.users
  where id = _user_id
$$;

-- Trigger function to create user on signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.users (id, email, name, tenant_id, created_at)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'name', ''),
    (new.raw_user_meta_data->>'tenant_id')::uuid,
    now()
  );
  
  -- Assign default role
  insert into public.user_roles (user_id, role)
  values (new.id, 'user');
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger on auth.users
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Contacts table
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  name text not null,
  phone text,
  email text,
  tags jsonb default '[]'::jsonb,
  notes text,
  source text,
  created_at timestamptz not null default now()
);

alter table public.contacts enable row level security;

-- Pipelines table
create table public.pipelines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.pipelines enable row level security;

-- Stages table
create table public.stages (
  id uuid primary key default gen_random_uuid(),
  pipeline_id uuid references public.pipelines(id) on delete cascade not null,
  name text not null,
  order_index int not null,
  created_at timestamptz not null default now()
);

alter table public.stages enable row level security;

-- Products table
create table public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  name text not null,
  price numeric(10,2),
  sku text,
  description text,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

-- Cards table
create table public.cards (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  pipeline_id uuid references public.pipelines(id) on delete cascade not null,
  stage_id uuid references public.stages(id) on delete cascade not null,
  contact_id uuid references public.contacts(id) on delete set null,
  title text not null,
  description text,
  value numeric(10,2),
  product_ids uuid[] default array[]::uuid[],
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cards enable row level security;

-- Tasks table
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references public.cards(id) on delete cascade not null,
  assigned_to uuid references public.users(id) on delete set null,
  title text not null,
  due_date timestamptz,
  status task_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

-- Appointments table
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references public.cards(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete cascade,
  title text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  location text,
  status text default 'scheduled',
  created_at timestamptz not null default now()
);

alter table public.appointments enable row level security;

-- Webhooks table
create table public.webhooks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  event text not null,
  url text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.webhooks enable row level security;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Tenants: Only superadmin can manage
create policy "SuperAdmin can manage all tenants"
  on public.tenants
  for all
  to authenticated
  using (public.has_role(auth.uid(), 'superadmin'))
  with check (public.has_role(auth.uid(), 'superadmin'));

-- Users: Can view users in same tenant
create policy "Users can view users in same tenant"
  on public.users
  for select
  to authenticated
  using (tenant_id = public.get_user_tenant(auth.uid()) or public.has_role(auth.uid(), 'superadmin'));

-- Users: Admin and SuperAdmin can manage users
create policy "Admin can manage users in tenant"
  on public.users
  for all
  to authenticated
  using (
    public.has_role(auth.uid(), 'superadmin') or 
    (public.has_role(auth.uid(), 'admin') and tenant_id = public.get_user_tenant(auth.uid()))
  )
  with check (
    public.has_role(auth.uid(), 'superadmin') or 
    (public.has_role(auth.uid(), 'admin') and tenant_id = public.get_user_tenant(auth.uid()))
  );

-- User roles: Only admin can assign roles
create policy "Admin can manage roles in tenant"
  on public.user_roles
  for all
  to authenticated
  using (
    public.has_role(auth.uid(), 'superadmin') or 
    (public.has_role(auth.uid(), 'admin') and user_id in (
      select id from public.users where tenant_id = public.get_user_tenant(auth.uid())
    ))
  )
  with check (
    public.has_role(auth.uid(), 'superadmin') or 
    (public.has_role(auth.uid(), 'admin') and user_id in (
      select id from public.users where tenant_id = public.get_user_tenant(auth.uid())
    ))
  );

-- Contacts: Users can view/manage contacts in their tenant
create policy "Users can manage contacts in tenant"
  on public.contacts
  for all
  to authenticated
  using (tenant_id = public.get_user_tenant(auth.uid()))
  with check (tenant_id = public.get_user_tenant(auth.uid()));

-- Pipelines: Users can view/manage pipelines in their tenant
create policy "Users can manage pipelines in tenant"
  on public.pipelines
  for all
  to authenticated
  using (tenant_id = public.get_user_tenant(auth.uid()))
  with check (tenant_id = public.get_user_tenant(auth.uid()));

-- Stages: Users can manage stages in pipelines of their tenant
create policy "Users can manage stages in tenant pipelines"
  on public.stages
  for all
  to authenticated
  using (
    pipeline_id in (
      select id from public.pipelines where tenant_id = public.get_user_tenant(auth.uid())
    )
  )
  with check (
    pipeline_id in (
      select id from public.pipelines where tenant_id = public.get_user_tenant(auth.uid())
    )
  );

-- Products: Users can manage products in their tenant
create policy "Users can manage products in tenant"
  on public.products
  for all
  to authenticated
  using (tenant_id = public.get_user_tenant(auth.uid()))
  with check (tenant_id = public.get_user_tenant(auth.uid()));

-- Cards: Users can manage cards in their tenant
create policy "Users can manage cards in tenant"
  on public.cards
  for all
  to authenticated
  using (tenant_id = public.get_user_tenant(auth.uid()))
  with check (tenant_id = public.get_user_tenant(auth.uid()));

-- Tasks: Users can manage tasks in their tenant's cards
create policy "Users can manage tasks in tenant"
  on public.tasks
  for all
  to authenticated
  using (
    card_id in (
      select id from public.cards where tenant_id = public.get_user_tenant(auth.uid())
    )
  )
  with check (
    card_id in (
      select id from public.cards where tenant_id = public.get_user_tenant(auth.uid())
    )
  );

-- Appointments: Users can manage appointments in their tenant
create policy "Users can manage appointments in tenant"
  on public.appointments
  for all
  to authenticated
  using (
    card_id in (
      select id from public.cards where tenant_id = public.get_user_tenant(auth.uid())
    ) or
    contact_id in (
      select id from public.contacts where tenant_id = public.get_user_tenant(auth.uid())
    )
  )
  with check (
    card_id in (
      select id from public.cards where tenant_id = public.get_user_tenant(auth.uid())
    ) or
    contact_id in (
      select id from public.contacts where tenant_id = public.get_user_tenant(auth.uid())
    )
  );

-- Webhooks: Admin can manage webhooks
create policy "Admin can manage webhooks in tenant"
  on public.webhooks
  for all
  to authenticated
  using (
    public.has_role(auth.uid(), 'superadmin') or 
    (public.has_role(auth.uid(), 'admin') and tenant_id = public.get_user_tenant(auth.uid()))
  )
  with check (
    public.has_role(auth.uid(), 'superadmin') or 
    (public.has_role(auth.uid(), 'admin') and tenant_id = public.get_user_tenant(auth.uid()))
  );
