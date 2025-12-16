(() => {
  const Avz = (window.Avz = window.Avz || {});
  const U = Avz.Utils;
  const E = Avz.Entities;

  class UI {
    constructor(game) {
      this.game = game;

      // HUD
      this.energyVal = document.getElementById("energyVal");
      this.energyRegen = document.getElementById("energyRegen");
      this.livesVal = document.getElementById("livesVal");
      this.levelVal = document.getElementById("levelVal");

      this.waveLabel = document.getElementById("waveLabel");
      this.waveProg = document.getElementById("waveProg");
      this.msg = document.getElementById("msg");

      // Buttons
      this.btnStartWave = document.getElementById("btnStartWave");
      this.btnAuto = document.getElementById("btnAuto");
      this.btnPause = document.getElementById("btnPause");
      this.btnRestart = document.getElementById("btnRestart");
      this.btnSpeed = document.getElementById("btnSpeed");
      this.btnMute = document.getElementById("btnMute");

      this.btnCancel = document.getElementById("btnCancel");
      this.btnRecycle = document.getElementById("btnRecycle");
      this.btnShop = document.getElementById("btnShop");
      this.hudBottom = document.getElementById("hudBottom");
      this.shopBody = document.getElementById("shopBody");

      // main menu
      this.mainMenu = document.getElementById("mainMenu");
      this.btnDevicePC = document.getElementById("btnDevicePC");
      this.btnDeviceMobile = document.getElementById("btnDeviceMobile");
      this.btnModeClassic = document.getElementById("btnModeClassic");
      this.btnModeSpice = document.getElementById("btnModeSpice");
      this.btnMenuStart = document.getElementById("btnMenuStart");

      // spice HUD
      this.spiceRow = document.getElementById("spiceRow");
      this.modChips = document.getElementById("modChips");
      this.abPulse = document.getElementById("abPulse");
      this.abSlow = document.getElementById("abSlow");
      this.abSurge = document.getElementById("abSurge");
      this.comboVal = document.getElementById("comboVal");
      this.comboBar = document.getElementById("comboBar");

      // Cards
      this.cards = document.getElementById("cards");
      this.selectedHint = document.getElementById("selectedHint");

      // Overlays
      this.overlay = document.getElementById("overlay");
      this.overlayTitle = document.getElementById("overlayTitle");
      this.overlayText = document.getElementById("overlayText");
      this.overlayBtn1 = document.getElementById("overlayBtn1");
      this.overlayBtn2 = document.getElementById("overlayBtn2");

      this.tutorial = document.getElementById("tutorial");
      this.btnTutOk = document.getElementById("btnTutOk");

      this.autoNext = false;
      this._defeatShown = false;
      this.shopOpen = true;
      this._lastUnlockLevel = 0;
      this.menuDevice = (localStorage.getItem("avz_device") || "pc");
      this.menuMode = (localStorage.getItem("avz_mode") || "spice");

      this._cardEls = new Map();

      this.buildCards();
      this.bind();
      this.maybeShowTutorial();
    }

    bind() {
      this.btnStartWave.addEventListener("click", () => this.game.startWave());
      this.btnAuto.addEventListener("click", () => {
        this.autoNext = !this.autoNext;
        this.btnAuto.textContent = this.autoNext ? "Auto: On" : "Auto: Off";
      });
      this.btnPause.addEventListener("click", () => this.togglePause());
      this.btnRestart.addEventListener("click", () => this.restart());
      this.btnSpeed.addEventListener("click", () => this.toggleSpeed());
      this.btnMute.addEventListener("click", () => this.toggleMute());

      this.btnCancel.addEventListener("click", () => this.cancelSelection());
      this.btnRecycle.addEventListener("click", () => this.toggleRecycle());
      this.btnShop.addEventListener("click", () => this.toggleShop());

      // menu bindings
      this.btnDevicePC.addEventListener("click", () => this.setMenuDevice("pc"));
      this.btnDeviceMobile.addEventListener("click", () => this.setMenuDevice("mobile"));
      this.btnModeClassic.addEventListener("click", () => this.setMenuMode("classic"));
      this.btnModeSpice.addEventListener("click", () => this.setMenuMode("spice"));
      this.btnMenuStart.addEventListener("click", () => this.startFromMenu());

      // abilities
      this.abPulse.addEventListener("click", () => this.game.useAbility && this.game.useAbility("pulse"));
      this.abSlow.addEventListener("click", () => this.game.useAbility && this.game.useAbility("slow"));
      this.abSurge.addEventListener("click", () => this.game.useAbility && this.game.useAbility("surge"));

      this.btnTutOk.addEventListener("click", () => this.hideTutorial());

      this.overlayBtn1.addEventListener("click", () => this.hideOverlay());
      this.overlayBtn2.addEventListener("click", () => this.hideOverlay());
    }

    buildCards() {
      this.cards.innerHTML = "";
      this._cardEls.clear();

      const defs = Object.values(E.DefenderDefs).slice().sort((a,b) => (a.unlock - b.unlock) || (a.cost - b.cost));

      for (const d of defs) {
        const el = document.createElement("div");
        el.className = "card";
        el.tabIndex = 0;
        el.setAttribute("role","button");

        const name = document.createElement("div");
        name.className = "name";
        const left = document.createElement("div");
        left.className = "left";
        const icon = document.createElement("div");
        icon.className = "icon";
        icon.textContent = d.icon || "◆";
        if (d.accent) icon.style.boxShadow = `0 0 18px ${d.accent}33`;
        const nm = document.createElement("span");
        nm.textContent = d.name;
        left.appendChild(icon);
        left.appendChild(nm);
        const cost = document.createElement("span");
        cost.className = "cost";
        cost.textContent = d.cost; // will be updated dynamically
        name.appendChild(left);
        name.appendChild(cost);

        const meta = document.createElement("div");
        meta.className = "meta";
        meta.textContent = `Unlock Lv ${d.unlock} • HP ${d.maxHp}`;

        const owned = document.createElement("div");
        owned.className = "owned";
        owned.textContent = "Owned: 0 • Price: " + d.cost;

        const desc = document.createElement("div");
        desc.className = "desc";
        desc.textContent = d.desc;

        el.appendChild(name);
        el.appendChild(meta);
        el.appendChild(owned);
        el.appendChild(desc);

        el.addEventListener("click", () => this.select(d.id));
        el.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.select(d.id); }
        });

        this.cards.appendChild(el);
        this._cardEls.set(d.id, { el, costEl: cost, ownedEl: owned, def: d });
      }

      this.refreshSelected();
    }

    maybeShowTutorial() {
      const key = "avz_tutorial_seen_v2";
      if (!localStorage.getItem(key)) {
        this.tutorial.classList.remove("hidden");
        localStorage.setItem(key, "1");
      }
    }

    hideTutorial() { this.tutorial.classList.add("hidden"); }

    showOverlay(title, text) {
      this.overlayTitle.textContent = title;
      this.overlayText.textContent = text;
      this.overlay.classList.remove("hidden");
    }
    hideOverlay(){ this.overlay.classList.add("hidden"); }

    restart() {
      this.hideOverlay();
      this.game.reset();
      this.refreshSelected();
    }

    togglePause() {
      if (this.game.ended) return;
      this.game.paused = !this.game.paused;
      this.btnPause.textContent = this.game.paused ? "Resume" : "Pause";
    }

    toggleSpeed() {
      this.game.speedMul = (this.game.speedMul === 1) ? 1.6 : 1;
      this.btnSpeed.textContent = (this.game.speedMul === 1) ? "1×" : "1.6×";
    }

    toggleMute() {
      const next = !this.game.audio.muted;
      this.game.audio.setMuted(next);
      this.btnMute.textContent = next ? "🔇" : "🔊";
    }
    toggleShop() {
      this.shopOpen = !this.shopOpen;
      this.hudBottom.classList.toggle("shopClosed", !this.shopOpen);
      this.btnShop.textContent = this.shopOpen ? "Shop: Open" : "Shop: Closed";
    }

    closeShop(keepSelection=true) {
      this.shopOpen = false;
      this.hudBottom.classList.add("shopClosed");
      this.btnShop.textContent = "Shop: Closed";
      if (!keepSelection) this.cancelSelection();
    }




    toggleRecycle() {
      this.game.recycleMode = !this.game.recycleMode;
      this.btnRecycle.textContent = this.game.recycleMode ? "Recycle: On" : "Recycle: Off";
      if (this.game.recycleMode) this.cancelSelection();
    }

    select(id) {
      const def = E.DefenderDefs[id];
      if (!this.game.unlocked.has(id)) {
        this.showOverlay("Locked", `${def.name} unlocks at Level ${def.unlock}.`);
        return;
      }
      this.game.setSelected(id);
      this.refreshSelected();
      // Auto-close shop so the board is unobstructed
      if (this.shopOpen) this.closeShop(true);
      this.game.audio.click(0);
    }

    cancelSelection() {
      this.game.cancelSelection();
      this.refreshSelected();
    }

    refreshSelected() {
      for (const [id, obj] of this._cardEls.entries()) {
        const el = obj.el;
        const wasLocked = el.classList.contains("locked");
        el.classList.toggle("selected", this.game.selected === id);
        const isLocked = !this.game.unlocked.has(id);
        el.classList.toggle("locked", isLocked);
        if (wasLocked && !isLocked) {
          el.animate([{ transform:"scale(.98)", opacity:0.7 },{ transform:"scale(1.03)", opacity:1 },{ transform:"scale(1)", opacity:1 }], { duration:360, easing:"cubic-bezier(.2,.9,.2,1)" });
        }
      }

      // cancel button for mobile/touch usability
      this.btnCancel.classList.toggle("hidden", !this.game.selected);

      if (this.game.recycleMode) {
        this.selectedHint.textContent = "Recycle mode: tap a placed defender to remove it for a partial refund.";
        return;
      }

      if (this.game.selected) {
        const d = E.DefenderDefs[this.game.selected];
        this.selectedHint.textContent = `Selected: ${d.name} (Cost ${d.cost}). Tap/click a tile to place. Cancel to stop placing.`;
      } else {
        this.selectedHint.textContent = "Pick a defender, then tap/click a tile to place.";
      }
    }

    flashEnergyBad() {
      this.energyVal.classList.remove("flashBad");
      void this.energyVal.offsetWidth;
      this.energyVal.classList.add("flashBad");
    }

    update() {
      const g = this.game;

      // dynamic pricing + per-defender owned counts
      for (const [id, obj] of this._cardEls.entries()) {
        const costNow = g.getCost ? g.getCost(id) : (obj.def.cost || 0);
        if (obj.costEl) obj.costEl.textContent = costNow;
        const owned = (g.purchases && g.purchases[id]) ? g.purchases[id] : 0;
        if (obj.ownedEl) {
          const base = obj.def.cost;
          obj.ownedEl.textContent = `Owned: ${owned} • Base: ${base} • Now: ${costNow}`;
        }
      }


      this.energyVal.textContent = Math.floor(g.energy).toString();
      this.energyRegen.textContent = `+${g.energyRegen.toFixed(1)}/s`;
      this.livesVal.textContent = U.niceHearts(g.lives);
      this.levelVal.textContent = `Lv ${g.level}`;

      const state = g.waveState === "build" ? "Build Phase" :
                    g.waveState === "running" ? `Wave: ${g.wave ? g.wave.name : ""}` :
                    g.waveState === "clear" ? "Cleared" : g.waveState;

      this.waveLabel.textContent = state;

      // progress
      const total = Math.max(1, g.spawnPlan.length || 1);
      const aliveInv = g.invaders.filter(v => v.alive).length;
      const defeated = Math.max(0, g.spawned - aliveInv);
      const frac = g.waveState === "running" ? (defeated / total) :
                   g.waveState === "build" ? 0 : 1;
      this.waveProg.style.width = `${Math.floor(frac*100)}%`;

      this.msg.textContent = g._msgT > 0 ? g._msg : "";

      // shop button label
      if (this.btnShop) this.btnShop.textContent = this.shopOpen ? "Shop: Open" : "Shop: Closed";

      // start button
      this.btnStartWave.disabled = !(g.waveState === "build" && !g.ended);
      this.btnPause.disabled = g.ended;
      this.btnPause.textContent = g.paused ? "Resume" : "Pause";

      // auto-next
      if (this.autoNext && g.waveState === "build" && !g.ended) {
        // slight delay so player can see "cleared"
        if (!this._autoT) this._autoT = 0.7;
        this._autoT -= 1/60;
        if (this._autoT <= 0) {
          this._autoT = 0;
          g.startWave();
        }
      } else {
        this._autoT = 0;
      }

      if (g.ended && !this._defeatShown) {
        this._defeatShown = true;
        this.showOverlay("Defeat", "Your core ran out of hearts. Try a stronger early economy (Sunleaf) + blockers.");
      }
      if (!g.ended) this._defeatShown = false;
    }
  }

  Avz.UI = UI;
})();