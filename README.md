# 2Fit

Treino a dois: fichas de treino com registro de carga por série, cronômetro de descanso, semana que zera sozinha e painel de evolução.

## Estrutura

- `index.html`: o app inteiro (HTML, CSS e JS num arquivo só)
- `manifest.webmanifest`: nome e ícones para "Adicionar à tela de início"
- `icon.svg`, `favicon.ico`, `favicon-*.png`, `apple-touch-icon.png`, `icon-*.png`: ícones
- `og-image.png`: imagem da prévia do link no WhatsApp

## Publicar no GitHub Pages

1. Settings > Pages > Source: `Deploy from a branch`, branch `main`, pasta `/ (root)`.
2. O site fica em `https://engrenix.github.io/2fit/`.

Se o repositório tiver outro nome, troque `https://engrenix.github.io/2fit/` nas tags `og:url` e `og:image` do `index.html`, senão a prévia do WhatsApp não carrega a imagem.

## Dados

Os treinos ficam salvos no navegador de cada aparelho (localStorage). Não sincroniza entre celulares.
