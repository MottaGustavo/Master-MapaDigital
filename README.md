# master-mapa

Mapa interativo do Master Shopping Atacadista (zoom, arrastar, tela cheia e download em PNG).

- `IMG/mapaMaster14.09.svg` – mapa (fonte única: o PNG do botão de download é gerado a partir dele)
- `fonts/` – fontes Century Gothic/Arial recuperadas de dentro do SVG, para o texto ficar igual ao arquivo original
- Para testar localmente use um servidor (ex.: `python3 -m http.server`); abrir o `index.html` direto do disco mostra só a imagem simples.
- Ao trocar o SVG, se a área desenhada mudar, ajuste a constante `BASE` no início do `script.js`.
- **Filtro por categoria:** os botões acima do mapa (e as linhas da legenda dentro do mapa) destacam só as lojas daquela categoria.
  As categorias e cores ficam em `CATEGORIAS`, no início do `script.js`. Fitness e Pijamas e Lingerie usam a mesma cor no SVG, então hoje destacam as mesmas lojas.
- **Se o SVG não carregar** (ex.: pasta `fonts/` ou arquivo faltando, ou abrindo direto do disco), o mapa usa a imagem simples e o zoom continua funcionando.

link provisório: https://mottagustavo.github.io/Master-MapaDigital