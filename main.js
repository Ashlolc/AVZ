(() => {
  const Avz = (window.Avz = window.Avz || {});
  const U = Avz.Utils;

  const canvas = document.getElementById("game");

  function setupCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const w = Math.max(320, Math.round(rect.width * dpr));
    const h = Math.max(180, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  setupCanvas();

  Avz.Audio.init();
  const game = new Avz.Game(canvas, Avz.Audio, Avz.Levels);
  const ui = new Avz.UI(game);
  // start paused until the main menu starts a run
  game.paused = true;

  // Unlock audio on first gesture (mobile-friendly)
  const unlockOnce = async () => {
    await Avz.Audio.unlock();
    window.removeEventListener("pointerdown", unlockOnce);
    window.removeEventListener("keydown", unlockOnce);
  };
  window.addEventListener("pointerdown", unlockOnce, { once:true, passive:true });
  window.addEventListener("keydown", unlockOnce, { once:true });

  // Pointer input
  canvas.addEventListener("pointermove", (e) => {
    const p = U.getCanvasPos(e, canvas);
    game.onPointerMove(p.x, p.y);
  }, { passive:true });

  canvas.addEventListener("pointerdown", (e) => {
    // Right-click cancels selection on desktop
    if (e.button === 2) { e.preventDefault(); ui.cancelSelection(); return; }

    const p = U.getCanvasPos(e, canvas);
    const res = game.onPointerDown(p.x, p.y);
    if (res && !res.ok && res.reason === "Not enough energy") ui.flashEnergyBad();
    if (res && res.ok && !game.recycleMode) {
      // keep selection; user can spam-place
      ui.refreshSelected();
    }
  });

  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  // Keyboard
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") ui.cancelSelection();
    if (e.key.toLowerCase() === "p") ui.togglePause();
    if (e.key.toLowerCase() === "r") ui.restart();
    if (e.key.toLowerCase() === "m") ui.toggleMute();
    if (e.key.toLowerCase() === "h") ui.toggleShop && ui.toggleShop();
    if (e.key === " " && game.waveState === "build" && !game.ended) {
      e.preventDefault();
      game.startWave();
    }
  });

  window.addEventListener("resize", () => {
    setupCanvas();
    game.updateLayout();
  });

  // Main loop
  let last = U.now();
  function frame() {
    const t = U.now();
    let dt = (t - last) / 1000;
    last = t;
    dt = U.clamp(dt, 0, 0.05);

    if (!game.paused) game.update(dt);
    game.render();
    ui.update();

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
