# LP Aviator — variante "Missão" (protótipo)

Segunda versão da `/lp/aviator`: em vez de CTA direto, o usuário precisa **cumprir uma missão
rápida** para destravar o código da promo e só então ir para o cadastro.

Sem build. Arquivos:

| Arquivo | O que é |
|---|---|
| `game.js` + `game.css` | o mini-game, componente independente (monta o próprio DOM) |
| `game.html` | **sandbox**: só o jogo, com colisões visíveis e recarga de sprites |
| `tap.js` + `tap.html` | **versão de um toque**: escolher um alvo, tocar, acertar, prêmio |
| `index.html` | home do GitHub Pages — gerada por `build-pages.sh` a partir de `share.html` |
| `share.html` | página de divulgação (só o jogo, EN/PT/ES). Fonte do artifact e da home |
| `lp.html` | a variante da LP: porta de idade, promo travada, resgate e rodapé legal |
| `build-pages.sh` | embrulha `share.html` num HTML completo (head, charset, viewport) |
| `img/PROMPTS.md` | especificação e prompts da arte (8 arquivos) |
Os tokens de design, o CTA (`/pt/register?intent=aviator`), os links de suporte e o rodapé legal
foram copiados da LP em produção, então o visual já bate com o resto da página.

## Rodar local

```bash
python3 -m http.server 8941 --directory /Users/pedro.marques/rivalo-lp-aviator-missao
```

Depois abra `http://localhost:8941/index.html`.

## Fluxo

1. **Hero** com a promo visível mas **borrada** e selo "Travado".
2. **Porta de idade** (18+). Quem responde "não tenho" vê bloqueio e não joga.
3. **Mini-game**: pilotar o avião pelo aeródromo até o totem com o logo.
4. **Chegou no logo** → revela o código, mostra os 4 passos do resgate e o CTA de cadastro.
5. **Bateu no obstáculo** → overlay com o % do trajeto e "toque para tentar de novo". Tentativas
   ilimitadas, sem dead end e sem custo.

Progresso guardado em `localStorage` (`rivalo_lp_aviator_missao_v1`): quem já concluiu volta
direto para o estado liberado.

## Mini-game

`RivaloFly.mount(elemento, { art: false, onWin, onEvent })` — a LP passa `onWin` para liberar a
promo e `onEvent` para a telemetria. Canvas 2D, ~300 px de altura, um dedo só: **segure para subir, solte para descer** (barra de
espaço ou seta para cima no desktop). O avião tem posição fixa na horizontal e o cenário rola.
São 6 vãos entre torres e depois o totem com o logo — chegar nele é a vitória.

- **Trajeto fixo, sem sorteio.** Os vãos ficam sempre nas mesmas posições (`gapCenters`), então
  todo jogador enfrenta exatamente o mesmo percurso e o resultado depende só de quem pilota.
- **Rampa de dificuldade** (`gapScale`): o primeiro vão tem 195 px numa tela de 300 (bem largo) e
  o último 135. Ninguém morre na largada sem entender o controle.
- **Teto e chão não matam** — só seguram o avião; quem reinicia o trajeto é o obstáculo. A área
  jogável é o "ar" (altura do palco menos a faixa de solo), e todo o trajeto é calculado dentro
  dela, então os obstáculos de baixo nascem apoiados na linha do solo.
- **Tentativas ilimitadas**: bater reinicia na hora, com um toque, e o overlay mostra quanto do
  trajeto você fez ("Quase! 63% do trajeto").
- Trajeto perfeito: **8,3 s**. Vãos de 176 → 144 px em 267 px de ar (66% → 54%).

### Calibragem (testada, não estimada)

O trajeto é simulado com um **piloto proporcional com atraso de reação**: ele só enxerga o estado
de N ms atrás, mira no centro do próximo vão e corrige de forma suave — bem mais parecido com uma
pessoa do que o bang-bang que eu usava antes (aquele dava resultados não-monotônicos, falhando a
100 ms e vencendo a 180 ms, e me levou a calibrar errado uma vez).

| Atraso de reação | Resultado |
|---|---|
| 80–240 ms | vence, 100% em 8,3 s |
| 300 ms | cai a 63% |

Reação humana típica fica em 200–250 ms, então o jogo é vencível com folga e, quando falha, falha
**progredindo**. Para reproduzir: abra `game.html`, cole o piloto do console (está no histórico do
README antigo ou peça de novo) e varra os atrasos.

