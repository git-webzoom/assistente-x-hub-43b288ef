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
  user_id?: string | null;
  timestamp: string;
}

serve(async (req) => {
  const VERSION = 'v2.0-client-only';
  console.log(`🚀 dispatch-webhook-v2 ${VERSION}`);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Optional health check
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ status: 'ok', version: VERSION }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rawBody = await req.text();
    console.log('[v2] Raw request body:', rawBody);

    let incoming: any;
    try {
      incoming = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('[v2] Failed to parse JSON:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Normaliza o payload (NUNCA exige event_type)
    const payload: WebhookPayload = {
      event: incoming.event ?? incoming.event_type ?? incoming.type ?? 'unknown',
      entity: incoming.entity ?? incoming.resource ?? 'unknown',
      data: incoming.data ?? incoming.payload ?? incoming,
      tenant_id: incoming.tenant_id ?? incoming.tenantId ?? incoming.tenant ?? 'unknown',
      user_id: incoming.user_id ?? incoming.userId ?? null,
      timestamp: incoming.timestamp ?? new Date().toISOString(),
    };

    console.log('[v2] Normalized payload:', {
      original_keys: Object.keys(incoming),
      event: payload.event,
      entity: payload.entity,
      tenant_id: payload.tenant_id,
      user_id: payload.user_id,
    });

    // Busca webhooks ativos para o tenant
    const { data: webhooks, error: webhooksError } = await supabase
      .from('webhooks')
      .select('*')
      .eq('tenant_id', payload.tenant_id)
      .eq('is_active', true);

    if (webhooksError) {
      console.error('[v2] Error fetching webhooks:', webhooksError);
      throw webhooksError;
    }

    if (!webhooks || webhooks.length === 0) {
      console.log('[v2] No active webhooks found for this tenant');
      return new Response(
        JSON.stringify({ message: 'No active webhooks found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    const matchingWebhooks = webhooks.filter((webhook) => {
      const events = webhook.events || [];
      return events.includes(payload.event) || events.includes('*');
    });

    console.log(`[v2] Found ${matchingWebhooks.length} matching webhooks`);

    const webhookPromises = matchingWebhooks.map(async (webhook) => {
      try {
        console.log(`[v2] Dispatching webhook to: ${webhook.url}`);

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

        console.log(`[v2] Webhook ${webhook.id} response:`, { success, statusCode });

        await supabase.from('webhook_logs').insert({
          webhook_id: webhook.id,
          event: payload.event,
          payload,
          status_code: statusCode,
          success,
          response_body: await response.text().catch(() => null),
        });

        return { webhook_id: webhook.id, success, statusCode };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[v2] Error dispatching webhook ${webhook.id}:`, error);

        await supabase.from('webhook_logs').insert({
          webhook_id: webhook.id,
          event: payload.event,
          payload,
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
        message: 'Webhooks dispatched (v2)',
        results,
        total: results.length,
        successful: results.filter((r) => r.success).length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[v2] Webhook dispatch error:', error);
    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: 'Failed to dispatch webhooks (v2)',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
