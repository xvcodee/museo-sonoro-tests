const playButton = document.querySelector('#play-button');
const status = document.querySelector('#sound-status');
const texture = document.querySelector('#texture');
const frequency = document.querySelector('#frequency');
const frequencyOutput = document.querySelector('#frequency-output');
const consolePanel = document.querySelector('.sound-console');
let audioContext;
let masterGain;
let activeSources = [];
let toneNodes = [];
let lfo;

function setSoundState(playing) {
  playButton.setAttribute('aria-pressed', String(playing));
  playButton.querySelector('.play-icon').textContent = playing ? 'Ⅱ' : '▶';
  playButton.querySelector('.play-label').textContent = playing ? 'Pausar' : 'Escuchar';
  status.textContent = playing ? 'SONANDO' : 'EN PAUSA';
  consolePanel.classList.toggle('is-playing', playing);
}

function addTone(type, ratio = 1, volume = 0.6, detune = 0) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.value = Number(frequency.value) * ratio;
  oscillator.detune.value = detune;
  gain.gain.value = volume;
  oscillator.connect(gain).connect(masterGain);
  oscillator.start();
  activeSources.push(oscillator);
  toneNodes.push(oscillator);
}

function addNoise(volume = 0.16, filterFrequency = 1200) {
  const seconds = 2;
  const buffer = audioContext.createBuffer(1, audioContext.sampleRate * seconds, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
  const source = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();
  source.buffer = buffer;
  source.loop = true;
  filter.type = 'bandpass';
  filter.frequency.value = filterFrequency;
  filter.Q.value = 0.7;
  gain.gain.value = volume;
  source.connect(filter).connect(gain).connect(masterGain);
  source.start();
  activeSources.push(source);
}

function startSound() {
  audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioContext.createGain();
  masterGain.gain.setValueAtTime(0.0001, audioContext.currentTime);
  masterGain.gain.exponentialRampToValueAtTime(0.11, audioContext.currentTime + 0.45);
  masterGain.connect(audioContext.destination);
  activeSources = [];
  toneNodes = [];

  const sound = texture.value;
  if (sound === 'viento') {
    addTone('sine', 0.5, 0.32, -7);
    addTone('sine', 1.5, 0.22, 7);
    addNoise(0.035, 680);
  } else if (sound === 'lluvia') {
    addNoise(0.22, 2200);
    addTone('sine', 0.25, 0.15);
  } else {
    addTone(sound, 1, 0.72);
    if (sound === 'sawtooth') addTone('triangle', 0.5, 0.14);
    if (sound === 'square') addTone('sine', 2, 0.12);
  }

  lfo = audioContext.createOscillator();
  const lfoGain = audioContext.createGain();
  lfo.frequency.value = sound === 'lluvia' ? 0.7 : 0.12;
  lfoGain.gain.value = sound === 'square' ? 10 : 4;
  toneNodes.forEach(tone => lfoGain.connect(tone.frequency));
  lfo.connect(lfoGain);
  lfo.start();
  activeSources.push(lfo);
  setSoundState(true);
}

function stopSound() {
  masterGain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.25);
  activeSources.forEach(source => source.stop(audioContext.currentTime + 0.28));
  activeSources = [];
  toneNodes = [];
  setSoundState(false);
}

playButton.addEventListener('click', () => activeSources.length ? stopSound() : startSound());
texture.addEventListener('change', () => { if (activeSources.length) { stopSound(); startSound(); } });
frequency.addEventListener('input', () => {
  frequencyOutput.value = `${frequency.value} Hz`;
  frequencyOutput.textContent = `${frequency.value} Hz`;
  toneNodes.forEach((tone, index) => tone.frequency.setTargetAtTime(Number(frequency.value) * (index === 0 ? 1 : 1.5), audioContext.currentTime, 0.05));
});

