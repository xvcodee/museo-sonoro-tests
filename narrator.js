(() => {
  const rooms = [...document.querySelectorAll('[data-narrator]')].map(element => ({
    element,
    id: element.dataset.narratorId,
    title: element.dataset.narratorTitle || element.querySelector('h1, h2')?.textContent.replace(/\s+/g, ' ').trim() || 'Sala SONORA',
    text: element.dataset.narration || element.querySelector('p')?.textContent.replace(/\s+/g, ' ').trim() || ''
  })).filter(room => room.id && room.text);
  if (!rooms.length) return;

  const panel = document.createElement('aside');
  panel.className = 'narrator-dock';
  panel.setAttribute('aria-label', 'Narrador de sala');
  panel.innerHTML = `
    <div class="narrator-heading"><span>GUÍA DE ESCUCHA · VOZ IA</span><b data-narrator-title></b><button type="button" class="narrator-hide" data-narrator-hide aria-label="Ocultar guía de escucha">×</button></div>
    <div class="narrator-actions">
      <button type="button" class="narrator-start" data-narrator-start>Narrar con IA <span>↗</span></button>
      <div class="narrator-controls" aria-label="Controles del narrador">
        <button type="button" data-narrator-pause disabled>Pausar</button>
        <button type="button" data-narrator-resume disabled>Reanudar</button>
        <button type="button" data-narrator-stop disabled>Detener</button>
      </div>
    </div>
    <p class="narrator-status" data-narrator-status aria-live="polite">LISTO PARA NARRAR</p>
    <p class="narrator-transcript" data-narrator-transcript></p>
  `;
  const reopenButton = document.createElement('button');
  reopenButton.type = 'button';
  reopenButton.className = 'narrator-reopen';
  reopenButton.textContent = 'Guía de escucha';
  reopenButton.setAttribute('aria-label', 'Mostrar guía de escucha');
  document.body.append(panel, reopenButton);

  const title = panel.querySelector('[data-narrator-title]');
  const status = panel.querySelector('[data-narrator-status]');
  const transcript = panel.querySelector('[data-narrator-transcript]');
  const startButton = panel.querySelector('[data-narrator-start]');
  const pauseButton = panel.querySelector('[data-narrator-pause]');
  const resumeButton = panel.querySelector('[data-narrator-resume]');
  const stopButton = panel.querySelector('[data-narrator-stop]');
  const hideButton = panel.querySelector('[data-narrator-hide]');
  const ambientMusic = document.querySelector('#ambient-music');
  const audio = new Audio();
  audio.preload = 'auto';
  let activeRoom;
  let phrases = [];
  let guideHidden = false;
  let loading = false;

  function splitPhrases(text) {
    const result = [];
    const pattern = /[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g;
    let match;
    while ((match = pattern.exec(text))) {
      const value = match[0].trim();
      if (value) result.push({ text: value, start: match.index, end: match.index + match[0].length });
    }
    return result.length ? result : [{ text, start: 0, end: text.length }];
  }

  function renderTranscript(text) {
    phrases = splitPhrases(text);
    transcript.replaceChildren(...phrases.map((phrase, index) => {
      const span = document.createElement('span');
      span.textContent = phrase.text;
      span.dataset.phrase = String(index);
      return span;
    }));
  }

  function setControls({ playing = false, paused = false, isLoading = false } = {}) {
    panel.classList.toggle('is-narrating', playing || paused || isLoading);
    pauseButton.disabled = !playing;
    resumeButton.disabled = !paused;
    stopButton.disabled = !playing && !paused && !isLoading;
    startButton.disabled = isLoading;
  }

  function duckAmbient(duck) {
    if (ambientMusic) ambientMusic.volume = duck ? .045 : .16;
  }

  function highlightAt(characterIndex) {
    const index = phrases.findIndex(phrase => characterIndex >= phrase.start && characterIndex < phrase.end);
    transcript.querySelectorAll('span').forEach((span, phraseIndex) => span.classList.toggle('is-current', phraseIndex === (index < 0 ? 0 : index)));
  }

  function resetHighlight() {
    transcript.querySelectorAll('span').forEach(span => span.classList.remove('is-current'));
  }

  function stopNarration(showStatus = true) {
    loading = false;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    duckAmbient(false);
    setControls();
    if (showStatus) status.textContent = 'NARRACIÓN DETENIDA';
  }

  function selectRoom(room) {
    if (!room || activeRoom === room) return;
    if (!audio.paused || loading) stopNarration(false);
    activeRoom = room;
    title.textContent = room.title;
    renderTranscript(room.text);
    resetHighlight();
    status.textContent = 'LISTO PARA NARRAR';
    setControls();
    if (!guideHidden) panel.classList.add('is-visible');
  }

  function narrate() {
    if (!activeRoom || loading) return;
    stopNarration(false);
    loading = true;
    status.textContent = 'PREPARANDO LA VOZ IA…';
    resetHighlight();
    setControls({ isLoading: true });
    audio.src = `/api/narrate?room=${encodeURIComponent(activeRoom.id)}`;
    audio.currentTime = 0;
    const playback = audio.play();
    if (playback) playback.catch(() => {
      loading = false;
      duckAmbient(false);
      setControls();
      status.textContent = 'TOCÁ OTRA VEZ PARA INICIAR LA NARRACIÓN';
    });
  }

  audio.addEventListener('playing', () => {
    loading = false;
    duckAmbient(true);
    highlightAt(0);
    setControls({ playing: true });
    status.textContent = 'NARRANDO ESTA SALA';
  });
  audio.addEventListener('timeupdate', () => {
    if (!activeRoom || !Number.isFinite(audio.duration) || !audio.duration) return;
    highlightAt(Math.floor(activeRoom.text.length * (audio.currentTime / audio.duration)));
  });
  audio.addEventListener('ended', () => {
    duckAmbient(false);
    setControls();
    status.textContent = 'NARRACIÓN FINALIZADA';
  });
  audio.addEventListener('error', () => {
    if (!audio.currentSrc) return;
    loading = false;
    duckAmbient(false);
    setControls();
    status.textContent = 'LA VOZ IA AÚN NO ESTÁ DISPONIBLE';
  });

  startButton.addEventListener('click', narrate);
  pauseButton.addEventListener('click', () => {
    if (audio.paused) return;
    audio.pause();
    duckAmbient(false);
    setControls({ paused: true });
    status.textContent = 'NARRACIÓN EN PAUSA';
  });
  resumeButton.addEventListener('click', () => {
    if (!audio.paused || !audio.currentSrc) return;
    audio.play().then(() => { duckAmbient(true); }).catch(() => { status.textContent = 'NO SE PUDO REANUDAR LA NARRACIÓN'; });
  });
  stopButton.addEventListener('click', () => stopNarration());
  hideButton.addEventListener('click', () => {
    guideHidden = true;
    stopNarration(false);
    panel.classList.remove('is-visible');
    reopenButton.classList.add('is-visible');
  });
  reopenButton.addEventListener('click', () => {
    guideHidden = false;
    reopenButton.classList.remove('is-visible');
    if (activeRoom) panel.classList.add('is-visible');
  });
  window.addEventListener('pagehide', () => stopNarration(false));

  const visibleRooms = new Map();
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) visibleRooms.set(entry.target, entry.intersectionRatio);
      else visibleRooms.delete(entry.target);
    });
    const candidate = [...visibleRooms.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    selectRoom(rooms.find(room => room.element === candidate));
  }, { threshold: [0, .35, .6], rootMargin: '-12% 0px -28% 0px' });
  rooms.forEach(room => observer.observe(room.element));
  window.SonoraNarrator = { select: element => selectRoom(rooms.find(room => room.element === element)), stop: () => stopNarration() };
})();
