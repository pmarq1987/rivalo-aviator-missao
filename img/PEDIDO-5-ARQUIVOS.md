Preciso de **5 assets PNG** para um mini-game 2D de rolagem lateral (avião voando para a direita,
passando por vãos entre obstáculos até um totem no fim). Já tenho o cenário pronto — céu, horizonte,
plano intermediário com hangares/palmeiras/sacos de areia e a faixa de solo — em **estilo arcade
ilustrado, pintado, com sombreado chapado e silhuetas grossas, tipo run-and-gun dos anos 90**.
Os 5 arquivos abaixo precisam casar com esse acabamento.

## Regras que valem para os 5

- Gere **os cinco na mesma sessão**, com o mesmo tratamento visual (se aceitar imagem de
  referência, vou anexar o cenário já aprovado).
- Nome do arquivo **exatamente** como indicado.
- **Fundo transparente de verdade** (alpha), não branco.
- O tamanho pode variar, mas **a proporção não** — o jogo escala pela altura, então proporção
  errada distorce o sprite.
- Até **120 KB** por arquivo depois de comprimir.
- **Sem texto, sem logo, sem personagem** em nenhum deles.
- Paleta: navy `#0B1931` `#12233F` `#152A4D`, laranja `#F68C18` `#EE8009`,
  cenário `#C98A3E` `#7A5A33` `#3E4A3A` `#5A6B7A`, vermelho do avião `#C0392B`.

Prefixo de estilo para todos os prompts:

```
2D side-scrolling arcade game asset, 90s run-and-gun genre look, hand-painted flat shading with
chunky readable silhouettes, warm military-industrial palette over deep navy sky, high contrast,
crisp clean edges, no text, no logos, no characters, no watermark, orthographic side view,
game-ready asset on transparent background, matching the look of a painted arcade hangar scene
```

---

### 1. `plane.png` — 576 × 120 (3 quadros de 192 × 120, em linha)

```
[prefixo de estilo] 3-frame horizontal sprite sheet of a small single-engine propeller plane in
side view flying to the RIGHT, each frame exactly 192x120 pixels, plane body identical in all
three frames with only the nose propeller changing: frame 1 propeller as a vertical blur, frame 2
as a thin diagonal, frame 3 as a wide translucent spinning disc, glossy red #C0392B fuselage with
cream trim, dark navy #0B1931 outline and cockpit glass, small orange #F68C18 exhaust flame at the
tail, cheerful arcade aviator look, plane level and horizontal with no tilt, 576x120 total
```

O avião precisa estar **nivelado** (sem inclinação) e de perfil para a **direita** — o jogo inclina
o sprite conforme sobe e desce. É desenho próprio de um monomotor vermelho; não copie sprite de
jogo existente.

### 2. `obstacle-top.png` — 300 × 520

```
[prefixo de estilo] vertical hanging hazard column, industrial gantry of riveted metal beams
wrapped in thick smoke, hanging from above, the BOTTOM END is the important part: a heavy rounded
cap with a diagonal warning stripe in orange #F68C18 marking the edge the player must avoid, the
TOP 18 pixels are a plain flat repeating cross-section of the beam so the column can be extended
upward, dark navy metal with warm rim light, 300x520 transparent PNG
```

Como o jogo usa: a **base** da imagem é encostada na abertura por onde o avião passa, e os 18 px do
topo são repetidos para esticar a coluna. Então a ponta de baixo é a que precisa de detalhe e a de
cima precisa ser uma seção lisa e uniforme.

### 3. `obstacle-bottom.png` — 300 × 520

```
[prefixo de estilo] vertical ground hazard tower rising from the ground, stacked sandbags and
riveted metal with smoke around its base, matching the hangars and crates of an arcade airfield
scene, the TOP END is the important part: a heavy rounded cap with a diagonal warning stripe in
orange #F68C18 marking the edge the player must avoid, the BOTTOM 18 pixels are a plain flat
repeating cross-section so the column can be extended downward, warm khaki #7A5A33 and dark navy,
300x520 transparent PNG
```

Mesma lógica invertida: ponta **de cima** detalhada, 18 px **de baixo** lisos e repetíveis.

### 4. `goal.png` — 260 × 640

```
[prefixo de estilo] tall victory gate totem standing on the ground at the end of an arcade level,
two riveted metal pylons holding a wide EMPTY rectangular signboard panel at the vertical center,
the panel is flat solid dark navy #12233F with a thin orange #F68C18 frame and absolutely nothing
inside it, warm spotlights at the base aiming up, light haze, celebratory but industrial, base
sits flat on the bottom edge, 260x640 transparent PNG
```

**O painel central tem que ficar vazio.** O jogo desenha um logo por cima dele, numa faixa de ~104
px de largura centrada na vertical. Qualquer letra, símbolo ou marca que apareça nesse painel
precisa ser apagada.

### 5. `boom.png` — 688 × 172 (4 quadros de 172 × 172, em linha)

```
[prefixo de estilo] 4-frame explosion sprite sheet in a single horizontal row, each frame exactly
172x172 pixels, frame 1 small bright orange #F68C18 flash, frame 2 full round fireball with dark
smoke puffs, frame 3 expanding smoke ring with sparks, frame 4 dissipating grey smoke, cartoon
arcade explosion, flat shading, same center point across all frames, transparent background,
688x172 total
```

Os 4 quadros rodam em 280 ms, então o centro da explosão precisa ser o **mesmo** nos quatro — se
variar, a explosão "pula" na tela.

---

Entregue os 5 como arquivos PNG separados, com esses nomes, num ZIP.
