// @ts-nocheck
// 2Fit · função "social": avisos da disputa.
//  - kind "registrar": guarda a inscrição de notificação deste celular (e se quer receber avisos).
//  - kind "fechou":   avisa os celulares da OUTRA pessoa que um treino foi fechado.
//  - kind "resumo":   chamada pelo agendador (domingo à noite) com o cabeçalho x-cron; manda o placar final pra todos.
// Sem bibliotecas. Segredos: os mesmos VAPID_PUBLIC e VAPID_PRIVATE da função "descanso".
// "Verify JWT" DESLIGADO: a função confere o login (ou o código do agendador) sozinha.

const SB_URL = Deno.env.get("SUPABASE_URL");
const pubKeyEnv = () => { const a = Deno.env.get("SUPABASE_ANON_KEY"); if (a) return a;
  try { const d = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}"); return Object.values(d)[0] || ""; } catch { return ""; } };
// chave de serviço: já vem no ambiente da função, nunca sai daqui
const serviceKey = () => { const a = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); if (a) return a;
  try { const d = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}"); return Object.values(d)[0] || ""; } catch { return ""; } };
const VAPID_PUBLIC = (Deno.env.get("VAPID_PUBLIC") || "").trim();
const VAPID_PRIVATE = (Deno.env.get("VAPID_PRIVATE") || "").trim();
const SUBJECT = "https://engrenix.github.io/2fit/";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-cron",
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
    headers: { Authorization: await vapidAuth(sub.endpoint), TTL: "86400", Urgency: "normal", "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream" },
    body: await encrypt(sub, JSON.stringify(data)),
  });
  return { status: r.status, body: (await r.text()).slice(0, 300) };
}

/* ---------- Banco (com a chave de serviço, só dentro da função) ---------- */
const db = (path, opt = {}) => { const k = serviceKey(); return fetch(`${SB_URL}/rest/v1/${path}`, { ...opt,
  headers: { apikey: k, Authorization: `Bearer ${k}`, "Content-Type": "application/json", ...(opt.headers || {}) } }); };

async function sendAll(rows, data) {
  let ok = 0;
  for (const r of rows) {
    const res = await sendPush({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }, data).catch((e) => ({ status: 0, body: String(e) }));
    if (res.status >= 200 && res.status < 300) ok++;
    // inscrição que não existe mais: apaga
    if (res.status === 404 || res.status === 410) await db(`twofit_subs?endpoint=eq.${encodeURIComponent(r.endpoint)}`, { method: "DELETE" });
  }
  return ok;
}
const txt = (v, n) => String(v || "").replace(/\s+/g, " ").trim().slice(0, n);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) return json({ erro: "faltam os segredos VAPID_PUBLIC e VAPID_PRIVATE" }, 500);
    if (!serviceKey()) return json({ erro: "função sem chave de serviço no ambiente" }, 500);
    const body = await req.json().catch(() => ({}));

    /* ----- Resumo de domingo: só o agendador do banco chama ----- */
    if (body.kind === "resumo") {
      const q = await db("twofit_cron?select=token&id=eq.1"); const rows = q.ok ? await q.json() : [];
      if (!rows[0] || req.headers.get("x-cron") !== rows[0].token) return json({ erro: "não autorizado" }, 401);
      const c = await db("twofit_docs?select=data&id=eq.config"); const cfg = c.ok ? (await c.json())[0]?.data : null;
      const p = cfg?.placar;
      // semana atual (segunda) no horário de Brasília
      const now = new Date(Date.now() - 3 * 3600e3); const dow = (now.getUTCDay() + 6) % 7;
      const mon = new Date(now.getTime() - dow * 864e5).toISOString().slice(0, 10);
      const subs = await (await db("twofit_subs?select=endpoint,p256dh,auth&social=eq.true")).json();
      let title = "Semana fechada no 2Fit", texto = "Ninguém pontuou esta semana. Segunda começa do zero!";
      if (p && p.wk === mon) {
        title = p.t > p.j ? "👑 Thai venceu a semana" : p.j > p.t ? "👑 Júnior venceu a semana" : "Semana empatada";
        const rec = (p.rt || p.rj) ? ` Recordes: Thai ${p.rt || 0}, Júnior ${p.rj || 0}.` : "";
        texto = `Thai ${p.t} × ${p.j} Júnior.${rec}${p.casal ? " 🤝 Missão do casal cumprida!" : ""}`;
      }
      const ok = await sendAll(subs, { title, body: texto, tag: "resumo" });
      return json({ ok: true, enviados: ok });
    }

    /* ----- Chamadas do app: precisa de login ----- */
    const ANON = req.headers.get("apikey") || pubKeyEnv();
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const u = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: ANON, Authorization: `Bearer ${token}` } });
    if (!u.ok) return json({ erro: "login inválido" }, 401);
    const user = await u.json();
    const { sub, social = true, kind } = body;
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return json({ erro: "celular sem inscrição de notificação" }, 400);

    const up = await db("twofit_subs", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, user_id: user.id, social: !!social, updated_at: new Date().toISOString() }) });
    if (!up.ok) return json({ erro: "tabela twofit_subs", status: up.status, detalhe: (await up.text()).slice(0, 200) }, 500);
    if (kind !== "fechou") return json({ ok: true, registrado: true });

    const others = await (await db(`twofit_subs?select=endpoint,p256dh,auth&social=eq.true&user_id=neq.${user.id}`)).json();
    const ok = await sendAll(others, { title: txt(body.title, 80) || "Treino fechado no 2Fit", body: txt(body.body, 140), tag: "disputa" });
    return json({ ok: true, enviados: ok });
  } catch (e) {
    console.error(e);
    return json({ erro: String(e?.message || e) }, 500);
  }
});
