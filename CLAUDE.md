# 2Fit · instruções para o Claude

App de treino do casal (Júnior e Thai). O app inteiro é um arquivo só (HTML, CSS e JS).

## Como trabalhar (leia primeiro)

0. **Antes de começar: `git pull`.** O projeto é editado de dois lugares (VS Code no Mac e conversas no claude.ai); sem puxar antes, uma mudança apaga a outra.
1. **Edite só `src/app.html`.** É a fonte de tudo. `index.html` (site) e `demo.html` (demonstração) são gerados por ela: nunca edite esses dois à mão, o build sobrescreve.
2. **Gere:** `python3 tools/build.py`. Ele monta o `index.html` (com o `<head>` do site e o `config.js`), o `demo.html` (dados inventados, nada salvo) e já sobe a `VERSAO` do `sw.js`.
3. **Teste:** `python3 tools/teste.py`. Abre as duas fichas no tamanho do iPhone 14, toca em todos os dias, marca uma série, recarrega e abre o painel. Avisa se algum dia passa de 6 exercícios e falha se houver erro de JS. Prints ficam em `.teste/` (fora do git). Instalar uma vez (o Python do Mac não deixa `pip3 install` direto, então vai num `.venv` do projeto, fora do git): `python3 -m venv .venv && .venv/bin/pip install playwright && .venv/bin/python -m playwright install webkit`. Depois o `teste.py` acha o `.venv` sozinho.
4. **Publique:** commit e `git push` na `main`. O GitHub Pages atualiza o site em 1 ou 2 minutos; no iPhone, fechar e abrir o app.
5. **Economize leitura:** o `src/app.html` é grande. Procure o trecho com `grep -n` e leia só as linhas em volta; não leia o arquivo inteiro.

**Artifact no claude.ai:** o app também existe como artifact (2Fit e 2Fit · demonstração) com o mesmo conteúdo do `src/app.html`. Ele só é atualizado de uma conversa no claude.ai, que tem a ferramenta de artifacts; pelo VS Code, não. Se mudar algo por aqui, o artifact fica pra trás até alguém pedir no claude.ai pra atualizar a partir do repositório. Os dois usam o site no iPhone, então o site é o que importa.

## Antes de mexer numa ficha de treino

1. Leia `docs/HISTORICO.md` pra saber qual é a versão atual de cada ficha.
2. Leia o arquivo da versão atual em `docs/fichas/` (ex.: `thai-v3.md`). Ele tem o contexto da pessoa, os princípios usados, o motivo de cada exercício, o volume planejado e o checklist da próxima revisão.
3. Use os dados reais do painel (frequência, séries por músculo, evolução de carga) pra justificar qualquer mudança. Se não tiver acesso aos dados, peça um print do painel no filtro de 60 dias.
4. Pesquise se saiu evidência nova sobre o assunto antes de manter ou trocar uma técnica.

## Ao criar uma nova versão da ficha

- Crie `docs/fichas/<pessoa>-v<N>.md` no mesmo formato da anterior, com uma seção "O que mudou desde a vN-1 e por quê".
- Exercício que sai da ficha vai pra `EX_ARCHIVE` (com o `day` antigo): assim o histórico dele continua contando nas séries do painel e aparece no gráfico de evolução, no grupo "Saíram da ficha".
- Mantenha os ids dos exercícios que continuam (`a1`, `c2`…), pra não quebrar o histórico de carga e o gráfico de evolução. Exercício novo ganha um id novo, nunca reaproveita um id antigo.
- Atualize a constante da ficha no `src/app.html` (`DAYS_THAI` ou `DAYS_JR`) e os grupos e metas do painel (`GROUPS_BY`), se mudarem. Os ids e as chaves de dia nunca se repetem entre as duas fichas (os do Júnior começam com `j`).
- Descanso (`rest`) pode passar de 140 s se o treino pedir. O aviso de fim de descanso chega no máximo aos 140 s (limite do plano grátis do Supabase), e isso está combinado: não encurte o descanso por causa do aviso.
- Teto de exercícios: 5 a 6 por dia, 7 só se for muito necessário. Treino com 8 ou 9 desanima e as últimas séries rendem pouco.
- Registre a mudança em `docs/HISTORICO.md`.

## Regras do app

