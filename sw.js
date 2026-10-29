/* 2Fit · funciona sem internet e abre na hora.
   Tudo do próprio site (página, config.js, ícones) vem primeiro da cópia guardada no celular,
   e uma cópia nova é buscada em segundo plano pra próxima abertura.
   Ao publicar uma versão, suba o número abaixo: o celular baixa tudo de novo,
   troca pra versão nova e o app recarrega sozinho uma vez. */
const VERSAO = '2fit-v13';
const ARQUIVOS = [
  './',
  './index.html',
  './config.js',
  './manifest.webmanifest',
  './icon.svg',
  './favicon.ico',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', ev => {
  // cache: 'reload' ignora o cache HTTP do GitHub Pages (até 10 min) e pega os arquivos novos de verdade
  ev.waitUntil(
    caches.open(VERSAO)
      .then(c => c.addAll(ARQUIVOS.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function atualizar(req, chave) {
  return fetch(req, { cache: 'no-store' }).then(res => {
    if (res && (res.ok || res.type === 'opaque')) {
      const copia = res.clone();
      caches.open(VERSAO).then(c => c.put(chave || req, copia));
    }
    return res;
  });
}

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const proprio = url.origin === location.origin;
  const fonte = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!proprio && !fonte) return;

  // Página: cópia guardada na hora (trocar de tela recarrega a página), atualiza em segundo plano
  if (req.mode === 'navigate') {
    const chave = url.pathname.endsWith('/demo.html') ? './demo.html' : './index.html';
    ev.respondWith(
      caches.match(chave).then(salvo => {
        const rede = atualizar(req, chave).catch(() => salvo);
        return salvo || rede;
      })
    );
    return;
  }

  ev.respondWith(
    caches.match(req, { ignoreSearch: true }).then(salvo => {
      const rede = atualizar(req).catch(() => salvo);
      return salvo || rede;
    })
  );
});
