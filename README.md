# 2Fit

Treino a dois: fichas de treino com registro de carga por série, cronômetro de descanso, semana que zera sozinha e painel de evolução.

## Estrutura

- `index.html`: o app inteiro (HTML, CSS e JS num arquivo só)
- `manifest.webmanifest`: nome e ícones para "Adicionar à tela de início"
- `icon.svg`, `favicon.ico`, `favicon-*.png`, `apple-touch-icon.png`, `icon-*.png`: ícones
- `og-image.png`: imagem da prévia do link no WhatsApp
- `demo.html`: cópia do app com 4 meses de treinos inventados, pra testar sem mexer nos dados reais (nada é salvo)
- `brand/`: ícone (SVG mestre, versões quadrada e maskable), conceitos de logo descartados
- `design/`: propostas de tela inicial e paletas avaliadas
- `config.js`: endereço e chave pública do Supabase (sincronização)
- `supabase/setup.sql`: cria a tabela e as regras de segurança no Supabase
- `sw.js`: deixa o app funcionando sem internet (suba a `VERSAO` a cada mudança)

## Publicar no GitHub Pages

1. Settings > Pages > Source: `Deploy from a branch`, branch `main`, pasta `/ (root)`.
2. O site fica em `https://engrenix.github.io/2fit/`.

Se o repositório tiver outro nome, troque `https://engrenix.github.io/2fit/` nas tags `og:url` e `og:image` do `index.html`, senão a prévia do WhatsApp não carrega a imagem.

## Dados

Os treinos ficam salvos no navegador de cada aparelho (localStorage) e não sincronizam entre celulares. No painel, "Exportar treinos" gera um arquivo de backup, e "Importar backup" restaura ou passa os dados pra outro celular.

## Histórico e racional dos treinos

- `docs/HISTORICO.md`: versões de cada ficha
- `docs/fichas/`: por que cada exercício, técnica e faixa de repetição foi escolhido, e o que revisar na próxima versão
- `CLAUDE.md`: instruções para o Claude revisar as fichas

## Sincronização (Supabase)

Com a sincronização ligada, os treinos ficam na nuvem: backup automático e os mesmos dados nos dois celulares. Sem internet, as mudanças ficam numa fila e sobem quando a conexão volta.

1. Crie um projeto grátis em supabase.com.
2. Em **SQL Editor**, rode o arquivo `supabase/setup.sql` inteiro.
3. Em **Authentication > Sign In / Providers**, desligue "Allow new users to sign up".
4. Em **Authentication > Users > Add user**, crie as duas contas (e-mail e senha), com "Auto Confirm User" marcado.
5. Em **Project Settings > API**, copie a "Project URL" e a chave "anon public" para o `config.js`.
6. Abra o app: na primeira vez aparece a tela de login. Depois de entrar, o app abre direto, até sem internet.

A chave "anon" pode ficar pública: quem protege os dados é o login e as regras do `setup.sql`. Nunca coloque a chave "service_role" no repositório.
