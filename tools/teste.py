#!/usr/bin/env python3
"""Teste rápido no tamanho do iPhone 14 (WebKit, o motor do Safari).

Abre as duas fichas, toca em todos os dias, marca uma série, recarrega
(simula o iPhone fechando o app) e abre o painel. Falha se der erro de JS.

Instalar uma vez (cria o .venv na pasta do projeto, fora do git):
  python3 -m venv .venv && .venv/bin/pip install playwright && .venv/bin/python -m playwright install webkit
Uso: python3 tools/teste.py  (usa o .venv sozinho)
"""
import http.server, threading, functools, os, sys
from pathlib import Path

R = Path(__file__).resolve().parent.parent
try:
    from playwright.sync_api import sync_playwright
except ImportError:
    venv = R / '.venv/bin/python'
    if venv.exists() and Path(sys.prefix).resolve() != (R / '.venv').resolve():
        os.execv(str(venv), [str(venv), __file__, *sys.argv[1:]])
    sys.exit('Playwright não instalado. Rode uma vez:\n  python3 -m venv .venv && .venv/bin/pip install playwright && .venv/bin/python -m playwright install webkit')
tmp = R / '.teste'
tmp.mkdir(exist_ok=True)
html = (R / 'index.html').read_text().replace("const IS_SITE = location.protocol==='https:' && !window.claude;", "const IS_SITE = true;")
(tmp / 'index.html').write_text(html)
(tmp / 'config.js').write_text("window.TWOFIT_SUPABASE={url:'',anonKey:''};")  # sem Supabase no teste

class Quieto(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
H = functools.partial(Quieto, directory=str(tmp))
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), H)
threading.Thread(target=srv.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{srv.server_port}/index.html'

erros = []
with sync_playwright() as p:
    try:
        b = p.webkit.launch()
    except Exception:
        print('(WebKit não instalado, usando Chromium)')
        b = p.chromium.launch()
    pg = b.new_context(**p.devices['iPhone 14']).new_page()
    pg.on('pageerror', lambda e: erros.append(str(e)))
    for quem, painel in [('thai', 'painel'), ('junior', 'painel-jr')]:
        pg.goto(f'{base}#{quem}'); pg.wait_for_timeout(800)
        n = len(pg.query_selector_all('.tab'))
        for k in range(n):
            pg.query_selector_all('.tab')[k].click(); pg.wait_for_timeout(200)
            t = pg.query_selector_all('.tab')[k].inner_text().replace('\n', ' ')
            q = pg.evaluate("document.querySelectorAll('#day article.ex').length")
            print(f'  {quem:6} {t:22} {q} exercícios' + ('  ⚠ passa de 6' if q > 6 else ''))
        chk = pg.query_selector('#day .set .chk')
        if chk:
            chk.click(); pg.wait_for_timeout(300)
            pg.reload(); pg.wait_for_timeout(1000)
            print(f'  {quem:6} recarregou: timer {"voltou" if "show" in pg.evaluate("document.querySelector(\'#timer\').className") else "não voltou"}')
        pg.goto(f'{base}#{painel}'); pg.wait_for_timeout(1000)
        pg.screenshot(path=str(tmp / f'painel-{quem}.png'))
    b.close()
srv.shutdown()
print('\nprints em .teste/')
if erros:
    print('ERROS DE JS:'); [print(' -', e) for e in erros]; sys.exit(1)
print('ok · sem erros de JS')
