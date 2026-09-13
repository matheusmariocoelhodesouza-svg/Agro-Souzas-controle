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

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return json(req, { error: "Configuração do servidor incompleta" }, 500);
  }

  let payload: { code?: string; device_name?: string };
  try {
    payload = await req.json();
  } catch {
    return json(req, { error: "Dados inválidos" }, 400);
  }

  const pairingCode = String(payload.code || "").trim().toUpperCase();
  const deviceName = String(payload.device_name || "Celular da equipe").trim().slice(0, 120);

  if (!/^[A-Z0-9]{8,12}$/.test(pairingCode)) {
    return json(req, { error: "Código de ativação inválido" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Validação barata antes de criar qualquer usuário técnico. A RPC abaixo continua
  // sendo a autoridade final e resolve corrida/reutilização do mesmo código.
  const codeHash = await sha256Hex(pairingCode);
  const { data: validCode, error: validateError } = await admin
    .from("v2_device_pairing_codes")
    .select("id")
    .eq("code_hash", codeHash)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .maybeSingle();

  if (validateError) {
    console.error("device-activate pairing precheck", validateError.message);
    return json(req, { error: "Não foi possível validar o código agora" }, 503);
  }
  if (!validCode) {
    return json(req, { error: "Código inválido, vencido ou já utilizado" }, 400);
  }

  const publicClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const seed = crypto.randomUUID().replaceAll("-", "");
  const email = `device-${seed}@device.comando360.app`;
  const password = `C360!Aa9-${seed.slice(0, 24)}`;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { controla_device: true, comando360_device: true },
    app_metadata: { comando360_device: true },
  });

  if (createError || !created.user) {
    console.error("device-activate createUser", createError?.message || "unknown");
    return json(req, { error: "Não foi possível preparar este aparelho" }, 500);
  }

  const userId = created.user.id;
  try {
    const { data: signInData, error: signInError } = await publicClient.auth.signInWithPassword({ email, password });
    if (signInError || !signInData.session) {
      throw new Error(signInError?.message || "Não foi possível iniciar a sessão do aparelho");
    }

    const { data: pairing, error: pairingError } = await admin.rpc("v2_pair_device_service", {
      p_code: pairingCode,
      p_user_id: userId,
      p_device_name: deviceName,
    });

    if (pairingError) {
      const msg = pairingError.message || "Falha ao vincular o aparelho";
      const safe = /Código inválido|Equipe do código|Informe o código/i.test(msg)
        ? msg
        : "Não foi possível vincular este aparelho";
      throw Object.assign(new Error(safe), { clientSafe: true });
    }

    return json(req, {
      session: signInData.session,
      device: Array.isArray(pairing) ? pairing[0] : pairing,
    });
  } catch (error) {
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    const e = error as Error & { clientSafe?: boolean };
    return json(req, { error: e.clientSafe ? e.message : "Não foi possível ativar este aparelho" }, e.clientSafe ? 400 : 500);
  }
});
