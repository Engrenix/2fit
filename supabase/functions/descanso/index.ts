// 2Fit · função "descanso": manda a notificação quando o descanso acaba.
// O app chama esta função ao iniciar, somar (+15 s) ou pular o cronômetro.
// Segredos necessários (Edge Functions > Secrets): VAPID_PUBLIC, VAPID_PRIVATE.
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem por padrão.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
webpush.setVapidDetails("mailto:avisos@2fit.app", Deno.env.get("VAPID_PUBLIC")!, Deno.env.get("VAPID_PRIVATE")!);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });

// O plano grátis encerra a função em 150 s. O aviso sai no máximo 140 s depois do início.
const MAX_ESPERA = 140_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return json({ erro: "não autorizado" }, 401);

  const { sub, seconds = 0, cancel = false, title = "Descanso acabou", body = "Bora pra próxima série" } =
    await req.json().catch(() => ({}));
  if (!sub?.endpoint) return json({ erro: "sem inscrição" }, 400);

  const segundos = Math.max(0, Math.min(Number(seconds) || 0, 600));
  const fireAt = cancel || !segundos ? 0 : Date.now() + segundos * 1000;
  await admin.from("twofit_push").upsert({
    endpoint: sub.endpoint, user_id: user.id, fire_at: fireAt, updated_at: new Date().toISOString(),
  });
  if (!fireAt) return json({ ok: true, cancelado: true });

  const espera = Math.min(segundos * 1000, MAX_ESPERA);
  // @ts-ignore EdgeRuntime existe no Supabase
  EdgeRuntime.waitUntil((async () => {
    await new Promise((r) => setTimeout(r, espera));
    const { data } = await admin.from("twofit_push").select("fire_at").eq("endpoint", sub.endpoint).maybeSingle();
    if (!data || Number(data.fire_at) !== fireAt) return; // o cronômetro foi trocado ou pulado
    try {
      await webpush.sendNotification(sub, JSON.stringify({ title, body, tag: "descanso" }), { TTL: 60, urgency: "high" });
    } catch (e) {
      console.error("push falhou", e);
      if ((e as { statusCode?: number }).statusCode === 410) await admin.from("twofit_push").delete().eq("endpoint", sub.endpoint);
    }
  })());
  return json({ ok: true, avisoEm: espera / 1000 });
});
