(() => {
  const Avz = (window.Avz = window.Avz || {});
  const U = Avz.Utils;

  const names = [
    "Warm‑up", "Pressure", "Rumble", "Static", "Crunch",
    "Crosswind", "Spitstorm", "Surge", "Leap Day", "Aftershock",
    "Bad Weather", "Hard Shells", "Big Steps", "Long Night", "Overdrive"
  ];

  function waveName(level) {
    const idx = (level - 1) % names.length;
    return names[idx] + (level > names.length ? ` +${Math.floor((level-1)/names.length)}` : "");
  }

  function buildMix(level) {
    // weights grow with level; generator will normalize
    const mix = { Walker: 1.0 };
    if (level >= 2) mix.Speedy = 0.45;
    if (level >= 3) mix.Tough = 0.32;
    if (level >= 5) mix.Armored = 0.30;
    if (level >= 7) mix.Spitter = 0.28;
    if (level >= 9) mix.Leaper = 0.24;
    if (level >= 12) mix.Bruiser = 0.18;

    // gently taper Walker weight later so it doesn’t dominate
    if (level >= 8) mix.Walker = 0.75;
    if (level >= 14) mix.Walker = 0.60;

    return mix;
  }

  function normalize(mix) {
    let s = 0;
    for (const k in mix) s += Math.max(0, mix[k]);
    if (s <= 0) return mix;
    const out = {};
    for (const k in mix) out[k] = mix[k] / s;
    return out;
  }

  function generateWave(level, seed=0xA11CE + level*1337) {
    const rng = U.makeRng(seed);
    const r = () => rng();

    // easier early game, then ramps
    const baseTotal = 5 + Math.floor(level * 1.55);
    const total = U.clamp(baseTotal + (r() < 0.35 ? 0 : 1), 5, 50);

    const intervalMin = Math.max(0.45, 1.65 - level * 0.06);
    const intervalMax = intervalMin + Math.max(0.35, 0.65 - level * 0.01);

    const mix = normalize(buildMix(level));

    // small “rush” every few levels
    const rushChance = level >= 4 ? Math.min(0.25, 0.08 + level * 0.01) : 0.0;

    return {
      level,
      name: waveName(level),
      total,
      interval: [intervalMin, intervalMax],
      mix,
      rushChance
    };
  }

  Avz.Levels = {
    generateWave
  };
})();
