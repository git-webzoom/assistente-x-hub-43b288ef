import { CustomFieldInput } from './CustomFieldInput';
import { useCustomFields, CustomFieldEntity } from '@/hooks/useCustomFields';
import { useCustomFieldValues } from '@/hooks/useCustomFieldValues';
import { useEffect, useState } from 'react';

interface CustomFieldsSectionProps {
  entityType: CustomFieldEntity;
  entityId?: string;
  onValuesChange?: (values: Record<string, any>) => void;
}

export const CustomFieldsSection = ({
  entityType,
  entityId,
  onValuesChange,
}: CustomFieldsSectionProps) => {
  const { customFields } = useCustomFields(entityType);
  const { fieldValues, upsertFieldValue } = useCustomFieldValues(entityId);
  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (fieldValues && customFields) {
      const valuesMap: Record<string, any> = {};
      fieldValues.forEach((fv) => {
        valuesMap[fv.custom_field_id] = fv.value;
      });
      setValues(valuesMap);
    }
  }, [fieldValues, customFields]);

  const handleValueChange = (fieldId: string, value: any) => {
    const newValues = { ...values, [fieldId]: value };
    setValues(newValues);

    if (onValuesChange) {
      onValuesChange(newValues);
    }

    // If we have an entityId, save immediately
    if (entityId) {
      upsertFieldValue({
        customFieldId: fieldId,
        entityId,
        value,
      });
    }
  };

  const validateFields = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    customFields?.forEach((field) => {
      if (field.is_required && !values[field.id]) {
        newErrors[field.id] = `${field.field_label} é obrigatório`;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  if (!customFields || customFields.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Campos Personalizados</h3>
      <div className="space-y-4">
        {customFields.map((field) => (
          <CustomFieldInput
            key={field.id}
            field={field}
            value={values[field.id]}
            onChange={(value) => handleValueChange(field.id, value)}
            error={errors[field.id]}
          />
        ))}
      </div>
    </div>
  );
};
