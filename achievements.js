(() => {
  'use strict';

  if (window.SonoraAchievements) return;

  const storageKey = 'sonora-achievements-v1';
  const definitions = Object.freeze([
    {
      id: 'silencio',
      title: 'Sobreviviste al silencio',
      description: 'Permaneciste cuando la escucha dejó de ofrecer certezas.',
      glyph: '◌',
      tier: 'umbral'
    },
    {
      id: 'explorador',
      title: 'Experimentaste todo',
      description: 'Recorriste cada dispositivo y no dejaste una escucha atrás.',
      glyph: '↗',
      tier: 'recorrido'
    },
    {
      id: 'jugador',
      title: 'Jugador auditivo',
      description: 'Aprendiste a decidir con los oídos antes que con los ojos.',
      glyph: '∿',
      tier: 'juego'
    },
    {
      id: 'audiofilo',
      title: 'Audiófilo profesional',
      description: 'Afinaste tu criterio hasta descubrir matices que otros pasan por alto.',
      glyph: '✦',
      tier: 'platino'
    },
    {
      id: 'omega',
      title: 'ARCHIVO Ω-17 encontrado',
      description: 'Escuchaste algo que no figuraba en el recorrido oficial.',
      glyph: 'Ω',
      tier: 'clasificado'
    },
    {
      id: 'final',
      title: 'Final secreto desbloqueado',
      description: 'El museo entendió que estabas listo para oír su última señal.',
      glyph: '✺',
      tier: 'final'
    }
  ]);
  const definitionById = new Map(definitions.map(item => [item.id, item]));
  let stored = readStorage();
  let ui = null;
  let toastTimer = null;

  function readStorage() {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) || '{}');
      if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
      return Object.fromEntries(Object.entries(value).filter(([id, time]) => definitionById.has(id) && typeof time === 'string'));
    } catch (_) {
      return {};
    }
  }

  function saveStorage() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(stored));
    } catch (_) {
      // El museo sigue mostrando los logros durante la sesión si el navegador bloquea el almacenamiento.
    }
  }

  function itemFor(definition) {
    const unlockedAt = stored[definition.id] || null;
    return { ...definition, unlocked: Boolean(unlockedAt), unlockedAt };
  }

  function getAll() {
    return definitions.map(itemFor);
  }

  function isUnlocked(id) {
    return Boolean(stored[id] && definitionById.has(id));
  }

  function unlockedCount() {
    return definitions.reduce((total, item) => total + Number(isUnlocked(item.id)), 0);
  }

  function unlock(id) {
    const definition = definitionById.get(id);
    if (!definition || isUnlocked(id)) {
      refreshUI();
      return false;
    }

    stored[id] = new Date().toISOString();
    saveStorage();
    const achievement = itemFor(definition);
    const detail = {
      achievement,
      totalUnlocked: unlockedCount(),
      totalAvailable: definitions.length,
      complete: unlockedCount() === definitions.length
    };
    document.dispatchEvent(new CustomEvent('sonora:achievement', { detail, bubbles: true }));
    refreshUI();
    announceUnlock(achievement);
    return achievement;
  }

  function ensureStyles() {
    if (document.querySelector('link[data-sonora-achievements-style], link[href*="achievements.css"]')) return;
    const source = document.currentScript || [...document.scripts].find(script => /achievements\.js(?:\?|$)/.test(script.src));
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.dataset.sonoraAchievementsStyle = 'true';
    stylesheet.href = source?.src ? new URL('achievements.css', source.src).href : 'achievements.css';
    document.head.append(stylesheet);
  }

  function mount() {
    if (ui || !document.body) return;
    ensureStyles();

    const launcher = document.createElement('button');
    launcher.type = 'button';
    launcher.className = 'sonora-achievements-launcher';
    launcher.setAttribute('aria-haspopup', 'dialog');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.setAttribute('aria-label', 'Abrir logros de SONORA');
    launcher.innerHTML = '<span class="sonora-achievements-launcher-mark" aria-hidden="true">✦</span><strong>Logros</strong><span class="sonora-achievements-count" data-achievement-count>0</span>';

    const dialog = document.createElement('dialog');
    dialog.className = 'sonora-achievements-dialog';
    dialog.setAttribute('aria-labelledby', 'sonora-achievements-title');
    dialog.innerHTML = [
      '<div class="sonora-achievements-dialog-inner">',
      '  <button class="sonora-achievements-close" type="button" aria-label="Cerrar logros">×</button>',
      '  <header class="sonora-achievements-head">',
      '    <div>',
      '      <p class="sonora-achievements-kicker">Registro de escucha / personal</p>',
      '      <h2 id="sonora-achievements-title">Señales <em>descubiertas.</em></h2>',
      '    </div>',
      '    <p class="sonora-achievements-summary"><b data-achievement-summary>0 / 6</b>logros recuperados</p>',
      '  </header>',
      '  <div class="sonora-achievements-progress" aria-hidden="true"><span data-achievement-progress></span></div>',
      '  <section class="sonora-achievements-grid" data-achievement-grid aria-label="Lista de logros"></section>',
      '  <p class="sonora-achievement-all" data-achievement-all><b>Consejo:</b> algunos registros sólo aparecen cuando el museo siente que los buscaste de verdad.</p>',
      '</div>'
    ].join('');

    const live = document.createElement('div');
    live.className = 'sonora-achievements-live';
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    document.body.append(launcher, dialog, live);

    ui = {
      launcher,
      dialog,
      live,
      count: launcher.querySelector('[data-achievement-count]'),
      summary: dialog.querySelector('[data-achievement-summary]'),
      progress: dialog.querySelector('[data-achievement-progress]'),
      grid: dialog.querySelector('[data-achievement-grid]'),
      all: dialog.querySelector('[data-achievement-all]')
    };

    launcher.addEventListener('click', () => dialog.open ? close() : open());
    dialog.querySelector('.sonora-achievements-close').addEventListener('click', close);
    dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
    dialog.addEventListener('close', () => launcher.setAttribute('aria-expanded', 'false'));
    dialog.addEventListener('cancel', () => launcher.setAttribute('aria-expanded', 'false'));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && dialog.classList.contains('is-fallback-open')) close();
    });
    refreshUI();
  }

  function open() {
    mount();
    if (!ui) return;
    if (typeof ui.dialog.showModal === 'function') {
      if (!ui.dialog.open) ui.dialog.showModal();
    } else {
      ui.dialog.classList.add('is-fallback-open');
      ui.dialog.setAttribute('open', '');
    }
    ui.launcher.setAttribute('aria-expanded', 'true');
    ui.dialog.querySelector('.sonora-achievements-close')?.focus();
  }

  function close() {
    if (!ui) return;
    if (typeof ui.dialog.close === 'function' && ui.dialog.open) ui.dialog.close();
    ui.dialog.classList.remove('is-fallback-open');
    ui.dialog.removeAttribute('open');
    ui.launcher.setAttribute('aria-expanded', 'false');
    ui.launcher.focus();
  }

  function refreshUI() {
    if (!ui) return;
    const total = unlockedCount();
    ui.count.textContent = String(total);
    ui.summary.textContent = `${total} / ${definitions.length}`;
    ui.progress.style.transform = `scaleX(${total / definitions.length})`;
    ui.grid.innerHTML = getAll().map(item => [
      `<article class="sonora-achievement-card${item.unlocked ? ' is-unlocked' : ''}" data-tier="${item.tier}" data-achievement-id="${item.id}">`,
      `  <p class="sonora-achievement-status"><span>${item.tier}</span><span>${item.unlocked ? 'recuperado' : 'en espera'}</span></p>`,
      `  <span class="sonora-achievement-glyph" aria-hidden="true">${item.glyph}</span>`,
      `  <h3>${item.title}</h3>`,
      `  <p>${item.description}</p>`,
      '</article>'
    ].join('')).join('');
    ui.all.innerHTML = total === definitions.length
      ? '<b>Registro completo:</b> el museo abrió una última puerta. Seguí la señal que no estaba allí antes.'
      : '<b>Consejo:</b> algunos registros sólo aparecen cuando el museo siente que los buscaste de verdad.';
  }

  function announceUnlock(achievement) {
    if (!ui) return;
    ui.live.textContent = `Logro desbloqueado: ${achievement.title}.`;
    const oldToast = document.querySelector('.sonora-achievement-toast');
    oldToast?.remove();
    const toast = document.createElement('aside');
    toast.className = 'sonora-achievement-toast';
    toast.setAttribute('role', 'status');
    toast.innerHTML = `<b aria-hidden="true">${achievement.glyph}</b><div><strong>Logro desbloqueado</strong><span>${achievement.title}</span></div>`;
    document.body.append(toast);
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.classList.add('is-leaving');
      window.setTimeout(() => toast.remove(), 380);
    }, 4600);
  }

  const api = Object.freeze({ unlock, isUnlocked, getAll, open, close, definitions: getAll });
  window.SonoraAchievements = api;
  document.addEventListener('sonora:achievement', refreshUI);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
})();
