(() => {
  const Avz = (window.Avz = window.Avz || {});

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
  function now() { return performance.now(); }

  function dist2(ax, ay, bx, by) {
    const dx = ax - bx, dy = ay - by;
    return dx * dx + dy * dy;
  }

  function pickWeighted(weightMap) {
    let sum = 0;
    for (const k in weightMap) sum += Math.max(0, weightMap[k]);
    if (sum <= 0) return Object.keys(weightMap)[0] || null;
    let r = Math.random() * sum;
    for (const k in weightMap) {
      r -= Math.max(0, weightMap[k]);
      if (r <= 0) return k;
    }
    return Object.keys(weightMap)[0] || null;
  }

  function rectsOverlap(a, b) {
    return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
  }

  function getCanvasPos(evt, canvas) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (evt.clientX - rect.left) * scaleX,
      y: (evt.clientY - rect.top) * scaleY
    };
  }

  function niceHearts(n) {
    let s = "";
    for (let i = 0; i < n; i++) s += "❤";
    return s || "—";
  }

  // Seeded RNG (for procedural levels)
  function makeRng(seed) {
    // xorshift32
    let x = (seed >>> 0) || 0x12345678;
    return () => {
      x ^= (x << 13) >>> 0;
      x ^= (x >>> 17) >>> 0;
      x ^= (x << 5) >>> 0;
      return (x >>> 0) / 4294967296;
    };
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, Math.min(w, h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }
  function easeInOutSine(t){ return -(Math.cos(Math.PI * t) - 1) / 2; }

  Avz.Utils = {
    clamp, lerp, rand, randInt, now,
    dist2, pickWeighted, rectsOverlap,
    getCanvasPos, niceHearts,
    makeRng, roundRectPath,
    easeOutCubic, easeInOutSine,
  };
})();
