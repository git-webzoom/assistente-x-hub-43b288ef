-- Migration: Auto-update product stock from variation stocks
-- Este script cria uma função e triggers para atualizar automaticamente
-- o campo stock da tabela products com a soma das variações de estoque

-- Função para calcular e atualizar o estoque do produto
CREATE OR REPLACE FUNCTION public.update_product_stock_from_variations()
RETURNS TRIGGER AS $$
DECLARE
  v_product_id uuid;
  v_total_stock integer;
BEGIN
  -- Determinar o product_id baseado na operação
  IF TG_OP = 'DELETE' THEN
    v_product_id := OLD.product_id;
  ELSE
    v_product_id := NEW.product_id;
  END IF;

  -- Calcular a soma total das variações deste produto
  SELECT COALESCE(SUM(quantity), 0)
  INTO v_total_stock
  FROM public.product_custom_field_stock
  WHERE product_id = v_product_id;

  -- Atualizar o campo stock do produto
  UPDATE public.products
  SET stock = v_total_stock,
      updated_at = NOW()
  WHERE id = v_product_id;

  -- Retornar o registro apropriado baseado na operação
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para INSERT
DROP TRIGGER IF EXISTS trigger_update_product_stock_on_insert ON public.product_custom_field_stock;
CREATE TRIGGER trigger_update_product_stock_on_insert
  AFTER INSERT ON public.product_custom_field_stock
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_stock_from_variations();

-- Criar trigger para UPDATE
DROP TRIGGER IF EXISTS trigger_update_product_stock_on_update ON public.product_custom_field_stock;
CREATE TRIGGER trigger_update_product_stock_on_update
  AFTER UPDATE ON public.product_custom_field_stock
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_stock_from_variations();

-- Criar trigger para DELETE
DROP TRIGGER IF EXISTS trigger_update_product_stock_on_delete ON public.product_custom_field_stock;
CREATE TRIGGER trigger_update_product_stock_on_delete
  AFTER DELETE ON public.product_custom_field_stock
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_stock_from_variations();

-- Atualizar estoques existentes (migração de dados)
-- Para produtos que já têm variações de estoque, calcular e atualizar
UPDATE public.products p
SET stock = (
  SELECT COALESCE(SUM(quantity), 0)
  FROM public.product_custom_field_stock pcfs
  WHERE pcfs.product_id = p.id
)
WHERE EXISTS (
  SELECT 1
  FROM public.product_custom_field_stock pcfs
  WHERE pcfs.product_id = p.id
);

-- Comentário explicativo
COMMENT ON FUNCTION public.update_product_stock_from_variations() IS 
'Atualiza automaticamente o campo stock da tabela products com a soma das quantidades da tabela product_custom_field_stock';
