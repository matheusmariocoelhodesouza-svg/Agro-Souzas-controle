import { createClient } from "jsr:@supabase/supabase-js@2.118.0";

// Called only after authenticating the user and checking company access.
// The Vault RPC is executable exclusively by the server's service_role.
export async function getOpenAiApiKey(): Promise<string | null> {
  const configured = Deno.env.get("OPENAI_API_KEY")?.trim();
  if (configured) return configured;

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return null;

  try {
    const server = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(5000) })
      }
    });
    const { data, error } = await server.rpc("v2_ai_server_key");
    if (error) throw new Error("key_lookup_failed");
    return typeof data === "string" && data.trim() ? data.trim() : null;
  } catch {
    throw new Error("ai_configuration_unavailable");
  }
}

export async function openAiProviderError(response: Response) {
  const body = await response.json().catch(() => ({}));
  const code = String(body?.error?.code || "");
  const type = String(body?.error?.type || "");
  if (["credit_balance_exhausted", "insufficient_quota", "billing_hard_limit_reached"].includes(code) || type === "insufficient_quota") {
    return { status: 503, error: "ai_billing_required", message: "A conta da IA está sem saldo ou atingiu o limite de uso. Avise o administrador." };
  }
  if (response.status === 401 || response.status === 403) {
    return { status: 503, error: "ai_configuration_error", message: "A configuração da IA precisa ser revisada pelo administrador." };
  }
  if (response.status === 429) {
    return { status: 503, error: "ai_busy", message: "A IA está temporariamente ocupada. Aguarde um pouco e tente novamente." };
  }
  return { status: 502, error: "ai_provider_error", message: "A IA está indisponível. Tente novamente." };
}
