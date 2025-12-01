# API v1 - Documentação Completa

## Visão Geral

A API v1 é uma API REST completa para integração com o CRM. Ela permite criar, ler, atualizar e deletar recursos como contatos, produtos, compromissos, tarefas, pipelines e cards.

**Base URL**: `https://onhnxxweldxjzhoaiwgq.supabase.co/functions/v1/api-v1`

## Autenticação

Todas as requisições requerem autenticação via API Key no header:

```
X-API-Key: sua_api_key_aqui
```

Para gerar uma API Key:
1. Acesse Configurações > API Keys no dashboard
2. Clique em "Nova API Key"
3. Defina um nome e prazo de validade (opcional)
4. Copie a chave gerada (ela não será exibida novamente)

## Headers Obrigatórios

```
X-API-Key: sua_api_key_aqui
Content-Type: application/json
```

## Formato de Resposta

Todas as respostas seguem o formato padrão:

```json
{
  "data": {},
  "meta": {
    "timestamp": "2025-01-15T10:30:00.000Z",
    "pagination": {
      "total": 100,
      "limit": 50,
      "next_cursor": "2025-01-15T09:00:00.000Z"
    }
  }
}
```

## Códigos de Status HTTP

- `200 OK` - Requisição bem-sucedida
- `201 Created` - Recurso criado com sucesso
- `204 No Content` - Recurso deletado com sucesso
- `400 Bad Request` - Erro na requisição (dados inválidos)
- `401 Unauthorized` - API Key inválida ou ausente
- `403 Forbidden` - Sem permissão para acessar o recurso
- `404 Not Found` - Recurso não encontrado
- `405 Method Not Allowed` - Método HTTP não permitido
- `500 Internal Server Error` - Erro interno do servidor

## Paginação

A API utiliza paginação baseada em cursor:

**Parâmetros de Query:**
- `limit` - Número de registros por página (padrão: 50, máximo: 100)
- `cursor` - Cursor para a próxima página (obtido de `next_cursor`)

**Exemplo:**
```
GET /v1/contacts?limit=20&cursor=2025-01-15T09:00:00.000Z
```

## Filtros

Você pode filtrar resultados usando parâmetros de query:

**Operadores disponíveis:**
- Campo direto: `?name=João` (igualdade exata)
- `_like`: `?name_like=João` (busca parcial, case-insensitive)
- `_gte`: `?value_gte=100` (maior ou igual)
- `_lte`: `?value_lte=1000` (menor ou igual)

**Filtros em Custom Fields:**
```
?custom_fields.campo_customizado=valor
```

**Exemplo:**
```
GET /v1/contacts?email_like=@gmail.com&custom_fields.vip=true
```

---

## Recursos da API

### 1. Contatos (Contacts)

#### Listar Contatos
```http
GET /v1/contacts
```

**Parâmetros de Query:**
- `limit` - Limite de registros (padrão: 50)
- `cursor` - Cursor de paginação
- Filtros: `name`, `email`, `phone`, `company`, etc.

**Resposta:**
```json
{
  "data": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "name": "João Silva",
      "email": "joao@example.com",
      "phone": "+5511999999999",
      "company": "Empresa XYZ",
      "position": "Gerente",
      "custom_fields": {},
      "created_at": "2025-01-15T10:00:00.000Z",
      "updated_at": "2025-01-15T10:00:00.000Z"
    }
  ],
  "meta": {
    "timestamp": "2025-01-15T10:30:00.000Z",
    "pagination": {
      "total": 150,
      "limit": 50,
      "next_cursor": "2025-01-15T09:00:00.000Z"
    }
  }
}
```

#### Obter Contato por ID
```http
GET /v1/contacts/:id
```

**Resposta:**
```json
{
  "data": {
    "id": "uuid",
    "tenant_id": "uuid",
    "name": "João Silva",
    "email": "joao@example.com",
    "phone": "+5511999999999",
    "company": "Empresa XYZ",
    "position": "Gerente",
    "custom_fields": {},
    "created_at": "2025-01-15T10:00:00.000Z",
    "updated_at": "2025-01-15T10:00:00.000Z"
  },
  "meta": {
    "timestamp": "2025-01-15T10:30:00.000Z"
  }
}
```

#### Criar Contato
```http
POST /v1/contacts
```

**Body:**
```json
{
  "name": "João Silva",
  "email": "joao@example.com",
  "phone": "+5511999999999",
  "company": "Empresa XYZ",
  "position": "Gerente",
  "custom_fields": {
    "origem": "website",
    "vip": true
  }
}
```

**Resposta:** `201 Created` com os dados do contato criado

