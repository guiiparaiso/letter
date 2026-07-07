(function(){
  // Evita que o navegador "lembre" a rolagem de uma visita anterior
  // e restaure o meio do site ao atualizar a página.
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  window.scrollTo(0, 0);
  window.addEventListener('load', function(){ window.scrollTo(0, 0); });
  window.addEventListener('pageshow', function(){ window.scrollTo(0, 0); });

  var envelope = document.getElementById('envelope');
  var openBtn = document.getElementById('open-btn');
  var envelopeScreen = document.getElementById('envelope-screen');
  var mainContent = document.getElementById('main-content');
  var body = document.body;

  // A carta que aparece saindo do envelope usa o MESMO texto da carta
  // principal (título + primeiro parágrafo), copiado automaticamente.
  // Assim, quem for editar o convite só precisa mudar o texto uma vez,
  // lá na seção principal — aqui é só um espelho.
  (function syncLetterPreview(){
    var previewHeading = document.getElementById('letter-preview-heading');
    var previewText = document.getElementById('letter-preview-text');
    var mainHeading = document.querySelector('.letter-heading');
    var mainFirstParagraph = document.querySelector('.letter-body p');
    if (previewHeading && mainHeading){
      previewHeading.innerHTML = mainHeading.innerHTML;
    }
    if (previewText && mainFirstParagraph){
      previewText.textContent = mainFirstParagraph.textContent;
    }
  })();

  function openEnvelope(){
    if (envelope.classList.contains('opened')) return;
    envelope.classList.add('opened');
    setTimeout(function(){
      envelopeScreen.classList.add('hidden');
      body.classList.remove('locked');
      mainContent.classList.add('show');
    }, 2300); // tempo aumentado para dar espaço à nova animação da carta desdobrando (e um tempinho pra ler)
  }

  /* ---------- entrada suave dos blocos ao rolar a página ---------- */
  (function setupScrollReveal(){
    var revealEls = document.querySelectorAll('.reveal-on-scroll');
    if (!revealEls.length) return;

    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      revealEls.forEach(function(el){ el.classList.add('in-view'); });
      return;
    }

    var observer = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting){
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(function(el){ observer.observe(el); });
  })();

  envelope.addEventListener('click', openEnvelope);
  envelope.addEventListener('keydown', function(e){
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEnvelope(); }
  });
  openBtn.addEventListener('click', openEnvelope);

  /* ---------- reveal do quadro-negro (giz escrevendo o pedido, linha por linha) ---------- */
  var revealBtn = document.getElementById('reveal-btn');
  var chalkContent = document.getElementById('chalk-content');
  var chalkQuestion = document.getElementById('chalk-question');
  var chalkLines = chalkQuestion ? Array.prototype.slice.call(chalkQuestion.querySelectorAll('.chalk-line')) : [];
  var chalkButtonsWrap = document.getElementById('chalk-buttons-wrap');
  var dustCanvas = document.getElementById('chalk-dust-canvas');
  var dustCtx = dustCanvas ? dustCanvas.getContext('2d') : null;
  var buttonsRevealed = false;
  var reduceMotionChalk = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function showChalkButtons(){
    if (buttonsRevealed) return;
    buttonsRevealed = true;
    chalkButtonsWrap.classList.add('show');
    // Espera a transição de entrada (opacidade + translateY) terminar
    // antes de "congelar" a posição dos botões — se medirmos no meio da
    // transição, as coordenadas capturadas ficam erradas e o botão
    // "pensar" pode acabar sobrepondo o "sim" mais tarde.
    var settled = false;
    function onTransitionEnd(e){
      if (e.target !== chalkButtonsWrap) return;
      if (settled) return;
      settled = true;
      chalkButtonsWrap.removeEventListener('transitionend', onTransitionEnd);
      freezeButtonLayout();
    }
    chalkButtonsWrap.addEventListener('transitionend', onTransitionEnd);
    // rede de segurança caso transitionend não dispare
    setTimeout(function(){
      if (settled) return;
      settled = true;
      chalkButtonsWrap.removeEventListener('transitionend', onTransitionEnd);
      freezeButtonLayout();
    }, 600);
  }

  /* ---- pó de giz: pequenas partículas que caem enquanto o "giz" escreve ---- */
  var dustParticles = [];
  var dustRAF = null;
  var dustDpr = 1;

  function sizeDustCanvas(){
    if (!dustCanvas) return;
    var rect = chalkContent.getBoundingClientRect();
    dustDpr = window.devicePixelRatio || 1;
    dustCanvas.width = Math.max(1, Math.round(rect.width * dustDpr));
    dustCanvas.height = Math.max(1, Math.round(rect.height * dustDpr));
  }

  function spawnDust(pageX, pageY){
    if (!dustCanvas) return;
    var rect = chalkContent.getBoundingClientRect();
    var localX = pageX - rect.left;
    var localY = pageY - rect.top;
    var n = 2 + Math.floor(Math.random() * 2);
    for (var i = 0; i < n; i++){
      dustParticles.push({
        x: localX + (Math.random() - 0.5) * 6,
        y: localY + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 0.6,
        vy: 0.4 + Math.random() * 0.8,
        size: 1 + Math.random() * 2.2,
        life: 0,
        maxLife: 420 + Math.random() * 380
      });
    }
    if (!dustRAF){
      dustRAF = requestAnimationFrame(dustTick);
    }
  }

  var lastDustTs = null;
  function dustTick(ts){
    if (!dustCtx){ dustRAF = null; return; }
    if (lastDustTs === null) lastDustTs = ts;
    var dt = Math.min(ts - lastDustTs, 48);
    lastDustTs = ts;

    dustCtx.clearRect(0, 0, dustCanvas.width, dustCanvas.height);
    dustCtx.save();
    dustCtx.scale(dustDpr, dustDpr);

    var stillAlive = false;
    for (var i = dustParticles.length - 1; i >= 0; i--){
      var p = dustParticles[i];
      p.life += dt;
      if (p.life >= p.maxLife){
        dustParticles.splice(i, 1);
        continue;
      }
      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);
      p.vy += 0.0025 * dt;
      var progress = p.life / p.maxLife;
      var alpha = 1 - progress;
      dustCtx.globalAlpha = Math.max(alpha, 0) * 0.85;
      dustCtx.fillStyle = '#F4EFE3';
      dustCtx.beginPath();
      dustCtx.arc(p.x, p.y, p.size * (1 - progress * 0.4), 0, Math.PI * 2);
      dustCtx.fill();
      stillAlive = true;
    }
    dustCtx.restore();

    if (stillAlive){
      dustRAF = requestAnimationFrame(dustTick);
    } else {
      dustRAF = null;
      lastDustTs = null;
      dustCtx.clearRect(0, 0, dustCanvas.width, dustCanvas.height);
    }
  }

  window.addEventListener('resize', function(){
    if (dustCanvas) sizeDustCanvas();
  });

  function writeLine(line, duration, onDone){
    var startRect = line.getBoundingClientRect();
    var startTime = null;

    function frame(now){
      if (startTime === null) startTime = now;
      var t = Math.min((now - startTime) / duration, 1);
      var pct = t * 100;
      line.style.clipPath = 'inset(0 ' + (100 - pct) + '% 0 0)';

      // giz "cai" no ponto onde o texto está sendo revelado
      var cursorX = startRect.left + startRect.width * t;
      var cursorY = startRect.top + startRect.height * 0.72;
      spawnDust(cursorX, cursorY);

      if (t < 1){
        requestAnimationFrame(frame);
      } else {
        line.classList.add('revealed');
        line.style.clipPath = '';
        if (onDone) onDone();
      }
    }
    requestAnimationFrame(frame);
  }

  function writeAllLines(lines, index){
    if (index >= lines.length){
      showChalkButtons();
      return;
    }
    var line = lines[index];
    var durationPerChar = 55; // ms por caractere, dá o ritmo de "escrita"
    var text = line.textContent || '';
    var duration = Math.max(500, Math.min(1600, text.length * durationPerChar));
    writeLine(line, duration, function(){
      setTimeout(function(){ writeAllLines(lines, index + 1); }, 180);
    });
  }

  function revealChalk(){
    revealBtn.classList.add('hidden');
    chalkContent.hidden = false;
    sizeDustCanvas();

    if (reduceMotionChalk || !chalkLines.length){
      chalkLines.forEach(function(line){
        line.classList.add('revealed');
        line.style.clipPath = '';
      });
      showChalkButtons();
      return;
    }

    // pequeno atraso para garantir que o navegador registre o estado
    // inicial (clip-path fechado) antes de disparar a animação
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        writeAllLines(chalkLines, 0);
      });
    });

    // rede de segurança: caso algo trave, os botões aparecem mesmo assim
    var safetyTimeout = chalkLines.length * 2200;
    setTimeout(showChalkButtons, safetyTimeout);
  }

  if (revealBtn){
    revealBtn.addEventListener('click', revealChalk);
  }

  /* ---------- "Deixa eu pensar" dodges the cursor ---------- */
  var thinkBtn = document.getElementById('btn-think');
  var chalkArea = document.getElementById('chalk-buttons');
  var dodges = 0;
  var MAX_DODGES = 5;
  var caught = false;
  var frozen = false;
  var yesFrac = null; // posição do botão "Sim" em fração da área, capturada uma única vez
  var lastThinkPos = null; // último ponto (px, relativo à área) do botão "pensar"

  // "Congela" o layout: tira os dois botões do fluxo flex e os posiciona
  // com position:absolute usando porcentagens (responsivo a qualquer
  // redimensionamento). A partir daqui o botão "Sim" NUNCA mais se move,
  // então o cálculo de onde o outro botão pode ir fica sempre consistente
  // e nunca sobrepõe, seja qual for a ordem dos eventos.
  function freezeButtonLayout(){
    if (frozen) return;
    var areaRect = chalkArea.getBoundingClientRect();
    var yesRect = btnYes.getBoundingClientRect();
    if (areaRect.width === 0 || areaRect.height === 0) return; // ainda não visível, tenta depois

    // guardamos o topo-esquerda em % (não o centro) para não precisar de
    // transform no posicionamento — assim o transform do :hover/:active
    // do botão "Sim" continua funcionando normalmente
    yesFrac = {
      leftPct: ((yesRect.left - areaRect.left) / areaRect.width) * 100,
      topPct: ((yesRect.top - areaRect.top) / areaRect.height) * 100,
      centerXPct: ((yesRect.left - areaRect.left + yesRect.width / 2) / areaRect.width) * 100,
      centerYPct: ((yesRect.top - areaRect.top + yesRect.height / 2) / areaRect.height) * 100
    };

    var thinkRect = thinkBtn.getBoundingClientRect();
    var thinkStartLeft = thinkRect.left - areaRect.left;
    var thinkStartTop = thinkRect.top - areaRect.top;

    btnYes.style.position = 'absolute';
    btnYes.style.left = yesFrac.leftPct + '%';
    btnYes.style.top = yesFrac.topPct + '%';

    thinkBtn.classList.add('dodging');
    thinkBtn.style.left = thinkStartLeft + 'px';
    thinkBtn.style.top = thinkStartTop + 'px';
    lastThinkPos = { x: thinkStartLeft, y: thinkStartTop };

    frozen = true;
  }

  function dodge(){
    if (caught) return;
    if (!frozen) return; // ainda esperando o layout assentar (ver showChalkButtons); ignora esta tentativa
    dodges++;

    var areaRect = chalkArea.getBoundingClientRect();
    var thinkW = thinkBtn.offsetWidth || 140;
    var thinkH = thinkBtn.offsetHeight || 48;
    var buffer = 20; // espaço extra ao redor do botão "Sim" que o outro botão nunca invade

    var yesW = btnYes.offsetWidth;
    var yesH = btnYes.offsetHeight;
    var yesCenterX = (yesFrac.centerXPct / 100) * areaRect.width;
    var yesCenterY = (yesFrac.centerYPct / 100) * areaRect.height;
    var yesLocal = {
      top: yesCenterY - yesH / 2 - buffer,
      bottom: yesCenterY + yesH / 2 + buffer
    };

    var maxX = Math.max(areaRect.width - thinkW - 8, 4);
    var minMoveDist = Math.min(60, Math.max(areaRect.width, areaRect.height) * 0.25);

    // Em vez de sortear X e Y juntos (o que em telas estreitas quase
    // sempre esbarra no botão "Sim"), escolhemos uma FAIXA vertical
    // inteira que não toca o botão "Sim" e sorteamos dentro dela.
    // Isso garante zero sobreposição em qualquer largura de tela.
    var bands = [];
    var topBandHeight = yesLocal.top - thinkH;
    if (topBandHeight > 6){
      bands.push({ min: 4, max: topBandHeight, id: 'top' });
    }
    var bottomBandStart = yesLocal.bottom;
    var bottomBandHeight = (areaRect.height - thinkH - 4) - bottomBandStart;
    if (bottomBandHeight > 6){
      bands.push({ min: bottomBandStart, max: bottomBandStart + bottomBandHeight, id: 'bottom' });
    }

    function pickPoint(){
      var y, bandId;
      if (bands.length > 0){
        var band = bands[Math.floor(Math.random() * bands.length)];
        y = band.min + Math.random() * (band.max - band.min);
        bandId = band.id;
      } else {
        // não há espaço vertical livre: manda pro rodapé da área, bem
        // abaixo de tudo, nunca em cima do botão "Sim"
        y = Math.max(areaRect.height - thinkH - 4, yesLocal.bottom);
        bandId = 'bottom';
      }
      var x = Math.random() * maxX;
      return { x: x, y: y, band: bandId };
    }

    // sorteia até achar um ponto claramente diferente do atual (evita o
    // bug de "quase não sai do lugar" quando o sorteio cai perto demais)
    var point = pickPoint();
    var attempts = 0;
    while (lastThinkPos && attempts < 8 &&
           Math.hypot(point.x - lastThinkPos.x, point.y - lastThinkPos.y) < minMoveDist){
      point = pickPoint();
      attempts++;
    }

    // Se o novo ponto está numa faixa diferente da atual (ex: estava acima
    // do botão "Sim" e agora vai para abaixo dele), o caminho animado em
    // linha reta entre os dois pontos passaria por cima do botão "Sim".
    // Nesse caso, pulamos instantaneamente (sem transição) em vez de
    // deslizar, garantindo que o botão nunca sobreponha o outro durante
    // o movimento.
    var switchingBand = lastThinkPos && lastThinkPos.band && point.band && lastThinkPos.band !== point.band;
    if (switchingBand){
      thinkBtn.style.transition = 'none';
      thinkBtn.style.left = point.x + 'px';
      thinkBtn.style.top = point.y + 'px';
      // força o navegador a aplicar a posição antes de reabilitar a
      // transição, senão o próximo movimento "herdaria" este salto
      void thinkBtn.offsetWidth;
      thinkBtn.style.transition = '';
    } else {
      thinkBtn.style.left = point.x + 'px';
      thinkBtn.style.top = point.y + 'px';
    }
    lastThinkPos = point;

    if (dodges >= MAX_DODGES){
      caught = true;
      thinkBtn.textContent = 'Tá bom, eu aceito também! 😄';
      // volta suavemente para perto do botão "Sim"
      var settleX = Math.min(Math.max(yesCenterX - thinkW / 2, 4), maxX);
      var settleY = Math.max(yesLocal.bottom + 14, 4);
      thinkBtn.style.left = settleX + 'px';
      thinkBtn.style.top = settleY + 'px';
      lastThinkPos = { x: settleX, y: settleY };
    }
  }

  thinkBtn.addEventListener('mouseenter', dodge);
  thinkBtn.addEventListener('touchstart', function(e){
    if (!caught){ e.preventDefault(); dodge(); }
  }, {passive:false});
  thinkBtn.addEventListener('click', function(){
    if (caught){ celebrate(); }
  });

  // se a janela for redimensionada (ex: rotação do celular) antes do
  // congelamento acontecer, nada a fazer; depois de congelado, o uso de
  // porcentagem para o botão "Sim" e recálculo de areaRect a cada dodge()
  // mantém tudo consistente automaticamente.

  /* ---------- celebration + confetti ---------- */
  var btnYes = document.getElementById('btn-yes');
  var celebration = document.getElementById('celebration');
  var celebrated = false;

  function celebrate(){
    if (celebrated) return;
    celebrated = true;
    celebration.classList.add('show');
    celebration.scrollIntoView({ behavior:'smooth', block:'start' });
    launchConfetti();
  }
  btnYes.addEventListener('click', celebrate);

  /* ---------- lightweight confetti ---------- */
  var canvas = document.getElementById('confetti-canvas');
  var ctx = canvas.getContext('2d');
  var particles = [];
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var colors = ['#F5C84C', '#E2607A', '#F0924B', '#34406B', '#FFFDF8'];

  function resizeCanvas(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function launchConfetti(){
    if (reduceMotion) return;
    particles = [];
    var count = 140;
    for (var i=0; i<count; i++){
      particles.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * canvas.height * 0.3,
        vx: (Math.random()-0.5) * 3,
        vy: 2 + Math.random() * 3,
        size: 5 + Math.random() * 6,
        color: colors[Math.floor(Math.random()*colors.length)],
        rot: Math.random() * 360,
        vrot: (Math.random()-0.5) * 10,
        shape: Math.random() > 0.5 ? 'rect' : 'circle'
      });
    }
    requestAnimationFrame(tick);
  }

  var startTime = null;
  function tick(ts){
    if (!startTime) startTime = ts;
    var elapsed = ts - startTime;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    var alive = false;
    particles.forEach(function(p){
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.02;
      p.rot += p.vrot;
      if (p.y < canvas.height + 20) alive = true;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot * Math.PI/180);
      ctx.fillStyle = p.color;
      if (p.shape === 'rect'){
        ctx.fillRect(-p.size/2, -p.size/4, p.size, p.size/2);
      } else {
        ctx.beginPath();
        ctx.arc(0,0,p.size/2,0,Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
    });
    if (alive && elapsed < 6000){
      requestAnimationFrame(tick);
    } else {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      startTime = null;
    }
  }
})();