- Teste sempre pensando em iPhone (os dois usam iOS): campos com fonte de 16px ou mais, teclado numérico com vírgula na carga e só números nas repetições.
- A carga é guardada com ponto e exibida com vírgula (`kgNorm` e `kgShow`).
- A semana vai de segunda a domingo e zera sozinha. O histórico nunca é apagado.
- Tela inicial: metade de cima rosa (Thai), metade de baixo verde-escuro (Júnior). A ficha da Thai é rosa; a do Júnior é em tons neutros (classe `jr` no body e no html).
- Ficha e painel são as mesmas telas pros dois: `setWho()` troca a ficha, as metas e os textos. Rotas: `#thai`/`#painel` e `#junior`/`#painel-jr`. O painel só mostra as sessões da ficha aberta.
- Disputa na home (cabo de guerra): os pontos são calculados das sessões, sem nada salvo à parte (`weekScore`): treino fechado 10, coringa 5, beach tennis marcado no dia 5 (`s.beach`, botão no cartão do dia de beach), dia trocado por cardio 3 (`s.cardio`, botão "Hoje só cardio" embaixo do Finalizar; conta como dia feito), recorde de carga 3, exercício que bateu o topo da faixa 2. A coroa vai pra quem venceu a semana anterior. O prêmio do mês fica em `state.config.premios['AAAA-MM']`.
- Tela de treino fechado (`openDone`): abre sozinha ao fechar o dia. Sugere a carga da próxima vez (sobe ou baixa 2,5 kg a partir de 20 kg, 1 kg abaixo disso). A duração usa a hora de cada série (`t`). O botão grande "Finalizar treino" no fim da lista de exercícios (`endAct`, dois toques) encerra o dia antes de marcar tudo: grava `s.fin` e abre a mesma tela; no placar, treino finalizado antes vale metade (5; coringa 2) e o fechado completo vale 10. Com a tela aberta, a ficha fica escondida (`html.dn-open`) pra não aparecer atrás da barra do iPhone.
- Aviso do fim do descanso: o cronômetro chama a função `descanso` do Supabase (`supabase/functions/descanso`), que espera o tempo e manda uma notificação (Web Push) pro celular, mesmo bloqueado. A tabela `twofit_push` (`supabase/push.sql`) guarda a hora do aviso: se o cronômetro for pulado ou trocado, o aviso antigo não sai. A chave pública (`vapid`) fica no `config.js`; a privada só nos segredos do Supabase (`VAPID_PRIVATE`), nunca no repositório. O plano grátis limita a espera a ~140 s. Só funciona no app instalado na tela de início (iOS 16.4+).
- Relógio do treino (`tickWorkout`, `#wclock`): selo fixo no alto da ficha, centralizado logo abaixo da ilha do iPhone, que conta desde a primeira série marcada no dia; some quando o dia fecha, finaliza, vira cardio ou fica 2 h sem série nova.
- Voltar de onde parou: cada série marcada e cada descanso salvam em `localStorage['2fit-foco']` o exercício e o fim do cronômetro (`saveFoco`). Se o iPhone fechar o app no descanso, ao abrir de novo (até 2 h) a ficha rola até esse exercício (ou o próximo, se ele já fechou) e o cronômetro continua de onde estava (`restoreFoco`).
- Exercício feito fecha sozinho: o cartão mantém a barra de cima (número, nome, chips e boneco) e esconde o resto, mostrando só o resumo das séries (`sumTxt`); tocar no resumo ou no título abre de novo (classe `open`).
- Anotações por exercício ficam em `state.config.notes[idDoExercicio]` (até 120 caracteres) e valem pra todas as semanas. Ao trocar um exercício na ficha, a anotação do id antigo deixa de aparecer.
- Sincronização: no site hospedado, com `config.js` preenchido, cada sessão e o config viram uma linha em `twofit_docs` no Supabase (REST direto, sem biblioteca). Vence o `updatedAt` maior, também no banco (trigger). Fila offline em `localStorage['2fit-pendentes']`. No artifact do claude.ai, a sincronização usa o `db` do próprio artifact. Pra revisar uma ficha, dá pra ler o histórico direto da tabela.
- Login: com a sincronização ligada, quem não está logado vê a tela de login cheia (`#v-login`). O login fica guardado no celular e só volta se a pessoa sair da conta ou se o Supabase disser que o login acabou (nunca por falta de internet).
- Backup: o botão do painel exporta um JSON `{app:'2fit', formato:1, exportadoEm, sessions, config}`. A importação junta os dados por `updatedAt` e nunca apaga nada. Pra revisar uma ficha, peça esse arquivo.
- Barra de status do iPhone: o Safari escolhe a cor quando a página carrega e não troca depois. Por isso, no site hospedado, ir pra uma tela de outra cor (`TOP_COLOR`) recarrega a página já nessa tela, vindo do cache do service worker (rápido e offline). Ficha e painel têm a mesma cor e trocam sem recarregar.
- Offline: `sw.js` guarda o app no celular e serve tudo primeiro do cache, atualizando em segundo plano. A `VERSAO` no `sw.js` precisa subir a cada mudança, senão o iPhone pode continuar mostrando a versão antiga: o `tools/build.py` já faz isso. Se mudar outro arquivo sem rodar o build (ícone, manifest), suba à mão.
- O repositório pode ser público: não coloque aqui detalhes pessoais além do necessário pro treino.
