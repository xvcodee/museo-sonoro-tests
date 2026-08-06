(() => {
  const dialog = document.querySelector('#omega-dialog');
  const playButton = document.querySelector('[data-omega-play]');
  const closeButton = document.querySelector('[data-omega-close]');
  const volumeControl = document.querySelector('[data-omega-volume]');
  const output = document.querySelector('[data-omega-output]');
  if (!dialog || !playButton || !volumeControl) return;

  let context;
  let master;
  let filter;
  let strangeGain;
  let lowGain;
  let sources = [];

  function getContext() {
    context = context || new (window.AudioContext || window.webkitAudioContext)();
    if (context.state === 'suspended') context.resume();
    return context;
  }

  function updateCharacter() {
    const volume = Number(volumeControl.value) / 100;
    output.textContent = `${String(volumeControl.value).padStart(2, '0')}%`;
    if (!master || !context) return;
    const now = context.currentTime;
    master.gain.setTargetAtTime(Math.max(.0001, volume * .075), now, .07);
    filter.frequency.setTargetAtTime(420 + volume * 5150, now, .09);
    strangeGain.gain.setTargetAtTime(.002 + volume * .032, now, .09);
    lowGain.gain.setTargetAtTime(Math.max(.0001, (volume - .34) * .05), now, .09);
    dialog.classList.toggle('is-playing', volume > .58);
  }

  function start() {
    if (sources.length) return;
    const audio = getContext();
    const now = audio.currentTime;
    master = audio.createGain();
    filter = audio.createBiquadFilter();
    strangeGain = audio.createGain();
    lowGain = audio.createGain();
    const pulseGain = audio.createGain();
    const carrier = audio.createOscillator();
    const shadow = audio.createOscillator();
    const deep = audio.createOscillator();
    const modulator = audio.createOscillator();
    const modulation = audio.createGain();
    const tremolo = audio.createOscillator();
    const tremoloDepth = audio.createGain();
    const buffer = audio.createBuffer(1, audio.sampleRate * 2, audio.sampleRate);
    const noise = audio.createBufferSource();
    const noiseFilter = audio.createBiquadFilter();

    for (let index = 0; index < buffer.length; index += 1) buffer.getChannelData(0)[index] = Math.random() * 2 - 1;
    carrier.type = 'sine'; carrier.frequency.value = 131.7;
    shadow.type = 'triangle'; shadow.frequency.value = 198.2; shadow.detune.value = -31;
    deep.type = 'sine'; deep.frequency.value = 48.6;
    modulator.type = 'sine'; modulator.frequency.value = .071;
    modulation.gain.value = 36;
    tremolo.type = 'square'; tremolo.frequency.value = .17;
    tremoloDepth.gain.value = .018;
    noise.buffer = buffer; noise.loop = true;
    noiseFilter.type = 'bandpass'; noiseFilter.frequency.value = 940; noiseFilter.Q.value = 4.2;
    filter.type = 'lowpass'; filter.Q.value = 3.4;
    pulseGain.gain.value = .035;
    master.gain.setValueAtTime(.0001, now);

    modulator.connect(modulation).connect(carrier.frequency);
    tremolo.connect(tremoloDepth).connect(pulseGain.gain);
    carrier.connect(pulseGain).connect(filter);
    shadow.connect(strangeGain).connect(filter);
    deep.connect(lowGain).connect(filter);
    noise.connect(noiseFilter).connect(filter);
    filter.connect(master).connect(audio.destination);
    [carrier, shadow, deep, modulator, tremolo, noise].forEach(source => source.start());
    sources = [carrier, shadow, deep, modulator, tremolo, noise];
    playButton.textContent = 'SEÑAL ACTIVA';
    dialog.classList.add('is-playing');
    updateCharacter();
    window.SonoraAchievements?.unlock('omega');
    document.dispatchEvent(new CustomEvent('sonora:omegaactive'));
  }

  function stop() {
    if (!sources.length || !context) return;
    const now = context.currentTime;
    try { master.gain.exponentialRampToValueAtTime(.0001, now + .22); } catch (_) { /* La señal ya terminó. */ }
    const closing = sources;
    sources = [];
    window.setTimeout(() => closing.forEach(source => { try { source.stop(); source.disconnect(); } catch (_) { /* Fuente cerrada. */ } }), 260);
    playButton.textContent = 'REPRODUCIR';
    dialog.classList.remove('is-playing');
  }

  playButton.addEventListener('click', () => (sources.length ? stop() : start()));
  volumeControl.addEventListener('input', updateCharacter);
  closeButton?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', stop);
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
})();
