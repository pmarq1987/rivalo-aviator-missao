# Arte do mini-game — estilo ilustrado

Caminho fechado: **arcade ilustrado** (não pixel art). Dos 4 arquivos que você já gerou, os 4
entram — dois deles com ajuste feito no código, sem reeditar nada.

## O que já está resolvido

| Arquivo | Situação |
|---|---|
| `far.png` | entra direto |
| `sky.png` | entra: o código aplica um véu navy por cima (`CFG.skyTint`) e mata a névoa branca que lavava a tela |
| `mid.png` | entra: o código descarta os 18% de baixo (`CFG.midCropBottom`), que era a faixa de areia duplicando o chão |
| `ground.png` | entra: **o chão não mata mais**, então a pista de pouso segura é a leitura correta |

Se depois de ver em movimento o céu ainda estiver claro ou o recorte do `mid` estiver cortando de
menos/mais, os dois são um número em `CFG` — não precisa voltar para o gerador.

## Faltam 5 arquivos

| Arquivo | Export sugerido | Alpha | Observação |
|---|---|---|---|
| `plane.png` | 576 × 120 | sim | 3 quadros de 192 × 120 (hélice), em linha |
| `obstacle-top.png` | 300 × 520 | sim | ponta de baixo = boca do vão |
| `obstacle-bottom.png` | 300 × 520 | sim | ponta de cima = boca do vão |
| `goal.png` | 260 × 640 | sim | painel central **vazio** |
| `boom.png` | 688 × 172 | sim | 4 quadros de 172 × 172, em linha |

Em arte ilustrada o **tamanho exato não é crítico** (o código escala pela altura), mas a
**proporção é**: um obstáculo entregue em 300 × 300 vira uma coluna atarracada. Peso: até 120 KB
por arquivo depois de passar num compressor (pngquant, TinyPNG, Squoosh).

**Casar o estilo é o risco real aqui.** Os hangares do seu `mid.png` têm um acabamento
específico; se os 5 saírem de outra leva com outro tratamento, vira colagem. Gere os cinco na
mesma sessão e, se o seu gerador aceitar imagem de referência, passe o `mid.png` junto.

## Prefixo de estilo (cole no começo de todo prompt)

```
2D side-scrolling arcade game asset, 90s run-and-gun genre look, hand-painted flat shading with
chunky readable silhouettes, warm military-industrial palette over deep navy sky, high contrast,
crisp clean edges, no text, no logos, no characters, no watermark, orthographic side view,
game-ready asset on transparent background, matching the look of a painted arcade hangar scene
```

Paleta: `#0B1931` `#12233F` `#152A4D` (navy da marca), `#F68C18` `#EE8009` (laranja Rivalo),
`#C98A3E` `#7A5A33` `#3E4A3A` `#5A6B7A` (cenário), `#C0392B` (vermelho do avião).

---

### 1. `plane.png` — o avião (3 quadros)

```
[prefixo de estilo] 3-frame horizontal sprite sheet of a small single-engine propeller plane in
side view flying to the RIGHT, each frame exactly 192x120 pixels, plane body identical in all
three frames with only the nose propeller changing: frame 1 propeller as a vertical blur, frame 2
as a thin diagonal, frame 3 as a wide translucent spinning disc, glossy red #C0392B fuselage with
cream trim, dark navy #0B1931 outline and cockpit glass, small orange #F68C18 exhaust flame at the
tail, cheerful arcade aviator look, plane level and horizontal with no tilt, 576x120 total
```

Perfil voltado para a **direita** e nivelado — o código inclina conforme sobe e desce. É desenho
próprio inspirado no aviãozinho do Aviator, não cópia do sprite da Spribe.

### 2. `obstacle-top.png` — obstáculo que desce do topo