Velocidade e espaço andam juntos: subir `speed` sem abrir `gapH` quebra a calibragem, porque os
vãos passam a chegar mais rápido no tempo. A geometria também mexe: quando o chão era letal, a
área jogável caiu de 300 para 267 px e a rampa de vãos teve de ser refeita do zero. O chão voltou
a ser decorativo, mas a área jogável continua sendo o ar — os números da tabela acima foram
medidos nessa configuração.

### Arte (sprites)

Estilo: **arcade ilustrado** (`CFG.pixelArt = false`), com avião próprio inspirado no do Aviator —
sem depender de asset da Spribe.

**Os 9 slots estão preenchidos** e a arte roda por padrão (`art: true`; use `?art=0` para voltar ao
desenho vetorial de reserva). Peso total: ~650 KB, que é o preço de arte em 2x — os arquivos têm o
dobro do tamanho de tela justamente para ficarem nítidos em retina, então não devem ser reduzidos.

Dois ajustes foram calibrados vendo a arte em movimento, em vez de regerar arquivo:

| Chave | Valor | Por quê |
|---|---|---|
| `CFG.skyTint` | `rgba(11,25,49,.18)` | `.45` achatava as nuvens; `0` deixava o avião competindo com o fundo |
| `CFG.midCropBottom` | `0.18` | sem o recorte, a faixa de areia do `mid.png` criava um segundo chão acima do solo |

**Logo da marca:** `img/wordmark.svg` é o logo oficial da Rivalo em vetor, extraído do header da
LP em produção (5 KB, branco, escala sem perder nitidez). O brand kit no Drive tem o mesmo logo em
`rivalo-white-rgb.png`, mas raster de 33 KB — o vetor é melhor para canvas. A marca d'água do fundo (`CFG.logoBg`) usa
`img/wordmark-plain.svg`: o **mesmo logo sem a moldura**. O logo oficial traz uma moldura
arredondada em volta das letras, e a 8,5% de opacidade ela lê como um retângulo solto no céu — as
letras sozinhas lêem como marca. `img/wordmark.svg` segue no repositório com a moldura, para quem
precisar do logo completo.

No **totem do fim do trajeto** vai o logo do **Aviator** (`img/aviator-wordmark.svg`, slot
`goalLogo`) — é ele o destino da missão, e a marca da casa fica no cenário. A largura do logo é
fração da largura do totem (`CFG.goalLogoW`), não do palco: dimensionar pelo palco fazia o
wordmark extravasar a placa.

`everyPx` e `parallax` do `logoBg` andam juntos: a camada percorre `goalX * parallax` no trajeto
inteiro, então `everyPx` é o que define quantas vezes a marca cruza a tela — hoje ~2,7 vezes. Com
os valores iniciais que eu chutei (`everyPx: 720`, `parallax: 0.22`) a camada andava só 350 px e o
logo aparecia uma vez no começo e outra quase no fim.

Referência dos slots e prompts em `img/PROMPTS.md`:

| Chave | Corrige |
|---|---|
| `CFG.skyTint` | véu navy sobre o céu, para arte clara não lavar o avião e os obstáculos |
| `CFG.midCropBottom` | descarta a base do `mid.png`, que trazia uma faixa de areia duplicando o chão |

Cada
slot que não existe cai no desenho vetorial de reserva, então o jogo roda completo hoje e a arte
entra por partes. Enquanto os arquivos não existirem, esses slots ficam **desligados** (`art:
false`) para não gerar 404 em produção; quando entrarem, é uma linha:

```js
RivaloFly.mount($('flyRoot'), { art: true, ... })
```

Para avaliar a arte sem passar pela LP: abra `game.html`, solte os arquivos em `img/` e clique em
"Recarregar sprites". O botão "Mostrar colisões" desenha as caixas — a boca do vão tem que
coincidir com a borda da caixa, senão o jogador bate no que parece espaço vazio.

### Fallback e variante A/B

- Link **"Não consigo jogar agora — quero responder 3 perguntas"** troca para um quiz de 3
  perguntas. É o caminho de acessibilidade para quem não consegue jogar um jogo de reação
  (motor, tela pequena, prefers-reduced-motion) — sem isso a promo ficaria inacessível para
  parte do público. Dispara `lp_mission_fallback`.
