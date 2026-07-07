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

  envelope.addEventListener('click', openEnvelope);
  envelope.addEventListener('keydown', function(e){
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEnvelope(); }
  });
  openBtn.addEventListener('click', openEnvelope);

  /* ---------- reveal do quadro-negro ---------- */
  var revealBtn = document.getElementById('reveal-btn');
  var revealWrap = document.getElementById('reveal-wrap');
  var chalkContent = document.getElementById('chalk-content');

  function revealChalk(){
    revealWrap.classList.add('hidden');
    chalkContent.classList.add('show');
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

  function dodge(){
    if (caught) return;
    dodges++;

    var areaRect = chalkArea.getBoundingClientRect();
    var yesRect = btnYes.getBoundingClientRect();
    var thinkW = thinkBtn.offsetWidth;
    var thinkH = thinkBtn.offsetHeight;
    var buffer = 18; // espaço extra ao redor do botão "Sim" que o outro botão nunca invade

    var yesLocal = {
      top: yesRect.top - areaRect.top - buffer,
      bottom: yesRect.bottom - areaRect.top + buffer
    };

    var maxX = Math.max(areaRect.width - thinkW - 8, 4);

    // Em vez de sortear X e Y juntos (o que em telas estreitas quase
    // sempre esbarra no botão "Sim"), escolhemos uma FAIXA vertical
    // inteira que não toca o botão "Sim" e sorteamos dentro dela.
    // Isso garante zero sobreposição em qualquer largura de tela.
    var bands = [];
    var topBandHeight = yesLocal.top - thinkH;
    if (topBandHeight > 6){
      bands.push({ min: 4, max: topBandHeight });
    }
    var bottomBandStart = yesLocal.bottom;
    var bottomBandHeight = (areaRect.height - thinkH - 4) - bottomBandStart;
    if (bottomBandHeight > 6){
      bands.push({ min: bottomBandStart, max: bottomBandStart + bottomBandHeight });
    }

    var randY;
    if (bands.length > 0){
      var band = bands[Math.floor(Math.random() * bands.length)];
      randY = band.min + Math.random() * (band.max - band.min);
    } else {
      // não há espaço vertical livre: manda pro rodapé da área, bem
      // abaixo de tudo, nunca em cima do botão "Sim"
      randY = Math.max(areaRect.height - thinkH - 4, yesLocal.bottom);
    }
    var randX = Math.random() * maxX;

    thinkBtn.classList.add('dodging');
    thinkBtn.style.left = randX + 'px';
    thinkBtn.style.top = randY + 'px';

    if (dodges >= MAX_DODGES){
      caught = true;
      thinkBtn.textContent = 'Tá bom, eu aceito também! 😄';
      // volta suavemente para o lugar original, ao lado do botão "Sim"
      setTimeout(function(){
        thinkBtn.classList.remove('dodging');
        thinkBtn.style.left = '';
        thinkBtn.style.top = '';
      }, 850);
    }
  }

  thinkBtn.addEventListener('mouseenter', dodge);
  thinkBtn.addEventListener('touchstart', function(e){
    if (!caught){ e.preventDefault(); dodge(); }
  }, {passive:false});
  thinkBtn.addEventListener('click', function(){
    if (caught){ celebrate(); }
  });

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
