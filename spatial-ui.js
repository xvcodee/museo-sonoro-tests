(() => {
  const stage = document.querySelector('#spatial-stage');
  const points = document.querySelectorAll('[data-spatial-angle]');
  const distanceInput = document.querySelector('#spatial-distance');
  const driftInput = document.querySelector('#spatial-drift');
  const distanceOutput = document.querySelector('#spatial-distance-output');
  const driftOutput = document.querySelector('#spatial-drift-output');
  const status = document.querySelector('#spatial-status');
  const stopButton = document.querySelector('#spatial-stop');
  if (!stage || !points.length || !distanceInput || !driftInput) return;

  let angle = 0;
  let mapped = new Set();

  function refreshOutputs() {
    distanceOutput.textContent = `${String(distanceInput.value).padStart(2, '0')} m`;
    driftOutput.textContent = `${driftInput.value}%`;
    stage.style.setProperty('--spatial-angle', `${angle}deg`);
    stage.style.setProperty('--spatial-distance', String(.38 + Number(distanceInput.value) / 20));
  }

  async function placeSource(nextAngle) {
    angle = Number(nextAngle);
    const distance = Number(distanceInput.value);
    const drift = Number(driftInput.value);
    const tone = drift > 66 ? 'cristal' : drift < 30 ? 'pulso' : 'aurora';
    refreshOutputs();
    points.forEach(point => point.classList.toggle('is-active', Number(point.dataset.spatialAngle) === angle));
    stage.classList.add('is-playing');
    status.textContent = `FUENTE A ${angle.toString().padStart(3, '0')}° · ACERCÁNDOSE`;
    await window.SonoraSpatial?.start({ angle, distance, tone, volume: .62 });
    mapped.add(angle);
    try { sessionStorage.setItem('sonora-spatial-explored', 'yes'); } catch (_) { /* No es crítico. */ }
    if (mapped.size >= 4) {
      window.SonoraGames?.complete('spatial');
      status.textContent = 'CAMPO CARTOGRAFIADO · 4 ORÍGENES ENCONTRADOS';
    }
  }

  points.forEach(point => point.addEventListener('click', () => placeSource(point.dataset.spatialAngle)));
  distanceInput.addEventListener('input', () => {
    refreshOutputs();
    if (stage.classList.contains('is-playing')) window.SonoraSpatial?.move({ angle, distance: Number(distanceInput.value) });
  });
  driftInput.addEventListener('input', () => {
    refreshOutputs();
    if (stage.classList.contains('is-playing')) {
      const offset = (Number(driftInput.value) - 50) * .14;
      window.SonoraSpatial?.move({ angle: angle + offset, distance: Number(distanceInput.value) });
    }
  });
  stopButton?.addEventListener('click', () => {
    window.SonoraSpatial?.stop();
    stage.classList.remove('is-playing');
    points.forEach(point => point.classList.remove('is-active'));
    status.textContent = 'FUENTE DETENIDA · ELEGÍ OTRO PUNTO';
  });
  document.addEventListener('sonora:spatialchange', event => {
    if (event.detail?.status === 'stopped' && stage.classList.contains('is-playing')) {
      stage.classList.remove('is-playing');
    }
  });
  window.addEventListener('pagehide', () => window.SonoraSpatial?.stop());
  refreshOutputs();
})();
