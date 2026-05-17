  initTabContentAnimation() {
    const target = document.getElementById("maincontent") || document.body;
    if (this._tabContentAnimationInitialized) return;

    if (
      !target.querySelector(
        ".cbi-tabmenu, .cbi-section-node-tabbed, .cbi-map-tabbed",
      )
    ) {
      this.watchForAddedElement(
        "_tabContentBootstrapObserver",
        target,
        ".cbi-tabmenu, .cbi-section-node-tabbed, .cbi-map-tabbed",
        () => this.initTabContentAnimation(),
      );
      return;
    }

    this._tabContentAnimationInitialized = true;
    let animating = false;

    const replayAnimation = (el, className) => {
      if (!(el instanceof HTMLElement)) return;

      el.classList.remove(className);
      this.scheduleElementFrame(el, "_md3eReplayFrame", () => {
        this.scheduleElementFrame(el, "_md3eReplayWriteFrame", () => {
          el.classList.add(className);
          el.addEventListener(
            "animationend",
            () => el.classList.remove(className),
            { once: true },
          );
        });
      });
    };

    /* ── Content blur animation (fade in / out) ── */

    target.addEventListener(
      "click",
      (e) => {
        const link = e.target.closest(".cbi-tabmenu li a");
        if (!link || animating || e._tabAnimBypass) return;

        const clickedLi = link.closest("li");
        if (clickedLi?.classList.contains("cbi-tab")) return;

        const tabMenu = link.closest(".cbi-tabmenu");
        const section = tabMenu?.closest(".cbi-section, .cbi-map");
        const activePanel = section?.querySelector(
          "[data-tab-active='true'][data-tab-title]",
        );

        if (!activePanel) return;

        e.stopPropagation();
        e.preventDefault();
        animating = true;

        activePanel.classList.add("tab-content-exit");
        activePanel.addEventListener(
          "animationend",
          () => {
            activePanel.classList.remove("tab-content-exit");
            animating = false;

            const bypass = new MouseEvent("click", { bubbles: true });
            bypass._tabAnimBypass = true;
            link.dispatchEvent(bypass);
          },
          { once: true },
        );
      },
      true,
    );

    /* ── Container height animation (independent via ResizeObserver) ── */

    const reduceHeightMotion = () =>
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const maxAnimatedHeight = 720;
    const maxAnimatedDelta = 360;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const el = entry.target;
        if (el._htLock) continue;

        const newH = Math.round(entry.borderBoxSize[0].blockSize);
        const oldH = el._htPrev;
        el._htPrev = newH;

        if (oldH === undefined || oldH === newH) continue;
        if (
          reduceHeightMotion() ||
          Math.max(oldH, newH) > maxAnimatedHeight ||
          Math.abs(newH - oldH) > maxAnimatedDelta
        ) {
          continue;
        }

        el._htLock = true;
        el.classList.add("tab-height-anim");
        el.style.height = oldH + "px";
        this.scheduleElementFrame(el, "_md3eHeightWriteFrame", () => {
          el.style.height = newH + "px";
        });

        const done = () => {
          el.classList.remove("tab-height-anim");
          el.style.height = "";
          el._htLock = false;
        };

        const onEnd = (e) => {
          if (e.propertyName !== "height") return;
          el.removeEventListener("transitionend", onEnd);
          clearTimeout(tid);
          done();
        };

        el.addEventListener("transitionend", onEnd);
        const tid = setTimeout(() => {
          el.removeEventListener("transitionend", onEnd);
          done();
        }, 500);
      }
    });

    const watch = (c) => {
      if (c._htWatched) return;
      c._htWatched = true;
      ro.observe(c);
    };

    this.forEachElementMatch(
      target,
      ".cbi-section-node-tabbed, .cbi-map-tabbed",
      watch,
    );

    /* ── View load animation (blur-in after spinner) ── */

    const watchView = (v) => {
      if (v._viewWatched) return;
      v._viewWatched = true;

      new MutationObserver((muts) => {
        for (const m of muts) {
          for (const n of m.removedNodes) {
            if (!n.classList?.contains("spinning")) continue;
            replayAnimation(v, "tab-content-enter");
            return;
          }
        }
      }).observe(v, { childList: true });
    };

    const view = target.querySelector("#view");
    if (view) watchView(view);

    const isTabContentMutation = (mutation) => {
      if (
        mutation.type === "attributes" &&
        mutation.attributeName === "data-tab-active"
      ) {
        return true;
      }

      if (mutation.type !== "childList") return false;

      return Array.from(mutation.addedNodes).some(
        (node) =>
          node.nodeType === 1 &&
          (node.id === "view" ||
            node.matches?.(".cbi-section-node-tabbed, .cbi-map-tabbed") ||
            node.querySelector?.(
              ".cbi-section-node-tabbed, .cbi-map-tabbed, #view",
            )),
      );
    };

    new MutationObserver((muts) => {
      if (!muts.some(isTabContentMutation)) return;

      for (const m of muts) {
        if (
          m.type === "attributes" &&
          m.attributeName === "data-tab-active" &&
          m.target.getAttribute("data-tab-active") === "true" &&
          m.target.hasAttribute("data-tab-title")
        ) {
          replayAnimation(m.target, "tab-content-enter");
          continue;
        }

        if (m.type !== "childList") continue;

        for (const n of m.addedNodes) {
          if (n.nodeType !== 1) continue;
          this.forEachElementMatch(
            n,
            ".cbi-section-node-tabbed, .cbi-map-tabbed",
            watch,
          );
          if (n.id === "view") watchView(n);
        }
      }
    }).observe(target, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-tab-active"],
    });
  },
