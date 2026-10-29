# 2Fit · instruções para o Claude

App de treino do casal (Júnior e Thai). Tudo roda num arquivo só: `index.html` (HTML, CSS e JS). Também é publicado como artifact no claude.ai; os dois precisam ficar iguais.

## Antes de mexer numa ficha de treino

1. Leia `docs/HISTORICO.md` pra saber qual é a versão atual de cada ficha.
2. Leia o arquivo da versão atual em `docs/fichas/` (ex.: `thai-v1.md`). Ele tem o contexto da pessoa, os princípios usados, o motivo de cada exercício, o volume planejado e o checklist da próxima revisão.
3. Use os dados reais do painel (frequência, séries por músculo, evolução de carga) pra justificar qualquer mudança. Se não tiver acesso aos dados, peça um print do painel no filtro de 60 dias.
4. Pesquise se saiu evidência nova sobre o assunto antes de manter ou trocar uma técnica.

## Ao criar uma nova versão da ficha

- Crie `docs/fichas/<pessoa>-v<N>.md` no mesmo formato da anterior, com uma seção "O que mudou desde a vN-1 e por quê".
- Mantenha os ids dos exercícios que continuam (`a1`, `c2`…), pra não quebrar o histórico de carga e o gráfico de evolução. Exercício novo ganha um id novo, nunca reaproveita um id antigo.
- Atualize a constante `DAYS` no `index.html` e os grupos e metas (`GROUPS`) do painel, se mudarem.
- Registre a mudança em `docs/HISTORICO.md`.

## Regras do app

- Teste sempre pensando em iPhone (os dois usam iOS): campos com fonte de 16px ou mais, teclado numérico com vírgula na carga e só números nas repetições.
- A carga é guardada com ponto e exibida com vírgula (`kgNorm` e `kgShow`).
- A semana vai de segunda a domingo e zera sozinha. O histórico nunca é apagado.
- Tela inicial: metade de cima rosa (Thai), metade de baixo verde-escuro (Júnior). A ficha da Thai é rosa; a do Júnior será em tons neutros.
- Anotações por exercício ficam em `state.config.notes[idDoExercicio]` (até 120 caracteres) e valem pra todas as semanas. Ao trocar um exercício na ficha, a anotação do id antigo deixa de aparecer.
- Sincronização: no site hospedado, com `config.js` preenchido, cada sessão e o config viram uma linha em `twofit_docs` no Supabase (REST direto, sem biblioteca). Vence o `updatedAt` maior, também no banco (trigger). Fila offline em `localStorage['2fit-pendentes']`. No artifact do claude.ai, a sincronização usa o `db` do próprio artifact. Pra revisar uma ficha, dá pra ler o histórico direto da tabela.
- Backup: o botão do painel exporta um JSON `{app:'2fit', formato:1, exportadoEm, sessions, config}`. A importação junta os dados por `updatedAt` e nunca apaga nada. Pra revisar uma ficha, peça esse arquivo.
- Barra de status do iPhone: o Safari escolhe a cor quando a página carrega e não troca depois. Por isso, no site hospedado, ir pra uma tela de outra cor (`TOP_COLOR`) recarrega a página já nessa tela, vindo do cache do service worker (rápido e offline). Ficha e painel têm a mesma cor e trocam sem recarregar.
- Offline: `sw.js` guarda o app no celular e serve tudo primeiro do cache, atualizando em segundo plano. **Sempre que mudar algum arquivo do app, suba a `VERSAO` no `sw.js`**, senão o iPhone pode continuar mostrando a versão antiga.
- O repositório pode ser público: não coloque aqui detalhes pessoais além do necessário pro treino.
