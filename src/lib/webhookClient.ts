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
    const body: WebhookClientPayload = {
      ...payload,
      timestamp: payload.timestamp ?? new Date().toISOString(),
    };

    const { error } = await supabase.functions.invoke("dispatch-webhook", {
      body,
    });

    if (error) {
      console.error("Error invoking dispatch-webhook:", error);
    }
  } catch (err) {
    console.error("Error invoking dispatch-webhook:", err);
  }
}
