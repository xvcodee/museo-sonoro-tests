(() => {
  const player = document.querySelector('#emotion-player');
  const cards = document.querySelectorAll('.emotion-card');
  const status = document.querySelector('#emotion-status');
  if (!player || !cards.length) return;
  const scenes = {
    miedo: { title: 'MIEDO / TORMENTA A DISTANCIA', src: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Rainthunderandbirds.ogg' },
    felicidad: { title: 'FELICIDAD / RISAS COMPARTIDAS', src: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Small_group_laughter.ogg' },
    tristeza: { title: 'TRISTEZA / LLUVIA EN LA VENTANA', src: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Rain_against_the_window.ogg' },
    calma: { title: 'CALMA / LLUVIA CERCANA', src: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Rain.ogg' }
  };
  player.volume = .72;
  function setActive(card, active) { cards.forEach(item => item.classList.toggle('is-playing', active && item === card)); }
  cards.forEach(card => card.addEventListener('click', () => {
    const emotion = card.dataset.emotion;
    const scene = scenes[emotion];
    if (card.classList.contains('is-playing')) {
      player.pause();
      setActive(card, false);
      status.textContent = 'ESCENA EN PAUSA';
      return;
    }
    player.src = scene.src;
    player.play().then(() => { setActive(card, true); status.textContent = scene.title; }).catch(() => { status.textContent = 'PRESIONÁ OTRA VEZ PARA INICIAR LA ESCENA'; });
  }));
  player.addEventListener('ended', () => { cards.forEach(card => card.classList.remove('is-playing')); status.textContent = 'SELECCIONÁ UNA ESCENA PARA ESCUCHARLA'; });
})();
