/* ===========================================================================
   Mini-game "Voe até o logo da Rivalo".
   Componente independente: monta o próprio DOM dentro de um elemento raiz.

     var jogo = RivaloFly.mount(document.getElementById('flyRoot'), {
       onWin:   function(){ ... },      // chegou no logo
       onEvent: function(nome, dados){ ... }   // telemetria
     });

   Sprites são opcionais: cada slot que não carrega cai no desenho vetorial de
   reserva, então o jogo roda completo antes de a arte existir. Ver img/PROMPTS.md.
   =========================================================================== */
(function(global){
  'use strict';

  /* Textos do jogo. Escapes \uXXXX de propósito: assim o arquivo é ASCII puro e
     não depende do charset que o servidor anuncia para renderizar acento certo. */
  var STRINGS = {
    pt: {
      attempt: 'Tentativa', progress: 'Trajeto',
      idleTitle: 'Pronto para decolar?',
      idleText:  'Segure na tela para subir e solte para descer.',
      idleHint:  'Toque para come\u00e7ar',
      crashTitle: 'Quase! {pct}% do trajeto',
      crashText:  'Bateu no obst\u00e1culo. Tentativas s\u00e3o ilimitadas e n\u00e3o custam nada.',
      crashHint:  'Toque para tentar de novo',
      winTitle: 'Chegou no logo!', winText: 'Promo liberada.', winHint: 'Ver minha promo',
      resizeTitle: 'Trajeto reiniciado', resizeText: 'A tela mudou de largura.',
      pausedTitle: 'Pausado', pausedText: 'Voc\u00ea saiu da aba, ent\u00e3o o trajeto reinicia.'
    },
    en: {
      attempt: 'Attempt', progress: 'Course',
      idleTitle: 'Ready for takeoff?',
      idleText:  'Hold to climb, release to descend.',
      idleHint:  'Tap to start',
      crashTitle: 'So close \u2014 {pct}% of the course',
      crashText:  'You hit an obstacle. Attempts are unlimited and cost nothing.',
      crashHint:  'Tap to try again',
      winTitle: 'You reached the logo!', winText: 'Promo unlocked.', winHint: 'See my promo',
      resizeTitle: 'Course restarted', resizeText: 'The screen changed width.',
      pausedTitle: 'Paused', pausedText: 'You left the tab, so the course restarts.'
    },
    es: {
      attempt: 'Intento', progress: 'Trayecto',
      idleTitle: '\u00bfListo para despegar?',
      idleText:  'Mant\u00e9n pulsado para subir y suelta para bajar.',
      idleHint:  'Toca para empezar',
      crashTitle: '\u00a1Casi! {pct}% del trayecto',
      crashText:  'Chocaste con un obst\u00e1culo. Los intentos son ilimitados y no cuestan nada.',
      crashHint:  'Toca para intentarlo de nuevo',
      winTitle: '\u00a1Llegaste al logo!', winText: 'Promo desbloqueada.', winHint: 'Ver mi promo',
      resizeTitle: 'Trayecto reiniciado', resizeText: 'La pantalla cambi\u00f3 de ancho.',
      pausedTitle: 'En pausa', pausedText: 'Saliste de la pesta\u00f1a, as\u00ed que el trayecto se reinicia.'
    }
  };

  /* ------------------------------------------------------------------ config */
  var CFG = {
    gates:       6,       // vãos até o logo
    gapH:        160,     // altura base do vão (px), proporcional à altura do AR (não do palco)
    gapScale:   [1.10, 1.06, 1.02, 1.00, 0.95, 0.90],   // rampa: começa largo, fecha aos poucos
    gapCenters: [0.50, 0.40, 0.60, 0.44, 0.62, 0.48],   // trajeto fixo, igual para todos
    gateW:       44,      // largura da caixa de colisão do obstáculo
    gateArt:     1.7,     // largura do sprite = gateW * isto (arte maior que a colisão)
    spacing:     200,     // distância entre vãos (px de mundo)
    leadIn:      250,     // trecho livre antes do 1º vão
    runOut:      165,     // trecho entre o último vão e o logo
    speed:       190,     // velocidade do trajeto (px/s)
    gravity:     880,     // queda (px/s²)
    thrust:     -1520,    // subida enquanto segura (px/s²)
    vyMin:       -270,
    vyMax:        330,
    planeX:      0.24,    // posição horizontal fixa do avião (fração da largura)
    planeR:      14,      // raio de colisão
    planeArtW:   46,      // largura do sprite do avião (px) — próximo da colisão, para
                          // o jogador não sentir batida injusta
    planeArtAngle: 0,     // inclinação de repouso do sprite (0 = arte já vem nivelada)
    planeFrameMs: 80,     // troca de quadro da hélice
    planeArtDx:  -0.5,    // ancoragem do sprite (fração da largura) a partir do centro de colisão
    planeArtDy:  -0.5,
    groundH:     0.11,    // faixa de solo (fração da altura) — decorativa: o avião pousa nela
    pixelArt:    false,   // true = pixel art (sem suavização); false = arte ilustrada
    skyTint:     'rgba(11,25,49,.18)',  // véu sobre o céu ('' desliga). Calibrado com a arte real:
                          // .45 achatava as nuvens, 0 deixava o avião competindo com o fundo
    midCropBottom: 0.18,  // fatia da base do mid.png a descartar (a faixa de areia que duplicava
                          // o chão). 0 = usa a imagem inteira
    boomFrameMs: 70,      // duração de cada quadro da explosão
    parallax:  { sky: 0.12, far: 0.30, mid: 0.55, ground: 1 },
    /* logo da marca ao fundo: marca d'água que reaparece ao longo do trajeto.
       alpha baixo de propósito — fundo não pode competir com avião e obstáculo. */
    logoBg:    { alpha: 0.085, width: 0.44, everyPx: 430, parallax: 0.45, y: 0.33 }
                          /* everyPx e parallax andam juntos: a camada percorre
                             goalX * parallax no trajeto, então everyPx define quantas
                             vezes a marca cruza a tela (hoje ~2,7 vezes) */
  };

  /* ------------------------------------------------------------------ assets
     `local` é o arquivo que o time de arte entrega; `fallbackUrl` é o asset
     oficial já publicado (avião e wordmark da Spribe/Rivalo — nunca gerar por IA).
     Slot que não carrega vira desenho vetorial. */
  var MANIFEST = {
    plane:     { local: 'plane.png',    art: true, frames: 3 },
    wordmark:  { local: 'wordmark.svg', art: true },   // logo oficial da Rivalo (vetor)
    sky:       { local: 'sky.png',        tile: true, art: true },
    far:       { local: 'far.png',        tile: true, art: true },
    mid:       { local: 'mid.png',        tile: true, art: true },
    ground:    { local: 'ground.png',     tile: true, art: true },
    obsTop:    { local: 'obstacle-top.png',           art: true },
    obsBottom: { local: 'obstacle-bottom.png',        art: true },
    goal:      { local: 'goal.png',                   art: true },
    boom:      { local: 'boom.png', frames: 4,        art: true }
  };

  /* `withArt` liga os slots marcados com art:true. Enquanto a arte não existir,
     pedi-los só gera uma enxurrada de 404 em produção — por isso ficam desligados
     por padrão e o jogo usa o desenho vetorial de reserva. */
  function loadAssets(base, withArt, done){
    var out = {};
    var names = Object.keys(MANIFEST).filter(function(n){
      return withArt || !MANIFEST[n].art || MANIFEST[n].officialUrl;
    });
    var pending = names.length;
    if (!pending) return done(out);

    names.forEach(function(name){
      var spec = MANIFEST[name];
      var img = new Image();

      // Com a arte desligada, slots que têm asset oficial vão direto nele: nada de
      // pedir um arquivo local que não existe só para tomar 404.
      var tentarLocal = withArt || !spec.officialUrl;
      var usouOficial = !tentarLocal;

      img.onload = function(){
        out[name] = { img: img, spec: spec, from: usouOficial ? 'oficial' : 'local' };
        if (--pending === 0) done(out);
      };
      img.onerror = function(){
        if (!usouOficial && spec.officialUrl){
          usouOficial = true;
          img.src = spec.officialUrl;
          return;
        }
        if (--pending === 0) done(out);   // slot ausente → vetor de reserva
      };
      img.src = tentarLocal ? (base + spec.local) : spec.officialUrl;
    });
  }

  /* Cache de módulo: a LP pré-carrega no boot da página, então quando o jogador
     responde a porta de idade a arte já está em mãos. */
  var caches = {}, loadingKeys = {}, waiters = {};

  function getAssets(base, withArt, cb){
    var key = base + '|' + (withArt ? 1 : 0);
    if (caches[key]) return cb(caches[key]);
    (waiters[key] = waiters[key] || []).push(cb);
    if (loadingKeys[key]) return;
    loadingKeys[key] = true;
    loadAssets(base, withArt, function(a){
      caches[key] = a;
      loadingKeys[key] = false;
      var q = waiters[key] || []; waiters[key] = [];
      q.forEach(function(w){ w(a); });
    });
  }

  /* ------------------------------------------------------------------- utils */
  function clamp(v, a, b){ return v < a ? a : (v > b ? b : v); }

  function el(tag, cls, html){
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  /* ==================================================================== mount */
  function mount(root, opts){
    opts = opts || {};
    var onEvent = opts.onEvent || function(){};
    var assetBase = opts.assetBase || 'img/';
    var withArt = !!opts.art;          // true quando os sprites de img/ já existem
    var lang = STRINGS[opts.lang] ? opts.lang : 'pt';
    var overlayState = null;           // {chave, params} — guardado para trocar de idioma

    /* ---------------------------------------------------------------- DOM */
    var wrap    = el('div', 'fly');
    var hud     = el('div', 'fly__hud');
    var hudA    = el('span', null, '<span data-fly="attemptLabel"></span> <span class="fly__hudValue" data-fly="attempt">1</span>');
    var hudP    = el('span', null, '<span data-fly="progressLabel"></span> <span class="fly__hudValue" data-fly="pct">0%</span>');
    var stage   = el('div', 'fly__stage');
    var bar     = el('div', 'fly__bar');
    var barFill = el('div', 'fly__barFill');
    var canvas  = el('canvas', 'fly__canvas');
    var overlay = el('div', 'fly__overlay');
    var oTitle  = el('p', 'fly__overlayTitle');
    var oText   = el('p', 'fly__overlayText');
    var oHint   = el('span', 'fly__tapHint');

    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Mini-game: leve o avião até o logo da Rivalo');

    hud.appendChild(hudA); hud.appendChild(hudP);
    bar.appendChild(barFill);
    overlay.appendChild(oTitle); overlay.appendChild(oText); overlay.appendChild(oHint);
    stage.appendChild(bar); stage.appendChild(canvas); stage.appendChild(overlay);
    wrap.appendChild(hud); wrap.appendChild(stage);
    root.appendChild(wrap);

    var elAttempt = hud.querySelector('[data-fly="attempt"]');
    var elPct     = hud.querySelector('[data-fly="pct"]');
    var elAttLbl  = hud.querySelector('[data-fly="attemptLabel"]');
    var elProgLbl = hud.querySelector('[data-fly="progressLabel"]');

    function t(chave, params){
      var txt = (STRINGS[lang] || STRINGS.pt)[chave] || '';
      if (params) for (var k in params) txt = txt.replace('{' + k + '}', params[k]);
      return txt;
    }

    function renderTexts(){
      elAttLbl.textContent  = t('attempt');
      elProgLbl.textContent = t('progress');
      if (overlayState) applyOverlay();
    }
    var ctx = canvas.getContext('2d');

    /* -------------------------------------------------------------- estado */
    var W = 0, H = 0, groundH = 0;
    var state = 'idle';                 // idle | running | boom | crashed | won
    var scrollX = 0, py = 0, vy = 0, holding = false;
    var attempt = 0, raf = null, last = 0;
    var goalX = 0, gates = [];
    var boomAt = null, boomStart = 0;
    var art = {}, showHitboxes = false;

    /* -------------------------------------------------------------- trajeto */
    /* airH = altura do ar. O solo é letal, então o trajeto todo é calculado dentro
       do ar, não da altura total do palco. */
    function airH(){ return H - groundH; }

    function buildCourse(){
      var ah = airH();
      gates = [];
      for (var i = 0; i < CFG.gates; i++){
        var scale  = CFG.gapScale[i % CFG.gapScale.length];
        var half   = (CFG.gapH * (ah / 267) * scale) / 2;
        var margin = half + 12;
        var center = clamp(CFG.gapCenters[i % CFG.gapCenters.length] * ah, margin, ah - margin);
        gates.push({ x: CFG.leadIn + i * CFG.spacing, top: center - half, bottom: center + half });
      }
      goalX = CFG.leadIn + CFG.gates * CFG.spacing + CFG.runOut;
    }

    function resize(){
      var rect = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.round(rect.width);
      H = Math.round(rect.height);
      groundH = Math.max(24, Math.round(H * CFG.groundH));
      canvas.width  = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (CFG.pixelArt) ctx.imageSmoothingEnabled = false;
      buildCourse();
      draw();
    }

    function reset(){
      scrollX = 0; vy = 0; py = airH() * 0.45; holding = false; boomAt = null;
      updateHud();
      draw();
    }

    function updateHud(){
      elAttempt.textContent = String(Math.max(1, attempt));
      var pct = Math.round(clamp(scrollX / goalX, 0, 1) * 100);
      elPct.textContent = pct + '%';
      barFill.style.width = pct + '%';
    }

    function applyOverlay(){
      var e = overlayState;
      oTitle.textContent = t(e.chave + 'Title', e.params);
      oText.textContent  = t(e.chave + 'Text', e.params);
      oHint.textContent  = t(e.hint || (e.chave + 'Hint'), e.params);
      overlay.classList.remove('is-hidden');
    }

    function setOverlay(chave, params, hint){
      if (chave === null){ overlayState = null; overlay.classList.add('is-hidden'); return; }
      overlayState = { chave: chave, params: params, hint: hint };
      applyOverlay();
    }

    /* ======================================================= desenho: camadas */
    function px(v){ return CFG.pixelArt ? Math.round(v) : v; }

    function drawTiled(a, offset, dy, dh, cortarBase){
      var img = a.img;
      var sh = img.naturalHeight * (1 - (cortarBase || 0));   // recorte na origem
      var h = px(dh);
      var w = Math.max(1, px(img.naturalWidth * (h / sh)));
      var x = -(((px(offset) % w) + w) % w);
      for (; x < W; x += w){
        ctx.drawImage(img, 0, 0, img.naturalWidth, sh, x, px(dy), w, h);
      }
    }

    function drawSky(){
      if (art.sky){
        drawTiled(art.sky, scrollX * CFG.parallax.sky, 0, H);
        // véu: arte de céu clara demais lava o avião e os obstáculos
        if (CFG.skyTint){ ctx.fillStyle = CFG.skyTint; ctx.fillRect(0, 0, W, H); }
        return;
      }
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#0E1F3C');
      g.addColorStop(1, '#16305C');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // nuvens de cenário (reserva vetorial)
      var far = [[0.15, 0.22, 26], [0.55, 0.68, 20], [0.85, 0.35, 32], [1.25, 0.78, 22]];
      ctx.fillStyle = 'rgba(255,255,255,.035)';
      for (var i = 0; i < far.length; i++){
        var span = W + 200;
        var sx = ((far[i][0] * span - scrollX * 0.32) % span + span) % span - 100;
        var cy = far[i][1] * H, r = far[i][2];
        ctx.beginPath();
        ctx.arc(sx, cy, r, 0, Math.PI * 2);
        ctx.arc(sx + r * 0.9, cy + 4, r * 0.75, 0, Math.PI * 2);
        ctx.arc(sx - r * 0.9, cy + 6, r * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    /* logo da marca ao fundo, atrás do cenário */
    function drawLogoBg(){
      var a = art.wordmark, cfg = CFG.logoBg;
      if (!a || !cfg || !cfg.alpha) return;

      var w = px(W * cfg.width);
      var h = px(a.img.naturalHeight * (w / a.img.naturalWidth));
      var y = px(airH() * cfg.y - h / 2);
      var span = cfg.everyPx;
      var desl = scrollX * cfg.parallax;
      var primeiro = Math.floor((desl - w) / span);

      ctx.save();
      ctx.globalAlpha = cfg.alpha;
      for (var i = 0; i < 3; i++){
        var mundoX = (primeiro + i) * span;
        ctx.drawImage(a.img, px(mundoX - desl), y, w, h);
      }
      ctx.restore();
    }

    function drawScenery(){
      if (art.far) drawTiled(art.far, scrollX * CFG.parallax.far, airH() - H * 0.42, H * 0.42);
      if (art.mid) drawTiled(art.mid, scrollX * CFG.parallax.mid, airH() - H * 0.26, H * 0.26, CFG.midCropBottom);

      if (art.ground){
        drawTiled(art.ground, scrollX * CFG.parallax.ground, airH(), groundH);
      } else {
        // reserva vetorial: o solo precisa ser visível, porque mata
        ctx.fillStyle = '#3E4A3A';
        ctx.fillRect(0, airH(), W, groundH);
        ctx.fillStyle = 'rgba(201,138,62,.5)';
        ctx.fillRect(0, airH(), W, 2);
        var passo = 26, off = -((scrollX % passo) + passo) % passo;
        ctx.fillStyle = 'rgba(11,25,49,.35)';
        for (var x = off; x < W; x += passo) ctx.fillRect(x, airH() + 7, 12, 3);
      }

      if (showHitboxes){
        ctx.strokeStyle = 'rgba(255,61,113,.5)'; ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(0, airH()); ctx.lineTo(W, airH()); ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    /* ===================================================== desenho: obstáculos */
    function drawColumnArt(a, sx, w, edgeY, height, fromTop){
      var img = a.img;
      var h = img.naturalHeight * (w / img.naturalWidth);
      var y = fromTop ? edgeY - h : edgeY;

      // a arte é ancorada na borda do vão; o que faltar para cobrir a coluna é
      // preenchido repetindo a fatia da ponta oposta
      var falta = height - h;
      if (falta > 0){
        var sliceSrc = fromTop ? 0 : img.naturalHeight - 18;
        var step = 16;
        for (var f = 0; f < falta; f += step){
          var dy = fromTop ? (y - falta + f) : (y + h + f);
          ctx.drawImage(img, 0, sliceSrc, img.naturalWidth, 18, px(sx), px(dy), px(w), step + 1);
        }
      }
      ctx.drawImage(img, px(sx), px(y), px(w), px(h));
    }

    function drawCloudBank(x, w, top, height, fromTop){
      if (height <= 0) return;
      var cx = x + w / 2;
      var edge = fromTop ? top + height : top;

      ctx.fillStyle = 'rgba(255,255,255,.22)';
      ctx.beginPath();
      ctx.rect(x + 5, top, w - 10, height);
      for (var y = top - 10; y < top + height + 10; y += 24){
        ctx.moveTo(cx, y);
        ctx.arc(cx - 5, y, 15, 0, Math.PI * 2);
        ctx.arc(cx + 6, y + 11, 12, 0, Math.PI * 2);
      }
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,.38)';
      ctx.beginPath();
      ctx.arc(cx, edge + (fromTop ? -11 : 11), 16, 0, Math.PI * 2);
      ctx.arc(cx - 15, edge + (fromTop ? -16 : 16), 10, 0, Math.PI * 2);
      ctx.arc(cx + 15, edge + (fromTop ? -15 : 15), 11, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawGates(){
      var artW = CFG.gateW * CFG.gateArt;
      for (var i = 0; i < gates.length; i++){
        var g = gates[i];
        var cx = CFG.planeX * W + (g.x - scrollX);
        if (cx > W + 120 || cx < -120) continue;

        if (art.obsTop)    drawColumnArt(art.obsTop,    cx - artW / 2, artW, g.top, g.top, true);
        else               drawCloudBank(cx - CFG.gateW / 2, CFG.gateW, 0, g.top, true);

        var baixo = airH() - g.bottom;
        if (art.obsBottom) drawColumnArt(art.obsBottom, cx - artW / 2, artW, g.bottom, baixo, false);
        else               drawCloudBank(cx - CFG.gateW / 2, CFG.gateW, g.bottom, baixo, false);

        if (showHitboxes){
          ctx.strokeStyle = '#00E5FF'; ctx.lineWidth = 1;
          ctx.strokeRect(cx - CFG.gateW / 2, 0, CFG.gateW, g.top);
          ctx.strokeRect(cx - CFG.gateW / 2, g.bottom, CFG.gateW, baixo);
        }
      }
    }

    /* ========================================================= desenho: logo */
    function drawGoal(){
      var sx = CFG.planeX * W + (goalX - scrollX);
      if (sx > W + 160 || sx < -160) return;

      if (art.goal){
        var img = art.goal.img;
        var h = px(airH() * 0.98);
        var w = px(img.naturalWidth * (h / img.naturalHeight));
        ctx.drawImage(img, px(sx - w / 2), px(airH() - h), w, h);
      } else {
        var grad = ctx.createLinearGradient(sx - 44, 0, sx + 44, 0);
        grad.addColorStop(0,   'rgba(246,140,24,0)');
        grad.addColorStop(0.5, 'rgba(246,140,24,.30)');
        grad.addColorStop(1,   'rgba(246,140,24,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(sx - 44, 0, 88, airH());

        var w2 = 92, h2 = 34, x = sx - w2 / 2, y = airH() / 2 - h2 / 2, r = h2 / 2;
        ctx.fillStyle = '#F68C18';
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w2, y, x + w2, y + h2, r);
        ctx.arcTo(x + w2, y + h2, x, y + h2, r);
        ctx.arcTo(x, y + h2, x, y, r);
        ctx.arcTo(x, y, x + w2, y, r);
        ctx.closePath();
        ctx.fill();
      }

      // wordmark oficial por cima (nunca desenhado à mão / gerado por IA)
      if (art.wordmark){
        var wm = art.wordmark.img;
        var ww = Math.min(104, W * 0.32);
        var wh = wm.naturalHeight * (ww / wm.naturalWidth);
        ctx.drawImage(wm, px(sx - ww / 2), px(airH() * 0.5 - wh / 2), px(ww), px(wh));
      } else {
        // sem o arquivo do logo: texto, para o painel nunca ficar vazio
        ctx.fillStyle = art.goal ? '#F7F9FD' : '#0B1931';
        ctx.font = '800 15px ' + getComputedStyle(document.body).fontFamily;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('RIVALO.', sx, airH() / 2 + 1);
      }

      if (showHitboxes){
        ctx.strokeStyle = '#7CFF00'; ctx.lineWidth = 1;
        ctx.strokeRect(sx - 44, 0, 88, airH());
      }
    }

    /* ======================================================== desenho: avião */
    function drawPlane(){
      var planeCx = CFG.planeX * W;          // NÃO chamar de px: sombreia o helper px()
      var tilt = clamp(vy / 520, -0.45, 0.55);

      ctx.save();
      ctx.translate(planeCx, py);
      ctx.rotate(tilt + (art.plane ? CFG.planeArtAngle : 0));

      if (art.plane){
        var img = art.plane.img;
        var total = art.plane.spec.frames || 1;
        var fw = img.naturalWidth / total;
        var w = px(CFG.planeArtW);
        var h = px(img.naturalHeight * (w / fw));
        var frame = total > 1
          ? Math.floor(performance.now() / CFG.planeFrameMs) % total
          : 0;
        ctx.drawImage(img, frame * fw, 0, fw, img.naturalHeight,
                      px(w * CFG.planeArtDx), px(h * CFG.planeArtDy), w, h);
      } else {
        var trail = ctx.createLinearGradient(-18, 0, -52, 0);
        trail.addColorStop(0, 'rgba(246,140,24,.28)');
        trail.addColorStop(1, 'rgba(246,140,24,0)');
        ctx.fillStyle = trail;
        ctx.beginPath(); ctx.moveTo(-15, -4); ctx.lineTo(-52, 0); ctx.lineTo(-15, 4); ctx.closePath(); ctx.fill();

        ctx.fillStyle = '#C96A05';
        ctx.beginPath(); ctx.moveTo(-13, -2); ctx.lineTo(-19, -12); ctx.lineTo(-9, -2); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-13, 2); ctx.lineTo(-19, 9); ctx.lineTo(-9, 2); ctx.closePath(); ctx.fill();

        ctx.fillStyle = '#F68C18';
        ctx.beginPath();
        ctx.moveTo(19, 0);
        ctx.quadraticCurveTo(6, -7, -13, -5);
        ctx.quadraticCurveTo(-17, 0, -13, 5);
        ctx.quadraticCurveTo(6, 7, 19, 0);
        ctx.closePath(); ctx.fill();

        ctx.fillStyle = '#EE8009';
        ctx.beginPath(); ctx.moveTo(6, -1); ctx.lineTo(-6, -15); ctx.lineTo(-11, -13); ctx.lineTo(-1, -1); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(6, 1); ctx.lineTo(-6, 15); ctx.lineTo(-11, 13); ctx.lineTo(-1, 1); ctx.closePath(); ctx.fill();

        ctx.fillStyle = '#0B1931';
        ctx.beginPath(); ctx.ellipse(4, -2, 4, 2.6, -0.25, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();

      if (showHitboxes){
        ctx.strokeStyle = '#FF3D71'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(planeCx, py, CFG.planeR, 0, Math.PI * 2); ctx.stroke();
      }
    }

    /* ==================================================== desenho: explosão */
    function drawBoom(){
      if (!boomAt) return;
      var t = (performance.now() - boomStart) / CFG.boomFrameMs;

      if (art.boom){
        var img = art.boom.img;
        var total = art.boom.spec.frames || 4;
        var i = clamp(Math.floor(t), 0, total - 1);
        var fw = img.naturalWidth / total;
        var size = 86;
        ctx.drawImage(img, i * fw, 0, fw, img.naturalHeight,
                      px(boomAt.x - size / 2), px(boomAt.y - size / 2), size, size);
        return;
      }

      var p = clamp(t / 4, 0, 1);
      ctx.strokeStyle = 'rgba(246,140,24,' + (1 - p).toFixed(2) + ')';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(boomAt.x, boomAt.y, 10 + p * 34, 0, Math.PI * 2); ctx.stroke();
    }

    function draw(){
      if (!ctx || !W) return;
      ctx.clearRect(0, 0, W, H);
      drawSky();
      drawLogoBg();
      drawScenery();
      drawGates();
      drawGoal();
      if (state === 'boom') drawBoom(); else drawPlane();
    }

    /* ------------------------------------------------------------- física */
    function hits(){
      var r = CFG.planeR;
      for (var i = 0; i < gates.length; i++){
        var g = gates[i];
        if (Math.abs(g.x - scrollX) < CFG.gateW / 2 + r){
          if (py - r < g.top || py + r > g.bottom) return true;
        }
      }
      return false;
    }

    function step(dt){
      vy += (holding ? CFG.thrust : CFG.gravity) * dt;
      vy = clamp(vy, CFG.vyMin, CFG.vyMax);
      py += vy * dt;
      scrollX += CFG.speed * dt;

      // teto e solo apenas seguram o avião — quem reinicia o trajeto é o obstáculo
      if (py < CFG.planeR){ py = CFG.planeR; vy = 0; }
      if (py > airH() - CFG.planeR){ py = airH() - CFG.planeR; vy = 0; }

      if (scrollX >= goalX - 30){ win(); return; }
      if (hits()){ crash(); return; }
      updateHud();
    }

    function loop(now){
      if (state === 'boom'){
        draw();
        if (now - boomStart > CFG.boomFrameMs * 4){ finishCrash(); return; }
        raf = requestAnimationFrame(loop);
        return;
      }
      if (state !== 'running') return;
      var dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      step(dt);
      if (state === 'running'){ draw(); raf = requestAnimationFrame(loop); }
      else if (state === 'boom'){ raf = requestAnimationFrame(loop); }
    }

    function start(){
      attempt++;
      reset();
      state = 'running';
      setOverlay(null);
      last = performance.now();
      draw();
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
      onEvent('lp_mission_round', { attempt: attempt });
      if (opts.onStart) opts.onStart(attempt);
    }

    function crash(){
      boomAt = { x: CFG.planeX * W, y: py };
      boomStart = performance.now();
      state = 'boom';
    }

    function finishCrash(){
      state = 'crashed';
      if (raf) cancelAnimationFrame(raf);
      raf = null;
      boomAt = null;
      draw();
      var pct = Math.round(clamp(scrollX / goalX, 0, 1) * 100);
      setOverlay('crash', { pct: pct });
      onEvent('lp_mission_crash', { attempt: attempt, progress: pct });
      if (opts.onCrash) opts.onCrash(pct);
    }

    function win(){
      scrollX = goalX;
      state = 'won';
      if (raf) cancelAnimationFrame(raf);
      raf = null;
      updateHud();
      draw();
      setOverlay('win');
      if (opts.onWin) opts.onWin();
    }

    /* ------------------------------------------------------------ controles */
    function press(e){
      if (e && e.cancelable) e.preventDefault();
      holding = true;
      if (state === 'idle' || state === 'crashed') start();
    }
    function release(){ holding = false; }

    stage.addEventListener('pointerdown', press);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);

    document.addEventListener('keydown', function(e){
      if (e.code !== 'Space' && e.code !== 'ArrowUp') return;
      if (!root.offsetParent) return;              // jogo escondido: ignora
      e.preventDefault();
      press(null);
    });
    document.addEventListener('keyup', function(e){
      if (e.code === 'Space' || e.code === 'ArrowUp') release();
    });

    /* Só largura importa: a altura do canvas é fixa. Evita que a barra de URL
       do iOS colapsando no scroll reinicie o trajeto do jogador. */
    window.addEventListener('resize', function(){
      if (Math.round(canvas.getBoundingClientRect().width) === W) return;
      var eraJogo = state === 'running' || state === 'boom';
      if (eraJogo && raf){ cancelAnimationFrame(raf); raf = null; state = 'crashed'; }
      resize();
      if (eraJogo){
        reset();
        setOverlay('resize', null, 'idleHint');
      }
    });

    document.addEventListener('visibilitychange', function(){
      if (document.hidden && (state === 'running' || state === 'boom')){
        if (raf) cancelAnimationFrame(raf);
        raf = null;
        state = 'crashed';
        setOverlay('paused', null, 'crashHint');
      }
    });

    /* ------------------------------------------------------------- arranque */
    function boot(){
      attempt = 0;
      state = 'idle';
      renderTexts();
      resize();
      reset();
      setOverlay('idle');
    }

    var api = {
      restart: boot,
      setLang: function(l){
        if (!STRINGS[l]) return;
        lang = l;
        renderTexts();
      },
      assets: function(){
        var r = {};
        Object.keys(MANIFEST).forEach(function(k){
          if (art[k]) r[k] = art[k].from;
          else if (MANIFEST[k].art && !withArt && !MANIFEST[k].officialUrl) r[k] = 'desligado';
          else r[k] = 'vetor (reserva)';
        });
        return r;
      },
      hitboxes: function(v){ showHitboxes = !!v; draw(); },
      reloadArt: function(){
        withArt = true;
        caches[assetBase + '|1'] = null;
        loadAssets(assetBase, true, function(a){
          caches[assetBase + '|1'] = a; art = a; draw();
        });
      },
      debug: {
        peek: function(){
          return { state: state, scrollX: scrollX, py: py, vy: vy, W: W, H: H,
                   goalX: goalX, attempt: attempt, airH: airH(),
                   gates: gates.map(function(g){ return { x: g.x, top: g.top, bottom: g.bottom }; }) };
        },
        hold: function(v){ holding = !!v; },
        start: start,
        step: function(dt){ if (state === 'running') step(dt); },
        draw: draw
      }
    };

    boot();                                     // desenha já, com a reserva vetorial
    getAssets(assetBase, withArt, function(a){ art = a; draw(); });
    return api;
  }

  global.RivaloFly = {
    mount: mount,
    preload: function(base, withArt){ getAssets(base || 'img/', !!withArt, function(){}); },
    CFG: CFG,
    MANIFEST: MANIFEST
  };
})(window);
