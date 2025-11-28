import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useApiConfig } from "@/hooks/useApiConfig";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export function WebhookDebug() {
  const { apiBaseUrl } = useApiConfig();
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const checkEdgeFunctionVersion = async () => {
    setChecking(true);
    setResult(null);
    setError(null);

    try {
      // Try GET request to health check endpoint
      const response = await fetch(
        `${apiBaseUrl}/functions/v1/dispatch-webhook`,
        {
          method: 'GET',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setResult(data);
      } else {
        setError(`HTTP ${response.status}: ${await response.text()}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setChecking(false);
    }
  };

  const testWebhookDispatch = async () => {
    setChecking(true);
    setResult(null);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke("dispatch-webhook", {
        body: {
          event: "test.event",
          entity: "test",
          data: { test: "from_debug_panel" },
          tenant_id: "00000000-0000-0000-0000-000000000001",
          user_id: null,
          timestamp: new Date().toISOString(),
        },
      });

      if (error) {
        setError(error.message || JSON.stringify(error));
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setChecking(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhook Debugger</CardTitle>
        <CardDescription>
          Teste a versão e funcionamento da edge function dispatch-webhook
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={checkEdgeFunctionVersion}
            disabled={checking}
            variant="outline"
          >
            {checking ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Verificar Versão
          </Button>
          
          <Button
            onClick={testWebhookDispatch}
            disabled={checking}
          >
            {checking ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Testar Dispatch
          </Button>
        </div>

        {result && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <pre className="text-xs mt-2 overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <pre className="text-xs mt-2 overflow-auto">
                {error}
              </pre>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