```
[prefixo de estilo] vertical hanging hazard column, industrial gantry of riveted metal beams
wrapped in thick smoke, hanging from above, the BOTTOM END is the important part: a heavy rounded
cap with a diagonal warning stripe in orange #F68C18 marking the edge the player must avoid, the
TOP 18 pixels are a plain flat repeating cross-section of the beam so the column can be extended
upward, dark navy metal with warm rim light, 300x520 transparent PNG
```

Ancoragem: o código encosta a **base** da imagem na boca do vão e repete os 18 px do topo se a
coluna precisar ser mais alta. Ponta de baixo bonita, ponta de cima lisa.

### 3. `obstacle-bottom.png` — obstáculo que sobe do solo

```
[prefixo de estilo] vertical ground hazard tower rising from the ground, stacked sandbags and
riveted metal with smoke around its base, matching the hangars and crates of an arcade airfield
scene, the TOP END is the important part: a heavy rounded cap with a diagonal warning stripe in
orange #F68C18 marking the edge the player must avoid, the BOTTOM 18 pixels are a plain flat
repeating cross-section so the column can be extended downward, warm khaki #7A5A33 and dark navy,
300x520 transparent PNG
```

### 4. `goal.png` — totem do logo (sem o logo)

```
[prefixo de estilo] tall victory gate totem standing on the ground at the end of an arcade level,
two riveted metal pylons holding a wide EMPTY rectangular signboard panel at the vertical center,
the panel is flat solid dark navy #12233F with a thin orange #F68C18 frame and absolutely nothing
inside it, warm spotlights at the base aiming up, light haze, celebratory but industrial, base
sits flat on the bottom edge, 260x640 transparent PNG
```

**O painel tem que ficar vazio** — o código desenha o logo oficial da Rivalo em cima, numa faixa
de ~104 px de largura centrada na vertical. Letra que o gerador colocar ali vira logo falso.

### 5. `boom.png` — explosão (4 quadros)

```
[prefixo de estilo] 4-frame explosion sprite sheet in a single horizontal row, each frame exactly
172x172 pixels, frame 1 small bright orange #F68C18 flash, frame 2 full round fireball with dark
smoke puffs, frame 3 expanding smoke ring with sparks, frame 4 dissipating grey smoke, cartoon
arcade explosion, flat shading, same center point across all frames, transparent background,
688x172 total
```

4 quadros a 70 ms (280 ms no total), só ao bater no obstáculo.

---

## Checklist de entrega

- [ ] Nome exatamente como na tabela (o manifesto em `game.js` procura por ele)
- [ ] Proporção conforme a tabela (tamanho pode variar, proporção não)
- [ ] Fundo transparente de verdade (não branco)
- [ ] Comprimido: até 120 KB por arquivo
- [ ] `plane.png` com corpo idêntico nos 3 quadros, perfil para a direita, nivelado
- [ ] `obstacle-*.png` com a boca do vão detalhada e a ponta oposta lisa
- [ ] `goal.png` com o painel central vazio
- [ ] Os 5 gerados na mesma sessão, casando com o acabamento do `mid.png`
- [ ] `python3 validar-arte.py` sem PROBLEMAS
- [ ] Conferido no sandbox com "Mostrar colisões": a boca do vão coincidindo com a borda da caixa

## Ajustes finos no código (`CFG` em game.js)

| Chave | Para que serve |
|---|---|
| `skyTint` | véu sobre o céu; `''` desliga, mais opaco escurece mais |
| `midCropBottom` | fração da base do `mid.png` descartada (0.18 hoje) |
| `pixelArt` | `false` = ilustrado (suavização ligada). `true` se um dia virar pixel |
| `gateArt` | largura do sprite do obstáculo em relação à colisão (1.7 = 70% mais largo) |
| `planeArtW`, `planeArtAngle`, `planeFrameMs` | tamanho, inclinação de repouso e hélice |
| `groundH` | altura da faixa de solo (decorativa) |
| `parallax` | velocidade de cada camada (`sky`, `far`, `mid`, `ground`) |
