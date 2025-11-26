# Configuração de Webhooks

Este documento descreve como configurar e usar o sistema de webhooks do AssistentEx.

## 📋 Pré-requisitos

1. Acesso ao Supabase SQL Editor
2. Permissões de administrador no projeto

## 🚀 Instalação

### Passo 1: Executar o Script SQL

Execute o arquivo `supabase_webhook_setup.sql` no Supabase SQL Editor:

1. Acesse o Supabase Dashboard
2. Vá para **SQL Editor**
3. Copie todo o conteúdo do arquivo `supabase_webhook_setup.sql`
4. Cole no editor e clique em **Run**

Este script irá:
- Criar a tabela `webhook_logs` para armazenar logs de execução
- Criar a função auxiliar `trigger_webhook_dispatch`
- Criar triggers automáticos para todos os eventos:
  - Cards (created, updated, deleted, moved)
  - Contatos (created, updated, deleted)
  - Produtos (created, updated, deleted)
  - Agendamentos (created, updated, deleted)
  - Tarefas (created, updated, deleted, completed)

### Passo 2: Deploy da Edge Function

A edge function `dispatch-webhook` será deployada automaticamente quando você fizer push das suas alterações.

## 📡 Como Funciona

### 1. Configuração via Interface

Acesse **Configurações > Webhooks** no sistema e:

1. Clique em **Novo Webhook**
2. Informe a URL do seu endpoint
3. Selecione os eventos que deseja receber
4. Ative o webhook

### 2. Formato do Payload

Quando um evento ocorre, o webhook recebe um POST com o seguinte formato:

```json
{
  "event": "card.created",
  "entity": "card",
  "data": {
    "id": "uuid",
    "title": "Título do card",
    "value": 1000.00,
    // ... outros campos da entidade
  },
  "tenant_id": "uuid-do-tenant",
  "user_id": "uuid-do-usuario",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 3. Headers da Requisição

Seu endpoint receberá os seguintes headers:

- `Content-Type: application/json`
- `User-Agent: AssistentEx-Webhook/1.0`
- `X-Webhook-Event: card.created` (tipo do evento)
- `X-Webhook-Timestamp: 2024-01-01T12:00:00.000Z`

### 4. Eventos Disponíveis

#### Cards
- `card.created` - Card criado
- `card.updated` - Card atualizado
- `card.deleted` - Card excluído
- `card.moved` - Card movido entre etapas

#### Contatos
- `contact.created` - Contato criado
- `contact.updated` - Contato atualizado
- `contact.deleted` - Contato excluído

#### Produtos
- `product.created` - Produto criado
- `product.updated` - Produto atualizado
- `product.deleted` - Produto excluído

#### Agendamentos
- `appointment.created` - Agendamento criado
- `appointment.updated` - Agendamento atualizado
- `appointment.deleted` - Agendamento excluído

#### Tarefas
- `task.created` - Tarefa criada
- `task.updated` - Tarefa atualizada
- `task.deleted` - Tarefa excluída
- `task.completed` - Tarefa completada

## 🔍 Logs e Monitoramento

Todos os disparos de webhook são registrados na tabela `webhook_logs` com:

- Status code da resposta
- Sucesso/Falha
- Corpo da resposta
- Mensagem de erro (se houver)
- Timestamp

Você pode consultar os logs via SQL:

```sql
SELECT * FROM webhook_logs 
WHERE webhook_id = 'seu-webhook-id'
ORDER BY created_at DESC
LIMIT 100;
```

## 🛡️ Segurança

### Recomendações:

1. **Use HTTPS**: Sempre configure URLs com HTTPS
2. **Valide assinatura**: Implemente validação de assinatura no seu endpoint
3. **Rate limiting**: Configure rate limiting no seu servidor
4. **Idempotência**: Implemente processamento idempotente para evitar duplicação

### Exemplo de Endpoint (Node.js/Express):

```javascript
app.post('/webhook', express.json(), async (req, res) => {
  try {
    const { event, entity, data, tenant_id, timestamp } = req.body;
    
    // Validar evento
    if (!event || !entity || !data) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Processar evento
    switch (event) {
      case 'card.created':
        await handleCardCreated(data);
        break;
      case 'contact.updated':
        await handleContactUpdated(data);
        break;
      // ... outros eventos
    }

    // Retornar sucesso
    res.status(200).json({ received: true });
    
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

## ❓ Troubleshooting

### Webhook não está disparando

1. Verifique se o webhook está ativo
2. Confirme que os eventos corretos estão selecionados
3. Verifique os logs no Supabase Edge Functions
4. Consulte a tabela `webhook_logs` para erros

### Endpoint não recebe requisições

1. Verifique se a URL está correta e acessível
2. Teste a URL com ferramentas como Postman
3. Verifique se há firewall bloqueando
4. Confirme que o servidor está rodando

### Timeouts

1. Edge function tem timeout de 150 segundos
2. Seu endpoint deve responder rapidamente (< 10s recomendado)
3. Use processamento assíncrono para tarefas longas

## 🔧 Desenvolvimento Local

Para testar webhooks localmente, use ferramentas como:

- [ngrok](https://ngrok.com/) - Túnel para localhost
- [webhook.site](https://webhook.site/) - Endpoint de teste
- [requestbin](https://requestbin.com/) - Debug de requisições

Exemplo com ngrok:

```bash
ngrok http 3000
# Use a URL gerada como endpoint do webhook
```

## 📚 Recursos Adicionais

- [Documentação Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Documentação pg_net](https://github.com/supabase/pg_net)
