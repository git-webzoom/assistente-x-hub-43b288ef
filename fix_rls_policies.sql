-- ============================================
-- FIX RLS POLICIES - Complete Solution
-- ============================================

-- 1. Create security definer function to get user's tenant_id
CREATE OR REPLACE FUNCTION public.get_user_tenant()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id 
  FROM public.users 
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- ============================================
-- 2. DROP ALL EXISTING POLICIES
-- ============================================

-- Contacts
DROP POLICY IF EXISTS "Users can view contacts in tenant" ON public.contacts;
DROP POLICY IF EXISTS "Users can insert contacts in tenant" ON public.contacts;
DROP POLICY IF EXISTS "Users can update contacts in tenant" ON public.contacts;
DROP POLICY IF EXISTS "Users can delete contacts in tenant" ON public.contacts;
DROP POLICY IF EXISTS "Users can manage contacts in tenant" ON public.contacts;

-- Products
DROP POLICY IF EXISTS "Users can view products in tenant" ON public.products;
DROP POLICY IF EXISTS "Users can insert products in tenant" ON public.products;
DROP POLICY IF EXISTS "Users can update products in tenant" ON public.products;
DROP POLICY IF EXISTS "Users can delete products in tenant" ON public.products;
DROP POLICY IF EXISTS "Users can manage products in tenant" ON public.products;

-- Tasks
DROP POLICY IF EXISTS "Users can view tasks in tenant" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert tasks in tenant" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks in tenant" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks in tenant" ON public.tasks;
DROP POLICY IF EXISTS "Users can manage tasks in tenant" ON public.tasks;

-- Appointments
DROP POLICY IF EXISTS "Users can view appointments in tenant" ON public.appointments;
DROP POLICY IF EXISTS "Users can insert appointments in tenant" ON public.appointments;
DROP POLICY IF EXISTS "Users can update appointments in tenant" ON public.appointments;
DROP POLICY IF EXISTS "Users can delete appointments in tenant" ON public.appointments;
DROP POLICY IF EXISTS "Users can manage appointments in tenant" ON public.appointments;

-- Pipelines
DROP POLICY IF EXISTS "Users can view pipelines in tenant" ON public.pipelines;
DROP POLICY IF EXISTS "Users can insert pipelines in tenant" ON public.pipelines;
DROP POLICY IF EXISTS "Users can update pipelines in tenant" ON public.pipelines;
DROP POLICY IF EXISTS "Users can delete pipelines in tenant" ON public.pipelines;
DROP POLICY IF EXISTS "Users can manage pipelines in tenant" ON public.pipelines;

-- Stages
DROP POLICY IF EXISTS "Users can view stages in tenant" ON public.stages;
DROP POLICY IF EXISTS "Users can insert stages in tenant" ON public.stages;
DROP POLICY IF EXISTS "Users can update stages in tenant" ON public.stages;
DROP POLICY IF EXISTS "Users can delete stages in tenant" ON public.stages;
DROP POLICY IF EXISTS "Users can manage stages in tenant" ON public.stages;

-- Cards
DROP POLICY IF EXISTS "Users can view cards in tenant" ON public.cards;
DROP POLICY IF EXISTS "Users can insert cards in tenant" ON public.cards;
DROP POLICY IF EXISTS "Users can update cards in tenant" ON public.cards;
DROP POLICY IF EXISTS "Users can delete cards in tenant" ON public.cards;
DROP POLICY IF EXISTS "Users can manage cards in tenant" ON public.cards;

-- Webhooks
DROP POLICY IF EXISTS "Users can view webhooks in tenant" ON public.webhooks;
DROP POLICY IF EXISTS "Users can insert webhooks in tenant" ON public.webhooks;
DROP POLICY IF EXISTS "Users can update webhooks in tenant" ON public.webhooks;
DROP POLICY IF EXISTS "Users can delete webhooks in tenant" ON public.webhooks;
DROP POLICY IF EXISTS "Users can manage webhooks in tenant" ON public.webhooks;

-- API Keys
DROP POLICY IF EXISTS "Users can view api_keys in tenant" ON public.api_keys;
DROP POLICY IF EXISTS "Users can insert api_keys in tenant" ON public.api_keys;
DROP POLICY IF EXISTS "Users can update api_keys in tenant" ON public.api_keys;
DROP POLICY IF EXISTS "Users can delete api_keys in tenant" ON public.api_keys;
DROP POLICY IF EXISTS "Users can manage api_keys in tenant" ON public.api_keys;

