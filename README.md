# Mapa Digital | Master Shopping Atacadista

Mapa interativo do shopping, acessado por **QR Code** pelos clientes que entram no shopping e querem encontrar uma loja ou ver as lojas de uma categoria (jeans, infantil, fitness etc.).

- **Endereço:** mapa.masterbrusque.com.br **link provisório:** https://mottagustavo.github.io/Master-MapaDigital
- **Recursos:** zoom, arrastar, tela cheia, filtro por categoria e download do mapa em PNG.

## Como funciona o filtro

O mapa é um SVG, e cada loja é uma forma pintada com a cor da sua categoria. O filtro usa isso.

1. **Cores por categoria:** no `script.js`, a lista `CATEGORIAS` liga cada categoria (Jeans, Infantil, Feminina...) à cor de preenchimento que as lojas dela têm no SVG.
2. **Leitura do mapa:** quando o SVG carrega, o script guarda todas as lojas (formas coloridas) e encontra os textos da legenda, que viram áreas clicáveis.
3. **Ao escolher uma categoria:** o script coloca um **véu branco semitransparente** sobre o mapa inteiro, com uma **máscara** que "fura" o véu apenas nas lojas da categoria escolhida e na legenda. O resultado é o mapa apagado, com só aquelas lojas em destaque.
4. **Sobreposições:** se uma forma de outra cor estiver por cima de uma loja escolhida (ex.: o Hotel sobre um polígono vermelho), ela volta a ser coberta pelo véu, para não destacar o que não é da categoria.
5. **Como escolher:** pelos botões acima do mapa ou tocando na legenda dentro do mapa. Tocar de novo na mesma categoria, ou em **Todas**, remove o véu.

> Se o SVG novo mudar as cores das lojas, é preciso atualizar as cores em `CATEGORIAS`, senão o filtro não encontra as lojas. Hoje **Fitness** e **Pijamas e Lingerie** usam a mesma cor no arquivo, então são uma categoria só.

## Passo a passo: atualizar o mapa

Exemplo: novo arquivo `mapa-master-25-11.svg`.

1. Em `IMG/`, **apagar** o SVG antigo e **colocar** o novo.
2. `script.js` (linha 14 aproximadamente):
   ```javascript
   const SVG_URL = 'IMG/mapa-master-23-10.svg';
   ```
3. `index.html`, trocar o nome em **dois lugares**:
   ```html
   <link rel="preload" href="IMG/mapa-master-23-10.svg" as="fetch" type="image/svg+xml" crossorigin>
   ```
   ```html
   <img src="IMG/mapa-master-23-10.svg" alt="Mapa do Master Shopping" class="map-fallback" draggable="false">
   ```
4. Aumentar a versão em `style.css?v=4` e `script.js?v=4` (para `v=5`...), para o cache dos celulares atualizar.
5. Testar por `http://localhost` (`python -m http.server` ou Live Server). Abrir o `index.html` direto do disco não funciona.
6. Enviar:
   ```
   git add .
   git commit -m "Atualiza mapa"
   git push
   ```
7. Esperar o deploy e recarregar com **Ctrl + F5**.

## Aviso "Filtro indisponível: o mapa vetorial não carregou"

O SVG não foi encontrado. Confira o nome do arquivo nos 3 lugares do passo 2 e 3, se o SVG subiu para o servidor e se as maiúsculas/minúsculas batem (`IMG` ≠ `img`). Em F12 → Network, um erro 404 mostra qual caminho ele tentou buscar.