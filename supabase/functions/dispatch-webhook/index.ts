import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  event: string;
  entity: string;
  data: any;
  tenant_id: string;
  user_id?: string;
  timestamp: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rawBody = await req.text();
    console.log('Raw request body:', rawBody);

    let payload: WebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }
    
    console.log('Webhook dispatch triggered:', {
      event: payload.event,
      entity: payload.entity,
      tenant_id: payload.tenant_id,
      fullPayload: payload,
    });

    // Buscar webhooks ativos para este tenant e evento
    const { data: webhooks, error: webhooksError } = await supabase
      .from('webhooks')
      .select('*')
      .eq('tenant_id', payload.tenant_id)
      .eq('is_active', true);

    if (webhooksError) {
      console.error('Error fetching webhooks:', webhooksError);
      throw webhooksError;
    }

    if (!webhooks || webhooks.length === 0) {
      console.log('No active webhooks found for this tenant');
      return new Response(
        JSON.stringify({ message: 'No active webhooks found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Filtrar webhooks que devem receber este evento
    const matchingWebhooks = webhooks.filter(webhook => {
      const events = webhook.events || [];
      return events.includes(payload.event) || events.includes('*');
    });

    console.log(`Found ${matchingWebhooks.length} matching webhooks`);

    // Disparar webhooks em paralelo
    const webhookPromises = matchingWebhooks.map(async (webhook) => {
      try {
        console.log(`Dispatching webhook to: ${webhook.url}`);
        
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'AssistentEx-Webhook/1.0',
            'X-Webhook-Event': payload.event,
            'X-Webhook-Timestamp': payload.timestamp,
          },
          body: JSON.stringify(payload),
        });

        const success = response.ok;
        const statusCode = response.status;

        console.log(`Webhook ${webhook.id} response:`, { success, statusCode });

        // Registrar log do webhook
        await supabase.from('webhook_logs').insert({
          webhook_id: webhook.id,
          event: payload.event,
          payload: payload,
          status_code: statusCode,
          success: success,
          response_body: await response.text().catch(() => null),
        });

        return { webhook_id: webhook.id, success, statusCode };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error dispatching webhook ${webhook.id}:`, error);
        
        // Registrar erro
        await supabase.from('webhook_logs').insert({
          webhook_id: webhook.id,
          event: payload.event,
          payload: payload,
          status_code: 0,
          success: false,
          error_message: errorMessage,
        });

        return { webhook_id: webhook.id, success: false, error: errorMessage };
      }
    });

    const results = await Promise.all(webhookPromises);

    return new Response(
      JSON.stringify({
        message: 'Webhooks dispatched',
        results,
        total: results.length,
        successful: results.filter(r => r.success).length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Webhook dispatch error:', error);
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: 'Failed to dispatch webhooks'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
