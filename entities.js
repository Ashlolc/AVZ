(() => {
  const Avz = (window.Avz = window.Avz || {});
  const U = Avz.Utils;

  // ---- Drawing helpers ----
  function hpBar(ctx, x, y, w, hp, maxHp) {
    const t = U.clamp(hp / maxHp, 0, 1);
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.fillRect(x - w/2, y, w, 5);
    ctx.fillStyle = t > 0.5 ? "rgba(70,226,141,.95)" : (t > 0.25 ? "rgba(255,204,102,.95)" : "rgba(255,91,106,.95)");
    ctx.fillRect(x - w/2 + 1, y + 1, (w - 2) * t, 3);
    ctx.restore();
  }

  // ---- Particles / FX ----
  class Particle {
    constructor({ x, y, vx, vy, life=0.35, r=2.5, col="rgba(255,255,255,.9)", grav=380 }) {
      this.x=x; this.y=y; this.vx=vx; this.vy=vy;
      this.life=life; this.lifeMax=life;
      this.r=r; this.col=col; this.grav=grav;
      this.alive=true;
    }
    update(dt){
      this.life -= dt;
      if (this.life <= 0) { this.alive=false; return; }
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vy += this.grav * dt;
    }
    render(ctx){
      const a = U.clamp(this.life/this.lifeMax, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = this.col;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  }

  class Ring {
    constructor({ x, y, r0=10, r1=120, life=0.35, col="rgba(190,140,255,.95)" }) {
      this.x=x; this.y=y;
      this.r0=r0; this.r1=r1;
      this.life=life; this.lifeMax=life;
      this.alive=true;
      this.col=col;
    }
    update(dt){
      this.life -= dt;
      if (this.life <= 0) { this.alive=false; return; }
    }
    render(ctx){
      const t = 1 - (this.life/this.lifeMax);
      const r = U.lerp(this.r0, this.r1, U.easeOutCubic(t));
      const a = U.clamp(this.life/this.lifeMax, 0, 1);
      ctx.save();
      ctx.globalAlpha = 0.6*a;
      ctx.strokeStyle = this.col;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(this.x, this.y, r, 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();
    }
  }

  class FloatText {
    constructor({ x, y, text, col="rgba(255,255,255,.9)", life=0.8 }) {
      this.x=x; this.y=y;
      this.text=text; this.col=col;
      this.life=life; this.lifeMax=life;
      this.alive=true;
    }
    update(dt){
      this.life -= dt;
      if (this.life <= 0) { this.alive=false; return; }
      this.y -= 18*dt;
    }
    render(ctx){
      const a = U.clamp(this.life/this.lifeMax, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = this.col;
      ctx.font = "900 12px ui-sans-serif,system-ui";
      ctx.textAlign = "center";
      ctx.fillText(this.text, this.x, this.y);
      ctx.restore();
    }
  }

  // ---- Projectiles ----
  class Projectile {
    constructor(type, opts) {
      this.type = type;
      Object.assign(this, opts);
      this.alive = true;
      this.t = 0;
    }
    rect(){
      const r = this.r || 6;
      return { x:this.x-r, y:this.y-r, w:r*2, h:r*2 };
    }
    update(dt, game){
      this.t += dt;

      if (this.type === "bolt" || this.type === "frost") {
        this.x += this.vx * dt;
        if (this.x > game.bounds.w + 60) this.alive=false;
      } else if (this.type === "arc") {
        this.x += this.vx * dt;
        if (this.x > game.bounds.w + 60) this.alive=false;
      } else if (this.type === "ember") {
        // lob with gravity
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += 520 * dt;
        if (this.x > game.bounds.w + 60 || this.y > game.bounds.h + 80) this.alive=false;
      } else if (this.type === "spit") {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        if (this.x < -60 || this.x > game.bounds.w + 60) this.alive=false;
      }
    }
    render(ctx){
      ctx.save();
      ctx.translate(this.x, this.y);
      if (this.type === "bolt") {
        ctx.fillStyle = "rgba(150,220,255,.95)";
        ctx.shadowColor = "rgba(150,220,255,.6)";
        ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(0,0, this.r, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(255,255,255,.35)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-7,-2); ctx.lineTo(7,-2); ctx.stroke();
      } else if (this.type === "frost") {
        ctx.fillStyle = "rgba(170,255,245,.92)";
        ctx.shadowColor = "rgba(170,255,245,.55)";
        ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(0,0, this.r, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(255,255,255,.35)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-6,0); ctx.lineTo(0,-6); ctx.lineTo(6,0); ctx.lineTo(0,6); ctx.closePath();
        ctx.stroke();
      } else if (this.type === "arc") {
        ctx.fillStyle = "rgba(190,140,255,.95)";
        ctx.shadowColor = "rgba(190,140,255,.65)";
        ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(0,0, this.r, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(255,255,255,.30)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0,0, this.r+2, 0, Math.PI*2); ctx.stroke();
      } else if (this.type === "ember") {
        ctx.fillStyle = "rgba(255,140,120,.95)";
        ctx.shadowColor = "rgba(255,140,120,.65)";
        ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(0,0, this.r, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255,240,210,.55)";
        ctx.beginPath(); ctx.arc(-2,-2, this.r*0.45, 0, Math.PI*2); ctx.fill();
      } else if (this.type === "spit") {
        ctx.fillStyle = "rgba(140,255,170,.85)";
        ctx.beginPath(); ctx.ellipse(0,0, this.r*1.2, this.r*0.9, 0, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }
  }

  // ---- Definitions ----
  const DefenderDefs = {
    BoltBud: {
      id:"BoltBud", name:"Bolt Bud", unlock:1, cost:45, maxHp:125,
      icon:"⚡", accent:"#ffb25b",
      desc:"Shoots fast bolts down its lane.",
      kind:"shooter", fireCd:1.05, dmg:22, proj:"bolt", projSpeed:380
    },
    Sunleaf: {
      id:"Sunleaf", name:"Sunleaf", unlock:1, cost:35, maxHp:140,
      icon:"☀️", accent:"#ffd39a",
      desc:"Generates Energy every few seconds.",
      kind:"generator", genCd:3.4, amount:25
    },
    ShieldSprout: {
      id:"ShieldSprout", name:"Shield Sprout", unlock:2, cost:30, maxHp:520,
      icon:"🛡️", accent:"#ffa46c",
      desc:"A tough blocker. Buys time.",
      kind:"wall"
    },
    SparkShroom: {
      id:"SparkShroom", name:"Spark Shroom", unlock:3, cost:60, maxHp:185,
      icon:"✨", accent:"#ffc08c",
      desc:"Pulse burst hits nearby invaders.",
      kind:"aoe", cd:3.1, radius:140, dmg:44
    },
    FrostFern: {
      id:"FrostFern", name:"Frost Fern", unlock:4, cost:60, maxHp:140,
      icon:"❄️", accent:"#ffd0b0",
      desc:"Frost bolt slows invaders.",
      kind:"shooter", fireCd:1.20, dmg:18, proj:"frost", projSpeed:360,
      slowMul:0.62, slowDur:2.2
    },
    ArcOrchid: {
      id:"ArcOrchid", name:"Arc Orchid", unlock:6, cost:75, maxHp:150,
      icon:"🔮", accent:"#ffb078",
      desc:"Arc seed chains lightning to nearby invaders.",
      kind:"chain", fireCd:1.60, dmg:20, proj:"arc", projSpeed:320,
      chains:3, chainRange:92
    },
    EmberPod: {
      id:"EmberPod", name:"Ember Pod", unlock:8, cost:85, maxHp:160,
      icon:"🔥", accent:"#ff8f57",
      desc:"Lobs ember that explodes + burns.",
      kind:"lob", fireCd:2.25, dmg:26, proj:"ember", radius:64,
      burnDps:12, burnDur:3.0
    },
    PulseLily: {
      id:"PulseLily", name:"Pulse Lily", unlock:10, cost:95, maxHp:200,
      icon:"📡", accent:"#ffc38a",
      desc:"Lane-wide pulse damage on cooldown.",
      kind:"lanePulse", cd:4.6, dmg:16
    }
  };

  const InvaderDefs = {
    Walker:   { id:"Walker",   name:"Walker",        minLevel:1, maxHp:120, speed:36, dps:18 },
    Speedy:  { id:"Speedy",  name:"Speedy",        minLevel:2, maxHp:85,  speed:64, dps:14 },
    Tough:   { id:"Tough",   name:"Tough Walker",  minLevel:3, maxHp:260, speed:24, dps:26 },
    Armored: { id:"Armored", name:"Armored",       minLevel:5, maxHp:200, armor:120, speed:28, dps:22 },
    Spitter: { id:"Spitter", name:"Spitter",       minLevel:7, maxHp:150, speed:30, dps:14, range:170, spitCd:1.35, spitDmg:16 },
    Leaper:  { id:"Leaper",  name:"Leaper",        minLevel:9, maxHp:135, speed:46, dps:16, leapOnce:true },
    Bruiser: { id:"Bruiser", name:"Bruiser",       minLevel:12,maxHp:460, speed:20, dps:34 },
  };

  // ---- Defender class ----
  class Defender {
    constructor(defId, row, col) {
      this.defId = defId;
      this.row = row; this.col = col;
      const d = DefenderDefs[defId];
      this.maxHp = d.maxHp;
      this.hp = d.maxHp;
      this.cool = 0;
      this.pop = 0;
      this.alive = true;
    }

    world(game) {
      const c = game.cellToWorld(this.row, this.col);
      return { x:c.cx, y:c.cy, w:game.cell.w*0.74, h:game.cell.h*0.72 };
    }

    rect(game){
      const w = this.world(game);
      return { x:w.x-w.w/2, y:w.y-w.h/2, w:w.w, h:w.h };
    }

    update(dt, game) {
      const d = DefenderDefs[this.defId];
      this.pop = Math.min(1, this.pop + dt*6);
      this.cool -= dt;

      if (d.kind === "shooter" || d.kind === "chain" || d.kind === "lob") {
        if (this.cool <= 0 && game.anyInvaderInLaneAhead(this.row, this.col)) {
          this.cool = d.fireCd;
          const w = this.world(game);

          if (d.kind === "lob") {
            // aim at the first invader in lane (or mid)
            const target = game.firstInvaderInLane(this.row);
            const tx = target ? target.x : (w.x + game.cell.w*4);
            const ty = target ? target.y : w.y;
            // basic ballistic: choose time based on distance
            const dx = Math.max(140, tx - w.x);
            const t = Math.max(0.55, Math.min(1.1, dx / 260));
            const vx = dx / t;
            const vy = (ty - (w.y-10) - 0.5*520*t*t) / t;
            game.projectiles.push(new Projectile("ember", { lane:this.row, x:w.x+game.cell.w*0.18, y:w.y-10, vx, vy, r:7, dmg:d.dmg, radius:d.radius, burnDps:d.burnDps, burnDur:d.burnDur }));
            game.audio.burn(game.panFromX(w.x));
            game.spawnMuzzle(w.x+10, w.y-10, "rgba(255,160,120,.9)");
          } else {
            game.projectiles.push(new Projectile(d.proj, { lane:this.row, x:w.x+game.cell.w*0.18, y:w.y-6, vx:d.projSpeed, vy:0, r:6, dmg:d.dmg, slowMul:d.slowMul, slowDur:d.slowDur, chains:d.chains, chainRange:d.chainRange }));
            if (d.proj === "arc") game.audio.zap(game.panFromX(w.x)); else if (d.proj === "frost") game.audio.slow(game.panFromX(w.x)); else game.audio.shoot(game.panFromX(w.x));
            game.spawnMuzzle(w.x+10, w.y-6);
          }
        }
      }

      if (d.kind === "aoe") {
        if (this.cool <= 0) {
          const w = this.world(game);
          const r2 = d.radius*d.radius;
          let any = false;
          for (const inv of game.invaders) {
            if (!inv.alive) continue;
            if (U.dist2(inv.x, inv.y, w.x, w.y) <= r2) { any = true; break; }
          }
          if (any) {
            this.cool = d.cd;
            game.fx.push(new Ring({ x:w.x, y:w.y, r0:12, r1:d.radius, life:0.30, col:"rgba(190,140,255,.95)" }));
            for (const inv of game.invaders) {
              if (!inv.alive) continue;
              if (U.dist2(inv.x, inv.y, w.x, w.y) <= r2) inv.takeDamage(d.dmg, game, w.x, "spark");
            }
            game.audio.zap(game.panFromX(w.x));
          }
        }
      }

      if (d.kind === "generator") {
        if (this.cool <= 0) {
          this.cool = d.genCd;
          const w = this.world(game);
          game.addEnergy(d.amount);
          game.floatText(w.x, w.y-18, `+${d.amount}`, "rgba(255,204,102,.95)");
          game.spawnMotes(w.x, w.y-8, "rgba(255,204,102,.80)");
          game.audio._tone({ type:"sine", f:560, f2:880, dur:0.10, gain:0.10, pan:game.panFromX(w.x) });
        }
      }

      if (d.kind === "lanePulse") {
        if (this.cool <= 0) {
          const w = this.world(game);
          const any = game.invaders.some(inv => inv.alive && inv.lane === this.row && inv.x > w.x);
          if (any) {
            this.cool = d.cd;
            game.fx.push(new Ring({ x:w.x, y:w.y, r0:20, r1:game.grid.w, life:0.26, col:"rgba(80,170,255,.9)" }));
            for (const inv of game.invaders) {
              if (!inv.alive) continue;
              if (inv.lane === this.row) inv.takeDamage(d.dmg, game, w.x, "pulse");
            }
            game.audio._tone({ type:"triangle", f:320, f2:520, dur:0.12, gain:0.12, pan:game.panFromX(w.x) });
          }
        }
      }

      if (this.hp <= 0) this.alive = false;
    }

    render(ctx, game) {
      const d = DefenderDefs[this.defId];
      const w = this.world(game);
      const s = 0.92 + 0.08 * Math.sin((this.pop * Math.PI) / 2);

      ctx.save();
      ctx.translate(w.x, w.y);
      ctx.scale(s, s);

      // shadow
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = "black";
      ctx.beginPath();
      ctx.ellipse(0, w.h*0.34, w.w*0.36, w.h*0.16, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // styles
      if (this.defId === "BoltBud") {
        ctx.fillStyle = "rgba(120,255,210,.92)";
        ctx.beginPath(); ctx.ellipse(0,2, w.w*0.30, w.h*0.34, 0, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "rgba(40,60,90,.85)";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(6,-16); ctx.lineTo(-2,0); ctx.lineTo(10,2); ctx.lineTo(2,18); ctx.stroke();
        ctx.fillStyle = "rgba(150,220,255,.85)";
        ctx.beginPath(); ctx.arc(w.w*0.26,-6, 5, 0, Math.PI*2); ctx.fill();
      } else if (this.defId === "ShieldSprout") {
        ctx.fillStyle = "rgba(110,200,255,.92)";
        U.roundRectPath(ctx, -w.w*0.28, -w.h*0.28, w.w*0.56, w.h*0.62, 14);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,.35)";
        ctx.lineWidth = 3;
        U.roundRectPath(ctx, -w.w*0.22, -w.h*0.20, w.w*0.44, w.h*0.46, 12);
        ctx.stroke();
      } else if (this.defId === "SparkShroom") {
        ctx.fillStyle = "rgba(210,160,255,.92)";
        U.roundRectPath(ctx, -w.w*0.30, -w.h*0.20, w.w*0.60, w.h*0.28, 18);
        ctx.fill();
        ctx.fillStyle = "rgba(180,230,255,.75)";
        U.roundRectPath(ctx, -w.w*0.12, -w.h*0.02, w.w*0.24, w.h*0.36, 12);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.22)";
        for (let i=0;i<4;i++){
          const px = U.rand(-w.w*0.22, w.w*0.22);
          const py = U.rand(-w.h*0.18, -w.h*0.02);
          ctx.beginPath(); ctx.arc(px, py, U.rand(2.2,3.4), 0, Math.PI*2); ctx.fill();
        }
      } else if (this.defId === "Sunleaf") {
        ctx.fillStyle = "rgba(120,255,170,.92)";
        ctx.beginPath(); ctx.ellipse(-8,4, w.w*0.26, w.h*0.34, -0.55, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(10,4, w.w*0.22, w.h*0.30, 0.55, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "rgba(255,204,102,.95)";
        ctx.beginPath(); ctx.arc(0,-2, 10, 0, Math.PI*2); ctx.fill();
      } else if (this.defId === "FrostFern") {
        ctx.fillStyle = "rgba(170,255,245,.92)";
        ctx.beginPath(); ctx.ellipse(0,2, w.w*0.28, w.h*0.32, 0, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,.38)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-8,-2); ctx.lineTo(0,-14); ctx.lineTo(8,-2); ctx.lineTo(0,10); ctx.closePath();
        ctx.stroke();
      } else if (this.defId === "ArcOrchid") {
        ctx.fillStyle = "rgba(190,140,255,.92)";
        ctx.beginPath(); ctx.ellipse(0,2, w.w*0.30, w.h*0.34, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "rgba(150,220,255,.6)";
        for (let a=0;a<5;a++){
          const ang = a*(Math.PI*2/5);
          ctx.beginPath(); ctx.arc(Math.cos(ang)*10, Math.sin(ang)*10-2, 2.8, 0, Math.PI*2); ctx.fill();
        }
      } else if (this.defId === "EmberPod") {
        ctx.fillStyle = "rgba(255,150,120,.92)";
        ctx.beginPath(); ctx.ellipse(0,2, w.w*0.30, w.h*0.34, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "rgba(255,240,210,.55)";
        ctx.beginPath(); ctx.arc(0,-6, 6, 0, Math.PI*2); ctx.fill();
      } else if (this.defId === "PulseLily") {
        ctx.fillStyle = "rgba(80,170,255,.92)";
        U.roundRectPath(ctx, -w.w*0.22, -w.h*0.18, w.w*0.44, w.h*0.40, 16);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,.35)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0,0, 10, 0, Math.PI*2); ctx.stroke();
      }

      ctx.restore();

      hpBar(ctx, w.x, w.y - w.h/2 - 10, 48, this.hp, this.maxHp);
    }
  }

  // ---- Invader class ----
  class Invader {
    constructor(type, lane) {
      this.type = type;
      this.lane = lane;
      const d = InvaderDefs[type];
      this.maxHp = d.maxHp;
      this.hp = d.maxHp;
      this.armor = d.armor || 0;
      this.speedBase = d.speed;
      this.dps = d.dps;

      this.x = 0;
      this.y = 0;
      this.alive = true;

      this._wig = Math.random()*Math.PI*2;
      this._hit = 0;

      // abilities
      this.range = d.range || 0;
      this.spitCd = d.spitCd || 0;
      this.spitDmg = d.spitDmg || 0;
      this._spitT = U.rand(0.2, 0.7);
      this.leapOnce = !!d.leapOnce;
      this._leaped = false;

      // status
      this.slowT = 0;
      this.slowMul = 1;
      this.burnT = 0;
      this.burnDps = 0;

      this.target = null;
      this._attackTick = 0;
    }

    initAt(x, y){ this.x=x; this.y=y; }

    speed(){
      return this.speedBase * (this.slowT > 0 ? this.slowMul : 1);
    }

    rect(game){
      const w = game.cell.w*0.62;
      const h = game.cell.h*0.62;
      return { x:this.x-w/2, y:this.y-h/2, w, h };
    }

    applySlow(mul, dur){
      this.slowMul = Math.min(this.slowMul, mul);
      this.slowT = Math.max(this.slowT, dur);
    }
    applyBurn(dps, dur){
      // stack by extending and taking max dps
      this.burnDps = Math.max(this.burnDps, dps);
      this.burnT = Math.max(this.burnT, dur);
    }

    takeDamage(dmg, game, srcX, kind="hit"){
      // armor absorbs first
      let remaining = dmg;
      if (this.armor > 0) {
        const a = Math.min(this.armor, remaining);
        this.armor -= a;
        remaining -= a;
        if (a > 0) game.spawnArmorPing(this.x, this.y);
      }
      if (remaining > 0) this.hp -= remaining;

      this._hit = 0.12;
      game.audio.hit(game.panFromX(srcX != null ? srcX : this.x));
      game.spawnHit(this.x, this.y);

      if (this.hp <= 0) {
        this.alive = false;
        game.audio.defeat(game.panFromX(this.x));
        game.spawnDefeat(this.x, this.y);
        game.onInvaderDefeated(this);
      }
    }

    update(dt, game){
      this._wig += dt*6;
      this._hit = Math.max(0, this._hit - dt);

      // status
      if (this.slowT > 0) this.slowT = Math.max(0, this.slowT - dt);
      if (this.burnT > 0) {
        this.burnT = Math.max(0, this.burnT - dt);
        this.hp -= this.burnDps * dt;
        if (this.hp <= 0) {
          this.alive = false;
          game.audio.defeat(game.panFromX(this.x));
          game.spawnDefeat(this.x, this.y);
          game.onInvaderDefeated(this);
          return;
        }
        // burn motes
        if (Math.random() < 0.18) game.spawnMotes(this.x, this.y, "rgba(255,160,120,.65)", 2, 5, 260);
      }

      // find blocker
      this.target = game.findBlockingDefender(this);

      // Leaper: jump over first defender
      if (this.leapOnce && !this._leaped && this.target) {
        const tr = this.target.rect(game);
        // if near the left edge of defender, hop
        if (this.x < tr.x + tr.w*0.85) {
          this._leaped = true;
          this.x = tr.x - game.cell.w*0.70; // land behind it (to the left)
          game.spawnMotes(this.x, this.y, "rgba(150,220,255,.55)", 10, 18, 420);
          game.audio._tone({ type:"triangle", f:420, f2:520, dur:0.08, gain:0.10, pan:game.panFromX(this.x) });
          this.target = null;
        }
      }

      // ranged spitter
      if (this.type === "Spitter") {
        const t = game.firstDefenderInLane(this.lane);
        if (t) {
          const w = this.rect(game);
          const tx = t.world(game).x;
          const dist = (this.x - tx);
          if (!this.target && dist > 24 && dist < this.range) {
            // stop and spit
            this._spitT -= dt;
            if (this._spitT <= 0) {
              this._spitT = this.spitCd;
              const startX = this.x - w.w*0.15;
              const startY = this.y - 6;
              const vx = -240;
              const vy = U.rand(-30, 30);
              game.projectiles.push(new Projectile("spit", { lane:this.lane, x:startX, y:startY, vx, vy, r:6, dmg:this.spitDmg, from:"invader" }));
              game.audio.spit(game.panFromX(this.x));
              game.spawnMotes(startX, startY, "rgba(140,255,170,.60)", 6, 10, 260);
            }
            // also inch forward slowly
            this.x -= this.speed()*0.15*dt;
            return;
          }
        }
      }

      if (this.target) {
        this._attackTick += dt;
        this.target.hp -= this.dps * dt;
        if (this._attackTick >= 0.35) {
          this._attackTick = 0;
          game.spawnNibble(this.x, this.y);
          game.audio._noise({ dur:0.04, gain:0.06, pan:game.panFromX(this.x), hp:450, lp:1800 });
        }
      } else {
        this.x -= this.speed() * dt;
      }
    }

    render(ctx, game){
      const r = this.rect(game);
      ctx.save();
      ctx.translate(this.x, this.y);

      // shadow
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = "black";
      ctx.beginPath();
      ctx.ellipse(0, r.h*0.40, r.w*0.32, r.h*0.18, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 1;

      const bob = Math.sin(this._wig) * 2.2;
      const flash = this._hit > 0;

      let body = "rgba(255,170,120,.92)";
      let trim = "rgba(40,20,20,.35)";
      if (this.type === "Tough") { body="rgba(255,130,150,.92)"; trim="rgba(60,20,40,.35)"; }
      if (this.type === "Speedy") { body="rgba(255,210,120,.92)"; trim="rgba(60,45,20,.35)"; }
      if (this.type === "Armored") { body="rgba(180,230,255,.92)"; trim="rgba(20,40,60,.35)"; }
      if (this.type === "Spitter") { body="rgba(140,255,170,.85)"; trim="rgba(20,60,35,.35)"; }
      if (this.type === "Leaper") { body="rgba(190,140,255,.90)"; trim="rgba(45,20,60,.35)"; }
      if (this.type === "Bruiser") { body="rgba(255,120,90,.92)"; trim="rgba(60,20,20,.40)"; }

      // torso
      ctx.fillStyle = flash ? "rgba(255,255,255,.95)" : body;
      U.roundRectPath(ctx, -r.w*0.26, -r.h*0.14 + bob, r.w*0.52, r.h*0.42, 12);
      ctx.fill();

      // head
      ctx.fillStyle = flash ? "rgba(255,255,255,.95)" : "rgba(200,235,255,.92)";
      ctx.beginPath();
      ctx.arc(r.w*0.05, -r.h*0.22 + bob, r.w*0.18, 0, Math.PI*2);
      ctx.fill();

      // eye
      ctx.fillStyle = "rgba(20,30,45,.85)";
      ctx.beginPath();
      ctx.arc(r.w*0.10, -r.h*0.24 + bob, 3.2, 0, Math.PI*2);
      ctx.fill();

      // legs
      ctx.strokeStyle = trim;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-r.w*0.12, r.h*0.16 + bob);
      ctx.lineTo(-r.w*0.18, r.h*0.32 + Math.sin(this._wig*1.5)*2);
      ctx.moveTo(r.w*0.06, r.h*0.16 + bob);
      ctx.lineTo(r.w*0.00, r.h*0.32 + Math.cos(this._wig*1.5)*2);
      ctx.stroke();

      // armor plate
      if (this.armor > 0) {
        ctx.globalAlpha = 0.75;
        ctx.strokeStyle = "rgba(80,170,255,.85)";
        ctx.lineWidth = 3;
        U.roundRectPath(ctx, -r.w*0.22, -r.h*0.10 + bob, r.w*0.44, r.h*0.20, 10);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Speedy streak
      if (this.type === "Speedy") {
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = "rgba(150,220,255,.55)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-r.w*0.40, -r.h*0.08 + bob);
        ctx.lineTo(-r.w*0.18, -r.h*0.08 + bob);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // burn/slow indicators
      if (this.slowT > 0) {
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = "rgba(170,255,245,.65)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -r.h*0.02 + bob, r.w*0.28, 0, Math.PI*2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (this.burnT > 0) {
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = "rgba(255,160,120,.65)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -r.h*0.02 + bob, r.w*0.30, 0, Math.PI*2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      ctx.restore();

      hpBar(ctx, this.x, this.y - r.h/2 - 10, 48, this.hp, this.maxHp);
    }
  }

  Avz.Entities = {
    Particle, Ring, FloatText,
    Projectile,
    DefenderDefs, InvaderDefs,
    Defender, Invader
  };
})();
