import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://app.comando360.com.br",
  "https://matheusmariocoelhodesouza-svg.github.io",
]);

function corsFor(req: Request) {
  const origin = req.headers.get("origin") || "";
  const devOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
  const allowed = !origin || ALLOWED_ORIGINS.has(origin) || devOrigin;
  return {
    allowed,
    headers: {
      "Access-Control-Allow-Origin": origin && allowed ? origin : "https://app.comando360.com.br",
      "Vary": "Origin",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  };
}
function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsFor(req).headers });
}
async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  const cors = corsFor(req);
  if (req.method === "OPTIONS") {
    if (!cors.allowed) return new Response(null, { status: 403, headers: cors.headers });
    return new Response("ok", { headers: cors.headers });
  }
  if (!cors.allowed) return json(req, { error: "Origem não autorizada" }, 403);
  if (req.method !== "POST") return json(req, { error: "Método não permitido" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !serviceRoleKey || !anonKey) return json(req, { error: "Configuração do servidor incompleta" }, 500);

  let payload: { code?: string; device_name?: string; native_version?: string };
  try { payload = await req.json(); }
  catch { return json(req, { error: "Dados inválidos" }, 400); }

  const pairingCode = String(payload.code || "").trim().toUpperCase();
  const deviceName = String(payload.device_name || "Android da equipe").trim().slice(0, 120);
  const nativeVersion = String(payload.native_version || "").trim().slice(0, 40);
  if (!/^[A-Z0-9]{10}$/.test(pairingCode)) return json(req, { error: "Código de rastreamento inválido" }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const publicClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const codeHash = await sha256Hex(pairingCode);
  const { data: pair, error: pairError } = await admin.from("v2_native_tracker_pairing_codes")
    .select("id,company_id,device_access_id,expires_at,used_at")
    .eq("code_hash", codeHash).is("used_at", null).gt("expires_at", new Date().toISOString()).limit(1).maybeSingle();
  if (pairError) return json(req, { error: "Não foi possível validar o código agora" }, 503);
  if (!pair) return json(req, { error: "Código inválido, vencido ou já utilizado" }, 400);

  const { data: device, error: deviceError } = await admin.from("v2_device_access")
    .select("id,company_id,team_id,device_name,active,native_user_id")
    .eq("id", pair.device_access_id).eq("company_id", pair.company_id).eq("active", true).maybeSingle();
  if (deviceError || !device) return json(req, { error: "Aparelho vinculado não está mais ativo" }, 400);

  const seed = crypto.randomUUID().replaceAll("-", "");
  const email = `tracker-${seed}@device.comando360.app`;
  const password = `C360!Nt9-${seed.slice(0, 24)}`;
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { comando360_device: true, comando360_native_tracker: true },
    app_metadata: { comando360_device: true, comando360_native_tracker: true },
  });
  if (createError || !created.user) return json(req, { error: "Não foi possível preparar o rastreador" }, 500);

  const nativeUserId = created.user.id;
  try {
    const { data: signInData, error: signInError } = await publicClient.auth.signInWithPassword({ email, password });
    if (signInError || !signInData.session) throw new Error("Falha ao iniciar sessão nativa");

    const { data: consumed, error: consumeError } = await admin.from("v2_native_tracker_pairing_codes")
      .update({ used_at: new Date().toISOString() }).eq("id", pair.id).is("used_at", null).select("id").maybeSingle();
    if (consumeError || !consumed) throw new Error("Código já utilizado");

    const { data: current } = await admin.from("v2_device_access").select("device_info").eq("id", device.id).maybeSingle();
    const { error: updateError } = await admin.from("v2_device_access").update({
      native_user_id: nativeUserId,
      device_info: {
        ...(current?.device_info || {}),
        native_tracker: true,
        native_tracker_version: nativeVersion,
        native_tracker_device_name: deviceName,
        native_tracker_activated_at: new Date().toISOString(),
        native_service_running: false,
      },
    }).eq("id", device.id).eq("company_id", device.company_id);
    if (updateError) throw updateError;

    const oldNativeUser = device.native_user_id as string | null;
    if (oldNativeUser && oldNativeUser !== nativeUserId) await admin.auth.admin.deleteUser(oldNativeUser).catch(() => {});

    return json(req, {
      session: signInData.session,
      device: { id: device.id, company_id: device.company_id, team_id: device.team_id, device_name: device.device_name },
    });
  } catch (error) {
    await admin.auth.admin.deleteUser(nativeUserId).catch(() => {});
    console.error("native-tracker activation", error);
    return json(req, { error: "Não foi possível ativar o rastreamento 24h" }, 500);
  }
});
