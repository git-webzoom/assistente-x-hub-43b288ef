import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Code2, AlertCircle } from 'lucide-react';

interface JsonEditorProps {
  value: any;
  onChange: (value: any) => void;
  title?: string;
  description?: string;
}

export function JsonEditor({ value, onChange, title = 'Configurações JSON', description }: JsonEditorProps) {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setJsonText(JSON.stringify(value || {}, null, 2));
    } catch (err) {
      setJsonText('{}');
    }
  }, [value]);

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const formatted = JSON.stringify(parsed, null, 2);
      setJsonText(formatted);
      setError(null);
    } catch (err) {
      setError('JSON inválido. Não foi possível formatar.');
    }
  };

  const handleApply = () => {
    try {
      const parsed = JSON.parse(jsonText);
      onChange(parsed);
      setError(null);
    } catch (err) {
      setError('JSON inválido. Corrija os erros antes de salvar.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code2 className="h-5 w-5" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Conteúdo JSON</Label>
          <Textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            className="font-mono text-sm min-h-[200px]"
            placeholder="{}"
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleFormat}>
            Formatar
          </Button>
          <Button onClick={handleApply}>
            Aplicar Alterações
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
