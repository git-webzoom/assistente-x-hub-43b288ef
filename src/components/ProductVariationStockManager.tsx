import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCustomFields } from '@/hooks/useCustomFields';
import { useProductVariationStock } from '@/hooks/useProductVariationStock';
import { Package, Save } from 'lucide-react';

interface ProductVariationStockManagerProps {
  productId: string;
}

export default function ProductVariationStockManager({ productId }: ProductVariationStockManagerProps) {
  const { customFields, isLoading: fieldsLoading } = useCustomFields('product', productId);
  const { variationStocks, totalStock, upsertVariationStock, isLoading: stockLoading } = useProductVariationStock(productId);
  
  const [stockValues, setStockValues] = useState<Record<string, Record<string, number>>>({});

  // Filtrar apenas campos SELECT com controle de estoque
  const stockControlFields = customFields?.filter(
    field => field.field_type === 'select' && field.has_stock_control
  ) || [];

  // Inicializar valores do estoque
  useEffect(() => {
    if (!variationStocks.length) return;

    const initialValues: Record<string, Record<string, number>> = {};
    
    variationStocks.forEach(stock => {
      if (!initialValues[stock.custom_field_id]) {
        initialValues[stock.custom_field_id] = {};
      }
      initialValues[stock.custom_field_id][stock.option_value] = stock.quantity;
    });

    setStockValues(initialValues);
  }, [variationStocks]);

  const handleQuantityChange = (fieldId: string, optionValue: string, quantity: string) => {
    const numQuantity = parseInt(quantity) || 0;
    
    setStockValues(prev => ({
      ...prev,
      [fieldId]: {
        ...(prev[fieldId] || {}),
        [optionValue]: numQuantity,
      },
    }));
  };

  const handleSave = (fieldId: string, optionValue: string) => {
    const quantity = stockValues[fieldId]?.[optionValue] || 0;
    
    upsertVariationStock({
      productId,
      customFieldId: fieldId,
      optionValue,
      quantity,
    });
  };

  const handleSaveAll = () => {
    Object.entries(stockValues).forEach(([fieldId, options]) => {
      Object.entries(options).forEach(([optionValue, quantity]) => {
        upsertVariationStock({
          productId,
          customFieldId: fieldId,
          optionValue,
          quantity,
        });
      });
    });
  };

  if (fieldsLoading || stockLoading) {
    return <div className="text-sm text-muted-foreground">Carregando...</div>;
  }

  if (stockControlFields.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Estoque por Variação
          </CardTitle>
          <CardDescription>
            Nenhum campo personalizado está configurado para controlar estoque.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Para gerenciar estoque por variação, crie um campo personalizado do tipo "Select" e marque a opção "Controlar estoque por variação".
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Estoque por Variação</h3>
          <p className="text-sm text-muted-foreground">
            Configure a quantidade disponível para cada variação do produto
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-base">
            <Package className="h-4 w-4 mr-1" />
            Total: {totalStock}
          </Badge>
          <Button onClick={handleSaveAll} size="sm">
            <Save className="h-4 w-4 mr-2" />
            Salvar Todos
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {stockControlFields.map(field => (
          <Card key={field.id}>
            <CardHeader>
              <CardTitle className="text-base">{field.field_label}</CardTitle>
              <CardDescription>
                Defina a quantidade disponível para cada {field.field_label.toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {field.options.map(option => {
                  const currentValue = stockValues[field.id]?.[option] || 0;
                  
                  return (
                    <div key={option} className="space-y-2">
                      <Label htmlFor={`${field.id}-${option}`}>
                        {option}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id={`${field.id}-${option}`}
                          type="number"
                          min="0"
                          value={currentValue}
                          onChange={(e) => handleQuantityChange(field.id, option, e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSave(field.id, option)}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
