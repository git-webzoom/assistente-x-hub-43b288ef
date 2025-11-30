-- ============================================
-- MIGRATION: Add scope to Custom Fields
-- Execute this in Supabase SQL Editor
-- ============================================

-- Criar enum para scope
CREATE TYPE public.custom_field_scope AS ENUM ('entity', 'product');

-- Adicionar colunas scope e scope_target_id
ALTER TABLE public.custom_fields 
ADD COLUMN scope custom_field_scope NOT NULL DEFAULT 'entity',
ADD COLUMN scope_target_id uuid DEFAULT NULL;

-- Adicionar foreign key para produtos (quando scope='product')
ALTER TABLE public.custom_fields
ADD CONSTRAINT fk_custom_fields_product
FOREIGN KEY (scope_target_id) 
REFERENCES public.products(id) 
ON DELETE CASCADE;

-- Remover constraint única antiga
ALTER TABLE public.custom_fields 
DROP CONSTRAINT IF EXISTS custom_fields_tenant_id_entity_type_field_name_key;

-- Criar nova constraint única que considera o scope
-- Para scope='entity': único por tenant + entity_type + field_name
-- Para scope='product': único por tenant + entity_type + field_name + scope_target_id
ALTER TABLE public.custom_fields
ADD CONSTRAINT custom_fields_unique_name
UNIQUE NULLS NOT DISTINCT (tenant_id, entity_type, field_name, scope_target_id);

-- Criar índice para performance em buscas por produto específico
CREATE INDEX idx_custom_fields_scope_target ON public.custom_fields(scope, scope_target_id) 
WHERE scope = 'product';

-- Comentários para documentação
COMMENT ON COLUMN public.custom_fields.scope IS 'Define o escopo do campo: entity (todos) ou product (específico)';
COMMENT ON COLUMN public.custom_fields.scope_target_id IS 'UUID do produto quando scope=product';
