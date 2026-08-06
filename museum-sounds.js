(() => {
  let context;
  const playedCues = new Set();

  function getContext() {
    context = context || new (window.AudioContext || window.webkitAudioContext)();
    if (context.state === 'suspended') context.resume();
    return context;
  }

  function envelope(node, volume, duration, delay = 0) {
    const now = getContext().currentTime + delay;
    node.gain.setValueAtTime(0.0001, now);
    node.gain.exponentialRampToValueAtTime(volume, now + Math.min(.07, duration / 5));
    node.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  }

  function tone(frequency, duration = .45, options = {}) {
    const audio = getContext();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = options.type || 'sine';
    oscillator.frequency.setValueAtTime(frequency, audio.currentTime + (options.delay || 0));
    if (options.slide) oscillator.frequency.exponentialRampToValueAtTime(options.slide, audio.currentTime + (options.delay || 0) + duration);
    envelope(gain, options.volume || .035, duration, options.delay || 0);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(audio.currentTime + (options.delay || 0));
    oscillator.stop(audio.currentTime + (options.delay || 0) + duration + .03);
  }

  function noise(duration = .45, cutoff = 1100, volume = .025, delay = 0) {
    const audio = getContext();
    const buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * duration), audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    const source = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();
    source.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.value = cutoff;
    filter.Q.value = 1.4;
    envelope(gain, volume, duration, delay);
    source.connect(filter).connect(gain).connect(audio.destination);
    source.start(audio.currentTime + delay);
  }

  const cues = {
    ciudad() {
      tone(88, .35, { type: 'sawtooth', volume: .022, slide: 120 });
      tone(174, .24, { type: 'triangle', volume: .02, delay: .11, slide: 132 });
      noise(.4, 560, .018);
    },
    memoria() {
      tone(523.25, .82, { volume: .038 });
      tone(659.25, .68, { volume: .026, delay: .17 });
      tone(783.99, .54, { volume: .018, delay: .34 });
    },
    cuerpo() {
      tone(72, .24, { type: 'sine', volume: .065, slide: 58 });
      tone(79, .2, { type: 'sine', volume: .046, delay: .3, slide: 63 });
    },
    paisaje() {
      noise(.7, 1450, .021);
      tone(220, .8, { type: 'sine', volume: .018, slide: 196 });
      tone(329.63, .55, { type: 'sine', volume: .012, delay: .12 });
    },
    c() { tone(261.63, 1.35, { volume: .055 }); tone(392, .95, { volume: .022, delay: .1 }); },
    e() { tone(329.63, 1.2, { volume: .048 }); tone(659.25, .82, { volume: .016, delay: .12 }); },
    g() { tone(392, 1.4, { volume: .052 }); tone(587.33, .9, { volume: .018, delay: .14 }); },
    b() { tone(493.88, 1.3, { volume: .045 }); tone(739.99, .75, { volume: .014, delay: .15 }); }
  };

  function play(name) {
    if (cues[name]) cues[name]();
  }

  function playOnce(name, key = name) {
    if (playedCues.has(key)) return false;
    playedCues.add(key);
    play(name);
    return true;
  }

  document.addEventListener('pointerdown', getContext, { once: true });
  window.MuseumSounds = { play, playOnce };
})();
