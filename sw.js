/* 2Fit · funciona sem internet depois da primeira visita.
   Página: tenta a rede primeiro (pra pegar atualizações) e usa a cópia guardada se estiver offline.
   Ícones, manifest e fontes: usa a cópia guardada e atualiza em segundo plano.
   Ao mudar arquivos do app, suba o número da versão abaixo. */
const VERSAO = '2fit-v3';
const ARQUIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './favicon.ico',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const proprio = url.origin === location.origin;
  const fonte = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!proprio && !fonte) return;

  if (req.mode === 'navigate') {
    ev.respondWith(
      fetch(req)
        .then(res => { const copia = res.clone(); caches.open(VERSAO).then(c => c.put('./index.html', copia)); return res; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  ev.respondWith(
    caches.match(req).then(salvo => {
      const rede = fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) { const copia = res.clone(); caches.open(VERSAO).then(c => c.put(req, copia)); }
        return res;
      }).catch(() => salvo);
      return salvo || rede;
    })
  );
});
