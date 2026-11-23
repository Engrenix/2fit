#!/usr/bin/env python3
"""Bateria completa do 2Fit, a mesma para qualquer navegador.

O app roda dentro de um iframe do tamanho do iPhone (375×667 e 390×844), num
servidor local sem Supabase. Testa as duas fichas, o cross, o "Só cross",
a tela de treino fechado, a disputa, o painel e o layout de cada tela.

Uso: python3 tools/bateria.py (WebKit do Playwright; Chromium se o WebKit não abrir).
"""
import http.server, threading, functools, time, json
from pathlib import Path

R = Path(__file__).resolve().parent.parent
TMP = R / '.teste'
SIZES = [(375, 667, 'SE'), (390, 844, '14')]

LAYOUT = r"""(()=>{const W=innerWidth, bad=[], small=[], font=[];
 if(document.documentElement.scrollWidth>W+1) bad.push('rolagem lateral '+document.documentElement.scrollWidth+'px');
 const vis=e=>{const r=e.getBoundingClientRect(), s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&!e.closest('[hidden]')};
 document.querySelectorAll('button,a,select,input,textarea,[role=button]').forEach(e=>{ if(!vis(e)) return; const r=e.getBoundingClientRect();
   if(r.right>W+1||r.left<-1) bad.push('fora da tela: '+(e.id||e.className||e.tagName));
   if(e.matches('input:not([type=file]):not([type=checkbox]),textarea,select') && parseFloat(getComputedStyle(e).fontSize)<16) font.push((e.id||e.className)+' '+getComputedStyle(e).fontSize);
   const a=getComputedStyle(e,'::after'), ext=a.content!=='none'&&a.position==='absolute';
   if(!ext && ((r.height<40 && r.width<40) || r.height<32)) small.push(String(e.id||e.className||e.tagName).slice(0,30)+' '+Math.round(r.width)+'x'+Math.round(r.height)); });
 return {bad, small:[...new Set(small)].slice(0,6), font:[...new Set(font)]};})()"""


def servidor():
    """Serve o index.html (sem Supabase) e a página com o iframe do tamanho do iPhone."""
    TMP.mkdir(exist_ok=True)
    html = (R / 'index.html').read_text().replace(
        "const IS_SITE = location.protocol==='https:' && !window.claude;", "const IS_SITE = true;")
    html = html.replace('<head>', "<head><script>window.__errs=[];addEventListener('error',e=>__errs.push(e.message));addEventListener('unhandledrejection',e=>__errs.push(String(e.reason)))</script>", 1)
    (TMP / 'index.html').write_text(html)
    (TMP / 'config.js').write_text("window.TWOFIT_SUPABASE={url:'',anonKey:''};")
    (TMP / 'harness.html').write_text(
        '<!doctype html><meta charset="utf-8"><body style="margin:0;background:#888">'
        '<iframe id="app" name="app" src="about:blank" style="border:0;display:block;background:#fff"></iframe>')

    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Q, directory=str(TMP)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return f'http://127.0.0.1:{srv.server_address[1]}/'


