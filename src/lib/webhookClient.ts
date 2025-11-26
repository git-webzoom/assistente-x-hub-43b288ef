import { supabase } from "@/lib/supabase";

interface WebhookClientPayload {
  event: string;
  entity: string;
  data: any;
  tenant_id: string;
  user_id?: string | null;
  timestamp?: string;
}

export async function dispatchWebhookFromClient(payload: WebhookClientPayload) {
  try {
    const body = {
      event: payload.event,
      entity: payload.entity,
      data: payload.data,
      tenant_id: payload.tenant_id,
      user_id: payload.user_id || null,
      timestamp: payload.timestamp || new Date().toISOString(),
    };

    console.log("Dispatching webhook from client:", body);

    const { data, error } = await supabase.functions.invoke("dispatch-webhook-v2", {
      body,
    });

    if (error) {
      console.error("Error invoking dispatch-webhook:", error);
    } else {
      console.log("Webhook dispatched successfully:", data);
    }
  } catch (err) {
    console.error("Error invoking dispatch-webhook:", err);
  }
}
