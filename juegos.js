(() => {
  const dialog = document.querySelector('#game-dialog');
  const title = document.querySelector('#game-dialog-title');
  const kicker = document.querySelector('#game-dialog-kicker');
  const description = document.querySelector('#game-dialog-description');
  const panels = document.querySelectorAll('[data-game-panel]');
  const completionVault = document.querySelector('[data-completion-vault]');
  const games = {
    radar: { kicker: '01 / FRECUENCIA', title: 'Radar de frecuencias', description: 'Tres señales; tres territorios. El desafío no es mirar las etiquetas, sino aprender a reconocer su altura.' },
    eco: { kicker: '02 / DISTANCIA', title: 'Eco o fuente', description: 'Cada retorno es una pista temporal. Necesitás leer la distancia antes de que el espacio la borre.' },
    memoria: { kicker: '03 / MEMORIA', title: 'Memoria de pulsos', description: 'Una melodía breve atraviesa la atención. Repetila sin apoyarte en ninguna imagen.' },
    jurador: { kicker: '04 / CRITERIO', title: 'El jurador', description: 'Tres situaciones de archivo. No buscás una respuesta perfecta: buscás la decisión que escucha más capas.' },
    espacio: { kicker: '05 / ESPACIO', title: 'Arquitectura del sonido', description: 'Leé una habitación sin verla: duración, absorción, distancia y silencio tienen algo para decir.' },
    mision: { kicker: '06 / ATENCIÓN', title: 'Misiones de escucha', description: 'Una consigna no termina al cerrar esta ventana. Llevála a una calle, un aula o una cocina.' },
    interferencia: { kicker: '07 / MÁSCARA', title: 'Señal entre interferencias', description: 'Dos mezclas casi idénticas. Una puede esconder una señal. Elegí con la atención, no por impulso.' },
    dilema: { kicker: '08 / CONTEXTO', title: 'Archivo fragmentado', description: 'Una grabación incompleta obliga a decidir qué conservar, qué explicar y qué no tapar.' }
  };
  const gameIds = ['radar', 'eco', 'memoria', 'jurador', 'espacio', 'mision', 'interferencia', 'dilema', 'spatial', 'hearing'];
  const progressKey = 'sonora-games-progress-v2';

  function readProgress() {
    try {
      const value = JSON.parse(localStorage.getItem(progressKey) || '[]');
      return new Set(Array.isArray(value) ? value.filter(id => typeof id === 'string') : []);
    } catch (_) {
      return new Set();
    }
  }

  const completed = readProgress();

  function saveProgress() {
    try { localStorage.setItem(progressKey, JSON.stringify([...completed])); } catch (_) { /* El recorrido queda activo durante esta sesión. */ }
  }

  function unlockAchievement(id) {
    window.SonoraAchievements?.unlock(id);
  }

  function renderFinal() {
    if (!completionVault) return;
    completionVault.hidden = !window.SonoraAchievements?.isUnlocked('final');
  }

  function checkMilestones() {
    if (['radar', 'eco', 'memoria'].every(id => completed.has(id))) unlockAchievement('jugador');
    if (gameIds.every(id => completed.has(id))) unlockAchievement('explorador');
    const required = ['silencio', 'explorador', 'jugador', 'audiofilo', 'omega'];
    if (required.every(id => window.SonoraAchievements?.isUnlocked(id))) unlockAchievement('final');
    renderFinal();
  }

  function completeExperience(id) {
    if (!id) return;
    const wasNew = !completed.has(id);
    completed.add(id);
    saveProgress();
    checkMilestones();
    if (wasNew) document.dispatchEvent(new CustomEvent('sonora:experiencecomplete', { detail: { id, completed: [...completed] } }));
  }

  window.SonoraGames = { complete: completeExperience, completed: () => [...completed] };
  document.addEventListener('sonora:experience', event => completeExperience(event.detail?.id));
  document.addEventListener('sonora:hearingcomplete', () => completeExperience('hearing'));
  document.addEventListener('sonora:achievement', checkMilestones);
  window.addEventListener('load', checkMilestones);

  function openGame(id) {
    const game = games[id];
    if (!game || !dialog) return;
    panels.forEach(panel => { panel.hidden = panel.dataset.gamePanel !== id; });
    kicker.textContent = game.kicker;
    title.textContent = game.title;
    description.textContent = game.description;
    if (id === 'jurador' || id === 'espacio' || id === 'dilema') resetDeliberation(id);
    if (!dialog.open) dialog.showModal();
  }

  document.querySelectorAll('[data-open-game]').forEach(button => button.addEventListener('click', () => openGame(button.dataset.openGame)));
  document.querySelector('[data-game-close]')?.addEventListener('click', () => dialog?.close());
  dialog?.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });

  let audio;
  function audioContext() {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    return audio;
  }

  function playTone(frequency, duration = .7, delay = 0, volume = .11) {
    const context = audioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime + delay;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + .04);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + .04);
  }

  function playNoise(delay = 0, duration = .45, volume = .038) {
    const context = audioContext();
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const now = context.currentTime + delay;
    source.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.value = 1350;
    filter.Q.value = .8;
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + .04);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    source.connect(filter).connect(gain).connect(context.destination);
    source.start(now);
  }

  function markAnswer(button, correct) {
    const group = button.closest('[role="group"]') || button.parentElement;
    group.querySelectorAll('button').forEach(item => item.classList.remove('is-correct', 'is-wrong'));
    button.classList.add(correct ? 'is-correct' : 'is-wrong');
  }

  let radarTarget;
  let radarRound = 0;
  const radarFrequencies = { grave: 130.81, medio: 440, agudo: 1174.66 };
  const radarFeedback = document.querySelector('[data-radar-feedback]');
  document.querySelector('[data-radar-listen]')?.addEventListener('click', () => {
    const zones = Object.keys(radarFrequencies);
    radarTarget = zones[Math.floor(Math.random() * zones.length)];
    playTone(radarFrequencies[radarTarget], .78);
    radarFeedback.textContent = `Señal ${radarRound + 1} de 3 emitida. Ubicala antes de que se apague.`;
  });
  document.querySelectorAll('[data-radar-answer]').forEach(button => button.addEventListener('click', () => {
    if (!radarTarget) { radarFeedback.textContent = 'Primero escuchá una señal.'; return; }
    const correct = button.dataset.radarAnswer === radarTarget;
    markAnswer(button, correct);
    if (!correct) {
      radarFeedback.textContent = 'No todavía. Volvé a escuchar la misma señal: la pista está en su altura.';
      return;
    }
    radarRound += 1;
    radarTarget = undefined;
    window.MuseumSounds?.play('c');
    if (radarRound >= 3) {
      radarFeedback.textContent = 'Radar completo. Tu oído ya trazó los tres territorios.';
      radarRound = 0;
      completeExperience('radar');
    } else radarFeedback.textContent = `Bien. Faltan ${3 - radarRound} señales: pedí la siguiente.`;
  }));

  let echoTarget;
  let echoRound = 0;
  const echoDistances = { cerca: 3, medio: 13, lejos: 23 };
  const echoFeedback = document.querySelector('[data-echo-feedback]');
  document.querySelector('[data-echo-listen]')?.addEventListener('click', () => {
    const zones = Object.keys(echoDistances);
    echoTarget = zones[Math.floor(Math.random() * zones.length)];
    window.MuseumSounds?.play('eco', { distance: echoDistances[echoTarget], reverb: 72 });
    echoFeedback.textContent = `Retorno ${echoRound + 1} de 3. Prestá atención al intervalo entre las capas.`;
  });
  document.querySelectorAll('[data-echo-answer]').forEach(button => button.addEventListener('click', () => {
    if (!echoTarget) { echoFeedback.textContent = 'Primero enviá un pulso.'; return; }
    const correct = button.dataset.echoAnswer === echoTarget;
    markAnswer(button, correct);
    if (!correct) {
      echoFeedback.textContent = 'El espacio pide otra escucha. El tiempo del retorno es la clave.';
      return;
    }
    echoRound += 1;
    echoTarget = undefined;
    window.MuseumSounds?.play('e');
    if (echoRound >= 3) {
      echoFeedback.textContent = 'Leíste el espacio. La distancia dejó tres huellas en el tiempo.';
      echoRound = 0;
      completeExperience('eco');
    } else echoFeedback.textContent = `Correcto. Quedan ${3 - echoRound} retornos por ubicar.`;
  }));

  const memoryFeedback = document.querySelector('[data-memory-feedback]');
  const memoryNotes = ['c', 'e', 'g', 'b'];
  let memorySequence = [];
  let memoryInput = [];
  let memoryLocked = false;
  const wait = milliseconds => new Promise(resolve => window.setTimeout(resolve, milliseconds));

  function lightMemoryPad(note, duration = 340) {
    const pad = document.querySelector(`[data-memory-note="${note}"]`);
    pad?.classList.add('is-lit');
    window.setTimeout(() => pad?.classList.remove('is-lit'), duration);
  }

  document.querySelector('[data-memory-start]')?.addEventListener('click', async () => {
    if (memoryLocked) return;
    memorySequence = Array.from({ length: 4 + Math.floor(Math.random() * 2) }, () => memoryNotes[Math.floor(Math.random() * memoryNotes.length)]);
    memoryInput = [];
    memoryLocked = true;
    memoryFeedback.textContent = 'Escuchá: la secuencia está pasando.';
    await wait(380);
    for (const note of memorySequence) {
      window.MuseumSounds?.play(note);
      lightMemoryPad(note, 340);
      await wait(620);
    }
    memoryLocked = false;
    memoryFeedback.textContent = `Tu turno: repetí los ${memorySequence.length} pulsos.`;
  });
  document.querySelectorAll('[data-memory-note]').forEach(button => button.addEventListener('click', () => {
    if (memoryLocked || !memorySequence.length) { memoryFeedback.textContent = 'Primero pedí una secuencia.'; return; }
    const note = button.dataset.memoryNote;
    window.MuseumSounds?.play(note);
    lightMemoryPad(note, 230);
    memoryInput.push(note);
    const index = memoryInput.length - 1;
    if (memoryInput[index] !== memorySequence[index]) {
      memoryFeedback.textContent = 'La secuencia se escapó. Pedí otra y volvé a intentarlo.';
      memorySequence = [];
      memoryInput = [];
      return;
    }
    if (memoryInput.length === memorySequence.length) {
      memoryFeedback.textContent = 'Perfecto. La melodía quedó guardada en tu memoria inmediata.';
      memorySequence = [];
      memoryInput = [];
      window.MuseumSounds?.play('g');
      completeExperience('memoria');
      return;
    }
    memoryFeedback.textContent = `Seguís bien. Quedan ${memorySequence.length - memoryInput.length} huellas.`;
  }));

  const deliberations = {
    jurador: [
      { question: 'Una voz de hace cuarenta años llega con chasquidos y respiraciones. ¿Qué decisión cuida más su historia?', options: ['Eliminar todo ruido hasta dejar una voz “limpia”.', 'Conservar el original y documentar qué capas lo rodean.', 'Subir el volumen de los chasquidos para volverlos protagonistas.'], correct: 1, reflection: 'La escucha cuidadosa no borra la materia del tiempo: la nombra y la preserva.' },
      { question: 'Una obra suena distinta para alguien que vive junto a una avenida. ¿Qué debería hacer un jurador?', options: ['Usar sólo una opinión “neutral”.', 'Atender a cómo el paisaje personal transforma la experiencia.', 'Decidir que la avenida invalida la escucha.'], correct: 1, reflection: 'No existe una escucha vacía: cada oído llega con lugares, cuerpos y recuerdos.' },
      { question: 'Una artista pide que un testimonio permanezca anónimo. ¿Qué marco respeta mejor esa petición?', options: ['Publicarlo completo porque el archivo debe ser total.', 'Editar el nombre y explicar el límite sin convertirlo en espectáculo.', 'Descartarlo sin dejar ninguna huella de contexto.'], correct: 1, reflection: 'Escuchar también es sostener un límite. El contexto puede preservarse sin exponer a quien habló.' }
    ],
    espacio: [
      { question: 'Un aplauso se prolonga mucho y vuelve varias veces. ¿Qué lectura espacial es más probable?', options: ['Un espacio amplio y reflectante.', 'Una habitación pequeña llena de telas.', 'Una fuente pegada al oído sin ninguna sala alrededor.'], correct: 0, reflection: 'Las reflexiones largas suelen delatar distancia, volumen y superficies poco absorbentes.' },
      { question: 'Una voz se vuelve opaca al cruzar una calle larga. ¿Qué detalle suele perderse primero?', options: ['Las frecuencias agudas y los contornos de las consonantes.', 'La duración total del idioma.', 'El movimiento de los labios de quien habla.'], correct: 0, reflection: 'La distancia y el aire suelen suavizar los detalles más agudos antes que el resto del sonido.' },
      { question: 'En una sala muy absorbente, el silencio parece “más cerca”. ¿Por qué?', options: ['Porque el sonido se vuelve más rápido.', 'Porque hay menos retornos que prolonguen el espacio.', 'Porque el oído deja de funcionar unos segundos.'], correct: 1, reflection: 'Cuando casi no hay reflexiones, el entorno deja menos huellas temporales alrededor de una fuente.' }
    ],
    dilema: [
      { question: 'Una grabación de plaza conserva risas, motores y la voz de una niña. Tiene ruido y cortes. ¿Cómo la archivarías?', options: ['Limpiar todo hasta dejar sólo la voz.', 'Conservar una copia original y documentar sus capas.', 'Descartarla: hay demasiadas interferencias.'], correct: 1, reflection: 'El archivo no es una vitrina muda: también guarda las condiciones que hicieron posible una escucha.' },
      { question: 'Una cinta trae un nombre de archivo equivocado, pero suena a una ceremonia barrial. ¿Qué hacés primero?', options: ['Cambiarle el título según una intuición rápida.', 'Cruzar fechas, voces y contexto antes de corregir el registro.', 'Borrar el título para que nadie haga preguntas.'], correct: 1, reflection: 'Una etiqueta organiza la memoria. Antes de modificarla, hay que escuchar las evidencias que la rodean.' },
      { question: 'Un fragmento tiene veinte segundos de “silencio” antes de una frase. ¿Qué decisión conserva mejor su sentido?', options: ['Recortarlo: el silencio no aporta datos.', 'Mantenerlo y anotar que también forma parte de la escena.', 'Reemplazarlo con música para hacerlo más interesante.'], correct: 1, reflection: 'A veces la información no está en lo que entra, sino en el espacio que lo prepara.' }
    ]
  };
  const deliberationState = { jurador: 0, espacio: 0, dilema: 0 };

  function deliberationElements(id) {
    if (id === 'jurador') return { question: document.querySelector('[data-jurador-question]'), options: document.querySelector('[data-jurador-options]'), feedback: document.querySelector('[data-jurador-feedback]') };
    if (id === 'espacio') return { question: document.querySelector('[data-space-question]'), options: document.querySelector('[data-space-options]'), feedback: document.querySelector('[data-space-feedback]') };
    return { question: document.querySelector('[data-dilemma-question]'), options: document.querySelector('[data-dilemma-options]'), feedback: document.querySelector('[data-dilemma-feedback]') };
  }

  function resetDeliberation(id) {
    deliberationState[id] = 0;
    renderDeliberation(id);
  }

  function renderDeliberation(id) {
    const items = deliberations[id];
    const step = deliberationState[id];
    const elements = deliberationElements(id);
    if (!items || !elements.question || !elements.options || !elements.feedback) return;
    const item = items[step];
    elements.question.textContent = `${step + 1} / ${items.length} · ${item.question}`;
    elements.feedback.textContent = 'No se trata de acertar rápido: se trata de sostener una decisión.';
    elements.options.innerHTML = '';
    item.options.forEach((option, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = option;
      button.addEventListener('click', () => {
        const correct = index === item.correct;
        markAnswer(button, correct);
        if (!correct) {
          elements.feedback.textContent = 'Esa elección resuelve algo, pero deja una capa importante sin escuchar. Volvé a pensarla.';
          window.MuseumSounds?.play('c');
          return;
        }
        elements.feedback.textContent = item.reflection;
        window.MuseumSounds?.play('b');
        deliberationState[id] += 1;
        if (deliberationState[id] >= items.length) {
          completeExperience(id);
          elements.feedback.textContent = `${item.reflection} Desafío completo.`;
          return;
        }
        window.setTimeout(() => renderDeliberation(id), 1100);
      });
      elements.options.append(button);
    });
  }

  const interferenceFeedback = document.querySelector('[data-interference-feedback]');
  let interferenceTarget;
  let interferenceRound = 0;
  document.querySelector('[data-interference-listen]')?.addEventListener('click', () => {
    const possibilities = ['primero', 'segundo', 'ninguno'];
    interferenceTarget = possibilities[Math.floor(Math.random() * possibilities.length)];
    playNoise(0, .47);
    playNoise(.72, .47);
    if (interferenceTarget === 'primero') playTone(714, .22, .12, .055);
    if (interferenceTarget === 'segundo') playTone(714, .22, .84, .055);
    interferenceFeedback.textContent = `Mezcla ${interferenceRound + 1} de 3. Escuchá las dos ventanas antes de responder.`;
  });
  document.querySelectorAll('[data-interference-answer]').forEach(button => button.addEventListener('click', () => {
    if (!interferenceTarget) { interferenceFeedback.textContent = 'Primero emití la mezcla.'; return; }
    const correct = button.dataset.interferenceAnswer === interferenceTarget;
    markAnswer(button, correct);
    if (!correct) {
      interferenceFeedback.textContent = 'La señal sigue ahí. No intentes ganarle al ruido: buscá su contorno.';
      return;
    }
    interferenceRound += 1;
    interferenceTarget = undefined;
    window.MuseumSounds?.play('e');
    if (interferenceRound >= 3) {
      interferenceFeedback.textContent = 'Desafío completo. Separaste una figura de su fondo sin necesidad de verla.';
      interferenceRound = 0;
      completeExperience('interferencia');
    } else interferenceFeedback.textContent = `Correcto. Quedan ${3 - interferenceRound} mezclas por descifrar.`;
  }));

  const missions = [
    'Buscá un sonido que tenga un pulso. No lo nombres durante un minuto.',
    'Cerrá los ojos en una habitación conocida. Encontrá tres distancias distintas.',
    'Elegí un ruido cotidiano y preguntate qué parte de tu cuerpo lo escucha primero.',
    'Durante una caminata, seguí un solo sonido hasta que desaparezca por completo.',
    'Escuchá el silencio entre dos palabras de alguien querido. ¿Qué espacio abre?',
    'Apoyá la mano sobre una mesa y hacé un golpe leve. Escuchá con la piel y con el oído.'
  ];
  const missionsSeen = new Set([0]);
  let missionIndex = 0;
  const missionOutput = document.querySelector('[data-mission-output]');
  document.querySelector('[data-mission-new]')?.addEventListener('click', () => {
    const next = (missionIndex + 1 + Math.floor(Math.random() * (missions.length - 1))) % missions.length;
    missionIndex = next;
    missionsSeen.add(next);
    missionOutput.textContent = missions[missionIndex];
    window.MuseumSounds?.play('paisaje');
    if (missionsSeen.size >= 4) completeExperience('mision');
  });

  const omegaDialog = document.querySelector('#omega-dialog');
  const omegaCode = ['o', 'm', 'e', 'g', 'a'];
  let omegaIndex = 0;
  let omegaTimer;
  document.addEventListener('keydown', event => {
    if (event.target.matches('input, textarea, select')) return;
    const key = event.key.toLowerCase();
    omegaIndex = key === omegaCode[omegaIndex] ? omegaIndex + 1 : key === omegaCode[0] ? 1 : 0;
    window.clearTimeout(omegaTimer);
    omegaTimer = window.setTimeout(() => { omegaIndex = 0; }, 2400);
    if (omegaIndex !== omegaCode.length) return;
    omegaIndex = 0;
    if (!omegaDialog?.open) omegaDialog?.showModal();
  });

  document.addEventListener('sonora:omegaactive', checkMilestones);
  const spectrumCode = ['s', 'o', 'n', 'o', 'r', 'a'];
  let spectrumIndex = 0;
  let spectrumTimer;
  document.addEventListener('keydown', event => {
    if (event.target.matches('input, textarea, select')) return;
    const key = event.key.toLowerCase();
    spectrumIndex = key === spectrumCode[spectrumIndex] ? spectrumIndex + 1 : key === spectrumCode[0] ? 1 : 0;
    window.clearTimeout(spectrumTimer);
    spectrumTimer = window.setTimeout(() => { spectrumIndex = 0; }, 2600);
    if (spectrumIndex !== spectrumCode.length) return;
    spectrumIndex = 0;
    document.body.classList.remove('spectrum-mode');
    void document.body.offsetWidth;
    document.body.classList.add('spectrum-mode');
    window.MuseumSounds?.play('c');
    window.setTimeout(() => window.MuseumSounds?.play('e'), 100);
    window.setTimeout(() => window.MuseumSounds?.play('g'), 200);
    window.setTimeout(() => document.body.classList.remove('spectrum-mode'), 7200);
  });
  document.querySelector('[data-completion-tone]')?.addEventListener('click', () => {
    window.MuseumSounds?.play('c');
    window.setTimeout(() => window.MuseumSounds?.play('e'), 130);
    window.setTimeout(() => window.MuseumSounds?.play('g'), 260);
    window.setTimeout(() => window.MuseumSounds?.play('b'), 390);
  });
})();