**Webhook disparado:** `contact.created`

#### Atualizar Contato
```http
PUT /v1/contacts/:id
PATCH /v1/contacts/:id
```

**Body:**
```json
{
  "name": "João Silva Santos",
  "position": "Diretor"
}
```

**Resposta:** `200 OK` com os dados atualizados

**Webhook disparado:** `contact.updated`

#### Deletar Contato
```http
DELETE /v1/contacts/:id
```

**Resposta:** `204 No Content`

**Webhook disparado:** `contact.deleted`

---

### 2. Produtos (Products)

#### Listar Produtos
```http
GET /v1/products
```

**Parâmetros de Query:**
- `limit` (opcional): Número de registros por página (padrão: 50, máximo: 100)
- `cursor` (opcional): Cursor para paginação
- Filtros disponíveis:
  - `name`, `name_like` - Nome do produto
  - `sku`, `sku_like` - Código SKU
  - `category` - ID da categoria (UUID)
  - `category_name` - Nome da categoria (busca parcial)
  - `price_gte`, `price_lte` - Faixa de preço
  - `stock_quantity_gte`, `stock_quantity_lte` - Faixa de estoque
  - `custom_fields.campo` - Filtros em campos personalizados

**Resposta:**
```json
{
  "data": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "name": "Produto A",
      "description": "Descrição do produto",
      "sku": "PROD-001",
      "price": 99.90,
      "cost": 50.00,
      "stock": 100,
      "categories": [
        {
          "id": "uuid-categoria",
          "name": "Eletrônicos",
          "description": "Produtos eletrônicos",
          "color": "#3b82f6"
        }
      ],
      "custom_fields": {},
      "created_at": "2025-01-15T10:00:00.000Z",
      "updated_at": "2025-01-15T10:00:00.000Z"
    }
  ],
  "meta": {
    "pagination": {...}
  }
}
```

#### Obter Produto por ID
```http
GET /v1/products/:id
```

#### Criar Produto
```http
POST /v1/products
```

**Body:**
```json
{
  "name": "Produto A",
  "description": "Descrição do produto",
  "sku": "PROD-001",
  "price": 99.90,
  "cost": 50.00,
  "stock": 100,
  "category_ids": ["uuid-categoria-1", "uuid-categoria-2"],
  "custom_fields": {
    "garantia": "12 meses"
  }
}
```

**Nota:** O campo `category_ids` é opcional e pode conter múltiplos IDs de categoria.

**Webhook disparado:** `product.created`

#### Atualizar Produto
```http
PUT /v1/products/:id
PATCH /v1/products/:id
```

**Body (exemplo parcial com PATCH):**
```json
{
  "price": 89.90,
  "stock": 95,
  "category_ids": ["uuid-categoria-1"]
}
```

**Nota:** Se `category_ids` for fornecido, todas as categorias antigas serão substituídas pelas novas.

**Webhook disparado:** `product.updated`

#### Deletar Produto
```http
DELETE /v1/products/:id
```

**Webhook disparado:** `product.deleted`

---

### 3. Compromissos (Appointments)

#### Listar Compromissos
```http
GET /v1/appointments
```

**Parâmetros de Query:**
- `limit`, `cursor` - Paginação
- Filtros: `title`, `title_like`, `status`, `owner_id`, `contact_id`, `start_time_gte`, `start_time_lte`, etc.

**Resposta:**
```json
{
  "data": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "title": "Reunião com Cliente",
      "description": "Discussão sobre proposta",
      "start_time": "2025-01-20T14:00:00.000Z",
      "end_time": "2025-01-20T15:00:00.000Z",
      "location": "Sala 3",
      "status": "scheduled",
      "contact_id": "uuid",
      "owner_id": "uuid-do-proprietario",
      "custom_fields": {},
      "created_at": "2025-01-15T10:00:00.000Z",
      "updated_at": "2025-01-15T10:00:00.000Z"
    }
  ],
  "meta": {
    "pagination": {...}
  }
}
```

#### Obter Compromisso por ID
```http
GET /v1/appointments/:id
```

#### Criar Compromisso
```http
POST /v1/appointments
```

**Body:**
```json
{
  "title": "Reunião com Cliente",
  "description": "Discussão sobre proposta",
  "start_time": "2025-01-20T14:00:00.000Z",
  "end_time": "2025-01-20T15:00:00.000Z",
  "location": "Sala 3",
  "status": "scheduled",
  "contact_id": "uuid",
  "owner_id": "uuid-do-proprietario"
}
```

**Nota:** O campo `owner_id` é opcional. Se não fornecido, o criador será automaticamente atribuído como proprietário.

