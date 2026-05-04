  initUciIndicator() {
    const original = ui.changes?.setIndicator;
    if (!original) return;

    ui.changes.setIndicator = function (n) {
      original.call(this, n);
      document
        .querySelector('[data-indicator="uci-changes"]')
        ?.setAttribute("data-count", n || 0);
    };
  },

  initProgressRings() {
    if (this._progressRingsInitialized) return;
    this._progressRingsInitialized = true;

    const syncBar = (bar) => {
      if (!(bar instanceof HTMLElement)) return;

      const source = bar.querySelector(":scope > div");
      if (!(source instanceof HTMLElement)) return;

      const ring = this.ensureProgressRing(bar);
      this.syncProgressRing(bar, source, ring);

      if (!source._md3eProgressObserved) {
        source._md3eProgressObserved = new MutationObserver(() => {
          this.syncProgressRing(bar, source, ring);
        });
        source._md3eProgressObserved.observe(source, {
          attributes: true,
          attributeFilter: ["style"],
        });
      }
    };

    const syncAll = (scope = document) => {
      if (scope instanceof HTMLElement && scope.matches(".cbi-progressbar")) {
        syncBar(scope);
      }

      scope.querySelectorAll?.(".cbi-progressbar").forEach(syncBar);
    };

    const target = document.getElementById("maincontent") || document.body;
    syncAll(document);

    this._progressRingThemeHandler = () => syncAll(document);
    window.addEventListener("md3e:themechange", this._progressRingThemeHandler);

    this._progressRingObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== 1) continue;
          syncAll(node);
        }
      }
    });
    this._progressRingObserver.observe(target, {
      childList: true,
      subtree: true,
    });
  },

  ensureProgressRing(bar) {
    let ring = bar.querySelector(":scope > .md3e-progress-ring");

    if (!(ring instanceof HTMLElement)) {
      ring = document.createElement("span");
      ring.className = "md3e-progress-ring";
      ring.setAttribute("aria-hidden", "true");
      bar.insertBefore(ring, bar.firstChild);
    }

    return ring;
  },

  syncProgressRing(bar, source, ring) {
    const percent = Math.max(
      0,
      Math.min(100, Number.parseFloat(source.style.width) || 0),
    );

    bar.style.setProperty("--progress", `${percent}%`);
    ring.innerHTML = this.buildProgressRingSvg(
      percent / 100,
      this.getProgressRingPalette(bar),
    );
  },

  getProgressRingPalette(bar) {
    const styles = getComputedStyle(bar);
    const isDark =
      document.documentElement.getAttribute("data-darkmode") === "true";

    return {
      isDark,
      track: this.resolveProgressRingColor(
        styles.getPropertyValue("--md-sys-color-secondary-container").trim(),
        isDark ? "#353246" : "#ddd7ff",
      ),
      progress: this.resolveProgressRingColor(
        styles.getPropertyValue("--md-sys-color-secondary").trim(),
        isDark ? "#c6bcff" : "#7365f6",
      ),
    };
  },

  resolveProgressRingColor(value, fallback) {
    if (!this._progressRingColorCtx) {
      this._progressRingColorCtx = document.createElement("canvas").getContext(
        "2d",
      );
    }

    const ctx = this._progressRingColorCtx;
    if (!ctx) return fallback;

    ctx.fillStyle = fallback;

    try {
      ctx.fillStyle = value || fallback;
    } catch {}

    return ctx.fillStyle || fallback;
  },

  escapeProgressRingValue(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  },

  buildProgressRingSvg(progress, palette) {
    const clamped = Math.max(0, Math.min(1, progress || 0));
    const radius = 14.5;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - clamped);
    const trackOpacity = palette.isDark ? 0.34 : 0.72;
    const parts = [
      `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">`,
      `<circle cx="20" cy="20" r="${radius}" fill="none" stroke="${this.escapeProgressRingValue(palette.track)}" stroke-opacity="${trackOpacity}" stroke-width="2.85"/>`,
      `<circle cx="20" cy="20" r="${radius}" fill="none" stroke="${this.escapeProgressRingValue(palette.progress)}" stroke-width="3.3" stroke-linecap="round" transform="rotate(-90 20 20)" stroke-dasharray="${circumference.toFixed(2)}" stroke-dashoffset="${dashOffset.toFixed(2)}"/>`,
    ];

    parts.push(`</svg>`);
    return parts.join("");
  },
