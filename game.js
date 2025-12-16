(() => {
  const Avz = (window.Avz = window.Avz || {});
  const U = Avz.Utils;
  const E = Avz.Entities;

  class Game {
    constructor(canvas, audio, levels) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.audio = audio;
      this.levels = levels;

      this.bounds = { w: canvas.width, h: canvas.height };

      // Grid (5x9)
      this.grid = { rows: 5, cols: 9, x: 110, y: 68, w: 720, h: 360 };
      this.cell = { w: 80, h: 72 };
      this.coreX = 74;

      // State
      this.time = 0;
      this.speedMul = 1;
      this.paused = false;
      this.ended = false;

      // Economy
      this.energy = 150;
      this.energyRegen = 2.1; // passive regen per second
      this.lives = 3;

      // Selection / tools
      this.selected = null;
      this.recycleMode = false;
      this.hover = { row:-1, col:-1, valid:false, reason:"" };

      // Entities
      this.defGrid = [];
      this.defenders = [];
      this.invaders = [];
      this.projectiles = [];
      this.particles = [];
      this.fx = [];
      this.floats = [];

      // Procedural progression
      this.level = 1;
      this.wave = null;      // current wave config
      this.waveState = "build"; // build | running | clear
      this.waveElapsed = 0;
      this.spawnIndex = 0;
      this.spawnPlan = [];
      this.spawned = 0;
      this.defeated = 0;

      // Unlocks
      this.unlocked = new Set();
      this._unlockedThisLevel = [];

      // Visuals
      this._msg = "";
      this._msgT = 0;
      this.shakeT = 0;
      this.shakeMag = 0;
      this._bgT = 0;

      this.reset();
    }

    reset() {
      this.time = 0;
      this.speedMul = 1;
      this.paused = false;
      this.ended = false;

      this.energy = 150;
      this.energyRegen = 2.1;
      this.lives = 3;

      this.selected = null;
      this.recycleMode = false;
      this.hover = { row:-1, col:-1, valid:false, reason:"" };

      this.defenders.length = 0;
      this.invaders.length = 0;
      this.projectiles.length = 0;
      this.particles.length = 0;
      this.fx.length = 0;
      this.floats.length = 0;

      this.defGrid = Array.from({ length: this.grid.rows }, () => Array(this.grid.cols).fill(null));

      this.level = 1;
      this.waveState = "build";
      this._msg = "";
      this._msgT = 0;

      this.unlocked = new Set();
      this._unlockedThisLevel = [];
      this.unlockForLevel(this.level);

      this.updateLayout();
      this.prepareWave();
      this.say("Build your defense. Start when ready.", 2.4);
    }

    updateLayout() {
      this.bounds.w = this.canvas.width;
      this.bounds.h = this.canvas.height;

      const padX = 110;
      const padY = 68;
      const rightPad = 72;

      this.grid.rows = 5;
      this.grid.cols = 9;
      this.grid.x = padX;
      this.grid.y = padY;
      this.grid.w = this.bounds.w - padX - rightPad;
      this.grid.h = this.bounds.h - padY - 150;

      this.cell.w = this.grid.w / this.grid.cols;
      this.cell.h = this.grid.h / this.grid.rows;

      this.coreX = this.grid.x - 36;
    }

    panFromX(x) { return U.clamp((x / this.bounds.w) * 2 - 1, -1, 1); }

    say(text, t=2.2) { this._msg = text; this._msgT = t; }

    addEnergy(n) { this.energy += n; }
    spendEnergy(n) { this.energy = Math.max(0, this.energy - n); }

    setSelected(defId) {
      this.selected = defId || null;
    }

    cancelSelection() {
      this.selected = null;
    }

    getCost(defId) {
      const d = Avz.Entities.DefenderDefs[defId];
      if (!d) return 999999;
      const base = d.cost;
      this.purchases = this.purchases || Object.create(null);
      const bought = this.purchases[defId] || 0;
      if (bought < 4) return base; // first 4 at base price
      const step = Math.max(5, Math.ceil(base * 0.25)); // price step per extra purchase
      return base + (bought - 3) * step; // 5th purchase and beyond increases
    }

    markPurchased(defId) {
      this.purchases = this.purchases || Object.create(null);
      this.purchases[defId] = (this.purchases[defId] || 0) + 1;
    }



    // ----- Unlocks -----
    unlockForLevel(level) {
      this._unlockedThisLevel = [];
      for (const id in E.DefenderDefs) {
        const d = E.DefenderDefs[id];
        if (d.unlock <= level && !this.unlocked.has(id)) {
          this.unlocked.add(id);
          this._unlockedThisLevel.push(id);
        }
      }
    }
    configure(opts={}) {
      if (opts.device) this.device = opts.device;
      if (opts.mode) this.mode = opts.mode;
    }

    // --- Spice: modifiers ---
    pickModsForWave(wave) {
      if (this.mode !== "spice") return [];
      const seed = 0xC0FFEE ^ (wave.level * 69069);
      const rng = U.makeRng(seed);
      const r = () => rng();

      const pool = [
        { id:"energyBloom", name:"Energy Bloom", apply:(g)=>{ g.energyRegen += 0.9; return ()=>{ g.energyRegen -= 0.9; }; } },
        { id:"tightWires",  name:"Tight Wires",  apply:(g)=>{ g.energyRegen -= 0.3; return ()=>{ g.energyRegen += 0.3; }; } },
        { id:"turboSwarm",  name:"Turbo Swarm",  apply:(g)=>{ g._mod_spawnMul = (g._mod_spawnMul||1) * 0.82; return ()=>{ g._mod_spawnMul /= 0.82; }; } },
        { id:"thickShells", name:"Thick Shells", apply:(g)=>{ g._mod_hpMul = (g._mod_hpMul||1) * 1.18; return ()=>{ g._mod_hpMul /= 1.18; }; } },
        { id:"greasedBoots",name:"Greased Boots",apply:(g)=>{ g._mod_speedMul = (g._mod_speedMul||1) * 1.14; return ()=>{ g._mod_speedMul /= 1.14; }; } },
        { id:"rustyGears",  name:"Rusty Gears",  apply:(g)=>{ g._mod_speedMul = (g._mod_speedMul||1) * 0.90; return ()=>{ g._mod_speedMul /= 0.90; }; } },
        { id:"volatile",    name:"Volatile",    apply:(g)=>{ g._mod_burnBonus = (g._mod_burnBonus||0) + 0.25; return ()=>{ g._mod_burnBonus -= 0.25; }; } },
        { id:"pulseHappy",  name:"Pulse Happy", apply:(g)=>{ g._mod_abilityBoost = (g._mod_abilityBoost||0) + 0.12; return ()=>{ g._mod_abilityBoost -= 0.12; }; } },
      ];

      const count = wave.level >= 8 ? (r() < 0.5 ? 3 : 2) : 2;
      const picked = [];
      const used = new Set();
      while (picked.length < count && used.size < pool.length) {
        const idx = Math.floor(r() * pool.length);
        const m = pool[idx];
        if (used.has(m.id)) continue;
        used.add(m.id);
        picked.push(m);
      }
      return picked;
    }

    applyMods(mods) {
      this._mod_spawnMul = 1;
      this._mod_hpMul = 1;
      this._mod_speedMul = 1;
      this._mod_burnBonus = 0;
      this._mod_abilityBoost = 0;

      const reverts = [];
      for (const m of mods) {
        try {
          const rev = m.apply(this);
          if (typeof rev === "function") reverts.push(rev);
        } catch {}
      }
      return () => { for (const rev of reverts) { try { rev(); } catch {} } };
    }

    // --- Spice: abilities ---
    useAbility(id) {
      if (this.mode !== "spice" || this.ended) return false;
      const a = this.abilities && this.abilities[id];
      if (!a || a.t > 0) return false;

      if (id === "pulse") {
        const dmg = 34;
        this.fx.push(new Avz.Entities.Ring({ x:this.coreX+18, y:this.grid.y + this.grid.h/2, r0:40, r1:this.grid.w*1.2, life:0.28, col:"rgba(255,195,138,.95)" }));
        for (const inv of this.invaders) if (inv.alive) inv.takeDamage(dmg, this, this.coreX+20, "pulse");
        this.audio.waveStart();
      } else if (id === "slow") {
        for (const inv of this.invaders) if (inv.alive) inv.applySlow(0.55, 3.2);
        this.spawnMotes(this.grid.x + this.grid.w*0.4, this.grid.y + this.grid.h*0.45, "rgba(255,215,176,.50)", 22, 32, 260);
        this.audio.slow(0);
      } else if (id === "surge") {
        const amt = 70;
        this.addEnergy(amt);
        this.floatText(this.grid.x + this.grid.w*0.18, this.grid.y-10, `+${amt} Energy`, "rgba(255,204,102,.95)");
        this.spawnMotes(this.grid.x + this.grid.w*0.18, this.grid.y, "rgba(255,204,102,.70)", 18, 26, 320);
        this.audio._tone({ type:"triangle", f:520, f2:980, dur:0.14, gain:0.14, pan:-0.2 });
      }

      a.t = a.cd;
      return true;
    }



    // ----- Grid helpers -----
    cellToWorld(row, col) {
      const x0 = this.grid.x + col * this.cell.w;
      const y0 = this.grid.y + row * this.cell.h;
      return { x:x0, y:y0, cx:x0 + this.cell.w*0.5, cy:y0 + this.cell.h*0.5 };
    }

    worldToCell(x, y) {
      if (x < this.grid.x || y < this.grid.y || x >= this.grid.x + this.grid.w || y >= this.grid.y + this.grid.h) {
        return { row:-1, col:-1 };
      }
      const col = Math.floor((x - this.grid.x) / this.cell.w);
      const row = Math.floor((y - this.grid.y) / this.cell.h);
      if (row < 0 || row >= this.grid.rows || col < 0 || col >= this.grid.cols) return { row:-1, col:-1 };
      return { row, col };
    }

    // ----- Placement -----
    canPlace(defId, row, col) {
      if (!defId) return { ok:false, reason:"No selection" };
      if (row < 0 || col < 0) return { ok:false, reason:"Out of bounds" };
      if (this.defGrid[row][col]) return { ok:false, reason:"Occupied" };
      const cost = this.getCost(defId);
      if (this.energy < cost) return { ok:false, reason:"Not enough energy" };
      if (this.ended) return { ok:false, reason:"Game ended" };
      return { ok:true, reason:"" };
    }

    place(defId, row, col) {
      const chk = this.canPlace(defId, row, col);
      if (!chk.ok) return chk;

      const d = new E.Defender(defId, row, col);
      if (defId === "BoltBud") d.cool = 0.25;
      if (defId === "Sunleaf") d.cool = 1.0;

      this.defGrid[row][col] = d;
      this.defenders.push(d);
      const costPaid = this.getCost(defId);
      this.spendEnergy(costPaid);
      this.markPurchased(defId);

      const w = this.cellToWorld(row, col);
      this.audio.place(this.panFromX(w.cx));
      this.spawnMotes(w.cx, w.cy, "rgba(120,255,210,.78)", 14, 22, 420);
      return { ok:true };
    }

    recycle(row, col) {
      const d = this.defGrid[row][col];
      if (!d) return false;
      const def = E.DefenderDefs[d.defId];
      const refund = Math.floor(def.cost * 0.35);
      const w = this.cellToWorld(row, col);
      d.hp = 0;
      d.alive = false;
      this.defGrid[row][col] = null;
      this.addEnergy(refund);
      this.floatText(w.cx, w.cy-18, `+${refund}`, "rgba(255,204,102,.95)");
      this.spawnMotes(w.cx, w.cy, "rgba(255,91,106,.60)", 12, 18, 420);
      this.audio._tone({ type:"triangle", f:260, f2:180, dur:0.10, gain:0.10, pan:this.panFromX(w.cx) });
      return true;
    }

    // ----- Wave generation -----
    prepareWave() {
      this.wave = this.levels.generateWave(this.level);
      this.mods = this.pickModsForWave(this.wave);
      this.waveState = "build";
      this.waveElapsed = 0;
      this.spawnIndex = 0;
      this.spawnPlan = this.buildSpawnPlan(this.wave);
      this.spawned = 0;
      this.defeated = 0;

      // small build bonus (helps pacing)
      this.addEnergy(18);
    }

    buildSpawnPlan(wave) {
      const rng = U.makeRng(0xBEEF ^ (wave.level * 2654435761));
      const r = () => rng();

      const plan = [];
      let t = 0.5;

      // helper: pick from mix using seeded rng
      const keys = Object.keys(wave.mix);
      const cumulative = [];
      let s = 0;
      for (const k of keys) { s += wave.mix[k]; cumulative.push(s); }

      function pickType() {
        const x = r() * s;
        for (let i=0;i<cumulative.length;i++){
          if (x <= cumulative[i]) return keys[i];
        }
        return keys[0] || "Walker";
      }

      for (let i=0;i<wave.total;i++){
        const gap = U.lerp(wave.interval[0], wave.interval[1], r()) * (this._mod_spawnMul || 1);
        t += gap;

        // occasional rush: spawn a second Speedy nearly same time
        if (r() < wave.rushChance && wave.level >= 4 && i < wave.total-1) {
          const lane = Math.floor(r() * this.grid.rows);
          plan.push({ t, lane, type: "Speedy" });
          plan.push({ t: t + 0.18, lane: Math.floor(r()*this.grid.rows), type: pickType() });
          i++;
          continue;
        }

        plan.push({
          t,
          lane: Math.floor(r() * this.grid.rows),
          type: pickType()
        });
      }

      plan.sort((a,b)=>a.t-b.t);
      return plan;
    }

    startWave() {
      if (this.waveState !== "build" || this.ended) return;
      this.waveState = "running";
      this.waveElapsed = 0;
      if (this._modsRevert) { try { this._modsRevert(); } catch {} }
      this._modsRevert = this.applyMods(this.mods || []);
      this.audio.waveStart();
      this.say(`Level ${this.level}: ${this.wave.name}`, 2.2);

      // show unlocks
      if (this._unlockedThisLevel.length) {
        const list = this._unlockedThisLevel.map(id => E.DefenderDefs[id].name).join(", ");
        this.floatText(this.bounds.w*0.5, this.grid.y-18, `Unlocked: ${list}`, "rgba(70,226,141,.95)");
        this.audio.unlock();
      }
      this._unlockedThisLevel = [];
    }

    // ----- Combat helpers -----
    anyInvaderInLaneAhead(row, col) {
      const c = this.cellToWorld(row, col);
      for (const inv of this.invaders) {
        if (!inv.alive) continue;
        if (inv.lane !== row) continue;
        if (inv.x > c.cx + this.cell.w*0.05) return true;
      }
      return false;
    }

    firstInvaderInLane(row) {
      let best = null;
      for (const inv of this.invaders) {
        if (!inv.alive) continue;
        if (inv.lane !== row) continue;
        if (!best || inv.x < best.x) best = inv;
      }
      return best;
    }

    firstDefenderInLane(row) {
      for (let c=0;c<this.grid.cols;c++){
        const d = this.defGrid[row][c];
        if (d && d.alive) return d;
      }
      return null;
    }

    findBlockingDefender(inv) {
      const row = inv.lane;
      const invR = inv.rect(this);
      for (let col=0; col<this.grid.cols; col++) {
        const d = this.defGrid[row][col];
        if (!d || !d.alive) continue;
        const dr = d.rect(this);
        if (U.rectsOverlap(invR, dr)) return d;
      }
      return null;
    }

    // ----- FX spawns -----
    spawnMotes(x, y, col="rgba(255,255,255,.8)", minN=6, maxN=12, grav=380) {
      const n = Math.floor(U.rand(minN, maxN));
      for (let i=0;i<n;i++){
        this.particles.push(new E.Particle({
          x:x + U.rand(-12,12),
          y:y + U.rand(-10,10),
          vx:U.rand(-180,180),
          vy:U.rand(-240,-60),
          life:U.rand(0.14,0.42),
          r:U.rand(1.6,3.2),
          col,
          grav
        }));
      }
    }

    spawnHit(x, y) {
      this.spawnMotes(x, y, "rgba(150,220,255,.86)", 6, 10, 380);
    }

    spawnDefeat(x, y) {
      this.spawnMotes(x, y, "rgba(255,170,120,.80)", 14, 22, 420);
    }

    spawnNibble(x, y) {
      this.spawnMotes(x, y, "rgba(255,255,255,.45)", 4, 7, 220);
    }

    spawnArmorPing(x, y) {
      this.spawnMotes(x, y, "rgba(80,170,255,.65)", 4, 7, 260);
    }

    spawnMuzzle(x, y, col="rgba(180,240,255,.85)") {
      this.spawnMotes(x, y, col, 4, 7, 180);
    }

    floatText(x, y, text, col) {
      this.floats.push(new E.FloatText({ x, y, text, col }));
    }

    // ----- Invader defeat reward -----

    onInvaderDefeated(inv) {
      // base drip to keep pacing fair
      let bonus = (inv.type === "Bruiser") ? 10 : (inv.type === "Tough" ? 6 : 3);

      // spice combo rewards
      if (this.mode === "spice") {
        if (this.comboT > 0) this.combo = Math.min(12, this.combo + 1);
        else this.combo = 1;
        this.comboT = this.comboWindow;

        bonus += Math.min(18, this.combo * 2);

        // tiny ability "charge" on combo
        if (this.abilities) {
          for (const k in this.abilities) {
            this.abilities[k].t = Math.max(0, this.abilities[k].t - 0.20 * this.combo);
          }
        }
      }

      this.addEnergy(bonus);
      this.defeated++;
      this.floatText(inv.x, inv.y - 18, `+${bonus}`, "rgba(255,204,102,.90)");
    }


    // ----- Update -----
    update(dt) {
      if (this.ended) return;

      dt *= this.speedMul;
      this.time += dt;
      this._bgT += dt;
      this._msgT = Math.max(0, this._msgT - dt);

      // passive energy
      this.energy += this.energyRegen * dt;

      // spice ability cooldowns
      if (this.mode === "spice" && this.abilities) {
        for (const k in this.abilities) {
          const a = this.abilities[k];
          const boost = 1 + (this._mod_abilityBoost || 0);
          a.t = Math.max(0, a.t - dt * boost);
        }
      }

      // combo decay
      if (this.mode === "spice") {
        this.comboT = Math.max(0, this.comboT - dt);
        if (this.comboT === 0) this.combo = 0;
      }

      // spawn invaders
      if (this.waveState === "running") {
        this.waveElapsed += dt;

        while (this.spawnIndex < this.spawnPlan.length && this.spawnPlan[this.spawnIndex].t <= this.waveElapsed) {
          const s = this.spawnPlan[this.spawnIndex++];
          this.spawnInvader(s.type, s.lane);
          this.spawned++;
        }

        // win condition for wave
        const aliveInv = this.invaders.some(v => v.alive);
        const allSpawned = this.spawnIndex >= this.spawnPlan.length;
        if (allSpawned && !aliveInv) {
          this.waveState = "clear";
          if (this._modsRevert) { try { this._modsRevert(); } catch {} this._modsRevert = null; }
          this.level++;
          this.unlockForLevel(this.level);
          this.say("Wave cleared. Build and press Start.", 2.0);
          this.prepareWave();
        }
      }

      // defenders
      for (const d of this.defenders) if (d.alive) d.update(dt, this);

      // invaders
      for (const inv of this.invaders) {
        if (!inv.alive) continue;
        inv.update(dt, this);

        // core breach
        if (inv.x <= this.coreX) {
          inv.alive = false;
          this.lives--;
          this.shakeT = 0.22;
          this.shakeMag = 10;
          this.audio.coreHit();
          this.say("Core hit!", 1.0);
          if (this.lives <= 0) {
            this.ended = true;
          }
        }
      }

      // projectiles
      for (const p of this.projectiles) {
        if (!p.alive) continue;
        p.update(dt, this);

        if (p.from === "invader") {
          // invader projectile hits first defender in lane
          const row = p.lane;
          for (let c=0;c<this.grid.cols;c++){
            const d = this.defGrid[row][c];
            if (!d || !d.alive) continue;
            const dr = d.rect(this);
            if (U.rectsOverlap(p.rect(), dr)) {
              p.alive = false;
              d.hp -= p.dmg;
              this.spawnHit(p.x, p.y);
              this.audio.hit(this.panFromX(p.x));
              break;
            }
          }
          continue;
        }

        // defender projectile hits invaders
        const pr = p.rect();
        for (const inv of this.invaders) {
          if (!inv.alive) continue;
          if (inv.lane !== p.lane) continue;
          if (U.rectsOverlap(pr, inv.rect(this))) {
            p.alive = false;

            // impact behavior
            if (p.type === "bolt") {
              inv.takeDamage(p.dmg, this, p.x);
            } else if (p.type === "frost") {
              inv.takeDamage(p.dmg, this, p.x);
              inv.applySlow(p.slowMul || 0.62, p.slowDur || 2.0);
              this.audio.slow(this.panFromX(p.x));
              this.spawnMotes(inv.x, inv.y, "rgba(170,255,245,.55)", 5, 9, 260);
            } else if (p.type === "arc") {
              inv.takeDamage(p.dmg, this, p.x);
              this.chainLightning(inv, p);
            } else if (p.type === "ember") {
              // explode on hit location
              this.explodeEmber(p.x, p.y, p.lane, p.radius || 60, p.dmg || 20, p.burnDps || 10, p.burnDur || 2.5);
            }
            break;
          }
        }

        // ember projectile can explode on ground in lane if passes far left (failsafe)
        if (p.type === "ember" && p.alive && p.x > this.grid.x + this.grid.w + 20) {
          p.alive = false;
        }
      }

      // cleanup dead defenders
      for (const d of this.defenders) {
        if (d.alive) continue;
        if (this.defGrid[d.row][d.col] === d) this.defGrid[d.row][d.col] = null;
      }

      // effects
      for (const q of this.particles) q.update(dt);
      for (const f of this.fx) f.update(dt);
      for (const ft of this.floats) ft.update(dt);

      // cleanup arrays
      this.defenders = this.defenders.filter(d => d.alive);
      this.invaders = this.invaders.filter(v => v.alive);
      this.projectiles = this.projectiles.filter(p => p.alive);
      this.particles = this.particles.filter(p => p.alive);
      this.fx = this.fx.filter(f => f.alive);
      this.floats = this.floats.filter(f => f.alive);

      // shake
      this.shakeT = Math.max(0, this.shakeT - dt);
      if (this.shakeT === 0) this.shakeMag = 0;
    }

    chainLightning(firstInv, proj) {
      const chains = proj.chains || 3;
      const range = proj.chainRange || 90;
      let current = firstInv;
      const hit = new Set([current]);

      for (let i=0;i<chains;i++){
        let best = null;
        let bestD2 = (range*range);
        for (const inv of this.invaders) {
          if (!inv.alive || inv.lane !== current.lane || hit.has(inv)) continue;
          const d2 = U.dist2(inv.x, inv.y, current.x, current.y);
          if (d2 <= bestD2) { bestD2 = d2; best = inv; }
        }
        if (!best) break;

        // zap line
        this.fx.push(new E.Ring({ x:best.x, y:best.y, r0:10, r1:32, life:0.14, col:"rgba(190,140,255,.95)" }));
        best.takeDamage(Math.max(8, Math.floor(proj.dmg * 0.75)), this, current.x);
        this.audio.zap(this.panFromX(best.x));
        this.spawnMotes(best.x, best.y, "rgba(190,140,255,.60)", 6, 10, 240);

        hit.add(best);
        current = best;
      }
    }

    explodeEmber(x, y, lane, radius, dmg, burnDps, burnDur) {
      this.fx.push(new E.Ring({ x, y, r0:12, r1:radius, life:0.26, col:"rgba(255,160,120,.92)" }));
      this.spawnMotes(x, y, "rgba(255,160,120,.75)", 14, 24, 420);
      this.audio.burn(this.panFromX(x));

      const r2 = radius*radius;
      for (const inv of this.invaders) {
        if (!inv.alive) continue;
        if (inv.lane !== lane) continue;
        if (U.dist2(inv.x, inv.y, x, y) <= r2) {
          inv.takeDamage(dmg, this, x);
          inv.applyBurn(burnDps, burnDur);
        }
      }
    }

    spawnInvader(type, lane) {
      const y = this.grid.y + lane*this.cell.h + this.cell.h*0.52;
      const x = this.grid.x + this.grid.w + 40 + U.rand(0, 60);
      const inv = new E.Invader(type, lane);
      inv.initAt(x, y);
      // spice modifiers
      const hpMul = (this._mod_hpMul || 1);
      const spMul = (this._mod_speedMul || 1);
      if (hpMul !== 1) { inv.maxHp = Math.floor(inv.maxHp * hpMul); inv.hp = Math.floor(inv.hp * hpMul); }
      if (spMul !== 1) { inv.speedBase = inv.speedBase * spMul; }
      this.invaders.push(inv);
    }

    // ----- Render -----
    render() {
      const ctx = this.ctx;
      ctx.clearRect(0,0,this.bounds.w,this.bounds.h);

      // screen shake
      let sx=0, sy=0;
      if (this.shakeT > 0) {
        const t = this.shakeT / 0.22;
        const mag = this.shakeMag * t;
        sx = U.rand(-mag, mag);
        sy = U.rand(-mag, mag);
      }

      ctx.save();
      ctx.translate(sx, sy);

      this.renderBackground(ctx);
      this.renderGrid(ctx);
      this.renderCore(ctx);

      // draw order: defenders behind, then invaders, then projectiles, fx
      for (const d of this.defenders) d.render(ctx, this);
      for (const inv of this.invaders) inv.render(ctx, this);
      for (const p of this.projectiles) p.render(ctx);
      for (const f of this.fx) f.render(ctx);
      for (const p of this.particles) p.render(ctx);
      for (const ft of this.floats) ft.render(ctx);

      this.renderHover(ctx);

      if (this.paused && !this.ended) {
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,.35)";
        ctx.fillRect(0,0,this.bounds.w,this.bounds.h);
        ctx.fillStyle = "rgba(255,255,255,.92)";
        ctx.font = "1000 28px ui-sans-serif,system-ui";
        ctx.textAlign = "center";
        ctx.fillText("Paused", this.bounds.w/2, this.bounds.h/2 - 10);
        ctx.font = "800 14px ui-sans-serif,system-ui";
        ctx.fillStyle = "rgba(255,255,255,.70)";
        ctx.fillText("Tap Pause (or press P) to resume", this.bounds.w/2, this.bounds.h/2 + 18);
        ctx.restore();
      }

      ctx.restore();
    }

    renderBackground(ctx){
      // subtle animated “scanlines” + lane tint
      ctx.save();
      const t = this._bgT;

      for (let r=0;r<this.grid.rows;r++){
        const y = this.grid.y + r*this.cell.h;
        const a = r%2===0 ? 0.05 : 0.10;
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fillRect(this.grid.x, y, this.grid.w, this.cell.h);
      }

      // moving soft beams
      for (let i=0;i<6;i++){
        const x = this.grid.x + (Math.sin(t*0.25 + i*1.7)*0.5 + 0.5) * this.grid.w;
        ctx.globalAlpha = 0.06;
        ctx.fillStyle = "rgba(80,170,255,.9)";
        ctx.fillRect(x-18, this.grid.y, 36, this.grid.h);
      }

      ctx.restore();
    }

    renderGrid(ctx){
      ctx.save();
      // border glow
      ctx.strokeStyle = "rgba(255,255,255,.14)";
      ctx.lineWidth = 2;
      ctx.strokeRect(this.grid.x, this.grid.y, this.grid.w, this.grid.h);

      // inner lines
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255,255,255,.10)";
      for (let c=1;c<this.grid.cols;c++){
        const x = this.grid.x + c*this.cell.w;
        ctx.beginPath(); ctx.moveTo(x, this.grid.y); ctx.lineTo(x, this.grid.y+this.grid.h); ctx.stroke();
      }
      for (let r=1;r<this.grid.rows;r++){
        const y = this.grid.y + r*this.cell.h;
        ctx.beginPath(); ctx.moveTo(this.grid.x, y); ctx.lineTo(this.grid.x+this.grid.w, y); ctx.stroke();
      }
      ctx.restore();
    }

    renderCore(ctx){
      ctx.save();
      ctx.fillStyle = "rgba(255,91,106,.08)";
      ctx.fillRect(this.coreX-10, this.grid.y, 20, this.grid.h);
      ctx.strokeStyle = "rgba(255,91,106,.45)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(this.coreX, this.grid.y);
      ctx.lineTo(this.coreX, this.grid.y+this.grid.h);
      ctx.stroke();

      for (let r=0;r<this.grid.rows;r++){
        const y = this.grid.y + r*this.cell.h + this.cell.h*0.5;
        ctx.fillStyle = "rgba(255,91,106,.18)";
        ctx.beginPath(); ctx.arc(this.coreX, y, 9, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "rgba(255,91,106,.50)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
    }

    renderHover(ctx){
      const { row, col } = this.hover;
      if (row < 0 || col < 0) return;

      const c = this.cellToWorld(row, col);

      // recycle highlight if active
      if (this.recycleMode) {
        const occupied = !!this.defGrid[row][col];
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = occupied ? "rgba(255,91,106,.60)" : "rgba(255,255,255,.10)";
        ctx.fillRect(c.x+2, c.y+2, this.cell.w-4, this.cell.h-4);
        ctx.restore();
        return;
      }

      if (!this.selected) return;
      const ok = this.canPlace(this.selected, row, col).ok;

      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = ok ? "rgba(70,226,141,.60)" : "rgba(255,91,106,.60)";
      ctx.fillRect(c.x+2, c.y+2, this.cell.w-4, this.cell.h-4);

      // ghost preview
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = "rgba(255,255,255,.35)";
      ctx.lineWidth = 2;
      U.roundRectPath(ctx, c.cx - this.cell.w*0.26, c.cy - this.cell.h*0.18, this.cell.w*0.52, this.cell.h*0.36, 14);
      ctx.stroke();
      ctx.restore();
    }

    // ----- Input -----
    onPointerMove(x, y) {
      const cell = this.worldToCell(x, y);
      if (cell.row < 0) {
        this.hover = { row:-1, col:-1, valid:false, reason:"" };
        return;
      }
      if (this.recycleMode) {
        this.hover = { row:cell.row, col:cell.col, valid:true, reason:"" };
        return;
      }
      const chk = this.selected ? this.canPlace(this.selected, cell.row, cell.col) : { ok:false, reason:"" };
      this.hover = { row:cell.row, col:cell.col, valid:chk.ok, reason:chk.reason };
    }

    onPointerDown(x, y) {
      if (this.ended) return { ok:false, reason:"ended" };

      const cell = this.worldToCell(x, y);
      if (cell.row < 0) return { ok:false, reason:"oob" };

      if (this.recycleMode) {
        const did = this.recycle(cell.row, cell.col);
        return { ok:did, reason: did ? "" : "empty" };
      }

      if (!this.selected) return { ok:false, reason:"noselect" };

      const res = this.place(this.selected, cell.row, cell.col);
      return res.ok ? { ok:true, reason:"" } : { ok:false, reason: res.reason };
    }
  }

  Avz.Game = Game;
})();