**Webhook disparado:** `appointment.created`

#### Atualizar Compromisso
```http
PUT /v1/appointments/:id
PATCH /v1/appointments/:id
```

**Webhook disparado:** `appointment.updated`

#### Deletar Compromisso
```http
DELETE /v1/appointments/:id
```

**Webhook disparado:** `appointment.deleted`

---

### 4. Tarefas (Tasks)

#### Listar Tarefas
```http
GET /v1/tasks
```

**Parâmetros de Query:**
- `limit`, `cursor` - Paginação
- Filtros: `title`, `title_like`, `status`, `priority`, `owner_id`, `contact_id`, `due_date_gte`, `due_date_lte`, etc.

**Resposta:**
```json
{
  "data": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "title": "Enviar proposta",
      "description": "Preparar e enviar proposta comercial",
      "status": "pending",
      "priority": "high",
      "due_date": "2025-01-18T17:00:00.000Z",
      "completed_at": null,
      "owner_id": "uuid-do-proprietario",
      "contact_id": "uuid",
      "custom_fields": {},
      "created_at": "2025-01-15T10:00:00.000Z",
      "updated_at": "2025-01-15T10:00:00.000Z"
    }
  ],
  "meta": {
    "pagination": {...}
  }
}
```

#### Obter Tarefa por ID
```http
GET /v1/tasks/:id
```

#### Criar Tarefa
```http
POST /v1/tasks
```

**Body:**
```json
{
  "title": "Enviar proposta",
  "description": "Preparar e enviar proposta comercial",
  "status": "pending",
  "priority": "high",
  "due_date": "2025-01-18T17:00:00.000Z",
  "owner_id": "uuid-do-proprietario",
  "contact_id": "uuid"
}
```

**Nota:** O campo `owner_id` é opcional. Se não fornecido, o criador será automaticamente atribuído como proprietário.

**Webhook disparado:** `task.created`

#### Atualizar Tarefa
```http
PUT /v1/tasks/:id
PATCH /v1/tasks/:id
```

**Webhook disparado:** `task.updated`

#### Deletar Tarefa
```http
DELETE /v1/tasks/:id
```

**Webhook disparado:** `task.deleted`

---

### 5. Pipelines (Funis)

#### Listar Pipelines
```http
GET /v1/pipelines
```

**Resposta:**
```json
{
  "data": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "name": "Vendas 2025",
      "created_at": "2025-01-15T10:00:00.000Z",
      "updated_at": "2025-01-15T10:00:00.000Z"
    }
  ],
  "meta": {
    "pagination": {...}
  }
}
```

#### Obter Pipeline por ID
```http
GET /v1/pipelines/:id
```

#### Criar Pipeline
```http
POST /v1/pipelines
```

**Body:**
```json
{
  "name": "Vendas 2025"
}
```

**Webhook disparado:** `pipeline.created`

#### Atualizar Pipeline
```http
PUT /v1/pipelines/:id
PATCH /v1/pipelines/:id
```

**Webhook disparado:** `pipeline.updated`

#### Deletar Pipeline
```http
DELETE /v1/pipelines/:id
```

**Webhook disparado:** `pipeline.deleted`

---

### 6. Etapas (Stages)

#### Listar Etapas
```http
GET /v1/stages?pipeline_id=uuid
```

**Resposta:**
```json
{
  "data": [
    {
      "id": "uuid",
      "pipeline_id": "uuid",
      "name": "Qualificação",
      "order_index": 0,
      "created_at": "2025-01-15T10:00:00.000Z",
      "updated_at": "2025-01-15T10:00:00.000Z"
    }
  ],
  "meta": {
    "pagination": {...}
  }
}
```

#### Obter Etapa por ID
```http
GET /v1/stages/:id
```

#### Criar Etapa
```http
POST /v1/stages
```

**Body:**
```json
{
  "pipeline_id": "uuid",
  "name": "Qualificação",
  "order_index": 0
}
```

**Webhook disparado:** `stage.created`

#### Atualizar Etapa
```http
PUT /v1/stages/:id
PATCH /v1/stages/:id
```

**Webhook disparado:** `stage.updated`

#### Deletar Etapa
```http
DELETE /v1/stages/:id
```

**Webhook disparado:** `stage.deleted`

---

### 7. Cards (Negócios)

#### Listar Cards
```http
GET /v1/cards?pipeline_id=uuid&stage_id=uuid
```

