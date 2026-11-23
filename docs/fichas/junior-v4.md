# Ficha do Júnior · versão 4 (dinâmica)

- **Criada em:** 18/11/2026 (branch `ficha-dinamica`, em teste)
- **Revisar em:** depois de 1 a 2 semanas de uso, com o feedback do Júnior
- **Base:** contexto, pontos fracos e regras do ombro esquerdo da [v1](junior-v1.md) continuam valendo.

## O que mudou desde a v3 e por quê

O cross muda todo dia e a ficha fixa batia de frente com ele (ex.: push press no almoço e ombro na academia à noite). A ficha deixa de ter dias fixos: depois do box, o Júnior cola o texto do quadro (Texto ao Vivo do iPhone) e o app monta o treino da noite em cima do que o cross cobrou.

Teste feito antes de implementar: quarta, 18/11 (push press 5×8 até 60 kg; WOD com 30 hang power clean e 30 jerk a 50 kg, 150 single under e 1,2 km de corrida). O plano à mão foi aprovado pelo Júnior; o app chega no mesmo plano (puxada, crucifixo inverso, elevação lateral reduzida, rosca, panturrilha reduzida, sem peito e tríceps).

## Como o app decide

1. **Lê o texto** (`parseCross`): blocos de força e WOD, movimentos, repetições, séries (5x), esquemas (21-15-9), rounds, distância e calorias. Palavra que não reconhece aparece pra ele ensinar uma vez (`state.config.crossAlias`).
2. **Cansaço por músculo** (`crossFatigue`): cada movimento soma de 0 a 3 por músculo, vezes o volume e a intensidade do bloco (leve 0,5, médio 0,8, pesado 1; força começa em pesado e WOD em médio). Soma saturada até 1. Soma também 40% do cross de ontem e o músculo treinado ontem na academia (`residualF`).
3. **Cores:** vermelho (≥ 0,7) poupa, amarelo (≥ 0,35) reduz as séries pra 60%, verde faz a dose cheia.
4. **Escolha** (`buildPlan`): prioridade pros pontos fracos e pro grupo mais atrasado na meta da semana (academia + cross estimado). Composto com músculo auxiliar cansado sai; isolado de ponto fraco no vermelho fica com 2 séries leves. Teto: 6 itens na tela contando o aquecimento do manguito, ~21 séries.
5. **Sem cross** ("Hoje sem cross") ou sábado: tudo livre, decide pela semana.

## Cardápio fixo (vaga: principal | reserva)

| Vaga | Grupo | Principal | Reserva | Base |
|---|---|---|---|---|
| lat ⭐ | Ombro lateral | jb3 Elevação lateral no cabo | jc4 Elevação lateral na máquina | 4 |
| pux ⭐ | Costas | ja1 Puxada alta pegada neutra | jc1 Puxada unilateral | 4 |
| pull ⭐ | Costas | ja3 Pullover no cabo | – | 3 |
| rem | Costas | ja2 Remada baixa | jc2 Remada com peito apoiado | 3 |
| sup ⭐ | Peito | jb1 Supino inclinado com halteres | jd1 Supino inclinado na máquina | 3 |
| cxo ⭐ | Peito | jb2 Crossover de baixo pra cima | jd2 Voador | 3 |
| post ⭐ | Ombro posterior | ja4 Crucifixo inverso | jc3 Face pull | 3 |
| pant ⭐ | Panturrilha | jb5 Panturrilha em pé | jd6 Panturrilha sentado | 4 |
| tri | Tríceps | jb4 Tríceps acima da cabeça | je6 Tríceps na corda | 3 |
| bic | Bíceps | ja6 Rosca inclinada | jc5 Rosca no cabo com braço atrás | 3 |
| flex | Posterior | jc6 Mesa flexora | – | 3 |
| abd | – | je5 Abdominal na polia | – | 3 |

Os ids são os mesmos da ficha antiga, então a meta de cada série continua. Ids antigos que eram o mesmo exercício contam juntos no histórico (`EX_ALIAS`: jd3→jb3, jd4→je6, je4→ja6, je3→jb5, jd0→jb0).

## O que olhar no feedback

- A dose bateu com o cansaço real? Algum músculo chegou mais cansado do que o app previu?
- Os pesos dos movimentos (`CROSS_MOVES`) precisam de ajuste? Anotar o movimento e o que sentiu.
- Ler o texto do quadro deu trabalho? Quais palavras ele teve que ensinar?

## Painel (23/11/2026)

As séries por músculo do painel e a leitura do consultor ("músculo abaixo da meta") somam o cross: cada músculo ganha até 4 séries por dia de cross, conforme o quanto ele cansou (a mesma conta do "Sua semana"). No gráfico, a parte listrada da barra é o cross.