- O quiz também roda como variante isolada em `?mech=quiz` (as respostas certas reforçam 18+,
  limite de depósito e RNG certificado). `?mech=fly` força o mini-game.

`?reset=1` limpa o progresso local. `?debug=1` expõe `window.__fly` com `peek/hold/step/draw/start`
para rodar o trajeto por script — foi assim que a calibragem acima foi medida. Nenhum dos dois faz
nada sem estar na URL; **não usar em mídia paga**.

## Publicado

- **GitHub Pages** (link público, abre sem login): home do repositório, gerada de `share.html`.
  Depois de mexer em `share.html`, rode `./build-pages.sh` e commite o `index.html` gerado.
- **Artifact do Claude** (privado, para comentar): <https://claude.ai/code/artifact/02dd1f65-94da-412e-bdf7-eed20ad36f6a>

A **variante da LP mora em `lp.html`, não na home**, de propósito: ela tem os placeholders de promo
e o rodapé legal da Rivalo, e como página inicial de um site público poderia passar por página
oficial. O `robots.txt` bloqueia indexação do site todo.

## Duas mecânicas, funis opostos

| | Missão (game.js) | Um toque (tap.js) |
|---|---|---|
| O que pede | perícia: pilotar por 6 vãos | uma decisão: escolher 1 de 3 alvos |
| Fracasso | existe, e é o motor do retry | não existe — ninguém erra |
| Duração | 8,3 s no percurso perfeito | ~1,5 s até o prêmio |
| Aposta | engajamento maior, desistência maior | atrito mínimo antes do cadastro |

A de um toque nasceu da referência da Esportes da Sorte (chute a gol em ativação de bar): lá o jogo
é um **reveal disfarçado de jogo** — "TOQUE PARA CHUTAR", "GOOOL!", "VOCÊ GANHOU", cadastro. Ela
reaproveita todos os sprites do jogo grande via `RivaloFly.assets()`, mesmo cache, sem download extra.

O que decide entre as duas não é gosto, é **cadastro por visita**. Rodar as duas com o mesmo prêmio
e a mesma origem de tráfego responde em poucos dias.

## Compartilhar com o time

`share.html` é a versão para mandar por link: o jogo sem a landing page em volta, com o que ele é
explicado em uma frase e seletor de idioma. Está publicada como artifact em
<https://claude.ai/code/artifact/02dd1f65-94da-412e-bdf7-eed20ad36f6a> — nasce privada; o botão de
compartilhar da própria página libera para o time. Quem for abrir precisa de acesso ao claude.ai da
Rivalo; para quem não tem, o caminho é publicar num Worker da Cloudflare (a conta já é usada no
projeto do bolão) e mandar a URL pública.

O jogo agora fala **pt / en / es** (`RivaloFly.mount(el, { lang: 'en' })` ou `instance.setLang('es')`).
Os textos ficam em `STRINGS`, no topo de `game.js`, escritos com escapes `\uXXXX` de propósito: assim o
arquivo é ASCII puro e o acento não depende do charset que o servidor anuncia — foi o que quebrou os
acentos na primeira tentativa de publicar.

## Layout

- **Mobile**: hero enxuto e, ao responder a porta de idade, a página **salta para o palco do
  jogo** — antes o canvas nascia abaixo da dobra e só 121 px dos 302 apareciam. Agora entram os
  302 px, o botão de toque e o aviso de compliance na mesma tela. O salto é instantâneo de
  propósito: não há animação para o jogador tocar em cima (`scroll-margin-top` evita que o
  cartão fique atrás do header fixo).
- **Desktop (≥900px)**: duas colunas em vez de uma tira de 480 px no meio do monitor — jogo à
  esquerda (canvas de ~530×344) e, à direita, a promo travada e o bloco "Você no controle".
- Barra de progresso do trajeto colada no topo do palco, em vez de solta acima dele.
- O cartão do jogo virou "Como jogar": no desktop o título antigo repetia o H1 do hero.

## O que editar

Tudo em um lugar: o objeto `CONFIG` no início do `<script>`.

```js
var CONFIG = {
  campaign:  'lp-aviator-missao',
  promoCode: 'AVIATOR',    // código revelado no fim
  ctaUrl:    'https://www.rivalo.bet.br/pt/register?intent=aviator',
  mechanic:  'fly',        // 'fly' (mini-game) | 'quiz' (fallback)
  quiz: { requiredHits: 3 },
  fly:  { gates: 6, gapH: 150, gapScale: [...], speed: 145,
          gravity: 620, thrust: -1100, /* ... */ }
};
```