def rodar(D, base, shots):
    """D: adaptador com abrir(hash,w,h) recarregar() click() fill() js() visible() count() text() foto()."""
    shots.mkdir(parents=True, exist_ok=True)
    res = []
    def ok(nome, cond, ev=''): res.append(('PASSOU' if cond else 'FALHOU', nome, ev))
    def lay(tag, nome):
        L = D.js(LAYOUT)
        ok(f'{tag} layout {nome}', not L['bad'] and not L['font'], (L['bad'] + L['font'])[:3])
        if L['small']: res.append(('AVISO', f'{tag} toque pequeno em {nome}', L['small']))
    def tabs(): return D.js("[...document.querySelectorAll('#tabs [data-k]')].map(e=>e.dataset.k)")

    for w, h, tag in SIZES:
      try:
          D.limpar(base)
          D.abrir('', w, h); lay(tag, 'home'); D.foto(shots / f'{tag}-home.png')
          D.click('#scoreBtn'); ok(f'{tag} placar abre a disputa', D.visible('#duelSheet')); lay(tag, 'disputa')
          D.click('[data-duel-last]'); D.click('[data-duel-close]'); ok(f'{tag} disputa fecha', not D.visible('#duelSheet'))

          D.abrir('#thai', w, h)
          for k in tabs():
              D.click(f'#tabs [data-k="{k}"]'); n = D.count('#day article.ex')
              ok(f'{tag} Thai {k}: até 6 exercícios', n <= 6, n); lay(tag, f'Thai {k}')
          first = D.js("DAYS.find(d=>!d.rest).key")
          D.click(f'#tabs [data-k="{first}"]'); D.click('#day article.ex .chk')
          D.recarregar(); D.click(f'#tabs [data-k="{first}"]')
          ok(f'{tag} Thai: série marcada fica depois de recarregar', D.count('#day .chk[aria-pressed="true"]') >= 1)
          D.foto(shots / f'{tag}-thai.png')
          D.abrir('#painel', w, h); ok(f'{tag} painel da Thai', D.visible('#v-painel')); lay(tag, 'painel Thai')

          D.abrir('#junior', w, h)
          for k in tabs():
              D.click(f'#tabs [data-k="{k}"]'); lay(tag, f'Júnior {k}')
          D.click('#tabs [data-k="jB"]')
          ok(f'{tag} seg: pergunta do cross', 'cross hoje' in D.text('#day').lower())
          D.fill('#crossTxt', 'Força\n5x 8 push press\nWOD\n5x for time\n30 hang power clean\n150 DU\n30 jerk')
          ok(f'{tag} seg: leitura escondida enquanto digita', not D.visible('#cxGo'))
          D.click('#cxOk', espera=0.6)
          ok(f'{tag} seg: Pronto fecha o teclado e mostra a leitura', D.visible('#cxGo') and D.js("document.activeElement.id") != 'crossTxt')
          ok(f'{tag} seg: leu 5 rodadas', D.text('.cxr b') == '5', D.text('.cxr b')); lay(tag, 'leitura do cross')
          D.click('[data-rd="1:1"]'); ok(f'{tag} seg: + das rodadas', D.text('.cxr b') == '6')
          D.click('#cxGo', espera=0.6); n = D.count('#day article.ex')
          ok(f'{tag} seg: plano com até 6 itens', 1 <= n <= 6, n)
          ok(f'{tag} seg: título vira o foco', 'complemento do cross' in D.text('#v-thai').lower())
          lay(tag, 'plano'); D.foto(shots / f'{tag}-plano.png')
          if D.count('#day [data-swap]'): D.click('#day [data-swap]')
          D.js("document.querySelectorAll('#day article.ex')[1].scrollIntoView({block:'center'})")
          D.click('#day article.ex:nth-of-type(2) .chk')
          D.click('#cxEdit'); ok(f'{tag} seg: plano trava depois da 1ª série', D.count('#crossTxt') == 0)
          D.recarregar(); D.click('#tabs [data-k="jB"]')
          ok(f'{tag} seg: plano e série ficam depois de recarregar', D.count('#day article.ex') == n and D.count('#day .chk[aria-pressed="true"]') >= 1)
          D.click('[data-finish]', espera=0.2); D.click('[data-finish]', espera=0.9)
          ok(f'{tag} seg: Finalizar abre o treino fechado', D.visible('#doneView')); lay(tag, 'treino fechado')
          D.foto(shots / f'{tag}-fechado.png')

          D.abrir('#junior', w, h)
          D.click('#tabs [data-k="jbt"]'); D.fill('#crossTxt', '8x1 power snatch 85kg'); D.click('#cxOk', espera=0.5)
          ok(f'{tag} ter: botão Salvar o cross', D.text('#cxGo') == 'Salvar o cross'); D.click('#cxGo', espera=0.5)
          ok(f'{tag} ter: resumo do cross e beach', D.count('.cxs') == 1 and D.count('[data-beach]') >= 1); lay(tag, 'terça')
          ok(f'{tag} ter: quarta leva o cross em conta', D.js("Object.values(residualF(addDays(WEEK,2))).some(v=>v>0)"))
          D.click('#tabs [data-k="jA"]'); D.fill('#crossTxt', '5x5 deadlifit 170kg'); D.click('#cxOk', espera=0.5)
          ok(f'{tag} qua: erro de digitação reconhecido', 'não reconheci' not in D.text('#cxPrev').lower())
          D.click('#cxSkip', espera=0.2); D.click('#cxSkip', espera=0.6)
          ok(f'{tag} qua: só cross conta como dia feito', D.js("dayState('jA')") == 'full' and D.visible('#cxUnskip')); lay(tag, 'só cross')
          D.click('#cxUnskip'); ok(f'{tag} qua: desfazer volta pro cross', D.count('#crossTxt') == 1)
          D.click('#tabs [data-k="jD"]'); D.click('#cxNone', espera=0.6)
          ok(f'{tag} qui: hoje sem cross monta o treino', 1 <= D.count('#day article.ex') <= 6)
          D.click('#tabs [data-k="jcor"]'); D.fill('#crossTxt', 'amrap 12 min: 15 wall ball, 10 pull up')
          D.click('#cxOk', espera=0.5); D.click('#cxGo', espera=0.6)
          ok(f'{tag} sáb: até 5 itens', 1 <= D.count('#day article.ex') <= 5); lay(tag, 'sábado')
          D.abrir('#painel-jr', w, h); ok(f'{tag} painel do Júnior', D.visible('#v-painel')); lay(tag, 'painel Júnior')
          D.foto(shots / f'{tag}-painel-jr.png')
          erros = D.erros()
          ok(f'{tag} sem erro de JS', not erros, erros[:3])
      except Exception as e:
        res.append(('FALHOU', f'{tag}: a bateria parou no meio', str(e).splitlines()[0][:200]))
    return res


