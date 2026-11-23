#!/usr/bin/env python3
"""Bateria completa no Safari de verdade (o do Mac), com cliques.

O app abre dentro de um quadro do tamanho do iPhone SE e do iPhone 14.
Resultado em .teste/safari/resultado.txt e prints em .teste/safari/.

Uma vez só no Mac:
  - Safari › Ajustes › Avançado › "Mostrar recursos para desenvolvedores web"
  - menu Desenvolvedor › "Permitir Automação Remota"
  - Terminal: sudo safaridriver --enable
Uso: python3 tools/teste_safari.py   (instala o Selenium no .venv sozinho)
"""
import os, sys, subprocess, time
from pathlib import Path

R = Path(__file__).resolve().parent.parent
venv = R / '.venv/bin/python'
if venv.exists() and Path(sys.prefix).resolve() != (R / '.venv').resolve():
    os.execv(str(venv), [str(venv), __file__, *sys.argv[1:]])
try:
    from selenium import webdriver
    from selenium.webdriver.common.by import By
except ImportError:
    print('Instalando o Selenium no .venv (só na primeira vez)…')
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-q', 'selenium'])
    from selenium import webdriver
    from selenium.webdriver.common.by import By

sys.path.insert(0, str(R / 'tools'))
import bateria


class Safari:
    def __init__(s, d): s.d = d
    def _app(s): s.d.switch_to.default_content(); s.d.switch_to.frame('app')
    def limpar(s, base):
        s.base = base
        s.d.get(base + 'index.html'); s.d.execute_script('localStorage.clear()')
        s.d.get(base + 'harness.html')
    def abrir(s, hsh, w, h):
        s.d.switch_to.default_content()
        s.d.execute_script(f"const f=document.getElementById('app');f.style.width='{w}px';f.style.height='{h}px';f.src='index.html?'+Date.now()+'{hsh}'")
        time.sleep(1.5); s._app()
    def recarregar(s):
        s.d.execute_script('location.reload()'); time.sleep(1.5); s._app()
    def _el(s, css, t=8):
        fim = time.time() + t
        while True:
            els = s.d.find_elements(By.CSS_SELECTOR, css)
            if els and els[0].is_displayed(): return els[0]
            if time.time() > fim: raise AssertionError(f'não achei na tela: {css}')
            time.sleep(0.2)
    def click(s, css, espera=0.4):
        e = s._el(css); s.d.execute_script("arguments[0].scrollIntoView({block:'center'})", e); time.sleep(0.15)
        e.click(); time.sleep(espera)
    def fill(s, css, txt):
        e = s._el(css); e.click(); e.clear(); e.send_keys(txt); time.sleep(0.5)
    def js(s, expr): return s.d.execute_script('return ' + expr)
    def visible(s, css):
        els = s.d.find_elements(By.CSS_SELECTOR, css); return bool(els) and els[0].is_displayed()
    def count(s, css): return len(s.d.find_elements(By.CSS_SELECTOR, css))
    def text(s, css): return s.d.find_element(By.CSS_SELECTOR, css).text
    def foto(s, path):
        s.d.switch_to.default_content(); s.d.find_element(By.ID, 'app').screenshot(str(path)); s._app()
    def erros(s): return s.js('window.__errs||[]')


if __name__ == '__main__':
    base = bateria.servidor()
    try:
        d = webdriver.Safari()
    except Exception as e:
        sys.exit('Não consegui abrir o Safari. Confira: menu Desenvolvedor › "Permitir Automação Remota" '
                 'e, no Terminal, "sudo safaridriver --enable".\n' + str(e).splitlines()[0])
    try:
        d.set_window_rect(x=40, y=40, width=520, height=1000)
        saida = R / '.teste/safari'
        try:
            res = bateria.rodar(Safari(d), base, saida)
        except Exception as e:
            res = [('FALHOU', 'a bateria parou no meio', str(e).splitlines()[0])]
        versao = d.capabilities.get('browserVersion', '?')
    finally:
        d.quit()
    ok = bateria.relatorio(res, f'Safari {versao} (Mac)', saida / 'resultado.txt')
    raise SystemExit(0 if ok else 1)
