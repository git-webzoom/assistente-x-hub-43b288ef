-- ============================================
-- MIGRATION: Custom Fields System
-- Execute this in Supabase SQL Editor
-- ============================================

-- Create enum for entity types
CREATE TYPE public.custom_field_entity AS ENUM (
  'contact',
  'product',
  'card',
  'appointment',
  'task'
);

-- Create enum for field types
CREATE TYPE public.custom_field_type AS ENUM (
  'text',
  'number',
  'date',
  'boolean',
  'select'
);

-- Custom fields definition table
CREATE TABLE public.custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  entity_type custom_field_entity NOT NULL,
  field_name text NOT NULL,
  field_label text NOT NULL,
  field_type custom_field_type NOT NULL,
  options jsonb DEFAULT '[]'::jsonb, -- For select type fields
  is_required boolean NOT NULL DEFAULT false,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, entity_type, field_name)
);

ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;

-- Custom field values table
CREATE TABLE public.custom_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_field_id uuid REFERENCES public.custom_fields(id) ON DELETE CASCADE NOT NULL,
  entity_id uuid NOT NULL, -- The ID of the contact/product/card/etc
  value jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (custom_field_id, entity_id)
);

ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;

-- Create trigger for custom_field_values updated_at
DROP TRIGGER IF EXISTS update_custom_field_values_updated_at ON public.custom_field_values;
CREATE TRIGGER update_custom_field_values_updated_at 
BEFORE UPDATE ON public.custom_field_values 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for custom_fields
CREATE POLICY "Users can manage custom fields in tenant"
  ON public.custom_fields
  FOR ALL
  TO authenticated
  USING (tenant_id = public.get_user_tenant(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant(auth.uid()));

-- RLS Policies for custom_field_values
CREATE POLICY "Users can manage custom field values in tenant"
  ON public.custom_field_values
  FOR ALL
  TO authenticated
  USING (
    custom_field_id IN (
      SELECT id FROM public.custom_fields 
      WHERE tenant_id = public.get_user_tenant(auth.uid())
    )
  )
  WITH CHECK (
    custom_field_id IN (
      SELECT id FROM public.custom_fields 
      WHERE tenant_id = public.get_user_tenant(auth.uid())
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_custom_fields_tenant_entity ON public.custom_fields(tenant_id, entity_type);
CREATE INDEX idx_custom_field_values_entity ON public.custom_field_values(entity_id);
CREATE INDEX idx_custom_field_values_field ON public.custom_field_values(custom_field_id);