**Resposta:**
```json
{
  "data": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "pipeline_id": "uuid",
      "stage_id": "uuid",
      "title": "Proposta Empresa XYZ",
      "description": "Venda de 100 licenças",
      "value": 50000.00,
      "contact_id": "uuid",
      "owner_id": "uuid-do-proprietario",
      "position": 0,
      "custom_fields": {},
      "created_at": "2025-01-15T10:00:00.000Z",
      "updated_at": "2025-01-15T10:00:00.000Z"
    }
  ],
  "meta": {
    "pagination": {...}
  }
}
```

#### Obter Card por ID
```http
GET /v1/cards/:id
```

#### Criar Card
```http
POST /v1/cards
```

**Body:**
```json
{
  "pipeline_id": "uuid",
  "stage_id": "uuid",
  "title": "Proposta Empresa XYZ",
  "description": "Venda de 100 licenças",
  "value": 50000.00,
  "contact_id": "uuid",
  "owner_id": "uuid-do-proprietario",
  "position": 0
}
```

**Nota:** O campo `owner_id` é opcional. Se não fornecido, o criador será automaticamente atribuído como proprietário.

**Webhook disparado:** `card.created`

#### Atualizar Card
```http
PUT /v1/cards/:id
PATCH /v1/cards/:id
```

**Body (exemplo - mover para outra etapa):**
```json
{
  "stage_id": "novo_uuid",
  "position": 1
}
```

**Webhook disparado:** `card.updated`

#### Deletar Card
```http
DELETE /v1/cards/:id
```

**Webhook disparado:** `card.deleted`

---

## Webhooks

A API dispara webhooks automaticamente para eventos de criação, atualização e exclusão de recursos.

**Eventos disponíveis:**
- `contact.created`, `contact.updated`, `contact.deleted`
- `product.created`, `product.updated`, `product.deleted`
- `appointment.created`, `appointment.updated`, `appointment.deleted`
- `task.created`, `task.updated`, `task.deleted`
- `pipeline.created`, `pipeline.updated`, `pipeline.deleted`
- `stage.created`, `stage.updated`, `stage.deleted`
- `card.created`, `card.updated`, `card.deleted`
- `tag.created`, `tag.updated`, `tag.deleted`
- `category.created`, `category.updated`, `category.deleted`

**Headers do Webhook:**
```
Content-Type: application/json
X-Webhook-Signature: sha256_hash
X-Event-Type: contact.created
```

**Payload do Webhook:**
```json
{
  "event": "contact.created",
  "data": {
    "id": "uuid",
    "name": "João Silva",
    ...
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

Para configurar webhooks, acesse Configurações > Webhooks no dashboard.

---

## Custom Fields (Campos Personalizados)

Todos os recursos suportam campos personalizados através do objeto `custom_fields`:

**Criar recurso com custom fields:**
```json
{
  "name": "João Silva",
  "email": "joao@example.com",
  "custom_fields": {
    "origem": "website",
    "vip": true,
    "score": 85
  }
}
```

**Filtrar por custom fields:**
```
GET /v1/contacts?custom_fields.vip=true&custom_fields.score_gte=80
```

---

## Logs e Monitoramento

Todas as requisições são registradas automaticamente:
- Método HTTP
- Path
- Status code
- Tempo de resposta
- IP de origem
- User agent

Os logs podem ser acessados através do dashboard em Configurações > API Logs.

---

## Limites e Rate Limiting

- **Limite de registros por requisição**: 100
- **Limite padrão**: 50 registros por requisição
- **Rate limiting**: Implementado a nível de API Key (pode variar)

---

## Exemplos de Uso

### cURL

```bash
# Listar contatos
curl -X GET \
  'https://onhnxxweldxjzhoaiwgq.supabase.co/functions/v1/api-v1/contacts?limit=10' \
  -H 'X-API-Key: sua_api_key_aqui' \
  -H 'Content-Type: application/json'

# Criar contato
curl -X POST \
  'https://onhnxxweldxjzhoaiwgq.supabase.co/functions/v1/api-v1/contacts' \
  -H 'X-API-Key: sua_api_key_aqui' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "João Silva",
    "email": "joao@example.com",
    "phone": "+5511999999999"
  }'

# Atualizar contato
curl -X PATCH \
  'https://onhnxxweldxjzhoaiwgq.supabase.co/functions/v1/api-v1/contacts/uuid' \
  -H 'X-API-Key: sua_api_key_aqui' \
  -H 'Content-Type: application/json' \
  -d '{
    "position": "Diretor"
  }'

# Deletar contato
curl -X DELETE \
  'https://onhnxxweldxjzhoaiwgq.supabase.co/functions/v1/api-v1/contacts/uuid' \
  -H 'X-API-Key: sua_api_key_aqui'
```

### JavaScript / Node.js

```javascript
const API_KEY = 'sua_api_key_aqui';
const BASE_URL = 'https://onhnxxweldxjzhoaiwgq.supabase.co/functions/v1/api-v1';

