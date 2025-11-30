import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Code, 
  Copy, 
  CheckCircle2, 
  BookOpen, 
  Key, 
  Webhook,
  Database,
  Settings,
  FileJson,
  Terminal,
  Shield
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useApiConfig } from "@/hooks/useApiConfig";

const ApiDocumentation = () => {
  const { toast } = useToast();
  const { apiBaseUrl, isLoading } = useApiConfig();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(label);
    toast({
      title: "Copiado!",
      description: "Código copiado para a área de transferência.",
    });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const baseUrl = `${apiBaseUrl}/functions/v1/api-v1`;

  const endpoints = [
    { name: "Contatos", path: "/contacts", icon: Database, color: "bg-blue-500" },
    { name: "Produtos", path: "/products", icon: Database, color: "bg-green-500" },
    { name: "Compromissos", path: "/appointments", icon: Database, color: "bg-purple-500" },
    { name: "Tarefas", path: "/tasks", icon: Database, color: "bg-orange-500" },
    { name: "Pipelines", path: "/pipelines", icon: Database, color: "bg-pink-500" },
    { name: "Etapas", path: "/stages", icon: Database, color: "bg-indigo-500" },
    { name: "Cards", path: "/cards", icon: Database, color: "bg-cyan-500" },
  ];

  const methods = [
    { method: "GET", description: "Listar ou obter um recurso", color: "bg-blue-500" },
    { method: "POST", description: "Criar novo recurso", color: "bg-green-500" },
    { method: "PUT/PATCH", description: "Atualizar recurso", color: "bg-yellow-500" },
    { method: "DELETE", description: "Deletar recurso", color: "bg-red-500" },
  ];

  const CodeBlock = ({ code, language = "bash", label }: { code: string; language?: string; label: string }) => (
    <div className="relative group">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => copyToClipboard(code, label)}
          className="h-8 w-8 p-0 bg-background/80 backdrop-blur"
        >
          {copiedCode === label ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
      <pre className="bg-muted/50 p-4 rounded-lg overflow-x-auto text-sm border">
        <code className="text-foreground">{code}</code>
      </pre>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documentação da API v1</h1>
        <p className="text-muted-foreground mt-2">
          API REST completa para integração com o CRM
        </p>
      </div>

      {/* Quick Start */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" />
            <CardTitle>Quick Start</CardTitle>
          </div>
          <CardDescription>
            Comece a usar a API em minutos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Key className="h-4 w-4" />
              1. Obtenha sua API Key
            </h4>
            <p className="text-sm text-muted-foreground mb-3">
              Acesse <strong>Configurações → API Keys</strong> e gere uma nova chave
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">2. Faça sua primeira requisição</h4>
            <CodeBlock
              label="quick-start"
              code={`curl -X GET '${baseUrl}/contacts?limit=10' \\
  -H 'X-API-Key: sua_api_key_aqui' \\
  -H 'Content-Type: application/json'`}
            />
          </div>

          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Shield className="h-5 w-5 text-green-500" />
            <p className="text-sm">
              <strong>Base URL:</strong> <code className="text-xs bg-background px-2 py-1 rounded">{baseUrl}</code>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Endpoints Grid */}
      <div>
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <Database className="h-6 w-6" />
          Recursos Disponíveis
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {endpoints.map((endpoint) => (
            <Card key={endpoint.path} className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`${endpoint.color} p-2 rounded-lg`}>
                    <endpoint.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{endpoint.name}</CardTitle>
                    <code className="text-xs text-muted-foreground">{endpoint.path}</code>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {methods.map((m) => (
                    <div key={m.method} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="w-20 justify-center font-mono text-xs">
                        {m.method}
                      </Badge>
                      <span className="text-muted-foreground text-xs">{m.description}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Authentication */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <CardTitle>Autenticação</CardTitle>
          </div>
          <CardDescription>
            Todas as requisições requerem autenticação via API Key
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Header Obrigatório</h4>
            <CodeBlock
              label="auth-header"
              code="X-API-Key: sua_api_key_aqui"
            />
          </div>
          
          <Separator />
          
          <div>
            <h4 className="font-semibold mb-2">Exemplo Completo</h4>
            <CodeBlock
              label="auth-example"
              code={`curl -X GET '${baseUrl}/contacts' \\
  -H 'X-API-Key: sua_api_key_aqui' \\
  -H 'Content-Type: application/json'`}
            />
          </div>
        </CardContent>
      </Card>

      {/* Examples Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Code className="h-5 w-5 text-primary" />
            <CardTitle>Exemplos de Código</CardTitle>
          </div>
          <CardDescription>
            Veja como integrar a API em diferentes linguagens
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="curl" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
            </TabsList>

            <TabsContent value="curl" className="space-y-4 mt-4">
              <div>
                <h4 className="font-semibold mb-2">Listar Contatos</h4>
                <CodeBlock
                  label="curl-list"
                  code={`curl -X GET '${baseUrl}/contacts?limit=10' \\
  -H 'X-API-Key: sua_api_key_aqui' \\
  -H 'Content-Type: application/json'`}
                />
              </div>

              <div>
                <h4 className="font-semibold mb-2">Criar Contato</h4>
                <CodeBlock
                  label="curl-create"
                  code={`curl -X POST '${baseUrl}/contacts' \\
  -H 'X-API-Key: sua_api_key_aqui' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "name": "João Silva",
    "email": "joao@example.com",
    "phone": "+5511999999999"
  }'`}
                />
              </div>
            </TabsContent>

            <TabsContent value="javascript" className="space-y-4 mt-4">
              <div>
                <h4 className="font-semibold mb-2">Configuração</h4>
                <CodeBlock
                  language="javascript"
                  label="js-config"
                  code={`const API_KEY = 'sua_api_key_aqui';
const BASE_URL = '${baseUrl}';

const headers = {
  'X-API-Key': API_KEY,
  'Content-Type': 'application/json'
};`}
                />
              </div>

              <div>
                <h4 className="font-semibold mb-2">Listar Contatos</h4>
                <CodeBlock
                  language="javascript"
                  label="js-list"
                  code={`const response = await fetch(\`\${BASE_URL}/contacts?limit=10\`, {
  headers
});
const data = await response.json();
console.log(data);`}
                />
              </div>

              <div>
                <h4 className="font-semibold mb-2">Criar Contato</h4>
                <CodeBlock
                  language="javascript"
                  label="js-create"
                  code={`const response = await fetch(\`\${BASE_URL}/contacts\`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    name: 'João Silva',
    email: 'joao@example.com',
    phone: '+5511999999999'
  })
});
const contact = await response.json();
console.log(contact);`}
                />
              </div>
            </TabsContent>

            <TabsContent value="python" className="space-y-4 mt-4">
              <div>
                <h4 className="font-semibold mb-2">Configuração</h4>
                <CodeBlock
                  language="python"
                  label="py-config"
                  code={`import requests

API_KEY = 'sua_api_key_aqui'
BASE_URL = '${baseUrl}'

headers = {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
}`}
                />
              </div>

              <div>
                <h4 className="font-semibold mb-2">Listar Contatos</h4>
                <CodeBlock
                  language="python"
                  label="py-list"
                  code={`response = requests.get(f'{BASE_URL}/contacts?limit=10', headers=headers)
data = response.json()
print(data)`}
                />
              </div>

              <div>
                <h4 className="font-semibold mb-2">Criar Contato</h4>
                <CodeBlock
                  language="python"
                  label="py-create"
                  code={`new_contact = {
    'name': 'João Silva',
    'email': 'joao@example.com',
    'phone': '+5511999999999'
}

response = requests.post(f'{BASE_URL}/contacts', json=new_contact, headers=headers)
contact = response.json()
print(contact)`}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Webhooks */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" />
            <CardTitle>Webhooks</CardTitle>
          </div>
          <CardDescription>
            Receba notificações em tempo real de eventos da API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            A API dispara webhooks automaticamente para todos os eventos de criação, atualização e exclusão.
          </p>

          <div>
            <h4 className="font-semibold mb-2">Eventos Disponíveis</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                'contact.created', 'contact.updated', 'contact.deleted',
                'product.created', 'product.updated', 'product.deleted',
                'appointment.created', 'appointment.updated', 'appointment.deleted',
                'task.created', 'task.updated', 'task.deleted',
                'pipeline.created', 'pipeline.updated', 'pipeline.deleted',
                'card.created', 'card.updated', 'card.deleted',
              ].map((event) => (
                <Badge key={event} variant="secondary" className="font-mono text-xs">
                  {event}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-semibold mb-2">Configurar Webhooks</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Acesse <strong>Configurações → Webhooks</strong> para configurar suas URLs de webhook
            </p>
            <Button variant="outline" asChild>
              <a href="/dashboard/settings">
                <Settings className="h-4 w-4 mr-2" />
                Ir para Configurações
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Response Format */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileJson className="h-5 w-5 text-primary" />
            <CardTitle>Formato de Resposta</CardTitle>
          </div>
          <CardDescription>
            Todas as respostas seguem um formato padrão
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock
            language="json"
            label="response-format"
            code={`{
  "data": {
    "id": "uuid",
    "name": "João Silva",
    "email": "joao@example.com",
    ...
  },
  "meta": {
    "timestamp": "2025-01-15T10:30:00.000Z",
    "pagination": {
      "total": 150,
      "limit": 50,
      "next_cursor": "2025-01-15T09:00:00.000Z"
    }
  }
}`}
          />
        </CardContent>
      </Card>

      {/* Status Codes */}
      <Card>
        <CardHeader>
          <CardTitle>Códigos de Status HTTP</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { code: '200', description: 'Requisição bem-sucedida', color: 'text-green-500' },
              { code: '201', description: 'Recurso criado com sucesso', color: 'text-green-500' },
              { code: '204', description: 'Recurso deletado com sucesso', color: 'text-green-500' },
              { code: '400', description: 'Erro na requisição (dados inválidos)', color: 'text-yellow-500' },
              { code: '401', description: 'API Key inválida ou ausente', color: 'text-red-500' },
              { code: '403', description: 'Sem permissão para acessar o recurso', color: 'text-red-500' },
              { code: '404', description: 'Recurso não encontrado', color: 'text-red-500' },
              { code: '500', description: 'Erro interno do servidor', color: 'text-red-500' },
            ].map((status) => (
              <div key={status.code} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                <Badge variant="outline" className={`w-16 justify-center font-mono ${status.color}`}>
                  {status.code}
                </Badge>
                <span className="text-sm text-muted-foreground">{status.description}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Documentation Link */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <CardTitle>Documentação Completa</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Para informações detalhadas sobre paginação, filtros, custom fields e mais exemplos, 
            consulte a documentação completa.
          </p>
          <Button variant="default">
            <BookOpen className="h-4 w-4 mr-2" />
            Ver Documentação Completa (PDF)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiDocumentation;
