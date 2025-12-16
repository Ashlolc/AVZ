(() => {
  const Avz = (window.Avz = window.Avz || {});
  const U = Avz.Utils;

  class AudioSystem {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.unlocked = false;
      this.muted = false;
    }

    init() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;
      this.master.connect(this.ctx.destination);
    }

    async unlock() {
      if (!this.ctx) this.init();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") {
        try { await this.ctx.resume(); } catch {}
      }
      this.unlocked = true;
    }

    setMuted(v) {
      this.muted = !!v;
      if (this.master) this.master.gain.value = this.muted ? 0.0 : 0.55;
    }

    _tone({ type="sine", f=440, f2=null, dur=0.09, gain=0.20, pan=0 }) {
      if (!this.ctx || !this.unlocked || this.muted) return;
      const t0 = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(f, t0);
      if (f2 != null) osc.frequency.exponentialRampToValueAtTime(Math.max(10, f2), t0 + dur);

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

      const p = this.ctx.createStereoPanner();
      p.pan.value = U.clamp(pan, -1, 1);

      osc.connect(g);
      g.connect(p);
      p.connect(this.master);

      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    }

    _noise({ dur=0.10, gain=0.14, pan=0, hp=400, lp=6000 }) {
      if (!this.ctx || !this.unlocked || this.muted) return;
      const t0 = this.ctx.currentTime;

      const bufferSize = Math.floor(this.ctx.sampleRate * dur);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);

      const src = this.ctx.createBufferSource();
      src.buffer = buffer;

      const hpF = this.ctx.createBiquadFilter();
      hpF.type = "highpass";
      hpF.frequency.value = hp;

      const lpF = this.ctx.createBiquadFilter();
      lpF.type = "lowpass";
      lpF.frequency.value = lp;

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

      const p = this.ctx.createStereoPanner();
      p.pan.value = U.clamp(pan, -1, 1);

      src.connect(hpF); hpF.connect(lpF); lpF.connect(g); g.connect(p); p.connect(this.master);
      src.start(t0);
      src.stop(t0 + dur + 0.02);
    }

    // ---- SFX ----
    click(pan=0){ this._tone({ type:"triangle", f:520, f2:780, dur:0.06, gain:0.10, pan }); }
    place(pan=0) {
      this._tone({ type:"sine", f:300, f2:520, dur:0.09, gain:0.16, pan });
      this._tone({ type:"triangle", f:620, f2:740, dur:0.06, gain:0.10, pan });
    }
    shoot(pan=0) {
      this._tone({ type:"square", f:560, f2:380, dur:0.07, gain:0.14, pan });
      this._tone({ type:"sine", f:920, f2:560, dur:0.05, gain:0.09, pan });
    }
    hit(pan=0) {
      this._noise({ dur:0.06, gain:0.12, pan, hp:700, lp:4500 });
      this._tone({ type:"triangle", f:220, f2:160, dur:0.05, gain:0.08, pan });
    }
    defeat(pan=0) {
      this._noise({ dur:0.14, gain:0.16, pan, hp:260, lp:2600 });
      this._tone({ type:"sawtooth", f:170, f2:90, dur:0.16, gain:0.12, pan });
    }
    waveStart() {
      this._tone({ type:"triangle", f:440, f2:660, dur:0.12, gain:0.14, pan:0 });
      this._tone({ type:"triangle", f:660, f2:880, dur:0.12, gain:0.12, pan:0 });
    }
    coreHit() {
      this._noise({ dur:0.16, gain:0.18, pan:0, hp:180, lp:2200 });
      this._tone({ type:"sawtooth", f:150, f2:70, dur:0.20, gain:0.13, pan:0 });
    }
    unlock() {
      this._tone({ type:"sine", f:520, f2:1040, dur:0.14, gain:0.14, pan:0 });
      this._tone({ type:"triangle", f:780, f2:1560, dur:0.12, gain:0.10, pan:0 });
    }
    zap(pan=0){
      this._tone({ type:"sawtooth", f:880, f2:420, dur:0.08, gain:0.13, pan });
      this._noise({ dur:0.06, gain:0.08, pan, hp:900, lp:6000 });
    }
    slow(pan=0){
      this._tone({ type:"sine", f:320, f2:240, dur:0.10, gain:0.10, pan });
      this._noise({ dur:0.08, gain:0.06, pan, hp:400, lp:1400 });
    }
    burn(pan=0){
      this._noise({ dur:0.10, gain:0.10, pan, hp:700, lp:2200 });
      this._tone({ type:"triangle", f:260, f2:180, dur:0.10, gain:0.08, pan });
    }
    spit(pan=0){
      this._noise({ dur:0.06, gain:0.09, pan, hp:300, lp:1800 });
      this._tone({ type:"sine", f:260, f2:320, dur:0.05, gain:0.06, pan });
    }
  }

  Avz.Audio = new AudioSystem();
})();