// Listar contatos
const response = await fetch(`${BASE_URL}/contacts?limit=10`, {
  headers: {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
  }
});
const data = await response.json();
console.log(data);

// Criar contato
const newContact = await fetch(`${BASE_URL}/contacts`, {
  method: 'POST',
  headers: {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'João Silva',
    email: 'joao@example.com',
    phone: '+5511999999999'
  })
});
const contact = await newContact.json();
console.log(contact);
```

### Python

```python
import requests

API_KEY = 'sua_api_key_aqui'
BASE_URL = 'https://onhnxxweldxjzhoaiwgq.supabase.co/functions/v1/api-v1'

headers = {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
}

# Listar contatos
response = requests.get(f'{BASE_URL}/contacts?limit=10', headers=headers)
data = response.json()
print(data)

# Criar contato
new_contact = {
    'name': 'João Silva',
    'email': 'joao@example.com',
    'phone': '+5511999999999'
}
response = requests.post(f'{BASE_URL}/contacts', json=new_contact, headers=headers)
contact = response.json()
print(contact)
```

---

## Segurança

- ✅ Todas as requisições requerem API Key válida
- ✅ API Keys podem ter data de expiração
- ✅ API Keys podem ser desativadas a qualquer momento
- ✅ Isolamento multi-tenant (cada tenant só acessa seus dados)
- ✅ Webhooks assinados com SHA-256
- ✅ CORS habilitado para integração web
- ✅ Logs completos de todas as requisições

---

## Suporte

Para dúvidas ou problemas:
- Verifique os logs de API no dashboard
- Verifique o status da sua API Key
- Entre em contato com o suporte técnico

---

---

### 8. Tags

#### Listar Tags
```http
GET /v1/tags
```

#### Obter Tag por ID
```http
GET /v1/tags/:id
```

#### Criar Tag
```http
POST /v1/tags
```

**Body:**
```json
{
  "name": "Cliente VIP",
  "color": "#10b981"
}
```

**Webhook disparado:** `tag.created`

#### Atualizar Tag
```http
PUT /v1/tags/:id
PATCH /v1/tags/:id
```

**Webhook disparado:** `tag.updated`

#### Deletar Tag
```http
DELETE /v1/tags/:id
```

**Webhook disparado:** `tag.deleted`

---

### 9. Categorias (Categories)

#### Listar Categorias
```http
GET /v1/categories
```

**Parâmetros de Query:**
- `limit`, `cursor` - Paginação
- Filtros: `name`, `name_like`, `color`

**Resposta:**
```json
{
  "data": [
    {
      "id": "uuid-da-categoria",
      "tenant_id": "uuid-do-tenant",
      "name": "Eletrônicos",
      "description": "Produtos eletrônicos",
      "color": "#3b82f6",
      "created_at": "2025-01-15T10:00:00.000Z",
      "updated_at": "2025-01-15T10:00:00.000Z"
    }
  ],
  "meta": {
    "timestamp": "2025-01-15T10:00:00.000Z",
    "pagination": {
      "total": 25,
      "limit": 50,
      "next_cursor": null
    }
  }
}
```

#### Obter Categoria por ID
```http
GET /v1/categories/:id
```

#### Criar Categoria
```http
POST /v1/categories
```

**Body:**
```json
{
  "name": "Eletrônicos",
  "description": "Produtos eletrônicos",
  "color": "#3b82f6"
}
```

**Webhook disparado:** `category.created`

#### Atualizar Categoria
```http
PUT /v1/categories/:id
PATCH /v1/categories/:id
```

**Body (exemplo parcial com PATCH):**
```json
{
  "name": "Eletrônicos e Tecnologia",
  "color": "#0ea5e9"
}
```

**Webhook disparado:** `category.updated`

#### Deletar Categoria
```http
DELETE /v1/categories/:id
```

**Webhook disparado:** `category.deleted`

**Nota:** Ao deletar uma categoria, as relações com produtos serão automaticamente removidas, mas os produtos não serão excluídos.

---

## Changelog

### Versão 1.0.0 (Atual)
- API REST completa para todos os recursos
- Endpoints completos para Contatos, Produtos, Agendamentos, Tarefas, Pipelines, Estágios, Cards, Tags e Categorias
- Produtos agora suportam múltiplas categorias (many-to-many)
- Tasks, Appointments e Cards agora incluem campo `owner_id`
- Autenticação via API Key
- Paginação baseada em cursor
- Filtros avançados
- Suporte a custom fields
- Webhooks automáticos
- Logs de requisições