const roomDetail = document.querySelector('#room-detail');
const roomDetailKind = document.querySelector('[data-room-detail-kind]');
const roomDetailTitle = document.querySelector('[data-room-detail-title]');
const roomDetailDescription = document.querySelector('[data-room-detail-description]');
const roomDetailLink = document.querySelector('[data-room-detail-link]');
const roomDetailSound = document.querySelector('[data-room-detail-sound]');
let selectedRoom;

function openRoomDetail(room) {
  selectedRoom = room;
  const title = room.querySelector('h3')?.textContent.replace(/\s+/g, ' ').trim() || 'Sala SONORA';
  const description = room.querySelector('p')?.textContent.trim() || '';
  roomDetailKind.textContent = `${room.querySelector('.room-number')?.textContent || ''} / ${room.querySelector('.room-type')?.textContent || 'SALA'}`;
  roomDetailTitle.textContent = title;
  roomDetailDescription.textContent = `${description} Abrí esta sala para escuchar su pulso y descubrir las obras relacionadas en el archivo completo.`;
  roomDetailLink.href = `coleccion.html?territorio=${encodeURIComponent(room.dataset.sound)}`;
  roomDetail?.showModal();
}

document.querySelectorAll('.room').forEach(room => {
  const playRoomSound = () => window.MuseumSounds?.play(room.dataset.sound);
  room.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') playRoomSound(); });
  room.addEventListener('click', () => { playRoomSound(); openRoomDetail(room); });
  room.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); room.click(); } });
});

roomDetailSound?.addEventListener('click', () => window.MuseumSounds?.play(selectedRoom?.dataset.sound));
document.querySelector('[data-room-detail-close]')?.addEventListener('click', () => roomDetail?.close());
roomDetail?.addEventListener('click', event => { if (event.target === roomDetail) roomDetail.close(); });

const resonanceConsole = document.querySelector('#resonance-console');
const resonanceStatus = document.querySelector('#resonance-status');
const resonanceIntensity = document.querySelector('#resonance-intensity');
const resonanceOutput = document.querySelector('#resonance-output');
const resonanceNotes = { c: 'TIERRA · DO', e: 'AIRE · MI', g: 'AGUA · SOL', b: 'LUZ · SI' };
const scoreNotes = document.querySelector('#score-notes');
const composition = [];

document.querySelectorAll('.resonance-pad').forEach(pad => {
  const playResonance = () => {
    const note = pad.dataset.note;
    window.MuseumSounds?.play(note);
    resonanceConsole.classList.remove('is-resonating');
    void resonanceConsole.offsetWidth;
    resonanceConsole.classList.add('is-resonating');
    resonanceStatus.textContent = resonanceNotes[note];
    pad.classList.add('is-active');
    composition.push(note.toUpperCase());
    if (composition.length > 6) composition.shift();
    if (scoreNotes) scoreNotes.innerHTML = Array.from({ length: 6 }, (_, index) => {
      const value = composition[index] || '—';
      return `<i class="${value === '—' ? '' : 'is-note'}">${value}</i>`;
    }).join('');
    setTimeout(() => pad.classList.remove('is-active'), 900);
  };
  pad.addEventListener('click', playResonance);
  pad.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') playResonance(); });
});

resonanceIntensity?.addEventListener('input', () => {
  resonanceConsole.style.setProperty('--resonance-intensity', `${resonanceIntensity.value / 100}`);
  resonanceOutput.textContent = `${resonanceIntensity.value}%`;
});

document.querySelector('#resonance-clear')?.addEventListener('click', () => {
  resonanceStatus.textContent = 'COMPOSICIÓN REINICIADA';
  resonanceConsole.classList.remove('is-resonating');
  composition.length = 0;
  if (scoreNotes) scoreNotes.innerHTML = '<i>—</i><i>—</i><i>—</i><i>—</i><i>—</i><i>—</i>';
});

