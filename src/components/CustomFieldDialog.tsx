import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { CustomField, CustomFieldEntity, CustomFieldType } from '@/hooks/useCustomFields';
import { useProducts } from '@/hooks/useProducts';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { X } from 'lucide-react';
import { z } from 'zod';

const customFieldSchema = z.object({
  field_label: z.string().trim().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  field_name: z.string().trim().min(1, 'Identificador é obrigatório').max(50, 'Identificador muito longo')
    .regex(/^[a-z0-9_]+$/, 'Use apenas letras minúsculas, números e underline'),
  entity_type: z.enum(['contact', 'product', 'card', 'appointment', 'task']),
  field_type: z.enum(['text', 'number', 'date', 'boolean', 'select']),
  options: z.string().optional(),
});

const entityLabels: Record<CustomFieldEntity, string> = {
  contact: 'Contato',
  product: 'Produto',
  card: 'Card',
  appointment: 'Agenda',
  task: 'Tarefa',
};

const fieldTypeLabels: Record<CustomFieldType, string> = {
  text: 'Texto',
  number: 'Número',
  date: 'Data',
  boolean: 'Sim/Não',
  select: 'Seleção',
};

interface CustomFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customField?: CustomField | null;
  onSubmit: (data: any) => void;
}

export const CustomFieldDialog = ({
  open,
  onOpenChange,
  customField,
  onSubmit,
}: CustomFieldDialogProps) => {
  const { products } = useProducts();
  const [formData, setFormData] = useState({
    field_label: '',
    field_name: '',
    entity_type: 'contact' as CustomFieldEntity,
    field_type: 'text' as CustomFieldType,
    options: '',
    is_required: false,
    display_order: 0,
    scope: 'entity' as 'entity' | 'product',
    scope_target_id: null as string | null,
    has_stock_control: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (customField) {
      setFormData({
        field_label: customField.field_label,
        field_name: customField.field_name,
        entity_type: customField.entity_type,
        field_type: customField.field_type,
        options: customField.options?.join('\n') || '',
        is_required: customField.is_required,
        display_order: customField.display_order,
        scope: customField.scope || 'entity',
        scope_target_id: customField.scope_target_id || null,
        has_stock_control: customField.has_stock_control || false,
      });
    } else {
      setFormData({
        field_label: '',
        field_name: '',
        entity_type: 'contact',
        field_type: 'text',
        options: '',
        is_required: false,
        display_order: 0,
        scope: 'entity',
        scope_target_id: null,
        has_stock_control: false,
      });
    }
    setErrors({});
  }, [customField, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const validatedData = customFieldSchema.parse(formData);

      const submitData = {
        ...validatedData,
        is_required: formData.is_required,
        display_order: formData.display_order,
        scope: formData.scope,
        scope_target_id: formData.scope === 'product' ? formData.scope_target_id : null,
        has_stock_control: formData.field_type === 'select' ? formData.has_stock_control : false,
        options:
          validatedData.field_type === 'select' && validatedData.options
            ? validatedData.options.split('\n').map((opt) => opt.trim()).filter(Boolean)
            : [],
      };

      onSubmit(submitData);
      onOpenChange(false);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {customField ? 'Editar Campo Personalizado' : 'Novo Campo Personalizado'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-4">
          <form id="custom-field-form" onSubmit={handleSubmit} className="space-y-4 pb-4">
            <div className="space-y-2">
              <Label htmlFor="field_label">Nome do Campo *</Label>
              <Input
                id="field_label"
                value={formData.field_label}
                onChange={(e) => setFormData({ ...formData, field_label: e.target.value })}
                placeholder="Ex: Número do WhatsApp"
              />
              {errors.field_label && <p className="text-sm text-destructive">{errors.field_label}</p>}
            </div>

          <div className="space-y-2">
            <Label htmlFor="field_name">Identificador *</Label>
            <Input
              id="field_name"
              value={formData.field_name}
              onChange={(e) => setFormData({ ...formData, field_name: e.target.value })}
              placeholder="Ex: whatsapp_number"
              disabled={!!customField}
            />
            <p className="text-xs text-muted-foreground">
              Use apenas letras minúsculas, números e underline. Não pode ser alterado depois.
            </p>
            {errors.field_name && <p className="text-sm text-destructive">{errors.field_name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entity_type">Entidade *</Label>
              <Select
                value={formData.entity_type}
                onValueChange={(value: CustomFieldEntity) =>
                  setFormData({ ...formData, entity_type: value })
                }
                disabled={!!customField}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(entityLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.entity_type && <p className="text-sm text-destructive">{errors.entity_type}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="field_type">Tipo *</Label>
              <Select
                value={formData.field_type}
                onValueChange={(value: CustomFieldType) =>
                  setFormData({ ...formData, field_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(fieldTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.field_type && <p className="text-sm text-destructive">{errors.field_type}</p>}
            </div>
          </div>

          {formData.field_type === 'select' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="options">Opções (uma por linha) *</Label>
                <Textarea
                  id="options"
                  value={formData.options}
                  onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                  placeholder="Opção 1&#10;Opção 2&#10;Opção 3"
                  rows={4}
                />
                {errors.options && <p className="text-sm text-destructive">{errors.options}</p>}
              </div>

              {formData.entity_type === 'product' && (
                <div className="flex items-center space-x-2 p-3 border rounded-lg bg-muted/30">
                  <Checkbox
                    id="has_stock_control"
                    checked={formData.has_stock_control}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, has_stock_control: checked as boolean })
                    }
                  />
                  <div className="flex-1">
                    <Label htmlFor="has_stock_control" className="cursor-pointer font-medium">
                      Controlar estoque por variação
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Permite gerenciar quantidades diferentes para cada opção deste campo
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {formData.entity_type === 'product' && (
            <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
              <Label>Escopo do Campo</Label>
              <RadioGroup
                value={formData.scope}
                onValueChange={(value: 'entity' | 'product') => {
                  setFormData({ 
                    ...formData, 
                    scope: value,
                    scope_target_id: value === 'entity' ? null : formData.scope_target_id
                  });
                }}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="entity" id="scope-entity" />
                  <Label htmlFor="scope-entity" className="cursor-pointer font-normal">
                    Aplicar a todos os produtos
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="product" id="scope-product" />
                  <Label htmlFor="scope-product" className="cursor-pointer font-normal">
                    Apenas para produto específico
                  </Label>
                </div>
              </RadioGroup>

              {formData.scope === 'product' && (
                <div className="space-y-2 mt-3">
                  <Label htmlFor="scope_target_id">Selecionar Produto *</Label>
                  <Select
                    value={formData.scope_target_id || ''}
                    onValueChange={(value) =>
                      setFormData({ ...formData, scope_target_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_required"
              checked={formData.is_required}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_required: checked as boolean })
              }
            />
            <Label htmlFor="is_required" className="cursor-pointer">
              Campo obrigatório
            </Label>
          </div>
          </form>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="custom-field-form">Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
