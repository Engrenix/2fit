#!/usr/bin/env python3
"""Gera index.html (site) e demo.html (demonstração) a partir de src/app.html.

Uso: python3 tools/build.py
Edite sempre src/app.html. Nunca edite index.html nem demo.html à mão: o build sobrescreve.
"""
from pathlib import Path
R = Path(__file__).resolve().parent.parent
src = (R / 'src/app.html').read_text()
idx = (R / 'index.html').read_text()
# O <head> do site (ícones, manifest, Open Graph, cor da barra) vem do index.html atual
head = idx[:idx.index('<link rel="preconnect"')]
body = src.replace('<title>2Fit</title>\n', '').replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '')
i = body.index('</style>') + len('</style>')
body = body[:i] + '\n<script src="config.js"></script>' + body[i:]
s = head + body + '\n</body>\n</html>\n'
(R / 'index.html').write_text(s)

def rep(o, n, c=1):
    global s
    assert s.count(o) == c, (o[:60], s.count(o))
    s = s.replace(o, n)

rep('<title>2Fit</title>', '<title>2Fit · demonstração</title>\n<meta name="robots" content="noindex">')
i = s.index('</style>')
s = s[:i] + """.demo-flag{position:fixed;left:50%;top:calc(env(safe-area-inset-top, 0px) + 8px);transform:translateX(-50%);z-index:40;background:#FFF6D9;color:#6B5420;border:1px solid #F1DFA6;font-size:11.5px;font-weight:800;padding:4px 10px;border-radius:99px;pointer-events:none;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,.08)}
#v-thai,#v-painel{padding-top:30px}
#backupSec{display:none}
""" + s[i:]
rep('<script src="config.js"></script>\n', '')
rep("const IS_SITE = location.protocol==='https:' && !window.claude;", "const IS_SITE = false;")
rep("renderTabs(); renderPhase(); renderDay(); renderCal(); renderHome(); route();\nconnect();\nsbInit();", """/* ---------- Modo demonstração: 4 meses de treinos inventados dos dois, nada é salvo ---------- */
{ const atual=DAYS; DAYS=DAYS_THAI; const a=makeMock(); DAYS=DAYS_JR; const b=makeMock(); DAYS=atual; state.sessions=Object.assign(a,b); }
state.config={phase:'normal',updatedAt:0};
saveLocal=function(){}; queueRemote=function(){};
(function(){ const b=document.createElement('div'); b.className='demo-flag'; b.textContent='Demonstração · nada fica salvo'; document.body.appendChild(b); })();
renderTabs(); renderPhase(); renderDay(); renderCal(); renderHome(); route();""")
(R / 'demo.html').write_text(s)

# Sobe a VERSAO do sw.js sozinho, pro iPhone pegar a versão nova
import re
sw = (R / 'sw.js').read_text()
m = re.search(r"2fit-v(\d+)", sw)
n = int(m.group(1)) + 1
(R / 'sw.js').write_text(sw.replace(m.group(0), f"2fit-v{n}", 1))
print(f'ok · index.html e demo.html gerados · sw.js em 2fit-v{n}')
