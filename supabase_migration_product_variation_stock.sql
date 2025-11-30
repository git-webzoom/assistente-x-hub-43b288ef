-- ============================================
-- MIGRATION: Product Variation Stock Management
-- Execute this in Supabase SQL Editor
-- ============================================

-- 1. Criar tabela para estoque por variação
CREATE TABLE IF NOT EXISTS public.product_custom_field_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  custom_field_id uuid NOT NULL REFERENCES public.custom_fields(id) ON DELETE CASCADE,
  option_value text NOT NULL,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraint única: um produto não pode ter duas quantidades para o mesmo campo + opção
  CONSTRAINT unique_product_field_option UNIQUE (product_id, custom_field_id, option_value)
);

-- 2. Adicionar índices para performance
CREATE INDEX idx_product_variation_stock_product ON public.product_custom_field_stock(product_id);
CREATE INDEX idx_product_variation_stock_field ON public.product_custom_field_stock(custom_field_id);
CREATE INDEX idx_product_variation_stock_tenant ON public.product_custom_field_stock(tenant_id);

-- 3. Adicionar coluna has_stock_control em custom_fields
ALTER TABLE public.custom_fields 
ADD COLUMN IF NOT EXISTS has_stock_control boolean NOT NULL DEFAULT false;

-- 4. Comentários para documentação
COMMENT ON TABLE public.product_custom_field_stock IS 'Controle de estoque por variação de produto (ex: 5 Azul, 2 Preto)';
COMMENT ON COLUMN public.product_custom_field_stock.option_value IS 'Valor da opção do campo select (ex: "Azul", "Preto")';
COMMENT ON COLUMN public.product_custom_field_stock.quantity IS 'Quantidade disponível desta variação';
COMMENT ON COLUMN public.custom_fields.has_stock_control IS 'Se true, este campo controla estoque por variação';

-- 5. Habilitar RLS
ALTER TABLE public.product_custom_field_stock ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS
CREATE POLICY "Users can view variation stock in their tenant"
  ON public.product_custom_field_stock
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert variation stock in their tenant"
  ON public.product_custom_field_stock
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update variation stock in their tenant"
  ON public.product_custom_field_stock
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete variation stock in their tenant"
  ON public.product_custom_field_stock
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- 7. Função para calcular estoque total de um produto (soma de todas variações)
CREATE OR REPLACE FUNCTION public.get_product_total_stock(p_product_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(quantity), 0)::integer
  FROM public.product_custom_field_stock
  WHERE product_id = p_product_id;
$$;

-- 8. Função para obter estoque de uma variação específica
CREATE OR REPLACE FUNCTION public.get_product_variation_stock(
  p_product_id uuid,
  p_custom_field_id uuid,
  p_option_value text
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(quantity, 0)
  FROM public.product_custom_field_stock
  WHERE product_id = p_product_id
    AND custom_field_id = p_custom_field_id
    AND option_value = p_option_value;
$$;

-- 9. Comentários nas funções
COMMENT ON FUNCTION public.get_product_total_stock IS 'Retorna o estoque total somando todas as variações do produto';
COMMENT ON FUNCTION public.get_product_variation_stock IS 'Retorna o estoque de uma variação específica do produto';