Placeholders de copy a preencher no HTML (marketing + compliance):

`{{PROMO_NOME}}` · `{{PROMO_VALOR}}` · `{{DEPOSITO_MINIMO}}` · `{{ROLLOVER}}` · `{{PRAZO}}` ·
`{{JOGOS_ELEGIVEIS}}` · `{{LINK_TERMOS_PROMO}}`

## Eventos

Dispara nos dois canais que já rodam nas LPs (`dataLayer` do GTM e `posthog.capture`), sempre com
`campaign` e `mechanic` no payload — o funil sai segmentado por variante sem trabalho extra:

`lp_view` · `lp_age_gate` (`answer: 18plus|under18`) · `lp_mission_start` ·
`lp_mission_round` (`attempt` no jogo, `round`+`hit` no quiz) ·
`lp_mission_crash` (`attempt`, `progress` em %) · `lp_mission_fallback` ·
`lp_mission_complete` · `lp_mission_failed` · `lp_promo_code_copy` · `lp_cta_click`

`lp_mission_crash.progress` é o dado de calibragem: se muita gente empaca no mesmo ponto do
trajeto, aumente o `gapScale` daquele vão. Se quase ninguém bate, o jogo está fácil demais para
gerar a sensação de conquista.

Métricas que interessam: conclusão da missão, distribuição de tentativas até vencer, uso do
fallback e, principalmente, **cadastro por visita** contra a LP atual. A missão adiciona atrito de
propósito; só vale se o cadastro por visita subir, não só o tempo na página.

## Para portar no SvelteKit da LP

A LP de produção é um app Svelte com CSS scoped e tokens globais. Sugestão:

1. Nova rota `/lp/aviator-missao` (ou flag na rota atual) reusando `Hero`, `Cta`, `Ft` e `Band`.
2. Um componente `Mission.svelte` com o estado (`gate → game → done|failed`) e um
   `FlyGame.svelte` com o canvas — o módulo `Fly` já é isolado e só conversa com o resto por
   `unlock()`, então vira componente quase copiando e colando.
3. Apagar o bloco `:root` deste arquivo — os tokens já existem lá.
4. Trocar o SVG inline do aviãozinho da pista por `/lp/img/aviator-plane.svg`.

## Pontos para compliance antes de subir

0. **O mini-game não é uma simulação do Aviator** — é um arcade de pilotagem com trajeto fixo,
   sem multiplicador, sem valor em dinheiro na tela e sem "sacar antes de cair". Isso é
   deliberado: um mini-game que imitasse a mecânica do Aviator entraria em conflito com a
   própria mensagem da LP ("não existem sinais nem padrões") e sugeriria que habilidade
   influencia o resultado das rodadas reais. O aviso abaixo do jogo diz isso de forma explícita
   e não deve ser removido na revisão de copy.
1. **A LP atual não oferece promo nenhuma** — ela se posiciona em "jogo original + saque Pix".
   Incluir uma oferta muda o enquadramento publicitário da página: regras da SPA/MF sobre
   publicidade e sobre oferta de bônus precisam de validação antes do go-live. Não dá para
   assumir que a promo é permitida só porque o código já está pronto.
2. **A trava é cosmética.** O desbloqueio é client-side: o código promocional está no
   fonte e qualquer pessoa lê no devtools — inclusive sem jogar. Se a promo tem custo real, o controle tem que estar no
   motor de bônus (1 por CPF, validação no resgate) ou o código deve ser emitido por endpoint
   depois da missão. A missão é engajamento, não segurança.
3. **A porta de idade é autodeclarada** — UX, não controle. A verificação real continua sendo o
   KYC do cadastro.
4. **LGPD**: a página não coleta dado pessoal; o `localStorage` guarda só flags de progresso
   (`ageOk`, `completed`), sem PII. Mesmo assim entra na Política de Cookies.
5. Mantidos da LP original: 18+ no header, "Aposta não é investimento", identificação do operador
   (Olavir Ltda / Portaria SPA/MF nº 264), proibição de uso de benefício social, links de Jogo
   Responsável e a seção "Você no controle". Não remover nenhum deles ao editar a copy.