-- Custom Fields
DROP POLICY IF EXISTS "Users can view custom_fields in tenant" ON public.custom_fields;
DROP POLICY IF EXISTS "Users can insert custom_fields in tenant" ON public.custom_fields;
DROP POLICY IF EXISTS "Users can update custom_fields in tenant" ON public.custom_fields;
DROP POLICY IF EXISTS "Users can delete custom_fields in tenant" ON public.custom_fields;
DROP POLICY IF EXISTS "Users can manage custom_fields in tenant" ON public.custom_fields;

-- Custom Field Values
DROP POLICY IF EXISTS "Users can view custom_field_values in tenant" ON public.custom_field_values;
DROP POLICY IF EXISTS "Users can insert custom_field_values in tenant" ON public.custom_field_values;
DROP POLICY IF EXISTS "Users can update custom_field_values in tenant" ON public.custom_field_values;
DROP POLICY IF EXISTS "Users can delete custom_field_values in tenant" ON public.custom_field_values;
DROP POLICY IF EXISTS "Users can manage custom_field_values in tenant" ON public.custom_field_values;

-- ============================================
-- 3. CREATE NEW POLICIES USING SECURITY DEFINER FUNCTION
-- ============================================

-- CONTACTS
CREATE POLICY "Users can manage contacts in tenant"
ON public.contacts
FOR ALL
TO authenticated
USING (tenant_id = public.get_user_tenant())
WITH CHECK (tenant_id = public.get_user_tenant());

-- PRODUCTS
CREATE POLICY "Users can manage products in tenant"
ON public.products
FOR ALL
TO authenticated
USING (tenant_id = public.get_user_tenant())
WITH CHECK (tenant_id = public.get_user_tenant());

-- TASKS
CREATE POLICY "Users can manage tasks in tenant"
ON public.tasks
FOR ALL
TO authenticated
USING (tenant_id = public.get_user_tenant())
WITH CHECK (tenant_id = public.get_user_tenant());

-- APPOINTMENTS
CREATE POLICY "Users can manage appointments in tenant"
ON public.appointments
FOR ALL
TO authenticated
USING (tenant_id = public.get_user_tenant())
WITH CHECK (tenant_id = public.get_user_tenant());

-- PIPELINES
CREATE POLICY "Users can manage pipelines in tenant"
ON public.pipelines
FOR ALL
TO authenticated
USING (tenant_id = public.get_user_tenant())
WITH CHECK (tenant_id = public.get_user_tenant());

-- STAGES
CREATE POLICY "Users can manage stages in tenant"
ON public.stages
FOR ALL
TO authenticated
USING (tenant_id = public.get_user_tenant())
WITH CHECK (tenant_id = public.get_user_tenant());

-- CARDS
CREATE POLICY "Users can manage cards in tenant"
ON public.cards
FOR ALL
TO authenticated
USING (tenant_id = public.get_user_tenant())
WITH CHECK (tenant_id = public.get_user_tenant());

-- WEBHOOKS
CREATE POLICY "Users can manage webhooks in tenant"
ON public.webhooks
FOR ALL
TO authenticated
USING (tenant_id = public.get_user_tenant())
WITH CHECK (tenant_id = public.get_user_tenant());

-- API_KEYS
CREATE POLICY "Users can manage api_keys in tenant"
ON public.api_keys
FOR ALL
TO authenticated
USING (tenant_id = public.get_user_tenant())
WITH CHECK (tenant_id = public.get_user_tenant());

-- CUSTOM_FIELDS
CREATE POLICY "Users can manage custom_fields in tenant"
ON public.custom_fields
FOR ALL
TO authenticated
USING (tenant_id = public.get_user_tenant())
WITH CHECK (tenant_id = public.get_user_tenant());

-- CUSTOM_FIELD_VALUES
CREATE POLICY "Users can manage custom_field_values in tenant"
ON public.custom_field_values
FOR ALL
TO authenticated
USING (tenant_id = public.get_user_tenant())
WITH CHECK (tenant_id = public.get_user_tenant());

-- ============================================
-- 4. VERIFY RLS IS ENABLED
-- ============================================

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;
