(() => {
  const api = window.SonoraAchievements;
  const grid = document.querySelector('[data-registry-grid]');
  const count = document.querySelector('[data-registry-count]');
  const ring = document.querySelector('[data-registry-ring]');
  const label = document.querySelector('[data-registry-label]');
  const percentage = document.querySelector('[data-registry-percentage]');
  const nextTier = document.querySelector('[data-next-tier]');
  const nextTitle = document.querySelector('[data-next-title]');
  const nextDescription = document.querySelector('[data-next-description]');
  const nextLink = document.querySelector('[data-next-link]');
  const motionButton = document.querySelector('[data-page-motion]');
  if (!api || !grid) return;

  const guidance = {
    silencio: { tier: 'SALA 04 / UMBRAL', description: 'Recorré el instrumento colectivo con paciencia: hay una forma de atravesar el silencio sin apurarlo.', href: 'index.html#sala-cuatro', action: 'Volver a Sala 04' },
    jugador: { tier: 'GABINETE / ENTRENAMIENTO', description: 'Las primeras señales aparecen cuando resolvés desafíos usando el oído antes que la vista.', href: 'juegos.html#catalogo', action: 'Entrar al gabinete' },
    explorador: { tier: 'RECORRIDO / COMPLETO', description: 'Todavía hay experiencias que no visitaste. El archivo registra la curiosidad sostenida.', href: 'juegos.html#catalogo', action: 'Continuar explorando' },
    audiofilo: { tier: 'UMBRALES / PLATINO', description: 'Compará perfiles de escucha y orientá fuentes en el campo espacial para recuperar más matices.', href: 'juegos.html#umbrales', action: 'Abrir umbrales' },
    omega: { tier: 'SEÑAL / FUERA DE CATÁLOGO', description: 'Hay registros que no se anuncian en las cartelas. Seguí las anomalías del museo.', href: 'juegos.html', action: 'Volver al gabinete' },
    final: { tier: 'ARCHIVO / FINAL', description: 'Una última puerta se abre cuando las demás señales ya encontraron su lugar.', href: 'juegos.html', action: 'Seguir la señal' }
  };
  let filter = 'all';

  function dateLabel(value) {
    if (!value) return 'SEÑAL AÚN NO RECUPERADA';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'SEÑAL RECUPERADA';
    return `RECUPERADO · ${new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date).toUpperCase()}`;
  }

  function render() {
    const items = api.getAll();
    const unlocked = items.filter(item => item.unlocked);
    const total = items.length;
    const ratio = total ? unlocked.length / total : 0;
    count.textContent = String(unlocked.length);
    ring.style.setProperty('--registry-progress', `${Math.round(ratio * 360)}deg`);
    label.textContent = unlocked.length === total ? 'El archivo está completo.' : `${unlocked.length} ${unlocked.length === 1 ? 'señal recuperada.' : 'señales recuperadas.'}`;
    percentage.textContent = `${Math.round(ratio * 100)}% del archivo personal explorado.`;

    const next = items.find(item => !item.unlocked);
    const hint = guidance[next?.id] || guidance.final;
    nextTier.textContent = next ? hint.tier : 'REGISTRO COMPLETO';
    nextTitle.textContent = next ? next.title : 'El museo reconoció tu recorrido.';
    nextDescription.textContent = next ? hint.description : 'No se cerró nada: simplemente ahora sabés dónde escuchar cuando el mundo parezca callado.';
    nextLink.href = hint.href;
    nextLink.innerHTML = `${next ? hint.action : 'Volver a escuchar'} <b>↗</b>`;

    const visibleItems = items.filter(item => filter === 'all' || (filter === 'unlocked' && item.unlocked) || (filter === 'locked' && !item.unlocked));
    grid.innerHTML = visibleItems.length ? visibleItems.map(item => {
      return `<article class="registry-achievement${item.unlocked ? ' is-unlocked' : ''}" data-tier="${item.tier}">
        <p class="registry-achievement-top"><span>${item.tier}</span><span>${item.unlocked ? 'recuperado' : 'en espera'}</span></p>
        <span class="registry-achievement-glyph" aria-hidden="true">${item.glyph}</span>
        <h3>${item.title}</h3>
        <p>${item.description}</p>
        <time>${dateLabel(item.unlockedAt)}</time>
      </article>`;
    }).join('') : `<p class="registry-empty" style="grid-column:1 / -1;margin:0;padding:clamp(2rem,5vw,4.5rem);border:1px dashed rgba(241,236,224,.35);color:#b6e2ff;font-family:var(--mono);font-size:.76rem;line-height:1.8;letter-spacing:.06em;text-align:center">Todavía no hay señales en esta vista. El museo no tiene prisa: volvé cuando encuentres una nueva forma de escuchar.</p>`;
  }

  function refreshMotionButton() {
    const reduced = document.documentElement.dataset.motion === 'reduced';
    motionButton?.setAttribute('aria-pressed', String(reduced));
    if (motionButton) motionButton.textContent = reduced ? 'Activar movimiento' : 'Reducir movimiento';
  }

  document.querySelectorAll('[data-registry-filter]').forEach(button => button.addEventListener('click', () => {
    filter = button.dataset.registryFilter;
    document.querySelectorAll('[data-registry-filter]').forEach(item => item.classList.toggle('is-active', item === button));
    render();
  }));
  motionButton?.addEventListener('click', () => {
    api.setMotionPreference(document.documentElement.dataset.motion !== 'reduced');
    refreshMotionButton();
  });
  document.addEventListener('sonora:achievement', render);
  window.addEventListener('storage', event => { if (event.key === 'sonora-achievements-v1') render(); });
  refreshMotionButton();
  render();
})();
