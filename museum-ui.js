(() => {
  const themeButtons = document.querySelectorAll('[data-theme-toggle]');
  const root = document.documentElement;

  function setTheme(theme) {
    const dark = theme === 'dark';
    root.dataset.theme = dark ? 'dark' : 'light';
    themeButtons.forEach(button => {
      button.setAttribute('aria-pressed', String(dark));
      button.setAttribute('aria-label', dark ? 'Desactivar modo oscuro' : 'Activar modo oscuro');
      button.querySelector('b').textContent = dark ? 'Claro' : 'Oscuro';
    });
    try { localStorage.setItem('sonora-theme-v2', dark ? 'dark' : 'light'); } catch (_) { /* El modo sigue funcionando sin almacenamiento. */ }
  }

  let storedTheme = 'dark';
  try { storedTheme = localStorage.getItem('sonora-theme-v2') || 'dark'; } catch (_) { /* Sin acceso a almacenamiento local. */ }
  setTheme(storedTheme);
  themeButtons.forEach(button => button.addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark')));

  const simpleMenu = document.querySelector('[data-simple-menu]');
  const simpleNavigation = document.querySelector('#navigation');
  simpleMenu?.addEventListener('click', () => {
    const open = simpleMenu.getAttribute('aria-expanded') === 'true';
    simpleMenu.setAttribute('aria-expanded', String(!open));
    simpleNavigation?.classList.toggle('open', !open);
  });
  simpleNavigation?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    simpleNavigation.classList.remove('open');
    simpleMenu?.setAttribute('aria-expanded', 'false');
  }));

  async function copyText(value) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
    const helper = document.createElement('textarea');
    helper.value = value;
    helper.setAttribute('readonly', '');
    helper.style.position = 'fixed';
    helper.style.opacity = '0';
    document.body.append(helper);
    helper.select();
    const copied = document.execCommand('copy');
    helper.remove();
    if (!copied) throw new Error('copy-failed');
  }

  document.querySelectorAll('[data-contact-email]').forEach(button => {
    const label = button.textContent.trim();
    button.addEventListener('click', async () => {
      try {
        await copyText(button.dataset.contactEmail);
        button.textContent = 'Email copiado';
        button.classList.add('is-copied');
      } catch (_) {
        button.textContent = 'Copiá: riojinzxc@gmail.com';
      }
      window.setTimeout(() => {
        button.textContent = label;
        button.classList.remove('is-copied');
      }, 2200);
    });
  });

  function toast(message) {
    const item = document.createElement('p');
    item.className = 'konami-toast';
    item.textContent = message;
    document.body.append(item);
    window.setTimeout(() => item.remove(), 4200);
  }

  const konami = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let konamiIndex = 0;
  let konamiTimer;
  document.addEventListener('keydown', event => {
    if (event.target.matches('input, textarea, select')) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    konamiIndex = key === konami[konamiIndex] ? konamiIndex + 1 : key === konami[0] ? 1 : 0;
    window.clearTimeout(konamiTimer);
    konamiTimer = window.setTimeout(() => { konamiIndex = 0; }, 2500);
    if (konamiIndex !== konami.length) return;
    konamiIndex = 0;
    document.body.classList.remove('konami-mode');
    void document.body.offsetWidth;
    document.body.classList.add('konami-mode');
    window.MuseumSounds?.play('c');
    window.setTimeout(() => window.MuseumSounds?.play('e'), 130);
    window.setTimeout(() => window.MuseumSounds?.play('g'), 260);
    window.setTimeout(() => window.MuseumSounds?.play('b'), 390);
    const stage = document.createElement('div');
    stage.className = 'konami-stage';
    stage.setAttribute('aria-hidden', 'true');
    stage.innerHTML = '<span>SECUENCIA ENCONTRADA</span><div><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><b>SONORA // MODO CONSTELACIÓN</b>';
    document.body.append(stage);
    document.querySelectorAll('.room, .archive-work').forEach((item, index) => {
      window.setTimeout(() => item.classList.add('is-konami-lit'), index * 85);
      window.setTimeout(() => item.classList.remove('is-konami-lit'), 7600 + index * 40);
    });
    toast('El museo respondió a tu secuencia.');
    window.setTimeout(() => stage.remove(), 10500);
    window.setTimeout(() => document.body.classList.remove('konami-mode'), 11000);
  });

  const secretTrigger = document.querySelector('[data-secret-trigger]');
  const secretRoom = document.querySelector('#secret-room');
  let secretTaps = 0;
  let secretTimer;
  secretTrigger?.addEventListener('click', () => {
    secretTaps += 1;
    window.clearTimeout(secretTimer);
    secretTimer = window.setTimeout(() => { secretTaps = 0; }, 1800);
    if (secretTaps < 5) return;
    secretTaps = 0;
    if (typeof secretRoom?.showModal === 'function') secretRoom.showModal();
  });
  document.querySelector('[data-secret-close]')?.addEventListener('click', () => secretRoom?.close());
  secretRoom?.addEventListener('click', event => { if (event.target === secretRoom) secretRoom.close(); });

  const scrollProgress = document.createElement('div');
  scrollProgress.className = 'scroll-progress';
  scrollProgress.setAttribute('aria-hidden', 'true');
  scrollProgress.innerHTML = '<span></span>';
  document.body.append(scrollProgress);
  const updateScrollProgress = () => {
    const availableScroll = document.documentElement.scrollHeight - window.innerHeight;
    const progress = availableScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / availableScroll)) : 0;
    scrollProgress.firstElementChild.style.transform = `scaleX(${progress})`;
  };
  window.addEventListener('scroll', updateScrollProgress, { passive: true });
  window.addEventListener('resize', updateScrollProgress);
  updateScrollProgress();
})();