def relatorio(res, motor, saida):
    linhas = [f'Motor: {motor}']
    for r in res:
        if r[0] != 'PASSOU': linhas.append(' | '.join(map(str, r)))
    nt = sum(r[0] != 'AVISO' for r in res); np = sum(r[0] == 'PASSOU' for r in res)
    linhas.append(f'passou {np} de {nt}')
    txt = '\n'.join(linhas); print(txt)
    saida.write_text(txt + '\n\n' + json.dumps(res, ensure_ascii=False, indent=1))
    return np == nt


# ---------- adaptador Playwright (WebKit; Chromium se o WebKit não abrir) ----------
class PW:
    def __init__(s, page): s.p = page; s.errs = []; s.base = ''
    def limpar(s, base):
        s.base = base; s.p.goto(base + 'index.html'); s.p.evaluate('localStorage.clear()')
        s.p.goto(base + 'harness.html'); s.f = None
    def _f(s): return s.p.frame(name='app')
    def abrir(s, hsh, w, h):
        s.p.evaluate(f"(()=>{{const f=document.getElementById('app');f.style.width='{w}px';f.style.height='{h}px';f.src='index.html?'+Date.now()+'{hsh}'}})()")
        time.sleep(1.0)
    def recarregar(s):
        s._f().evaluate('location.reload()'); time.sleep(1.0)
    def click(s, css, espera=0.35): s._f().locator(css).first.click(timeout=8000); time.sleep(espera)
    def fill(s, css, txt): s._f().locator(css).first.click(); s._f().locator(css).first.fill(txt); time.sleep(0.4)
    def js(s, expr): return s._f().evaluate(expr)
    def visible(s, css): return s._f().locator(css).first.is_visible() if s.count(css) else False
    def count(s, css): return s._f().locator(css).count()
    def text(s, css): return s._f().locator(css).first.inner_text()
    def foto(s, path): s.p.locator('#app').screenshot(path=str(path))
    def erros(s): return s._f().evaluate('window.__errs||[]')


if __name__ == '__main__':
    from playwright.sync_api import sync_playwright
    base = servidor()
    with sync_playwright() as p:
        try: b = p.webkit.launch(); motor = 'WebKit (Playwright)'
        except Exception: b = p.chromium.launch(); motor = 'Chromium (WebKit não abriu)'
        pg = b.new_page(viewport={'width': 430, 'height': 900}, device_scale_factor=2)
        res = rodar(PW(pg), base, TMP / 'bateria')
        b.close()
    raise SystemExit(0 if relatorio(res, motor, TMP / 'bateria' / 'resultado.txt') else 1)
