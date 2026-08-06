(() => {
  const profileButtons = document.querySelectorAll('[data-hearing-profile]');
  const playButton = document.querySelector('#hearing-play');
  const stopButton = document.querySelector('#hearing-stop');
  const status = document.querySelector('#hearing-status');
  const consolePanel = document.querySelector('.hearing-console');
  if (!profileButtons.length || !playButton || !stopButton) return;

  const profiles = {
    normal: { label: 'REFERENCIA ACTIVA', cutoff: 12000, signal: .07, tinnitus: 0, description: 'Referencia' },
    highloss: { label: 'AGUDOS ATENUADOS · SIMULACIÓN', cutoff: 1900, signal: .075, tinnitus: 0, description: 'Agudos atenuados' },
    muffled: { label: 'CAPA AMORTIGUADA · SIMULACIÓN', cutoff: 880, signal: .095, tinnitus: 0, description: 'Sonido amortiguado' },
    tinnitus: { label: 'TONO INTERNO · SIMULACIÓN', cutoff: 9000, signal: .06, tinnitus: .013, description: 'Tono interno' }
  };
  let selected = 'normal';
  let context;
  let master;
  let filter;
  let tinnitusGain;
  let sources = [];

  function getContext() {
    context = context || new (window.AudioContext || window.webkitAudioContext)();
    if (context.state === 'suspended') context.resume();
    return context;
  }

  function rememberProfile(profile) {
    let visited = [];
    try { visited = JSON.parse(sessionStorage.getItem('sonora-hearing-profiles') || '[]'); } catch (_) { /* Sin almacenamiento, la sala igual funciona. */ }
    if (!visited.includes(profile)) visited.push(profile);
    try { sessionStorage.setItem('sonora-hearing-profiles', JSON.stringify(visited)); } catch (_) { /* No es crítico. */ }
    if (visited.length >= Object.keys(profiles).length) {
      document.dispatchEvent(new CustomEvent('sonora:hearingcomplete'));
      if (sessionStorage.getItem('sonora-spatial-explored') === 'yes') window.SonoraAchievements?.unlock('audiofilo');
    }
  }

  function setProfile(profile, remember = true) {
    selected = profiles[profile] ? profile : 'normal';
    const config = profiles[selected];
    profileButtons.forEach(button => button.classList.toggle('is-active', button.dataset.hearingProfile === selected));
    consolePanel.className = `hearing-console is-${selected}${sources.length ? ' is-listening' : ''}`;
    status.textContent = config.label;
    if (filter && context) {
      filter.frequency.setTargetAtTime(config.cutoff, context.currentTime, .12);
      tinnitusGain.gain.setTargetAtTime(config.tinnitus, context.currentTime, .12);
    }
    if (remember) rememberProfile(selected);
  }

  function makeNoise(audio) {
    const seconds = 2;
    const buffer = audio.createBuffer(1, audio.sampleRate * seconds, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
    const source = audio.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return source;
  }

  function start() {
    stop();
    const audio = getContext();
    const config = profiles[selected];
    master = audio.createGain();
    filter = audio.createBiquadFilter();
    const ambience = audio.createBiquadFilter();
    const air = audio.createGain();
    tinnitusGain = audio.createGain();
    const landscape = audio.createGain();
    const pulse = audio.createOscillator();
    const shimmer = audio.createOscillator();
    const overtone = audio.createOscillator();
    const tinnitus = audio.createOscillator();
    const noise = makeNoise(audio);
    const lfo = audio.createOscillator();
    const lfoGain = audio.createGain();
    const now = audio.currentTime;

    filter.type = 'lowpass';
    filter.frequency.value = config.cutoff;
    filter.Q.value = .55;
    ambience.type = 'bandpass';
    ambience.frequency.value = 1400;
    ambience.Q.value = .72;
    air.gain.value = .018;
    landscape.gain.value = config.signal;
    master.gain.setValueAtTime(.0001, now);
    master.gain.exponentialRampToValueAtTime(.19, now + .4);

    pulse.type = 'sine'; pulse.frequency.value = 176;
    shimmer.type = 'triangle'; shimmer.frequency.value = 440;
    overtone.type = 'sine'; overtone.frequency.value = 660;
    tinnitus.type = 'sine'; tinnitus.frequency.value = 6100;
    tinnitusGain.gain.value = config.tinnitus;
    lfo.type = 'sine'; lfo.frequency.value = .18;
    lfoGain.gain.value = 8;

    lfo.connect(lfoGain).connect(shimmer.frequency);
    pulse.connect(landscape);
    shimmer.connect(landscape);
    overtone.connect(landscape);
    noise.connect(ambience).connect(air);
    landscape.connect(filter).connect(master);
    air.connect(filter);
    tinnitus.connect(tinnitusGain).connect(master);
    master.connect(audio.destination);
    [pulse, shimmer, overtone, tinnitus, noise, lfo].forEach(source => source.start());
    sources = [pulse, shimmer, overtone, tinnitus, noise, lfo];

    playButton.textContent = 'Paisaje activo';
    playButton.classList.add('is-playing');
    status.textContent = `${config.label} · ESCUCHANDO`;
    consolePanel.classList.add('is-listening');
  }

  function stop() {
    if (!context || !sources.length) return;
    const now = context.currentTime;
    try { master.gain.exponentialRampToValueAtTime(.0001, now + .18); } catch (_) { /* La señal ya pudo haber terminado. */ }
    const stopping = sources;
    sources = [];
    window.setTimeout(() => stopping.forEach(source => { try { source.stop(); source.disconnect(); } catch (_) { /* Fuente ya detenida. */ } }), 220);
    playButton.textContent = 'Escuchar paisaje de prueba ↗';
    playButton.classList.remove('is-playing');
    consolePanel.classList.remove('is-listening');
    status.textContent = profiles[selected].label;
  }

  profileButtons.forEach(button => button.addEventListener('click', () => setProfile(button.dataset.hearingProfile)));
  playButton.addEventListener('click', () => (sources.length ? stop() : start()));
  stopButton.addEventListener('click', stop);
  document.addEventListener('sonora:spatialchange', event => {
    if (event.detail?.status === 'started') {
      try { sessionStorage.setItem('sonora-spatial-explored', 'yes'); } catch (_) { /* No es crítico. */ }
      let profilesSeen = [];
      try { profilesSeen = JSON.parse(sessionStorage.getItem('sonora-hearing-profiles') || '[]'); } catch (_) { /* Sin persistencia. */ }
      if (profilesSeen.length >= Object.keys(profiles).length) window.SonoraAchievements?.unlock('audiofilo');
    }
  });
  window.addEventListener('pagehide', stop);
  setProfile('normal', false);
})();
