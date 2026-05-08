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

      if (el._md3eReplayFrame) cancelAnimationFrame(el._md3eReplayFrame);
      if (el._md3eReplayWriteFrame) {
        cancelAnimationFrame(el._md3eReplayWriteFrame);
      }

      el.classList.remove(className);
      el._md3eReplayFrame = requestAnimationFrame(() => {
        el._md3eReplayFrame = null;
        el._md3eReplayWriteFrame = requestAnimationFrame(() => {
          el._md3eReplayWriteFrame = null;
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

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const el = entry.target;
        if (el._htLock) continue;

        const newH = Math.round(entry.borderBoxSize[0].blockSize);
        const oldH = el._htPrev;
        el._htPrev = newH;

        if (oldH === undefined || oldH === newH) continue;

        el._htLock = true;
        el.classList.add("tab-height-anim");
        el.style.height = oldH + "px";
        requestAnimationFrame(() => {
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

    target
      .querySelectorAll(".cbi-section-node-tabbed, .cbi-map-tabbed")
      .forEach(watch);

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

    const view = document.getElementById("view");
    if (view) watchView(view);

    new MutationObserver((muts) => {
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
          if (n.matches?.(".cbi-section-node-tabbed, .cbi-map-tabbed"))
            watch(n);
          n.querySelectorAll?.(".cbi-section-node-tabbed, .cbi-map-tabbed")
            .forEach(watch);
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
