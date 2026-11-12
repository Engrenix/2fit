// @ts-nocheck
// 2Fit · função "descanso": manda a notificação quando o descanso acaba.
// O app chama esta função ao iniciar, somar (+15 s) ou pular o cronômetro.
// Sem bibliotecas: Web Push (RFC 8291 + VAPID) feito com o crypto nativo, pra rodar liso no Supabase.
// Segredos (Edge Functions > Secrets): VAPID_PUBLIC e VAPID_PRIVATE.
// "Verify JWT" pode ficar DESLIGADO: a função confere o login sozinha.

const SB_URL = Deno.env.get("SUPABASE_URL");
// chave pública: a que o app manda no cabeçalho "apikey", ou a do próprio projeto
const pubKeyEnv = () => { const a = Deno.env.get("SUPABASE_ANON_KEY"); if (a) return a;
  try { const d = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}"); return Object.values(d)[0] || ""; } catch { return ""; } };
let ANON = "";
const VAPID_PUBLIC = (Deno.env.get("VAPID_PUBLIC") || "").trim();
const VAPID_PRIVATE = (Deno.env.get("VAPID_PRIVATE") || "").trim();
const SUBJECT = "https://engrenix.github.io/2fit/";
const MAX_ESPERA = 140_000; // o plano grátis encerra a função em 150 s

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });

/* ---------- Web Push ---------- */
const te = new TextEncoder();
const b64uDec = (s) => { s = s.replace(/-/g, "+").replace(/_/g, "/"); s += "=".repeat((4 - (s.length % 4)) % 4); return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); };
const b64uEnc = (b) => { let s = ""; new Uint8Array(b).forEach((x) => (s += String.fromCharCode(x))); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
const cat = (...a) => { const n = a.reduce((t, x) => t + x.length, 0), o = new Uint8Array(n); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };

async function vapidAuth(endpoint) {
  const pub = b64uDec(VAPID_PUBLIC);
  const key = await crypto.subtle.importKey("jwk", { kty: "EC", crv: "P-256", d: VAPID_PRIVATE, x: b64uEnc(pub.slice(1, 33)), y: b64uEnc(pub.slice(33, 65)), ext: true },
    { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const head = b64uEnc(te.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = b64uEnc(te.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: SUBJECT })));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, te.encode(head + "." + body));
  return `vapid t=${head}.${body}.${b64uEnc(sig)}, k=${VAPID_PUBLIC}`;
}

async function encrypt(sub, payload) {
  const uaPub = b64uDec(sub.keys.p256dh), authSecret = b64uDec(sub.keys.auth);
  const as = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", as.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, as.privateKey, 256));
  const hkdf = async (salt, ikm, info, len) => new Uint8Array(await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info }, await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]), len * 8));
  const ikm = await hkdf(authSecret, ecdh, cat(te.encode("WebPush: info\0"), uaPub, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, te.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, te.encode("Content-Encoding: nonce\0"), 12);
  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aes, cat(te.encode(payload), new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]); // 4096
  return cat(salt, rs, new Uint8Array([asPub.length]), asPub, ct);
}

async function sendPush(sub, data) {
  const r = await fetch(sub.endpoint, {
    method: "POST",
    headers: { Authorization: await vapidAuth(sub.endpoint), TTL: "60", Urgency: "high", "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream" },
    body: await encrypt(sub, JSON.stringify(data)),
  });
  return { status: r.status, body: (await r.text()).slice(0, 300) };
}

/* ---------- Banco (com o login da própria pessoa) ---------- */
const rest = (token, path, opt = {}) => fetch(`${SB_URL}/rest/v1/${path}`, { ...opt,
  headers: { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(opt.headers || {}) } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    ANON = req.headers.get("apikey") || pubKeyEnv();
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) return json({ erro: "faltam os segredos VAPID_PUBLIC e VAPID_PRIVATE" }, 500);
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const u = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: ANON, Authorization: `Bearer ${token}` } });
    if (!u.ok) return json({ erro: "login inválido", status: u.status }, 401);
    const user = await u.json();

    const { sub, seconds = 0, cancel = false, test = false, title = "Descanso acabou", body = "Bora pra próxima série" } = await req.json().catch(() => ({}));
    if (!sub?.endpoint || !sub?.keys?.p256dh) return json({ erro: "celular sem inscrição de notificação" }, 400);

    // Teste: espera alguns segundos e já devolve a resposta do serviço de notificação
    if (test) {
      await new Promise((r) => setTimeout(r, Math.min(Number(seconds) || 8, 20) * 1000));
      const res = await sendPush(sub, { title: "Teste do 2Fit", body: "Se chegou, o aviso do descanso está funcionando", tag: "teste" });
      console.log("teste", res);
      return json({ ok: res.status >= 200 && res.status < 300, push: res });
    }

    const segundos = Math.max(0, Math.min(Number(seconds) || 0, 600));
    const fireAt = cancel || !segundos ? 0 : Date.now() + segundos * 1000;
    const up = await rest(token, "twofit_push", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ endpoint: sub.endpoint, user_id: user.id, fire_at: fireAt, updated_at: new Date().toISOString() }) });
    if (!up.ok) { const t = await up.text(); console.error("tabela", up.status, t); return json({ erro: "tabela twofit_push", status: up.status, detalhe: t.slice(0, 200) }, 500); }
    if (!fireAt) return json({ ok: true, cancelado: true });

    const espera = Math.min(segundos * 1000, MAX_ESPERA);
    EdgeRuntime.waitUntil((async () => {
      await new Promise((r) => setTimeout(r, espera));
      const q = await rest(token, `twofit_push?select=fire_at&endpoint=eq.${encodeURIComponent(sub.endpoint)}`);
      const rows = q.ok ? await q.json() : [];
      if (!rows[0] || Number(rows[0].fire_at) !== fireAt) return; // trocado ou pulado
      const res = await sendPush(sub, { title, body, tag: "descanso" }).catch((e) => ({ status: 0, body: String(e) }));
      console.log("aviso", res.status, res.body);
    })());
    return json({ ok: true, avisoEm: espera / 1000 });
  } catch (e) {
    console.error(e);
    return json({ erro: String(e?.message || e) }, 500);
  }
});