const silenceKey = document.querySelector('#silence-key');
const silenceVolume = document.querySelector('#silence-volume');
const silenceDistortion = document.querySelector('#silence-distortion');
const silenceVolumeOutput = document.querySelector('#silence-volume-output');
const silenceDistortionOutput = document.querySelector('#silence-distortion-output');
const silenceStatus = document.querySelector('#silence-status');
const silenceRoots = { C: 261.63, D: 293.66, E: 329.63, F: 349.23, G: 392, A: 440 };
const silenceScale = [0, 2, 4, 7, 9, 12, 14, 16, 19];
const chromaticNames = ['DO', 'DO♯', 'RE', 'RE♯', 'MI', 'FA', 'FA♯', 'SOL', 'SOL♯', 'LA', 'LA♯', 'SI'];
let silenceAudio;
let silenceGain;
let silenceDrive;

function distortionCurve(amount) {
  const points = 44100;
  const curve = new Float32Array(points);
  const k = amount * 1.4 + 1;
  for (let index = 0; index < points; index += 1) {
    const x = index * 2 / points - 1;
    curve[index] = ((3 + k) * x * 20 * Math.PI / 180) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

function setupSilenceStudio() {
  silenceAudio = silenceAudio || new (window.AudioContext || window.webkitAudioContext)();
  if (!silenceGain) {
    silenceGain = silenceAudio.createGain();
    silenceDrive = silenceAudio.createWaveShaper();
    silenceDrive.oversample = '4x';
    silenceDrive.connect(silenceGain).connect(silenceAudio.destination);
  }
  if (silenceAudio.state === 'suspended') silenceAudio.resume();
  silenceGain.gain.value = Number(silenceVolume.value) / 100 * .15;
  silenceDrive.curve = distortionCurve(Number(silenceDistortion.value));
}

function refreshSilenceNotes() {
  const root = silenceRoots[silenceKey.value];
  document.querySelectorAll('.silence-note').forEach(note => {
    const frequency = root * 2 ** (silenceScale[Number(note.dataset.step)] / 12);
    const midi = Math.round(69 + 12 * Math.log2(frequency / 440));
    note.textContent = chromaticNames[(midi % 12 + 12) % 12];
  });
}

function playSilenceNote(step, button) {
  setupSilenceStudio();
  const frequency = silenceRoots[silenceKey.value] * 2 ** (silenceScale[step] / 12);
  const oscillator = silenceAudio.createOscillator();
  const overtone = silenceAudio.createOscillator();
  const envelope = silenceAudio.createGain();
  oscillator.type = 'triangle';
  overtone.type = 'sine';
  oscillator.frequency.value = frequency;
  overtone.frequency.value = frequency * 2;
  const now = silenceAudio.currentTime;
  envelope.gain.setValueAtTime(.0001, now);
  envelope.gain.exponentialRampToValueAtTime(.74, now + .045);
  envelope.gain.exponentialRampToValueAtTime(.0001, now + 1.35);
  oscillator.connect(envelope).connect(silenceDrive);
  overtone.connect(envelope);
  oscillator.start(now); overtone.start(now);
  oscillator.stop(now + 1.4); overtone.stop(now + 1.4);
  button.classList.add('is-active');
  setTimeout(() => button.classList.remove('is-active'), 420);
  silenceStatus.textContent = `${button.textContent} / CLAVE ${silenceKey.value}`;
}

const silenceVisited = new Set();
document.querySelectorAll('.silence-note').forEach(button => button.addEventListener('click', () => {
  playSilenceNote(Number(button.dataset.step), button);
  silenceVisited.add(button.dataset.step);
  if (silenceVisited.size >= 9) window.SonoraAchievements?.unlock('silencio');
}));
silenceKey?.addEventListener('change', refreshSilenceNotes);
silenceVolume?.addEventListener('input', () => {
  silenceVolumeOutput.textContent = `${silenceVolume.value}%`;
  if (silenceGain) silenceGain.gain.setTargetAtTime(Number(silenceVolume.value) / 100 * .15, silenceAudio.currentTime, .03);
});
silenceDistortion?.addEventListener('input', () => {
  silenceDistortionOutput.textContent = `${silenceDistortion.value}%`;
  if (silenceDrive) silenceDrive.curve = distortionCurve(Number(silenceDistortion.value));
});
refreshSilenceNotes();

document.querySelectorAll('.track-card').forEach(card => {
  card.addEventListener('click', () => {
    const track = card.dataset.track;
    window.AmbientMusic?.select(track);
    window.MuseumSounds?.play('memoria');
    document.querySelectorAll('.track-card').forEach(item => item.classList.toggle('is-selected', item === card));
  });
});

document.addEventListener('sonora:trackchange', event => {
  document.querySelectorAll('.track-card').forEach(card => card.classList.toggle('is-selected', card.dataset.track === event.detail.id));
});
document.querySelectorAll('.track-card').forEach(card => card.classList.toggle('is-selected', card.dataset.track === window.AmbientMusic?.current()));

const echoChamber = document.querySelector('#echo-chamber');
const echoPulse = document.querySelector('#echo-pulse');
const echoDistance = document.querySelector('#echo-distance');
const echoReverb = document.querySelector('#echo-reverb');
const echoDistanceOutput = document.querySelector('#echo-distance-output');
const echoReverbOutput = document.querySelector('#echo-reverb-output');
const echoDistanceLabel = document.querySelector('#echo-distance-label');
const echoStatus = document.querySelector('#echo-status');

function updateEchoChamber() {
  if (!echoChamber) return;
  const distance = Number(echoDistance?.value || 9);
  const reverb = Number(echoReverb?.value || 64);
  echoChamber.style.setProperty('--echo-distance', String(.58 + distance / 15));
  echoChamber.style.setProperty('--echo-reverb', String(.16 + reverb / 120));
  echoDistanceOutput.textContent = `${String(distance).padStart(2, '0')} m`;
  echoDistanceLabel.textContent = `${String(distance).padStart(2, '0')} M`;
  echoReverbOutput.textContent = `${reverb}%`;
}

function sendEchoPulse() {
  if (!echoChamber) return;
  const distance = Number(echoDistance?.value || 9);
  const reverb = Number(echoReverb?.value || 64);
  window.MuseumSounds?.play('eco', { distance, reverb });
  echoChamber.classList.remove('is-echoing');
  void echoChamber.offsetWidth;
  echoChamber.classList.add('is-echoing');
  echoPulse?.setAttribute('aria-pressed', 'true');
  echoStatus.textContent = `RETORNO A ${String(distance).padStart(2, '0')} M / ${reverb}% DE AIRE`;
  window.setTimeout(() => {
    echoChamber.classList.remove('is-echoing');
    echoPulse?.setAttribute('aria-pressed', 'false');
    echoStatus.textContent = 'EL ESPACIO ESTÁ EN CALMA';
  }, 2100);
}

echoPulse?.addEventListener('click', sendEchoPulse);
echoDistance?.addEventListener('input', updateEchoChamber);
echoReverb?.addEventListener('input', updateEchoChamber);
echoChamber?.addEventListener('pointermove', event => {
  const bounds = echoChamber.getBoundingClientRect();
  echoChamber.style.setProperty('--echo-x', `${((event.clientX - bounds.left) / bounds.width * 100).toFixed(1)}%`);
  echoChamber.style.setProperty('--echo-y', `${((event.clientY - bounds.top) / bounds.height * 100).toFixed(1)}%`);
});
echoChamber?.addEventListener('pointerleave', () => {
  echoChamber.style.setProperty('--echo-x', '50%');
  echoChamber.style.setProperty('--echo-y', '47%');
});
updateEchoChamber();

const paywall = document.querySelector('#visit-paywall');
document.querySelectorAll('[data-paywall-open]').forEach(button => button.addEventListener('click', () => paywall?.showModal()));
document.querySelector('[data-paywall-close]')?.addEventListener('click', () => paywall?.close());
paywall?.addEventListener('click', event => { if (event.target === paywall) paywall.close(); });

const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
menuToggle.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!open));
  navigation.classList.toggle('open', !open);
});
navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  navigation.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
}));
