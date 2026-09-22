/* ===========================================================================
   "Um toque" — versão curta da missão, no espírito das ativações de rua:
   escolher um alvo, tocar, o avião acerta e o prêmio aparece. Ninguém erra.

     RivaloTap.mount(el, { prize: '10 rodadas', onWin: fn, onEvent: fn })

   Reaproveita a arte e o cache de sprites do RivaloFly (game.js), que precisa
   ser carregado antes deste arquivo.
   =========================================================================== */
(function(global){
  'use strict';

  var CFG = {
    alvos:        3,          // quantos alvos na tela
    alvoY:       [0.30, 0.52, 0.74],   // altura de cada alvo (fração do ar)
    alvoX:        0.72,       // posição horizontal dos alvos (fração da largura)
    alvoR:        26,         // raio do alvo (px)
    planeX:       0.16,       // onde o avião espera (fração da largura)
    planeY:       0.62,
    planeArtW:    46,
    voarMs:       900,        // duração do voo até o alvo
    saidaMs:      420,        // tempo até sair de quadro depois do alvo
    revelarMs:    260,        // espera antes de revelar o prêmio
    ambienteVel:  16,         // rolagem lenta do cenário parado (px/s)
    groundH:      0.11,
    parallax:   { sky: 0.12, far: 0.30, mid: 0.55, ground: 1 }
  };

  var STRINGS = {
    pt: { titulo: 'Escolha um alvo', hint: 'Toque em um alvo para lançar',
          acertou: 'Acertou!', premio: 'Você ganhou', cta: 'Resgatar agora' },
    en: { titulo: 'Pick a target', hint: 'Tap a target to launch',
          acertou: 'Bullseye!', premio: 'You won', cta: 'Claim now' },
    es: { titulo: 'Elige un objetivo', hint: 'Toca un objetivo para lanzar',
          acertou: '¡Acertaste!', premio: 'Ganaste', cta: 'Reclamar ahora' }
  };

  function clamp(v, a, b){ return v < a ? a : (v > b ? b : v); }
  function el(tag, cls, html){
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function mount(root, opts){
    opts = opts || {};
    var onEvent = opts.onEvent || function(){};
    var lang = STRINGS[opts.lang] ? opts.lang : 'pt';
    var premio = opts.prize || '{{PROMO}}';

    function t(k){ return (STRINGS[lang] || STRINGS.pt)[k]; }

    /* ---------------------------------------------------------------- DOM */
    var wrap    = el('div', 'fly');
    var stage   = el('div', 'fly__stage');
    var canvas  = el('canvas', 'fly__canvas');
    var overlay = el('div', 'fly__overlay');
    var oTitle  = el('p', 'fly__overlayTitle');
    var oText   = el('p', 'fly__overlayText');
    var oHint   = el('span', 'fly__tapHint');

    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Mini-game: escolha um alvo');
    overlay.appendChild(oTitle); overlay.appendChild(oText); overlay.appendChild(oHint);
    stage.appendChild(canvas); stage.appendChild(overlay);
    wrap.appendChild(stage);
    root.appendChild(wrap);

    var ctx = canvas.getContext('2d');

    /* ------------------------------------------------------------- estado */
    var W = 0, H = 0, groundH = 0, art = {};
    var estado = 'idle';          // idle | voando | ganhou
    var alvoEscolhido = -1;
    var t0 = 0, raf = null, ambiente = 0, ultimo = 0;
    var planeP = 0;               // 0..1 no trajeto até o alvo, >1 saindo

    function airH(){ return H - groundH; }

    function alvoPos(i){
      return {
        x: CFG.alvoX * W,
        y: CFG.alvoY[i % CFG.alvoY.length] * airH()
      };
    }

    function resize(){
      var r = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.round(r.width); H = Math.round(r.height);
      groundH = Math.max(24, Math.round(H * CFG.groundH));
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      desenhar();
    }

    /* ------------------------------------------------------------ cenário */
    function camada(a, desloc, dy, dh, cortarBase){
      var img = a.img;
      var sh = img.naturalHeight * (1 - (cortarBase || 0));
      var w = Math.max(1, img.naturalWidth * (dh / sh));
      var x = -(((desloc % w) + w) % w);
      for (; x < W; x += w) ctx.drawImage(img, 0, 0, img.naturalWidth, sh, x, dy, w, dh);
    }

    function desenharCenario(){
      if (art.sky){
        camada(art.sky, ambiente * CFG.parallax.sky, 0, H);
        ctx.fillStyle = 'rgba(11,25,49,.18)';
        ctx.fillRect(0, 0, W, H);
      } else {
        var g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#0E1F3C'); g.addColorStop(1, '#16305C');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }

      if (art.wordmark){
        var lw = W * 0.44;
        var lh = art.wordmark.img.naturalHeight * (lw / art.wordmark.img.naturalWidth);
        ctx.save(); ctx.globalAlpha = 0.085;
        ctx.drawImage(art.wordmark.img, W * 0.06, airH() * 0.20 - lh / 2, lw, lh);
        ctx.restore();
      }

      if (art.far) camada(art.far, ambiente * CFG.parallax.far, airH() - H * 0.42, H * 0.42);
      if (art.mid) camada(art.mid, ambiente * CFG.parallax.mid, airH() - H * 0.26, H * 0.26, 0.18);

      if (art.ground) camada(art.ground, ambiente * CFG.parallax.ground, airH(), groundH);
      else { ctx.fillStyle = '#3E4A3A'; ctx.fillRect(0, airH(), W, groundH); }
    }

    /* -------------------------------------------------------------- alvos */
    function desenharAlvos(agora){
      for (var i = 0; i < CFG.alvos; i++){
        var p = alvoPos(i);
        var escolhido = i === alvoEscolhido;
        var pulso = estado === 'idle' ? 1 + Math.sin(agora / 320 + i) * 0.06 : 1;
        var r = CFG.alvoR * pulso;

        if (estado === 'voando' && !escolhido) ctx.globalAlpha = 0.35;

        ctx.strokeStyle = escolhido ? '#F68C18' : 'rgba(255,255,255,.75)';
        ctx.lineWidth = escolhido ? 4 : 3;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke();

        ctx.strokeStyle = escolhido ? '#F68C18' : 'rgba(246,140,24,.9)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.52, 0, Math.PI * 2); ctx.stroke();

        ctx.fillStyle = escolhido ? '#F68C18' : 'rgba(255,255,255,.9)';
        ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.fill();

        ctx.globalAlpha = 1;
      }
    }

    /* -------------------------------------------------------------- avião */
    function planePos(){
      var ini = { x: CFG.planeX * W, y: CFG.planeY * airH() };
      if (alvoEscolhido < 0) return { x: ini.x, y: ini.y, ang: 0 };

      var alvo = alvoPos(alvoEscolhido);
      var p = clamp(planeP, 0, 2);
      var fim = { x: W + 60, y: alvo.y - (alvo.y - ini.y) * 0.25 };

      var x, y;
      if (p <= 1){
        var e = 1 - Math.pow(1 - p, 2);              // desacelera ao chegar
        x = ini.x + (alvo.x - ini.x) * e;
        y = ini.y + (alvo.y - ini.y) * e;
      } else {
        var q = p - 1;
        x = alvo.x + (fim.x - alvo.x) * q;
        y = alvo.y + (fim.y - alvo.y) * q;
      }
      var ang = Math.atan2((alvo.y - ini.y), (alvo.x - ini.x)) * (p <= 1 ? 1 : 0.3);
      return { x: x, y: y, ang: clamp(ang, -0.5, 0.5) };
    }

    function desenharAviao(agora){
      var pos = planePos();
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(pos.ang);

      if (art.plane){
        var img = art.plane.img;
        var total = art.plane.spec.frames || 1;
        var fw = img.naturalWidth / total;
        var w = CFG.planeArtW;
        var h = img.naturalHeight * (w / fw);
        var f = total > 1 ? Math.floor(agora / 80) % total : 0;
        ctx.drawImage(img, f * fw, 0, fw, img.naturalHeight, -w / 2, -h / 2, w, h);
      } else {
        ctx.fillStyle = '#F68C18';
        ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-12, -7); ctx.lineTo(-12, 7);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }

    function desenharEstouro(agora){
      if (estado !== 'voando' || planeP < 1 || !art.boom) return;
      var p = alvoPos(alvoEscolhido);
      var img = art.boom.img, total = art.boom.spec.frames || 4;
      var i = clamp(Math.floor((planeP - 1) * total * 1.6), 0, total - 1);
      var fw = img.naturalWidth / total, tam = 96;
      ctx.drawImage(img, i * fw, 0, fw, img.naturalHeight, p.x - tam / 2, p.y - tam / 2, tam, tam);
    }

    function desenhar(agora){
      if (!ctx || !W) return;
      agora = agora || performance.now();
      ctx.clearRect(0, 0, W, H);
      desenharCenario();
      desenharAlvos(agora);
      desenharAviao(agora);
      desenharEstouro(agora);
    }

    /* --------------------------------------------------------------- loop */
    function loop(agora){
      var dt = Math.min(0.05, (agora - ultimo) / 1000);
      ultimo = agora;
      ambiente += CFG.ambienteVel * dt;

      if (estado === 'voando'){
        var decorrido = agora - t0;
        planeP = decorrido / CFG.voarMs;
        if (decorrido > CFG.voarMs + CFG.saidaMs){ ganhar(); return; }
        if (planeP > 1) planeP = 1 + (decorrido - CFG.voarMs) / CFG.saidaMs;
      }

      desenhar(agora);
      raf = requestAnimationFrame(loop);
    }

    /* ------------------------------------------------------------ estados */
    function mostrarOverlay(titulo, texto, hint, discreto){
      overlay.classList.toggle('fly__overlay--slim', !!discreto);
      if (titulo === null){ overlay.classList.add('is-hidden'); return; }
      oTitle.textContent = titulo;
      oText.textContent = texto || '';
      oHint.textContent = hint || '';
      oHint.style.display = hint ? '' : 'none';
      overlay.classList.remove('is-hidden');
    }

    function ganhar(){
      estado = 'ganhou';
      if (raf) cancelAnimationFrame(raf);
      raf = null;
      desenhar();
      mostrarOverlay(t('acertou'), t('premio') + ': ' + premio, t('cta'));
      onEvent('lp_tap_win', { alvo: alvoEscolhido + 1 });
      if (opts.onWin) opts.onWin(alvoEscolhido + 1);
    }

    function escolher(i){
      if (estado !== 'idle') return;
      alvoEscolhido = i;
      estado = 'voando';
      planeP = 0;
      t0 = performance.now();
      ultimo = t0;
      mostrarOverlay(null);
      onEvent('lp_tap_pick', { alvo: i + 1 });
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    }

    function reiniciar(){
      estado = 'idle';
      alvoEscolhido = -1;
      planeP = 0;
      ultimo = performance.now();
      mostrarOverlay(t('titulo'), '', t('hint'), true);   // discreto: os alvos precisam aparecer
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    }

    /* ----------------------------------------------------------- controles */
    stage.addEventListener('pointerdown', function(e){
      if (estado !== 'idle') return;
      e.preventDefault();
      var r = canvas.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;

      var melhor = -1, menor = 1e9;
      for (var i = 0; i < CFG.alvos; i++){
        var p = alvoPos(i);
        var d = Math.hypot(p.x - x, p.y - y);
        if (d < menor){ menor = d; melhor = i; }
      }
      // area de toque generosa: o alvo tem 26px de raio, aceita ate 46px
      if (melhor >= 0 && menor < CFG.alvoR + 20) escolher(melhor);
    });

    window.addEventListener('resize', function(){
      if (Math.round(canvas.getBoundingClientRect().width) === W) return;
      resize();
    });

    /* ------------------------------------------------------------ arranque */
    var api = {
      restart: reiniciar,
      setLang: function(l){
        if (!STRINGS[l]) return;
        lang = l;
        if (estado === 'idle') mostrarOverlay(t('titulo'), '', t('hint'), true);
        else if (estado === 'ganhou') mostrarOverlay(t('acertou'), t('premio') + ': ' + premio, t('cta'));
      },
      setPrize: function(p){ premio = p; },
      debug: {
        peek: function(){ return { estado: estado, alvo: alvoEscolhido, planeP: planeP, W: W, H: H, airH: airH() }; },
        alvoPos: alvoPos,
        escolher: escolher,
        avancar: function(ms){ if (estado === 'voando') { t0 -= ms; loopManual(ms); } },
        desenhar: desenhar
      }
    };

    function loopManual(ms){
      var agora = performance.now();
      var decorrido = agora - t0;
      planeP = decorrido / CFG.voarMs;
      if (planeP > 1) planeP = 1 + (decorrido - CFG.voarMs) / CFG.saidaMs;
      if (decorrido > CFG.voarMs + CFG.saidaMs) ganhar(); else desenhar(agora);
    }

    resize();
    reiniciar();

    if (global.RivaloFly && global.RivaloFly.assets){
      global.RivaloFly.assets(opts.assetBase || 'img/', opts.art !== false, function(a){
        art = a; desenhar();
      });
    }

    return api;
  }

  global.RivaloTap = { mount: mount, CFG: CFG, STRINGS: STRINGS };
})(window);
