/*
 * SONORA · motor de escucha espacial
 *
 * No necesita archivos de audio. Crea una fuente abstracta con Web Audio y la
 * ubica alrededor de la persona mediante un PannerNode cuando el navegador lo
 * permite. Está pensado para iniciarse desde una acción de la persona (click,
 * touch o teclado), como exige la mayoría de los navegadores.
 */
(() => {
  'use strict';

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const defaults = {
    angle: 0,
    distance: 8,
    tone: 'aurora',
    volume: 0.55
  };

  let context = null;
  let session = null;
  let pendingStart = null;
  let unlockAttached = false;
  let motionFrame = null;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function number(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function normalize(options = {}) {
    return {
      angle: ((number(options.angle, defaults.angle) % 360) + 360) % 360,
      distance: clamp(number(options.distance, defaults.distance), 0.45, 36),
      tone: options.tone == null ? defaults.tone : options.tone,
      volume: clamp(number(options.volume, defaults.volume), 0, 1)
    };
  }

  function event(status, extra = {}) {
    const state = session ? session.state : (pendingStart || defaults);
    const detail = {
      status,
      active: Boolean(session),
      angle: state.angle,
      distance: state.distance,
      tone: state.tone,
      volume: state.volume,
      spatial: Boolean(session && session.kind === 'panner'),
      ...extra
    };

    try {
      document.dispatchEvent(new CustomEvent('sonora:spatialchange', { detail }));
    } catch (_) {
      // CustomEvent no existe en navegadores muy antiguos; el audio sigue siendo usable.
    }
  }

  function getContext() {
    if (!AudioContextClass) return null;
    if (!context || context.state === 'closed') context = new AudioContextClass();
    return context;
  }

  function setListener(listener) {
    if (!listener) return;
    const now = context.currentTime;
    const set = (param, value) => {
      if (param && typeof param.setValueAtTime === 'function') param.setValueAtTime(value, now);
    };

    set(listener.positionX, 0);
    set(listener.positionY, 0);
    set(listener.positionZ, 0);
    set(listener.forwardX, 0);
    set(listener.forwardY, 0);
    set(listener.forwardZ, -1);
    set(listener.upX, 0);
    set(listener.upY, 1);
    set(listener.upZ, 0);

    // API heredada de Web Audio, necesaria en algunos navegadores móviles.
    if (!listener.positionX && typeof listener.setPosition === 'function') listener.setPosition(0, 0, 0);
    if (!listener.forwardX && typeof listener.setOrientation === 'function') listener.setOrientation(0, 0, -1, 0, 1, 0);
  }

  function frequencyFor(tone) {
    const numericTone = Number(tone);
    if (String(tone).trim() !== '' && Number.isFinite(numericTone)) return clamp(numericTone, 55, 1400);
    const tones = {
      aurora: 196,
      pulso: 98,
      cristal: 392,
      niebla: 174,
      umbral: 247,
      agua: 220,
      archivo: 138
    };
    return tones[String(tone || '').toLowerCase()] || 220;
  }

  function smoothParam(param, value, now, timeConstant = 0.08) {
    if (!param) return;
    if (typeof param.cancelAndHoldAtTime === 'function') {
      param.cancelAndHoldAtTime(now);
    } else if (typeof param.cancelScheduledValues === 'function') {
      param.cancelScheduledValues(now);
      param.setValueAtTime(param.value, now);
    }
    if (typeof param.setTargetAtTime === 'function') param.setTargetAtTime(value, now, timeConstant);
    else if (typeof param.linearRampToValueAtTime === 'function') param.linearRampToValueAtTime(value, now + timeConstant * 3);
    else param.value = value;
  }

  function coordinates(angle, distance) {
    const radians = angle * Math.PI / 180;
    return {
      x: Math.sin(radians) * distance,
      y: 0,
      z: -Math.cos(radians) * distance
    };
  }

  function positionSession(nextAngle, nextDistance, easing = 0.12) {
    if (!session || !context) return;
    const now = context.currentTime;
    const point = coordinates(nextAngle, nextDistance);

    if (session.kind === 'panner') {
      const panner = session.position;
      if (panner.positionX) {
        smoothParam(panner.positionX, point.x, now, easing);
        smoothParam(panner.positionY, point.y, now, easing);
        smoothParam(panner.positionZ, point.z, now, easing);
      } else if (typeof panner.setPosition === 'function') {
        panner.setPosition(point.x, point.y, point.z);
      }
    } else if (session.kind === 'stereo') {
      smoothParam(session.position.pan, clamp(Math.sin(nextAngle * Math.PI / 180), -1, 1), now, easing);
      const attenuation = 1 / (1 + Math.max(0, nextDistance - 1) * 0.22);
      smoothParam(session.distanceGain.gain, attenuation, now, easing);
    } else if (session.distanceGain) {
      const attenuation = 1 / (1 + Math.max(0, nextDistance - 1) * 0.22);
      smoothParam(session.distanceGain.gain, attenuation, now, easing);
    }
  }

  function stopMotion() {
    if (motionFrame != null) cancelAnimationFrame(motionFrame);
    motionFrame = null;
  }

  function beginMotion() {
    stopMotion();
    const startedAt = performance.now();

    const animate = now => {
      if (!session) return;
      const elapsed = (now - startedAt) / 1000;
      const passage = (Math.sin(elapsed * 0.38 - Math.PI / 2) + 1) / 2;
      const sway = Math.sin(elapsed * 0.53) * 7;
      const approach = Math.max(0, session.state.distance - .55) * passage;
      const movingDistance = Math.max(0.45, session.state.distance - approach);
      positionSession(session.state.angle + sway, movingDistance, 0.11);
      motionFrame = requestAnimationFrame(animate);
    };

    motionFrame = requestAnimationFrame(animate);
  }

  function safeDisconnect(node) {
    try { node.disconnect(); } catch (_) { /* ya fue desconectado */ }
  }

  function destroy(active, immediate = false) {
    if (!active || !context) return;
    const now = context.currentTime;
    const finishAt = immediate ? now : now + 0.32;

    try {
      active.master.gain.cancelScheduledValues(now);
      active.master.gain.setValueAtTime(Math.max(0.0001, active.master.gain.value), now);
      active.master.gain.exponentialRampToValueAtTime(0.0001, finishAt);
    } catch (_) { /* La sesión puede haber sido cerrada durante la transición. */ }

    window.setTimeout(() => {
      active.sources.forEach(source => {
        try { source.stop(); } catch (_) { /* ya terminó */ }
        safeDisconnect(source);
      });
      active.nodes.forEach(safeDisconnect);
    }, immediate ? 0 : 380);
  }

  function attachUnlock() {
    if (unlockAttached) return;
    unlockAttached = true;
    const unlock = () => {
      ['pointerdown', 'keydown', 'touchend'].forEach(type => window.removeEventListener(type, unlock, true));
      unlockAttached = false;
      if (!pendingStart) return;
      const requested = pendingStart;
      pendingStart = null;
      void start(requested);
    };

    ['pointerdown', 'keydown', 'touchend'].forEach(type => window.addEventListener(type, unlock, { once: true, capture: true, passive: true }));
  }

  async function resume(audio) {
    if (!audio || audio.state === 'running') return Boolean(audio);
    try {
      await audio.resume();
      return audio.state === 'running';
    } catch (_) {
      return false;
    }
  }

  function createSession(state) {
    const audio = context;
    const voice = audio.createGain();
    const master = audio.createGain();
    const filter = audio.createBiquadFilter();
    const shimmer = audio.createBiquadFilter();
    const lfo = audio.createOscillator();
    const lfoDepth = audio.createGain();
    const base = frequencyFor(state.tone);
    const primary = audio.createOscillator();
    const harmonic = audio.createOscillator();
    const undertone = audio.createOscillator();
    const nodes = [voice, master, filter, shimmer, lfo, lfoDepth, primary, harmonic, undertone];
    const sources = [lfo, primary, harmonic, undertone];

    primary.type = 'sine';
    primary.frequency.value = base;
    harmonic.type = 'triangle';
    harmonic.frequency.value = base * 1.498;
    harmonic.detune.value = -9;
    undertone.type = 'sine';
    undertone.frequency.value = Math.max(55, base * 0.5);

    filter.type = 'lowpass';
    filter.frequency.value = Math.min(2900, base * 8.5);
    filter.Q.value = 0.42;
    shimmer.type = 'peaking';
    shimmer.frequency.value = Math.min(2400, base * 3.3);
    shimmer.Q.value = 0.55;
    shimmer.gain.value = 2.7;

    lfo.type = 'sine';
    lfo.frequency.value = 0.11;
    lfoDepth.gain.value = 0.018;
    lfo.connect(lfoDepth).connect(voice.gain);

    voice.gain.value = 0.12;
    master.gain.value = 0.0001;
    primary.connect(filter);
    harmonic.connect(filter);
    undertone.connect(filter);
    filter.connect(shimmer).connect(voice).connect(master);

    let kind = 'mono';
    let position = null;
    let distanceGain = null;
    if (typeof audio.createPanner === 'function') {
      try {
        position = audio.createPanner();
        position.panningModel = 'HRTF';
        position.distanceModel = 'inverse';
        position.refDistance = 1;
        position.maxDistance = 40;
        position.rolloffFactor = 0.8;
        position.coneInnerAngle = 360;
        position.coneOuterAngle = 360;
        master.connect(position).connect(audio.destination);
        nodes.push(position);
        kind = 'panner';
      } catch (_) {
        // Algunos WebViews exponen createPanner pero no lo implementan por completo.
        safeDisconnect(master);
        safeDisconnect(position);
        position = null;
      }
    }

    if (kind !== 'panner' && typeof audio.createStereoPanner === 'function') {
      distanceGain = audio.createGain();
      position = audio.createStereoPanner();
      kind = 'stereo';
      master.connect(distanceGain).connect(position).connect(audio.destination);
      nodes.push(distanceGain, position);
    } else if (kind !== 'panner') {
      distanceGain = audio.createGain();
      master.connect(distanceGain).connect(audio.destination);
      nodes.push(distanceGain);
    }

    const active = { state, master, position, distanceGain, kind, nodes, sources };
    const now = audio.currentTime;
    const targetVolume = Math.max(0.0001, state.volume * 0.115);
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(targetVolume, now + 0.45);
    return active;
  }

  async function start(options = {}) {
    const next = normalize({ ...(pendingStart || defaults), ...options });
    const audio = getContext();
    if (!audio) {
      pendingStart = next;
      event('unavailable', { reason: 'web-audio-unavailable' });
      return false;
    }

    const isRunning = await resume(audio);
    if (!isRunning) {
      pendingStart = next;
      attachUnlock();
      event('awaiting-gesture', { reason: 'audio-context-suspended' });
      return false;
    }

    pendingStart = null;
    const previous = session;
    stopMotion();
    session = null;
    destroy(previous);

    setListener(audio.listener);
    session = createSession(next);
    positionSession(next.angle, next.distance, 0.03);
    session.sources.forEach(source => source.start());
    beginMotion();
    event('started', { fallback: session.kind !== 'panner' });
    return true;
  }

  function move(angle, distance) {
    const input = (typeof angle === 'object' && angle !== null) ? angle : { angle, distance };
    const base = session ? session.state : (pendingStart || defaults);
    const next = normalize({ ...base, ...input });

    if (!session) {
      pendingStart = next;
      event('queued');
      return false;
    }

    session.state = next;
    positionSession(next.angle, next.distance, 0.16);
    event('moved');
    return true;
  }

  function stop() {
    pendingStart = null;
    stopMotion();
    const previous = session;
    session = null;
    destroy(previous);
    event('stopped', previous ? { ...previous.state, spatial: previous.kind === 'panner' } : {});
    return Boolean(previous);
  }

  window.SonoraSpatial = {
    start,
    move,
    stop,
    getState() {
      const state = session ? session.state : (pendingStart || defaults);
      return {
        ...state,
        active: Boolean(session),
        available: Boolean(AudioContextClass),
        spatial: Boolean(session && session.kind === 'panner')
      };
    }
  };
})();
