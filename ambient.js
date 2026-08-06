(() => {
  const tracks = {
    nocturne: {
      title: 'Nocturno Op. 9 n.º 2 — Chopin',
      src: 'https://upload.wikimedia.org/wikipedia/commons/5/50/Nocturne_Op._9_no._2_in_E_flat_major.mp3'
    },
    gymnopedie: {
      title: 'Gymnopédie n.º 1 — Satie',
      src: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Gymnopedie%20No%201.mp3'
    },
    moonlight: {
      title: 'Claro de luna — Beethoven',
      src: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Sonate_Clair_de_lune.ogg'
    }
  };
  const music = document.querySelector('#ambient-music');
  const toggle = document.querySelector('#ambient-toggle');
  const header = document.querySelector('.site-header');
  const scrollCue = document.querySelector('.scroll-cue');
  if (!music || !toggle) return;

  music.volume = .16;
  let enabled = sessionStorage.getItem('sonora-ambient') === 'on';
  let trackId = sessionStorage.getItem('sonora-ambient-track') || 'nocturne';
  let restoredPosition = Number(sessionStorage.getItem(`sonora-position-${trackId}`) || 0);
  let lastStoredSecond = -1;

  function updateButton() {
    const active = !music.paused;
    toggle.setAttribute('aria-pressed', String(active));
    toggle.querySelector('b').textContent = active ? 'ON' : 'OFF';
    toggle.classList.toggle('is-on', active);
    toggle.title = active ? 'Silenciar música ambiental' : 'Activar música ambiental';
  }

  function storePosition() {
    if (Number.isFinite(music.currentTime)) sessionStorage.setItem(`sonora-position-${trackId}`, String(music.currentTime));
  }

  function loadTrack(id, position = 0) {
    if (!tracks[id]) return;
    trackId = id;
    restoredPosition = position;
    sessionStorage.setItem('sonora-ambient-track', id);
    music.src = tracks[id].src;
    music.load();
    document.dispatchEvent(new CustomEvent('sonora:trackchange', { detail: { id, ...tracks[id] } }));
  }

  function start() {
    music.play().then(() => {
      enabled = true;
      sessionStorage.setItem('sonora-ambient', 'on');
      updateButton();
    }).catch(updateButton);
  }

  function stop() {
    storePosition();
    music.pause();
    enabled = false;
    sessionStorage.setItem('sonora-ambient', 'off');
    updateButton();
  }

  music.addEventListener('loadedmetadata', () => {
    if (restoredPosition > 0 && restoredPosition < music.duration - 2) music.currentTime = restoredPosition;
    restoredPosition = 0;
    if (enabled) start();
  });
  music.addEventListener('timeupdate', () => {
    const second = Math.floor(music.currentTime);
    if (second !== lastStoredSecond && second % 2 === 0) { lastStoredSecond = second; storePosition(); }
  });
  window.addEventListener('pagehide', storePosition);

  toggle.addEventListener('click', () => (music.paused ? start() : stop()));
  document.addEventListener('pointerdown', event => {
    if (!event.target.closest('#ambient-toggle') && music.paused) start();
  }, { once: true });

  let lastScroll = Math.max(window.scrollY, 0);
  let scrollDirection = 0;
  let directionDistance = 0;
  let ticking = false;
  const stickyStart = 115;
  const directionThreshold = 12;

  function setHeaderOffset() {
    if (header) document.documentElement.style.setProperty('--sticky-header-height', `${header.offsetHeight}px`);
  }

  function updateScrollUI() {
    const current = Math.max(window.scrollY, 0);
    const difference = current - lastScroll;
    const nextDirection = difference > 0 ? 1 : difference < 0 ? -1 : 0;
    const pastIntro = current > stickyStart;

    if (pastIntro && nextDirection) {
      if (nextDirection !== scrollDirection) directionDistance = 0;
      scrollDirection = nextDirection;
      directionDistance += Math.abs(difference);

      if (directionDistance >= directionThreshold) {
        header?.classList.add('is-sticky');
        header?.classList.toggle('is-revealed', nextDirection === -1);
        document.body.classList.add('has-sticky-header');
        directionDistance = 0;
      }
    } else if (!pastIntro) {
      header?.classList.remove('is-sticky', 'is-revealed');
      document.body.classList.remove('has-sticky-header');
      scrollDirection = 0;
      directionDistance = 0;
    }

    scrollCue?.classList.toggle('is-hidden', current > 42);
    lastScroll = current;
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { window.requestAnimationFrame(updateScrollUI); ticking = true; }
  }, { passive: true });
  setHeaderOffset();
  window.addEventListener('resize', setHeaderOffset, { passive: true });
  updateScrollUI();

  loadTrack(trackId, restoredPosition);
  if (!enabled) updateButton();
  window.AmbientMusic = {
    select(id) {
      if (!tracks[id]) return;
      stop();
      sessionStorage.removeItem(`sonora-position-${id}`);
      enabled = true;
      loadTrack(id, 0);
      start();
    },
    current: () => trackId,
    tracks
  };
})();
